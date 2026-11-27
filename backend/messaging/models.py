from django.conf import settings
from django.db import models


class Message(models.Model):
    report = models.ForeignKey(
        "reports.Report",
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_civicfix_messages",
    )

    content = models.TextField(max_length=5000)

    is_read = models.BooleanField(default=False)

    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["report", "created_at"],
                name="msg_report_created_idx",
            ),
        ]

    def __str__(self):
        return f"Message #{self.id} on Report #{self.report_id}"


class InternalMessage(models.Model):
    """
    Direct, in-app messages that do not require a CivicFix report.
    This model is intentionally separate from Message to preserve
    the existing report-conversation workflow.
    """

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_internal_messages",
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_internal_messages",
    )

    subject = models.CharField(max_length=200)
    content = models.TextField(max_length=5000)

    parent_message = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "created_at"],
                name="imsg_rec_created_idx",
            ),
            models.Index(
                fields=["sender", "created_at"],
                name="imsg_send_created_idx",
            ),
        ]

    def __str__(self):
        return f"Internal message #{self.id}: {self.subject}"
