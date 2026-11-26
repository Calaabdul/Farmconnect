from django.contrib import admin
from .models import User, FarmerProfile, BuyerProfile

admin.site.register(User)
admin.site.register(FarmerProfile)
admin.site.register(BuyerProfile)