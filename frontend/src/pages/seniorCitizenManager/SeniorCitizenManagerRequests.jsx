import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ChartNoAxesCombined,
  Bell,
  Mail,
  Activity,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  Clock,
  CheckCircle2,
  CircleAlert,
  UserRound,
  MapPin,
  CalendarDays,
  Eye,
  RefreshCw,
  Filter,
  ChevronDown,
  XCircle,
  UserPlus,
  Phone,
  FileText,
  HeartHandshake,
  ArrowRightLeft,
  ExternalLink,
  Headset,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";
import LocationMap from "../../components/LocationMap";

import useManagerUnreadNotifications from "./useManagerUnreadNotifications";

import "./SeniorCitizenManagerRequests.css";
import "./SeniorCitizenManagerDashboard.css";

const STATUS_OPTIONS = [
  "submitted",
  "transferred",
  "under_review",
  "approved",
  "rejected",
  "assigned",
  "in_progress",
  "completed",
  "closed",
];

const formatStatus = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (value) => {
  if (!value) return "Not provided";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatDateTime = (value) => {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const getLocationMethodLabel = (method) => {
  const normalized = String(method || "").toLowerCase();

  if (["live", "gps", "current", "live_location"].includes(normalized)) {
    return "Live / GPS location submitted with request";
  }

  if (["manual", "manually_entered"].includes(normalized)) {
    return "Manually entered location";
  }

  return method
    ? `Location method: ${formatStatus(method)}`
    : "Location method not provided";
};

const getWorkflowEvents = (request) => {
  const events = [];

  if (request.created_at) {
    events.push({
      label: "Request submitted",
      date: request.created_at,
    });
  }

  if (request.updated_at && request.updated_at !== request.created_at) {
    events.push({
      label: `Last updated · ${formatStatus(request.status)}`,
      date: request.updated_at,
    });
  }

  if (request.completed_at) {
    events.push({
      label: "Marked completed",
      date: request.completed_at,
    });
  }

  if (request.verified_at) {
    events.push({
      label: "Verified",
      date: request.verified_at,
    });
  }

  return events;
};

const toLocalDateTimeMinimum = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
};

const toISODateTime = (value) =>
  new Date(value).toISOString();

function StatusBadge({ status, isTransferred = false }) {
  const displayStatus = isTransferred
    ? "Transferred Request"
    : formatStatus(status);

  return (
    <span
      className={`scr-status ${
        isTransferred
          ? "scr-status-transferred"
          : `scr-status-${status || "unknown"}`
      }`}
    >
      <span />
      {displayStatus}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className="scr-stat-card">
      <div className={`scr-stat-icon ${tone}`}>
        <Icon size={21} />
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </article>
  );
}

export default function SeniorCitizenManagerRequests() {
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useManagerUnreadNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [managers, setManagers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);

  const [transferForm, setTransferForm] = useState({
    manager_id: "",
    note: "",
  });

  const [actionLoading, setActionLoading] = useState(false);

  const [assignment, setAssignment] = useState({
    staff_id: "",
    deadline: "",
    estimated_arrival: "",
  });

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
  ];

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/senior-citizen/");

      setRequests(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.get("/senior-citizen/staff/");

      setStaff(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Unable to load Senior Citizen Staff:", err);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadStaff();
  }, [loadRequests, loadStaff]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const searchText = search.toLowerCase();

      const matchesSearch = [
        request.id,
        request.full_name,
        request.phone_number,
        request.applicant_name,
      ].some((value) =>
        String(value || "").toLowerCase().includes(searchText)
      );

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        String(request.priority || "").toLowerCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, search, statusFilter, priorityFilter]);

  const counts = useMemo(
    () => ({
      total: requests.length,

      pending: requests.filter(
        (r) => ["submitted", "under_review"].includes(r.status)
      ).length,

      approved: requests.filter(
        (r) => r.status === "approved"
      ).length,

      assigned: requests.filter(
        (r) => ["assigned", "in_progress"].includes(r.status)
      ).length,
    }),
    [requests]
  );

  const staffName = (person) => {
    if (!person) return "Not assigned";

    const firstName =
      person.first_name || person.user?.first_name || "";

    const lastName =
      person.last_name || person.user?.last_name || "";

    const fullName = `${firstName} ${lastName}`.trim();

    return (
      fullName ||
      person.email ||
      person.user?.email ||
      "Staff member"
    );
  };

  const getStaffUserId = (person) => {
    if (!person) return "";

    if (
      typeof person.user === "number" ||
      typeof person.user === "string"
    ) {
      return person.user;
    }

    return person.user?.id || person.user_id || "";
  };

  const performAction = async (request, action, extra = {}) => {
    const messages = {
      review: "Start reviewing this assistance request?",
      approve: "Approve this assistance request?",
      reject: "Reject this assistance request?",
    };

    if (messages[action] && !window.confirm(messages[action])) return;

    setActionLoading(true);

    try {
      const response = await api.post(
        `/senior-citizen/${request.id}/action/`,
        { action, ...extra }
      );

      const responseRequest =
        response.data?.request ||
        response.data?.data?.request ||
        null;

      const nextStatus =
        action === "review"
          ? "under_review"
          : action === "approve"
          ? "approved"
          : action === "reject"
          ? "rejected"
          : action === "assign"
          ? "assigned"
          : request.status;

      let assignmentFields = {};

      if (action === "assign") {
        const selectedStaff = staff.find((person) => {
          const personId =
            person.user?.id || person.user_id || person.id;

          return String(personId) === String(extra.staff_id);
        });

        const user = selectedStaff?.user || selectedStaff || {};
        const profile = selectedStaff?.profile || selectedStaff || {};

        assignmentFields = {
          assigned_staff: extra.staff_id,
          assigned_staff_full_name: staffName(selectedStaff),
          assigned_staff_email: user.email || "",
          assigned_staff_phone_number:
            profile.phone_number || profile.phone || "",
          deadline: extra.deadline,
          estimated_arrival: extra.estimated_arrival,
        };
      }

      const updatedRequest = {
        ...request,
        ...assignmentFields,
        ...(responseRequest || {}),
        ...extra,
        status: responseRequest?.status || nextStatus,
      };

      setRequests((current) =>
        current.map((item) =>
          String(item.id) === String(request.id)
            ? { ...item, ...updatedRequest }
            : item
        )
      );

      setSelectedRequest((current) =>
        current && String(current.id) === String(request.id)
          ? { ...current, ...updatedRequest }
          : current
      );

      if (action !== "review") {
        setDetailsOpen(false);
        setAssignOpen(false);
        setSelectedRequest(null);
      }

      window.alert("Request updated successfully.");
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = async (request) => {
    setSelectedRequest(request);
    setDetailsOpen(true);

    try {
      const [detailResponse, historyResponse] =
        await Promise.allSettled([
          api.get(`/senior-citizen/${request.id}/`),
          api.get(`/senior-citizen/${request.id}/transfer-history/`),
        ]);

      if (detailResponse.status === "fulfilled") {
        setSelectedRequest(
          detailResponse.value.data?.request ||
          detailResponse.value.data
        );
      }

      if (historyResponse.status === "fulfilled") {
        const historyData = historyResponse.value.data;

        setTransferHistory(
          Array.isArray(historyData)
            ? historyData
            : historyData?.results || []
        );
      } else {
        setTransferHistory([]);
      }
    } catch (err) {
      console.error("Unable to load request details:", err);
    }
  };

  const openAssignModal = (request) => {
    setSelectedRequest(request);

    setAssignment({
      staff_id: "",
      deadline: "",
      estimated_arrival: "",
    });

    setAssignOpen(true);
  };

  const submitAssignment = async (event) => {
    event.preventDefault();

    if (
      !assignment.staff_id ||
      !assignment.deadline ||
      !assignment.estimated_arrival
    ) {
      window.alert("Please complete all assignment fields.");
      return;
    }

    if (
      new Date(assignment.deadline) <= new Date() ||
      new Date(assignment.estimated_arrival) <= new Date()
    ) {
      window.alert(
        "Deadline and estimated arrival must be in the future."
      );
      return;
    }

    if (
      new Date(assignment.deadline) <
      new Date(assignment.estimated_arrival)
    ) {
      window.alert(
        "The task deadline cannot be earlier than the estimated arrival time."
      );
      return;
    }

    await performAction(selectedRequest, "assign", {
      staff_id: Number(assignment.staff_id),
      deadline: toISODateTime(assignment.deadline),
      estimated_arrival: toISODateTime(
        assignment.estimated_arrival
      ),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    navigate("/senior-citizen/manager/login");
  };

  const openTransferModal = async () => {
    setTransferForm({ manager_id: "", note: "" });
    setTransferHistory([]);
    setTransferOpen(true);

    try {
      const [managerResponse, historyResponse] =
        await Promise.all([
          api.get("/senior-citizen/managers/"),
          api.get(
            `/senior-citizen/${selectedRequest.id}/transfer-history/`
          ),
        ]);

      setManagers(
        Array.isArray(managerResponse.data)
          ? managerResponse.data
          : []
      );

      setTransferHistory(
        Array.isArray(historyResponse.data)
          ? historyResponse.data
          : []
      );
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const submitTransfer = async (event) => {
    event.preventDefault();

    if (
      !transferForm.manager_id ||
      !transferForm.note.trim()
    ) {
      window.alert(
        "Select a manager and enter a transfer reason."
      );
      return;
    }

    setActionLoading(true);

    try {
      const transferResponse = await api.post(
        `/senior-citizen/${selectedRequest.id}/transfer/`,
        {
          manager_id: Number(transferForm.manager_id),
          note: transferForm.note.trim(),
        }
      );

      const transferredRequest = {
        ...selectedRequest,
        assigned_manager: Number(transferForm.manager_id),
        status: transferResponse.data?.status || "transferred",
        is_transferred: true,
      };

      setRequests((current) =>
        current.map((item) =>
          String(item.id) === String(selectedRequest.id)
            ? { ...item, ...transferredRequest }
            : item
        )
      );

      setTransferOpen(false);
      setDetailsOpen(false);
      setSelectedRequest(null);

      window.alert(
        "Request transferred successfully. The previous manager, new manager and citizen have been notified."
      );
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="sc-dashboard scr-page">
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =========================================
          MANAGER DASHBOARD SHARED SIDEBAR
      ========================================= */}

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
            type="button"
            className="sc-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <p className="sc-sidebar-label">WORKSPACE</p>

        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <button
                type="button"
                key={item.name}
                className={`sc-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {item.name === "Notifications" && unreadCount > 0 && (
                  <span className="sc-nav-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              "/senior-citizen/manager/messages"
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate("/senior-citizen/manager/messages");
              setSidebarOpen(false);
            }}
          >
            <Mail size={19} />
            <span>Messages</span>
          </button>

          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              "/senior-citizen/manager/work-management"
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate("/senior-citizen/manager/work-management");
              setSidebarOpen(false);
            }}
          >
            <Activity size={19} />
            <span>Work Management</span>
          </button>
        </nav>

        <p className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </p>

        <nav className="sc-nav">
          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              "/senior-citizen/manager/profile"
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate("/senior-citizen/manager/profile");
              setSidebarOpen(false);
            }}
          >
            <UserRound size={19} />
            <span>Manager Profile</span>
          </button>
        </nav>

        <div className="sc-sidebar-bottom">
          <div className="sc-help-card">
            <div className="sc-help-icon">
              <Headset size={20} />
            </div>

            <h4>Need assistance?</h4>
            <p>Contact the CivicFix support team.</p>
          </div>

          <button
            type="button"
            className="sc-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================================
          MAIN CONTENT - EXISTING REQUESTS PAGE
      ========================================= */}

      <main className="scr-main">
        <header className="scr-topbar">
          <button
            className="scr-mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="scr-breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>Assistance Requests</strong>
            <h2>Assistance Requests</h2>
          </div>

          <div className="scr-manager">
            <div className="scr-avatar">SM</div>
            <div>
              <strong>Manager</strong>
              <span>Senior Citizen Manager</span>
            </div>
          </div>
        </header>

        <section className="scr-content">
          <div className="scr-page-heading">
            <div>
              <span className="scr-eyebrow">
                <i /> REQUEST MANAGEMENT
              </span>

              <h1>Assistance Requests</h1>

              <p>
                Review, manage and coordinate senior citizen assistance
                requests in your assigned district.
              </p>
            </div>

            <button
              className="scr-refresh"
              onClick={() => {
                loadRequests();
                loadStaff();
              }}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="scr-stats">
            <StatCard
              icon={ClipboardList}
              label="Total Requests"
              value={counts.total}
              tone="blue"
            />

            <StatCard
              icon={Clock}
              label="Pending Review"
              value={counts.pending}
              tone="orange"
            />

            <StatCard
              icon={CheckCircle2}
              label="Approved Requests"
              value={counts.approved}
              tone="green"
            />

            <StatCard
              icon={Users}
              label="Assigned / In Progress"
              value={counts.assigned}
              tone="purple"
            />
          </div>

          <section className="scr-table-card">
            <div className="scr-table-heading">
              <div>
                <h2>All Assistance Requests</h2>
                <p>Manage requests submitted by senior citizens.</p>
              </div>

              <span className="scr-result-count">
                {filteredRequests.length} Requests
              </span>
            </div>

            <div className="scr-filters">
              <div className="scr-search">
                <Search size={18} />

                <input
                  placeholder="Search ID, name or phone number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <label className="scr-filter">
                <Filter size={16} />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>

                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>

                <ChevronDown size={15} />
              </label>

              <label className="scr-filter">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <ChevronDown size={15} />
              </label>
            </div>

            {error && (
              <div className="scr-error">
                <CircleAlert size={18} />
                {error}
                <button onClick={loadRequests}>Retry</button>
              </div>
            )}

            <div className="scr-table-wrap">
              <table className="scr-table">
                <thead>
                  <tr>
                    <th>REQUEST</th>
                    <th>SENIOR CITIZEN</th>
                    <th>ASSISTANCE TYPE</th>
                    <th>PRIORITY</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="scr-empty">
                        <RefreshCw className="scr-spin" size={22} />
                        <span>Loading assistance requests...</span>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="scr-empty">
                        <ClipboardList size={28} />
                        <strong>No assistance requests found</strong>
                        <span>Try changing your search or filters.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong className="scr-request-id">
                            SC-{String(request.id).padStart(4, "0")}
                          </strong>
                          <small>Request #{request.id}</small>
                        </td>

                        <td>
                          <strong>
                            {request.full_name || "Not provided"}
                          </strong>
                          <small>
                            {request.phone_number || "No phone"}
                          </small>
                        </td>

                        <td>{formatStatus(request.assistance_type)}</td>

                        <td>
                          <span
                            className={`scr-priority ${String(
                              request.priority
                            ).toLowerCase()}`}
                          >
                            {formatStatus(request.priority)}
                          </span>
                        </td>

                        <td>{formatDate(request.created_at)}</td>

                        <td>
                          <StatusBadge
                            status={request.status}
                            isTransferred={request.is_transferred}
                          />
                        </td>

                        <td>
                          <button
                            className="scr-view-button"
                            onClick={() => openDetails(request)}
                            title="View details"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      {/* =========================================
          REQUEST DETAILS MODAL
      ========================================= */}

      {detailsOpen && selectedRequest && (
        <div
          className="scr-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailsOpen(false);
          }}
        >
          <section className="scr-modal scr-details-modal">
            <div className="scr-modal-header">
              <div>
                <span>REQUEST DETAILS</span>
                <h2>Assistance Request #{selectedRequest.id}</h2>
              </div>

              <button onClick={() => setDetailsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="scr-modal-body">
              <div className="scr-detail-status">
                <StatusBadge
                  status={selectedRequest.status}
                  isTransferred={
                    selectedRequest.is_transferred ||
                    selectedRequest.status === "transferred"
                  }
                />

                <span>
                  Submitted {formatDate(selectedRequest.created_at)}
                </span>
              </div>

              <h3>Senior Citizen Information</h3>

              <div className="scr-detail-grid">
                <div>
                  <UserRound size={17} />
                  <span>
                    <small>Full Name</small>
                    <strong>
                      {selectedRequest.full_name || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <Phone size={17} />
                  <span>
                    <small>Phone Number</small>
                    <strong>
                      {selectedRequest.phone_number || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <CalendarDays size={17} />
                  <span>
                    <small>Age</small>
                    <strong>
                      {selectedRequest.age || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <MapPin size={17} />
                  <span>
                    <small>District</small>
                    <strong>
                      {selectedRequest.district || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <span>
                    <small>Email</small>
                    <strong>
                      {selectedRequest.citizen_email || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <span>
                    <small>State</small>
                    <strong>
                      {selectedRequest.state ||
                        selectedRequest.detected_state ||
                        "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <span>
                    <small>Applicant / Contact Person</small>
                    <strong>
                      {selectedRequest.applicant_name || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <span>
                    <small>Applicant Phone</small>
                    <strong>
                      {selectedRequest.applicant_phone || "Not provided"}
                    </strong>
                  </span>
                </div>

                <div>
                  <span>
                    <small>Relationship to Applicant</small>
                    <strong>
                      {selectedRequest.applicant_relationship
                        ? formatStatus(
                            selectedRequest.applicant_relationship
                          )
                        : "Not provided"}
                    </strong>
                  </span>
                </div>
              </div>

              <h3>Assistance Information</h3>

              <div className="scr-detail-block">
                <small>Assistance Type</small>
                <strong>
                  {formatStatus(selectedRequest.assistance_type)}
                </strong>
              </div>

              <div className="scr-detail-block">
                <small>Description</small>
                <p>
                  {selectedRequest.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="scr-detail-block">
                <small>Address</small>
                <p>{selectedRequest.address || "Not provided"}</p>
              </div>

              <div className="scr-detail-block">
                <small>Pickup Location</small>
                <p>
                  {selectedRequest.pickup_location || "Not provided"}
                </p>
              </div>

              <div className="scr-detail-block">
                <small>Destination</small>
                <p>
                  {selectedRequest.destination || "Not provided"}
                </p>
              </div>

              <div className="scr-detail-block">
                <small>Preferred Date &amp; Time</small>
                <p>
                  {formatDateTime(selectedRequest.preferred_datetime)}
                </p>
              </div>

              <h3>Submitted Current Location</h3>

              <div className="scr-detail-block scr-location-block">
                <small>
                  {getLocationMethodLabel(
                    selectedRequest.location_method
                  )}
                </small>

                <p>
                  {selectedRequest.current_location ||
                    "No separate current location was submitted."}
                </p>

                {selectedRequest.latitude != null &&
                  selectedRequest.longitude != null &&
                  Number.isFinite(Number(selectedRequest.latitude)) &&
                  Number.isFinite(Number(selectedRequest.longitude)) &&
                  Math.abs(Number(selectedRequest.latitude)) <= 90 &&
                  Math.abs(Number(selectedRequest.longitude)) <= 180 && (
                    <>
                      <p className="scr-coordinate-row">
                        <span>
                          Latitude: {selectedRequest.latitude} · Longitude:{" "}
                          {selectedRequest.longitude}
                        </span>

                        <a
                          href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={13} /> Open Google Maps
                        </a>
                      </p>

                      <div className="scr-location-map-wrap">
                        <LocationMap
                          latitude={selectedRequest.latitude}
                          longitude={selectedRequest.longitude}
                          title="Submitted assistance request location"
                          readOnly
                        />
                      </div>
                    </>
                  )}

                {selectedRequest.location_mismatch && (
                  <p className="scr-warning-note">
                    Location verification warning: submitted district and
                    detected location may differ.
                  </p>
                )}
              </div>

              {selectedRequest.location_mismatch && (
                <div className="scr-location-mismatch" role="status">
                  <strong>
                    <CircleAlert size={16} /> Location mismatch warning
                  </strong>

                  <p>
                    The submitted address/location and detected location may
                    not match. This is a location-verification warning only;
                    it does not confirm that this request is a duplicate.
                  </p>

                  {selectedRequest.mismatch_status && (
                    <small>
                      Verification status:{" "}
                      {formatStatus(selectedRequest.mismatch_status)}
                    </small>
                  )}

                  {selectedRequest.detected_state && (
                    <small>
                      Detected state: {selectedRequest.detected_state}
                    </small>
                  )}

                  {selectedRequest.detected_district && (
                    <small>
                      Detected district:{" "}
                      {selectedRequest.detected_district}
                    </small>
                  )}
                </div>
              )}

              <h3>Transfer History</h3>

              <div className="scr-detail-block">
                <small>Previous manager transfers</small>

                {transferHistory.length > 0 ? (
                  transferHistory.map((item) => (
                    <p key={item.id}>
                      {item.from_manager_name ||
                        item.from_manager_email ||
                        "Previous manager"}{" "}
                      →{" "}
                      {item.to_manager_name ||
                        item.to_manager_email ||
                        "New manager"}{" "}
                      · {formatDate(item.created_at)} ·{" "}
                      {item.note || "No note"}
                    </p>
                  ))
                ) : (
                  <p>
                    No transfer history has been recorded for this request.
                  </p>
                )}
              </div>

              {selectedRequest.applicant_name && (
                <div className="scr-detail-block">
                  <small>Applicant / Contact Person</small>
                  <p>
                    {selectedRequest.applicant_name}
                    {selectedRequest.applicant_phone
                      ? ` · ${selectedRequest.applicant_phone}`
                      : ""}
                  </p>
                </div>
              )}

              {selectedRequest.image && (
                <>
                  <h3>Supporting Image</h3>

                  <div className="scr-image-list">
                    <a
                      href={selectedRequest.image}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={selectedRequest.image}
                        alt="Senior citizen request attachment"
                      />
                    </a>
                  </div>
                </>
              )}

              {Array.isArray(selectedRequest.images) &&
                selectedRequest.images.length > 0 && (
                  <>
                    <h3>Uploaded Images</h3>

                    <div className="scr-image-list">
                      {selectedRequest.images.map((image, index) => (
                        <a
                          key={image.id || index}
                          href={image.image || image.image_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={image.image || image.image_url}
                            alt={`Request attachment ${index + 1}`}
                          />
                        </a>
                      ))}
                    </div>
                  </>
                )}

              <h3>Assignment Details</h3>

              <div className="scr-detail-block scr-assigned-details">
                <small>Assigned Staff</small>

                <strong>
                  {selectedRequest.assigned_staff_full_name ||
                    (selectedRequest.assigned_staff
                      ? staffName(
                          staff.find(
                            (s) =>
                              String(
                                s.user?.id || s.user_id || s.id
                              ) ===
                              String(selectedRequest.assigned_staff)
                          )
                        )
                      : "Not assigned")}
                </strong>

                {selectedRequest.assigned_staff_email && (
                  <p>{selectedRequest.assigned_staff_email}</p>
                )}

                {selectedRequest.assigned_staff_phone_number && (
                  <p>{selectedRequest.assigned_staff_phone_number}</p>
                )}

                <div className="scr-assignment-dates">
                  <div>
                    <small>Estimated Arrival</small>
                    <strong>
                      {formatDateTime(
                        selectedRequest.estimated_arrival
                      )}
                    </strong>
                  </div>

                  <div>
                    <small>Task Deadline</small>
                    <strong>
                      {formatDateTime(selectedRequest.deadline)}
                    </strong>
                  </div>
                </div>
              </div>

              <h3>Request Workflow</h3>

              <div className="scr-workflow-timeline">
                {getWorkflowEvents(selectedRequest).length ? (
                  getWorkflowEvents(selectedRequest).map(
                    (event, index) => (
                      <div
                        className="scr-workflow-event"
                        key={`${event.label}-${index}`}
                      >
                        <span className="scr-workflow-dot" />

                        <div>
                          <strong>{event.label}</strong>
                          <small>{formatDateTime(event.date)}</small>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <p>No workflow timestamps are available.</p>
                )}

                <div className="scr-workflow-current">
                  Current status:{" "}
                  <StatusBadge status={selectedRequest.status} />
                </div>

                <p className="scr-form-note">
                  The supplied API returns request timestamps, but does not
                  expose a complete status-history feed. This timeline shows
                  only events supported by the returned data.
                </p>
              </div>
            </div>

            <div className="scr-modal-actions">
              {["submitted", "transferred"].includes(
                selectedRequest.status
              ) && (
                <>
                  <button
                    className="scr-reject-button"
                    disabled={actionLoading}
                    onClick={() =>
                      performAction(selectedRequest, "reject")
                    }
                  >
                    <XCircle size={16} /> Reject
                  </button>

                  <button
                    className="scr-secondary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      performAction(selectedRequest, "review")
                    }
                  >
                    <Eye size={16} /> Start Review
                  </button>
                </>
              )}

              {selectedRequest.status === "under_review" && (
                <>
                  <button
                    className="scr-reject-button"
                    disabled={actionLoading}
                    onClick={() =>
                      performAction(selectedRequest, "reject")
                    }
                  >
                    <XCircle size={16} /> Reject
                  </button>

                  <button
                    className="scr-primary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      performAction(selectedRequest, "approve")
                    }
                  >
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </>
              )}

              {selectedRequest.status === "approved" && (
                <button
                  className="scr-primary-button"
                  onClick={() => {
                    setDetailsOpen(false);
                    openAssignModal(selectedRequest);
                  }}
                >
                  <UserPlus size={17} /> Assign Staff
                </button>
              )}

              <button
                className="scr-secondary-button"
                disabled={actionLoading}
                onClick={openTransferModal}
              >
                <ArrowRightLeft size={16} /> Transfer Request
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================
          TRANSFER MODAL
      ========================================= */}

      {transferOpen && selectedRequest && (
        <div
          className="scr-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTransferOpen(false);
          }}
        >
          <section className="scr-modal scr-assign-modal">
            <div className="scr-modal-header">
              <div>
                <span>MANAGER TRANSFER</span>
                <h2>Transfer Request #{selectedRequest.id}</h2>
              </div>

              <button
                type="button"
                onClick={() => setTransferOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitTransfer}>
              <div className="scr-modal-body">
                <label className="scr-form-field">
                  Destination Senior Citizen Manager *

                  <select
                    required
                    value={transferForm.manager_id}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        manager_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Choose another manager</option>

                    {managers
                      .filter(
                        (m) =>
                          String(m.id) !==
                          String(selectedRequest.assigned_manager)
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name || m.email}
                          {m.district ? ` · ${m.district}` : ""}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="scr-form-field">
                  Reason for transfer *

                  <textarea
                    required
                    rows="4"
                    value={transferForm.note}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        note: e.target.value,
                      })
                    }
                    placeholder="Explain why this request is being transferred..."
                  />
                </label>

                <p className="scr-form-note">
                  The request, status, attachments and existing staff
                  assignment remain attached to this request. The previous
                  manager, destination manager and citizen will be notified.
                </p>

                {transferHistory.length > 0 && (
                  <div className="scr-transfer-history">
                    <strong>Previous transfers</strong>

                    {transferHistory.map((h) => (
                      <p key={h.id}>
                        {h.from_manager_name ||
                          h.from_manager_email ||
                          "Unassigned"}{" "}
                        →{" "}
                        {h.to_manager_name ||
                          h.to_manager_email ||
                          "New manager"}{" "}
                        · {formatDate(h.created_at)} ·{" "}
                        {h.note || "No note"}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="scr-modal-actions">
                <button
                  type="button"
                  className="scr-secondary-button"
                  onClick={() => setTransferOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="scr-primary-button"
                  disabled={actionLoading}
                >
                  <ArrowRightLeft size={16} />
                  {actionLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* =========================================
          STAFF ASSIGNMENT MODAL
      ========================================= */}

      {assignOpen && selectedRequest && (
        <div
          className="scr-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAssignOpen(false);
          }}
        >
          <section className="scr-modal scr-assign-modal">
            <div className="scr-modal-header">
              <div>
                <span>STAFF ASSIGNMENT</span>
                <h2>Assign Senior Citizen Staff</h2>
              </div>

              <button onClick={() => setAssignOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitAssignment}>
              <div className="scr-modal-body">
                <div className="scr-assignment-summary">
                  <FileText size={19} />

                  <div>
                    <strong>Request #{selectedRequest.id}</strong>
                    <span>{selectedRequest.full_name}</span>
                  </div>
                </div>

                <label className="scr-form-field">
                  Select Staff Member *

                  <select
                    required
                    value={assignment.staff_id}
                    onChange={(e) =>
                      setAssignment({
                        ...assignment,
                        staff_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Choose available staff</option>

                    {staff
                      .filter(
                        (person) =>
                          person.is_active === true &&
                          person.account_is_active === true
                      )
                      .map((person) => {
                        const userId = getStaffUserId(person);

                        return (
                          <option key={userId} value={userId}>
                            {staffName(person)}
                            {person.designation
                              ? ` — ${person.designation}`
                              : ""}
                          </option>
                        );
                      })}
                  </select>
                </label>

                {(() => {
                  const selectedStaff = staff.find(
                    (person) =>
                      String(getStaffUserId(person)) ===
                      String(assignment.staff_id)
                  );

                  if (!selectedStaff) return null;

                  return (
                    <div className="scr-selected-staff-card">
                      <strong>Selected Staff Details</strong>

                      <p>{staffName(selectedStaff)}</p>

                      <small>
                        Email: {selectedStaff.email || "Not provided"}
                      </small>

                      <small>
                        Phone: {selectedStaff.phone_number || "Not provided"}
                      </small>

                      <small>
                        Designation:{" "}
                        {selectedStaff.designation || "Not provided"}
                      </small>

                      <small>
                        Location: {selectedStaff.location || "Not provided"}
                      </small>
                    </div>
                  );
                })()}

                <label className="scr-form-field">
                  Estimated Arrival *

                  <input
                    type="datetime-local"
                    required
                    min={toLocalDateTimeMinimum()}
                    value={assignment.estimated_arrival}
                    onChange={(e) =>
                      setAssignment({
                        ...assignment,
                        estimated_arrival: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="scr-form-field">
                  Task Completion Deadline *

                  <input
                    type="datetime-local"
                    required
                    min={toLocalDateTimeMinimum()}
                    value={assignment.deadline}
                    onChange={(e) =>
                      setAssignment({
                        ...assignment,
                        deadline: e.target.value,
                      })
                    }
                  />
                </label>

                <p className="scr-form-note">
                  Both date and time values are required by the CivicFix
                  assignment API.
                </p>
              </div>

              <div className="scr-modal-actions">
                <button
                  type="button"
                  className="scr-secondary-button"
                  onClick={() => setAssignOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="scr-primary-button"
                  disabled={actionLoading}
                >
                  <UserPlus size={17} />
                  {actionLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}