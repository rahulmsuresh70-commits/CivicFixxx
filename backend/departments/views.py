from accounts.models import User

from django.db import transaction

from reports.models import Report
from reports.serializers import ReportSerializer

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Department, StaffProfile
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError

from .serializers import AdminStaffSerializer
from .permissions import IsSuperAdmin, IsDepartmentManager

from .serializers import (
    DepartmentSerializer,
    StaffProfileSerializer,
    DepartmentManagerStaffCreateSerializer,
    DepartmentManagerStaffUpdateSerializer,
    DepartmentManagerProfileUpdateSerializer,
    DepartmentManagerChangePasswordSerializer,
)


class DepartmentListCreateView(generics.ListCreateAPIView):

    queryset = Department.objects.all()

    serializer_class = DepartmentSerializer

    permission_classes = [IsSuperAdmin]


class ActiveDepartmentListView(generics.ListAPIView):

    serializer_class = DepartmentSerializer

    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):

        return Department.objects.filter(
            is_active=True
        ).order_by("name")


class DepartmentDetailView(generics.RetrieveUpdateAPIView):

    queryset = Department.objects.all()

    serializer_class = DepartmentSerializer

    permission_classes = [IsSuperAdmin]


class MyDepartmentStaffView(APIView):

    permission_classes = [IsDepartmentManager]

    def get_department(self, request):

        try:
            return request.user.managed_department

        except Department.DoesNotExist:
            return None

    def get(self, request):

        department = self.get_department(request)

        if department is None:

            return Response(
                {
                    "error": "You are not assigned as the manager of any department."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = (
            StaffProfile.objects
            .filter(department=department)
            .select_related("user")
        )

        return Response(
            StaffProfileSerializer(
                staff,
                many=True
            ).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def post(self, request):

        department = self.get_department(request)

        if department is None:

            return Response(
                {
                    "error": "You are not assigned as the manager of any department."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not department.is_active:

            return Response(
                {
                    "error": "Your department is inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DepartmentManagerStaffCreateSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        staff_user = serializer.save()

        staff_profile = StaffProfile.objects.create(
            user=staff_user,
            department=department,
            **serializer.staff_profile_data,
        )

        return Response(
            {
                "message": "Staff account created and assigned successfully.",
                "staff": StaffProfileSerializer(
                    staff_profile
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MyDepartmentStaffDetailView(APIView):

    permission_classes = [IsDepartmentManager]

    def get_department(self, request):

        try:
            return request.user.managed_department

        except Department.DoesNotExist:
            return None

    @transaction.atomic
    def patch(self, request, user_id):

        department = self.get_department(request)

        if department is None:

            return Response(
                {
                    "error": "You are not assigned as the manager of any department."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            staff_profile = (
                StaffProfile.objects
                .select_for_update()
                .select_related("user")
                .get(
                    department=department,
                    user_id=user_id
                )
            )

        except StaffProfile.DoesNotExist:

            return Response(
                {
                    "error": "Staff member not found in your department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DepartmentManagerStaffUpdateSerializer(
            staff_profile,
            data=request.data,
            partial=True,
            context={
                "staff_profile": staff_profile
            },
        )

        serializer.is_valid(raise_exception=True)

        updated_profile = serializer.save()

        return Response(
            {
                "message": "Staff profile updated successfully.",
                "staff": StaffProfileSerializer(
                    updated_profile
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def delete(self, request, user_id):

        department = self.get_department(request)

        if department is None:

            return Response(
                {
                    "error": "You are not assigned as the manager of any department."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            staff_profile = (
                StaffProfile.objects
                .select_for_update()
                .get(
                    department=department,
                    user_id=user_id,
                )
            )

        except StaffProfile.DoesNotExist:

            return Response(
                {
                    "error": "Staff member not found in your department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        staff_profile.delete()

        return Response(
            {
                "message": "Staff member removed from your department."
            },
            status=status.HTTP_200_OK,
        )


class MyStaffProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        # Department Manager profile
        if user.role == User.Role.MANAGER:

            try:

                department = Department.objects.get(
                    manager=user
                )

            except Department.DoesNotExist:

                return Response(
                    {
                        "error": (
                            "You are not assigned as the manager "
                            "of any department."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "id": user.id,
                    "user": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "role": user.role,
                    "department": department.id,
                    "department_name": department.name,
                    "department_code": department.code,
                    "department_is_active": department.is_active,
                },
                status=status.HTTP_200_OK,
            )

        # Preserve existing Staff profile functionality
        try:

            staff_profile = (
                StaffProfile.objects
                .select_related("user", "department")
                .get(user=user)
            )

        except StaffProfile.DoesNotExist:

            return Response(
                {
                    "error": "Staff profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": staff_profile.id,
                "user": staff_profile.user.id,
                "department": staff_profile.department.id,
                "department_name": staff_profile.department.name,
                "department_code": staff_profile.department.code,
                "phone_number": staff_profile.phone_number,
                "location": staff_profile.location,
                "first_name": staff_profile.user.first_name,
                "last_name": staff_profile.user.last_name,
                "email": staff_profile.user.email,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def patch(self, request):

        user = request.user

        # Only Department Managers can edit this profile
        if user.role != User.Role.MANAGER:

            return Response(
                {
                    "error": "Only department managers can update this profile."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verify manager has an assigned department
        try:

            department = Department.objects.get(
                manager=user
            )

        except Department.DoesNotExist:

            return Response(
                {
                    "error": "You are not assigned to any department."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DepartmentManagerProfileUpdateSerializer(
            user,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response(
            {
                "message": "Profile updated successfully.",
                "profile": {
                    "id": user.id,
                    "user": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "role": user.role,
                    "department": department.id,
                    "department_name": department.name,
                    "department_code": department.code,
                    "department_is_active": department.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )


class DepartmentManagerChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        # Only Department Managers can change password through this endpoint
        if user.role != User.Role.MANAGER:

            return Response(
                {
                    "error": "Only department managers can change password using this endpoint."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DepartmentManagerChangePasswordSerializer(
            data=request.data,
            context={
                "request": request
            },
        )

        serializer.is_valid(raise_exception=True)

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save(
            update_fields=["password"]
        )

        return Response(
            {
                "message": "Password changed successfully."
            },
            status=status.HTTP_200_OK,
        )


class MyStaffDashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:

            staff_profile = (
                StaffProfile.objects
                .select_related("user", "department")
                .get(user=request.user)
            )

        except StaffProfile.DoesNotExist:

            return Response(
                {
                    "error": "Staff profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        user = staff_profile.user

        department = staff_profile.department

        assigned_reports = (
            Report.objects
            .filter(
                assigned_staff=user,
                department=department,
            )
            .select_related(
                "citizen",
                "department",
                "assigned_staff"
            )
            .prefetch_related(
                "images",
                "videos"
            )
        )

        return Response(
            {
                "staff": {
                    "id": staff_profile.id,
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip(),
                    "email": user.email,
                    "role": user.role,
                    "is_verified": user.is_verified,
                },

                "department": {
                    "id": department.id,
                    "name": department.name,
                    "code": department.code,
                },

                "assigned_reports": ReportSerializer(
                    assigned_reports,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )
class AdminDepartmentManagerListCreateView(APIView):
    """
    Super Admin: list and create Department Managers.
    """

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        managers = User.objects.filter(
            role=User.Role.MANAGER
        ).order_by("-date_joined")

        search = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "all")
        department_filter = request.query_params.get("department", "all")

        if search:
            from django.db.models import Q

            managers = managers.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        if status_filter == "active":
            managers = managers.filter(is_active=True)
        elif status_filter == "inactive":
            managers = managers.filter(is_active=False)

        results = []

        for manager in managers:
            department = Department.objects.filter(
                manager=manager
            ).first()

            if (
                department_filter != "all"
                and str(department.id if department else "") != department_filter
            ):
                continue

            results.append({
                "id": manager.id,
                "first_name": manager.first_name,
                "last_name": manager.last_name,
                "email": manager.email,
                "phone_number": manager.phone_number,
                "role": manager.role,
                "is_active": manager.is_active,
                "is_verified": manager.is_verified,
                "date_joined": manager.date_joined,
                "department": {
                    "id": department.id,
                    "name": department.name,
                    "code": department.code,
                    "is_active": department.is_active,
                } if department else None,
            })

        return Response({
            "count": len(results),
            "results": results,
        })

    @transaction.atomic
    def post(self, request):
        data = request.data

        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        phone_number = str(data.get("phone_number", "")).strip()
        password = data.get("password", "")
        department_id = data.get("department_id")

        if not all([
            first_name,
            last_name,
            email,
            phone_number,
            password,
            department_id,
        ]):
            return Response(
                {"detail": "All fields, including department and password, are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "This email address is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response(
                {"password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            department = Department.objects.select_for_update().get(
                pk=department_id
            )
        except Department.DoesNotExist:
            return Response(
                {"detail": "Selected department was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not department.is_active:
            return Response(
                {"detail": "Cannot assign a manager to an inactive department."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if department.manager_id:
            return Response(
                {"detail": "This department already has a manager assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role=User.Role.MANAGER,
            is_active=True,
            is_verified=True,
        )

        department.manager = manager
        department.save(update_fields=["manager", "updated_at"])

        return Response(
            {
                "message": "Department Manager created successfully.",
                "id": manager.id,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminDepartmentManagerDetailView(APIView):
    """
    Super Admin: retrieve, update, activate, deactivate
    and safely remove a Department Manager.
    """

    permission_classes = [IsSuperAdmin]

    def get_manager(self, pk):
        try:
            return User.objects.get(
                pk=pk,
                role=User.Role.MANAGER,
            )
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        manager = self.get_manager(pk)

        if not manager:
            return Response(
                {"detail": "Department Manager not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        department = Department.objects.filter(
            manager=manager
        ).first()

        return Response({
            "id": manager.id,
            "first_name": manager.first_name,
            "last_name": manager.last_name,
            "email": manager.email,
            "phone_number": manager.phone_number,
            "role": manager.role,
            "is_active": manager.is_active,
            "is_verified": manager.is_verified,
            "date_joined": manager.date_joined,
            "department": {
                "id": department.id,
                "name": department.name,
                "code": department.code,
                "description": department.description,
                "is_active": department.is_active,
            } if department else None,
        })

    @transaction.atomic
    def patch(self, request, pk):
        manager = self.get_manager(pk)

        if not manager:
            return Response(
                {"detail": "Department Manager not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data

        if "is_active" in data:
            active = data["is_active"]

            if not isinstance(active, bool):
                return Response(
                    {"detail": "is_active must be true or false."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            manager.is_active = active
            manager.save(update_fields=["is_active"])

            if not active:
                # Unassign the inactive manager but preserve the account.
                Department.objects.filter(
                    manager=manager
                ).update(manager=None)

        for field in ("first_name", "last_name", "phone_number"):
            if field in data:
                value = str(data[field]).strip()

                if not value:
                    return Response(
                        {"detail": f"{field} cannot be empty."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                setattr(manager, field, value)

        if "email" in data:
            email = str(data["email"]).strip().lower()

            if User.objects.filter(
                email__iexact=email
            ).exclude(pk=manager.pk).exists():
                return Response(
                    {"detail": "This email address is already registered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            manager.email = email

        manager.save()

        if "department_id" in data:
            department_id = data["department_id"]

            if department_id in (None, ""):
                Department.objects.filter(
                    manager=manager
                ).update(manager=None)
            else:
                if not manager.is_active:
                    return Response(
                        {"detail": "Activate this manager before assigning a department."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                try:
                    department = Department.objects.select_for_update().get(
                        pk=department_id
                    )
                except Department.DoesNotExist:
                    return Response(
                        {"detail": "Department not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                if not department.is_active:
                    return Response(
                        {"detail": "Cannot assign an inactive department."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                occupied = Department.objects.filter(
                    manager=department.manager
                ).exclude(pk=department.pk).exists() if department.manager_id else False

                if department.manager_id and department.manager_id != manager.id:
                    return Response(
                        {"detail": "This department already has another manager."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                Department.objects.filter(
                    manager=manager
                ).exclude(pk=department.pk).update(manager=None)

                department.manager = manager
                department.save(update_fields=["manager", "updated_at"])

        return Response({
            "message": "Department Manager updated successfully."
        })

    @transaction.atomic
    def delete(self, request, pk):
        manager = self.get_manager(pk)

        if not manager:
            return Response(
                {"detail": "Department Manager not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Safe deletion: deactivate account and unassign department.
        # Do not permanently delete records linked to this manager.
        manager.is_active = False
        manager.save(update_fields=["is_active"])

        Department.objects.filter(
            manager=manager
        ).update(manager=None)

        return Response({
            "message": "Department Manager deactivated and department assignment removed."
        })
        
        
class AdminStaffListCreateView(APIView):

    permission_classes = [IsSuperAdmin]

    def get(self, request):

        staff = StaffProfile.objects.select_related(
            "user",
            "department"
        ).order_by("-created_at")

        search = request.query_params.get("search")
        department_id = request.query_params.get("department")
        account_status = request.query_params.get("status")

        if search:
            staff = staff.filter(
                user__first_name__icontains=search
            ) | staff.filter(
                user__last_name__icontains=search
            ) | staff.filter(
                user__email__icontains=search
            )

        if department_id:
            staff = staff.filter(department_id=department_id)

        if account_status == "active":
            staff = staff.filter(user__is_active=True)

        elif account_status == "inactive":
            staff = staff.filter(user__is_active=False)

        return Response(
            {
                "results": AdminStaffSerializer(
                    staff,
                    many=True
                ).data
            },
            status=status.HTTP_200_OK
        )

    @transaction.atomic
    def post(self, request):

        data = request.data

        required_fields = [
            "first_name",
            "last_name",
            "email",
            "password",
            "department",
            "phone_number",
            "location",
        ]

        for field in required_fields:
            if not data.get(field):
                raise ValidationError({
                    field: "This field is required."
                })

        email = data["email"].strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError({
                "email": "This email address is already registered."
            })

        department = Department.objects.filter(
            id=data["department"],
            is_active=True
        ).first()

        if not department:
            raise ValidationError({
                "department": "Select an active department."
            })

        password = data["password"]
        validate_password(password)

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            phone_number=data["phone_number"].strip(),
            role=User.Role.STAFF,
            is_active=True,
            is_verified=True,
        )

        profile = StaffProfile.objects.create(
            user=user,
            department=department,
            phone_number=data["phone_number"].strip(),
            location=data["location"].strip(),
        )

        return Response(
            {
                "message": "Staff account created successfully.",
                "staff": AdminStaffSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED
        )


class AdminStaffDetailView(APIView):

    permission_classes = [IsSuperAdmin]

    def get_staff(self, staff_id):
        try:
            # Frontend sends StaffProfile.id, not User.id.
            return StaffProfile.objects.select_related(
                "user",
                "department"
            ).get(pk=staff_id)

        except StaffProfile.DoesNotExist:
            return None

    def get(self, request, user_id):

        profile = self.get_staff(user_id)

        if not profile:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            AdminStaffSerializer(profile).data,
            status=status.HTTP_200_OK
        )

    @transaction.atomic
    def patch(self, request, user_id):

        profile = self.get_staff(user_id)

        if not profile:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        user = profile.user
        data = request.data

        if "email" in data:
            email = data["email"].strip().lower()

            if User.objects.filter(
                email__iexact=email
            ).exclude(id=user.id).exists():
                raise ValidationError({
                    "email": "This email is already registered."
                })

            user.email = email

        if "first_name" in data:
            user.first_name = data["first_name"].strip()

        if "last_name" in data:
            user.last_name = data["last_name"].strip()

        if "phone_number" in data:
            phone = data["phone_number"].strip()
            user.phone_number = phone
            profile.phone_number = phone

        if "location" in data:
            profile.location = data["location"].strip()

        if "department" in data:
            department = Department.objects.filter(
                id=data["department"],
                is_active=True
            ).first()

            if not department:
                raise ValidationError({
                    "department": "Select an active department."
                })

            profile.department = department

        if "is_active" in data:
            user.is_active = data["is_active"]

        user.save()
        profile.save()

        return Response(
            {
                "message": "Staff account updated successfully.",
                "staff": AdminStaffSerializer(profile).data,
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, user_id):

        profile = self.get_staff(user_id)

        if not profile:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        profile.user.is_active = False
        profile.user.save(update_fields=["is_active"])

        return Response(
            {
                "message": "Staff account deactivated successfully."
            },
            status=status.HTTP_200_OK
        )