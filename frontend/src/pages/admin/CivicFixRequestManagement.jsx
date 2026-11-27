import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  X,
  Clock,
  CheckCircle2,
  CircleAlert,
  Activity,
  Building2,
  UserRound,
  CalendarDays,
  MapPin,
  Flag,
  Image as ImageIcon,
  Video,
  FileText,
  ShieldCheck,
  ExternalLink,
  Filter,
  ChevronDown,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Download,
  Users,
} from "lucide-react";

import api from "../../api/axios";

import "./CivicFixRequestManagement.css";

const REQUESTS_URL = "/reports/admin/";

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  transferred: "Transferred",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  reopened: "Reopened",
  verified: "Verified",
  closed: "Closed",
};

const PRIORITY_LABELS = {
  normal: "Normal",
  high: "High",
};

const getArray = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Unable to load CivicFix requests.";
  }

  if (typeof data === "string") {
    return data;
  }

  return (
    data.detail ||
    data.message ||
    data.error ||
    "Unable to load CivicFix requests."
  );
};

const formatStatus = (status) => {
  return (
    STATUS_LABELS[status] ||
    String(status || "Unknown").replaceAll("_", " ")
  );
};

const formatPriority = (priority) => {
  return (
    PRIORITY_LABELS[priority] ||
    String(priority || "Normal").replaceAll("_", " ")
  );
};

