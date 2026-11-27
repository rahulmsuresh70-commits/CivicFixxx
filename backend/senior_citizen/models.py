from django.conf import settings
from django.db import models

class SeniorCitizenRequestTransferHistory(models.Model):
    request = models.ForeignKey(
        "SeniorCitizenRequest",
        on_delete=models.CASCADE,
        related_name="transfer_history",
    )

    from_manager = models.ForeignKey(
        "SeniorCitizenManagerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="outgoing_request_transfers",
    )

    to_manager = models.ForeignKey(
        "SeniorCitizenManagerProfile",
        on_delete=models.PROTECT,
        related_name="incoming_request_transfers",
    )

    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="senior_citizen_request_transfers",
    )

    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Transfer history for request {self.request_id}"
class SeniorCitizenRequest(models.Model):

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        ON_THE_WAY = "on_the_way", "Staff On The Way"
        ARRIVED = "arrived", "Staff Arrived"
        PICKUP_COMPLETED = "pickup_completed", "Pickup Completed"
        IN_TRANSIT = "in_transit", "In Transit"
        COMPLETED = "completed", "Completed"
        CLOSED = "closed", "Closed"

    class AssistanceType(models.TextChoices):
        MEDICAL = "medical", "Medical Assistance"
        DAILY_LIVING = "daily_living", "Daily Living"
        FOOD = "food", "Food Assistance"
        MOBILITY = "mobility", "Mobility Assistance"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    # Feature 1: Location entry method
    class LocationMethod(models.TextChoices):
        MANUAL = "manual", "Manual Entry"
        LIVE = "live", "Live GPS"

    # Phase 2: Automatic location mismatch status
    class MismatchStatus(models.TextChoices):
        PENDING = "pending", "Pending Detection"
        MATCHED = "matched", "Location Matched"
        MISMATCH = "mismatch", "Location Mismatch"
        UNVERIFIED = "unverified", "Unable to Verify Location"

    # Citizen who submits the request
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_requests",
    )

    # Retained for compatibility with existing records.
    # Senior Citizen Assistance remains independent of
    # ordinary CivicFix department complaint management.
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.PROTECT,
        related_name="senior_citizen_requests",
        null=True,
        blank=True,
    )

    # Staff member assigned to the assistance request
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_senior_citizen_requests",
    )
    
        # Senior Citizen Manager responsible for this request
    assigned_manager = models.ForeignKey(
        "senior_citizen.SeniorCitizenManagerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_requests",
    )

    # Senior citizen details
    full_name = models.CharField(max_length=200)
    age = models.PositiveSmallIntegerField()
    phone_number = models.CharField(max_length=20)
    address = models.TextField()

    # Feature 1: Current/service location
    # The existing address field remains the home address.
    location_method = models.CharField(
        max_length=10,
        choices=LocationMethod.choices,
        default=LocationMethod.MANUAL,
    )

    current_location = models.TextField(
        blank=True,
        default="",
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    # Assistance details
    assistance_type = models.CharField(
        max_length=30,
        choices=AssistanceType.choices,
    )

    description = models.TextField()

    # Applicant details
    # These fields also support applications submitted
    # by a family member or authorized representative.
    applicant_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
    )

    applicant_phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )

    applicant_relationship = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    # Service location and district routing
    # These retain the state and district selected by the citizen.
    state = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
    )

    district = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
    )

    pickup_location = models.TextField(
        blank=True,
        default="",
    )

    destination = models.TextField(
        blank=True,
        default="",
    )

    # Phase 2: Automatically detected geographic location.
    # These fields do not replace the citizen-selected district.
    detected_state = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    detected_district = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    location_mismatch = models.BooleanField(
        default=False,
        db_index=True,
    )

    mismatch_status = models.CharField(
        max_length=20,
        choices=MismatchStatus.choices,
        default=MismatchStatus.PENDING,
        db_index=True,
    )

    location_checked_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Scheduling
    preferred_datetime = models.DateTimeField(
        null=True,
        blank=True,
    )

    deadline = models.DateTimeField(
        null=True,
        blank=True,
    )

    estimated_arrival = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Priority
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )

    # Staff completion information
    completion_notes = models.TextField(
        blank=True,
        default="",
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Applicant verification information
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_senior_citizen_requests",
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Request status
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.SUBMITTED,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Senior Citizen Request #{self.pk} - "
            f"{self.full_name}"
        )


class SeniorCitizenManagerProfile(models.Model):
    """
    Profile for a dedicated Senior Citizen Manager.

    This is separate from the ordinary CivicFix
    Department Manager.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_manager_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Senior Citizen Manager: {self.user.email}"


class SeniorCitizenServiceArea(models.Model):
    """
    Associates a Senior Citizen Manager with a state and district.
    """

    manager = models.ForeignKey(
        SeniorCitizenManagerProfile,
        on_delete=models.PROTECT,
        related_name="service_areas",
    )

    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["state", "district"]
        constraints = [
            models.UniqueConstraint(
                fields=["state", "district"],
                name="unique_senior_citizen_service_area",
            ),
        ]

    def __str__(self):
        return f"{self.district}, {self.state}"


class SeniorCitizenStaffProfile(models.Model):
    """
    Profile for Senior Citizen Staff.

    Separate from the ordinary CivicFix StaffProfile.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_staff_profile",
    )

    manager = models.ForeignKey(
        SeniorCitizenManagerProfile,
        on_delete=models.PROTECT,
        related_name="staff_members",
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    district = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    designation = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Senior Citizen Staff"


class SeniorCitizenImage(models.Model):

    request = models.ForeignKey(
        SeniorCitizenRequest,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="senior_citizen/",
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_images",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Image for Senior Citizen Request #{self.request_id}"


class SeniorCitizenMessage(models.Model):

    request = models.ForeignKey(
        SeniorCitizenRequest,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_messages",
    )

    content = models.TextField(max_length=5000)

    is_read = models.BooleanField(default=False)

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["request", "created_at"],
            ),
        ]

    def __str__(self):
        return (
            f"Message #{self.pk} for "
            f"Senior Citizen Request #{self.request_id}"
        )


class SeniorCitizenStatusHistory(models.Model):
    """
    Stores the history of status changes for an assistance request.
    """

    request = models.ForeignKey(
        SeniorCitizenRequest,
        on_delete=models.CASCADE,
        related_name="status_history",
    )

    previous_status = models.CharField(
        max_length=30,
        blank=True,
        default="",
    )

    new_status = models.CharField(max_length=30)

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="senior_citizen_status_changes",
    )

    note = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return (
            f"Request #{self.request_id}: "
            f"{self.previous_status} -> {self.new_status}"
        )


class SeniorCitizenIssueReport(models.Model):

    class IssueType(models.TextChoices):
        STAFF_NOT_ARRIVED = (
            "staff_not_arrived",
            "Staff Did Not Arrive",
        )

        PICKUP_NOT_COMPLETED = (
            "pickup_not_completed",
            "Pickup Not Completed",
        )

    class ReportStatus(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under Review"
        RESOLVED = "resolved", "Resolved"

    request = models.ForeignKey(
        SeniorCitizenRequest,
        on_delete=models.CASCADE,
        related_name="issue_reports",
    )

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="senior_citizen_issue_reports",
    )

    issue_type = models.CharField(
        max_length=30,
        choices=IssueType.choices,
    )

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.OPEN,
        db_index=True,
    )

    manager_response = models.TextField(
        blank=True,
        default="",
    )

    updated_eta = models.DateTimeField(
        null=True,
        blank=True,
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Issue for Request #{self.request_id}: "
            f"{self.issue_type}"
        )