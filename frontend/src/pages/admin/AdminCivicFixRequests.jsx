import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  RefreshCw,
  Eye,
  X,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  CalendarDays,
  UserRound,
  Building2,
  Image as ImageIcon,
  Video,
  Filter,
  FileText,
  ExternalLink,
} from "lucide-react";

import api from "../../api/axios";
import "./AdminCivicFixRequests.css";

const REPORTS_URL = "/reports/admin/";

const STATUS_OPTIONS = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "transferred",
  "assigned",
  "in_progress",
  "resolved",
  "reopened",
  "verified",
  "closed",
];

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatLabel = (value) => {
  if (!value) return "Not available";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getCitizenName = (citizen) => {
  if (!citizen) return "Unknown citizen";

  if (typeof citizen === "string") return citizen;

  if (typeof citizen === "number") {
    return `Citizen #${citizen}`;
  }

  const name = [
    citizen.first_name,
    citizen.last_name,
  ].filter(Boolean).join(" ");

  return name || citizen.email || `Citizen #${citizen.id || "—"}`;
};

/*
 * Safely extracts readable text from resolution data.
 * The backend may return resolution as an object instead
 * of a plain string.
 */
const getResolutionDescription = (resolution) => {
  if (!resolution) return "";

  if (
    typeof resolution === "string" ||
    typeof resolution === "number"
  ) {
    return String(resolution);
  }

  if (Array.isArray(resolution)) {
    return resolution
      .map((item) => getResolutionDescription(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof resolution === "object") {
    return (
      resolution.work_description ||
      resolution.description ||
      resolution.resolution ||
      resolution.notes ||
      resolution.title ||
      ""
    );
  }

  return "";
};

const getMediaUrl = (media) => {
  if (!media) return "";

  if (typeof media === "string") return media;

  return (
    media.image ||
    media.video ||
    media.file ||
    media.url ||
    ""
  );
};

export default function AdminCivicFixRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get(REPORTS_URL);

      setRequests(getArray(response.data));
    } catch (err) {
      console.error("CivicFix requests loading failed:", err);

      const responseData = err.response?.data;

      setError(
        responseData?.detail ||
        responseData?.message ||
        "Unable to load CivicFix requests. Please check your connection and permissions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const citizenName = getCitizenName(request.citizen);

      const searchable = [
        request.id,
        request.title,
        request.description,
        request.category,
        request.location,
        request.department_name,
        request.department_code,
        citizenName,
      ].join(" ").toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        request.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    requests,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const statistics = useMemo(() => ({
    total: requests.length,

    pending: requests.filter((item) =>
      ["submitted", "under_review", "reopened"].includes(item.status)
    ).length,

    inProgress: requests.filter((item) =>
      ["assigned", "in_progress", "transferred"].includes(item.status)
    ).length,

    resolved: requests.filter((item) =>
      ["resolved", "verified", "closed"].includes(item.status)
    ).length,
  }), [requests]);

  const openDetails = (request) => {
    setSelectedRequest(request);
  };

  const closeDetails = () => {
    setSelectedRequest(null);
  };

  return (
    <div className="acr-page">

      {/* PAGE HEADER */}

      <div className="acr-header">

        <div>
          <span className="acr-eyebrow">
            SUPER ADMINISTRATION
          </span>

          <h2>CivicFix Requests</h2>

          <p>
            View and monitor civic complaints submitted
            across the CivicFix platform.
          </p>
        </div>

        <button
          className="acr-refresh-button"
          onClick={() => loadRequests(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing ? "acr-spin" : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </div>


      {/* STATISTICS */}

      <section className="acr-stat-grid">

        <article className="acr-stat-card">
          <div className="acr-stat-icon blue">
            <ClipboardList size={22} />
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{statistics.total}</strong>
          </div>
        </article>

        <article className="acr-stat-card">
          <div className="acr-stat-icon orange">
            <Clock size={22} />
          </div>

          <div>
            <span>Pending Review</span>
            <strong>{statistics.pending}</strong>
          </div>
        </article>

        <article className="acr-stat-card">
          <div className="acr-stat-icon purple">
            <AlertCircle size={22} />
          </div>

          <div>
            <span>In Progress</span>
            <strong>{statistics.inProgress}</strong>
          </div>
        </article>

        <article className="acr-stat-card">
          <div className="acr-stat-icon green">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Resolved</span>
            <strong>{statistics.resolved}</strong>
          </div>
        </article>

      </section>


      {/* REQUEST TABLE */}

      <section className="acr-table-card">

        <div className="acr-table-heading">

          <div>
            <h3>All CivicFix Requests</h3>

            <p>
              Platform-wide complaint records
            </p>
          </div>

          <span className="acr-record-count">
            {filteredRequests.length} Records
          </span>

        </div>


        {/* FILTERS */}

        <div className="acr-filters">

          <div className="acr-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search ID, citizen, title, department..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="acr-filter-select">
            <Filter size={17} />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All Statuses</option>

              {STATUS_OPTIONS.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <select
            className="acr-priority-filter"
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
          >
            <option value="all">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>

        </div>


        {/* ERROR */}

        {error && (
          <div className="acr-error">
            <AlertCircle size={19} />
            <span>{error}</span>

            <button onClick={() => loadRequests()}>
              Retry
            </button>
          </div>
        )}


        {/* TABLE */}

        <div className="acr-table-wrapper">

          <table className="acr-table">

            <thead>
              <tr>
                <th>REQUEST</th>
                <th>CITIZEN</th>
                <th>DEPARTMENT</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>SUBMITTED</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="7" className="acr-empty">
                    <RefreshCw
                      size={21}
                      className="acr-spin"
                    />

                    <span>Loading CivicFix requests...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="acr-empty">
                    <ClipboardList size={28} />

                    <strong>No requests found</strong>

                    <span>
                      Try changing your search or filters.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (

                  <tr key={request.id}>

                    <td>
                      <div className="acr-request-cell">
                        <strong>#{request.id}</strong>

                        <span>
                          {request.title || "Untitled request"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="acr-citizen-cell">
                        <div className="acr-avatar">
                          {getCitizenName(request.citizen)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span>
                          {getCitizenName(request.citizen)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="acr-department-cell">
                        <Building2 size={16} />

                        <span>
                          {request.department_name ||
                            request.department_code ||
                            "Not assigned"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`acr-priority ${request.priority || "normal"}`}
                      >
                        {formatLabel(request.priority)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`acr-status ${request.status || "unknown"}`}
                      >
                        {formatLabel(request.status)}
                      </span>
                    </td>

                    <td>
                      {formatDate(request.created_at)}
                    </td>

                    <td>
                      <button
                        className="acr-view-button"
                        onClick={() => openDetails(request)}
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

        <div className="acr-table-footer">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>

      </section>


      {/* REQUEST DETAILS MODAL */}

      {selectedRequest && (

        <div
          className="acr-modal-overlay"
          onClick={closeDetails}
        >

          <section
            className="acr-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="acr-modal-header">

              <div>
                <span>REQUEST DETAILS</span>

                <h3>
                  Request #{selectedRequest.id}
                </h3>
              </div>

              <button
                onClick={closeDetails}
                aria-label="Close details"
              >
                <X size={21} />
              </button>

            </div>


            <div className="acr-modal-body">

              <div className="acr-detail-title">
                <h2>
                  {selectedRequest.title || "Untitled request"}
                </h2>

                <span
                  className={`acr-status ${selectedRequest.status || "unknown"}`}
                >
                  {formatLabel(selectedRequest.status)}
                </span>
              </div>


              <section className="acr-detail-section">

                <h4>
                  <FileText size={18} />
                  Complaint Information
                </h4>

                <div className="acr-detail-grid">

                  <div>
                    <span>Category</span>
                    <strong>
                      {formatLabel(selectedRequest.category)}
                    </strong>
                  </div>

                  <div>
                    <span>Priority</span>
                    <strong>
                      {formatLabel(selectedRequest.priority)}
                    </strong>
                  </div>

                  <div>
                    <span>Created At</span>
                    <strong>
                      {formatDate(selectedRequest.created_at)}
                    </strong>
                  </div>

                  <div>
                    <span>Updated At</span>
                    <strong>
                      {formatDate(selectedRequest.updated_at)}
                    </strong>
                  </div>

                  <div>
                    <span>Deadline</span>
                    <strong>
                      {formatDate(selectedRequest.deadline)}
                    </strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>
                      {selectedRequest.department_name || "Not assigned"}
                    </strong>
                  </div>

                </div>

                <div className="acr-description">
                  <span>Description</span>

                  <p>
                    {selectedRequest.description || "No description provided."}
                  </p>
                </div>

              </section>


              <section className="acr-detail-section">

                <h4>
                  <UserRound size={18} />
                  Citizen Information
                </h4>

                <div className="acr-detail-grid">

                  <div>
                    <span>Citizen</span>
                    <strong>
                      {getCitizenName(selectedRequest.citizen)}
                    </strong>
                  </div>

                  <div>
                    <span>Citizen ID</span>
                    <strong>
                      {typeof selectedRequest.citizen === "object"
                        ? selectedRequest.citizen?.id || "—"
                        : selectedRequest.citizen || "—"}
                    </strong>
                  </div>

                </div>

              </section>


              <section className="acr-detail-section">

                <h4>
                  <MapPin size={18} />
                  Location Information
                </h4>

                <div className="acr-detail-grid">

                  <div>
                    <span>Location</span>
                    <strong>
                      {selectedRequest.location || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Latitude</span>
                    <strong>
                      {selectedRequest.latitude ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Longitude</span>
                    <strong>
                      {selectedRequest.longitude ?? "—"}
                    </strong>
                  </div>

                </div>

                {selectedRequest.latitude != null &&
                  selectedRequest.longitude != null && (

                    <a
                      className="acr-map-link"
                      href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open location in Google Maps
                      <ExternalLink size={15} />
                    </a>

                  )}

              </section>


              <section className="acr-detail-section">

                <h4>
                  <ClipboardList size={18} />
                  Assignment Information
                </h4>

                <div className="acr-detail-grid">

                  <div>
                    <span>Assigned Staff</span>
                    <strong>
                      {selectedRequest.assigned_staff
                        ? typeof selectedRequest.assigned_staff === "object"
                          ? getCitizenName(selectedRequest.assigned_staff)
                          : `Staff #${selectedRequest.assigned_staff}`
                        : "Not assigned"}
                    </strong>
                  </div>

                  <div>
                    <span>Duplicate Review</span>
                    <strong>
                      {formatLabel(selectedRequest.duplicate_review_status)}
                    </strong>
                  </div>

                  <div>
                    <span>Duplicate Of</span>
                    <strong>
                      {selectedRequest.duplicate_of_id || "—"}
                    </strong>
                  </div>

                </div>

              </section>


              {/* RESOLUTION */}

              {selectedRequest.resolution && (

                <section className="acr-detail-section">

                  <h4>
                    <CheckCircle2 size={18} />
                    Resolution
                  </h4>

                  <div className="acr-description">

                    <span>Work Description</span>

                    <p>
                      {getResolutionDescription(
                        selectedRequest.resolution
                      ) || "No resolution description available."}
                    </p>

                    {typeof selectedRequest.resolution === "object" && (
                      <div className="acr-detail-grid">

                        {selectedRequest.resolution.staff && (
                          <div>
                            <span>Resolved By</span>
                            <strong>
                              {getCitizenName(
                                selectedRequest.resolution.staff
                              )}
                            </strong>
                          </div>
                        )}

                        {selectedRequest.resolution.resolved_at && (
                          <div>
                            <span>Resolved At</span>
                            <strong>
                              {formatDate(
                                selectedRequest.resolution.resolved_at
                              )}
                            </strong>
                          </div>
                        )}

                      </div>
                    )}

                  </div>

                </section>

              )}


              {/* IMAGES */}

              {Array.isArray(selectedRequest.images) &&
                selectedRequest.images.length > 0 && (

                  <section className="acr-detail-section">

                    <h4>
                      <ImageIcon size={18} />
                      Request Images
                    </h4>

                    <div className="acr-media-grid">

                      {selectedRequest.images.map((media, index) => {
                        const url = getMediaUrl(media);

                        if (!url) return null;

                        return (
                          <a
                            key={media.id || index}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={url}
                              alt={`Request ${selectedRequest.id}`}
                            />
                          </a>
                        );
                      })}

                    </div>

                  </section>

                )}


              {/* VIDEOS */}

              {Array.isArray(selectedRequest.videos) &&
                selectedRequest.videos.length > 0 && (

                  <section className="acr-detail-section">

                    <h4>
                      <Video size={18} />
                      Request Videos
                    </h4>

                    <div className="acr-video-list">

                      {selectedRequest.videos.map((media, index) => {
                        const url = getMediaUrl(media);

                        if (!url) return null;

                        return (
                          <video
                            key={media.id || index}
                            src={url}
                            controls
                          />
                        );
                      })}

                    </div>

                  </section>

                )}


              {/* RESOLUTION HISTORY */}

              {Array.isArray(selectedRequest.resolution_history) &&
                selectedRequest.resolution_history.length > 0 && (

                  <section className="acr-detail-section">

                    <h4>
                      <CalendarDays size={18} />
                      Resolution History
                    </h4>

                    <div className="acr-history-list">

                      {selectedRequest.resolution_history.map((item, index) => (

                        <article key={item.id || index}>

                          <strong>
                            {item.status
                              ? formatLabel(item.status)
                              : "Resolution update"}
                          </strong>

                          <p>
                            {getResolutionDescription(
                              item.resolution ||
                              item.work_description ||
                              item.description ||
                              item.notes
                            ) || "Update recorded."}
                          </p>

                          <small>
                            {formatDate(item.created_at)}
                          </small>

                        </article>

                      ))}

                    </div>

                  </section>

                )}

            </div>


            <div className="acr-modal-footer">

              <span>
                Read-only Super Admin view
              </span>

              <button onClick={closeDetails}>
                Close
              </button>

            </div>

          </section>

        </div>

      )}

    </div>
  );
}