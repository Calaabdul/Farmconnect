
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from .models import User


class FarmConnectPermissionTests(APITestCase):

    def setUp(self):

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

    def test_buyer_cannot_create_produce_listing(self):

        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/marketplace/produce/",
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_farmer_cannot_use_ai_search(self):

        self.client.force_authenticate(user=self.farmer)

        response = self.client.post(
            "/api/ai-matching/search/",
            {"message": "I need 20 bags of maize"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_use_ai_search(self):

        response = self.client.post(
            "/api/ai-matching/search/",
            {"message": "I need 20 bags of maize"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
