from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    message = "Only farmers can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "FARMER"
        )


class IsBuyer(BasePermission):
    message = "Only buyers can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "BUYER"
        )


class IsOwner(BasePermission):
    message = "You can only access your own resources."

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "farmer_id"):
            return obj.farmer_id == request.user.id

        if hasattr(obj, "buyer_id"):
            return obj.buyer_id == request.user.id

        if hasattr(obj, "user_id"):
            return obj.user_id == request.user.id

        return False