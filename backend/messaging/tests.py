
from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from reports.models import Report
from .models import Message


User = get_user_model()


class MessagingAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.citizen = User.objects.create_user(
            email="msg_citizen_test@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )

        cls.other_user = User.objects.create_user(
            email="msg_other_test@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )

        cls.staff = User.objects.create_user(
            email="msg_staff_test@example.com",
            password="TestPassword123!",
            role=User.Role.STAFF,
            is_verified=True,
        )

        cls.department = Department.objects.create(
            name="Messaging Test Department",
            code="MSG-TEST",
        )

        cls.report = Report.objects.create(
            citizen=cls.citizen,
            department=cls.department,
            title="Messaging test report",
            description="Testing complaint messaging.",
            category="Other",
        )

        cls.report.assigned_staff = cls.staff
        cls.report.save(update_fields=["assigned_staff"])

    def test_citizen_can_send_message(self):
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "report-messages",
                kwargs={"report_id": self.report.id},
            ),
            {"content": "Test message"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(Message.objects.count(), 1)

        message = Message.objects.get()
        self.assertEqual(message.sender_id, self.citizen.id)
        self.assertEqual(message.report_id, self.report.id)

    def test_citizen_can_retrieve_conversation(self):
        Message.objects.create(
            report=self.report,
            sender=self.staff,
            content="Existing message",
        )

        self.client.force_authenticate(user=self.citizen)

        response = self.client.get(
            reverse(
                "report-messages",
                kwargs={"report_id": self.report.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(response.data), 1)

    def test_unrelated_user_cannot_access_conversation(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(
            reverse(
                "report-messages",
                kwargs={"report_id": self.report.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_citizen_can_mark_staff_message_read(self):
        message = Message.objects.create(
            report=self.report,
            sender=self.staff,
            content="Please provide more details.",
        )

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "message-mark-read",
                kwargs={"message_id": message.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        message.refresh_from_db()
        self.assertTrue(message.is_read)
        self.assertIsNotNone(message.read_at)
    
    def test_sending_message_creates_recipient_notification(self):
        from notifications.models import Notification

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "report-messages",
                kwargs={"report_id": self.report.id},
            ),
            {"content": "Please provide an update."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.staff,
                report=self.report,
                message=f"New message on complaint #{self.report.id}.",
            ).exists()
        )


class InternalMessagingAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.citizen = User.objects.create_user(
            email="internal_citizen@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )
        cls.staff = User.objects.create_user(
            email="internal_staff@example.com",
            password="TestPassword123!",
            role=User.Role.STAFF,
            is_verified=True,
        )
        cls.other = User.objects.create_user(
            email="internal_other@example.com",
            password="TestPassword123!",
            role=User.Role.MANAGER,
            is_verified=True,
        )

    def test_send_message_to_registered_email_and_create_notification(self):
        from notifications.models import Notification
        from .models import InternalMessage

        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(
            reverse("internal-message-send"),
            {
                "recipient_email": self.staff.email,
                "subject": "Schedule update",
                "content": "Please review the new schedule.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InternalMessage.objects.count(), 1)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.staff,
                report__isnull=True,
                message__contains="Schedule update",
            ).exists()
        )

    def test_unknown_email_is_rejected(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(
            reverse("internal-message-send"),
            {
                "recipient_email": "not-registered@example.com",
                "subject": "Hello",
                "content": "Message body",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inbox_and_sent_are_private_to_current_user(self):
        from .models import InternalMessage

        message = InternalMessage.objects.create(
            sender=self.citizen,
            recipient=self.staff,
            subject="Private",
            content="Private content",
        )

        self.client.force_authenticate(user=self.staff)
        inbox = self.client.get(reverse("internal-message-inbox"))
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in inbox.data], [message.id])

        sent = self.client.get(reverse("internal-message-sent"))
        self.assertEqual(sent.status_code, status.HTTP_200_OK)
        self.assertEqual(sent.data, [])

    def test_only_recipient_can_mark_message_read_and_reply(self):
        from .models import InternalMessage

        message = InternalMessage.objects.create(
            sender=self.citizen,
            recipient=self.staff,
            subject="Question",
            content="Can you confirm?",
        )

        self.client.force_authenticate(user=self.other)
        forbidden_read = self.client.post(
            reverse("internal-message-read", kwargs={"message_id": message.id})
        )
        self.assertEqual(forbidden_read.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.staff)
        reply = self.client.post(
            reverse("internal-message-reply", kwargs={"message_id": message.id}),
            {"content": "Confirmed."},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reply.data["recipient"], self.citizen.id)
        self.assertTrue(InternalMessage.objects.filter(parent_message=message).exists())
