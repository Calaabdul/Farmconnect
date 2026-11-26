from django.shortcuts import render


def home(request):
    return render(request, "home.html")

def marketplace(request):
    return render(request, "marketplace.html")


def login_page(request):
    return render(request, "login.html")


def register_page(request):
    return render(request, "register.html")


def farmer_dashboard(request):
    return render(request, "farmer_dashboard.html")


def buyer_dashboard(request):
    return render(request, "buyer_dashboard.html")