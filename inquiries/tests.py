
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from marketplace.models import Category, ProduceListing
from .models import Inquiry


class InquiryPermissionTests(TestCase):

    def setUp(self):

        self.client = APIClient()

        self.farmer = User.objects.create_user(
            username="farmer_test",
            email="farmer@example.com",
            password="TestPassword123!",
            role="FARMER",
        )

        self.buyer = User.objects.create_user(
            username="buyer_test",
            email="buyer@example.com",
            password="TestPassword123!",
            role="BUYER",
        )

        self.category = Category.objects.create(
            name="Grains",
        )

        self.listing = ProduceListing.objects.create(
            farmer=self.farmer,
            category=self.category,
            name="Maize",
            description="Fresh maize",
            price=Decimal("20.00"),
            quantity=Decimal("100.00"),
            unit=ProduceListing.Unit.BAG,
            location="Ilorin",
            status=ProduceListing.Status.AVAILABLE,
        )

        self.inquiry = Inquiry.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            quantity=Decimal("10.00"),
            message="I want to buy 10 bags.",
        )

    def test_farmer_cannot_submit_inquiry(self):

        self.client.force_authenticate(user=self.farmer)

        response = self.client.post(
            "/api/inquiries/",
            {
                "listing": self.listing.id,
                "quantity": "10.00",
                "message": "I want this produce.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_buyer_cannot_respond_to_inquiry(self):

        self.client.force_authenticate(user=self.buyer)

        response = self.client.patch(
            f"/api/inquiries/{self.inquiry.id}/respond/",
            {"status": "ACCEPTED"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_inquiry_belongs_to_correct_buyer(self):

        self.client.force_authenticate(user=self.buyer)

        response = self.client.get("/api/inquiries/")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)
