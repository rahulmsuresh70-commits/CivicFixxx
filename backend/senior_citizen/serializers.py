from rest_framework import serializers
from PIL import Image as PILImage, UnidentifiedImageError
from django.db import transaction
from accounts.models import User
from .models import (
    SeniorCitizenRequest,
    SeniorCitizenImage,
    SeniorCitizenMessage,
    SeniorCitizenManagerProfile,
    SeniorCitizenServiceArea,
    SeniorCitizenStaffProfile,
    SeniorCitizenStatusHistory,
    SeniorCitizenIssueReport,
)


class SeniorCitizenImageSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.email",
        read_only=True,
    )

    class Meta:
        model = SeniorCitizenImage

        fields = [
            "id",
            "request",
            "image",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "request",
            "uploaded_by",
            "created_at",
        ]

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Image size cannot exceed 5 MB."
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        content_type = getattr(image, "content_type", None)

        if content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPEG, PNG, and WebP images are allowed."
            )

        try:
            image.seek(0)

            with PILImage.open(image) as uploaded_image:
                if uploaded_image.format not in {
                    "JPEG",
                    "PNG",
                    "WEBP",
                }:
                    raise serializers.ValidationError(
                        "Only JPEG, PNG, and WebP images are allowed."
                    )

                uploaded_image.verify()

            image.seek(0)

        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
        ):
            raise serializers.ValidationError(
                "The uploaded file is not a valid image."
            )

        finally:
            image.seek(0)

        return image


