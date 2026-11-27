
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase
from io import BytesIO

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from .serializers import SeniorCitizenImageSerializer
from accounts.models import User
from departments.models import Department
from notifications.models import Notification
from .models import (SeniorCitizenRequest,SeniorCitizenManagerProfile,SeniorCitizenStaffProfile,SeniorCitizenServiceArea)


class SeniorCitizenAPITests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="TestPass123!",
            role="citizen",
            is_verified=True,
        )

        self.other_citizen = User.objects.create_user(
            email="other@example.com",
            password="TestPass123!",
            role="citizen",
            is_verified=True,
        )

        self.manager = User.objects.create_user(
            email="manager@example.com",
            password="TestPass123!",
            role="senior_citizen_manager",
            is_verified=True,
        )

        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="TestPass123!",
            role="senior_citizen_staff",
            is_verified=True,
        )

        self.department = Department.objects.create(
            name="Social Welfare",
            code="SOCIAL",
            description="Senior citizen assistance",
            manager=self.manager,
            is_active=True,
        )

        self.manager_profile = SeniorCitizenManagerProfile.objects.create(
            user=self.manager,
        )
        SeniorCitizenServiceArea.objects.create(
            manager=self.manager_profile,
            state="Kerala",
            district="Kottayam",
            is_active=True,
        )
        SeniorCitizenStaffProfile.objects.create(
            user=self.staff,
            manager=self.manager_profile,
            phone_number="9876543210",
            location="Kottayam, Kerala",
            is_active=True,
        )

        self.list_url = reverse("senior-citizen-list-create")

        self.request_data = {
            "department": self.department.id,
            "full_name": "Test Senior Citizen",
            "age": 70,
            "phone_number": "9876543210",
            "address": "Kottayam, Kerala",
            "assistance_type": "medical",
            "description": "Needs medical assistance.",
            "state": "Kerala",
            "district": "Kottayam",
            "pickup_location": "Kottayam Bus Stand",
            "destination": "Caritas Hospital, Kottayam",
        }

    def create_request(self, citizen=None, assign_manager=False):
        assistance_request = SeniorCitizenRequest.objects.create(
            citizen=citizen or self.citizen,
            department=self.department,
            full_name="Test Senior Citizen",
            age=70,
            phone_number="9876543210",
            address="Kottayam, Kerala",
            assistance_type="medical",
            description="Needs medical assistance.",
            state="Kerala",
            district="Kottayam",
            pickup_location="Kottayam Bus Stand",
            destination="Caritas Hospital, Kottayam",
        )

        if assign_manager:
            assistance_request.assigned_manager = self.manager_profile
            assistance_request.save(update_fields=["assigned_manager"])

        return assistance_request

    def test_citizen_can_submit_request(self):
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            self.list_url,
            self.request_data,
            format="json",
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            SeniorCitizenRequest.objects.count(),
            1,
        )
        self.assertEqual(
            SeniorCitizenRequest.objects.get().citizen,
            self.citizen,
        )

    def test_request_rejects_age_below_60(self):
        self.client.force_authenticate(user=self.citizen)

        data = {
            **self.request_data,
            "age": 59,
        }

        response = self.client.post(
            self.list_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            SeniorCitizenRequest.objects.count(),
            0,
        )

    def test_citizen_only_sees_own_requests(self):
        own_request = self.create_request(self.citizen)
        self.create_request(self.other_citizen)

        self.client.force_authenticate(user=self.citizen)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], own_request.id)

    def test_citizen_cannot_view_another_citizens_request(self):
        other_request = self.create_request(self.other_citizen)

        self.client.force_authenticate(user=self.citizen)

        response = self.client.get(
            reverse(
                "senior-citizen-detail",
                kwargs={"pk": other_request.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_staff_only_sees_assigned_requests(self):
        assigned_request = self.create_request()
        assigned_request.assigned_staff = self.staff
        assigned_request.status = SeniorCitizenRequest.Status.ASSIGNED
        assigned_request.save()

        self.create_request(self.other_citizen)

        self.client.force_authenticate(user=self.staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            assigned_request.id,
        )

    def test_senior_citizen_manager_can_access_request_list(self):
        self.create_request()

        another_manager = User.objects.create_user(
            email="another-manager@example.com",
            password="TestPass123!",
            role="senior_citizen_manager",
            is_verified=True,
        )
        SeniorCitizenManagerProfile.objects.create(user=another_manager)

        self.client.force_authenticate(user=another_manager)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_citizen_cannot_assign_staff_or_change_status(self):
        assistance_request = self.create_request()

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "assign", "staff_id": self.staff.id},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        assistance_request.refresh_from_db()
        self.assertIsNone(assistance_request.assigned_staff_id)
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.SUBMITTED,
        )

    def test_staff_cannot_assign_request_to_themselves(self):
        assistance_request = self.create_request()

        self.client.force_authenticate(user=self.staff)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "assign", "staff_id": self.staff.id},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        assistance_request.refresh_from_db()
        self.assertIsNone(assistance_request.assigned_staff_id)

    def test_submission_notifies_senior_citizen_manager(self):
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            self.list_url,
            self.request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report__isnull=True,
                message__contains="Senior Citizen Assistance request",
            ).exists()
        )

    def test_inactive_department_does_not_block_independent_assistance_request(self):
        self.department.is_active = False
        self.department.save()

        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            self.list_url,
            self.request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SeniorCitizenRequest.objects.count(), 1)
    
    def test_participant_can_send_message(self):
        assistance_request = self.create_request()
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "senior-citizen-messages",
                kwargs={"request_id": assistance_request.id},
            ),
            {"content": "I need help with my appointment."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["content"],
            "I need help with my appointment.",
        )
        self.assertEqual(response.data["sender"], self.citizen.id)

    def test_unrelated_citizen_cannot_access_messages(self):
        assistance_request = self.create_request()
        self.client.force_authenticate(user=self.other_citizen)

        response = self.client.get(
            reverse(
                "senior-citizen-messages",
                kwargs={"request_id": assistance_request.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_message_notifies_other_participants(self):
        assistance_request = self.create_request(assign_manager=True)
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "senior-citizen-messages",
                kwargs={"request_id": assistance_request.id},
            ),
            {"content": "Please contact me."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.staff,
                report__isnull=True,
                message__contains="New message on Senior Citizen Assistance",
            ).exists()
            is False
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.manager,
                report__isnull=True,
                message__contains="New message on Senior Citizen Assistance",
            ).exists()
        )

    def test_sender_cannot_mark_own_message_as_read(self):
        from .models import SeniorCitizenMessage

        assistance_request = self.create_request()
        message = SeniorCitizenMessage.objects.create(
            request=assistance_request,
            sender=self.citizen,
            content="Hello",
        )
        self.client.force_authenticate(user=self.citizen)

        response = self.client.post(
            reverse(
                "senior-citizen-message-read",
                kwargs={"message_id": message.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    
    def make_test_image(self):
        buffer = BytesIO()
        Image.new("RGB", (10, 10), color="red").save(
            buffer,
            format="PNG",
        )
        return SimpleUploadedFile(
            "test.png",
            buffer.getvalue(),
            content_type="image/png",
        )

    def test_valid_image_passes_validation(self):
        image = self.make_test_image()

        serializer = SeniorCitizenImageSerializer(
            data={"image": image}
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )

    def test_corrupted_image_is_rejected(self):
        image = SimpleUploadedFile(
            "fake.png",
            b"this is not a real image",
            content_type="image/png",
        )

        serializer = SeniorCitizenImageSerializer(
            data={"image": image}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("image", serializer.errors)

    def test_oversized_image_is_rejected(self):
        image = SimpleUploadedFile(
            "large.png",
            b"x" * (5 * 1024 * 1024 + 1),
            content_type="image/png",
        )

        serializer = SeniorCitizenImageSerializer(
            data={"image": image}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("image", serializer.errors)

    def test_unrelated_citizen_cannot_upload_image(self):
        assistance_request = self.create_request()
        self.client.force_authenticate(user=self.other_citizen)

        response = self.client.post(
            reverse(
                "senior-citizen-image-upload",
                kwargs={"request_id": assistance_request.id},
            ),
            {"image": self.make_test_image()},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    
    def test_manager_can_review_submitted_request(self):
        assistance_request = self.create_request(assign_manager=True)
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "review"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.UNDER_REVIEW,
        )

    def test_manager_can_approve_request_under_review(self):
        assistance_request = self.create_request(assign_manager=True)
        assistance_request.status = (
            SeniorCitizenRequest.Status.UNDER_REVIEW
        )
        assistance_request.save(update_fields=["status"])

        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "approve"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.APPROVED,
        )

    def test_manager_cannot_approve_submitted_request_directly(self):
        assistance_request = self.create_request(assign_manager=True)
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "approve"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.SUBMITTED,
        )

    def test_manager_can_reject_submitted_request(self):
        assistance_request = self.create_request(assign_manager=True)
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "reject"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.REJECTED,
        )

    def test_manager_can_assign_approved_request_to_senior_citizen_staff(self):
        assistance_request = self.create_request(assign_manager=True)
        assistance_request.status = SeniorCitizenRequest.Status.APPROVED
        assistance_request.save(update_fields=["status"])

        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {
                "action": "assign",
                "staff_id": self.staff.id,
                "deadline": (timezone.now() + timedelta(days=2)).isoformat(),
                "estimated_arrival": (timezone.now() + timedelta(hours=2)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.assigned_staff_id,
            self.staff.id,
        )
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.ASSIGNED,
        )

    def test_assigned_staff_can_start_request(self):
        assistance_request = self.create_request()
        assistance_request.assigned_staff = self.staff
        assistance_request.status = SeniorCitizenRequest.Status.ASSIGNED
        assistance_request.save(
            update_fields=["assigned_staff", "status"]
        )

        self.client.force_authenticate(user=self.staff)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "start"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.IN_PROGRESS,
        )

    def test_assigned_staff_can_complete_in_progress_request(self):
        assistance_request = self.create_request()
        assistance_request.assigned_staff = self.staff
        assistance_request.status = SeniorCitizenRequest.Status.IN_PROGRESS
        assistance_request.save(
            update_fields=["assigned_staff", "status"]
        )

        self.client.force_authenticate(user=self.staff)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "complete"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.COMPLETED,
        )

    def test_manager_can_close_completed_request(self):
        assistance_request = self.create_request(assign_manager=True)
        assistance_request.status = SeniorCitizenRequest.Status.COMPLETED
        assistance_request.verified_by = self.citizen
        assistance_request.verified_at = timezone.now()
        assistance_request.save(
            update_fields=["status", "verified_by", "verified_at"]
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "close"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.CLOSED,
        )

    def test_rejected_request_cannot_be_started(self):
        assistance_request = self.create_request()
        assistance_request.assigned_staff = self.staff
        assistance_request.status = SeniorCitizenRequest.Status.REJECTED
        assistance_request.save(
            update_fields=["assigned_staff", "status"]
        )

        self.client.force_authenticate(user=self.staff)

        response = self.client.post(
            reverse(
                "senior-citizen-action",
                kwargs={"pk": assistance_request.id},
            ),
            {"action": "start"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        assistance_request.refresh_from_db()
        self.assertEqual(
            assistance_request.status,
            SeniorCitizenRequest.Status.REJECTED,
        )
