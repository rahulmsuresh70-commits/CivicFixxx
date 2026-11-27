from rest_framework import generics, status
from rest_framework.permissions import BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.models import User
from notifications.utils import notify_report_participants

from .models import (
    Report,
    ReportResolution,
    ReportReopen,
    ReopenImage,
    ReopenVideo,
)

from .serializers import (
    ReportSerializer,
    ReportImageUploadSerializer,
    ReportVideoUploadSerializer,
    ReportResolutionSerializer,
    ResolutionImageUploadSerializer,
    ResolutionVideoUploadSerializer,
    ReportReopenSerializer,
    ReopenImageUploadSerializer,
    ReopenVideoUploadSerializer,
)


class IsCitizen(BasePermission):
    message = "Only citizens can submit and view citizen reports."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CITIZEN
            and request.user.is_active
            and request.user.is_verified
        )


class CitizenReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsCitizen]

    def get_queryset(self):
        return (
            Report.objects
            .filter(citizen=self.request.user)
            .select_related("department")
        )

    def perform_create(self, serializer):
        report = serializer.save(
            citizen=self.request.user,
            status=Report.Status.SUBMITTED,
        )

        # Citizen receives the submission confirmation.
        notify_report_participants(
            report,
            (
                f"Thank you! Your complaint #{report.id} "
                "has been submitted successfully."
            ),
            include_citizen=True,
            include_staff=False,
            include_manager=False,
        )

        # Notify the manager if automated triage found a likely duplicate.
        if report.duplicate_of_id:
            notify_report_participants(
                report,
                (
                    f"Potential duplicate complaint #{report.id} may match "
                    f"existing complaint #{report.duplicate_of_id}. "
                    "Please review the duplicate suggestion."
                ),
                include_citizen=False,
                include_staff=False,
                include_manager=True,
            )

        # Department manager receives a separate review notification.
        notify_report_participants(
            report,
            (
                f"New complaint #{report.id} has been submitted "
                f"to the {report.department.name}. "
                "Please review the complaint."
            ),
            include_citizen=False,
            include_staff=False,
            include_manager=True,
        )


