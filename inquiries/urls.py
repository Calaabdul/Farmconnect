from django.urls import path

from .views import InquiryListCreateView, InquiryResponseView

urlpatterns = [
    path("", InquiryListCreateView.as_view(), name="inquiry-list-create"),

    path(
        "<int:pk>/respond/",
        InquiryResponseView.as_view(),
        name="inquiry-respond"
    ),
]