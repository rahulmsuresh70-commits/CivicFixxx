from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User
from django.db import transaction
from django.db import transaction
from senior_citizen.models import (
    SeniorCitizenManagerProfile,
    SeniorCitizenServiceArea,
)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirm = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "password",
            "password_confirm",
        ]

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        # New normal registrations are citizens
        user.role = User.Role.CITIZEN
        user.is_verified = False
        user.save(update_fields=["role", "is_verified"])

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        user = authenticate(
            email=email,
            password=password
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive."
            )

        if not user.is_verified:
            raise serializers.ValidationError(
                "Please verify your email before logging in."
            )

        attrs["user"] = user

        return attrs

class SeniorCitizenStaffLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        user = authenticate(
            email=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive."
            )

        if user.role != User.Role.SENIOR_CITIZEN_STAFF:
            raise serializers.ValidationError(
                "Only Senior Citizen Staff can use this login."
            )

        # Staff do not require email verification.
        attrs["user"] = user

        return attrs
# ============================================================
# ROLE-SPECIFIC LOGIN
# ============================================================

class RoleLoginSerializer(LoginSerializer):
    expected_role = None

    def validate(self, attrs):
        attrs = super().validate(attrs)

        user = attrs["user"]

        if self.expected_role and user.role != self.expected_role:
            raise serializers.ValidationError(
                "This login page is not available for this account role."
            )

        return attrs


class CitizenLoginSerializer(RoleLoginSerializer):
    expected_role = User.Role.CITIZEN


class StaffLoginSerializer(RoleLoginSerializer):
    expected_role = User.Role.STAFF


class DepartmentManagerLoginSerializer(RoleLoginSerializer):
    expected_role = User.Role.MANAGER


class SuperAdminLoginSerializer(RoleLoginSerializer):
    expected_role = User.Role.SUPER_ADMIN


# ============================================================
# DEPARTMENT MANAGER REGISTRATION
# ============================================================

class DepartmentManagerRegisterSerializer(serializers.Serializer):
    department_name = serializers.CharField(
        max_length=150
    )

    department_code = serializers.CharField(
        max_length=50
    )

    department_description = serializers.CharField(
        required=False,
        allow_blank=True
    )

    first_name = serializers.CharField(
        max_length=100
    )

    last_name = serializers.CharField(
        max_length=100
    )

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirm = serializers.CharField(
        write_only=True
    )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_department_code(self, value):
        code = value.strip().upper()

        from departments.models import Department

        if Department.objects.filter(code=code).exists():
            raise serializers.ValidationError(
                "A department with this code already exists."
            )

        return code

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        return attrs

    def create(self, validated_data):
        from django.db import transaction
        from departments.models import Department

        password = validated_data.pop("password")

        validated_data.pop("password_confirm")

        department_name = validated_data.pop(
            "department_name"
        )

        department_code = validated_data.pop(
            "department_code"
        )

        department_description = validated_data.pop(
            "department_description",
            ""
        )

        with transaction.atomic():

            # Create Department Manager account
            user = User.objects.create_user(
                password=password,
                first_name=validated_data["first_name"].strip(),
                last_name=validated_data["last_name"].strip(),
                email=validated_data["email"].strip().lower(),
            )

            user.role = User.Role.MANAGER

            # Manager must verify email before login
            user.is_verified = False

            user.is_active = True

            user.save(
                update_fields=[
                    "role",
                    "is_verified",
                    "is_active",
                ]
            )

            # Create Department and connect manager
            department = Department.objects.create(
                name=department_name.strip(),
                code=department_code,
                description=department_description.strip(),
                manager=user,
            )

        self.department = department

        return user


# ============================================================
# LOGOUT
# ============================================================

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            RefreshToken(value)

        except TokenError:
            raise serializers.ValidationError(
                "Invalid or expired refresh token."
            )

        return value
    

class SeniorCitizenStaffRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    password_confirm = serializers.CharField(write_only=True)

    phone_number = serializers.CharField(max_length=20)
    state = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)

    designation = serializers.ChoiceField(
        choices=[
            ("driver", "Driver"),
            ("medical_assistant", "Medical Assistant"),
            ("care_assistant", "Care Assistant"),
            ("field_assistant", "Field Assistant"),
            ("other", "Other"),
        ]
    )

    address = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        request = self.context.get("request")

        if request is None:
            raise serializers.ValidationError(
                "Authenticated request is required."
            )

        manager_user = request.user

        if manager_user.role != User.Role.SENIOR_CITIZEN_MANAGER:
            if not (
                manager_user.role == User.Role.SUPER_ADMIN
                or manager_user.is_superuser
            ):
                raise serializers.ValidationError(
                    "Only a Senior Citizen Manager or Super Admin can register staff."
                )

        if manager_user.role == User.Role.SENIOR_CITIZEN_MANAGER:
            from senior_citizen.models import (
                SeniorCitizenManagerProfile,
                SeniorCitizenServiceArea,
            )

            try:
                manager_profile = (
                    SeniorCitizenManagerProfile.objects.get(
                        user=manager_user
                    )
                )
            except SeniorCitizenManagerProfile.DoesNotExist:
                raise serializers.ValidationError(
                    "Senior Citizen Manager profile not found."
                )

            service_area_exists = (
                SeniorCitizenServiceArea.objects.filter(
                    manager=manager_profile,
                    state__iexact=attrs["state"].strip(),
                    district__iexact=attrs["district"].strip(),
                    is_active=True,
                ).exists()
            )

            if not service_area_exists:
                raise serializers.ValidationError({
                    "district": (
                        "This district is not assigned to your "
                        "Senior Citizen Manager account."
                    )
                })

        return attrs

    def create(self, validated_data):
        from senior_citizen.models import (
            SeniorCitizenManagerProfile,
            SeniorCitizenStaffProfile,
        )

        request = self.context["request"]
        registering_user = request.user

        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        phone_number = validated_data.pop("phone_number")
        state = validated_data.pop("state").strip()
        district = validated_data.pop("district").strip()
        designation = validated_data.pop("designation")
        address = validated_data.pop("address", "").strip()

        first_name = validated_data.pop("first_name").strip()
        last_name = validated_data.pop("last_name").strip()
        email = validated_data.pop("email").strip().lower()

        with transaction.atomic():
            staff = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.SENIOR_CITIZEN_STAFF,
                is_verified=True,
                is_active=True,
            )

            if registering_user.role == User.Role.SENIOR_CITIZEN_MANAGER:
                manager_profile = (
                    SeniorCitizenManagerProfile.objects.get(
                        user=registering_user
                    )
                )
            else:
                # Super Admin must explicitly select an existing
                # manager in a separate, authorized workflow.
                raise serializers.ValidationError(
                    "Super Admin staff registration requires an explicit manager assignment."
                )

            SeniorCitizenStaffProfile.objects.create(
                user=staff,
                manager=manager_profile,
                phone_number=phone_number,
                location=address,
                state=state,
                district=district,
                designation=designation,
                is_active=True,
            )

        return staff
    
