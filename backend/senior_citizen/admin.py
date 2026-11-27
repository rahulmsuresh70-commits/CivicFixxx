
from django.contrib import admin

from .models import SeniorCitizenImage, SeniorCitizenRequest


class SeniorCitizenImageInline(admin.TabularInline):
    model = SeniorCitizenImage
    extra = 0


@admin.register(SeniorCitizenRequest)
class SeniorCitizenRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "citizen",
        "assistance_type",
        "status",
        "assigned_staff",
        "created_at",
    )

    list_filter = ("status", "assistance_type", "department")
    search_fields = (
        "full_name",
        "phone_number",
        "citizen__email",
    )
    readonly_fields = ("created_at", "updated_at")
    inlines = [SeniorCitizenImageInline]


@admin.register(SeniorCitizenImage)
class SeniorCitizenImageAdmin(admin.ModelAdmin):
    list_display = ("id", "request", "uploaded_by", "created_at")
    readonly_fields = ("created_at",)
