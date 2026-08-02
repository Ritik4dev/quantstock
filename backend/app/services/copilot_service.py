import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ChatMessage, ChatSession, Product, Inventory, Sale
from app.schemas.copilot import (
    ChatResponse,
    DailyBriefResponse,
    ExplainResponse,
    ReportSummaryResponse,
    SalesForecastSchema,
    InventoryAlertSchema,
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
        Generates Executive Smart Daily Brief strictly following the user's Dynamic Business Operations Analyst spec:
        1. NO FAKE OR HARDCODED VALUES: Calculates metrics directly from PostgreSQL.
        2. DYNAMIC CALCULATIONS:
           - expected_revenue_usd: 7-day rolling average revenue. +15% if target date is a weekend.
           - expected_order_count: 7-day rolling average order volume.
           - inventory_alerts: Items where stock_quantity <= reorder_level. If none, [].
        3. STRICT FORMATTING: Currency keys ending in _usd.
        """
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%B %d, %Y")
        is_weekend = now.weekday() >= 5

        # 1. Dynamic Sales Forecast Calculation from PostgreSQL
        seven_days_ago = now - timedelta(days=7)
        sales_q = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0),
            func.count(Sale.id)
        ).where(
            Sale.business_id == business_id,
            Sale.sale_date >= seven_days_ago
        )
        sales_res = await db.execute(sales_q)
        sales_row = sales_res.fetchone()
        
        total_7d_revenue = float(sales_row[0]) if sales_row else 0.0
        total_7d_orders = int(sales_row[1]) if sales_row else 0

        if total_7d_orders > 0:
            avg_daily_rev = total_7d_revenue / 7.0
            if is_weekend:
                avg_daily_rev *= 1.15
            expected_revenue_usd = round(avg_daily_rev, 2)
            expected_order_count = int(round(total_7d_orders / 7.0))
        else:
            expected_revenue_usd = 0.0
            expected_order_count = 0

        # 2. Dynamic Inventory Alerts Calculation from PostgreSQL
        inv_q = (
            select(Inventory)
            .where(
                Inventory.business_id == business_id,
                Inventory.current_stock <= Inventory.minimum_stock
            )
            .options(selectinload(Inventory.product))
        )
        inv_res = await db.execute(inv_q)
        alert_items = inv_res.scalars().all()

        inventory_alerts: List[InventoryAlertSchema] = []
        for inv in alert_items:
            p_name = inv.product.name if inv.product else f"Item #{inv.product_id}"
            inventory_alerts.append(InventoryAlertSchema(
                item_id=str(inv.product_id),
                item_name=p_name,
                current_stock=inv.current_stock,
                reorder_level=inv.minimum_stock,
                action_required="REORDER_IMMEDIATE"
            ))

        # 3. Dynamic Business Opportunities & Summary from Backend Services
        analytics = await AnalyticsService.get_analytics_overview(db, business_id)
        best_seller_name = analytics.best_sellers[0].name if analytics.best_sellers else "top products"

        brief_prompt = (
            f"SYSTEM PROMPT: Dynamic Business Operations Analyst\n"
            f"You are an automated business analysis engine. Process this raw database payload:\n"
            f"- Report Date: {today_str}\n"
            f"- Weekend Target Date: {is_weekend}\n"
            f"- Expected Revenue USD: ${expected_revenue_usd}\n"
            f"- Expected Order Count: {expected_order_count}\n"
            f"- Inventory Alerts Count: {len(inventory_alerts)}\n"
            f"- Top Selling Item: {best_seller_name}\n\n"
            "Return JSON matching:\n"
            "{\n"
            "  \"greeting\": \"Good morning! Here is your daily operational summary.\",\n"
            "  \"business_opportunities\": [\"Actionable advice targeting top selling item\"],\n"
            "  \"business_summary\": \"Summary derived from sales trend and inventory status\"\n"
            "}"
        )

        messages = [
            {"role": "system", "content": "You are a Retail Operations Analyst generating clean JSON summaries."},
            {"role": "user", "content": brief_prompt}
        ]

        try:
            parsed = await self.groq.generate_json_completion(messages)
        except Exception:
            parsed = {}

        raw_opps = parsed.get("business_opportunities")
        if isinstance(raw_opps, list) and raw_opps:
            biz_opps = [str(x) for x in raw_opps]
        else:
            biz_opps = [f"Focus restocking and promotional campaigns on '{best_seller_name}'."]

        raw_summary = parsed.get("business_summary")
        if isinstance(raw_summary, str) and raw_summary.strip():
            biz_summary = raw_summary.strip()
        else:
            biz_summary = f"Store operations running with ${expected_revenue_usd} predicted daily revenue and {len(inventory_alerts)} active inventory reorder alerts."

        return DailyBriefResponse(
            greeting="Good morning! Here is your daily operational summary.",
            report_date=today_str,
            sales_forecast=SalesForecastSchema(
                expected_revenue_usd=expected_revenue_usd,
                expected_order_count=expected_order_count,
                calculation_basis="Based on 7-day rolling average with day-of-week weighting"
            ),
            inventory_alerts=inventory_alerts,
            business_opportunities=biz_opps,
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
