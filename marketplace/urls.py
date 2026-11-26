from django.urls import path

from .views import (
    CategoryListView,
    ProduceDetailView,
    ProduceListCreateView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="categories"),

    path("produce/", ProduceListCreateView.as_view(), name="produce-list"),

    path(
        "produce/<int:pk>/",
        ProduceDetailView.as_view(),
        name="produce-detail",
    ),
]