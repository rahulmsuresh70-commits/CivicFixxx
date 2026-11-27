import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from accounts.models import User
from senior_citizen.models import (
    SeniorCitizenManagerProfile,
    SeniorCitizenServiceArea,
)


def setup_managers():
    assignments = [
        ("almanager@gmail.com", "Alappuzha"),
        ("manager.kottayam@example.com", "Kottayam"),
    ]

    with transaction.atomic():
        for email, district in assignments:
            user = User.objects.get(
                email=email,
                role=User.Role.SENIOR_CITIZEN_MANAGER,
            )

            profile, _ = (
                SeniorCitizenManagerProfile.objects.get_or_create(
                    user=user
                )
            )

            area, _ = SeniorCitizenServiceArea.objects.get_or_create(
                state="Kerala",
                district=district,
                defaults={
                    "manager": profile,
                    "is_active": True,
                },
            )

            if area.manager_id != profile.id:
                raise ValueError(
                    f"{district} is already assigned to another manager."
                )

            print(f"SUCCESS: {email} -> Kerala, {district}")


if __name__ == "__main__":
    setup_managers()    