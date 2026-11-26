
from rest_framework import serializers

from .models import Category, ProduceListing


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProduceListingSerializer(serializers.ModelSerializer):

    farmer_name = serializers.CharField(
        source="farmer.username",
        read_only=True
    )

    farm_name = serializers.CharField(
        source="farmer.farmer_profile.farm_name",
        read_only=True,
        default=""
    )

    farmer_phone = serializers.CharField(
        source="farmer.farmer_profile.phone_number",
        read_only=True,
        default=""
    )

    farmer_location = serializers.CharField(
        source="farmer.farmer_profile.location",
        read_only=True,
        default=""
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:
        model = ProduceListing

        fields = [
            "id",
            "farmer",
            "farmer_name",
            "farm_name",
            "farmer_phone",
            "farmer_location",
            "category",
            "category_name",
            "name",
            "description",
            "image",
            "price",
            "quantity",
            "unit",
            "location",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "farmer",
            "farmer_name",
            "farm_name",
            "farmer_phone",
            "farmer_location",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):

        if self.instance is None:
            category = attrs.get("category")

            if category and category.name.lower() in [
                "livestock",
                "poultry",
                "meat",
                "fish",
            ]:
                raise serializers.ValidationError(
                    "Only agricultural crop produce is allowed."
                )

        if attrs.get("price", 0) <= 0:
            raise serializers.ValidationError(
                {"price": "Price must be greater than zero."}
            )

        if attrs.get("quantity", 0) <= 0:
            raise serializers.ValidationError(
                {"quantity": "Quantity must be greater than zero."}
            )

        return attrs
