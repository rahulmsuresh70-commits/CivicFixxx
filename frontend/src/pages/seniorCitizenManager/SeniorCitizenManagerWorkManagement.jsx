import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  HeartHandshake,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  Image as ImageIcon,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";
import useManagerUnreadNotifications from "./useManagerUnreadNotifications";

import "./SeniorCitizenManagerDashboard.css";
import "./SeniorCitizenManagerWorkManagement.css";

const REQUEST_ENDPOINT = "/senior-citizen/";
const STAFF_ENDPOINT = "/senior-citizen/staff/";

const COMPLETED_STATUSES = ["completed", "closed"];

const PENDING_STATUSES = [
  "submitted",
  "under_review",
  "approved",
];

const PROGRESS_STATUSES = [
  "assigned",
  "in_progress",
  "on_the_way",
  "arrived",
  "pickup_completed",
  "in_transit",
];

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  in_progress: "In Progress",
  on_the_way: "Staff On The Way",
  arrived: "Staff Arrived",
  pickup_completed: "Pickup Completed",
  in_transit: "In Transit",
  completed: "Completed",
  closed: "Closed",
};

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.staff)) return data.staff;
  if (Array.isArray(data?.requests)) return data.requests;
  return [];
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

const getStatusLabel = (status) =>
  STATUS_LABELS[normalize(status)] ||
  String(status || "Unknown").replaceAll("_", " ");

const isCompleted = (status) =>
  COMPLETED_STATUSES.includes(normalize(status));

const isPending = (status) =>
  PENDING_STATUSES.includes(normalize(status));

const isInProgress = (status) =>
  PROGRESS_STATUSES.includes(normalize(status));

const isRejected = (status) =>
  normalize(status) === "rejected";

/* --------------------------------------------------
   STAFF HELPERS
-------------------------------------------------- */

const getStaffName = (staff) => {
  const name = [
    staff?.first_name,
    staff?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    staff?.full_name ||
    staff?.name ||
    staff?.user?.full_name ||
    staff?.user?.email ||
    staff?.email ||
    "Staff Member"
  );
};

const getStaffEmail = (staff) =>
  staff?.email ||
  staff?.user?.email ||
  staff?.staff_email ||
  "";

const getStaffPhone = (staff) =>
  staff?.phone_number ||
  staff?.phone ||
  staff?.mobile_number ||
  staff?.user?.phone_number ||
  "";

const getRequestStaffEmail = (request) =>
  request?.assigned_staff_email ||
  request?.staff_email ||
  request?.assigned_staff?.email ||
  request?.assigned_staff?.user?.email ||
  "";

const getRequestStaffName = (request) =>
  request?.assigned_staff_full_name ||
  request?.assigned_staff_name ||
  request?.staff_name ||
  request?.assigned_staff?.full_name ||
  request?.assigned_staff?.name ||
  "";

const getRequestStaffId = (request) =>
  request?.assigned_staff_id ??
  request?.staff_id ??
  request?.assigned_staff?.id ??
  request?.assigned_staff?.user?.id ??
  null;

const getDate = (value, withTime = false) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    withTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  ).format(date);
};

const getInitials = (name) =>
  String(name || "Staff")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/* --------------------------------------------------
   STAFF AVAILABILITY
-------------------------------------------------- */

// Completed, Closed, Rejected requests are not active work.
// Any other assigned request counts as active work.

const isActiveWork = (request) => {
  const status = normalize(request?.status);

  return (
    !COMPLETED_STATUSES.includes(status) &&
    status !== "rejected"
  );
};

const getStaffAvailability = (staff) => {
  const activeWorkCount = (staff?.assignedRequests || [])
    .filter(isActiveWork).length;

  return {
    status: activeWorkCount > 0 ? "working" : "free",
    activeWorkCount,
  };
};

function AvailabilityBadge({ status, count }) {
  const isWorking = status === "working";

  return (
    <span
      className={`scwm-availability-badge ${
        isWorking ? "working" : "free"
      }`}
    >
      <span className="scwm-availability-dot" />

      {isWorking ? "Working" : "Free"}

      {typeof count === "number" && (
        <small>{count}</small>
      )}
    </span>
  );
}

/* --------------------------------------------------
   PHOTO HELPERS
-------------------------------------------------- */

