import logging
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Sale
from app.schemas.copilot import ParseCommandResponse
from app.services.groq_service import GroqService

logger = logging.getLogger("app.services.command_parser")


class CommandParserService:
    """
    Service converting natural language inventory commands into structured JSON actions,
    validating product existence in PostgreSQL, and executing database updates.
    """

    def __init__(self, groq_service: Optional[GroqService] = None):
        self.groq = groq_service if groq_service else GroqService()

    async def parse_and_execute_command(
        self, db: AsyncSession, business_id: int, command_text: str
    ) -> ParseCommandResponse:
        """
        Parses text command via Groq Service, validates product in SQL, and executes inventory update.
        """
        logger.info(f"Parsing natural language command for business {business_id}: '{command_text}'")

        system_instruction = (
            "You are a structured JSON extractor converting natural language inventory updates into JSON. "
            "Return JSON matching: {\"action\": \"sale\"|\"add_stock\"|\"remove_stock\", \"product\": \"<product name>\", \"quantity\": <int>}"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": command_text}
        ]

        parsed_json = await self.groq.generate_json_completion(messages)
        action = parsed_json.get("action", "sale").lower()
        prod_query_name = str(parsed_json.get("product", "")).strip()
        quantity = int(parsed_json.get("quantity", 1))

        if not prod_query_name:
            return ParseCommandResponse(
                action=action,
                product_name="Unknown",
                quantity=quantity,
                executed=False,
                message="Could not identify product name from command."
            )

        # Fuzzy match product in PostgreSQL
        search_pattern = f"%{prod_query_name.lower()}%"
        p_query = (
            select(Product)
            .where(
                Product.business_id == business_id,
                Product.name.ilike(search_pattern)
            )
            .options(selectinload(Product.inventory))
        )
        res = await db.execute(p_query)
        matching_products = res.scalars().all()

        # If direct ilike fails, try matching first word
        if not matching_products and " " in prod_query_name:
            first_word = prod_query_name.split()[0]
            p_query2 = (
                select(Product)
                .where(
                    Product.business_id == business_id,
                    Product.name.ilike(f"%{first_word}%")
                )
                .options(selectinload(Product.inventory))
            )
            res2 = await db.execute(p_query2)
            matching_products = res2.scalars().all()

        if not matching_products:
            return ParseCommandResponse(
                action=action,
                product_name=prod_query_name,
                quantity=quantity,
                executed=False,
                message=f"I don't have enough information. Product '{prod_query_name}' was not found in your PostgreSQL inventory catalog."
            )

        target_product = matching_products[0]
        inv = target_product.inventory

        if not inv:
            return ParseCommandResponse(
                action=action,
                product_name=target_product.name,
                quantity=quantity,
                executed=False,
                product_id=target_product.id,
                message=f"No active inventory record found for product '{target_product.name}'."
            )

        # Execute validated SQL database update
        new_stock = inv.current_stock

        if action == "sale":
            if inv.current_stock < quantity:
                return ParseCommandResponse(
                    action=action,
                    product_name=target_product.name,
                    quantity=quantity,
                    executed=False,
                    product_id=target_product.id,
                    updated_stock=inv.current_stock,
                    message=f"Cannot record sale: requested quantity ({quantity}) exceeds available stock ({inv.current_stock})."
                )

            inv.current_stock -= quantity
            new_stock = inv.current_stock

            # Create sale transaction record
            sale_record = Sale(
                business_id=business_id,
                product_id=target_product.id,
                quantity=quantity,
                unit_price=inv.selling_price,
                buying_price=inv.buying_price,
                total_amount=round(quantity * inv.selling_price, 2)
            )
            db.add(sale_record)
            msg = f"Successfully recorded sale of {quantity} unit(s) of '{target_product.name}'. Remaining stock: {new_stock}."

        elif action == "add_stock":
            inv.current_stock += quantity
            new_stock = inv.current_stock
            msg = f"Successfully added {quantity} unit(s) to '{target_product.name}'. Updated stock: {new_stock}."

        elif action in ["remove_stock", "remove_expired"]:
            inv.current_stock = max(0, inv.current_stock - quantity)
            new_stock = inv.current_stock
            msg = f"Successfully removed {quantity} unit(s) from '{target_product.name}'. Updated stock: {new_stock}."

        else:
            msg = f"Unrecognized action '{action}'. Stock left unchanged at {inv.current_stock}."

        await db.commit()

        return ParseCommandResponse(
            action=action,
            product_name=target_product.name,
            quantity=quantity,
            executed=True,
            message=msg,
            product_id=target_product.id,
            updated_stock=new_stock
        )
