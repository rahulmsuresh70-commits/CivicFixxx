from django.urls import path

from .views import (
    CitizenReportListCreateView,
    AdminReportListView,
    ReportImageUploadView,
    ReportVideoUploadView,
    ManagerReportListView,
    ManagerApproveReportView,
    ManagerRejectReportView,
    ManagerTransferReportView,
    ManagerAssignReportView,
    StaffAcceptReportView,
    StaffResolutionCreateView,
    StaffResolutionImageUploadView,
    StaffResolutionVideoUploadView,
    StaffResolveReportView,
    CitizenVerifyReportView,
    CitizenReopenReportView,
    CitizenReopenImageUploadView,
    CitizenReopenVideoUploadView,
    ManagerReassignReopenedReportView,
    ManagerDuplicateReviewView,
)


urlpatterns = [
    path(
        "admin/",
        AdminReportListView.as_view(),
        name="admin-report-list",
    ),

    path("", CitizenReportListCreateView.as_view(), name="citizen-reports"),

    # KEEP ALL YOUR OTHER EXISTING URL PATTERNS BELOW

    path("", CitizenReportListCreateView.as_view(), name="citizen-reports"),

    path(
        "<int:report_id>/images/",
        ReportImageUploadView.as_view(),
        name="report-image-upload",
    ),

    path(
        "<int:report_id>/videos/",
        ReportVideoUploadView.as_view(),
        name="report-video-upload",
    ),

    path(
        "manager/",
        ManagerReportListView.as_view(),
        name="manager-reports",
    ),

    path(
        "manager/<int:report_id>/approve/",
        ManagerApproveReportView.as_view(),
        name="manager-approve-report",
    ),

    path(
        "manager/<int:report_id>/reject/",
        ManagerRejectReportView.as_view(),
        name="manager-reject-report",
    ),

    path(
        "manager/<int:report_id>/transfer/",
        ManagerTransferReportView.as_view(),
        name="manager-transfer-report",
    ),

    path(
        "manager/<int:report_id>/assign/",
        ManagerAssignReportView.as_view(),
        name="manager-assign-report",
    ),
    path(
        "manager/<int:report_id>/duplicate-review/",
        ManagerDuplicateReviewView.as_view(),
        name="manager-duplicate-review",
    ),

    
    path(
        "manager/<int:report_id>/reopened/assign/",
        ManagerReassignReopenedReportView.as_view(),
        name="manager-reassign-reopened-report",
    ),
    
    # Staff accepts an assigned report
    path(
        "staff/<int:report_id>/accept/",
        StaffAcceptReportView.as_view(),
        name="staff-accept-report",
    ),
    
    path(
        "staff/<int:report_id>/resolution/",
        StaffResolutionCreateView.as_view(),
        name="staff-create-resolution",
    ),

    path(
        "staff/<int:report_id>/resolution/image/",
        StaffResolutionImageUploadView.as_view(),
        name="staff-resolution-image",
    ),

    path(
        "staff/<int:report_id>/resolution/video/",
        StaffResolutionVideoUploadView.as_view(),
        name="staff-resolution-video",
    ),

    path(
        "staff/<int:report_id>/resolve/",
        StaffResolveReportView.as_view(),
        name="staff-resolve-report",
    ),
    path(
        "<int:report_id>/verify/",
        CitizenVerifyReportView.as_view(),
        name="citizen-verify-report",
    ),

    path(
        "<int:report_id>/reopen/",
        CitizenReopenReportView.as_view(),
        name="citizen-reopen-report",
    ),
    
    
    path(
        "<int:report_id>/reopen/image/",
        CitizenReopenImageUploadView.as_view(),
        name="citizen-reopen-image",
    ),
    path(
        "<int:report_id>/reopen/video/",
        CitizenReopenVideoUploadView.as_view(),
        name="citizen-reopen-video",
    ),
    
]