const getPhotoList = (request) => {
  const possiblePhotos = [
    request?.completion_photo,
    request?.completed_photo,
    request?.work_photo,
    request?.photo,
    request?.image,
    request?.proof_image,
    request?.before_photo,
    request?.after_photo,
    request?.completion_images,
    request?.work_images,
    request?.photos,
    request?.images,
  ];

  const result = [];

  possiblePhotos.forEach((item) => {
    if (!item) return;

    const values = Array.isArray(item) ? item : [item];

    values.forEach((photo) => {
      const url =
        typeof photo === "string"
          ? photo
          : photo?.image ||
            photo?.photo ||
            photo?.url ||
            photo?.file;

      if (url && !result.includes(url)) {
        result.push(url);
      }
    });
  });

  return result;
};

/* --------------------------------------------------
   LOCATION HELPERS
-------------------------------------------------- */

const getRequestAddress = (request) => {
  const addressParts = [
    request?.house_name,
    request?.house_number,
    request?.address,
    request?.address_line,
    request?.address_line_1,
    request?.address_line_2,
    request?.locality,
    request?.place,
    request?.city,
    request?.panchayat,
    request?.municipality,
    request?.post_office,
    request?.district,
    request?.state,
    request?.pincode ||
      request?.postal_code ||
      request?.zip_code,
  ];

  const uniqueParts = [
    ...new Set(
      addressParts
        .filter(Boolean)
        .map((part) => String(part).trim())
        .filter(Boolean)
    ),
  ];

  return uniqueParts.length > 0
    ? uniqueParts.join(", ")
    : "Location address not available";
};

const getRequestCoordinates = (request) => {
  const latitude =
    request?.latitude ??
    request?.lat ??
    request?.location?.latitude ??
    request?.location?.lat;

  const longitude =
    request?.longitude ??
    request?.lng ??
    request?.location?.longitude ??
    request?.location?.lng;

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
  };
};

/* --------------------------------------------------
   WORKFLOW HELPERS
-------------------------------------------------- */

const WORKFLOW_STEPS = [
  {
    key: "submitted",
    label: "Request Submitted",
    description: "Senior citizen assistance request received.",
    dateFields: ["created_at", "submitted_at"],
  },
  {
    key: "assigned",
    label: "Staff Assigned",
    description: "Manager assigned this request to a staff member.",
    dateFields: ["assigned_at", "assignment_date"],
  },
  {
    key: "in_progress",
    label: "Work Started",
    description: "Assigned staff member started the work.",
    dateFields: [
      "started_at",
      "work_started_at",
      "in_progress_at",
    ],
  },
  {
    key: "on_the_way",
    label: "Staff On The Way",
    description: "Staff member is travelling to the senior citizen.",
    dateFields: ["on_the_way_at", "travel_started_at"],
  },
  {
    key: "arrived",
    label: "Staff Arrived",
    description: "Staff member reached the service location.",
    dateFields: ["arrived_at", "staff_arrived_at"],
  },
  {
    key: "pickup_completed",
    label: "Pickup Completed",
    description: "Pickup or collection activity completed.",
    dateFields: ["pickup_completed_at"],
  },
  {
    key: "completed",
    label: "Work Completed",
    description: "Assigned assistance request has been completed.",
    dateFields: ["completed_at", "closed_at"],
  },
];

const getWorkflowDate = (request, dateFields) => {
  for (const field of dateFields) {
    if (request?.[field]) {
      return request[field];
    }
  }

  return null;
};

const getWorkflowStepIndex = (status) => {
  const value = normalize(status);

  if (
    ["submitted", "under_review", "approved", "rejected"].includes(value)
  ) return 0;

  if (value === "assigned") return 1;
  if (value === "in_progress") return 2;
  if (value === "on_the_way") return 3;
  if (value === "arrived") return 4;

  if (
    value === "pickup_completed" ||
    value === "in_transit"
  ) return 5;

  if (["completed", "closed"].includes(value)) return 6;

  return 0;
};

/* --------------------------------------------------
   COMMON COMPONENTS
-------------------------------------------------- */

