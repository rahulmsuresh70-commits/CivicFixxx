from django.urls import path

from .views import (
    RegisterView,
    VerifyEmailView,
    LoginView,
    MeView,
    RefreshTokenView,
    LogoutView,
    GoogleLoginView,
    GoogleCallbackView,
    GoogleExchangeView,

    CitizenLoginView,
    DepartmentManagerRegisterView,
    DepartmentManagerLoginView,
    StaffLoginView,
    SuperAdminLoginView,
    SeniorCitizenManagerLoginView,
    SeniorCitizenStaffLoginView,
    SeniorCitizenStaffRegisterView,
    SeniorCitizenManagerRegisterView,
    ChangePasswordView,
    AdminUserListCreateView,
    AdminUserDetailView
    
)


urlpatterns = [

    # ========================================================
    # ROLE-SPECIFIC AUTHENTICATION
    # ========================================================

    # CIVIC ISSUE MANAGEMENT

    path(
        "citizen/login/",
        CitizenLoginView.as_view(),
        name="citizen-login",
    ),

    path(
        "civic/department/register/",
        DepartmentManagerRegisterView.as_view(),
        name="civic-department-register",
    ),

    path(
        "civic/department/login/",
        DepartmentManagerLoginView.as_view(),
        name="civic-department-login",
    ),

    path(
        "civic/staff/login/",
        StaffLoginView.as_view(),
        name="civic-staff-login",
    ),

    path(
        "admin/login/",
        SuperAdminLoginView.as_view(),
        name="admin-login",
    ),
    path(
        "admin/users/",
        AdminUserListCreateView.as_view(),
        name="admin-user-list-create",
    ),

    path(
        "admin/users/<int:pk>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),


    # ========================================================
    # EXISTING NORMAL AUTHENTICATION
    # ========================================================

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "verify-email/",
        VerifyEmailView.as_view(),
        name="verify-email",
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),
    path(
            "change-password/",
            ChangePasswordView.as_view(),
            name="change-password",
        ),

    path(
        "refresh/",
        RefreshTokenView.as_view(),
        name="refresh",
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),


    # ========================================================
    # GOOGLE AUTHENTICATION
    # ========================================================

    path(
        "google/login/",
        GoogleLoginView.as_view(),
        name="google-login",
    ),

    path(
        "google/callback/",
        GoogleCallbackView.as_view(),
        name="google-callback",
    ),

    path(
        "google/exchange/",
        GoogleExchangeView.as_view(),
        name="google-exchange",
    ),
    
    # SENIOR CITIZEN ASSISTANCE

    path(
        "senior-citizen/manager/register/",
        SeniorCitizenManagerRegisterView.as_view(),
        name="senior-citizen-manager-register",
    ),

    path(
        "senior-citizen/manager/login/",
        SeniorCitizenManagerLoginView.as_view(),
        name="senior-citizen-manager-login",
    ),

    path(
        "senior-citizen/staff/register/",
        SeniorCitizenStaffRegisterView.as_view(),
        name="senior-citizen-staff-register",
    ),

    path(
        "senior-citizen/staff/login/",
        SeniorCitizenStaffLoginView.as_view(),
        name="senior-citizen-staff-login",
    ),
    
]