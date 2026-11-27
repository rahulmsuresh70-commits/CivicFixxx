
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from reports.models import Report


class Command(BaseCommand):
    help = "Notify department managers about overdue unresolved reports."

    OVERDUE_STATUSES = [
        Report.Status.ASSIGNED,
        Report.Status.IN_PROGRESS,
        Report.Status.REOPENED,
    ]

    def handle(self, *args, **options):
        now = timezone.now()

        overdue_ids = list(
            Report.objects.filter(
                deadline__lte=now,
                status__in=self.OVERDUE_STATUSES,
                department__manager__isnull=False,
            ).values_list("id", flat=True)
        )

        created_count = 0

        for report_id in overdue_ids:
            with transaction.atomic():
                # Lock the report so overlapping command runs do not
                # create duplicate alerts for the same report.
                try:
                    report = (
                        Report.objects.select_for_update()
                        .select_related("department__manager")
                        .get(
                            id=report_id,
                            deadline__lte=now,
                            status__in=self.OVERDUE_STATUSES,
                            department__manager__isnull=False,
                        )
                    )
                except Report.DoesNotExist:
                    continue

                manager = report.department.manager
                message_prefix = (
                    f"SLA overdue: Report #{report.id} deadline "
                    f"{report.deadline.isoformat()} "
                )

                already_notified = Notification.objects.filter(
                    recipient=manager,
                    report=report,
                    message__startswith=message_prefix,
                ).exists()

                if already_notified:
                    continue

                Notification.objects.create(
                    recipient=manager,
                    report=report,
                    message=(
                        f"{message_prefix}'{report.title}' has passed "
                        f"its deadline and remains in status "
                        f"'{report.status}'. Please review it."
                    ),
                )

                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Overdue check completed. "
                f"New notifications created: {created_count}."
            )
        )
