from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault(
            "role",
            User.Role.SUPER_ADMIN
        )

        extra_fields.setdefault(
            "is_staff",
            True
        )

        extra_fields.setdefault(
            "is_superuser",
            True
        )

        extra_fields.setdefault(
            "is_active",
            True
        )

        extra_fields.setdefault(
            "is_verified",
            True
        )

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Superuser must have is_staff=True."
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Superuser must have is_superuser=True."
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):

    
    class Role(models.TextChoices):
        CITIZEN = "citizen", "Citizen"
        STAFF = "staff", "Staff"
        MANAGER = "manager", "Department Manager"
        SENIOR_CITIZEN_MANAGER = (
            "senior_citizen_manager",
            "Senior Citizen Manager",
        )
        SENIOR_CITIZEN_STAFF = (
            "senior_citizen_staff",
            "Senior Citizen Staff",
        )
        SUPER_ADMIN = "super_admin", "Super Admin"


    email = models.EmailField(
        unique=True,
        db_index=True
    )

    # Stable Google OpenID Connect subject identifier.
    # This is NOT a Google password or access token.
    google_sub = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )

    first_name = models.CharField(
        max_length=100,
        blank=True
    )

    last_name = models.CharField(
        max_length=100,
        blank=True
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default=""
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.CITIZEN
    )

    is_verified = models.BooleanField(
        default=False
    )

    is_active = models.BooleanField(
        default=True
    )

    is_staff = models.BooleanField(
        default=False
    )

    date_joined = models.DateTimeField(
        auto_now_add=True
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class EmailVerificationToken(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )

    token_hash = models.CharField(
        max_length=64,
        unique=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Email verification for {self.user.email}"
    
    
class GoogleLoginCode(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="google_login_codes",
    )

    code_hash = models.CharField(
        max_length=64,
        unique=True,
    )

    expected_role = models.CharField(
        max_length=30,
        default="citizen",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Google login code for {self.user.email}"