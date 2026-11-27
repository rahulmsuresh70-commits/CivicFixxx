# Generated for CivicFix duplicate-report review workflow.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("reports", "0009_report_deadline"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="duplicate_of",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="duplicate_reports",
                to="reports.report",
            ),
        ),
        migrations.AddField(
            model_name="report",
            name="duplicate_review_status",
            field=models.CharField(
                choices=[
                    ("none", "Not a duplicate"),
                    ("pending", "Pending manager review"),
                    ("confirmed", "Confirmed duplicate"),
                    ("rejected", "Not a duplicate after review"),
                ],
                default="none",
                max_length=20,
            ),
        ),
    ]
