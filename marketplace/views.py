from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Category, ProduceListing
from .serializers import (
    CategorySerializer,
    ProduceListingSerializer,
)
from .permissions import IsFarmerOrReadOnly


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ProduceListCreateView(generics.ListCreateAPIView):
    serializer_class = ProduceListingSerializer
    permission_classes = [IsFarmerOrReadOnly]

    filterset_fields = {
        "category": ["exact"],
        "location": ["icontains"],
        "price": ["gte", "lte"],
    }
    search_fields = ["name", "description", "location", "category__name"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user

        if (
            user.is_authenticated
            and user.role == "FARMER"
            and self.request.query_params.get("mine") == "1"
        ):
            return ProduceListing.objects.filter(
                farmer=user
            ).select_related("farmer", "category")

        return ProduceListing.objects.filter(
            status=ProduceListing.Status.AVAILABLE
        ).select_related("farmer", "category")

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

class ProduceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProduceListing.objects.all().select_related(
        "farmer", "category"
    )

    serializer_class = ProduceListingSerializer
    permission_classes = [IsFarmerOrReadOnly]  # noqa: RUF012
