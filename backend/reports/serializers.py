from django.contrib.auth import get_user_model

from rest_framework import serializers
from django.db import transaction

from departments.models import Department
from .models import (
    Report,
    ReportImage,
    ReportVideo,
    ReportResolution,
    ResolutionImage,
    ResolutionVideo,
    ReportReopen,
    ReopenImage,
    ReopenVideo,
)


User = get_user_model()


class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = [
            "id",
            "image",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ReportVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportVideo
        fields = [
            "id",
            "video",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ResolutionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolutionImage
        fields = [
            "id",
            "image",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ResolutionVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolutionVideo
        fields = [
            "id",
            "video",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ReportResolutionSerializer(serializers.ModelSerializer):
    staff = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    images = ResolutionImageSerializer(
        many=True,
        read_only=True,
    )

    videos = ResolutionVideoSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ReportResolution
        fields = [
            "id",
            "report",
            "staff",
            "work_description",
            "resolved_at",
            "images",
            "videos",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "report",
            "staff",
            "resolved_at",
            "images",
            "videos",
            "created_at",
            "updated_at",
        ]


class ReopenImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReopenImage
        fields = [
            "id",
            "image",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ReopenVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReopenVideo
        fields = [
            "id",
            "video",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class ReportReopenSerializer(serializers.ModelSerializer):
    citizen = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    images = ReopenImageSerializer(
        many=True,
        read_only=True,
    )

    videos = ReopenVideoSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ReportReopen
        fields = [
            "id",
            "report",
            "citizen",
            "reason",
            "images",
            "videos",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "report",
            "citizen",
            "images",
            "videos",
            "created_at",
            "updated_at",
        ]


class AssignedStaffSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(
        source="staff_profile.phone_number",
        read_only=True,
        default="",
    )
    location = serializers.CharField(
        source="staff_profile.location",
        read_only=True,
        default="",
    )

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "phone_number",
            "location",
            "role",
            "is_verified",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "name",
            "email",
            "phone_number",
            "location",
            "role",
            "is_verified",
            "is_active",
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class ReportSerializer(serializers.ModelSerializer):
    citizen = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    department_code = serializers.CharField(
        source="department.code",
        read_only=True,
    )

    images = ReportImageSerializer(
        many=True,
        read_only=True,
    )

    videos = ReportVideoSerializer(
        many=True,
        read_only=True,
    )

    assigned_staff = AssignedStaffSerializer(
        read_only=True,
    )

    resolution = serializers.SerializerMethodField()

    resolution_history = ReportResolutionSerializer(
        source="resolutions",
        many=True,
        read_only=True,
    )

    image = serializers.ImageField(write_only=True, required=True)
    video = serializers.FileField(write_only=True, required=True)
    duplicate_of_id = serializers.IntegerField(read_only=True)

    reopen_requests = ReportReopenSerializer(
        many=True,
        read_only=True,
    )

    def get_resolution(self, obj):
        resolution = (
            obj.resolutions
            .order_by("-created_at")
            .first()
        )

        if not resolution:
            return None

        return ReportResolutionSerializer(
            resolution
        ).data

    def validate_department(self, department):
        if not department.is_active:
            raise serializers.ValidationError(
                "The selected department is currently inactive."
            )

        return department

    class Meta:
        model = Report
        fields = [
            "id",
            "citizen",
            "department",
            "department_name",
            "department_code",
            "title",
            "description",
            "category",
            "latitude",
            "longitude",
            "location",
            "status",
            "priority",
            "deadline",
            "assigned_staff",
            "images",
            "videos",
            "image",
            "video",
            "duplicate_of_id",
            "duplicate_review_status",
            "resolution",
            "resolution_history",
            "reopen_requests",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "citizen",
            "status",
            "priority",
            "deadline",
            "assigned_staff",
            "images",
            "videos",
            "resolution",
            "resolution_history",
            "created_at",
            "updated_at",
            "department_name",
            "department_code",
            "duplicate_of_id",
            "duplicate_review_status",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        if request and request.method == "POST":
            location = attrs.get("location")
            if not location or not location.strip():
                raise serializers.ValidationError({"location": "A location label is required."})
            if attrs.get("latitude") is None or attrs.get("longitude") is None:
                raise serializers.ValidationError({
                    "location": "Live latitude and longitude are required."
                })
            image = attrs.get("image")
            video = attrs.get("video")
            if image is None:
                raise serializers.ValidationError({"image": "A complaint image is required."})
            if video is None:
                raise serializers.ValidationError({"video": "A complaint video is required."})
            if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
                raise serializers.ValidationError({"image": "Only JPG, PNG, and WebP images are allowed."})
            if image.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({"image": "Image size must not exceed 10 MB."})
            if video.content_type not in ["video/mp4", "video/webm", "video/quicktime"]:
                raise serializers.ValidationError({"video": "Only MP4, WebM, and MOV videos are allowed."})
            if video.size > 100 * 1024 * 1024:
                raise serializers.ValidationError({"video": "Video size must not exceed 100 MB."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        image = validated_data.pop("image")
        video = validated_data.pop("video")
        from .services import enrich_report_before_save, detect_duplicate_report
        report = Report(**validated_data)
        enrich_report_before_save(report)
        report.save()
        ReportImage.objects.create(report=report, image=image)
        ReportVideo.objects.create(report=report, video=video)
        duplicate = detect_duplicate_report(report)
        
        if duplicate:
            report.duplicate_of = duplicate
            report.duplicate_review_status = Report.DuplicateReviewStatus.PENDING
            report.save(update_fields=["duplicate_of", "duplicate_review_status", "updated_at"])
        return report


class ReportImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ["image"]

    def validate_image(self, value):
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, PNG, and WebP images are allowed."
            )

        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Image size must not exceed 10 MB."
            )

        return value


class ReportVideoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportVideo
        fields = ["video"]

    def validate_video(self, value):
        allowed_types = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only MP4, WebM, and MOV videos are allowed."
            )

        max_size = 100 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Video size must not exceed 100 MB."
            )

        return value


class ResolutionImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolutionImage
        fields = ["image"]

    def validate_image(self, value):
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, PNG, and WebP images are allowed."
            )

        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Image size must not exceed 10 MB."
            )

        return value


class ResolutionVideoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResolutionVideo
        fields = ["video"]

    def validate_video(self, value):
        allowed_types = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only MP4, WebM, and MOV videos are allowed."
            )

        max_size = 100 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Video size must not exceed 100 MB."
            )

        return value


class ReopenImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReopenImage
        fields = ["image"]

    def validate_image(self, value):
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, PNG, and WebP images are allowed."
            )

        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Image size must not exceed 10 MB."
            )

        return value


class ReopenVideoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReopenVideo
        fields = ["video"]

    def validate_video(self, value):
        allowed_types = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only MP4, WebM, and MOV videos are allowed."
            )

        max_size = 100 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Video size must not exceed 100 MB."
            )

        return value