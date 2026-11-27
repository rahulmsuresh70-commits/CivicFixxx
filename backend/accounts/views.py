
import os
import hashlib
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from google.auth.transport.requests import Request
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailVerificationToken

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    LogoutSerializer,
    CitizenLoginSerializer,
    DepartmentManagerRegisterSerializer,
    DepartmentManagerLoginSerializer,
    StaffLoginSerializer,
    SuperAdminLoginSerializer,
    SeniorCitizenStaffRegisterSerializer,
    SeniorCitizenManagerRegisterSerializer,
)

from .utils import (
    send_verification_email,
    create_email_verification_token,
    create_google_login_code,
    consume_google_login_code,
)


User = get_user_model()


GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def get_google_flow(state=None, code_verifier=None):
    """
    Create a Google OAuth 2.0 Flow.

    During the login request, google-auth-oauthlib generates a PKCE
    code_verifier automatically.

    During the callback, the original code_verifier is restored from
    the Django session so Google can verify the authorization code.
    """

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [
                settings.GOOGLE_REDIRECT_URI,
            ],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        state=state,
        code_verifier=code_verifier,
    )

    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

    return flow


class RegisterView(APIView):
    """
    Register a normal CivicFix user.

    Normal registrations are Citizens and must verify their email
    before password login is allowed.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        raw_otp, _ = create_email_verification_token(user)
        send_verification_email(user, raw_otp)

        return Response(
            {
                "message": (
                    "Registration successful. "
                    "Please check your email and verify your account "
                    "before logging in."
                ),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    """
    Verify a user's email using a 6-digit OTP.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")

        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not code:
            return Response(
                {"error": "Verification code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()
        
        code = str(code).strip()

        if not code.isdigit() or len(code) != 6:
            return Response(
                {
                    "error": (
                        "Verification code must be exactly 6 digits."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_verified:
            return Response(
                {"error": "This email is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code_hash = hashlib.sha256(
            code.encode("utf-8")
        ).hexdigest()

        try:
            verification_token = (
                EmailVerificationToken.objects
                .get(
                    user=user,
                    token_hash=code_hash,
                )
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"error": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification_token.used_at is not None:
            return Response(
                {
                    "error": (
                        "This verification code has already been used."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification_token.expires_at <= timezone.now():
            return Response(
                {"error": "This verification code has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_verified = True
        user.save(update_fields=["is_verified"])

        verification_token.used_at = timezone.now()
        verification_token.save(update_fields=["used_at"])

        return Response(
            {
                "message": (
                    "Email verified successfully. "
                    "You can now log in."
                )
            },
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    """
    Normal email/password login.

    Unverified users cannot log in.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )


class CitizenLoginView(APIView):
    """
    Citizen-only email/password login.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CitizenLoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Citizen login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )


class DepartmentManagerRegisterView(APIView):
    """
    Register a Department Manager and their Department.
    Direct registration is allowed without authentication.
    """

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = DepartmentManagerRegisterSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Preserve the existing email verification workflow.
        raw_otp, _ = create_email_verification_token(user)
        send_verification_email(user, raw_otp)

        department = serializer.department

        return Response(
            {
                "message": (
                    "Department registration successful. "
                    "Please verify your email before logging in."
                ),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                },
                "department": {
                    "id": department.id,
                    "name": department.name,
                    "code": department.code,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class DepartmentManagerLoginView(APIView):
    """
    Department Manager-only email/password login.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DepartmentManagerLoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Department Manager login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )


class StaffLoginView(APIView):
    """
    Staff-only email/password login.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StaffLoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Staff login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminLoginView(APIView):
    """
    Super Admin-only email/password login.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SuperAdminLoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Super Admin login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    Return or update the currently authenticated CivicFix user's profile.

    Only first_name and last_name are editable here. Email changes are
    intentionally excluded because they must go through a verified email
    change workflow. Role and security fields are never writable here.
    """

    permission_classes = [IsAuthenticated]

    def get_profile_data(self, user):
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "is_verified": user.is_verified,
            "google_linked": bool(user.google_sub),
            "date_joined": user.date_joined,
        }

    def get(self, request):
        return Response(
            self.get_profile_data(request.user),
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user
        allowed_fields = {"first_name", "last_name"}
        submitted_fields = set(request.data.keys())
        unsupported_fields = submitted_fields - allowed_fields

        if unsupported_fields:
            return Response(
                {
                    field: [
                        "This field cannot be changed from your profile."
                    ]
                    for field in sorted(unsupported_fields)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not submitted_fields:
            return Response(
                {
                    "detail": (
                        "Provide at least one profile field to update."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        errors = {}
        cleaned_values = {}

        for field in allowed_fields.intersection(submitted_fields):
            value = request.data.get(field)

            if not isinstance(value, str):
                errors[field] = ["Enter a valid text value."]
                continue

            value = value.strip()

            if not value:
                errors[field] = [
                    f"{field.replace('_', ' ').capitalize()} is required."
                ]
            elif len(value) > 100:
                errors[field] = [
                    "Ensure this field has no more than 100 characters."
                ]
            else:
                cleaned_values[field] = value

        if errors:
            return Response(
                errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field, value in cleaned_values.items():
            setattr(user, field, value)

        if cleaned_values:
            user.save(
                update_fields=list(cleaned_values.keys())
            )

        return Response(
            {
                "message": "Profile updated successfully.",
                "user": self.get_profile_data(user),
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get(
            "current_password",
            "",
        )
        new_password = request.data.get(
            "new_password",
            "",
        )
        confirm_password = request.data.get(
            "confirm_password",
            "",
        )

        if (
            not current_password
            or not new_password
            or not confirm_password
        ):
            return Response(
                {"detail": "All password fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(current_password):
            return Response(
                {
                    "current_password": [
                        "Current password is incorrect."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {
                    "confirm_password": [
                        "Passwords do not match."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(
                new_password,
                request.user,
            )
        except DjangoValidationError as exc:
            return Response(
                {"new_password": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(APIView):
    """
    Refresh CivicFix JWT tokens.

    Uses SimpleJWT's TokenRefreshSerializer so configured
    rotation and blacklist settings are respected.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(
            data=request.data
        )

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                {
                    "error": "Invalid or expired refresh token."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data.get("refresh"),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    Logout by blacklisting the supplied refresh token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

        except TokenError:
            return Response(
                {
                    "error": "Invalid or expired refresh token."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )


# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================

# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================

class GooglePortalRoleMismatch(Exception):
    """
    Raised when a Google account belongs to a different
    CivicFix portal.
    """
    pass


class GoogleLoginView(APIView):
    """
    Start Google OAuth 2.0 authentication.

    Supports:
    1. Citizen login and registration.
    2. Department Manager login.
    3. Department Manager Google registration.
    4. Senior Citizen Manager login.

    Department Manager registration details are stored
    temporarily in the Django session for GoogleCallbackView.
    """

    permission_classes = [AllowAny]

    def get(self, request):

        # ------------------------------------------
        # PORTAL
        # ------------------------------------------

        expected_role = request.query_params.get(
            "portal",
            User.Role.CITIZEN,
        )

        allowed_roles = [
            User.Role.CITIZEN,
            User.Role.MANAGER,
            User.Role.SENIOR_CITIZEN_MANAGER,
        ]

        if expected_role not in allowed_roles:
            return Response(
                {
                    "error": "Invalid Google authentication portal."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------
        # AUTHENTICATION FLOW
        # ------------------------------------------

        registration_flow = request.query_params.get(
            "flow",
            "login",
        )

        if registration_flow not in ["login", "register"]:
            return Response(
                {
                    "error": "Invalid Google authentication flow."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only Department Manager registration is supported here.
        if (
            registration_flow == "register"
            and expected_role != User.Role.MANAGER
        ):
            return Response(
                {
                    "error": "Google registration is not enabled for this portal."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------
        # DEPARTMENT MANAGER REGISTRATION DETAILS
        # ------------------------------------------

        registration_data = None

        if registration_flow == "register":

            registration_data = {
                "department_name": request.query_params.get(
                    "department_name",
                    "",
                ).strip(),

                "department_code": request.query_params.get(
                    "department_code",
                    "",
                ).strip().upper(),

                "department_description": request.query_params.get(
                    "department_description",
                    "",
                ).strip(),

                "first_name": request.query_params.get(
                    "first_name",
                    "",
                ).strip(),

                "last_name": request.query_params.get(
                    "last_name",
                    "",
                ).strip(),

                "email": request.query_params.get(
                    "email",
                    "",
                ).strip().lower(),
            }

            required_fields = [
                "department_name",
                "department_code",
                "first_name",
                "last_name",
                "email",
            ]

            missing_fields = [
                field
                for field in required_fields
                if not registration_data[field]
            ]

            if missing_fields:
                return Response(
                    {
                        "error": "Please provide all required registration details.",
                        "missing_fields": missing_fields,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Basic email validation.
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError

            try:
                validate_email(registration_data["email"])
            except ValidationError:
                return Response(
                    {
                        "error": "Please provide a valid manager email address."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ------------------------------------------
        # START GOOGLE OAUTH
        # ------------------------------------------

        try:

            flow = get_google_flow()

            authorization_url, state = flow.authorization_url(
                access_type="online",
                include_granted_scopes="true",
                prompt="select_account",
            )

            # --------------------------------------
            # SAVE OAUTH SESSION
            # --------------------------------------

            request.session["google_oauth_state"] = state

            request.session["google_oauth_code_verifier"] = (
                flow.code_verifier
            )

            request.session["google_oauth_expected_role"] = (
                expected_role
            )

            request.session["google_oauth_flow"] = (
                registration_flow
            )

            # --------------------------------------
            # SAVE DEPARTMENT REGISTRATION DATA
            # --------------------------------------

            if registration_flow == "register":

                request.session[
                    "google_department_registration"
                ] = registration_data

            else:

                request.session.pop(
                    "google_department_registration",
                    None,
                )

            # Ensure Django persists the session before
            # redirecting the browser to Google.
            request.session.save()

            print("\n========== GOOGLE OAUTH START ==========")
            print("Portal:", expected_role)
            print("Flow:", registration_flow)
            print("OAuth state saved:", bool(state))
            print("PKCE verifier saved:", bool(flow.code_verifier))

            if registration_data:
                print(
                    "Department:",
                    registration_data["department_name"],
                )
                print(
                    "Manager email:",
                    registration_data["email"],
                )

            print("========================================\n")

            return HttpResponseRedirect(
                authorization_url
            )

        except Exception as exc:

            print(
                "Google OAuth initialization error:",
                type(exc).__name__,
                str(exc),
            )

            return Response(
                {
                    "error": "Unable to start Google authentication.",
                    "detail": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class GoogleCallbackView(APIView):
    """
    Google OAuth callback.

    Validates:
    1. OAuth state.
    2. PKCE verifier.
    3. Google ID token.
    4. Verified Google email.
    5. Existing CivicFix account.
    6. Google identity ownership.
    7. Expected portal role.

    Supports Department Manager Google registration
    without changing existing Citizen registration/login.
    """

    permission_classes = [AllowAny]

    def get(self, request):

        error = request.GET.get("error")

        if error:
            return Response(
                {
                    "error": (
                        "Google authentication was cancelled or denied."
                    ),
                    "google_error": error,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        state = request.GET.get("state")
        code = request.GET.get("code")

        if not state:
            return Response(
                {"error": "Missing OAuth state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not code:
            return Response(
                {
                    "error": "Missing Google authorization code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_state = request.session.get(
            "google_oauth_state"
        )

        code_verifier = request.session.get(
            "google_oauth_code_verifier"
        )

        expected_role = request.session.get(
            "google_oauth_expected_role"
        )

        registration_flow = request.session.get(
            "google_oauth_flow",
            "login",
        )

        if not saved_state:
            return Response(
                {
                    "error": (
                        "Google OAuth session expired or is invalid."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not code_verifier:
            return Response(
                {
                    "error": (
                        "Google OAuth session is missing the "
                        "PKCE code verifier. Please start login again."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not expected_role:
            return Response(
                {
                    "error": (
                        "Google authentication portal is missing. "
                        "Please start login again."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_roles = [
            User.Role.CITIZEN,
            User.Role.MANAGER,
            User.Role.SENIOR_CITIZEN_MANAGER,
        ]

        if expected_role not in allowed_roles:
            return Response(
                {
                    "error": "Invalid Google authentication portal."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if registration_flow not in ["login", "register"]:
            return Response(
                {
                    "error": "Invalid Google authentication flow."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not secrets.compare_digest(
            str(state),
            str(saved_state),
        ):
            return Response(
                {
                    "error": "Invalid Google OAuth state."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            flow = get_google_flow(
                state=state,
                code_verifier=code_verifier,
            )

            previous_relax_value = os.environ.get(
                "OAUTHLIB_RELAX_TOKEN_SCOPE"
            )

            try:
                os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

                flow.fetch_token(
                    authorization_response=request.build_absolute_uri()
                )

            finally:
                if previous_relax_value is None:
                    os.environ.pop(
                        "OAUTHLIB_RELAX_TOKEN_SCOPE",
                        None,
                    )
                else:
                    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = (
                        previous_relax_value
                    )

            credentials = flow.credentials

            if not credentials.id_token:
                raise ValueError(
                    "Google did not return an ID token."
                )

            google_info = id_token.verify_oauth2_token(
                credentials.id_token,
                Request(),
                settings.GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=5,
            )

            google_sub = google_info.get("sub")
            email = google_info.get("email")
            email_verified = google_info.get("email_verified")
            issuer = google_info.get("iss")

            if issuer not in [
                "accounts.google.com",
                "https://accounts.google.com",
            ]:
                raise ValueError(
                    "Invalid Google token issuer."
                )

            if not google_sub:
                raise ValueError(
                    "Google account does not contain a subject identifier."
                )

            if not email:
                raise ValueError(
                    "Google account does not contain an email address."
                )

            if email_verified is not True:
                raise ValueError(
                    "Google email address is not verified."
                )

            email = email.strip().lower()

            print("\n========== CIVICFIX GOOGLE DEBUG ==========")
            print("Google email:", email)
            print("Google subject:", google_sub)
            print("Expected portal role:", expected_role)
            print("Google flow:", registration_flow)

            with transaction.atomic():

                # Find an account already linked to this Google identity.
                google_user = (
                    User.objects
                    .select_for_update()
                    .filter(google_sub=google_sub)
                    .first()
                )

                # Find the account belonging to Google's verified email.
                email_user = (
                    User.objects
                    .select_for_update()
                    .filter(email__iexact=email)
                    .first()
                )

                print(
                    "Account matched by Google ID:",
                    google_user.email if google_user else None,
                )

                print(
                    "Account matched by email:",
                    email_user.email if email_user else None,
                )

                # ==========================================
                # DEPARTMENT MANAGER GOOGLE REGISTRATION
                # ==========================================

                if registration_flow == "register":

                    if expected_role != User.Role.MANAGER:
                        raise ValueError(
                            "Invalid Google registration portal."
                        )

                    registration_data = request.session.get(
                        "google_department_registration"
                    )

                    if not registration_data:
                        raise ValueError(
                            "Department registration session expired. "
                            "Please start registration again."
                        )

                    supplied_email = registration_data.get(
                        "email",
                        "",
                    ).strip().lower()

                    # If an email was entered in the form,
                    # Google must authenticate using that email.
                    if supplied_email and supplied_email != email:
                        raise ValueError(
                            "The Google email does not match the "
                            "email entered in the registration form."
                        )

                    # Do not allow an existing account from any
                    # CivicFix portal to register again.
                    if google_user is not None or email_user is not None:
                        existing_user = google_user or email_user

                        if existing_user.role != User.Role.MANAGER:
                            raise GooglePortalRoleMismatch(
                                "This Google email already belongs "
                                "to another CivicFix portal."
                            )

                        raise ValueError(
                            "A Department Manager account already "
                            "exists with this Google email. "
                            "Please use Department Manager login."
                        )

                    from departments.models import Department

                    department_code = registration_data[
                        "department_code"
                    ].strip().upper()

                    if Department.objects.filter(
                        code=department_code
                    ).exists():
                        raise ValueError(
                            "A department with this code already exists."
                        )

                    first_name = (
                        registration_data.get("first_name")
                        or google_info.get("given_name", "")
                    ).strip()

                    last_name = (
                        registration_data.get("last_name")
                        or google_info.get("family_name", "")
                    ).strip()

                    if not first_name:
                        first_name = email.split("@")[0]

                    # Create the manager account.
                    # Google has already verified this email.
                    user = User.objects.create_user(
                        email=email,
                        password=None,
                        first_name=first_name,
                        last_name=last_name,
                        google_sub=google_sub,
                        role=User.Role.MANAGER,
                        is_verified=True,
                        is_active=True,
                    )

                    # Create the Department using the actual
                    # Department model relationship.
                    department = Department.objects.create(
                        name=registration_data["department_name"].strip(),
                        code=department_code,
                        description=registration_data.get(
                            "department_description",
                            "",
                        ).strip(),
                        manager=user,
                    )

                    print(
                        "Department created:",
                        department.name,
                    )

                    print(
                        "Department Manager created:",
                        user.email,
                    )

                # ==========================================
                # EXISTING GOOGLE LOGIN / CITIZEN REGISTRATION
                # ==========================================

                else:

                    if google_user is not None:

                        if google_user.email.lower() != email:
                            raise ValueError(
                                "This Google identity is already "
                                "linked to a different CivicFix "
                                "email account."
                            )

                        user = google_user

                    else:
                        user = email_user

                    if user is not None:

                        if user.role != expected_role:
                            raise GooglePortalRoleMismatch(
                                "This Google account is not registered "
                                "for the selected portal."
                            )

                        if not user.is_active:
                            raise ValueError(
                                "This CivicFix account is inactive."
                            )

                        if (
                            user.google_sub
                            and user.google_sub != google_sub
                        ):
                            raise ValueError(
                                "This CivicFix account is already "
                                "linked to another Google account."
                            )

                        update_fields = []

                        if not user.google_sub:
                            user.google_sub = google_sub
                            update_fields.append("google_sub")

                        if not user.is_verified:
                            user.is_verified = True
                            update_fields.append("is_verified")

                        if update_fields:
                            user.save(
                                update_fields=update_fields
                            )

                    else:

                        # Automatically create only Citizen accounts.
                        # Department Manager and Senior Citizen Manager
                        # must use their own registration workflows.
                        if expected_role != User.Role.CITIZEN:
                            raise ValueError(
                                "No account exists for this portal. "
                                "Please register first."
                            )

                        user = User.objects.create(
                            email=email,
                            first_name=google_info.get(
                                "given_name",
                                "",
                            ),
                            last_name=google_info.get(
                                "family_name",
                                "",
                            ),
                            google_sub=google_sub,
                            role=User.Role.CITIZEN,
                            is_verified=True,
                            is_active=True,
                        )

                        user.set_unusable_password()

                        user.save(
                            update_fields=["password"]
                        )

                # ==========================================
                # FINAL ROLE AND ACCOUNT VALIDATION
                # ==========================================

                if user.role != expected_role:
                    raise GooglePortalRoleMismatch(
                        "Your account does not have permission "
                        "to access this portal."
                    )

                if not user.is_active:
                    raise ValueError(
                        "This CivicFix account is inactive."
                    )

                # Create the existing one-time Google login code.
                raw_code, _ = create_google_login_code(
                    user,
                    expected_role=expected_role,
                )

            print("Authenticated CivicFix account:", user.email)
            print("Authenticated CivicFix role:", user.role)
            print("Google login code created successfully.")
            print("===========================================\n")

            # Clear OAuth session values after success.
            request.session.pop(
                "google_oauth_state",
                None,
            )

            request.session.pop(
                "google_oauth_code_verifier",
                None,
            )

            request.session.pop(
                "google_oauth_expected_role",
                None,
            )

            request.session.pop(
                "google_oauth_flow",
                None,
            )

            request.session.pop(
                "google_department_registration",
                None,
            )

            request.session.save()

            frontend_redirect = (
                settings.GOOGLE_FRONTEND_REDIRECT_URI
            )

            separator = (
                "&"
                if "?" in frontend_redirect
                else "?"
            )

            redirect_url = (
                f"{frontend_redirect}"
                f"{separator}"
                f"code={raw_code}"
            )

            return HttpResponseRedirect(
                redirect_url
            )

        except GooglePortalRoleMismatch as exc:

            print(
                "Google OAuth role mismatch:",
                str(exc),
            )

            request.session.pop(
                "google_oauth_state",
                None,
            )

            request.session.pop(
                "google_oauth_code_verifier",
                None,
            )

            request.session.pop(
                "google_oauth_expected_role",
                None,
            )

            request.session.pop(
                "google_oauth_flow",
                None,
            )

            request.session.pop(
                "google_department_registration",
                None,
            )

            request.session.save()

            frontend_redirect = (
                settings.GOOGLE_FRONTEND_REDIRECT_URI
            )

            separator = (
                "&"
                if "?" in frontend_redirect
                else "?"
            )

            return HttpResponseRedirect(
                f"{frontend_redirect}{separator}error=role_mismatch"
            )

        except Exception as exc:

            print(
                "Google OAuth callback error: "
                f"{type(exc).__name__}: {exc}"
            )

            # Clear temporary OAuth data after an error.
            request.session.pop(
                "google_oauth_state",
                None,
            )

            request.session.pop(
                "google_oauth_code_verifier",
                None,
            )

            request.session.pop(
                "google_oauth_expected_role",
                None,
            )

            request.session.pop(
                "google_oauth_flow",
                None,
            )

            request.session.pop(
                "google_department_registration",
                None,
            )

            request.session.save()

            frontend_redirect = (
                settings.GOOGLE_FRONTEND_REDIRECT_URI
            )

            separator = (
                "&"
                if "?" in frontend_redirect
                else "?"
            )

            error_type = (
                "registration_failed"
                if registration_flow == "register"
                else "google_login_failed"
            )

            return HttpResponseRedirect(
                f"{frontend_redirect}{separator}error={error_type}"
            )


class GoogleExchangeView(APIView):
    """
    Exchange the short-lived Google login code for
    normal CivicFix JWT access and refresh tokens.

    consume_google_login_code() validates the expected role
    before this view issues JWT tokens.
    """

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):

        raw_code = request.data.get("code")

        if not raw_code:
            return Response(
                {
                    "error": "Google login code is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = consume_google_login_code(
                raw_code
            )

        except ValueError as exc:
            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {
                    "error": "This account is inactive."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response(
            {
                "message": "Google login successful.",
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "google_linked": bool(user.google_sub),
                },
            },
            status=status.HTTP_200_OK,
        )
# ============================================================
# SENIOR CITIZEN AUTHENTICATION
# ============================================================

class SeniorCitizenManagerLoginView(APIView):
    """Login endpoint restricted to Senior Citizen Managers."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        if user.role != User.Role.SENIOR_CITIZEN_MANAGER:
            return Response(
                {
                    "error": (
                        "Only Senior Citizen Managers can use this login."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Senior Citizen Manager login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class SeniorCitizenStaffLoginView(APIView):
    """Login endpoint restricted to Senior Citizen Staff."""

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        if user.role != User.Role.SENIOR_CITIZEN_STAFF:
            return Response(
                {
                    "error": (
                        "Only Senior Citizen Staff can use this login."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Senior Citizen Staff login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class SeniorCitizenStaffRegisterView(APIView):
    """
    Register Senior Citizen Staff under the authenticated
    Senior Citizen Manager or Super Admin.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        if not (
            user.role == User.Role.SENIOR_CITIZEN_MANAGER
            or user.role == User.Role.SUPER_ADMIN
            or user.is_superuser
        ):
            return Response(
                {
                    "detail": (
                        "Only the Senior Citizen Manager or "
                        "Super Admin can register Senior Citizen Staff."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SeniorCitizenStaffRegisterSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():

            staff = serializer.save()

            raw_token, _ = create_email_verification_token(staff)
            send_verification_email(staff, raw_token)

        return Response(
            {
                "message": (
                    "Senior Citizen Staff registration successful. "
                    "Please verify the registered email before logging in."
                ),
                "user": {
                    "id": staff.id,
                    "email": staff.email,
                    "first_name": staff.first_name,
                    "last_name": staff.last_name,
                    "role": staff.role,
                    "is_verified": staff.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class SeniorCitizenManagerRegisterView(APIView):
    """Register a Senior Citizen Manager without Super Admin authentication."""

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = SeniorCitizenManagerRegisterSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():

            manager = serializer.save()

            raw_token, _ = create_email_verification_token(manager)
            send_verification_email(manager, raw_token)

        return Response(
            {
                "message": (
                    "Senior Citizen Manager registration successful. "
                    "Please verify your email before logging in."
                ),
                "user": {
                    "id": manager.id,
                    "email": manager.email,
                    "first_name": manager.first_name,
                    "last_name": manager.last_name,
                    "role": manager.role,
                    "is_verified": manager.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# SUPER ADMIN USER MANAGEMENT
# ============================================================

class IsSuperAdmin(IsAuthenticated):

    def has_permission(self, request, view):

        return (
            super().has_permission(request, view)
            and request.user.is_authenticated
            and request.user.role == User.Role.SUPER_ADMIN
            and request.user.is_active
        )


class AdminUserListCreateView(APIView):

    permission_classes = [IsSuperAdmin]

    def get(self, request):

        users = User.objects.all().order_by("-date_joined")

        role = request.query_params.get("role")
        status_filter = request.query_params.get("status")
        search = request.query_params.get("search", "").strip()

        if role and role != "all":
            users = users.filter(role=role)

        if status_filter == "active":
            users = users.filter(is_active=True)

        elif status_filter == "inactive":
            users = users.filter(is_active=False)

        if search:

            from django.db.models import Q

            users = users.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        data = [
            {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "date_joined": user.date_joined,
            }
            for user in users
        ]

        return Response({
            "count": len(data),
            "results": data,
        })

    def post(self, request):

        data = request.data

        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        phone_number = str(data.get("phone_number", "")).strip()
        password = data.get("password", "")
        role = data.get("role", User.Role.CITIZEN)

        allowed_roles = [
            User.Role.CITIZEN,
            User.Role.STAFF,
            User.Role.MANAGER,
            User.Role.SENIOR_CITIZEN_MANAGER,
            User.Role.SENIOR_CITIZEN_STAFF,
        ]

        if not first_name or not last_name or not email or not password:
            return Response(
                {
                    "detail": (
                        "First name, last name, email and password "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in allowed_roles:
            return Response(
                {
                    "role": "Select a valid non-admin user role."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {
                    "email": "An account with this email already exists."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response(
                {"password": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role=role,
            is_active=True,
            is_verified=True,
        )

        return Response(
            {
                "message": "User created successfully.",
                "user": {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "role": user.role,
                    "is_active": user.is_active,
                    "is_verified": user.is_verified,
                    "date_joined": user.date_joined,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(APIView):

    permission_classes = [IsSuperAdmin]

    def get_object(self, pk):

        try:
            return User.objects.get(pk=pk)

        except User.DoesNotExist:
            return None

    def post(self, request, pk):

        user = self.get_object(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.role == User.Role.SUPER_ADMIN:
            return Response(
                {
                    "detail": (
                        "Super Admin accounts cannot be deleted here."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        confirmation = request.data.get("confirm_delete")

        if confirmation is not True:
            return Response(
                {
                    "detail": (
                        "Permanent deletion confirmation is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()

        return Response({
            "message": "User permanently deleted successfully."
        })

    def patch(self, request, pk):

        user = self.get_object(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.role == User.Role.SUPER_ADMIN:
            return Response(
                {
                    "detail": (
                        "Super Admin accounts cannot be edited here."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_fields = [
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "is_active",
            "is_verified",
        ]

        allowed_roles = [
            User.Role.CITIZEN,
            User.Role.STAFF,
            User.Role.MANAGER,
            User.Role.SENIOR_CITIZEN_MANAGER,
            User.Role.SENIOR_CITIZEN_STAFF,
        ]

        for field in allowed_fields:

            if field not in request.data:
                continue

            value = request.data[field]

            if field == "role" and value not in allowed_roles:
                return Response(
                    {
                        "role": "Select a valid non-admin role."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if field in ["is_active", "is_verified"] and not isinstance(value, bool):
                return Response(
                    {
                        field: "A true or false value is required."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if field in ["first_name", "last_name", "phone_number"]:

                if not isinstance(value, str):
                    return Response(
                        {
                            field: "Enter a valid text value."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                value = value.strip()

            setattr(user, field, value)

        user.save()

        return Response(
            {
                "message": "User updated successfully.",
                "user": {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "role": user.role,
                    "is_active": user.is_active,
                    "is_verified": user.is_verified,
                    "date_joined": user.date_joined,
                },
            }
        )

    def delete(self, request, pk):

        user = self.get_object(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.role == User.Role.SUPER_ADMIN:
            return Response(
                {
                    "detail": (
                        "Super Admin accounts cannot be deactivated here."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Soft delete: preserve complaints, assignments and messages.
        user.is_active = False

        user.save(
            update_fields=["is_active"]
        )

        return Response({
            "message": "User deactivated successfully."
        })
