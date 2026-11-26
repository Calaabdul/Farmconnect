
from decimal import Decimal

from django.db.models import Q

from accounts.models import FarmerProfile
from marketplace.models import ProduceListing

from .schemas import BuyerProduceRequest


def find_matching_listings(
    request: BuyerProduceRequest,
) -> list[dict]:

    if request.intent != "FIND_PRODUCE" or not request.produce_name:
        return []

    listings = ProduceListing.objects.filter(
        status=ProduceListing.Status.AVAILABLE
    ).filter(
        Q(name__icontains=request.produce_name)
        | Q(category__name__icontains=request.produce_name)
    ).select_related(
        "farmer",
        "farmer__farmer_profile",
        "category",
    )

    # Filter by unit only when the buyer specifies one.
    if request.unit:
        listings = listings.filter(unit=request.unit)

    # Compare quantities only when both quantity and unit are known.
    requested_quantity = None

    if request.quantity is not None and request.unit is not None:
        requested_quantity = Decimal(str(request.quantity))
        listings = listings.filter(quantity__gte=requested_quantity)

    matches = []

    for listing in listings:

        estimated_total = None

        if requested_quantity is not None:
            estimated_total = listing.price * requested_quantity

        # Exclude listings exceeding the buyer's total budget.
        if (
            request.max_price is not None
            and estimated_total is not None
            and estimated_total > Decimal(str(request.max_price))
        ):
            continue

        try:
            profile = listing.farmer.farmer_profile
        except FarmerProfile.DoesNotExist:
            profile = None

        # Determine whether the listing location matches.
        location_match = False

        if request.location:
            location_match = (
                listing.location.strip().lower()
                == request.location.strip().lower()
            )

        matches.append({
            "listing": listing,
            "farmer_name": (
                listing.farmer.get_full_name()
                or listing.farmer.username
            ),
            "farm_name": profile.farm_name if profile else "",
            "phone_number": profile.phone_number if profile else "",
            "farmer_location": profile.location if profile else "",
            "estimated_total": estimated_total,
            "location_match": location_match,
        })

    # Rank exact location matches first, then lower prices.
    matches.sort(
        key=lambda item: (
            not item["location_match"],
            item["listing"].price,
        )
    )

    return matches
