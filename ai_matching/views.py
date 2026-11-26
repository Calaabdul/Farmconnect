
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsBuyer

from .serializers import BuyerSearchSerializer
from .services import extract_buyer_request, AIServiceError
from .matching import find_matching_listings


class AISearchView(APIView):
    permission_classes = [IsAuthenticated, IsBuyer]

    def post(self, request):
        serializer = BuyerSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]

        # Step 1: Understand the buyer's message.
        try:
            buyer_request = extract_buyer_request(message)

        except AIServiceError:
            return Response(
                {
                    "detail": (
                        "Our AI search service is temporarily unavailable. "
                        "Please try again shortly."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Step 2: Validate the buyer's intent and extracted information.

        if buyer_request.intent != "FIND_PRODUCE":
            return Response({
                "message": "Please describe the agricultural produce you want.",
                "matches": [],
            })

        if not buyer_request.produce_name:
            return Response({
                "message": "Please specify the produce you want, such as maize, rice or yam.",
                "matches": [],
            })
        # Step 3: Search the actual database listings.
        matches = find_matching_listings(buyer_request)

        # Step 4: Prepare the results for the buyer.
        results = []

        for match in matches:
            listing = match["listing"]

            image_url = None

            if listing.image and listing.image.name:
                image_url = request.build_absolute_uri(
                    listing.image.url
                )

            results.append({
                "id": listing.id,
                "produce_name": listing.name,
                "category": listing.category.name,
                "description": listing.description,
                "image": image_url,
                "price": str(listing.price),
                "quantity": str(listing.quantity),
                "unit": listing.unit,
                "unit_display": listing.get_unit_display(),
                "listing_location": listing.location,
                "estimated_total": (
                    str(match["estimated_total"])
                    if match["estimated_total"] is not None
                    else None
                ),
                "farmer": {
                    "name": match["farmer_name"],
                    "farm_name": match["farm_name"],
                    "phone_number": match["phone_number"],
                    "location": match["farmer_location"],
                },
                "location_match": match["location_match"],
            })

        return Response({
            "message": (
                f"We found {len(results)} matching listings."
                if results
                else "No matching produce listings were found."
            ),
            "extracted_request": buyer_request.model_dump(),
            "matches": results,
        })
