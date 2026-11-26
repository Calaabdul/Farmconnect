from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import FarmerProfile, BuyerProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    password2 = serializers.CharField(write_only=True)

    location = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)

    farm_name = serializers.CharField(
        write_only=True,
        required=False
    )

    business_name = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password2",
            "location",
            "phone_number",
            "farm_name",
            "business_name",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({
                "password": "Passwords do not match."
            })

        if attrs["role"] == User.Role.FARMER and not attrs.get("farm_name"):
            raise serializers.ValidationError({
                "farm_name": "Farm name is required for farmers."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):

        validated_data.pop("password2")
        password = validated_data.pop("password")

        location = validated_data.pop("location")
        phone_number = validated_data.pop("phone_number")

        farm_name = validated_data.pop("farm_name", "")
        business_name = validated_data.pop("business_name", "")

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        if user.role == User.Role.FARMER:
            FarmerProfile.objects.create(
                user=user,
                farm_name=farm_name,
                location=location,
                phone_number=phone_number
            )

        else:
            BuyerProfile.objects.create(
                user=user,
                business_name=business_name,
                location=location,
                phone_number=phone_number
            )

        return user



class UserProfileSerializer(serializers.ModelSerializer):

    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "profile",
        ]
        read_only_fields = fields

    def get_profile(self, obj):

        if obj.role == User.Role.FARMER:
            profile = getattr(obj, "farmer_profile", None)

            if profile:
                return {
                    "farm_name": profile.farm_name,
                    "location": profile.location,
                    "phone_number": profile.phone_number,
                }

        elif obj.role == User.Role.BUYER:
            profile = getattr(obj, "buyer_profile", None)

            if profile:
                return {
                    "business_name": profile.business_name,
                    "location": profile.location,
                    "phone_number": profile.phone_number,
                }

        return None