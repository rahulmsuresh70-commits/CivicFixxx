from django.conf import settings
from django.db import models
from cloudinary_storage.storage import VideoMediaCloudinaryStorage
from departments.models import Department


class Report(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        TRANSFERRED = "transferred", "Transferred"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        REOPENED = "reopened", "Reopened"
        VERIFIED = "verified", "Verified"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"

    class DuplicateReviewStatus(models.TextChoices):
        NONE = "none", "Not a duplicate"
        PENDING = "pending", "Pending manager review"
        CONFIRMED = "confirmed", "Confirmed duplicate"
        REJECTED = "rejected", "Not a duplicate after review"

    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reports",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="reports",
    )

    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="assigned_reports",
        limit_choices_to={"role": "staff"},
    )
    deadline = models.DateTimeField(
        null=True,
        blank=True,
    )

    duplicate_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duplicate_reports",
    )

    duplicate_review_status = models.CharField(
        max_length=20,
        choices=DuplicateReviewStatus.choices,
        default=DuplicateReviewStatus.NONE,
    )

    title = models.CharField(max_length=200)

    description = models.TextField()

    category = models.CharField(max_length=100)

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    location = models.CharField(
        max_length=255,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.citizen.email}"


class ReportImage(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="civicfix/reports/images/",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Image for Report #{self.report.id}"


class ReportVideo(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="videos",
    )

    video = models.FileField(
        storage=VideoMediaCloudinaryStorage(),
        upload_to="civicfix/reports/videos/",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Video for Report #{self.report.id}"


class ReportResolution(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="resolutions",
    )

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="report_resolutions",
        limit_choices_to={"role": "staff"},
    )

    work_description = models.TextField()

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-resolved_at"]

    def __str__(self):
        return f"Resolution for Report #{self.report.id}"


class ResolutionImage(models.Model):
    resolution = models.ForeignKey(
        ReportResolution,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="civicfix/resolutions/images/"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Resolution image for Report #{self.resolution.report.id}"


class ResolutionVideo(models.Model):
    resolution = models.ForeignKey(
        ReportResolution,
        on_delete=models.CASCADE,
        related_name="videos",
    )

    video = models.FileField(
        storage=VideoMediaCloudinaryStorage(),
        upload_to="civicfix/resolutions/videos/"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Resolution video for Report #{self.resolution.report.id}"


class ReportReopen(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="reopen_requests",
    )

    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="report_reopen_requests",
    )

    reason = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reopen request for Report #{self.report.id}"


class ReopenImage(models.Model):
    reopen_request = models.ForeignKey(
        ReportReopen,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="civicfix/reopen/images/",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reopen image for Report #{self.reopen_request.report.id}"


class ReopenVideo(models.Model):
    reopen_request = models.ForeignKey(
        ReportReopen,
        on_delete=models.CASCADE,
        related_name="videos",
    )

    video = models.FileField(
        storage=VideoMediaCloudinaryStorage(),
        upload_to="civicfix/reopen/videos/",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reopen video for Report #{self.reopen_request.report.id}"