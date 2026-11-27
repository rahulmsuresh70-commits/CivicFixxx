from django.urls import path

from .views import (
    DepartmentListCreateView,
    DepartmentDetailView,
    ActiveDepartmentListView,
    MyDepartmentStaffView,
    MyDepartmentStaffDetailView,
    MyStaffProfileView,
    MyStaffDashboardView,
    DepartmentManagerChangePasswordView,
    AdminDepartmentManagerListCreateView,
    AdminDepartmentManagerDetailView,
    AdminStaffListCreateView,
    AdminStaffDetailView
)


urlpatterns = [

    path(
        "",
        DepartmentListCreateView.as_view(),
        name="department-list-create",
    ),

    path(
        "active/",
        ActiveDepartmentListView.as_view(),
        name="active-department-list",
    ),

    path(
        "<int:pk>/",
        DepartmentDetailView.as_view(),
        name="department-detail",
    ),

    path(
        "my/staff/",
        MyDepartmentStaffView.as_view(),
        name="my-department-staff",
    ),

    path(
        "my/staff/<int:user_id>/",
        MyDepartmentStaffDetailView.as_view(),
        name="my-department-staff-detail",
    ),

    path(
        "my/profile/",
        MyStaffProfileView.as_view(),
        name="my-staff-profile",
    ),

    path(
        "my/change-password/",
        DepartmentManagerChangePasswordView.as_view(),
        name="manager-change-password",
    ),

    path(
        "my/dashboard/",
        MyStaffDashboardView.as_view(),
        name="my-staff-dashboard",
    ),
    path(
        "admin/managers/",
        AdminDepartmentManagerListCreateView.as_view(),
        name="admin-department-manager-list",
    ),

    path(
        "admin/managers/<int:pk>/",
        AdminDepartmentManagerDetailView.as_view(),
        name="admin-department-manager-detail",
    ),
    path(
        "admin/staff/",
        AdminStaffListCreateView.as_view(),
        name="admin-staff-list-create",
    ),

    path(
        "admin/staff/<int:user_id>/",
        AdminStaffDetailView.as_view(),
        name="admin-staff-detail",
    ),

]