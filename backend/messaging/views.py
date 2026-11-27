from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from reports.models import Report
from .models import Message, InternalMessage
from .serializers import MessageSerializer, InternalMessageSerializer


User = get_user_model()


class IsCivicFixMessagingUser(BasePermission):
    """
    Allow authenticated accounts to use the common internal messaging API.

    Message access is still restricted by each view:
    - inbox: messages addressed to the logged-in user
    - sent: messages sent by the logged-in user
    - detail: only the sender or recipient can view a message
    - read/reply: only the recipient can mark a message read or reply

    This avoids blocking valid dashboard accounts because their role label
    differs from the small list of role strings previously hard-coded here.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )


# Existing report-conversation access rules are intentionally unchanged.
def can_access_conversation(user, report):
    return (
        user.is_authenticated
        and (
            report.citizen_id == user.id
            or report.assigned_staff_id == user.id
            or report.department.manager_id == user.id
            or getattr(user, "role", None) == "super_admin"
            or user.is_superuser
        )
    )


class ReportMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_report(self, report_id, user):
        report = get_object_or_404(
            Report.objects.select_related("department"),
            id=report_id,
        )

        if not can_access_conversation(user, report):
            return None

        return report

    def get(self, request, report_id):
        report = self.get_report(report_id, request.user)

        if report is None:
            return Response(
                {"detail": "You cannot access this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        messages = Message.objects.filter(
            report=report
        ).select_related("sender")

        return Response(MessageSerializer(messages, many=True).data)

    def post(self, request, report_id):
        report = self.get_report(report_id, request.user)

        if report is None:
            return Response(
                {"detail": "You cannot access this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.save(
            report=report,
            sender=request.user,
        )

        recipient_ids = set()

        if report.citizen_id != request.user.id:
            recipient_ids.add(report.citizen_id)

        if (
            report.assigned_staff_id
            and report.assigned_staff_id != request.user.id
        ):
            recipient_ids.add(report.assigned_staff_id)

        if (
            report.department.manager_id
            and report.department.manager_id != request.user.id
        ):
            recipient_ids.add(report.department.manager_id)

        Notification.objects.bulk_create([
            Notification(
                recipient_id=recipient_id,
                report=report,
                message=f"New message on complaint #{report.id}.",
            )
            for recipient_id in recipient_ids
        ])

        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class MessageMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(
            Message.objects.select_related(
                "report__department", "sender"
            ),
            id=message_id,
        )

        if not can_access_conversation(request.user, message.report):
            return Response(
                {"detail": "You cannot access this message."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.sender_id == request.user.id:
            return Response(
                {"detail": "You cannot mark your own message as read."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not message.is_read:
            message.is_read = True
            message.read_at = timezone.now()
            message.save(update_fields=["is_read", "read_at"])

        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_200_OK,
        )


class InternalMessageSendView(APIView):
    """Send a direct in-app message to a registered CivicFix account."""
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def post(self, request):
        recipient_email = request.data.get("recipient_email", "")
        subject = request.data.get("subject", "")
        content = request.data.get("content", "")

        if not isinstance(recipient_email, str) or not recipient_email.strip():
            return Response(
                {"recipient_email": "A registered recipient email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient = User.objects.filter(
            email__iexact=recipient_email.strip(),
            is_active=True,
        ).first()

        if recipient is None:
            return Response(
                {"recipient_email": "No active CivicFix account was found for this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if recipient.pk == request.user.pk:
            return Response(
                {"recipient_email": "You cannot send a message to yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InternalMessageSerializer(data={
            "subject": subject,
            "content": content,
        })
        serializer.is_valid(raise_exception=True)

        message = InternalMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            subject=serializer.validated_data["subject"],
            content=serializer.validated_data["content"],
        )

        Notification.objects.create(
            recipient=recipient,
            report=None,
            message=(
                f"New internal message from {request.user.email}: "
                f"{message.subject}"
            ),
        )

        return Response(
            InternalMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class InternalMessageInboxView(APIView):
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def get(self, request):
        messages = InternalMessage.objects.filter(
            recipient=request.user
        ).select_related("sender", "recipient")
        return Response(InternalMessageSerializer(messages, many=True).data)


class InternalMessageSentView(APIView):
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def get(self, request):
        messages = InternalMessage.objects.filter(
            sender=request.user
        ).select_related("sender", "recipient")
        return Response(InternalMessageSerializer(messages, many=True).data)


class InternalMessageDetailView(APIView):
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def get(self, request, message_id):
        message = get_object_or_404(
            InternalMessage.objects.select_related(
                "sender", "recipient", "parent_message"
            ),
            id=message_id,
        )

        if request.user.pk not in (message.sender_id, message.recipient_id):
            return Response(
                {"detail": "You cannot access this message."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(InternalMessageSerializer(message).data)


class InternalMessageMarkReadView(APIView):
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def post(self, request, message_id):
        message = get_object_or_404(
            InternalMessage.objects.select_related("sender", "recipient"),
            id=message_id,
            recipient=request.user,
        )

        if not message.is_read:
            message.is_read = True
            message.read_at = timezone.now()
            message.save(update_fields=["is_read", "read_at"])

        return Response(
            InternalMessageSerializer(message).data,
            status=status.HTTP_200_OK,
        )


class InternalMessageReplyView(APIView):
    permission_classes = [IsAuthenticated, IsCivicFixMessagingUser]

    def post(self, request, message_id):
        original = get_object_or_404(
            InternalMessage.objects.select_related("sender", "recipient"),
            id=message_id,
            recipient=request.user,
        )

        content = request.data.get("content", "")
        if not isinstance(content, str) or not content.strip():
            return Response(
                {"content": "Message content cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(content.strip()) > 5000:
            return Response(
                {"content": "Message cannot exceed 5000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = original.subject
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        reply = InternalMessage.objects.create(
            sender=request.user,
            recipient=original.sender,
            subject=subject[:200],
            content=content.strip(),
            parent_message=original,
        )

        Notification.objects.create(
            recipient=original.sender,
            report=None,
            message=(
                f"New reply from {request.user.email}: {reply.subject}"
            ),
        )

        return Response(
            InternalMessageSerializer(reply).data,
            status=status.HTTP_201_CREATED,
        )