class ReportImageUploadView(generics.CreateAPIView):
    serializer_class = ReportImageUploadSerializer
    permission_classes = [IsCitizen]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            report = Report.objects.get(
                id=kwargs["report_id"],
                citizen=request.user,
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(report=report)

        return Response(
            {
                "message": "Report image uploaded successfully.",
                "image": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class ReportVideoUploadView(generics.CreateAPIView):
    serializer_class = ReportVideoUploadSerializer
    permission_classes = [IsCitizen]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            report = Report.objects.get(
                id=kwargs["report_id"],
                citizen=request.user,
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(report=report)

        return Response(
            {
                "message": "Report video uploaded successfully.",
                "video": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class IsDepartmentManager(BasePermission):
    message = "Only Department Managers can review reports."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.MANAGER
            and request.user.is_active
            and request.user.is_verified
        )
# =========================================================
# SUPER ADMIN PERMISSION
# =========================================================

class IsSuperAdmin(BasePermission):
    message = "Only Super Administrators can view all CivicFix reports."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (
                user.is_superuser
                or user.role == User.Role.SUPER_ADMIN
            )
        )


# =========================================================
# SUPER ADMIN - VIEW ALL CIVICFIX REQUESTS
# =========================================================

class AdminReportListView(generics.ListAPIView):
    """
    Read-only, platform-wide CivicFix report list for Super Admins.
    """

    serializer_class = ReportSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return (
            Report.objects
            .select_related(
                "citizen",
                "department",
                "assigned_staff",
            )
            .prefetch_related(
                "images",
                "videos",
                "resolutions",
                "reopen_requests",
            )
            .order_by("-created_at")
        )

class ManagerReportListView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsDepartmentManager]

    def get_queryset(self):
        try:
            department = self.request.user.managed_department
        except Exception:
            return Report.objects.none()

        return (
            Report.objects
            .filter(department=department)
            .select_related("citizen", "department")
            .prefetch_related("images", "videos")
        )


class ManagerApproveReportView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {
                    "error": (
                        "You are not assigned as the manager "
                        "of any department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = (
                Report.objects
                .select_related("citizen", "department")
                .get(
                    id=report_id,
                    department=department,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found in your department."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.SUBMITTED:
            return Response(
                {
                    "error": (
                        "Only submitted reports can be approved."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = Report.Status.APPROVED
        report.save()

        notify_report_participants(
            report,
            f"Your complaint #{report.id} has been approved.",
            include_citizen=True,
            include_staff=False,
            include_manager=False,
        )

        return Response(
            {
                "message": "Report approved successfully.",
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class ManagerRejectReportView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {
                    "error": (
                        "You are not assigned as the manager "
                        "of any department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = (
                Report.objects
                .select_related("citizen", "department")
                .get(
                    id=report_id,
                    department=department,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found in your department."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.SUBMITTED:
            return Response(
                {
                    "error": (
                        "Only submitted reports can be rejected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = Report.Status.REJECTED
        report.save()

        notify_report_participants(
            report,
            f"Your complaint #{report.id} has been rejected.",
            include_citizen=True,
            include_staff=False,
            include_manager=False,
        )

        return Response(
            {
                "message": "Report rejected successfully.",
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class ManagerTransferReportView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {
                    "error": (
                        "You are not assigned as the manager "
                        "of any department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = (
                Report.objects
                .select_related("citizen", "department")
                .get(
                    id=report_id,
                    department=department,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {
                    "error": "Report not found in your department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.SUBMITTED:
            return Response(
                {
                    "error": (
                        "Only submitted reports can be transferred."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_department_id = request.data.get("department")

        if not target_department_id:
            return Response(
                {"error": "Target department is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from departments.models import Department

            target_department = Department.objects.get(
                id=target_department_id,
                is_active=True,
            )
        except Department.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Target department not found or inactive."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_department.id == department.id:
            return Response(
                {
                    "error": (
                        "Report cannot be transferred "
                        "to the same department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.department = target_department
        report.status = Report.Status.TRANSFERRED
        report.save()

        notify_report_participants(
            report,
            (
                f"Your complaint #{report.id} has been transferred "
                f"to {report.department.name}."
            ),
            include_citizen=True,
            include_staff=False,
            include_manager=True,
        )

        return Response(
            {
                "message": "Report transferred successfully.",
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class ManagerAssignReportView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {
                    "error": (
                        "You are not assigned as the manager "
                        "of any department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = (
                Report.objects
                .select_related("citizen", "department")
                .get(
                    id=report_id,
                    department=department,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {
                    "error": "Report not found in your department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.APPROVED:
            return Response(
                {
                    "error": "Only approved reports can be assigned."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff_id = request.data.get("staff_id")
        deadline_value = request.data.get("deadline")

        if not deadline_value:
            return Response(
                {"error": "Deadline is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deadline = parse_datetime(str(deadline_value))

        if deadline is None:
            return Response(
                {
                    "error": (
                        "Invalid deadline. Use ISO 8601 datetime "
                        "with timezone, for example "
                        "2027-01-15T18:00:00+05:30."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.is_naive(deadline):
            return Response(
                {
                    "error": "Deadline must include a timezone."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if deadline <= timezone.now():
            return Response(
                {
                    "error": "Deadline must be in the future."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from departments.models import StaffProfile

        try:
            staff_profile = (
                StaffProfile.objects
                .select_related("user", "department")
                .get(
                    id=staff_id,
                    department=department,
                )
            )
        except StaffProfile.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Staff member not found in your department."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            staff_profile.user.role != User.Role.STAFF
            or not staff_profile.user.is_active
            or not staff_profile.user.is_verified
        ):
            return Response(
                {
                    "error": (
                        "Selected staff member is not eligible "
                        "for assignment."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.assigned_staff = staff_profile.user
        report.deadline = deadline
        requested_category = request.data.get("category")
        if requested_category and str(requested_category).strip():
            report.category = str(requested_category).strip()[:100]
        requested_priority = request.data.get("priority")
        if requested_priority:
            requested_priority = str(requested_priority).strip().lower()
            if requested_priority not in {choice for choice, _label in Report.Priority.choices}:
                return Response(
                    {"error": "Priority must be 'normal' or 'high'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            report.priority = requested_priority
        report.status = Report.Status.ASSIGNED
        report.save()

        notify_report_participants(
            report,
            (
                f"Your complaint #{report.id} has been assigned to "
                f"{staff_profile.user.first_name} {staff_profile.user.last_name}".strip()
                + f" ({staff_profile.user.email}). "
                + f"Phone: {staff_profile.phone_number or 'Not provided'}. "
                + f"Location: {staff_profile.location or 'Not provided'}. "
                + f"Deadline: {deadline.isoformat()}."
            ),
            include_citizen=True,
            include_staff=True,
            include_manager=False,
        )

        return Response(
            {
                "message": "Report assigned to staff successfully.",
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class ManagerReassignReopenedReportView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {
                    "error": (
                        "You are not assigned as the manager "
                        "of any department."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = (
                Report.objects
                .select_related(
                    "citizen",
                    "department",
                    "assigned_staff",
                )
                .get(
                    id=report_id,
                    department=department,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {
                    "error": "Report not found in your department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.REOPENED:
            return Response(
                {
                    "error": (
                        "Only reopened reports can be reassigned."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff_id = request.data.get("staff_id")
        deadline_value = request.data.get("deadline")

        if not staff_id:
            return Response(
                {"error": "Staff ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not deadline_value:
            return Response(
                {"error": "A new deadline is required when reassigning a reopened complaint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deadline = parse_datetime(str(deadline_value))
        if deadline is None or timezone.is_naive(deadline) or deadline <= timezone.now():
            return Response(
                {"error": "Deadline must be a future ISO 8601 datetime with timezone."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from departments.models import StaffProfile

        try:
            staff_profile = (
                StaffProfile.objects
                .select_related("user", "department")
                .get(
                    id=staff_id,
                    department=department,
                )
            )
        except StaffProfile.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Staff member not found in your department."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            staff_profile.user.role != User.Role.STAFF
            or not staff_profile.user.is_active
            or not staff_profile.user.is_verified
        ):
            return Response(
                {
                    "error": (
                        "Selected staff member is not eligible "
                        "for assignment."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.assigned_staff = staff_profile.user
        report.deadline = deadline
        report.priority = Report.Priority.HIGH
        report.status = Report.Status.ASSIGNED
        report.save()

        notify_report_participants(
            report,
            (
                f"Your reopened complaint #{report.id} has been reassigned to "
                f"{staff_profile.user.first_name} {staff_profile.user.last_name}".strip()
                + f" ({staff_profile.user.email}). "
                + f"Phone: {staff_profile.phone_number or 'Not provided'}. "
                + f"Location: {staff_profile.location or 'Not provided'}. "
                + f"New deadline: {deadline.isoformat()}."
            ),
            include_citizen=True,
            include_staff=True,
            include_manager=False,
        )

        return Response(
            {
                "message": (
                    "Reopened report assigned to staff successfully."
                ),
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class ManagerDuplicateReviewView(generics.GenericAPIView):
    permission_classes = [IsDepartmentManager]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            department = request.user.managed_department
        except Exception:
            return Response(
                {"error": "You are not assigned as the manager of any department."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = Report.objects.select_related("department", "citizen").get(
                id=report_id,
                department=department,
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found in your department."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not report.duplicate_of_id or report.duplicate_review_status != Report.DuplicateReviewStatus.PENDING:
            return Response(
                {"error": "This report has no pending duplicate suggestion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = str(request.data.get("decision", "")).strip().lower()
        if decision not in {"approve", "reject"}:
            return Response(
                {"error": "Decision must be 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == "approve":
            report.duplicate_review_status = Report.DuplicateReviewStatus.CONFIRMED
            report.status = Report.Status.CLOSED
            message = (
                f"Your complaint #{report.id} appears to duplicate an existing "
                f"complaint #{report.duplicate_of_id}. The department has confirmed "
                "the duplicate and will track the issue through the existing complaint."
            )
        else:
            report.duplicate_review_status = Report.DuplicateReviewStatus.REJECTED
            report.duplicate_of = None
            message = (
                f"Your complaint #{report.id} has been reviewed and will be handled "
                "as a separate issue."
            )

        report.save(update_fields=["duplicate_of", "duplicate_review_status", "status", "updated_at"])
        notify_report_participants(
            report,
            message,
            include_citizen=True,
            include_staff=False,
            include_manager=False,
        )
        return Response(
            {"message": "Duplicate review saved successfully.", "report": ReportSerializer(report).data},
            status=status.HTTP_200_OK,
        )


class IsStaff(BasePermission):
    message = "Only Staff members can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STAFF
            and request.user.is_active
            and request.user.is_verified
        )


class StaffAcceptReportView(generics.GenericAPIView):
    permission_classes = [IsStaff]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            report = (
                Report.objects
                .select_related("department", "assigned_staff")
                .get(
                    id=report_id,
                    assigned_staff=request.user,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {
                    "error": "This report is not assigned to you."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.ASSIGNED:
            return Response(
                {
                    "error": (
                        "Only assigned reports can be accepted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = Report.Status.IN_PROGRESS
        report.save()

        notify_report_participants(
            report,
            f"Work has started on your complaint #{report.id}.",
            include_citizen=True,
            include_staff=False,
            include_manager=True,
        )

        return Response(
            {
                "message": "Report accepted successfully.",
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class StaffResolutionCreateView(generics.GenericAPIView):
    permission_classes = [IsStaff]
    serializer_class = ReportResolutionSerializer

    def post(self, request, report_id):
        try:
            report = (
                Report.objects
                .select_related("department", "assigned_staff")
                .get(
                    id=report_id,
                    assigned_staff=request.user,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {
                    "error": "This report is not assigned to you."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.IN_PROGRESS:
            return Response(
                {
                    "error": (
                        "Work evidence can only be added "
                        "while the report is in progress."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent more than one active resolution cycle.
        active_resolution = (
            ReportResolution.objects
            .filter(
                report=report,
                resolved_at__isnull=True,
            )
            .first()
        )

        if active_resolution:
            return Response(
                {
                    "error": (
                        "Work evidence already exists for the "
                        "current work cycle."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        work_description = request.data.get("work_description")

        if not work_description or not work_description.strip():
            return Response(
                {
                    "error": "Work description is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        resolution = ReportResolution.objects.create(
            report=report,
            staff=request.user,
            work_description=work_description.strip(),
        )

        return Response(
            {
                "message": "Work evidence created successfully.",
                "resolution": ReportResolutionSerializer(
                    resolution
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffResolutionImageUploadView(generics.CreateAPIView):
    permission_classes = [IsStaff]
    serializer_class = ResolutionImageUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            resolution = (
                ReportResolution.objects
                .select_related("report")
                .filter(
                    report__id=kwargs["report_id"],
                    staff=request.user,
                    resolved_at__isnull=True,
                )
                .order_by("-created_at")
                .first()
            )
        except Exception:
            resolution = None

        if not resolution:
            return Response(
                {
                    "error": (
                        "Active work evidence has not been "
                        "created for this report."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if resolution.report.status != Report.Status.IN_PROGRESS:
            return Response(
                {
                    "error": (
                        "Evidence can only be uploaded "
                        "while the report is in progress."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(resolution=resolution)

        return Response(
            {
                "message": "Resolution image uploaded successfully.",
                "image": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffResolutionVideoUploadView(generics.CreateAPIView):
    permission_classes = [IsStaff]
    serializer_class = ResolutionVideoUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            resolution = (
                ReportResolution.objects
                .select_related("report")
                .filter(
                    report__id=kwargs["report_id"],
                    staff=request.user,
                    resolved_at__isnull=True,
                )
                .order_by("-created_at")
                .first()
            )
        except Exception:
            resolution = None

        if not resolution:
            return Response(
                {
                    "error": (
                        "Active work evidence has not been "
                        "created for this report."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if resolution.report.status != Report.Status.IN_PROGRESS:
            return Response(
                {
                    "error": (
                        "Evidence can only be uploaded "
                        "while the report is in progress."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(resolution=resolution)

        return Response(
            {
                "message": "Resolution video uploaded successfully.",
                "video": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffResolveReportView(generics.GenericAPIView):
    permission_classes = [IsStaff]
    serializer_class = ReportResolutionSerializer

    def post(self, request, report_id):
        try:
            report = (
                Report.objects
                .select_related("department", "assigned_staff")
                .get(
                    id=report_id,
                    assigned_staff=request.user,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "This report is not assigned to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.IN_PROGRESS:
            return Response(
                {
                    "error": (
                        "Only reports currently in progress "
                        "can be resolved."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the active resolution for the current work cycle.
        resolution = (
            ReportResolution.objects
            .filter(
                report=report,
                staff=request.user,
                resolved_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if not resolution:
            return Response(
                {
                    "error": (
                        "Please add the work description and "
                        "evidence before resolving the report."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not resolution.work_description.strip():
            return Response(
                {
                    "error": (
                        "Work description is required before resolving."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not resolution.images.exists() and not resolution.videos.exists():
            return Response(
                {
                    "error": (
                        "At least one work evidence image or video "
                        "is required before resolving the report."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone

        resolution.resolved_at = timezone.now()
        resolution.save(
            update_fields=[
                "resolved_at",
                "updated_at",
            ]
        )

        report.status = Report.Status.RESOLVED
        report.save(
            update_fields=["status", "updated_at"]
        )

        notify_report_participants(
            report,
            (
                f"Work on complaint #{report.id} has been completed. "
                "Resolution evidence is available for review. Please verify "
                "the result or reopen the complaint if the issue remains."
            ),
            include_citizen=True,
            include_staff=False,
            include_manager=True,
        )

        return Response(
            {
                "message": "Report resolved successfully.",
                "report": ReportSerializer(report).data,
                "resolution": ReportResolutionSerializer(
                    resolution
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class CitizenVerifyReportView(generics.GenericAPIView):
    permission_classes = [IsCitizen]
    serializer_class = ReportSerializer

    def post(self, request, report_id):
        try:
            report = (
                Report.objects
                .select_related(
                    "department",
                    "assigned_staff",
                )
                .get(
                    id=report_id,
                    citizen=request.user,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status != Report.Status.RESOLVED:
            return Response(
                {
                    "error": (
                        "Only resolved reports can be verified."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = Report.Status.CLOSED
        report.save(update_fields=["status", "updated_at"])

        notify_report_participants(
            report,
            f"Complaint #{report.id} has been verified and closed.",
            include_citizen=False,
            include_staff=True,
            include_manager=True,
        )

        return Response(
            {
                "message": (
                    "Report verified and closed successfully."
                ),
                "report": ReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class CitizenReopenReportView(generics.GenericAPIView):
    permission_classes = [IsCitizen]
    serializer_class = ReportReopenSerializer

    def post(self, request, report_id):
        try:
            report = (
                Report.objects
                .select_related(
                    "department",
                    "assigned_staff",
                )
                .get(
                    id=report_id,
                    citizen=request.user,
                )
            )
        except Report.DoesNotExist:
            return Response(
                {"error": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if report.status not in {Report.Status.RESOLVED, Report.Status.CLOSED}:
            return Response(
                {
                    "error": (
                        "Only resolved or closed reports can be reopened."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if report.duplicate_review_status == Report.DuplicateReviewStatus.CONFIRMED:
            return Response(
                {"error": "This complaint was confirmed as a duplicate. Please follow the existing complaint."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("reason")

        if not reason or not reason.strip():
            return Response(
                {
                    "error": (
                        "A reason is required when "
                        "the report is not verified."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        reopen_request = ReportReopen.objects.create(
            report=report,
            citizen=request.user,
            reason=reason.strip(),
        )

        report.status = Report.Status.REOPENED
        report.priority = Report.Priority.HIGH
        report.save()

        notify_report_participants(
            report,
            (
                f"Complaint #{report.id} has been reopened "
                "by the citizen and requires further action."
            ),
            include_citizen=False,
            include_staff=True,
            include_manager=True,
        )

        return Response(
            {
                "message": (
                    "Report reopened successfully. "
                    "The department will review the case again."
                ),
                "report": ReportSerializer(report).data,
                "reopen_request": ReportReopenSerializer(
                    reopen_request
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class CitizenReopenImageUploadView(generics.CreateAPIView):
    permission_classes = [IsCitizen]
    serializer_class = ReopenImageUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            reopen_request = (
                ReportReopen.objects
                .select_related("report")
                .get(
                    report__id=kwargs["report_id"],
                    citizen=request.user,
                )
            )
        except ReportReopen.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Reopen request has not been created "
                        "for this report."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if reopen_request.report.status != Report.Status.REOPENED:
            return Response(
                {
                    "error": (
                        "Evidence can only be uploaded for "
                        "a reopened report."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reopen_request=reopen_request)

        return Response(
            {
                "message": (
                    "Citizen rejection image uploaded successfully."
                ),
                "image": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class CitizenReopenVideoUploadView(generics.CreateAPIView):
    permission_classes = [IsCitizen]
    serializer_class = ReopenVideoUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        try:
            reopen_request = (
                ReportReopen.objects
                .select_related("report")
                .get(
                    report__id=kwargs["report_id"],
                    citizen=request.user,
                )
            )
        except ReportReopen.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Reopen request has not been created "
                        "for this report."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if reopen_request.report.status != Report.Status.REOPENED:
            return Response(
                {
                    "error": (
                        "Evidence can only be uploaded for "
                        "a reopened report."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reopen_request=reopen_request)

        return Response(
            {
                "message": (
                    "Citizen rejection video uploaded successfully."
                ),
                "video": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )