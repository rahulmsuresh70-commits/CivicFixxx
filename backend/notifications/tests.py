
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from departments.models import Department
from notifications.models import Notification
from reports.models import Report


class NotificationAPITests(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen-test@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )
        self.other_user = User.objects.create_user(
            email="other-test@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.citizen)

        self.notification = Notification.objects.create(
            recipient=self.citizen,
            message="Test notification",
        )

    def test_user_sees_only_own_notifications(self):
        Notification.objects.create(
            recipient=self.other_user,
            message="Other user's notification",
        )

        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            self.notification.id,
        )

    def test_owner_can_mark_notification_as_read(self):
        response = self.client.post(
            f"/api/notifications/{self.notification.id}/read/"
        )

        self.assertEqual(response.status_code, 200)

        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_other_user_cannot_mark_notification_as_read(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            f"/api/notifications/{self.notification.id}/read/"
        )

        self.assertEqual(response.status_code, 404)

        self.notification.refresh_from_db()
        self.assertFalse(self.notification.is_read)


class OverdueReportNotificationTests(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="sla-citizen@example.com",
            password="TestPassword123!",
            role=User.Role.CITIZEN,
            is_verified=True,
        )
        self.manager = User.objects.create_user(
            email="sla-manager@example.com",
            password="TestPassword123!",
            role=User.Role.MANAGER,
            is_verified=True,
        )

        self.department = Department.objects.create(
            name="SLA Test Department",
            manager=self.manager,
        )

    def create_report(self, **overrides):
        data = {
            "citizen": self.citizen,
            "department": self.department,
            "title": "SLA test report",
            "description": "Automated SLA test",
            "category": "Test",
            "status": Report.Status.ASSIGNED,
            "deadline": timezone.now() - timedelta(hours=1),
        }
        data.update(overrides)
        return Report.objects.create(**data)

    def test_overdue_report_notifies_manager(self):
        report = self.create_report()

        call_command("check_overdue_reports")

        self.assertEqual(
            Notification.objects.filter(
                recipient=self.manager,
                report=report,
                message__startswith=f"SLA overdue: Report #{report.id} ",
            ).count(),
            1,
        )

    def test_repeated_check_does_not_duplicate_notification(self):
        report = self.create_report()

        call_command("check_overdue_reports")
        call_command("check_overdue_reports")

        self.assertEqual(
            Notification.objects.filter(
                recipient=self.manager,
                report=report,
                message__startswith=f"SLA overdue: Report #{report.id} ",
            ).count(),
            1,
        )

    def test_future_deadline_does_not_notify_manager(self):
        report = self.create_report(
            deadline=timezone.now() + timedelta(days=1),
        )

        call_command("check_overdue_reports")

        self.assertFalse(
            Notification.objects.filter(report=report).exists()
        )

    def test_closed_report_does_not_notify_manager(self):
        report = self.create_report(status=Report.Status.CLOSED)

        call_command("check_overdue_reports")

        self.assertFalse(
            Notification.objects.filter(report=report).exists()
        )