const formatDate = (value, includeTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    includeTime
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

const getMediaUrl = (value) => {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const baseURL = api.defaults.baseURL || "";

  try {
    return new URL(
      value,
      baseURL || window.location.origin
    ).href;
  } catch {
    return value;
  }
};

const getStaffName = (staff) => {
  if (!staff) return "Not assigned";

  return (
    staff.name ||
    `${staff.first_name || ""} ${staff.last_name || ""}`.trim() ||
    staff.email ||
    `Staff #${staff.id}`
  );
};

const getCitizenLabel = (citizen) => {
  if (citizen && typeof citizen === "object") {
    return (
      `${citizen.first_name || ""} ${citizen.last_name || ""}`.trim() ||
      citizen.email ||
      `Citizen #${citizen.id}`
    );
  }

  return citizen ? `Citizen #${citizen}` : "—";
};

const isCompleted = (status) => {
  return ["resolved", "verified", "closed"].includes(status);
};

const isPending = (status) => {
  return ["submitted", "under_review"].includes(status);
};

const isActive = (status) => {
  return [
    "approved",
    "transferred",
    "assigned",
    "in_progress",
    "reopened",
  ].includes(status);
};

function StatusBadge({ status }) {
  return (
    <span
      className={`cfrm-status cfrm-status-${String(
        status || "unknown"
      ).replaceAll("_", "-")}`}
    >
      <span className="cfrm-status-dot" />
      {formatStatus(status)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={`cfrm-priority cfrm-priority-${String(
        priority || "normal"
      ).toLowerCase()}`}
    >
      <Flag size={13} />
      {formatPriority(priority)}
    </span>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="cfrm-detail-item">
      <span className="cfrm-detail-label">
        <Icon size={16} />
        {label}
      </span>

      <strong>{value || "—"}</strong>
    </div>
  );
}

function MediaSection({
  title,
  icon: Icon,
  items,
  type,
}) {
  if (!items?.length) return null;

  return (
    <section className="cfrm-detail-section">
      <div className="cfrm-detail-section-heading">
        <div className="cfrm-section-icon">
          <Icon size={19} />
        </div>

        <div>
          <h3>{title}</h3>
          <p>{items.length} uploaded file(s)</p>
        </div>
      </div>

      <div className="cfrm-media-grid">
        {items.map((item) => {
          const source = getMediaUrl(
            type === "image" ? item.image : item.video
          );

          if (!source) return null;

          return (
            <a
              key={item.id}
              href={source}
              target="_blank"
              rel="noreferrer"
              className="cfrm-media-item"
            >
              {type === "image" ? (
                <img
                  src={source}
                  alt={`${title} ${item.id}`}
                />
              ) : (
                <div className="cfrm-video-preview">
                  <Video size={34} />
                  <span>Open Video</span>
                </div>
              )}

              <span className="cfrm-media-open">
                <ExternalLink size={14} />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function CivicFixRequestManagement() {
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);

  // --------------------------------------------------
  // LOAD REQUESTS
  // --------------------------------------------------

  const loadRequests = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get(REQUESTS_URL);

      const data = getArray(response.data);

      setRequests(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const total = requests.length;

    const pending = requests.filter((item) =>
      isPending(item.status)
    ).length;

    const active = requests.filter((item) =>
      isActive(item.status)
    ).length;

    const completed = requests.filter((item) =>
      isCompleted(item.status)
    ).length;

    const reopened = requests.filter(
      (item) => item.status === "reopened"
    ).length;

    return [
      {
        title: "Total Requests",
        value: total,
        description: "All registered CivicFix requests",
        icon: ClipboardList,
        color: "blue",
      },
      {
        title: "Pending Review",
        value: pending,
        description: "Awaiting department review",
        icon: Clock,
        color: "orange",
      },
      {
        title: "Active Requests",
        value: active,
        description: "Currently being handled",
        icon: Activity,
        color: "purple",
      },
      {
        title: "Completed Requests",
        value: completed,
        description: "Resolved, verified or closed",
        icon: CheckCircle2,
        color: "green",
      },
    ];
  }, [requests]);

  // --------------------------------------------------
  // DEPARTMENT FILTER OPTIONS
  // --------------------------------------------------

  const departments = useMemo(() => {
    const unique = new Map();

    requests.forEach((request) => {
      if (request.department_name) {
        unique.set(
          request.department_name,
          request.department_name
        );
      }
    });

    return [...unique.values()].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [requests]);

  // --------------------------------------------------
  // FILTER REQUESTS
  // --------------------------------------------------

  const filteredRequests = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return requests.filter((request) => {
      const matchesSearch =
        !search ||
        String(request.id).includes(search) ||
        request.title?.toLowerCase().includes(search) ||
        request.description?.toLowerCase().includes(search) ||
        request.category?.toLowerCase().includes(search) ||
        request.department_name?.toLowerCase().includes(search) ||
        request.department_code?.toLowerCase().includes(search) ||
        request.location?.toLowerCase().includes(search) ||
        getCitizenLabel(request.citizen).toLowerCase().includes(search) ||
        getStaffName(request.assigned_staff).toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        request.priority === priorityFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        request.department_name === departmentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesDepartment
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
    priorityFilter,
    departmentFilter,
  ]);

  // --------------------------------------------------
  // EXPORT CSV
  // --------------------------------------------------

  const exportCSV = () => {
    const headers = [
      "Request ID",
      "Title",
      "Category",
      "Department",
      "Department Code",
      "Citizen ID",
      "Assigned Staff",
      "Status",
      "Priority",
      "Location",
      "Latitude",
      "Longitude",
      "Deadline",
      "Created Date",
      "Updated Date",
    ];

    const rows = filteredRequests.map((request) => [
      request.id,
      request.title,
      request.category,
      request.department_name,
      request.department_code,
      typeof request.citizen === "object"
        ? request.citizen?.id
        : request.citizen,
      getStaffName(request.assigned_staff),
      request.status,
      request.priority,
      request.location,
      request.latitude,
      request.longitude,
      request.deadline,
      request.created_at,
      request.updated_at,
    ]);

    const escapeCSV = (value) => {
      const text = String(value ?? "");

      return `"${text.replaceAll('"', '""')}"`;
    };

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "civicfix-requests.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setSuccess("Request data exported successfully.");

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  // --------------------------------------------------
  // CLOSE DETAIL MODAL
  // --------------------------------------------------

  const closeDetails = () => {
    setSelectedRequest(null);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="cfrm-page">

      {/* NOTIFICATIONS */}

      {success && (
        <div className="cfrm-toast success">
          <CheckCircle2 size={18} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="cfrm-toast error">
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* PAGE HEADING */}

      <div className="cfrm-heading">

        <div>
          <div className="cfrm-breadcrumb">
            <span>Administration</span>
            <span>/</span>
            <strong>CivicFix Requests</strong>
          </div>

          <h1>CivicFix Request Management</h1>

          <p>
            Access and monitor civic complaints submitted
            across all departments.
          </p>
        </div>

        <div className="cfrm-heading-actions">

          <button
            type="button"
            className="cfrm-btn secondary"
            onClick={() => loadRequests(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "cfrm-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="cfrm-btn primary"
            onClick={exportCSV}
            disabled={!filteredRequests.length}
          >
            <Download size={17} />
            Export CSV
          </button>

        </div>

      </div>

      {/* STATISTICS */}

      <section className="cfrm-stat-grid">

        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              className="cfrm-stat-card"
              key={stat.title}
            >
              <div className="cfrm-stat-top">

                <div className={`cfrm-stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>

              </div>

              <h2>{loading ? "—" : stat.value}</h2>

              <strong>{stat.title}</strong>

              <p>{stat.description}</p>
            </article>
          );
        })}

      </section>

      {/* REQUEST TABLE */}

      <section className="cfrm-table-card">

        <div className="cfrm-table-header">

          <div>
            <h2>All CivicFix Requests</h2>

            <p>
              {filteredRequests.length} matching request(s)
            </p>
          </div>

          <div className="cfrm-filter-row">

            <label className="cfrm-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <label className="cfrm-select">
              <Filter size={15} />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>

                {Object.entries(STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>

              <ChevronDown size={15} />
            </label>

            <label className="cfrm-select">
              <Flag size={15} />

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
                aria-label="Filter by priority"
              >
                <option value="all">All Priority</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

              <ChevronDown size={15} />
            </label>

            <label className="cfrm-select department">
              <Building2 size={15} />

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
                aria-label="Filter by department"
              >
                <option value="all">All Departments</option>

                {departments.map((department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                ))}
              </select>

              <ChevronDown size={15} />
            </label>

          </div>

        </div>

        {/* TABLE */}

        <div className="cfrm-table-scroll">

          <table className="cfrm-table">

            <thead>
              <tr>
                <th>REQUEST</th>
                <th>DEPARTMENT</th>
                <th>CITIZEN</th>
                <th>ASSIGNED STAFF</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>SUBMITTED DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="cfrm-loading">
                      <Loader2
                        size={27}
                        className="cfrm-spin"
                      />

                      <span>Loading CivicFix requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="cfrm-empty">
                      <ClipboardList size={35} />

                      <h3>No requests found</h3>

                      <p>
                        {requests.length
                          ? "Try changing your search or filters."
                          : "No CivicFix requests are currently available."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>

                    <td>
                      <div className="cfrm-request-cell">
                        <div className="cfrm-request-icon">
                          <ClipboardList size={19} />
                        </div>

                        <div>
                          <strong>
                            {request.title || "Untitled Request"}
                          </strong>

                          <span>
                            Request #{request.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="cfrm-department-cell">
                        <strong>
                          {request.department_name || "—"}
                        </strong>

                        <span>
                          {request.department_code || "No code"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="cfrm-citizen">
                        <UserRound size={15} />
                        {getCitizenLabel(request.citizen)}
                      </span>
                    </td>

                    <td>
                      <div className="cfrm-staff-cell">
                        <strong>
                          {getStaffName(request.assigned_staff)}
                        </strong>

                        {request.assigned_staff?.email && (
                          <span>
                            {request.assigned_staff.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <PriorityBadge
                        priority={request.priority}
                      />
                    </td>

                    <td>
                      <StatusBadge status={request.status} />
                    </td>

                    <td>
                      <div className="cfrm-date">
                        <CalendarDays size={15} />
                        {formatDate(request.created_at)}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="cfrm-view-button"
                        onClick={() =>
                          setSelectedRequest(request)
                        }
                        title="View request details"
                      >
                        <Eye size={17} />
                        View
                      </button>
                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

        {!loading && filteredRequests.length > 0 && (
          <div className="cfrm-table-footer">
            <span>
              Showing {filteredRequests.length} of{" "}
              {requests.length} requests
            </span>

            <span>
              Super Admin • CivicFix
            </span>
          </div>
        )}

      </section>

      {/* REQUEST DETAILS MODAL */}

      {selectedRequest && (
        <div
          className="cfrm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >

          <div className="cfrm-modal">

            {/* MODAL HEADER */}

            <div className="cfrm-modal-header">

              <div className="cfrm-modal-heading-icon">
                <ClipboardList size={23} />
              </div>

              <div className="cfrm-modal-heading-text">
                <h2>Request Details</h2>

                <p>
                  Request #{selectedRequest.id}
                </p>
              </div>

              <button
                type="button"
                className="cfrm-modal-close"
                onClick={closeDetails}
                aria-label="Close details"
              >
                <X size={21} />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="cfrm-modal-body">

              {/* REQUEST SUMMARY */}

              <section className="cfrm-request-banner">

                <div>
                  <span className="cfrm-overline">
                    CIVICFIX COMPLAINT
                  </span>

                  <h3>{selectedRequest.title}</h3>

                  <div className="cfrm-banner-badges">
                    <StatusBadge
                      status={selectedRequest.status}
                    />

                    <PriorityBadge
                      priority={selectedRequest.priority}
                    />
                  </div>
                </div>

              </section>

              {/* DESCRIPTION */}

              <section className="cfrm-detail-section">

                <div className="cfrm-detail-section-heading">
                  <div className="cfrm-section-icon">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h3>Request Description</h3>
                    <p>Complaint information provided by the citizen.</p>
                  </div>
                </div>

                <div className="cfrm-description-box">
                  {selectedRequest.description || "No description provided."}
                </div>

              </section>

              {/* GENERAL INFORMATION */}

              <section className="cfrm-detail-section">

                <div className="cfrm-detail-section-heading">
                  <div className="cfrm-section-icon">
                    <ClipboardList size={19} />
                  </div>

                  <div>
                    <h3>General Information</h3>
                    <p>Request identification and classification.</p>
                  </div>
                </div>

                <div className="cfrm-detail-grid">

                  <DetailItem
                    icon={HashIcon}
                    label="Request ID"
                    value={`#${selectedRequest.id}`}
                  />

                  <DetailItem
                    icon={FileText}
                    label="Category"
                    value={selectedRequest.category}
                  />

                  <DetailItem
                    icon={Building2}
                    label="Department"
                    value={selectedRequest.department_name}
                  />

                  <DetailItem
                    icon={HashIcon}
                    label="Department Code"
                    value={selectedRequest.department_code}
                  />

                  <DetailItem
                    icon={UserRound}
                    label="Citizen"
                    value={getCitizenLabel(selectedRequest.citizen)}
                  />

                  <DetailItem
                    icon={CalendarDays}
                    label="Submitted"
                    value={formatDate(selectedRequest.created_at, true)}
                  />

                  <DetailItem
                    icon={CalendarDays}
                    label="Last Updated"
                    value={formatDate(selectedRequest.updated_at, true)}
                  />

                  <DetailItem
                    icon={CalendarDays}
                    label="Deadline"
                    value={formatDate(selectedRequest.deadline, true)}
                  />

                </div>

              </section>

              {/* ASSIGNED STAFF */}

              <section className="cfrm-detail-section">

                <div className="cfrm-detail-section-heading">
                  <div className="cfrm-section-icon">
                    <Users size={19} />
                  </div>

                  <div>
                    <h3>Assigned Staff</h3>
                    <p>Staff assignment information.</p>
                  </div>
                </div>

                {selectedRequest.assigned_staff ? (
                  <div className="cfrm-assigned-card">

                    <div className="cfrm-assigned-avatar">
                      <UserRound size={22} />
                    </div>

                    <div className="cfrm-assigned-info">
                      <strong>
                        {getStaffName(selectedRequest.assigned_staff)}
                      </strong>

                      <span>
                        {selectedRequest.assigned_staff.email || "—"}
                      </span>

                      <span>
                        Staff ID: #{selectedRequest.assigned_staff.id}
                      </span>
                    </div>

                    <span
                      className={`cfrm-account-status ${
                        selectedRequest.assigned_staff.is_active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {selectedRequest.assigned_staff.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>
                ) : (
                  <div className="cfrm-not-assigned">
                    <UserRound size={19} />
                    No staff member has been assigned.
                  </div>
                )}

              </section>

              {/* LOCATION */}

              <section className="cfrm-detail-section">

                <div className="cfrm-detail-section-heading">
                  <div className="cfrm-section-icon">
                    <MapPin size={19} />
                  </div>

                  <div>
                    <h3>Request Location</h3>
                    <p>Location information submitted with the request.</p>
                  </div>
                </div>

                <div className="cfrm-location-card">

                  <MapPin size={20} />

                  <div>
                    <strong>
                      {selectedRequest.location || "Location not provided"}
                    </strong>

                    <span>
                      Latitude: {selectedRequest.latitude ?? "—"}
                    </span>

                    <span>
                      Longitude: {selectedRequest.longitude ?? "—"}
                    </span>
                  </div>

                  {selectedRequest.latitude != null &&
                    selectedRequest.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cfrm-map-link"
                      >
                        Open Map
                        <ExternalLink size={14} />
                      </a>
                    )}

                </div>

              </section>

              {/* DUPLICATE INFORMATION */}

              {(selectedRequest.duplicate_of_id ||
                selectedRequest.duplicate_review_status) && (
                <section className="cfrm-detail-section">

                  <div className="cfrm-detail-section-heading">
                    <div className="cfrm-section-icon">
                      <AlertTriangle size={19} />
                    </div>

                    <div>
                      <h3>Duplicate Review</h3>
                      <p>Automated duplicate detection information.</p>
                    </div>
                  </div>

                  <div className="cfrm-detail-grid">

                    <DetailItem
                      icon={ClipboardList}
                      label="Duplicate Of"
                      value={
                        selectedRequest.duplicate_of_id
                          ? `Request #${selectedRequest.duplicate_of_id}`
                          : "None"
                      }
                    />

                    <DetailItem
                      icon={ShieldCheck}
                      label="Review Status"
                      value={
                        selectedRequest.duplicate_review_status
                      }
                    />

                  </div>

                </section>
              )}

              {/* REQUEST IMAGES */}

              <MediaSection
                title="Request Images"
                icon={ImageIcon}
                items={selectedRequest.images}
                type="image"
              />

              {/* REQUEST VIDEOS */}

              <MediaSection
                title="Request Videos"
                icon={Video}
                items={selectedRequest.videos}
                type="video"
              />

              {/* RESOLUTION */}

              {selectedRequest.resolution && (
                <section className="cfrm-detail-section">

                  <div className="cfrm-detail-section-heading">
                    <div className="cfrm-section-icon green">
                      <CheckCircle2 size={19} />
                    </div>

                    <div>
                      <h3>Latest Resolution</h3>
                      <p>Latest work completion information.</p>
                    </div>
                  </div>

                  <div className="cfrm-resolution-card">

                    <div className="cfrm-resolution-top">
                      <strong>
                        Resolution #{selectedRequest.resolution.id}
                      </strong>

                      <span>
                        {formatDate(
                          selectedRequest.resolution.resolved_at ||
                          selectedRequest.resolution.created_at,
                          true
                        )}
                      </span>
                    </div>

                    <p>
                      {selectedRequest.resolution.work_description ||
                        "No resolution description."}
                    </p>

                  </div>

                  {selectedRequest.resolution.images?.length > 0 && (
                    <MediaSection
                      title="Resolution Images"
                      icon={ImageIcon}
                      items={selectedRequest.resolution.images}
                      type="image"
                    />
                  )}

                  {selectedRequest.resolution.videos?.length > 0 && (
                    <MediaSection
                      title="Resolution Videos"
                      icon={Video}
                      items={selectedRequest.resolution.videos}
                      type="video"
                    />
                  )}

                </section>
              )}

              {/* RESOLUTION HISTORY */}

              {selectedRequest.resolution_history?.length > 0 && (
                <section className="cfrm-detail-section">

                  <div className="cfrm-detail-section-heading">
                    <div className="cfrm-section-icon green">
                      <Activity size={19} />
                    </div>

                    <div>
                      <h3>Resolution History</h3>
                      <p>
                        {selectedRequest.resolution_history.length} recorded resolution(s).
                      </p>
                    </div>
                  </div>

                  <div className="cfrm-history-list">

                    {selectedRequest.resolution_history.map(
                      (resolution) => (
                        <article
                          className="cfrm-history-item"
                          key={resolution.id}
                        >

                          <div className="cfrm-history-dot">
                            <CheckCircle2 size={16} />
                          </div>

                          <div>
                            <strong>
                              Resolution #{resolution.id}
                            </strong>

                            <p>
                              {resolution.work_description}
                            </p>

                            <span>
                              {formatDate(
                                resolution.resolved_at ||
                                resolution.created_at,
                                true
                              )}
                            </span>
                          </div>

                        </article>
                      )
                    )}

                  </div>

                </section>
              )}

              {/* REOPEN REQUESTS */}

              {selectedRequest.reopen_requests?.length > 0 && (
                <section className="cfrm-detail-section">

                  <div className="cfrm-detail-section-heading">
                    <div className="cfrm-section-icon orange">
                      <RotateCcw size={19} />
                    </div>

                    <div>
                      <h3>Reopen Requests</h3>
                      <p>
                        {selectedRequest.reopen_requests.length} reopen request(s).
                      </p>
                    </div>
                  </div>

                  <div className="cfrm-reopen-list">

                    {selectedRequest.reopen_requests.map(
                      (reopen) => (
                        <article
                          className="cfrm-reopen-card"
                          key={reopen.id}
                        >

                          <div className="cfrm-reopen-top">
                            <strong>
                              Reopen Request #{reopen.id}
                            </strong>

                            <span>
                              {formatDate(reopen.created_at, true)}
                            </span>
                          </div>

                          <p>{reopen.reason}</p>

                          <MediaSection
                            title="Reopen Images"
                            icon={ImageIcon}
                            items={reopen.images}
                            type="image"
                          />

                          <MediaSection
                            title="Reopen Videos"
                            icon={Video}
                            items={reopen.videos}
                            type="video"
                          />

                        </article>
                      )
                    )}

                  </div>

                </section>
              )}

              {/* ADMIN ACCESS NOTE */}

              <div className="cfrm-readonly-note">
                <ShieldCheck size={19} />

                <div>
                  <strong>Super Admin Monitoring Access</strong>

                  <p>
                    You can view and monitor this request and its
                    related information. Request workflow changes
                    are not available through the current Super Admin
                    reports API.
                  </p>
                </div>
              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="cfrm-modal-footer">

              <button
                type="button"
                className="cfrm-btn secondary"
                onClick={closeDetails}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

const HashIcon = ClipboardList;

export default CivicFixRequestManagement;