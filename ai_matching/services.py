
from django.conf import settings

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from .schemas import BuyerProduceRequest


class AIServiceError(Exception):
    """Raised when the AI service cannot process a request."""


def extract_buyer_request(message: str) -> BuyerProduceRequest:
    """Extract structured produce requirements from a buyer's message."""

    if not message.strip():
        raise ValueError("The buyer's message cannot be empty.")

    try:
        llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0,
            api_key=settings.GROQ_API_KEY,
            timeout=30,
            max_retries=2,
        )

        structured_llm = llm.with_structured_output(
            BuyerProduceRequest
        )

        result = structured_llm.invoke([
            SystemMessage(
                content="""
You are an agricultural marketplace request extraction assistant
for FarmConnect, a Nigerian agricultural produce marketplace.

Extract only information explicitly provided by the buyer.

SUPPORTED UNITS:
KG, TON, BAG, CRATE, TUBER, BASKET.

Map:
kilograms/kilos -> KG
tonnes/tons -> TON
bags/sacks -> BAG
crates -> CRATE
tubers -> TUBER
baskets -> BASKET

RULES:
- Never convert between units.
- Never invent missing quantities, units, locations or budgets.
- Extract the maximum TOTAL budget, not the unit price.
- If a field is missing, return null.
- Set intent to FIND_PRODUCE for crop produce searches.
- Set intent to OTHER for unrelated requests.
- Do not treat livestock, poultry, meat or fish as crop produce.
"""
            ),
            HumanMessage(content=message),
        ])

        if not isinstance(result, BuyerProduceRequest):
            raise AIServiceError("Unexpected AI response.")

        return result

    except ValueError:
        raise

    except Exception as exc:
        raise AIServiceError(
            "The AI service could not process the request."
        ) from exc
