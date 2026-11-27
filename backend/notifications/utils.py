
from .models import Notification


def notify_report_participants(
    report,
    message,
    include_citizen=True,
    include_staff=True,
    include_manager=True,
):
    recipient_ids = set()

    if include_citizen and report.citizen_id:
        recipient_ids.add(report.citizen_id)

    if include_staff and report.assigned_staff_id:
        recipient_ids.add(report.assigned_staff_id)

    if include_manager and report.department.manager_id:
        recipient_ids.add(report.department.manager_id)

    if not recipient_ids:
        return 0

    notifications = [
        Notification(
            recipient_id=recipient_id,
            report=report,
            message=message,
        )
        for recipient_id in recipient_ids
    ]

    Notification.objects.bulk_create(notifications)

    return len(notifications)
