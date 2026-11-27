from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from notifications.models import Notification
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from accounts.serializers import SeniorCitizenStaffRegisterSerializer
from .models import (
    SeniorCitizenRequest,
    SeniorCitizenImage,
    SeniorCitizenMessage,
    SeniorCitizenManagerProfile,
    SeniorCitizenStaffProfile,
    SeniorCitizenServiceArea,
    SeniorCitizenRequestTransferHistory,
    SeniorCitizenIssueReport,
)
from .serializers import (
    SeniorCitizenRequestSerializer,
    SeniorCitizenImageSerializer,
    SeniorCitizenMessageSerializer,
    SeniorCitizenStaffProfileSerializer,
    SeniorCitizenStaffUpdateSerializer,
    SeniorCitizenManagerProfileSerializer,
    SeniorCitizenIssueReportSerializer,
)

from .location_detection import detect_request_location


# --------------------------------------------------
# ROLE HELPERS
# --------------------------------------------------

def is_super_admin(user):
    return (
        user.is_authenticated
        and (
            user.is_superuser
            or user.role == User.Role.SUPER_ADMIN
        )
    )


def is_senior_citizen_manager(user):
    return (
        user.is_authenticated
        and user.is_active
        and user.role == User.Role.SENIOR_CITIZEN_MANAGER
    )


def is_senior_citizen_staff(user):
    return (
        user.is_authenticated
        and user.is_active
        and user.role == User.Role.SENIOR_CITIZEN_STAFF
    )


def can_access_request(user, assistance_request):
    if not user.is_authenticated or not user.is_active:
        return False

    if is_super_admin(user):
        return True

    if assistance_request.citizen_id == user.id:
        return True

    if is_senior_citizen_manager(user):
        manager_profile = get_manager_profile(user)

        if manager_profile is None:
            return False

        # Requests already assigned to this manager.
        if assistance_request.assigned_manager_id == manager_profile.id:
            return True

        # Allow this manager to view unassigned requests
        # only when the request belongs to their active service area.
        if assistance_request.assigned_manager_id is None:
            return SeniorCitizenRequest.objects.filter(
                get_manager_request_filter(manager_profile),
                pk=assistance_request.pk,
            ).exists()

        # Requests assigned to another manager are not accessible.
        return False

    if is_senior_citizen_staff(user):
        return assistance_request.assigned_staff_id == user.id

    return False


# --------------------------------------------------
# SENIOR CITIZEN REQUEST ROUTING HELPERS
# --------------------------------------------------

def get_request_routing_location(assistance_request):
    """
    Always route a new request to the state and district selected
    by the citizen. Detected-location differences are warnings and
    do not automatically redirect the request.
    """
    return (
        (assistance_request.state or "").strip(),
        (assistance_request.district or "").strip(),
    )


def get_manager_profile(user):
    """
    Return the logged-in Senior Citizen Manager's profile.
    """
    try:
        return SeniorCitizenManagerProfile.objects.get(user=user)
    except SeniorCitizenManagerProfile.DoesNotExist:
        return None


def get_manager_for_location(state, district):
    """
    Find the active Senior Citizen Manager responsible
    for the supplied state and district.
    """
    if not state or not district:
        return None

    service_area = (
        SeniorCitizenServiceArea.objects
        .select_related("manager__user")
        .filter(
            state__iexact=state.strip(),
            district__iexact=district.strip(),
            is_active=True,
            manager__user__is_active=True,
            manager__user__role=User.Role.SENIOR_CITIZEN_MANAGER,
        )
        .first()
    )

    if service_area:
        return service_area.manager

    return None


def get_manager_request_filter(manager_profile):
    request_filter = Q()

    service_areas = manager_profile.service_areas.filter(
        is_active=True
    )

    for area in service_areas:
        request_filter |= Q(
            state__iexact=area.state,
            district__iexact=area.district,
        )

    return (
        Q(assigned_manager=manager_profile)
        | (
            Q(assigned_manager__isnull=True)
            & request_filter
        )
    )


# --------------------------------------------------
# NOTIFICATIONS
# --------------------------------------------------

def notify_users(user_ids, message, assistance_request):
    recipient_ids = set(user_ids)
    recipient_ids.discard(None)

    if not recipient_ids:
        return

    Notification.objects.bulk_create([
        Notification(
            recipient_id=user_id,
            report=None,
            message=message,
        )
        for user_id in recipient_ids
    ])


def get_message_participants(assistance_request):
    """
    Only the citizen, assigned staff, and assigned manager
    participate in this request's private conversation.
    """
    participant_ids = {
        assistance_request.citizen_id,
        assistance_request.assigned_staff_id,
    }

    if assistance_request.assigned_manager_id:
        manager_profile = assistance_request.assigned_manager
        if manager_profile and manager_profile.user_id:
            participant_ids.add(manager_profile.user_id)

    participant_ids.discard(None)
    return participant_ids


# --------------------------------------------------
# STATUS TRANSITIONS
# --------------------------------------------------

def validate_assistance_transition(current_status, action):
    Status = SeniorCitizenRequest.Status

    allowed_transitions = {
        "review": [Status.SUBMITTED],
        "approve": [Status.UNDER_REVIEW],
        "reject": [Status.SUBMITTED, Status.UNDER_REVIEW],
        "assign": [Status.APPROVED],
        "start": [Status.ASSIGNED],
        "on_the_way": [Status.IN_PROGRESS],
        "arrived": [Status.ON_THE_WAY],
        "pickup_completed": [Status.ARRIVED],
        "in_transit": [Status.PICKUP_COMPLETED],
        "complete": [Status.IN_PROGRESS, Status.IN_TRANSIT],
        "close": [Status.COMPLETED],
    }

    if action not in allowed_transitions:
        return False

    return current_status in allowed_transitions[action]


# --------------------------------------------------
# LIST AND CREATE REQUESTS
# --------------------------------------------------

class SeniorCitizenRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        user = request.user

        queryset = SeniorCitizenRequest.objects.select_related(
            "citizen",
            "department",
            "assigned_staff",
            "assigned_manager",
            "assigned_manager__user",
        ).prefetch_related(
            "images",
            "transfer_history",
        )

        if is_super_admin(user):
            # Super Admin can view all Senior Citizen requests.
            pass

        elif user.role == User.Role.CITIZEN:
            # Citizens can view only their own requests.
            queryset = queryset.filter(citizen=user)

        elif is_senior_citizen_manager(user):
            manager_profile = get_manager_profile(user)

            if manager_profile is None:
                return Response(
                    {
                        "detail": (
                            "Senior Citizen Manager profile not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            queryset = queryset.filter(
                get_manager_request_filter(manager_profile)
            ).distinct()

        elif is_senior_citizen_staff(user):
            # Staff can view only requests assigned to them.
            queryset = queryset.filter(assigned_staff=user)

        else:
            return Response(
                {
                    "detail": (
                        "You are not authorized to view "
                        "these requests."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SeniorCitizenRequestSerializer(
            queryset,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    def post(self, request):
        user = request.user

        # 1. Check user permission
        if (
            user.role != User.Role.CITIZEN
            and not is_super_admin(user)
        ):
            return Response(
                {
                    "detail": (
                        "Only citizens can submit assistance requests."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Validate citizen's submitted data
        serializer = SeniorCitizenRequestSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        # 3. Create the assistance request.
        with transaction.atomic():
            assistance_request = serializer.save(citizen=user)

        # 4. Detect and compare the submitted location.
        # Location detection may call an external service.
        detect_request_location(assistance_request)

        # 5. Route using the citizen-selected location.
        routing_state, routing_district = get_request_routing_location(
            assistance_request
        )

        # 6. Find the manager for the selected district.
        manager_profile = get_manager_for_location(
            routing_state,
            routing_district,
        )

        # 7. Assign the selected-district manager.
        if manager_profile is not None:
            assistance_request.assigned_manager = manager_profile

            assistance_request.save(
                update_fields=[
                    "assigned_manager",
                    "updated_at",
                ]
            )

            notify_users(
                [manager_profile.user_id],
                (
                    "Senior Citizen Assistance request "
                    f"#{assistance_request.id} has been routed to your "
                    f"selected service area ({routing_district}, "
                    f"{routing_state})."
                ),
                assistance_request,
            )
            
            # Notify the citizen after successful request submission.
            notify_users(
            [user.id],
            (
                "Thank you for submitting your Senior Citizen Assistance "
                f"request #{assistance_request.id}. "
                "Your request has been submitted successfully. "
                "The department manager will review it."
            ),
            assistance_request,
            )

        # 8. Return the created request.
        response_serializer = SeniorCitizenRequestSerializer(
            assistance_request,
            context={"request": request},
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------------------
# REQUEST DETAILS
# --------------------------------------------------

class SeniorCitizenRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest.objects.select_related(
                "citizen",
                "department",
                "assigned_staff",
                "assigned_manager",
                "assigned_manager__user",
            ).prefetch_related("images"),
            pk=pk,
        )

        if not can_access_request(request.user, assistance_request):
            return None

        return assistance_request

    def get(self, request, pk):
        assistance_request = self.get_object(request, pk)

        if assistance_request is None:
            return Response(
                {
                    "detail": (
                        "You are not authorized to access this request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SeniorCitizenRequestSerializer(
            assistance_request,
            context={"request": request},
        )

        return Response(serializer.data)

    def patch(self, request, pk):
        assistance_request = self.get_object(request, pk)

        if assistance_request is None:
            return Response(
                {
                    "detail": (
                        "You are not authorized to access this request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if assistance_request.citizen_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "Only the request owner can edit request details."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            assistance_request.status
            != SeniorCitizenRequest.Status.SUBMITTED
        ):
            return Response(
                {
                    "detail": (
                        "Only submitted requests can be edited."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SeniorCitizenRequestSerializer(
            assistance_request,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


# --------------------------------------------------
# REQUEST IMAGE UPLOAD
# --------------------------------------------------

class SeniorCitizenImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, request_id):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=request_id,
        )

        if not can_access_request(request.user, assistance_request):
            return Response(
                {
                    "detail": (
                        "You are not authorized to upload images here."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if "image" not in request.FILES:
            return Response(
                {"image": "An image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SeniorCitizenImageSerializer(
            data={"image": request.FILES["image"]},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        image = serializer.save(
            request=assistance_request,
            uploaded_by=request.user,
        )

        return Response(
            SeniorCitizenImageSerializer(image).data,
            status=status.HTTP_201_CREATED,
        )
# --------------------------------------------------
# REQUEST ACTIONS
# --------------------------------------------------

class SeniorCitizenRequestActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=pk,
        )

        user = request.user
        action = request.data.get("action")

        valid_actions = {
            "review",
            "approve",
            "reject",
            "assign",
            "start",
            "on_the_way",
            "arrived",
            "pickup_completed",
            "in_transit",
            "complete",
            "close",
        }

        if action not in valid_actions:
            return Response(
                {
                    "detail": (
                        "Invalid action. Use review, approve, reject, "
                        "assign, start, on_the_way, arrived, "
                        "pickup_completed, in_transit, complete, or close."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager_actions = {
            "review",
            "approve",
            "reject",
            "assign",
            "close",
        }

        # Only managers or Super Admin can perform management actions.
        if action in manager_actions:
            if not (
                is_senior_citizen_manager(user)
                or is_super_admin(user)
            ):
                return Response(
                    {
                        "detail": (
                            "Only the Senior Citizen Manager or "
                            "Super Admin can perform this action."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Only the assigned staff member can update field progress.
        elif action in {
            "start",
            "on_the_way",
            "arrived",
            "pickup_completed",
            "in_transit",
            "complete",
        }:
            if not (
                is_senior_citizen_staff(user)
                and assistance_request.assigned_staff_id == user.id
            ):
                return Response(
                    {
                        "detail": (
                            "Only the assigned Senior Citizen Staff "
                            "member can perform this action."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Managers may only act on requests assigned to their profile.
        # Managers may only act on requests assigned to their profile.
        if is_senior_citizen_manager(user):
            manager_profile = get_manager_profile(user)

            if manager_profile is None:
                return Response(
                    {
                        "detail": (
                            "Senior Citizen Manager profile not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assistance_request.assigned_manager_id != manager_profile.id:
                return Response(
                    {
                        "detail": (
                            "This request is not assigned to your management."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # REVIEW
        # REVIEW
        if action == "review":

            update_fields = ["status", "updated_at"]

            # Claim the request for this manager when it is unassigned.
            if (
                is_senior_citizen_manager(user)
                and assistance_request.assigned_manager_id is None
            ):
                assistance_request.assigned_manager = manager_profile
                update_fields.append("assigned_manager")

            assistance_request.status = (
                SeniorCitizenRequest.Status.UNDER_REVIEW
            )

            assistance_request.save(
                update_fields=update_fields
            )

        # APPROVE
        elif action == "approve":
            assistance_request.status = (
                SeniorCitizenRequest.Status.APPROVED
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # REJECT
        elif action == "reject":
            assistance_request.status = (
                SeniorCitizenRequest.Status.REJECTED
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # ASSIGN SENIOR CITIZEN STAFF
        elif action == "assign":
            staff_id = request.data.get("staff_id")

            if not staff_id:
                return Response(
                    {"staff_id": "This field is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Deadline and estimated arrival are mandatory.
            deadline_value = request.data.get("deadline")
            estimated_arrival_value = request.data.get(
                "estimated_arrival"
            )

            if not deadline_value:
                return Response(
                    {"deadline": "Deadline is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not estimated_arrival_value:
                return Response(
                    {
                        "estimated_arrival": (
                            "Estimated arrival is required."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            deadline = parse_datetime(str(deadline_value))
            estimated_arrival = parse_datetime(
                str(estimated_arrival_value)
            )

            if deadline is None or timezone.is_naive(deadline):
                return Response(
                    {
                        "deadline": (
                            "Enter a valid timezone-aware ISO 8601 datetime."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                estimated_arrival is None
                or timezone.is_naive(estimated_arrival)
            ):
                return Response(
                    {
                        "estimated_arrival": (
                            "Enter a valid timezone-aware ISO 8601 datetime."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if deadline <= timezone.now():
                return Response(
                    {"deadline": "Deadline must be in the future."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if estimated_arrival <= timezone.now():
                return Response(
                    {
                        "estimated_arrival": (
                            "Estimated arrival must be in the future."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            staff = get_object_or_404(
                User,
                pk=staff_id,
                role=User.Role.SENIOR_CITIZEN_STAFF,
            )

            if not staff.is_active:
                return Response(
                    {
                        "detail": (
                            "Inactive Senior Citizen Staff "
                            "cannot be assigned."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                staff_profile = (
                    SeniorCitizenStaffProfile.objects.select_related(
                        "manager"
                    ).get(user=staff)
                )
            except SeniorCitizenStaffProfile.DoesNotExist:
                return Response(
                    {
                        "detail": (
                            "The selected staff member does not have "
                            "a Senior Citizen Staff Profile."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # A manager may assign only their own staff.
            if is_senior_citizen_manager(user):
                manager_profile = get_manager_profile(user)

                if manager_profile is None:
                    return Response(
                        {
                            "detail": (
                                "Senior Citizen Manager profile not found."
                            )
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )

                if staff_profile.manager_id != manager_profile.id:
                    return Response(
                        {
                            "detail": (
                                "You can assign requests only to "
                                "staff under your management."
                            )
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Save the assignment using the existing workflow.
            assistance_request.assigned_staff = staff
            assistance_request.deadline = deadline
            assistance_request.estimated_arrival = estimated_arrival
            assistance_request.status = (
                SeniorCitizenRequest.Status.ASSIGNED
            )

            assistance_request.save(
                update_fields=[
                    "assigned_staff",
                    "deadline",
                    "estimated_arrival",
                    "status",
                    "updated_at",
                ]
            )

            # --------------------------------------------------
            # UPDATED: STAFF ASSIGNMENT NOTIFICATIONS
            # --------------------------------------------------

            # Preserve the existing notification for assigned staff.
            notify_users(
                [staff.id],
                (
                    "Senior Citizen Assistance request "
                    f"#{assistance_request.id} has been assigned to you."
                ),
                assistance_request,
            )

            # Get the available staff profile details.
            staff_full_name = (
                f"{staff.first_name} {staff.last_name}".strip()
                or staff.email
            )

            staff_phone = (
                staff_profile.phone_number or "Not provided"
            )

            staff_designation = (
                staff_profile.designation or "Not provided"
            )

            staff_location = (
                staff_profile.location or "Not provided"
            )

            staff_district = (
                staff_profile.district or "Not provided"
            )

            staff_state = (
                staff_profile.state or "Not provided"
            )

            # Prepare the message containing staff details.
            staff_details_message = (
                "A staff member has been assigned to your "
                "Senior Citizen Assistance request "
                f"#{assistance_request.id}.\n\n"
                f"Staff Name: {staff_full_name}\n"
                f"Designation: {staff_designation}\n"
                f"Phone: {staff_phone}\n"
                f"Email: {staff.email}\n"
                f"Location: {staff_location}\n"
                f"District: {staff_district}\n"
                f"State: {staff_state}\n"
                f"Estimated Arrival: "
                f"{assistance_request.estimated_arrival}\n"
                f"Deadline: {assistance_request.deadline}"
            )

            # Notify the citizen with the assigned staff's details.
            notify_users(
                [assistance_request.citizen_id],
                staff_details_message,
                assistance_request,
            )

            # Save the assignment details in the existing conversation.
            SeniorCitizenMessage.objects.create(
                request=assistance_request,
                sender=user,
                content=staff_details_message,
            )

        # START ASSISTANCE
        elif action == "start":
            assistance_request.status = (
                SeniorCitizenRequest.Status.IN_PROGRESS
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # STAFF IS ON THE WAY
        elif action == "on_the_way":
            assistance_request.status = (
                SeniorCitizenRequest.Status.ON_THE_WAY
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # STAFF HAS ARRIVED
        elif action == "arrived":
            assistance_request.status = (
                SeniorCitizenRequest.Status.ARRIVED
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # PICKUP COMPLETED
        elif action == "pickup_completed":
            assistance_request.status = (
                SeniorCitizenRequest.Status.PICKUP_COMPLETED
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # CITIZEN IS IN TRANSIT
        elif action == "in_transit":
            assistance_request.status = (
                SeniorCitizenRequest.Status.IN_TRANSIT
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # COMPLETE ASSISTANCE
        elif action == "complete":
            assistance_request.status = (
                SeniorCitizenRequest.Status.COMPLETED
            )
            update_fields = ["status", "updated_at"]

            if hasattr(assistance_request, "completed_at"):
                assistance_request.completed_at = timezone.now()
                update_fields.append("completed_at")

            if hasattr(assistance_request, "completion_notes"):
                assistance_request.completion_notes = request.data.get(
                    "completion_notes",
                    "",
                )
                update_fields.append("completion_notes")

            assistance_request.save(update_fields=update_fields)

            # Automatically add a completion message to the existing
            # conversation so the citizen and manager can view it.
            completion_notes = (
                getattr(assistance_request, "completion_notes", "") or ""
            ).strip()

            completion_message = (
                f"Work for Senior Citizen Assistance request "
                f"#{assistance_request.id} has been completed."
            )

            if completion_notes:
                completion_message += f" Staff update: {completion_notes}"

            completion_message += " Please verify the completed work."

            SeniorCitizenMessage.objects.create(
                request=assistance_request,
                sender=user,
                content=completion_message,
            )

        # CLOSE ONLY AFTER CITIZEN VERIFICATION
        elif action == "close":
            if (
                not assistance_request.verified_at
                or not assistance_request.verified_by_id
            ):
                return Response(
                    {
                        "detail": (
                            "The citizen must verify completion before "
                            "the request can be closed."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assistance_request.status = (
                SeniorCitizenRequest.Status.CLOSED
            )
            assistance_request.save(
                update_fields=["status", "updated_at"]
            )

        # Existing status notification for relevant participants.
        recipient_ids = {
            assistance_request.citizen_id,
            assistance_request.assigned_staff_id,
        }

        if assistance_request.assigned_manager_id:
            recipient_ids.add(
                assistance_request.assigned_manager.user_id
            )

        notify_users(
            recipient_ids,
            (
                "Senior Citizen Assistance request "
                f"#{assistance_request.id} status: "
                f"{assistance_request.status}."
            ),
            assistance_request,
        )

        return Response(
            SeniorCitizenRequestSerializer(
                assistance_request,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

# --------------------------------------------------
# REQUEST MESSAGES
# --------------------------------------------------

class SeniorCitizenMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_request(self, request_id):
        return get_object_or_404(
            SeniorCitizenRequest,
            pk=request_id,
        )

    def get(self, request, request_id):
        assistance_request = self.get_request(request_id)

        if not can_access_request(request.user, assistance_request):
            return Response(
                {
                    "detail": (
                        "You are not authorized to access this conversation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        messages = SeniorCitizenMessage.objects.filter(
            request=assistance_request
        ).select_related("sender")

        serializer = SeniorCitizenMessageSerializer(
            messages,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request, request_id):
        assistance_request = self.get_request(request_id)

        if not can_access_request(request.user, assistance_request):
            return Response(
                {
                    "detail": (
                        "You are not authorized to send messages "
                        "in this conversation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SeniorCitizenMessageSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        message = serializer.save(
            request=assistance_request,
            sender=request.user,
        )

        recipients = (
            get_message_participants(assistance_request)
            - {request.user.id}
        )

        if recipients:
            Notification.objects.bulk_create([
                Notification(
                    recipient_id=recipient_id,
                    report=None,
                    message=(
                        "New message on Senior Citizen Assistance "
                        f"request #{assistance_request.id}."
                    ),
                )
                for recipient_id in recipients
            ])

        return Response(
            SeniorCitizenMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------------------
# MARK MESSAGE AS READ
# --------------------------------------------------

class SeniorCitizenMessageReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(
            SeniorCitizenMessage.objects.select_related("request"),
            pk=message_id,
        )

        if not can_access_request(request.user, message.request):
            return Response(
                {
                    "detail": (
                        "You are not authorized to access this message."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.sender_id == request.user.id:
            return Response(
                {
                    "detail": (
                        "You cannot mark your own message as read."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not message.is_read:
            message.is_read = True
            message.read_at = timezone.now()
            message.save(update_fields=["is_read", "read_at"])

        return Response(
            SeniorCitizenMessageSerializer(message).data,
            status=status.HTTP_200_OK,
        )

# --------------------------------------------------
# SENIOR CITIZEN STAFF SELF PROFILE
# --------------------------------------------------

class SeniorCitizenStaffMyProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        # Only Senior Citizen Staff can access this endpoint.
        if not is_senior_citizen_staff(user):
            return Response(
                {
                    "detail": (
                        "Only Senior Citizen Staff can access "
                        "their own profile."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Retrieve only the authenticated staff member's profile.
        staff_profile = get_object_or_404(
            SeniorCitizenStaffProfile.objects.select_related(
                "user",
                "manager__user",
            ),
            user=user,
        )

        serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
# --------------------------------------------------
# SENIOR CITIZEN STAFF LIST
# --------------------------------------------------

# --------------------------------------------------
# SENIOR CITIZEN STAFF CRUD
# --------------------------------------------------

class SeniorCitizenStaffListView(APIView):

    permission_classes = [IsAuthenticated]

    # --------------------------------------------------
    # GET - LIST STAFF
    # --------------------------------------------------

    def get(self, request):

        user = request.user

        if is_super_admin(user):

            queryset = SeniorCitizenStaffProfile.objects.all()

        elif is_senior_citizen_manager(user):

            manager_profile = get_manager_profile(user)

            if manager_profile is None:
                return Response(
                    {
                        "detail": "Senior Citizen Manager profile not found."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            queryset = SeniorCitizenStaffProfile.objects.filter(
                manager=manager_profile
            )

        else:

            return Response(
                {
                    "detail": "Only Senior Citizen Managers or Super Admins can view staff."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = queryset.select_related(
            "user",
            "manager__user",
        ).order_by(
            "user__first_name",
            "user__last_name",
        )

        serializer = SeniorCitizenStaffProfileSerializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------
    # POST - CREATE STAFF
    # --------------------------------------------------

    def post(self, request):

        user = request.user

        if not is_senior_citizen_manager(user):
            return Response(
                {
                    "detail": "Only Senior Citizen Managers can register staff."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        manager_profile = get_manager_profile(user)

        if manager_profile is None:
            return Response(
                {
                    "detail": "Senior Citizen Manager profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SeniorCitizenStaffRegisterSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        staff_user = serializer.save()

        staff_profile = SeniorCitizenStaffProfile.objects.select_related(
            "user",
            "manager__user",
        ).get(
            user=staff_user,
            manager=manager_profile,
        )

        response_serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(
            {
                "message": "Staff registered successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------------------
# SENIOR CITIZEN STAFF DETAILS
# --------------------------------------------------

class SeniorCitizenStaffDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_staff_queryset(self, request):

        user = request.user

        if is_super_admin(user):
            return SeniorCitizenStaffProfile.objects.all()

        elif is_senior_citizen_manager(user):

            manager_profile = get_manager_profile(user)

            if manager_profile is None:
                return None

            return SeniorCitizenStaffProfile.objects.filter(
                manager=manager_profile
            )

        return None

    # -----------------------------------------
    # GET STAFF DETAILS (EXISTING FUNCTION)
    # -----------------------------------------

    def get(self, request, staff_id):

        queryset = self.get_staff_queryset(request)

        if queryset is None:
            return Response(
                {
                    "detail": (
                        "You are not authorized to access this staff."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        staff_profile = get_object_or_404(
            queryset.select_related("user", "manager__user"),
            pk=staff_id,
        )

        serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(serializer.data)

    # -----------------------------------------
    # UPDATE STAFF (PATCH / PUT)
    # -----------------------------------------

    def patch(self, request, staff_id):

        queryset = self.get_staff_queryset(request)

        if queryset is None:
            return Response(
                {
                    "detail": (
                        "Only Senior Citizen Managers or Super Admins "
                        "can update staff."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        staff_profile = get_object_or_404(
            queryset.select_related("user"),
            pk=staff_id,
        )

        if not staff_profile.is_active:
            return Response(
                {"detail": "Inactive staff cannot be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SeniorCitizenStaffUpdateSerializer(
            staff_profile,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)

        serializer.save()

        response_serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )

    def put(self, request, staff_id):

        # Support PUT using the same safe partial-update behavior.
        return self.patch(request, staff_id)

    # -----------------------------------------
    # DELETE STAFF (SOFT DELETE)
    # -----------------------------------------

    def delete(self, request, staff_id):
        user = request.user

        # Super Admin can delete any Senior Citizen Staff.
        if is_super_admin(user):
            queryset = SeniorCitizenStaffProfile.objects.all()

        # Manager can delete only their own department's staff.
        elif is_senior_citizen_manager(user):
            manager_profile = get_manager_profile(user)

            if manager_profile is None:
                return Response(
                    {"detail": "Senior Citizen Manager profile not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            queryset = SeniorCitizenStaffProfile.objects.filter(
                manager=manager_profile
            )

        else:
            return Response(
                {
                    "detail": (
                        "Only Senior Citizen Managers or Super Admins "
                        "can delete staff."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        staff_profile = get_object_or_404(
            queryset.select_related("user"),
            pk=staff_id,
        )

        staff_user = staff_profile.user

        with transaction.atomic():

            # Permanently delete the Staff Profile.
            staff_profile.delete()

            # Prevent the deleted staff account from logging in.
            # The User record is retained to protect existing history.
            staff_user.is_active = False
            staff_user.save(update_fields=["is_active"])

        return Response(
            {
                "success": True,
                "message": "Staff deleted successfully.",
                "staff_id": staff_id,
            },
            status=status.HTTP_200_OK,
        )
# --------------------------------------------------
# TRANSFER SENIOR CITIZEN ASSISTANCE REQUEST
# --------------------------------------------------

class SeniorCitizenRequestTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=pk,
        )

        user = request.user

        # Only Senior Citizen Managers and Super Admins can transfer.
        if not (
            is_senior_citizen_manager(user)
            or is_super_admin(user)
        ):
            return Response(
                {
                    "detail": (
                        "Only Senior Citizen Managers or "
                        "Super Admins can transfer requests."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        manager_id = request.data.get("manager_id")
        note = request.data.get("note", "")

        if not manager_id:
            return Response(
                {"manager_id": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find the destination Senior Citizen Manager profile.
        try:
            target_manager = (
                SeniorCitizenManagerProfile.objects.select_related(
                    "user"
                ).get(
                    pk=manager_id,
                    user__role=User.Role.SENIOR_CITIZEN_MANAGER,
                    user__is_active=True,
                )
            )
        except SeniorCitizenManagerProfile.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "The destination Senior Citizen Manager "
                        "does not exist or is inactive."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # A manager can transfer only requests assigned to them.
        # Super Admin can transfer any request.
        if is_senior_citizen_manager(user):
            current_manager = get_manager_profile(user)

            if current_manager is None:
                return Response(
                    {
                        "detail": (
                            "Senior Citizen Manager profile not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assistance_request.assigned_manager_id != current_manager.id:
                return Response(
                    {
                        "detail": (
                            "You can transfer only requests "
                            "assigned to your management."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            current_manager = (
                SeniorCitizenManagerProfile.objects.filter(
                    pk=assistance_request.assigned_manager_id
                ).first()
            )

        if assistance_request.assigned_manager_id == target_manager.id:
            return Response(
                {
                    "detail": (
                        "This request is already assigned "
                        "to the selected manager."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Record the transfer and update the assigned manager.
        with transaction.atomic():
            SeniorCitizenRequestTransferHistory.objects.create(
                request=assistance_request,
                from_manager=current_manager,
                to_manager=target_manager,
                transferred_by=user,
                note=note,
            )

            assistance_request.assigned_manager = target_manager

            # Preserve the request ID, status, assigned staff,
            # images, and messages.
            assistance_request.save(
                update_fields=[
                    "assigned_manager",
                    "updated_at",
                ]
            )

        # Notify the destination manager, previous manager, and citizen.
        recipient_ids = {
            target_manager.user_id,
            assistance_request.citizen_id,
        }

        if current_manager:
            recipient_ids.add(current_manager.user_id)

        notify_users(
            recipient_ids,
            (
                "Senior Citizen Assistance request "
                f"#{assistance_request.id} was transferred "
                f"to manager {target_manager.user.email}."
            ),
            assistance_request,
        )

        return Response(
            {
                "detail": (
                    "Senior Citizen Assistance request "
                    "transferred successfully."
                ),
                "request_id": assistance_request.id,
                "previous_manager_id": (
                    current_manager.id if current_manager else None
                ),
                "assigned_manager_id": target_manager.id,
                "status": assistance_request.status,
            },
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# CITIZEN VERIFICATION OF COMPLETION
# --------------------------------------------------

class SeniorCitizenCompletionVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=pk,
        )

        # Only the citizen who submitted the request can verify completion.
        if assistance_request.citizen_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "Only the citizen who submitted this request "
                        "can verify completion."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Only completed requests can be verified.
        if (
            assistance_request.status
            != SeniorCitizenRequest.Status.COMPLETED
        ):
            return Response(
                {
                    "detail": (
                        "Only completed requests can be verified."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate verification.
        if (
            assistance_request.verified_at
            or assistance_request.verified_by_id
        ):
            return Response(
                {
                    "detail": (
                        "This request has already been verified."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Record citizen verification.
        assistance_request.verified_by = request.user
        assistance_request.verified_at = timezone.now()

        # Automatically close the request.
        assistance_request.status = SeniorCitizenRequest.Status.CLOSED

        assistance_request.save(
            update_fields=[
                "verified_by",
                "verified_at",
                "status",
                "updated_at",
            ]
        )

        # Prepare the closure notification.
        closure_message = (
            "Citizen verified completion and request "
            f"#{assistance_request.id} was automatically closed."
        )

        # Notify the citizen, assigned manager, and assigned staff.
        recipient_ids = {
            assistance_request.citizen_id,
            assistance_request.assigned_staff_id,
        }

        if assistance_request.assigned_manager_id:
            recipient_ids.add(
                assistance_request.assigned_manager.user_id
            )

        # Remove any missing recipient IDs.
        recipient_ids.discard(None)

        # Create notifications for all relevant recipients.
        notify_users(
            recipient_ids,
            closure_message,
            assistance_request,
        )

        return Response(
            {
                "detail": (
                    "Completion verified successfully. "
                    "The request has been closed automatically."
                ),
                "request_id": assistance_request.id,
                "status": assistance_request.status,
                "verified_by": request.user.id,
                "verified_at": assistance_request.verified_at,
            },
            status=status.HTTP_200_OK,
        )

# --------------------------------------------------
# CITIZEN REPORT A PROBLEM
# --------------------------------------------------

class SeniorCitizenIssueReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=request_id,
        )

        if not can_access_request(request.user, assistance_request):
            return Response(
                {
                    "detail": (
                        "You are not authorized to access these reports."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # A manager can only inspect reports assigned
        # to their management.
        if is_senior_citizen_manager(request.user):
            manager_profile = get_manager_profile(request.user)

            if (
                manager_profile is None
                or assistance_request.assigned_manager_id
                != manager_profile.id
            ):
                return Response(
                    {
                        "detail": (
                            "This request is not assigned to your management."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        reports = SeniorCitizenIssueReport.objects.filter(
            request=assistance_request
        ).select_related("reported_by")

        serializer = SeniorCitizenIssueReportSerializer(
            reports,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request, request_id):
        assistance_request = get_object_or_404(
            SeniorCitizenRequest,
            pk=request_id,
        )

        # Only the citizen who submitted this request
        # can report a problem.
        if assistance_request.citizen_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "Only the request owner can report a problem."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Do not allow issue reports after citizen verification
        # or after the request has been closed.
        if (
            assistance_request.status
            == SeniorCitizenRequest.Status.CLOSED
            or assistance_request.verified_at
            or assistance_request.verified_by_id
        ):
            return Response(
                {
                    "detail": (
                        "This request has already been verified and closed. "
                        "New issue reports are not allowed."
                    ),
                    "request_id": assistance_request.id,
                    "status": assistance_request.status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SeniorCitizenIssueReportSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        # Save the report and reopen the work when the citizen
        # reports a problem with completed assistance.
        with transaction.atomic():
            issue_report = serializer.save(
                request=assistance_request,
                reported_by=request.user,
            )

            if (
                assistance_request.status
                == SeniorCitizenRequest.Status.COMPLETED
            ):
                assistance_request.status = (
                    SeniorCitizenRequest.Status.IN_PROGRESS
                )

                update_fields = ["status", "updated_at"]

                if assistance_request.completed_at is not None:
                    assistance_request.completed_at = None
                    update_fields.append("completed_at")

                if assistance_request.completion_notes:
                    assistance_request.completion_notes = ""
                    update_fields.append("completion_notes")

                assistance_request.save(
                    update_fields=update_fields
                )

        # Notify the citizen that the issue report
        # was submitted successfully.
        notify_users(
            [request.user.id],
            (
                "Thank you for reporting this issue for Senior Citizen "
                f"Assistance request #{assistance_request.id}. "
                "Your report has been submitted successfully. "
                "The department manager will review it."
            ),
            assistance_request,
        )

        # Notify only the assigned Senior Citizen Manager.
        recipient_ids = []

        if assistance_request.assigned_manager_id:
            recipient_ids.append(
                assistance_request.assigned_manager.user_id
            )

        notify_users(
            recipient_ids,
            (
                "New problem reported for Senior Citizen Assistance "
                f"request #{assistance_request.id}. "
                f"Report ID: {issue_report.id}."
            ),
            assistance_request,
        )

        return Response(
            SeniorCitizenIssueReportSerializer(issue_report).data,
            status=status.HTTP_201_CREATED,
        )
# --------------------------------------------------
# MANAGER RESPONSE TO A REPORTED PROBLEM
# --------------------------------------------------

class SeniorCitizenIssueReportActionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, report_id):
        issue_report = get_object_or_404(
            SeniorCitizenIssueReport.objects.select_related(
                "request",
                "request__assigned_manager",
            ),
            pk=report_id,
        )

        user = request.user

        if not (
            is_super_admin(user)
            or is_senior_citizen_manager(user)
        ):
            return Response(
                {
                    "detail": (
                        "Only the assigned manager or Super Admin "
                        "can update a problem report."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Managers can respond only to reports belonging
        # to requests assigned to their management.
        if is_senior_citizen_manager(user):
            manager_profile = get_manager_profile(user)

            if (
                manager_profile is None
                or issue_report.request.assigned_manager_id
                != manager_profile.id
            ):
                return Response(
                    {
                        "detail": (
                            "This request is not assigned to your management."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        allowed_fields = {
            "status",
            "manager_response",
            "updated_eta",
        }

        unexpected_fields = set(request.data.keys()) - allowed_fields

        if unexpected_fields:
            return Response(
                {
                    "detail": (
                        "Only status, manager_response, and updated_eta "
                        "can be changed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Detect a genuinely new manager reply so that
        # unrelated report updates do not create duplicate messages.
        manager_reply = ""

        if "manager_response" in request.data:
            manager_reply = str(
                request.data.get("manager_response") or ""
            ).strip()

        manager_reply_changed = (
            bool(manager_reply)
            and manager_reply != issue_report.manager_response
        )

        if "status" in request.data:
            new_status = request.data["status"]

            valid_statuses = {
                value
                for value, label
                in SeniorCitizenIssueReport.ReportStatus.choices
            }

            if new_status not in valid_statuses:
                return Response(
                    {"status": "Invalid issue-report status."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            issue_report.status = new_status

            if (
                new_status
                == SeniorCitizenIssueReport.ReportStatus.RESOLVED
            ):
                issue_report.resolved_at = timezone.now()

        if "manager_response" in request.data:
            issue_report.manager_response = request.data[
                "manager_response"
            ]

        if "updated_eta" in request.data:
            eta_value = request.data["updated_eta"]

            if eta_value:
                eta = parse_datetime(str(eta_value))

                if eta is None or timezone.is_naive(eta):
                    return Response(
                        {
                            "updated_eta": (
                                "Enter a valid timezone-aware "
                                "ISO 8601 datetime."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                issue_report.updated_eta = eta
            else:
                issue_report.updated_eta = None

        with transaction.atomic():
            issue_report.save()

            # Save the manager's reply in the existing request conversation.
            if manager_reply_changed:
                SeniorCitizenMessage.objects.create(
                    request=issue_report.request,
                    sender=user,
                    content=(
                        f"Manager reply to report #{issue_report.id}: "
                        f"{manager_reply}"
                    ),
                )

        # Notify the citizen about the manager's reply.
        if manager_reply_changed:
            notification_message = (
                "The manager replied to your problem report "
                f"#{issue_report.id} for Senior Citizen Assistance "
                f"request #{issue_report.request_id}."
            )
        else:
            notification_message = (
                "The manager updated your problem report for request "
                f"#{issue_report.request_id}."
            )

        notify_users(
            [issue_report.reported_by_id],
            notification_message,
            issue_report.request,
        )

        return Response(
            SeniorCitizenIssueReportSerializer(issue_report).data,
            status=status.HTTP_200_OK,
        )



# --------------------------------------------------
# ACTIVE SENIOR CITIZEN MANAGER DIRECTORY
# --------------------------------------------------

class SeniorCitizenManagerDirectoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (is_senior_citizen_manager(request.user) or is_super_admin(request.user)):
            return Response({"detail": "Only Senior Citizen Managers or Super Admins can view the manager directory."}, status=status.HTTP_403_FORBIDDEN)

        queryset = SeniorCitizenManagerProfile.objects.select_related("user").filter(
            user__is_active=True,
            user__role=User.Role.SENIOR_CITIZEN_MANAGER,
        ).order_by("user__first_name", "user__last_name", "user__email")

        current_profile = get_manager_profile(request.user) if is_senior_citizen_manager(request.user) else None
        if current_profile is not None:
            queryset = queryset.exclude(pk=current_profile.pk)

        results = []
        for profile in queryset:
            user = profile.user
            results.append({
                "id": profile.id,
                "manager_id": profile.id,
                "user_id": user.id,
                "full_name": (f"{user.first_name or ''} {user.last_name or ''}").strip() or user.email,
                "email": user.email,
            })
        return Response(results, status=status.HTTP_200_OK)


# --------------------------------------------------
# REQUEST TRANSFER HISTORY
# --------------------------------------------------

class SeniorCitizenRequestTransferHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        assistance_request = get_object_or_404(SeniorCitizenRequest, pk=pk)
        if not (is_senior_citizen_manager(request.user) or is_super_admin(request.user)):
            return Response({"detail": "You are not authorized to view transfer history."}, status=status.HTTP_403_FORBIDDEN)

        if is_senior_citizen_manager(request.user):
            manager_profile = get_manager_profile(request.user)
            if manager_profile is None or not assistance_request.transfer_history.filter(
                Q(from_manager=manager_profile) | Q(to_manager=manager_profile)
            ).exists() and assistance_request.assigned_manager_id != manager_profile.id:
                return Response({"detail": "You are not authorized to view this request's transfer history."}, status=status.HTTP_403_FORBIDDEN)

        history = assistance_request.transfer_history.select_related(
            "from_manager__user", "to_manager__user", "transferred_by"
        ).order_by("-created_at")
        data = []
        for item in history:
            from_user = item.from_manager.user if item.from_manager_id else None
            to_user = item.to_manager.user
            data.append({
                "id": item.id,
                "request": item.request_id,
                "from_manager_id": item.from_manager_id,
                "from_manager_name": ((f"{from_user.first_name or ''} {from_user.last_name or ''}").strip() or from_user.email) if from_user else None,
                "to_manager_id": item.to_manager_id,
                "to_manager_name": (f"{to_user.first_name or ''} {to_user.last_name or ''}").strip() or to_user.email,
                "transferred_by": item.transferred_by_id,
                "transferred_by_email": item.transferred_by.email if item.transferred_by_id else None,
                "note": item.note,
                "created_at": item.created_at,
            })
        return Response(data, status=status.HTTP_200_OK)


# --------------------------------------------------
# SENIOR CITIZEN MANAGER — MY PROFILE
# --------------------------------------------------

class SeniorCitizenManagerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_senior_citizen_manager(request.user):
            return Response(
                {
                    "detail": (
                        "Only Senior Citizen Managers can access "
                        "this profile."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            manager_profile = (
                SeniorCitizenManagerProfile.objects.select_related(
                    "user"
                ).get(user=request.user)
            )
        except SeniorCitizenManagerProfile.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Senior Citizen Manager profile not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SeniorCitizenManagerProfileSerializer(
            manager_profile,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
        
# ==================================================
# SUPER ADMIN - SENIOR CITIZEN MANAGER CRUD
# ==================================================

class AdminSeniorCitizenManagerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def check_admin(self, request):
        return is_super_admin(request.user)

    def serialize_manager(self, profile):
        user = profile.user

        service_areas = [
            {
                "id": area.id,
                "state": area.state,
                "district": area.district,
                "is_active": area.is_active,
            }
            for area in profile.service_areas.all()
        ]

        return {
            "id": profile.id,
            "manager_id": profile.id,
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": (
                f"{user.first_name} {user.last_name}"
            ).strip(),
            "email": user.email,
            "phone_number": user.phone_number,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "service_areas": service_areas,
            "created_at": profile.created_at,
        }

    def get(self, request):
        if not self.check_admin(request):
            return Response(
                {"detail": "Super Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        managers = (
            SeniorCitizenManagerProfile.objects
            .select_related("user")
            .prefetch_related("service_areas")
            .filter(
                user__role=User.Role.SENIOR_CITIZEN_MANAGER
            )
            .order_by("-created_at")
        )

        return Response(
            [
                self.serialize_manager(manager)
                for manager in managers
            ],
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        if not self.check_admin(request):
            return Response(
                {"detail": "Super Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data

        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        phone_number = str(data.get("phone_number", "")).strip()
        password = data.get("password", "")
        password_confirm = data.get("password_confirm", "")
        state = str(data.get("state", "")).strip()
        district = str(data.get("district", "")).strip()

        if not all([
            first_name,
            last_name,
            email,
            password,
            password_confirm,
            state,
            district,
        ]):
            return Response(
                {"detail": "Please complete all required fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != password_confirm:
            return Response(
                {"password_confirm": ["Passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"email": ["An account with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response(
                {"password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_area = SeniorCitizenServiceArea.objects.filter(
            state__iexact=state,
            district__iexact=district,
        ).exists()

        if existing_area:
            return Response(
                {
                    "district": [
                        "This district is already assigned to a manager."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                role=User.Role.SENIOR_CITIZEN_MANAGER,
                is_active=True,
                is_verified=True,
            )

            profile = SeniorCitizenManagerProfile.objects.create(
                user=user
            )

            SeniorCitizenServiceArea.objects.create(
                manager=profile,
                state=state,
                district=district,
                is_active=True,
            )

        return Response(
            {
                "message": "Senior Citizen Manager created successfully.",
                "manager": self.serialize_manager(profile),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSeniorCitizenManagerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_manager(self, manager_id):
        return get_object_or_404(
            SeniorCitizenManagerProfile.objects
            .select_related("user")
            .prefetch_related("service_areas"),
            pk=manager_id,
            user__role=User.Role.SENIOR_CITIZEN_MANAGER,
        )

    def serialize_manager(self, profile):
        user = profile.user

        return {
            "id": profile.id,
            "manager_id": profile.id,
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": (
                f"{user.first_name} {user.last_name}"
            ).strip(),
            "email": user.email,
            "phone_number": user.phone_number,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "service_areas": [
                {
                    "id": area.id,
                    "state": area.state,
                    "district": area.district,
                    "is_active": area.is_active,
                }
                for area in profile.service_areas.all()
            ],
            "created_at": profile.created_at,
        }

    def put(self, request, manager_id):
        return self.update_manager(request, manager_id)

    def patch(self, request, manager_id):
        return self.update_manager(request, manager_id)

    def update_manager(self, request, manager_id):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "Super Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = self.get_manager(manager_id)
        user = profile.user
        data = request.data

        first_name = str(
            data.get("first_name", user.first_name)
        ).strip()

        last_name = str(
            data.get("last_name", user.last_name)
        ).strip()

        phone_number = str(
            data.get("phone_number", user.phone_number)
        ).strip()

        state = str(data.get("state", "")).strip()
        district = str(data.get("district", "")).strip()

        if not first_name or not last_name:
            return Response(
                {"detail": "First name and last name are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if state and district:
            duplicate = SeniorCitizenServiceArea.objects.filter(
                state__iexact=state,
                district__iexact=district,
            ).exclude(manager=profile).exists()

            if duplicate:
                return Response(
                    {"district": ["This district is already assigned."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            user.first_name = first_name
            user.last_name = last_name
            user.phone_number = phone_number

            if "is_active" in data:
                user.is_active = bool(data["is_active"])

            user.save()

            if state and district:
                area = profile.service_areas.first()

                if area:
                    area.state = state
                    area.district = district
                    area.is_active = True
                    area.save()
                else:
                    SeniorCitizenServiceArea.objects.create(
                        manager=profile,
                        state=state,
                        district=district,
                        is_active=True,
                    )

        return Response(
            {
                "message": "Manager updated successfully.",
                "manager": self.serialize_manager(profile),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, manager_id):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "Super Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = self.get_manager(manager_id)

        # Preserve historical requests and staff relationships.
        # Archive the manager instead of breaking protected records.
        profile.user.is_active = False
        profile.user.save(update_fields=["is_active"])

        profile.service_areas.update(is_active=False)

        return Response(
            {
                "message": (
                    "Manager deactivated successfully. "
                    "Historical records have been preserved."
                )
            },
            status=status.HTTP_200_OK,
        )
# ============================================================
# SUPER ADMIN — REGISTER SENIOR CITIZEN STAFF
# Existing staff CRUD views remain unchanged.
# ============================================================

class SuperAdminSeniorCitizenStaffCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        if not is_super_admin(user):
            return Response(
                {
                    "detail": "Only Super Admin can register staff."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        manager_id = request.data.get("manager_id")

        if not manager_id:
            return Response(
                {
                    "manager_id": "Please select a Senior Citizen Manager."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager_profile = get_object_or_404(
            SeniorCitizenManagerProfile.objects.select_related("user"),
            pk=manager_id,
            user__role=User.Role.SENIOR_CITIZEN_MANAGER,
            user__is_active=True,
        )

        # Reuse the existing registration serializer for validation.
        payload = request.data.copy()
        payload.pop("manager_id", None)

        serializer = SeniorCitizenStaffRegisterSerializer(
            data=payload,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        staff_data = serializer.validated_data.copy()

        password = staff_data.pop("password")
        staff_data.pop("password_confirm", None)

        first_name = staff_data.pop("first_name").strip()
        last_name = staff_data.pop("last_name").strip()
        email = staff_data.pop("email").strip().lower()

        phone_number = staff_data.pop("phone_number")
        state = staff_data.pop("state").strip()
        district = staff_data.pop("district").strip()
        designation = staff_data.pop("designation")
        location = staff_data.pop("address", "").strip()

        with transaction.atomic():

            staff_user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.SENIOR_CITIZEN_STAFF,
                is_verified=True,
                is_active=True,
            )

            staff_profile = SeniorCitizenStaffProfile.objects.create(
                user=staff_user,
                manager=manager_profile,
                phone_number=phone_number,
                state=state,
                district=district,
                designation=designation,
                location=location,
                is_active=True,
            )

        staff_profile = (
            SeniorCitizenStaffProfile.objects
            .select_related("user", "manager__user")
            .get(pk=staff_profile.pk)
        )

        response_serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(
            {
                "message": "Senior Citizen Staff registered successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
class SeniorCitizenStaffStatusView(APIView):
    """
    Activate or deactivate a Senior Citizen Staff account.
    Only Super Admin can perform this operation.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, staff_id):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "Only Super Admin can change staff status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        is_active = request.data.get("is_active")

        if not isinstance(is_active, bool):
            return Response(
                {"detail": "is_active must be true or false."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff_profile = get_object_or_404(
            SeniorCitizenStaffProfile.objects.select_related("user"),
            pk=staff_id,
        )

        with transaction.atomic():
            staff_profile.is_active = is_active
            staff_profile.save(update_fields=["is_active", "updated_at"])

            staff_user = staff_profile.user
            staff_user.is_active = is_active
            staff_user.save(update_fields=["is_active"])

        serializer = SeniorCitizenStaffProfileSerializer(
            staff_profile
        )

        return Response(
            {
                "message": (
                    "Staff activated successfully."
                    if is_active
                    else "Staff deactivated successfully."
                ),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )