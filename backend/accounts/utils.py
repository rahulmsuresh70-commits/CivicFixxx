import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import EmailVerificationToken, GoogleLoginCode


EMAIL_VERIFICATION_EXPIRY_MINUTES = 10
GOOGLE_LOGIN_CODE_EXPIRY_SECONDS = 60


def create_email_verification_token(user):
    # Invalidate previous unused verification codes
    EmailVerificationToken.objects.filter(
        user=user,
        used_at__isnull=True,
    ).update(
        expires_at=timezone.now()
    )

    # Generate exactly 6 digits
    raw_otp = f"{secrets.randbelow(1_000_000):06d}"

    token_hash = hashlib.sha256(
        raw_otp.encode("utf-8")
    ).hexdigest()

    verification_token = EmailVerificationToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=(
            timezone.now()
            + timedelta(
                minutes=EMAIL_VERIFICATION_EXPIRY_MINUTES
            )
        ),
    )

    return raw_otp, verification_token


def send_verification_email(user, raw_otp):
    subject = "CivicFix Email Verification Code"

    message = (
        f"Hello {user.first_name or 'User'},\n\n"
        "Welcome to CivicFix.\n\n"
        "Your email verification code is:\n\n"
        f"{raw_otp}\n\n"
        "This code will expire after "
        f"{EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.\n\n"
        "If you did not create this account, "
        "you can safely ignore this email.\n\n"
        "Regards,\n"
        "CivicFix Team"
    )

    send_mail(
        subject,
        message,
        from_email=getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            "no-reply@civicfix.local",
        ),
        recipient_list=[user.email],
        fail_silently=False,
    )


def create_google_login_code(user, expected_role=None):
    """
    Create a short-lived, one-time Google login code.

    The expected role is stored with the code so that
    the exchange endpoint can validate it again.
    """

    GoogleLoginCode.objects.filter(
        user=user,
        used_at__isnull=True,
    ).update(
        expires_at=timezone.now()
    )

    raw_code = secrets.token_urlsafe(48)

    code_hash = hashlib.sha256(
        raw_code.encode("utf-8")
    ).hexdigest()

    login_code = GoogleLoginCode.objects.create(
        user=user,
        code_hash=code_hash,
        expected_role=expected_role or user.role,
        expires_at=(
            timezone.now()
            + timedelta(seconds=GOOGLE_LOGIN_CODE_EXPIRY_SECONDS)
        ),
    )

    return raw_code, login_code


@transaction.atomic
def consume_google_login_code(raw_code):
    """
    Validate and consume a Google login code.

    Also verifies that the user's actual database role
    still matches the role stored with the code.
    """

    if not raw_code:
        raise ValueError("Google login code is required.")

    code_hash = hashlib.sha256(
        raw_code.encode("utf-8")
    ).hexdigest()

    try:
        login_code = (
            GoogleLoginCode.objects
            .select_for_update()
            .select_related("user")
            .get(code_hash=code_hash)
        )

    except GoogleLoginCode.DoesNotExist:
        raise ValueError("Invalid Google login code.")

    if login_code.used_at is not None:
        raise ValueError(
            "This Google login code has already been used."
        )

    if login_code.expires_at <= timezone.now():
        raise ValueError(
            "This Google login code has expired."
        )

    user = login_code.user

    # Critical role validation.
    if user.role != login_code.expected_role:
        raise ValueError(
            "Your account does not have permission to access this portal."
        )

    login_code.used_at = timezone.now()

    login_code.save(
        update_fields=["used_at"]
    )

    return user