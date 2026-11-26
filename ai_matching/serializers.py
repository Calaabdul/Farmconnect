
from rest_framework import serializers


class BuyerSearchSerializer(serializers.Serializer):
    message = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
    )
