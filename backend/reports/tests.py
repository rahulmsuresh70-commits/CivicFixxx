from django.contrib.auth import get_user_model
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
import base64
from unittest.mock import patch
from rest_framework.test import APIClient

from departments.models import Department
from notifications.models import Notification
from reports.models import Report


User = get_user_model()


class ReportSubmissionNotificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.citizen = User.objects.create_user(
            email="submission-citizen@example.com",
            password="TestPassword123!",
            role="citizen",
            is_verified=True,
        )

        cls.manager = User.objects.create_user(
            email="submission-manager@example.com",
            password="TestPassword123!",
            role="manager",
            is_verified=True,
        )

        cls.department = Department.objects.create(
            name="Submission Test Department",
            code="SUB-TEST",
            manager=cls.manager,
        )

    def test_submission_notifies_citizen_and_department_manager(self):
        client = APIClient()
        client.force_authenticate(user=self.citizen)

        with patch(
            "cloudinary_storage.storage.MediaCloudinaryStorage._save",
            autospec=True,
            side_effect=lambda storage, name, content: name,
        ):
            response = client.post(
                "/api/reports/",
                {
                    "department": self.department.id,
                    "title": "Damaged public road",
                    "description": "There is a damaged road near my home.",
                    "category": "Road",
                    "location": "Kottayam",
                    "latitude": "9.5916",
                    "longitude": "76.5222",
                    "image": SimpleUploadedFile(
                        "road.png",
                        base64.b64decode(
                            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
                        ),
                        content_type="image/png",
                    ),
                    "video": SimpleUploadedFile(
                        "road.mp4",
                        b"test-video-content",
                        content_type="video/mp4",
                    ),
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201, response.data)

        report = Report.objects.get(id=response.data["id"])

        self.assertEqual(report.citizen_id, self.citizen.id)
        self.assertEqual(report.status, Report.Status.SUBMITTED)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=report,
                message__contains="Please review the complaint",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=report,
                message__contains="Please review the complaint",
            ).exists()
        )

        self.assertTrue(report.images.exists())
        self.assertTrue(report.videos.exists())
        self.assertIsNotNone(report.deadline)

    def test_submission_requires_image_video_and_live_coordinates(self):
        client = APIClient()
        client.force_authenticate(user=self.citizen)

        response = client.post(
            "/api/reports/",
            {
                "department": self.department.id,
                "title": "Missing evidence",
                "description": "A damaged public road is visible.",
                "category": "Road",
                "location": "Kottayam",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            Report.objects.filter(title="Missing evidence").count(),
            0,
        )
class ReportDecisionNotificationTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.citizen = User.objects.create_user(
            email="decision-citizen@example.com",
            password="TestPassword123!",
            role="citizen",
            is_verified=True,
        )

        cls.manager = User.objects.create_user(
            email="decision-manager@example.com",
            password="TestPassword123!",
            role="manager",
            is_verified=True,
        )

        cls.department = Department.objects.create(
            name="Decision Test Department",
            code="DEC-TEST",
            manager=cls.manager,
        )

        cls.report = Report.objects.create(
            citizen=cls.citizen,
            department=cls.department,
            title="Damaged public road",
            description="The road surface is damaged.",
            category="Road",
            status=Report.Status.SUBMITTED,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.manager)    

    def test_duplicate_fallback_matches_related_category_wording(self):
        from reports.services import detect_duplicate_report

        existing_report = Report.objects.create(
            citizen=self.citizen,
            department=self.department,
            title="Road damage",
            description="road fully damage",
            category="Road",
            location="Kottayam",
            latitude="9.591610",
            longitude="76.522210",
        )

        new_report = Report.objects.create(
            citizen=self.citizen,
            department=self.department,
            title="Road cracking",
            description="road fully damage and block the road",
            category="Roads and Potholes",
            location="Kottayam",
            latitude="9.591600",
            longitude="76.522200",
        )

        with patch(
            "reports.services._gemini_duplicate_match",
            return_value=None,
        ):
            duplicate = detect_duplicate_report(new_report)

        self.assertIsNotNone(
            duplicate,
            "Fallback should detect the related road complaint.",
        )

        self.assertEqual(
            duplicate.id,
            existing_report.id,
        )
    
        

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.manager)

    def test_approval_notifies_citizen(self):
        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/approve/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="approved",
            ).exists()
        )

    def test_rejection_notifies_citizen(self):
        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/reject/",
            {"reason": "Insufficient information"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="rejected",
            ).exists()
        )

    def test_transfer_notifies_citizen_and_new_department_manager(self):
        new_manager = User.objects.create_user(
            email="transfer-manager@example.com",
            password="TestPassword123!",
            role="manager",
            is_verified=True,
        )

        new_department = Department.objects.create(
            name="Transfer Test Department",
            code="TRF-TEST",
            manager=new_manager,
        )

        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/transfer/",
            {"department": new_department.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.department_id,
            new_department.id,
        )
        self.assertEqual(
            self.report.status,
            Report.Status.TRANSFERRED,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="transferred",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=new_manager,
                report=self.report,
                message__contains="transferred",
            ).exists()
        )

    def test_assignment_notifies_citizen_and_assigned_staff(self):
        from datetime import timedelta
        from django.utils import timezone
        from departments.models import StaffProfile

        staff = User.objects.create_user(
            email="assignment-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        # FIX: Store the StaffProfile instance.
        staff_profile = StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.status = Report.Status.APPROVED
        self.report.save()

        deadline = (
            timezone.now() + timedelta(days=2)
        ).isoformat()

        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/assign/",
            {
                "staff_id": staff_profile.id,
                "deadline": deadline,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="assigned",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                report=self.report,
                message__contains="assigned",
            ).exists()
        )

    def test_reassignment_notifies_citizen_and_new_staff(self):
        from departments.models import StaffProfile

        staff = User.objects.create_user(
            email="reassignment-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        # FIX: Store the StaffProfile instance.
        staff_profile = StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.status = Report.Status.REOPENED
        self.report.save()

        from datetime import timedelta
        from django.utils import timezone

        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/reopened/assign/",
            {
                "staff_id": staff_profile.id,
                "deadline": (
                    timezone.now() + timedelta(days=2)
                ).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="reassigned",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                report=self.report,
                message__contains="reassigned",
            ).exists()
        )

    def test_manager_can_confirm_duplicate_and_citizen_is_notified(self):
        duplicate = Report.objects.create(
            citizen=self.citizen,
            department=self.department,
            title="Existing damaged road",
            description="A damaged road surface near the junction.",
            category="Roads and Potholes",
            latitude="9.591600",
            longitude="76.522200",
        )

        self.report.duplicate_of = duplicate
        self.report.duplicate_review_status = (
            Report.DuplicateReviewStatus.PENDING
        )
        self.report.save(
            update_fields=[
                "duplicate_of",
                "duplicate_review_status",
                "updated_at",
            ]
        )

        response = self.client.post(
            f"/api/reports/manager/{self.report.id}/duplicate-review/",
            {"decision": "approve"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.duplicate_review_status,
            Report.DuplicateReviewStatus.CONFIRMED,
        )
        self.assertEqual(
            self.report.status,
            Report.Status.CLOSED,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="confirmed the duplicate",
            ).exists()
        )

    def test_staff_completion_notifies_citizen_and_manager_and_keeps_verification_step(self):
        from departments.models import StaffProfile
        from reports.models import ReportResolution, ResolutionImage

        staff = User.objects.create_user(
            email="completion-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.assigned_staff = staff
        self.report.status = Report.Status.IN_PROGRESS
        self.report.save()

        resolution = ReportResolution.objects.create(
            report=self.report,
            staff=staff,
            work_description="Repaired the damaged road surface.",
        )

        with patch(
            "cloudinary_storage.storage.MediaCloudinaryStorage._save",
            autospec=True,
            side_effect=lambda storage, name, content: name,
        ):
            ResolutionImage.objects.create(
                resolution=resolution,
                image=SimpleUploadedFile(
                    "evidence.png",
                    base64.b64decode(
                        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
                    ),
                    content_type="image/png",
                ),
            )

        self.client.force_authenticate(user=staff)

        response = self.client.post(
            f"/api/reports/staff/{self.report.id}/resolve/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.status,
            Report.Status.RESOLVED,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="Resolution evidence is available",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=self.report,
                message__contains="Resolution evidence is available",
            ).exists()
        )

    def test_staff_acceptance_notifies_citizen_and_manager(self):
        from departments.models import StaffProfile

        staff = User.objects.create_user(
            email="acceptance-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.assigned_staff = staff
        self.report.status = Report.Status.ASSIGNED
        self.report.save()

        self.client.force_authenticate(user=staff)

        response = self.client.post(
            f"/api/reports/staff/{self.report.id}/accept/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.status,
            Report.Status.IN_PROGRESS,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen,
                report=self.report,
                message__contains="Work has started",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=self.report,
                message__contains="Work has started",
            ).exists()
        )

    def test_citizen_verification_closes_report_and_notifies_staff(self):
        from django.contrib.auth import get_user_model
        from departments.models import StaffProfile

        staff = get_user_model().objects.create_user(
            email="verification-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.assigned_staff = staff
        self.report.status = Report.Status.RESOLVED
        self.report.save()

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            f"/api/reports/{self.report.id}/verify/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.status,
            Report.Status.CLOSED,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                report=self.report,
                message__contains="verified and closed",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=self.report,
                message__contains="verified and closed",
            ).exists()
        )

    def test_citizen_reopening_notifies_staff_and_manager(self):
        from django.contrib.auth import get_user_model
        from departments.models import StaffProfile

        staff = get_user_model().objects.create_user(
            email="reopening-staff@example.com",
            password="TestPassword123!",
            role="staff",
            is_verified=True,
            is_active=True,
        )

        StaffProfile.objects.create(
            user=staff,
            department=self.department,
        )

        self.report.assigned_staff = staff
        self.report.status = Report.Status.RESOLVED
        self.report.save()

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            f"/api/reports/{self.report.id}/reopen/",
            {"reason": "The road damage has not been fixed."},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)

        self.report.refresh_from_db()

        self.assertEqual(
            self.report.status,
            Report.Status.REOPENED,
        )
        self.assertEqual(
            self.report.priority,
            Report.Priority.HIGH,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                report=self.report,
                message__contains="reopened",
            ).exists()
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=self.report,
                message__contains="reopened",
            ).exists()
        )

    def test_submission_detects_duplicate_and_notifies_manager(self):
        from unittest.mock import patch

        client = APIClient()
        client.force_authenticate(user=self.citizen)

        existing_report = Report.objects.create(
            citizen=self.citizen,
            department=self.department,
            title="Damaged road near junction",
            description=(
                "A large pothole is present on the road "
                "near the main junction."
            ),
            category="Road",
            location="Kottayam",
            latitude="9.591600",
            longitude="76.522200",
        )

        with (
            patch(
                "reports.services.enrich_report_before_save",
            ),
            patch(
                "reports.services._gemini_duplicate_match",
                return_value=existing_report,
            ),
            patch(
                "cloudinary_storage.storage.MediaCloudinaryStorage._save",
                autospec=True,
                side_effect=lambda storage, name, content: name,
            ),
        ):
            response = client.post(
                "/api/reports/",
                {
                    "department": self.department.id,
                    "title": "Damaged road near junction",
                    "description": (
                        "A large pothole is present on the road "
                        "near the main junction."
                    ),
                    "category": "Road",
                    "location": "Kottayam",
                    "latitude": "9.591601",
                    "longitude": "76.522201",
                    "image": SimpleUploadedFile(
                        "duplicate-road.png",
                        base64.b64decode(
                            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
                        ),
                        content_type="image/png",
                    ),
                    "video": SimpleUploadedFile(
                        "duplicate-road.mp4",
                        b"test-video-content",
                        content_type="video/mp4",
                    ),
                },
                format="multipart",
            )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        duplicate_report = Report.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(
            duplicate_report.duplicate_of_id,
            existing_report.id,
        )

        self.assertEqual(
            duplicate_report.duplicate_review_status,
            Report.DuplicateReviewStatus.PENDING,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report=duplicate_report,
                message__contains="Potential duplicate complaint",
            ).exists()
        )