class SeniorCitizenStaffUpdateSerializer(serializers.Serializer):
    """
    Update an existing Senior Citizen Staff member.

    The CRUD view must first verify that the staff profile
    belongs to the authenticated Senior Citizen Manager.
    """

    first_name = serializers.CharField(
        max_length=100,
        required=False,
    )

    last_name = serializers.CharField(
        max_length=100,
        required=False,
    )

    email = serializers.EmailField(
        required=False,
    )

    phone_number = serializers.CharField(
        max_length=20,
        required=False,
    )

    state = serializers.CharField(
        max_length=100,
        required=False,
    )

    district = serializers.CharField(
        max_length=100,
        required=False,
    )

    designation = serializers.ChoiceField(
        choices=[
            ("driver", "Driver"),
            ("medical_assistant", "Medical Assistant"),
            ("care_assistant", "Care Assistant"),
            ("field_assistant", "Field Assistant"),
            ("other", "Other"),
        ],
        required=False,
    )

    address = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        min_length=8,
    )

    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
    )

    def validate_email(self, value):
        email = value.strip().lower()

        staff_profile = self.instance

        if User.objects.filter(
            email=email
        ).exclude(
            pk=staff_profile.user_id
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_password(self, value):
        staff_profile = self.instance

        validate_password(
            value,
            user=staff_profile.user,
        )

        return value

    def validate(self, attrs):

        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        if password or password_confirm:

            if not password:
                raise serializers.ValidationError({
                    "password": "Password is required."
                })

            if not password_confirm:
                raise serializers.ValidationError({
                    "password_confirm": "Password confirmation is required."
                })

            if password != password_confirm:
                raise serializers.ValidationError({
                    "password_confirm": "Passwords do not match."
                })

        elif "password_confirm" in attrs:
            raise serializers.ValidationError({
                "password": "Password is required."
            })

        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):

        staff_user = instance.user

        # Update User fields.
        if "first_name" in validated_data:
            staff_user.first_name = (
                validated_data.pop("first_name").strip()
            )

        if "last_name" in validated_data:
            staff_user.last_name = (
                validated_data.pop("last_name").strip()
            )

        if "email" in validated_data:
            staff_user.email = validated_data.pop("email")

        # Update password only when supplied.
        password = validated_data.pop("password", None)

        validated_data.pop("password_confirm", None)

        if password:
            staff_user.set_password(password)

        staff_user.save()

        # Update staff profile fields.
        if "phone_number" in validated_data:
            instance.phone_number = validated_data.pop(
                "phone_number"
            )

        if "state" in validated_data:
            instance.state = validated_data.pop(
                "state"
            ).strip()

        if "district" in validated_data:
            instance.district = validated_data.pop(
                "district"
            ).strip()

        if "designation" in validated_data:
            instance.designation = validated_data.pop(
                "designation"
            )

        if "address" in validated_data:
            instance.location = validated_data.pop(
                "address"
            ).strip()

        instance.save()

        return instance
    
class SeniorCitizenManagerRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    password_confirm = serializers.CharField(write_only=True)

    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )
    state = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    address = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        attrs["state"] = attrs["state"].strip()
        attrs["district"] = attrs["district"].strip()

        if not attrs["state"] or not attrs["district"]:
            raise serializers.ValidationError(
                "State and district are required."
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        # These values are collected for registration.
        # The current manager profile model has no phone/address fields.
        validated_data.pop("phone_number", "")
        validated_data.pop("address", "")

        state = validated_data.pop("state")
        district = validated_data.pop("district")

        user = User.objects.create_user(
            password=password,
            first_name=validated_data["first_name"].strip(),
            last_name=validated_data["last_name"].strip(),
            email=validated_data["email"].strip().lower(),
            role=User.Role.SENIOR_CITIZEN_MANAGER,
            is_verified=False,
            is_active=True,
        )

        manager_profile = SeniorCitizenManagerProfile.objects.create(
            user=user,
        )

        SeniorCitizenServiceArea.objects.create(
            manager=manager_profile,
            state=state,
            district=district,
            is_active=True,
        )

        return user