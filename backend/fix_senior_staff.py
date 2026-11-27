import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from accounts.models import User
from senior_citizen.models import (
    SeniorCitizenManagerProfile,
    SeniorCitizenStaffProfile,
    SeniorCitizenServiceArea,
)

# CHANGE THIS to the correct manager for Anu.
manager_email = "almanager@gmail.com"

staff_email = "anu@example.com"
state = "Kerala"
district = "Alappuzha"
designation = "field_assistant"

with transaction.atomic():
    staff = User.objects.get(
        email=staff_email,
        role=User.Role.SENIOR_CITIZEN_STAFF,
    )

    manager_user = User.objects.get(
        email=manager_email,
        role=User.Role.SENIOR_CITIZEN_MANAGER,
    )

    manager_profile = SeniorCitizenManagerProfile.objects.get(
        user=manager_user
    )

    area = SeniorCitizenServiceArea.objects.get(
        manager=manager_profile,
        state=state,
        district=district,
        is_active=True,
    )

    profile, created = SeniorCitizenStaffProfile.objects.get_or_create(
        user=staff,
        defaults={
            "manager": manager_profile,
            "phone_number": "",
            "location": "",
            "state": area.state,
            "district": area.district,
            "designation": designation,
            "is_active": True,
        },
    )

    if not created:
        print("Staff profile already exists. No changes made.")
    else:
        print("Staff profile created successfully.")

    print("Staff:", staff.email)
    print("Manager:", manager_user.email)
    print("District:", area.district)