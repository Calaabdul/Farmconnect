
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Category, ProduceListing


class ProduceListingOwnershipTests(TestCase):

    def setUp(self):

        self.client = APIClient()

        self.farmer_a = User.objects.create_user(
            username="farmer_a",
            email="farmer_a@example.com",
            password="TestPassword123!",
            role="FARMER",
        )

        self.farmer_b = User.objects.create_user(
            username="farmer_b",
            email="farmer_b@example.com",
            password="TestPassword123!",
            role="FARMER",
        )

        self.category = Category.objects.create(
            name="Grains",
        )

        self.listing = ProduceListing.objects.create(
            farmer=self.farmer_b,
            category=self.category,
            name="Maize",
            description="Fresh maize",
            price=Decimal("20.00"),
            quantity=Decimal("100.00"),
            unit=ProduceListing.Unit.BAG,
            location="Ilorin",
            status=ProduceListing.Status.AVAILABLE,
        )

    def test_farmer_cannot_update_another_farmers_listing(self):

        self.client.force_authenticate(user=self.farmer_a)

        response = self.client.patch(
            f"/api/marketplace/produce/{self.listing.id}/",
            {"price": "10.00"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.listing.refresh_from_db()

        self.assertEqual(self.listing.price, Decimal("20.00"))

    def test_farmer_cannot_delete_another_farmers_listing(self):

        self.client.force_authenticate(user=self.farmer_a)

        response = self.client.delete(
            f"/api/marketplace/produce/{self.listing.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            ProduceListing.objects.filter(
                id=self.listing.id
            ).exists()
        )
