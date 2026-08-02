import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ChatMessage, ChatSession, Product
from app.schemas.copilot import (
    ChatResponse,
    DailyBriefResponse,
    ExplainResponse,
    ReportSummaryResponse,
)
from app.services.analytics_service import AnalyticsService
from app.services.business_context_service import BusinessContextService
from app.services.dashboard_service import DashboardService
from app.services.forecast_service import ForecastService
from app.services.groq_service import GroqService
from app.services.recommendation_service import RecommendationService
from app.services.risk_engine import RiskEngine

logger = logging.getLogger("app.services.copilot")


class CopilotService:
    """
    AI Business Copilot Engine handling natural language chat, intent classification,
    grounded context retrieval, daily briefs, report summaries, and metric explanations.
    Uses GroqService for reasoning and enforces zero calculation/hallucination rules.
    """

    def __init__(
        self,
        groq_service: Optional[GroqService] = None,
        forecast_service: Optional[ForecastService] = None,
        recommendation_service: Optional[RecommendationService] = None,
        risk_engine: Optional[RiskEngine] = None
    ):
        self.groq = groq_service if groq_service else GroqService()
        self.forecast_service = forecast_service if forecast_service else ForecastService()
        self.recommendation_service = recommendation_service if recommendation_service else RecommendationService()
        self.risk_engine = risk_engine if risk_engine else RiskEngine()

    async def process_chat(
        self,
        db: AsyncSession,
        user_id: int,
        business_id: int,
        message_text: str,
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """
        Main chat execution pipeline: Session management -> Intent Detection -> Context Retrieval -> Groq Reasoning -> Response.
        """
        # 1. Manage Chat Session in PostgreSQL
        if not session_id:
            session_id = str(uuid.uuid4())
            chat_session = ChatSession(
                business_id=business_id,
                user_id=user_id,
                session_id=session_id,
                title=f"Chat: {message_text[:30]}..."
            )
            db.add(chat_session)
            await db.flush()
        else:
            s_query = select(ChatSession).where(ChatSession.session_id == session_id, ChatSession.business_id == business_id)
            s_res = await db.execute(s_query)
            chat_session = s_res.scalar_one_or_none()
            if not chat_session:
                session_id = str(uuid.uuid4())
                chat_session = ChatSession(
                    business_id=business_id,
                    user_id=user_id,
                    session_id=session_id,
                    title=f"Chat: {message_text[:30]}..."
                )
                db.add(chat_session)
                await db.flush()

        # Log User Message
        user_msg_obj = ChatMessage(
            session_id=session_id,
            role="user",
            content=message_text
        )
        db.add(user_msg_obj)

        # 2. Classify Intent
        intent = self._classify_intent(message_text)
        user_msg_obj.intent = intent

        # 3. Retrieve Grounded Context from SQL & Engine Services
        context_str, sources = await self._build_grounded_context(db, business_id, intent, message_text)

        # 4. Construct Prompt
        system_prompt = self._load_prompt("system_prompt.txt")
        chat_prompt = self._load_prompt("business_chat.txt").format(
            context_str=context_str,
            user_query=message_text
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": chat_prompt}
        ]

        # 5. Call Groq Service
        groq_response = await self.groq.generate_completion(messages, temperature=0.3)

        # Log Assistant Message
        assistant_msg_obj = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=groq_response,
            intent=intent
        )
        db.add(assistant_msg_obj)
        await db.commit()

        # Generate relevant follow-up suggestions
        suggested_followups = self._get_suggested_followups(intent)

        return ChatResponse(
            session_id=session_id,
            message=groq_response,
            intent=intent,
            grounding_sources=sources,
            suggested_followups=suggested_followups
        )

    async def generate_daily_brief(
        self, db: AsyncSession, business_id: int
    ) -> DailyBriefResponse:
        """
        Generates Executive Smart Daily Brief combining Analytics, Forecasts, Recommendations, and Risks.
        """
        today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

        dashboard_cards = await DashboardService.get_dashboard_cards(db, business_id)
        forecast_overview = await self.forecast_service.predict_all_products_forecast(db, business_id)
        recs_overview = await self.recommendation_service.get_all_recommendations(db, business_id)
        risk_scorecard = await self.risk_engine.get_risk_scorecard(db, business_id)

        products_to_buy = [r.product_name for r in recs_overview.recommendations if r.recommended_order_quantity > 0]
        
        brief_prompt = (
            f"Generate a professional Smart Daily Brief for a retail store on {today_str}.\n"
            f"Dashboard Revenue: ${dashboard_cards.todays_sales}, Total Products: {dashboard_cards.total_products}\n"
            f"Expected 7-day demand from DB: {forecast_overview.total_7d_predicted_units} units\n"
            f"Low stock count: {dashboard_cards.products_running_low}\n"
            f"Products to buy: {', '.join(products_to_buy[:5]) or 'None'}\n"
            f"Overall business risk: {risk_scorecard.overall_business_risk_score}/100\n"
            f"IMPORTANT: If Expected 7-day demand is 0, set expected_sales_today strictly to 0.0.\n"
            "Return JSON matching: greeting, date, expected_sales_today, low_stock_count, products_to_buy, business_opportunities, risks_summary, business_summary."
        )

        messages = [
            {"role": "system", "content": "You are a Retail Operations Copilot generating daily briefings as structured JSON."},
            {"role": "user", "content": brief_prompt}
        ]

        parsed = await self.groq.generate_json_completion(messages)

        if forecast_overview.total_7d_predicted_units == 0:
            exp_sales = 0.0
        else:
            exp_sales_raw = parsed.get("expected_sales_today")
            if exp_sales_raw is None:
                exp_sales = round(forecast_overview.total_7d_predicted_units / 7.0, 2)
            else:
                try:
                    exp_sales = float(exp_sales_raw)
                except (ValueError, TypeError):
                    exp_sales = round(forecast_overview.total_7d_predicted_units / 7.0, 2)

        raw_opps = parsed.get("business_opportunities")
        if isinstance(raw_opps, list):
            biz_opps = [str(x) if not isinstance(x, dict) else json.dumps(x) for x in raw_opps]
        elif isinstance(raw_opps, dict):
            biz_opps = [f"{k.replace('_', ' ').capitalize()}: {v}" for k, v in raw_opps.items()]
        elif isinstance(raw_opps, str):
            biz_opps = [raw_opps]
        else:
            biz_opps = ["Focus on top-selling inventory restocking"]

        raw_summary = parsed.get("business_summary")
        if isinstance(raw_summary, dict):
            biz_summary = ". ".join([f"{k.replace('_', ' ').capitalize()}: {v}" for k, v in raw_summary.items()])
        elif isinstance(raw_summary, str):
            biz_summary = raw_summary
        else:
            biz_summary = "Store operations are running steadily with verified database context."

        return DailyBriefResponse(
            greeting=str(parsed.get("greeting", "Good morning! Here is your daily operational summary.")),
            date=today_str,
            expected_sales_today=exp_sales,
            low_stock_count=dashboard_cards.products_running_low,
            products_to_buy=products_to_buy[:5],
            business_opportunities=biz_opps,
            risks_summary=f"Business risk index is {risk_scorecard.overall_business_risk_score}/100 with {risk_scorecard.stockout_risk_count} low stock warnings.",
            business_summary=biz_summary
        )

    async def generate_report_summary(
        self, db: AsyncSession, business_id: int, days: int = 30
    ) -> ReportSummaryResponse:
        """
        Generates Executive Report Summary explaining performance metrics.
        """
        analytics = await AnalyticsService.get_analytics_overview(db, business_id)
        risk_scorecard = await self.risk_engine.get_risk_scorecard(db, business_id)

        best_sellers = [item.name for item in analytics.best_sellers[:5]]

        report_context = (
            f"Period: Last {days} Days\n"
            f"Total Revenue: ${analytics.total_revenue}\n"
            f"Total Profit: ${analytics.total_profit}\n"
            f"Best Sellers: {', '.join(best_sellers)}\n"
            f"Inventory Health Score: {risk_scorecard.inventory_health_score}/100\n"
        )

        prompt_template = self._load_prompt("report_summary.txt")
        user_prompt = prompt_template.format(report_context=report_context)

        messages = [
            {"role": "system", "content": self._load_prompt("system_prompt.txt")},
            {"role": "user", "content": user_prompt}
        ]

        exec_summary = await self.groq.generate_completion(messages, temperature=0.3)

        return ReportSummaryResponse(
            period=f"Last {days} Days",
            total_revenue=analytics.total_revenue,
            total_profit=analytics.total_profit,
            best_sellers=best_sellers,
            inventory_health_score=risk_scorecard.inventory_health_score,
            executive_summary=exec_summary
        )

    async def explain_metric(
        self, db: AsyncSession, business_id: int, topic: str, item_id: Optional[int] = None
    ) -> ExplainResponse:
        """
        Explains specific inventory, forecast, or recommendation metrics.
        """
        facts: Dict[str, Any] = {}

        if item_id:
            rec = await self.recommendation_service.get_product_recommendation(db, business_id, item_id)
            if rec:
                facts["product_name"] = rec.product_name
                facts["current_stock"] = rec.current_stock
                facts["recommended_reorder_qty"] = rec.recommended_order_quantity
                facts["stockout_risk"] = rec.stockout_risk
                facts["expiry_risk"] = rec.expiry_risk
                facts["action_reason"] = rec.action_reason

        risk_scorecard = await self.risk_engine.get_risk_scorecard(db, business_id)
        facts["overall_business_risk"] = risk_scorecard.overall_business_risk_score
        facts["inventory_health"] = risk_scorecard.inventory_health_score

        prompt_template = self._load_prompt("inventory_explainer.txt")
        user_prompt = prompt_template.format(
            inventory_metrics=str(facts),
            user_query=f"Please explain '{topic}'"
        )

        messages = [
            {"role": "system", "content": self._load_prompt("system_prompt.txt")},
            {"role": "user", "content": user_prompt}
        ]

        explanation = await self.groq.generate_completion(messages, temperature=0.3)

        return ExplainResponse(
            topic=topic,
            explanation=explanation,
            grounded_facts=facts
        )

    def _classify_intent(self, text: str) -> str:
        """Categorizes user prompt into predefined business intent categories."""
        t = text.lower()
        if "forecast" in t or "predict" in t or "demand" in t:
            return "Forecast Questions"
        elif "buy" in t or "order" in t or "reorder" in t or "supplier" in t or "vendor" in t:
            return "Recommendation Questions"
        elif "stock" in t or "inventory" in t or "expired" in t:
            return "Inventory Questions"
        elif "sale" in t or "revenue" in t or "profit" in t:
            return "Sales & Financial Questions"
        elif "risk" in t or "health" in t or "warning" in t:
            return "Risk Explanation"
        return "General Business Questions"

    async def _build_grounded_context(
        self, db: AsyncSession, business_id: int, intent: str, query: str
    ) -> Tuple[str, List[str]]:
        """
        Retrieves tightly-scoped context from PostgreSQL database and backend engines.
        Never fetches unnecessary tables to optimize tokens and ensure 0 hallucination.
        """
        context_parts = []
        sources = ["PostgreSQL Database"]

        # Targeted business context
        target_context = await BusinessContextService.get_item_context(db, business_id, item_query=query)
        if target_context.get("matching_products"):
            context_parts.append(f"Matching Product Inventory Context:\n{target_context['matching_products']}")
            sources.append("BusinessContextService")

        if intent in ["Forecast Questions", "General Business Questions"]:
            fc_overview = await self.forecast_service.predict_all_products_forecast(db, business_id)
            context_parts.append(f"XGBoost Demand Forecast Overview: Total 7d predicted units = {fc_overview.total_7d_predicted_units}, 30d = {fc_overview.total_30d_predicted_units}, Confidence = {fc_overview.average_confidence_score}%")
            sources.append("ForecastService")

        if intent in ["Recommendation Questions", "Inventory Questions", "General Business Questions"]:
            recs = await self.recommendation_service.get_all_recommendations(db, business_id)
            rec_summaries = [f"Item: {r.product_name}, Stock: {r.current_stock}, Action: {r.action_type}, Suggested Order: {r.recommended_order_quantity}, Reason: {r.action_reason}" for r in recs.recommendations[:5]]
            context_parts.append(f"Engine Recommendations:\n" + "\n".join(rec_summaries))
            sources.append("RecommendationService")

        if intent in ["Sales & Financial Questions", "Risk Explanation", "General Business Questions"]:
            analytics = await AnalyticsService.get_analytics_overview(db, business_id)
            context_parts.append(f"Analytics Financial Summary: Revenue = ${analytics.total_revenue}, Profit = ${analytics.total_profit}, Best Seller = {analytics.best_sellers[0].name if analytics.best_sellers else 'N/A'}")
            sources.append("AnalyticsService")

        full_context = "\n\n".join(context_parts) if context_parts else "No specific matching database records found."
        return full_context, sources

    @staticmethod
    def _load_prompt(filename: str) -> str:
        """Loads prompt template from file."""
        try:
            with open(f"backend/app/prompts/{filename}", "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return "Respond to the user prompt accurately based on provided context."

    @staticmethod
    def _get_suggested_followups(intent: str) -> List[str]:
        """Provides intent-specific suggested followup prompts for frontend."""
        if intent == "Forecast Questions":
            return ["What is my expected 7-day sales demand?", "Which products have the highest predicted surge?"]
        elif intent == "Recommendation Questions":
            return ["Which items need immediate reordering?", "Are there any items that should be put on clearance?"]
        elif intent == "Inventory Questions":
            return ["Which products are currently low in stock?", "Do we have any expiring stock in the next 14 days?"]
        elif intent == "Sales & Financial Questions":
            return ["What was my total profit over the last 30 days?", "Which products are my top revenue drivers?"]
        return ["Give me a summary of overall store health", "What are the biggest inventory risks today?"]
