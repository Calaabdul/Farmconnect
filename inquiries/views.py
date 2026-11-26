from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Inquiry
from .serializers import InquiryResponseSerializer, InquirySerializer
from accounts.permissions import IsBuyer, IsFarmer


class InquiryListCreateView(generics.ListCreateAPIView):
    serializer_class = InquirySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "BUYER":
            return Inquiry.objects.filter(
                buyer=user
            ).select_related("listing", "listing__farmer")

        if user.role == "FARMER":
            return Inquiry.objects.filter(
                listing__farmer=user
            ).select_related("buyer", "listing")

        return Inquiry.objects.none()

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsBuyer()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class InquiryResponseView(generics.UpdateAPIView):
    serializer_class = InquiryResponseSerializer
    permission_classes = [IsFarmer]

    http_method_names = ["patch", "head", "options"]

    def get_queryset(self):
        return Inquiry.objects.filter(
            listing__farmer=self.request.user,
            status=Inquiry.Status.PENDING
        )