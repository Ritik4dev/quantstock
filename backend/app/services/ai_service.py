import json
import logging
from typing import List, Optional
from app.prompts.discovery_prompts import (
    SYSTEM_EXTRACTION_PROMPT,
    SYSTEM_FOLLOWUP_PROMPT,
    SYSTEM_SUMMARY_PROMPT,
)
from app.schemas.ai_discovery import ExtractedProfile
from app.services.groq_service import GroqService
from app.utils.exceptions import OpenAIProcessingException

logger = logging.getLogger("app.services.ai")

REQUIRED_PROFILE_FIELDS = [
    "business_type",
    "location_type",
    "primary_customers",
    "daily_customers",
    "top_products",
    "employees",
    "supplier_count",
    "seasonality",
    "business_scale",
]

HUMAN_FIELD_NAMES = {
    "business_type": "Business Type / Category",
    "location_type": "Location Context / Surrounding Area",
    "primary_customers": "Primary Customer Demographics",
    "daily_customers": "Average Daily Customer Count",
    "top_products": "Top Selling Products / Items",
    "employees": "Number of Employees / Workforce",
    "supplier_count": "Number of Suppliers",
    "seasonality": "Seasonality / Peak Sales Periods",
    "business_scale": "Scale of Business Operation",
}


class AIService:
    """
    AI Discovery Engine for processing store owner descriptions,
    extracting structured attributes, identifying missing fields,
    generating targeted follow-up questions, and producing confirmation summaries.
    Powered by official Groq API.
    """

    def __init__(self):
        self.groq = GroqService()

    async def extract_business_information(
        self, user_input: str, existing_profile: Optional[ExtractedProfile] = None
    ) -> ExtractedProfile:
        """
        Calls Groq Service to extract business attributes from natural language user input.
        Merges new extracted attributes with existing profile data.
        """
        logger.info("Extracting business information using Groq Service...")

        context_str = ""
        if existing_profile:
            context_str = f"\nExisting collected profile data:\n{existing_profile.model_dump_json(indent=2)}\n"

        user_prompt = (
            f"{context_str}\nUser Input: \"{user_input}\"\n"
            "Extract or update all relevant store profile fields into a JSON object matching these attributes: "
            "business_type, location_type, nearby_places (list), primary_customers (list), "
            "daily_customers, top_products (list), employees, supplier_count, seasonality, business_scale, notes."
        )

        messages = [
            {"role": "system", "content": SYSTEM_EXTRACTION_PROMPT},
            {"role": "user", "content": user_prompt}
        ]

        try:
            parsed_dict = await self.groq.generate_json_completion(messages)
            extracted = ExtractedProfile(**parsed_dict)
            logger.info("Successfully extracted structured output using Groq Service.")
        except Exception as e:
            logger.warning(f"Groq structured parsing fallback used ({e}).")
            extracted = self._heuristic_extraction(user_input)

        if existing_profile:
            return self._merge_profiles(existing_profile, extracted)

        return extracted

    @staticmethod
    def find_missing_fields(profile: ExtractedProfile) -> List[str]:
        """Identify missing fields out of the required business profile fields."""
        missing = []
        profile_dict = profile.model_dump()

        for field in REQUIRED_PROFILE_FIELDS:
            val = profile_dict.get(field)
            if val is None or val == "" or val == []:
                missing.append(field)

        logger.info(f"Missing fields identified: {missing}")
        return missing

    async def generate_followup_questions(self, missing_fields: List[str]) -> List[str]:
        """Generates polite follow-up questions targeting ONLY the missing fields."""
        if not missing_fields:
            return []

        missing_readable = [HUMAN_FIELD_NAMES.get(f, f) for f in missing_fields]

        prompt_str = SYSTEM_FOLLOWUP_PROMPT.format(
            missing_fields_str=", ".join(missing_readable)
        )
        messages = [
            {"role": "system", "content": prompt_str},
            {"role": "user", "content": f"Please ask questions to collect these missing items: {', '.join(missing_readable)}"}
        ]

        try:
            content = await self.groq.generate_completion(messages, temperature=0.7)
            questions = [
                line.strip("- *1234567890. ")
                for line in content.split("\n")
                if line.strip()
            ]
            if questions:
                return questions
        except Exception as e:
            logger.error(f"Failed to generate follow-up questions: {e}")

        return [
            f"Could you please share details regarding your store's {HUMAN_FIELD_NAMES.get(field, field)}?"
            for field in missing_fields
        ]

    async def generate_confirmation_summary(self, profile: ExtractedProfile) -> str:
        """Generates a clean structured summary of all gathered business information."""
        p = profile.model_dump()

        summary_lines = [
            "### Business Information Summary\n",
            f"- **Business Type / Category**: {p.get('business_type') or 'Not specified'}",
            f"- **Location Context**: {p.get('location_type') or 'Not specified'}",
            f"- **Nearby Places**: {', '.join(p.get('nearby_places') or []) or 'None specified'}",
            f"- **Primary Customers**: {', '.join(p.get('primary_customers') or []) or 'Not specified'}",
            f"- **Daily Customers / Footfall**: {p.get('daily_customers') or 'Not specified'}",
            f"- **Top Selling Products**: {', '.join(p.get('top_products') or []) or 'Not specified'}",
            f"- **Staff Size / Employees**: {p.get('employees') or 'Not specified'}",
            f"- **Supplier Count**: {p.get('supplier_count') or 'Not specified'}",
            f"- **Seasonality / Peak Period**: {p.get('seasonality') or 'Not specified'}",
            f"- **Business Scale**: {p.get('business_scale') or 'Not specified'}",
        ]

        if p.get("notes"):
            summary_lines.append(f"- **Additional Notes**: {p.get('notes')}")

        summary_lines.append("\n**Is this information correct?**")

        return "\n".join(summary_lines)

    @staticmethod
    def _merge_profiles(base: ExtractedProfile, new_data: ExtractedProfile) -> ExtractedProfile:
        """Merge new profile data into base profile without overwriting non-null values with nulls."""
        base_dict = base.model_dump()
        new_dict = new_data.model_dump()

        for key, val in new_dict.items():
            if val is not None and val != "" and val != []:
                base_dict[key] = val

        return ExtractedProfile(**base_dict)

    @staticmethod
    def _heuristic_extraction(user_input: str) -> ExtractedProfile:
        """Rule-based heuristic fallback for text parsing."""
        text = user_input.lower()
        profile_dict = {}

        if "grocery" in text or "store" in text or "shop" in text or "supermarket" in text:
            profile_dict["business_type"] = "Grocery Store"
        if "college" in text or "university" in text or "campus" in text:
            profile_dict["location_type"] = "Near College / Campus"
            profile_dict["nearby_places"] = ["College"]
            profile_dict["primary_customers"] = ["College Students"]

        import re
        customer_match = re.search(r"(\d+)\s*(customers|people|visitors)", text)
        if customer_match:
            profile_dict["daily_customers"] = customer_match.group(1)

        products = []
        if "cold drink" in text or "drinks" in text:
            products.append("Cold Drinks")
        if "maggi" in text:
            products.append("Maggi")
        if "biscuit" in text or "biscuits" in text:
            products.append("Biscuits")
        if products:
            profile_dict["top_products"] = products

        employee_match = re.search(r"(\d+)\s*(employees|staff|workers)", text)
        if employee_match:
            profile_dict["employees"] = employee_match.group(1)

        supplier_match = re.search(r"(\d+)\s*(suppliers|vendors)", text)
        if supplier_match:
            profile_dict["supplier_count"] = supplier_match.group(1)

        return ExtractedProfile(**profile_dict)
