from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProduceListing(models.Model):

    class Unit(models.TextChoices):
        KG = "KG", "Kilograms"
        TON = "TON", "Tonnes"
        BAG = "BAG", "Bags"
        CRATE = "CRATE", "Crates"
        TUBER = "TUBER", "Tubers"
        BASKET = "BASKET", "Baskets"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        SOLD_OUT = "SOLD_OUT", "Sold out"

    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="produce_listings"
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="listings"
    )

    name = models.CharField(max_length=150)
    description = models.TextField()
    image = models.ImageField(upload_to="produce/")

    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=10, choices=Unit.choices)

    location = models.CharField(max_length=150)

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.AVAILABLE
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.farmer.username}"