class SeniorCitizenRequestSerializer(serializers.ModelSerializer):
    citizen_email = serializers.CharField(
        source="citizen.email",
        read_only=True,
    )

    assigned_staff_email = serializers.CharField(
        source="assigned_staff.email",
        read_only=True,
        allow_null=True,
    )

    assigned_staff_full_name = serializers.SerializerMethodField()
    assigned_staff_phone_number = serializers.SerializerMethodField()

    # Indicates whether this request is currently waiting
    # for the receiving manager to process it.
    is_transferred = serializers.SerializerMethodField()

    def get_assigned_staff_full_name(self, obj):
        staff = obj.assigned_staff

        if staff is None:
            return None

        full_name = (
            f"{staff.first_name or ''} {staff.last_name or ''}"
        ).strip()

        return full_name or None

    def get_assigned_staff_phone_number(self, obj):
        staff = obj.assigned_staff

        if staff is None:
            return None

        profile = getattr(
            staff,
            "senior_citizen_staff_profile",
            None,
        )

        if profile is None:
            return None

        return profile.phone_number or None

    # UPDATED: Check whether the latest transfer is still pending.
    def get_is_transferred(self, obj):
        # Get the latest transfer record.
        latest_transfer = (
            obj.transfer_history
            .order_by("-created_at", "-pk")
            .first()
        )

        if latest_transfer is None:
            return False

        # The latest transfer must be assigned to the current manager.
        if latest_transfer.to_manager_id != obj.assigned_manager_id:
            return False

        # Find the latest status change.
        latest_status_change = (
            obj.status_history
            .order_by("-created_at", "-pk")
            .first()
        )

        # If the request status changed after the transfer,
        # the receiving manager has started processing it.
        if (
            latest_status_change
            and latest_status_change.created_at > latest_transfer.created_at
        ):
            return False

        # Keep the badge visible until a new status transition occurs.
        return True
    images = SeniorCitizenImageSerializer(
        many=True,
        read_only=True,
    )

    # Existing optional image upload feature.
    image = serializers.ImageField(
        required=False,
        allow_null=True,
        write_only=True,
    )

    # Phase 2: automatic location detection results.
    # These fields are calculated by the backend.
    detected_state = serializers.CharField(
        read_only=True,
    )

    detected_district = serializers.CharField(
        read_only=True,
    )

    location_mismatch = serializers.BooleanField(
        read_only=True,
    )

    mismatch_status = serializers.CharField(
        read_only=True,
    )

    location_checked_at = serializers.DateTimeField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SeniorCitizenRequest

        fields = [
            "id",
            "citizen",
            "citizen_email",
            "department",
            "assigned_manager",
            "assigned_staff",
            "assigned_staff_email",
            "assigned_staff_full_name",
            "assigned_staff_phone_number",

            # Senior citizen details
            "full_name",
            "age",
            "phone_number",
            "address",

            # Existing location feature
            "location_method",
            "current_location",
            "latitude",
            "longitude",

            # Phase 2: detection results
            "detected_state",
            "detected_district",
            "location_mismatch",
            "mismatch_status",
            "location_checked_at",

            # Assistance details
            "assistance_type",
            "description",

            # Applicant details
            "applicant_name",
            "applicant_phone",
            "applicant_relationship",

            # District information
            "state",
            "district",

            # Service locations
            "pickup_location",
            "destination",

            # Scheduling
            "preferred_datetime",
            "deadline",
            "estimated_arrival",

            # Priority and status
            "priority",
            "status",
            "is_transferred",

            # Completion and verification
            "completion_notes",
            "completed_at",
            "verified_by",
            "verified_at",

            # Images and timestamps
            "image",
            "images",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "citizen",
            "assigned_manager",
            "assigned_staff",
            "status",
            "deadline",
            "estimated_arrival",
            "completion_notes",
            "completed_at",
            "verified_by",
            "verified_at",
            "is_transferred",

            # Phase 2 detection results
            "detected_state",
            "detected_district",
            "location_mismatch",
            "mismatch_status",
            "location_checked_at",

            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "department": {
                "required": False,
                "allow_null": True,
            },
            "full_name": {
                "required": True,
                "allow_blank": False,
            },
            "age": {
                "required": True,
            },
            "phone_number": {
                "required": True,
                "allow_blank": False,
            },
            "address": {
                "required": True,
                "allow_blank": False,
            },
            "assistance_type": {
                "required": True,
            },
            "description": {
                "required": True,
                "allow_blank": False,
            },
            "applicant_name": {
                "required": False,
            },
            "applicant_phone": {
                "required": False,
            },
            "applicant_relationship": {
                "required": False,
            },
            "state": {
                "required": True,
                "allow_blank": False,
            },
            "district": {
                "required": True,
                "allow_blank": False,
            },
            "pickup_location": {
                "required": True,
                "allow_blank": False,
            },
            "destination": {
                "required": True,
                "allow_blank": False,
            },
            "preferred_datetime": {
                "required": False,
                "allow_null": True,
            },
            "priority": {
                "required": False,
            },
        }

    def validate_age(self, value):
        if value < 60:
            raise serializers.ValidationError(
                "Senior citizen assistance is intended "
                "for people aged 60 or above."
            )

        return value

    def validate_phone_number(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value

    def validate_image(self, image):
        if image is None:
            return image

        # Preserve existing image validation.
        validator = SeniorCitizenImageSerializer(
            data={"image": image}
        )

        validator.is_valid(raise_exception=True)

        return image

    def validate(self, attrs):
        # Existing manual/GPS location validation.
        location_method = attrs.get("location_method")

        current_location = attrs.get("current_location", "")
        current_location = (
            current_location.strip()
            if current_location
            else ""
        )

        latitude = attrs.get("latitude")
        longitude = attrs.get("longitude")

        if (
            location_method
            == SeniorCitizenRequest.LocationMethod.MANUAL
        ):
            if not current_location:
                raise serializers.ValidationError({
                    "current_location": (
                        "Current location is required for manual entry."
                    )
                })

            if latitude is not None or longitude is not None:
                raise serializers.ValidationError({
                    "location_method": (
                        "GPS coordinates must not be supplied "
                        "when using manual entry."
                    )
                })

            attrs["current_location"] = current_location

        elif (
            location_method
            == SeniorCitizenRequest.LocationMethod.LIVE
        ):
            if latitude is None or longitude is None:
                raise serializers.ValidationError({
                    "location": (
                        "Latitude and longitude are required "
                        "when using live GPS."
                    )
                })

            if not (-90 <= latitude <= 90):
                raise serializers.ValidationError({
                    "latitude": (
                        "Latitude must be between -90 and 90."
                    )
                })

            if not (-180 <= longitude <= 180):
                raise serializers.ValidationError({
                    "longitude": (
                        "Longitude must be between -180 and 180."
                    )
                })

        # Preserve independence from ordinary CivicFix complaints.
        return attrs

    def create(self, validated_data):
        # Preserve existing optional image upload behavior.
        image = validated_data.pop("image", None)

        request = super().create(validated_data)

        if image is not None:
            uploaded_by = self.context["request"].user

            SeniorCitizenImage.objects.create(
                request=request,
                image=image,
                uploaded_by=uploaded_by,
            )

        return request


class SeniorCitizenMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.CharField(
        source="sender.email",
        read_only=True,
    )

    class Meta:
        model = SeniorCitizenMessage

        fields = [
            "id",
            "request",
            "sender",
            "sender_email",
            "content",
            "is_read",
            "read_at",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "request",
            "sender",
            "is_read",
            "read_at",
            "created_at",
        ]

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message cannot be empty."
            )

        return value


class SeniorCitizenServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeniorCitizenServiceArea

        fields = [
            "id",
            "manager",
            "state",
            "district",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "manager",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        state = attrs.get(
            "state",
            getattr(self.instance, "state", ""),
        ).strip()

        district = attrs.get(
            "district",
            getattr(self.instance, "district", ""),
        ).strip()

        if not state or not district:
            raise serializers.ValidationError(
                "State and district are required."
            )

        attrs["state"] = state
        attrs["district"] = district

        return attrs


class SeniorCitizenManagerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    service_areas = SeniorCitizenServiceAreaSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = SeniorCitizenManagerProfile

        fields = [
            "id",
            "user",
            "email",
            "service_areas",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


class SeniorCitizenStaffProfileSerializer(serializers.ModelSerializer):
    email = serializers.CharField(
        source="user.email",
        read_only=True,
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )

    manager_email = serializers.EmailField(
        source="manager.user.email",
        read_only=True,
    )

    is_verified = serializers.BooleanField(
        source="user.is_verified",
        read_only=True,
    )

    account_is_active = serializers.BooleanField(
        source="user.is_active",
        read_only=True,
    )

    class Meta:
        model = SeniorCitizenStaffProfile

        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "state",
            "district",
            "designation",
            "location",
            "manager",
            "manager_email",
            "is_verified",
            "account_is_active",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "email",
            "manager",
            "manager_email",
            "is_verified",
            "account_is_active",
            "created_at",
            "updated_at",
        ]

class SeniorCitizenStaffUpdateSerializer(serializers.ModelSerializer):

    first_name = serializers.CharField(
        source="user.first_name",
        required=False,
        max_length=100,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        required=False,
        max_length=100,
    )

    email = serializers.EmailField(
        source="user.email",
        required=False,
    )

    class Meta:
        model = SeniorCitizenStaffProfile

        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "state",
            "district",
            "designation",
            "location",
        ]

    def validate_email(self, value):
        email = value.strip().lower()

        existing = User.objects.filter(
            email__iexact=email
        ).exclude(
            pk=self.instance.user_id
        )

        if existing.exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        if "state" in attrs:
            attrs["state"] = attrs["state"].strip()

        if "district" in attrs:
            attrs["district"] = attrs["district"].strip()

        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):

        user_data = validated_data.pop("user", {})

        # Update User model fields
        user = instance.user

        for field, value in user_data.items():
            setattr(user, field, value)

        if user_data:
            user.save()

        # Update Senior Citizen Staff Profile fields
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        return instance
class SeniorCitizenStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(
        source="changed_by.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SeniorCitizenStatusHistory

        fields = [
            "id",
            "request",
            "previous_status",
            "new_status",
            "changed_by",
            "changed_by_email",
            "note",
            "created_at",
        ]

        read_only_fields = fields


class SeniorCitizenIssueReportSerializer(serializers.ModelSerializer):
    reported_by_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True,
    )

    class Meta:
        model = SeniorCitizenIssueReport

        fields = [
            "id",
            "request",
            "reported_by",
            "reported_by_email",
            "issue_type",
            "description",
            "status",
            "manager_response",
            "updated_eta",
            "resolved_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "request",
            "reported_by",
            "status",
            "manager_response",
            "updated_eta",
            "resolved_at",
            "created_at",
            "updated_at",
        ]