function StatusBadge({ status }) {
  const value = normalize(status);

  return (
    <span className={`scwm-status ${value}`}>
      <span />
      {getStatusLabel(status)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <article className="scwm-stat-card">
      <div className={`scwm-stat-icon ${color}`}>
        <Icon size={19} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StaffAvatar({ name }) {
  return (
    <div className="scwm-staff-avatar">
      {getInitials(name)}
    </div>
  );
}

/* --------------------------------------------------
   STAFF WORKFLOW COMPONENT
-------------------------------------------------- */

function StaffWorkflow({ request }) {
  const currentStatus = normalize(request?.status);
  const currentStepIndex = getWorkflowStepIndex(currentStatus);

  if (isRejected(currentStatus)) {
    return (
      <section className="scwm-detail-section">
        <h3>Staff Workflow</h3>

        <div className="scwm-workflow-rejected">
          <AlertCircle size={19} />

          <div>
            <strong>Request Rejected</strong>
            <span>
              This request was rejected and the normal staff
              workflow is not continuing.
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="scwm-detail-section">
      <div className="scwm-workflow-heading">
        <div>
          <h3>Staff Workflow</h3>
          <p>
            Track the progress of this senior citizen assistance request.
          </p>
        </div>

        <StatusBadge status={request.status} />
      </div>

      <div className="scwm-workflow-timeline">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompletedStep = index < currentStepIndex;
          const isCurrentStep = index === currentStepIndex;
          const isFutureStep = index > currentStepIndex;

          const stepDate = getWorkflowDate(
            request,
            step.dateFields
          );

          return (
            <div
              className={`scwm-workflow-step ${
                isCompletedStep ? "completed" : ""
              } ${
                isCurrentStep ? "current" : ""
              } ${
                isFutureStep ? "upcoming" : ""
              }`}
              key={step.key}
            >
              <div className="scwm-workflow-indicator">
                <span>
                  {isCompletedStep ? (
                    <CheckCircle2 size={16} />
                  ) : isCurrentStep ? (
                    <Clock3 size={16} />
                  ) : (
                    <span className="scwm-workflow-dot" />
                  )}
                </span>

                {index !== WORKFLOW_STEPS.length - 1 && <i />}
              </div>

              <div className="scwm-workflow-content">
                <div className="scwm-workflow-title">
                  <strong>{step.label}</strong>

                  {isCurrentStep && (
                    <span className="scwm-workflow-current-label">
                      CURRENT
                    </span>
                  )}

                  {isCompletedStep && (
                    <span className="scwm-workflow-done-label">
                      DONE
                    </span>
                  )}
                </div>

                <p>{step.description}</p>

                {stepDate && (
                  <small>
                    <CalendarDays size={12} />
                    {getDate(stepDate, true)}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------------------------
   COMPLAINT DETAILS MODAL
-------------------------------------------------- */

function ComplaintDetails({ request, onClose }) {
  const photos = getPhotoList(request);

  const address = getRequestAddress(request);
  const coordinates = getRequestCoordinates(request);

  const landmark =
    request?.landmark ||
    request?.nearest_landmark ||
    request?.location?.landmark;

  const mapsUrl = coordinates
    ? `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div
      className="scwm-overlay scwm-complaint-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="scwm-modal scwm-complaint-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="scwm-modal-header">
          <div>
            <span className="scwm-eyebrow">
              COMPLAINT DETAILS
            </span>

            <h2>Request #{request.id}</h2>

            <p>
              View senior citizen assistance request details.
            </p>
          </div>

          <button
            type="button"
            className="scwm-close"
            onClick={onClose}
            aria-label="Close complaint details"
          >
            <X size={19} />
          </button>
        </div>

        <div className="scwm-modal-body">
          <div className="scwm-detail-status">
            <div>
              <span>Current Status</span>
              <StatusBadge status={request.status} />
            </div>

            <div>
              <span>Request ID</span>
              <strong>#{request.id}</strong>
            </div>
          </div>

          <section className="scwm-detail-section">
            <h3>Senior Citizen Information</h3>

            <div className="scwm-detail-grid">
              <div>
                <UserRound size={16} />
                <div>
                  <small>Name</small>
                  <strong>
                    {request.full_name ||
                      request.name ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div>
                <Phone size={16} />
                <div>
                  <small>Phone Number</small>
                  <strong>
                    {request.phone_number ||
                      request.phone ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div>
                <MapPin size={16} />
                <div>
                  <small>District</small>
                  <strong>
                    {request.district || "Not available"}
                  </strong>
                </div>
              </div>

              <div>
                <MapPin size={16} />
                <div>
                  <small>State</small>
                  <strong>
                    {request.state || "Not available"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* LOCATION DETAILS */}

          <section className="scwm-detail-section">
            <div className="scwm-location-heading">
              <div>
                <h3>Location Details</h3>
                <p>
                  Senior citizen service location and address.
                </p>
              </div>

              <div className="scwm-location-icon">
                <MapPin size={20} />
              </div>
            </div>

            <div className="scwm-location-card">
              <div className="scwm-location-address">
                <MapPin size={18} />

                <div>
                  <small>Complete Address</small>
                  <strong>{address}</strong>
                </div>
              </div>

              {landmark && (
                <div className="scwm-location-extra">
                  <Navigation size={15} />

                  <div>
                    <small>Nearest Landmark</small>
                    <strong>{landmark}</strong>
                  </div>
                </div>
              )}

              <div className="scwm-location-meta">
                <div>
                  <small>District</small>
                  <strong>
                    {request.district || "Not available"}
                  </strong>
                </div>

                <div>
                  <small>State</small>
                  <strong>
                    {request.state || "Not available"}
                  </strong>
                </div>

                <div>
                  <small>PIN Code</small>
                  <strong>
                    {request.pincode ||
                      request.postal_code ||
                      request.zip_code ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              {coordinates && (
                <div className="scwm-location-coordinates">
                  <div>
                    <small>Latitude</small>
                    <strong>{coordinates.latitude}</strong>
                  </div>

                  <div>
                    <small>Longitude</small>
                    <strong>{coordinates.longitude}</strong>
                  </div>
                </div>
              )}

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="scwm-map-button"
              >
                <MapPin size={15} />
                Open Location in Google Maps
              </a>
            </div>
          </section>

          <section className="scwm-detail-section">
            <h3>Assistance / Complaint Information</h3>

            <div className="scwm-detail-grid">
              <div>
                <ClipboardList size={16} />
                <div>
                  <small>Assistance Type</small>
                  <strong>
                    {String(
                      request.assistance_type ||
                        request.service_type ||
                        "Not available"
                    ).replaceAll("_", " ")}
                  </strong>
                </div>
              </div>

              <div>
                <CalendarDays size={16} />
                <div>
                  <small>Submitted Date</small>
                  <strong>{getDate(request.created_at)}</strong>
                </div>
              </div>

              <div>
                <CalendarDays size={16} />
                <div>
                  <small>Assigned Date</small>
                  <strong>
                    {getDate(
                      request.assigned_at ||
                      request.assignment_date
                    )}
                  </strong>
                </div>
              </div>

              <div>
                <CheckCircle2 size={16} />
                <div>
                  <small>Completion Date</small>
                  <strong>{getDate(request.completed_at)}</strong>
                </div>
              </div>
            </div>

            <div className="scwm-description">
              <small>Description</small>
              <p>
                {request.description ||
                  request.details ||
                  request.message ||
                  request.request_description ||
                  "No additional description available."}
              </p>
            </div>

            {request.completion_notes && (
              <div className="scwm-description">
                <small>Completion Notes</small>
                <p>{request.completion_notes}</p>
              </div>
            )}
          </section>

          <section className="scwm-detail-section">
            <h3>Assigned Staff</h3>

            <div className="scwm-assigned-person">
              <StaffAvatar
                name={getRequestStaffName(request)}
              />

              <div>
                <strong>
                  {getRequestStaffName(request) || "Not assigned"}
                </strong>

                <span>
                  {getRequestStaffEmail(request) ||
                    "Staff email unavailable"}
                </span>
              </div>
            </div>
          </section>

          {/* STAFF WORKFLOW */}

          <StaffWorkflow request={request} />

          <section className="scwm-detail-section">
            <h3>Work Photos</h3>

            {photos.length > 0 ? (
              <div className="scwm-photo-grid">
                {photos.map((photo, index) => (
                  <a
                    href={photo}
                    target="_blank"
                    rel="noreferrer"
                    key={`${photo}-${index}`}
                    className="scwm-photo-item"
                  >
                    <img
                      src={photo}
                      alt={`Work evidence ${index + 1}`}
                    />

                    <span>
                      <ImageIcon size={13} />
                      Photo {index + 1}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="scwm-no-photos">
                <ImageIcon size={23} />
                <strong>No work photos available</strong>
                <span>
                  Photos will appear here when they are included
                  in the request API response.
                </span>
              </div>
            )}
          </section>
        </div>

        <div className="scwm-modal-footer">
          <button
            type="button"
            className="scwm-secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------
   STAFF WORK MODAL
-------------------------------------------------- */

function StaffWorkModal({
  staff,
  requests,
  onClose,
  onViewComplaint,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const staffRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "completed" &&
            isCompleted(request.status)) ||
          (filter === "pending" &&
            isPending(request.status)) ||
          (filter === "progress" &&
            isInProgress(request.status));

        const matchesSearch =
          !term ||
          [
            request.id,
            request.full_name,
            request.phone_number,
            request.assistance_type,
            request.status,
          ].some((value) =>
            String(value || "").toLowerCase().includes(term)
          );

        return matchesFilter && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );
  }, [requests, search, filter]);

  const stats = {
    assigned: requests.length,

    completed: requests.filter((item) =>
      isCompleted(item.status)
    ).length,

    pending: requests.filter((item) =>
      isPending(item.status)
    ).length,

    progress: requests.filter((item) =>
      isInProgress(item.status)
    ).length,
  };

  const availability = getStaffAvailability(staff);

  return (
    <div
      className="scwm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="scwm-modal scwm-staff-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="scwm-modal-header">
          <div>
            <span className="scwm-eyebrow">
              STAFF WORK DETAILS
            </span>

            <h2>{getStaffName(staff)}</h2>

            <p>
              Review all complaints assigned to this staff member.
            </p>
          </div>

          <button
            type="button"
            className="scwm-close"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="scwm-modal-body">
          <div className="scwm-staff-profile">
            <StaffAvatar name={getStaffName(staff)} />

            <div>
              <h3>{getStaffName(staff)}</h3>

              <span>
                Staff ID: {staff.id || staff.user || "—"}
              </span>

              <p>
                <Mail size={14} />
                {getStaffEmail(staff) || "Email unavailable"}
              </p>

              <p>
                <Phone size={14} />
                {getStaffPhone(staff) || "Phone unavailable"}
              </p>

              {/* NEW: STAFF AVAILABILITY */}

              <div className="scwm-profile-availability">
                <span>Current Availability:</span>

                <AvailabilityBadge
                  status={availability.status}
                  count={availability.activeWorkCount}
                />
              </div>
            </div>
          </div>

          <div className="scwm-staff-stats">
            <div>
              <span>Assigned</span>
              <strong>{stats.assigned}</strong>
            </div>

            <div>
              <span>Completed</span>
              <strong className="green">{stats.completed}</strong>
            </div>

            <div>
              <span>Pending</span>
              <strong className="orange">{stats.pending}</strong>
            </div>

            <div>
              <span>In Progress</span>
              <strong className="blue">{stats.progress}</strong>
            </div>
          </div>

          <div className="scwm-assigned-heading">
            <div>
              <h3>Assigned Complaints</h3>
              <p>
                Work records associated with this staff member.
              </p>
            </div>

            <strong>{staffRequests.length} complaints</strong>
          </div>

          <div className="scwm-work-filters">
            <label>
              <Search size={15} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search complaint..."
              />
            </label>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
            >
              <option value="all">All Work</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="progress">In Progress</option>
            </select>
          </div>

          {staffRequests.length === 0 ? (
            <div className="scwm-empty">
              <ClipboardList size={25} />
              <strong>No complaints found</strong>
              <span>
                No work matches this search or status filter.
              </span>
            </div>
          ) : (
            <div className="scwm-complaint-list">
              {staffRequests.map((request) => (
                <article
                  className="scwm-complaint-card"
                  key={request.id}
                >
                  <div className="scwm-complaint-top">
                    <div>
                      <strong className="scwm-request-id">
                        #{request.id}
                      </strong>

                      <h4>
                        {request.title ||
                          request.assistance_type ||
                          request.service_type ||
                          "Assistance Request"}
                      </h4>

                      <p>
                        {request.full_name || "Senior citizen"}
                      </p>
                    </div>

                    <StatusBadge status={request.status} />
                  </div>

                  <div className="scwm-complaint-info">
                    <div>
                      <span>Priority</span>
                      <strong>
                        {request.priority || "Normal"}
                      </strong>
                    </div>

                    <div>
                      <span>Assignment Date</span>
                      <strong>
                        {getDate(
                          request.assigned_at ||
                          request.assignment_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Deadline</span>
                      <strong>
                        {getDate(
                          request.deadline ||
                          request.due_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Completion Date</span>
                      <strong>
                        {getDate(request.completed_at)}
                      </strong>
                    </div>
                  </div>

                  <div className="scwm-complaint-bottom">
                    <span>
                      {request.district || "District unavailable"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onViewComplaint(request)
                      }
                    >
                      <Eye size={14} />
                      View Complaint Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="scwm-modal-footer">
          <button
            type="button"
            className="scwm-secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------
   MAIN WORK MANAGEMENT PAGE
-------------------------------------------------- */

export default function SeniorCitizenManagerWorkManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useManagerUnreadNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [staff, setStaff] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [user] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [staffResponse, requestResponse] =
        await Promise.all([
          api.get(STAFF_ENDPOINT, { timeout: 15000 }),
          api.get(REQUEST_ENDPOINT, { timeout: 15000 }),
        ]);

      const staffRows = getRows(staffResponse.data);
      const requestRows = getRows(requestResponse.data);

      setStaff(
        staffRows.filter(
          (person) =>
            person?.is_active !== false &&
            person?.account_is_active !== false
        )
      );

      setRequests(requestRows);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* --------------------------------------------------
     STAFF WORK CALCULATION
  -------------------------------------------------- */

  const staffWithWorks = useMemo(() => {
    return staff.map((person) => {
      const personEmail = getStaffEmail(person).toLowerCase();
      const personName = getStaffName(person).toLowerCase();

      const personId = String(
        person.id ?? person.user?.id ?? ""
      );

      const assignedRequests = requests.filter((request) => {
        const requestEmail =
          getRequestStaffEmail(request).toLowerCase();

        const requestName =
          getRequestStaffName(request).toLowerCase();

        const requestId = getRequestStaffId(request);

        if (
          requestId !== null &&
          personId &&
          String(requestId) === personId
        ) {
          return true;
        }

        if (
          personEmail &&
          requestEmail &&
          personEmail === requestEmail
        ) {
          return true;
        }

        if (
          personName &&
          requestName &&
          personName === requestName
        ) {
          return true;
        }

        return false;
      });

      const completed = assignedRequests.filter((item) =>
        isCompleted(item.status)
      ).length;

      const pending = assignedRequests.filter((item) =>
        isPending(item.status)
      ).length;

      const progress = assignedRequests.filter((item) =>
        isInProgress(item.status)
      ).length;

      const activeWorkCount = assignedRequests.filter(
        isActiveWork
      ).length;

      const availability =
        activeWorkCount > 0 ? "working" : "free";

      return {
        ...person,
        assignedRequests,
        assigned: assignedRequests.length,
        completed,
        pending,
        progress,
        activeWorkCount,
        availability,

        overdue: assignedRequests.filter((item) => {
          const deadline = item.deadline || item.due_date;

          return (
            deadline &&
            !isCompleted(item.status) &&
            !isRejected(item.status) &&
            new Date(deadline).getTime() < Date.now()
          );
        }).length,
      };
    });
  }, [staff, requests]);

  /* --------------------------------------------------
     FILTER STAFF
  -------------------------------------------------- */

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();

    return staffWithWorks.filter((person) => {
      const matchesSearch =
        !term ||
        [
          getStaffName(person),
          getStaffEmail(person),
          getStaffPhone(person),
          person.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" &&
          person.completed > 0) ||
        (statusFilter === "pending" &&
          person.pending > 0) ||
        (statusFilter === "progress" &&
          person.progress > 0) ||
        (statusFilter === "overdue" &&
          person.overdue > 0) ||
        (statusFilter === "free" &&
          person.availability === "free") ||
        (statusFilter === "working" &&
          person.availability === "working");

      return matchesSearch && matchesStatus;
    });
  }, [staffWithWorks, search, statusFilter]);

  /* --------------------------------------------------
     SUMMARY COUNTS
  -------------------------------------------------- */

  const totals = useMemo(
    () => ({
      staff: staff.length,

      assigned: staffWithWorks.reduce(
        (sum, item) => sum + item.assigned,
        0
      ),

      completed: staffWithWorks.reduce(
        (sum, item) => sum + item.completed,
        0
      ),

      pending: staffWithWorks.reduce(
        (sum, item) => sum + item.pending,
        0
      ),

      progress: staffWithWorks.reduce(
        (sum, item) => sum + item.progress,
        0
      ),

      free: staffWithWorks.filter(
        (item) => item.availability === "free"
      ).length,

      working: staffWithWorks.filter(
        (item) => item.availability === "working"
      ).length,
    }),
    [staff.length, staffWithWorks]
  );

  const managerName =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.email ||
    "Manager";

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/senior-citizen/manager/dashboard",
    },
    {
      name: "Assistance Requests",
      icon: ClipboardList,
      path: "/senior-citizen/manager/requests",
    },
    {
      name: "Staff Management",
      icon: Users,
      path: "/senior-citizen/manager/staff",
    },
    {
      name: "Progress Tracking",
      icon: ChartNoAxesCombined,
      path: "/senior-citizen/manager/progress",
    },
    {
      name: "Notifications",
      icon: Bell,
      path: "/senior-citizen/manager/notifications",
    },
    {
      name: "Messages",
      icon: Mail,
      path: "/senior-citizen/manager/messages",
    },
    {
      name: "Work Management",
      icon: Activity,
      path: "/senior-citizen/manager/work-management",
    },
  ];

  const logout = async () => {
    const refresh = localStorage.getItem(
      "civicfix_refresh_token"
    );

    if (refresh) {
      try {
        await api.post("/auth/logout/", { refresh });
      } catch {
        // Clear local session even if logout API fails.
      }
    }

    [
      "civicfix_access_token",
      "civicfix_refresh_token",
      "civicfix_user",
    ].forEach((key) => localStorage.removeItem(key));

    navigate("/senior-citizen/manager/login", {
      replace: true,
    });
  };

  const openStaff = (person) => {
    setSelectedComplaint(null);
    setSelectedStaff(person);
  };

  const openComplaint = (request) => {
    setSelectedComplaint(request);
  };

  const closeComplaint = () => {
    setSelectedComplaint(null);
  };

  const closeStaff = () => {
    setSelectedStaff(null);
  };

  return (
    <div className="sc-dashboard scwm-shell">
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sc-sidebar ${
          sidebarOpen ? "sc-sidebar-open" : ""
        }`}
      >
        <div className="sc-brand">
          <div className="sc-brand-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

          <button
            className="sc-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sc-sidebar-label">
          WORKSPACE
        </div>

        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.path}
                className={`sc-nav-item ${
                  location.pathname === item.path
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {item.name === "Notifications" &&
                  unreadCount > 0 && (
                    <span className="sc-nav-badge">
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>

        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">
          <button
            className="sc-nav-item"
            onClick={() =>
              navigate("/senior-citizen/manager/profile")
            }
          >
            <UserRound size={19} />
            <span>Manager Profile</span>
          </button>
        </nav>

        <div className="sc-sidebar-bottom">
          <div className="sc-help-card">
            <div className="sc-help-icon">
              <HeartHandshake size={19} />
            </div>

            <h4>Senior Care Workspace</h4>

            <p>
              Coordinate assistance and monitor staff work.
            </p>

            <button
              onClick={() =>
                navigate("/senior-citizen/manager/requests")
              }
            >
              View requests
            </button>
          </div>

          <button
            className="sc-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="sc-main">
        <header className="sc-header">
          <div className="sc-header-left">
            <button
              className="sc-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div>
              <div className="sc-breadcrumb">
                Senior Care Portal
                <ChevronRight size={13} />
                Work Management
              </div>

              <h2>Work Management</h2>
            </div>
          </div>

          <div className="sc-header-right">
            <button
              className="sc-notification-button"
              onClick={() =>
                navigate(
                  "/senior-citizen/manager/notifications"
                )
              }
              aria-label="Open notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && <i />}
            </button>

            <button
              className="sc-profile-button"
              onClick={() =>
                navigate("/senior-citizen/manager/profile")
              }
            >
              <span className="sc-avatar">
                {getInitials(managerName)}
              </span>

              <span className="sc-profile-info">
                <strong>{managerName}</strong>
                <small>Senior Citizen Manager</small>
              </span>
            </button>
          </div>
        </header>

        <div className="sc-content scwm-content">
          <section className="scwm-page-heading">
            <div>
              <span className="scwm-eyebrow">
                STAFF PERFORMANCE
              </span>

              <h1>Work Management</h1>

              <p>
                View individual workloads, staff availability
                and assigned senior citizen assistance requests.
              </p>
            </div>

            <button
              type="button"
              className="scwm-refresh"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle size={15} />
              ) : (
                <RefreshCw size={15} />
              )}
              Refresh
            </button>
          </section>

          {error && (
            <div className="scwm-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* SUMMARY CARDS */}

          <section className="scwm-summary-grid">
            <StatCard
              icon={Users}
              label="Staff Members"
              value={loading ? "—" : totals.staff}
              color="blue"
            />

            <StatCard
              icon={ClipboardList}
              label="Assigned Works"
              value={loading ? "—" : totals.assigned}
              color="purple"
            />

            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={loading ? "—" : totals.completed}
              color="green"
            />

            <StatCard
              icon={Clock3}
              label="Pending"
              value={loading ? "—" : totals.pending}
              color="orange"
            />

            <StatCard
              icon={Activity}
              label="In Progress"
              value={loading ? "—" : totals.progress}
              color="indigo"
            />

            {/* NEW FREE STAFF COUNT */}

            <StatCard
              icon={CheckCircle2}
              label="Free Staff"
              value={loading ? "—" : totals.free}
              color="green"
            />

            {/* NEW WORKING STAFF COUNT */}

            <StatCard
              icon={Activity}
              label="Working Staff"
              value={loading ? "—" : totals.working}
              color="orange"
            />
          </section>

          <section className="scwm-table-card">
            <div className="scwm-table-heading">
              <div>
                <h3>Senior Citizen Staff</h3>

                <p>
                  View individual workloads, availability and assigned complaints.
                </p>
              </div>

              <span className="scwm-count">
                {filteredStaff.length} staff members
              </span>
            </div>

            <div className="scwm-toolbar">
              <label className="scwm-search">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search staff by name, email or phone..."
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter staff"
              >
                <option value="all">All work statuses</option>
                <option value="free">Free Staff</option>
                <option value="working">Working Staff</option>
                <option value="completed">Has completed work</option>
                <option value="pending">Has pending work</option>
                <option value="progress">In progress</option>
                <option value="overdue">Overdue work</option>
              </select>
            </div>

            {loading ? (
              <div className="scwm-empty">
                <LoaderCircle
                  size={23}
                  className="scwm-spin"
                />
                <strong>Loading staff work details...</strong>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="scwm-empty">
                <Users size={25} />
                <strong>No staff members found</strong>
                <span>
                  Staff members will appear here when available.
                </span>
              </div>
            ) : (
              <div className="scwm-table-scroll">
                <table className="scwm-table">
                  <thead>
                    <tr>
                      <th>STAFF MEMBER</th>
                      <th>CONTACT</th>
                      <th>ASSIGNED</th>
                      <th>COMPLETED</th>
                      <th>PENDING</th>
                      <th>IN PROGRESS</th>
                      <th>AVAILABILITY</th>
                      <th>WORK STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStaff.map((person) => (
                      <tr
                        key={person.id || getStaffEmail(person)}
                      >
                        <td>
                          <div className="scwm-staff-cell">
                            <StaffAvatar
                              name={getStaffName(person)}
                            />

                            <div>
                              <strong>
                                {getStaffName(person)}
                              </strong>

                              <small>
                                Staff ID: {person.id || "—"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="scwm-contact-cell">
                            <span>
                              <Mail size={13} />
                              {getStaffEmail(person) || "—"}
                            </span>

                            <span>
                              <Phone size={13} />
                              {getStaffPhone(person) || "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong className="scwm-number">
                            {person.assigned}
                          </strong>
                        </td>

                        <td>
                          <strong className="scwm-number green">
                            {person.completed}
                          </strong>
                        </td>

                        <td>
                          <strong className="scwm-number orange">
                            {person.pending}
                          </strong>
                        </td>

                        <td>
                          <strong className="scwm-number blue">
                            {person.progress}
                          </strong>
                        </td>

                        {/* NEW AVAILABILITY COLUMN */}

                        <td>
                          <AvailabilityBadge
                            status={person.availability}
                            count={person.activeWorkCount}
                          />
                        </td>

                        <td>
                          {person.overdue > 0 ? (
                            <span className="scwm-work-label overdue">
                              Overdue
                            </span>
                          ) : person.progress > 0 ? (
                            <span className="scwm-work-label progress">
                              In Progress
                            </span>
                          ) : person.completed > 0 ? (
                            <span className="scwm-work-label completed">
                              Completed
                            </span>
                          ) : (
                            <span className="scwm-work-label pending">
                              No Active Work
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="scwm-view-button"
                            onClick={() => openStaff(person)}
                          >
                            <Eye size={14} />
                            View Work
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="scwm-table-footer">
              Showing {filteredStaff.length} of {staff.length} staff members
            </div>
          </section>

          <footer className="scwm-footer">
            <span>CivicFix · Senior Citizen Care</span>

            <span>
              <ShieldCheck size={13} />
              Secure management workspace
            </span>
          </footer>
        </div>
      </main>

      {selectedStaff && (
        <StaffWorkModal
          staff={selectedStaff}
          requests={selectedStaff.assignedRequests}
          onClose={closeStaff}
          onViewComplaint={openComplaint}
        />
      )}

      {selectedComplaint && (
        <ComplaintDetails
          request={selectedComplaint}
          onClose={closeComplaint}
        />
      )}
    </div>
  );
}