from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Only super administrators can manage departments and staff."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "super_admin"
        )


class IsDepartmentManager(BasePermission):
    message = "Only Department Managers can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "manager"
            and request.user.is_active
            and request.user.is_verified
        )