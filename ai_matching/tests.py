
from decimal import Decimal

from django.test import TestCase

from accounts.models import User, FarmerProfile
from marketplace.models import Category, ProduceListing

from .schemas import BuyerProduceRequest
from .matching import find_matching_listings


class AIMatchingTests(TestCase):

    def setUp(self):

        self.farmer = User.objects.create_user(
            username="testfarmer",
            email="farmer@example.com",
            password="TestPassword123!",
            role="FARMER",
        )

        FarmerProfile.objects.create(
            user=self.farmer,
            farm_name="Green Farm",
            location="Ilorin",
            phone_number="+2348000000000",
        )

        self.category = Category.objects.create(
            name="Grains",
        )

        self.maize_listing = ProduceListing.objects.create(
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

    def test_matching_produce_with_sufficient_quantity(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            quantity=20,
            unit="BAG",
            location="Ilorin",
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 1)

    def test_listing_with_insufficient_quantity_is_excluded(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            quantity=150,
            unit="BAG",
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 0)

    def test_different_units_do_not_match(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            quantity=20,
            unit="TON",
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 0)

    def test_listing_exceeding_budget_is_excluded(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            quantity=20,
            unit="BAG",
            max_price=300,
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 0)

    def test_matching_listing_within_budget_is_returned(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            quantity=20,
            unit="BAG",
            max_price=500,
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 1)

        self.assertEqual(
            matches[0]["estimated_total"],
            Decimal("400.00"),
        )

    def test_matching_location_is_recognized(self):

        request = BuyerProduceRequest(
            produce_name="maize",
            location="ilorin",
            intent="FIND_PRODUCE",
        )

        matches = find_matching_listings(request)

        self.assertEqual(len(matches), 1)
        self.assertTrue(matches[0]["location_match"])
