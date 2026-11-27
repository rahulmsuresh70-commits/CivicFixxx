from django.urls import path

from .views import (
    ReportMessageListCreateView,
    MessageMarkReadView,
    InternalMessageSendView,
    InternalMessageInboxView,
    InternalMessageSentView,
    InternalMessageDetailView,
    InternalMessageMarkReadView,
    InternalMessageReplyView,
)

urlpatterns = [
    # Existing report-specific conversation endpoints (preserved).
    path(
        "reports/<int:report_id>/messages/",
        ReportMessageListCreateView.as_view(),
        name="report-messages",
    ),
    path(
        "messages/<int:message_id>/read/",
        MessageMarkReadView.as_view(),
        name="message-mark-read",
    ),

    # Common in-app messaging endpoints.
    path("internal/send/", InternalMessageSendView.as_view(), name="internal-message-send"),
    path("internal/inbox/", InternalMessageInboxView.as_view(), name="internal-message-inbox"),
    path("internal/sent/", InternalMessageSentView.as_view(), name="internal-message-sent"),
    path("internal/<int:message_id>/", InternalMessageDetailView.as_view(), name="internal-message-detail"),
    path("internal/<int:message_id>/read/", InternalMessageMarkReadView.as_view(), name="internal-message-read"),
    path("internal/<int:message_id>/reply/", InternalMessageReplyView.as_view(), name="internal-message-reply"),
]
