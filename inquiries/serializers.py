from rest_framework import serializers

from .models import Inquiry


class InquirySerializer(serializers.ModelSerializer):

    buyer_name = serializers.CharField(
        source="buyer.username",
        read_only=True
    )

    produce_name = serializers.CharField(
        source="listing.name",
        read_only=True
    )

    farmer_name = serializers.CharField(
        source="listing.farmer.username",
        read_only=True
    )

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "listing",
            "produce_name",
            "farmer_name",
            "buyer",
            "buyer_name",
            "quantity",
            "message",
            "status",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "buyer",
            "status",
            "created_at",
        ]

    def validate(self, attrs):
        listing = attrs["listing"]
        quantity = attrs["quantity"]

        if listing.status != "AVAILABLE":
            raise serializers.ValidationError(
                "This produce is no longer available."
            )

        if listing.farmer_id == self.context["request"].user.id:
            raise serializers.ValidationError(
                "You cannot submit an inquiry for your own listing."
            )

        if quantity <= 0:
            raise serializers.ValidationError(
                {"quantity": "Quantity must be greater than zero."}
            )

        if quantity > listing.quantity:
            raise serializers.ValidationError(
                {"quantity": "Requested quantity exceeds available stock."}
            )

        return attrs



class InquiryResponseSerializer(serializers.ModelSerializer):

    class Meta:
        model = Inquiry
        fields = ["status"]