from django.conf import settings
from django.db import models


class Inquiry(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    listing = models.ForeignKey(
        "marketplace.ProduceListing",
        on_delete=models.CASCADE,
        related_name="inquiries"
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inquiries"
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    message = models.TextField(blank=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.buyer.username} - {self.listing.name}"