
from typing import Literal

from pydantic import BaseModel, Field


class BuyerProduceRequest(BaseModel):
    """Structured information extracted from a buyer's request."""

    produce_name: str | None = Field(
        default=None,
        description="Name of the agricultural crop being requested."
    )

    quantity: float | None = Field(
        default=None,
        gt=0,
        description="Requested quantity, if explicitly provided."
    )

    unit: Literal[
        "KG",
        "TON",
        "BAG",
        "CRATE",
        "TUBER",
        "BASKET"
    ] | None = Field(
        default=None,
        description="Supported measurement unit."
    )

    location: str | None = Field(
        default=None,
        description="Requested location, if explicitly provided."
    )

    max_price: float | None = Field(
        default=None,
        gt=0,
        description="Maximum total budget, if explicitly provided."
    )

    intent: Literal[
        "FIND_PRODUCE",
        "OTHER"
    ] = Field(
        description="Whether the buyer is searching for agricultural crop produce."
    )
