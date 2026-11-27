from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import Department, StaffProfile


User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "description",
            "manager",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_manager(self, manager):
        if manager is None:
            return manager

        if manager.role != User.Role.MANAGER:
            raise serializers.ValidationError(
                "The selected user must have the Department Manager role."
            )

        if not manager.is_active:
            raise serializers.ValidationError(
                "The selected manager account is inactive."
            )

        return manager


class StaffProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "department",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_user(self, user):
        if user.role != User.Role.STAFF:
            raise serializers.ValidationError(
                "The selected user must have the Staff role."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "The selected staff account is inactive."
            )

        return user


class DepartmentManagerStaffCreateSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirm = serializers.CharField(
        write_only=True
    )

    phone_number = serializers.CharField(
        max_length=20,
        required=True,
        trim_whitespace=True,
    )

    location = serializers.CharField(
        max_length=255,
        required=True,
        trim_whitespace=True,
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "location",
            "password",
            "password_confirm",
        ]

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

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

        self.staff_profile_data = {
            "phone_number": validated_data.pop("phone_number"),
            "location": validated_data.pop("location"),
        }

        return User.objects.create_user(
            password=password,
            role=User.Role.STAFF,
            is_verified=True,
            is_active=True,
            **validated_data,
        )


class DepartmentManagerStaffUpdateSerializer(serializers.Serializer):

    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=False
    )

    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=False
    )

    email = serializers.EmailField(required=False)

    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=False,
        trim_whitespace=True
    )

    location = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=False,
        trim_whitespace=True
    )

    def validate_email(self, value):
        value = value.strip().lower()

        user = self.context["staff_profile"].user

        if User.objects.filter(
            email__iexact=value
        ).exclude(pk=user.pk).exists():

            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        return attrs

    def update(self, staff_profile, validated_data):

        user = staff_profile.user

        user_fields = (
            "first_name",
            "last_name",
            "email"
        )

        changed_user_fields = []

        for field in user_fields:
            if field in validated_data:
                setattr(
                    user,
                    field,
                    validated_data.pop(field)
                )

                changed_user_fields.append(field)

        if changed_user_fields:
            user.save(update_fields=changed_user_fields)

        for field in ("phone_number", "location"):
            if field in validated_data:
                setattr(
                    staff_profile,
                    field,
                    validated_data[field]
                )

        if "phone_number" in validated_data or "location" in validated_data:

            staff_profile.save(
                update_fields=[
                    field
                    for field in ("phone_number", "location")
                    if field in validated_data
                ]
            )

        return staff_profile


class DepartmentManagerProfileUpdateSerializer(serializers.ModelSerializer):

    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=False,
        trim_whitespace=True
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
        ]

    def validate_first_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "First name is required."
            )

        return value

    def validate_last_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Last name is required."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(
            email__iexact=value
        ).exclude(
            pk=self.instance.pk
        ).exists():

            raise serializers.ValidationError(
                "This email address is already registered."
            )

        return value

    def validate_phone_number(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value


class DepartmentManagerChangePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(
        write_only=True,
        required=True
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True
    )

    def validate_current_password(self, value):

        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Your current password is incorrect."
            )

        return value

    def validate_new_password(self, value):

        user = self.context["request"].user

        validate_password(
            value,
            user=user
        )

        return value

    def validate(self, attrs):

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "New passwords do not match."
            })

        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({
                "new_password": "New password must be different from the current password."
            })

        return attrs
    
class AdminStaffSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email")
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    is_verified = serializers.BooleanField(source="user.is_verified", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    department_name = serializers.CharField(
        source="department.name",
        read_only=True
    )
    department_code = serializers.CharField(
        source="department.code",
        read_only=True
    )

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "location",
            "department",
            "department_name",
            "department_code",
            "is_active",
            "is_verified",
            "date_joined",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_active",
            "is_verified",
            "date_joined",
            "created_at",
        ]