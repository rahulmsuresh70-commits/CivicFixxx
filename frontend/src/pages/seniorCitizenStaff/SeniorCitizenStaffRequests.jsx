import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  Mail,
  UserRound,
  LogOut,
  Menu,
  X,
  Search,
  RefreshCw,
  Eye,
  MapPin,
  Phone,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  User,
  FileText,
  MessageSquare,
  Send,
  ArrowRight,
  Navigation,
  Image as ImageIcon,
  ShieldCheck,
  ClipboardCheck,
  CircleAlert,
  ChevronRight,
  ExternalLink,
  XCircle,
  Truck,
  HeartHandshake,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffRequests.css";

/* =========================================
   CONSTANTS
========================================= */

const BASE = "/senior-citizen/";

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  in_progress: "In Progress",
  on_the_way: "On The Way",
  arrived: "Arrived",
  pickup_completed: "Pickup Completed",
  in_transit: "In Transit",
  completed: "Completed",
  closed: "Closed",
};

const ASSISTANCE_LABELS = {
  medical: "Medical Assistance",
  daily_living: "Daily Living",
  food: "Food Assistance",
  mobility: "Mobility Assistance",
  other: "Other",
};

const PRIORITY_LABELS = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/*
  Only the assigned staff member's workflow actions.

  Manager actions such as review, approve, reject,
  assign and close are intentionally excluded.
*/

const STAFF_WORKFLOW = {
  assigned: {
    action: "start",
    next: "in_progress",
    label: "Start Assistance",
    description:
      "Confirm that you are starting this assistance request.",
    icon: Activity,
    color: "primary",
  },

  in_progress: {
    action: "on_the_way",
    next: "on_the_way",
    label: "I'm On The Way",
    description:
      "Update the citizen that you are travelling to the pickup location.",
    icon: Navigation,
    color: "info",
    secondary: {
      action: "complete",
      next: "completed",
      label: "Complete Assistance",
    },
  },

  on_the_way: {
    action: "arrived",
    next: "arrived",
    label: "Mark Arrived",
    description:
      "Confirm that you have arrived at the pickup location.",
    icon: MapPin,
    color: "primary",
  },

  arrived: {
    action: "pickup_completed",
    next: "pickup_completed",
    label: "Complete Pickup",
    description:
      "Confirm that the senior citizen pickup has been completed.",
    icon: ClipboardCheck,
    color: "primary",
  },

  pickup_completed: {
    action: "in_transit",
    next: "in_transit",
    label: "Start Transit",
    description:
      "Confirm that the senior citizen is now in transit.",
    icon: Truck,
    color: "primary",
  },

  in_transit: {
    action: "complete",
    next: "completed",
    label: "Complete Assistance",
    description:
      "Submit the completion update for this request.",
    icon: CheckCircle2,
    color: "success",
  },
};

/* =========================================
   HELPERS
========================================= */

const getArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getError = (error) => {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  return getApiErrorMessage(error);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatStatus = (status) => {
  return (
    STATUS_LABELS[status] ||
    String(status || "Unknown").replaceAll("_", " ")
  );
};

const formatAssistance = (value) => {
  return (
    ASSISTANCE_LABELS[value] ||
    String(value || "—").replaceAll("_", " ")
  );
};

const formatPriority = (value) => {
  return (
    PRIORITY_LABELS[value] ||
    String(value || "Normal")
  );
};

const getFullName = (user) => {
  const name = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user?.email || "Staff Member";
};

const getInitials = (user) => {
  const name = getFullName(user);

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getImageUrl = (value) => {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const baseURL = api.defaults.baseURL || "";

  const origin = baseURL.replace(/\/api\/?$/, "");

  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
};

const getActionError = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return getError(error);
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  const messages = Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }

      if (typeof value === "string") {
        return `${key}: ${value}`;
      }

      return "";
    })
    .filter(Boolean);

  return messages.join(" ") || getError(error);
};

/* =========================================
   STATUS BADGE
========================================= */

function RequestStatus({ status }) {
  return (
    <span
      className={`scr-status scr-status-${String(
        status || "unknown"
      ).replaceAll("_", "-")}`}
    >
      <span className="scr-status-dot" />

      {formatStatus(status)}
    </span>
  );
}

/* =========================================
   FIELD COMPONENT
========================================= */

function DetailField({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="scr-detail-field">
      <div className="scr-detail-field-icon">
        <Icon size={17} />
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {value || "—"}
        </strong>
      </div>
    </div>
  );
}

/* =========================================
   MAIN COMPONENT
========================================= */

export default function SeniorCitizenStaffRequests() {
  const navigate = useNavigate();

  const location = useLocation();

  /* =========================================
     AUTHENTICATION
  ========================================= */

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =========================================
     REQUEST LIST STATES
  ========================================= */

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [priorityFilter, setPriorityFilter] = useState("all");

  /* =========================================
     SELECTED REQUEST
  ========================================= */

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [detailError, setDetailError] = useState("");

  /* =========================================
     CONVERSATION
  ========================================= */

  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState("");

  const [messagesLoading, setMessagesLoading] = useState(false);

  const [sendingMessage, setSendingMessage] = useState(false);

  const [messageError, setMessageError] = useState("");

  /* =========================================
     ISSUE REPORTS
  ========================================= */

  const [issues, setIssues] = useState([]);

  const [issuesLoading, setIssuesLoading] = useState(false);

  const [issuesError, setIssuesError] = useState("");

  /* =========================================
     WORKFLOW
  ========================================= */

  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  const [completionNotes, setCompletionNotes] = useState("");

  const [showCompletionForm, setShowCompletionForm] =
    useState(false);

  /* =========================================
     AUTH CHECK
  ========================================= */

  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem(
      "civicfix_access_token"
    );

    if (!token) {
      navigate("/senior-citizen/staff/login", {
        replace: true,
      });

      return false;
    }

    let storedUser = null;

    try {
      storedUser = JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      storedUser = null;
    }

    if (
      storedUser?.role &&
      storedUser.role !== "senior_citizen_staff"
    ) {
      navigate("/senior-citizen/staff/login", {
        replace: true,
      });

      return false;
    }

    return true;
  }, [navigate]);

  /* =========================================
     LOAD CURRENT USER
  ========================================= */

  const loadUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me/");

      const currentUser = response.data;

      if (
        currentUser?.role &&
        currentUser.role !== "senior_citizen_staff"
      ) {
        throw new Error("Unauthorized staff account.");
      }

      setUser(currentUser);

      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(currentUser)
      );
    } catch (err) {
      console.error("Staff profile loading failed:", err);
    }
  }, []);

  /* =========================================
     LOAD ASSIGNED REQUESTS
  ========================================= */

  const loadRequests = useCallback(
    async (quiet = false) => {
      if (!checkAuthentication()) {
        setLoading(false);
        return;
      }

      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        /*
          Backend automatically filters:
          assigned_staff = request.user

          No client-side staff ID filtering is required.
        */

        const response = await api.get(BASE);

        const data = getArray(response.data);

        setRequests(data);
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checkAuthentication]
  );

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    if (!checkAuthentication()) return;

    loadRequests();
    loadUser();
  }, [checkAuthentication, loadRequests, loadUser]);

  /* =========================================
     FILTERED REQUESTS
  ========================================= */

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const searchable = [
        request.id,
        request.full_name,
        request.phone_number,
        request.assistance_type,
        request.district,
        request.state,
        request.address,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      const searchMatch =
        !query || searchable.includes(query);

      const statusMatch =
        statusFilter === "all" ||
        request.status === statusFilter;

      const priorityMatch =
        priorityFilter === "all" ||
        request.priority === priorityFilter;

      return (
        searchMatch &&
        statusMatch &&
        priorityMatch
      );
    });
  }, [
    requests,
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* =========================================
     REQUEST STATISTICS
  ========================================= */

  const stats = useMemo(() => {
    return {
      total: requests.length,

      assigned: requests.filter(
        (item) => item.status === "assigned"
      ).length,

      active: requests.filter((item) =>
        [
          "in_progress",
          "on_the_way",
          "arrived",
          "pickup_completed",
          "in_transit",
        ].includes(item.status)
      ).length,

      completed: requests.filter(
        (item) => item.status === "completed"
      ).length,

      urgent: requests.filter(
        (item) => item.priority === "urgent"
      ).length,
    };
  }, [requests]);

  /* =========================================
     LOAD REQUEST DETAILS
  ========================================= */

  const openRequest = async (request) => {
    setSelectedRequest(request);

    setDetailLoading(true);

    setDetailError("");

    setActionError("");

    setMessages([]);
    setIssues([]);

    setMessageError("");
    setIssuesError("");

    setMessageText("");

    setShowCompletionForm(false);

    setCompletionNotes("");

    try {
      const response = await api.get(
        `${BASE}${request.id}/`
      );

      setSelectedRequest(response.data);

      /*
        Request detail, messages and issues are loaded
        independently. A message or issue endpoint failure
        must not prevent the request details from displaying.
      */

      await Promise.allSettled([
        loadMessages(request.id),
        loadIssues(request.id),
      ]);
    } catch (err) {
      setDetailError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  /* =========================================
     LOAD REQUEST CONVERSATION
  ========================================= */

  const loadMessages = async (requestId) => {
    setMessagesLoading(true);

    setMessageError("");

    try {
      const response = await api.get(
        `${BASE}${requestId}/messages/`
      );

      const data = getArray(response.data);

      setMessages(data);

      /*
        Mark only messages received from other users
        as read. Backend rejects marking own messages.
      */

      const unread = data.filter(
        (message) =>
          !message.is_read &&
          message.sender !== user?.id
      );

      for (const message of unread) {
        try {
          await api.post(
            `${BASE}messages/${message.id}/read/`
          );
        } catch (err) {
          console.error(
            "Unable to mark message as read:",
            err
          );
        }
      }

      if (unread.length > 0) {
        setMessages((current) =>
          current.map((message) =>
            unread.some(
              (item) => item.id === message.id
            )
              ? {
                  ...message,
                  is_read: true,
                }
              : message
          )
        );
      }
    } catch (err) {
      setMessageError(getError(err));
    } finally {
      setMessagesLoading(false);
    }
  };

  /* =========================================
     SEND REQUEST MESSAGE
  ========================================= */

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!selectedRequest) return;

    const content = messageText.trim();

    if (!content) {
      setMessageError("Please enter a message.");
      return;
    }

    setSendingMessage(true);

    setMessageError("");

    try {
      /*
        Backend accepts:
        POST /<request_id>/messages/
        { content: "..." }
      */

      const response = await api.post(
        `${BASE}${selectedRequest.id}/messages/`,
        {
          content,
        }
      );

      setMessages((current) => [
        ...current,
        response.data,
      ]);

      setMessageText("");
    } catch (err) {
      setMessageError(getError(err));
    } finally {
      setSendingMessage(false);
    }
  };

  /* =========================================
     LOAD ISSUE REPORTS
  ========================================= */

  const loadIssues = async (requestId) => {
    setIssuesLoading(true);

    setIssuesError("");

    try {
      /*
        Staff can GET issue reports for assigned requests.
        Staff cannot create or update issue reports.
      */

      const response = await api.get(
        `${BASE}${requestId}/issues/`
      );

      setIssues(getArray(response.data));
    } catch (err) {
      setIssuesError(getError(err));
    } finally {
      setIssuesLoading(false);
    }
  };

  /* =========================================
     WORKFLOW ACTION
  ========================================= */

  const performAction = async (
    action,
    extraPayload = {}
  ) => {
    if (!selectedRequest) return;

    setActionLoading(true);

    setActionError("");

    try {
      /*
        Backend action endpoint:
        POST /<request_id>/action/

        Staff actions:
        start
        on_the_way
        arrived
        pickup_completed
        in_transit
        complete
      */

      const response = await api.post(
        `${BASE}${selectedRequest.id}/action/`,
        {
          action,
          ...extraPayload,
        }
      );

      setSelectedRequest(response.data);

      /*
        Update the list with the new backend response.
      */

      setRequests((current) =>
        current.map((item) =>
          item.id === response.data.id
            ? response.data
            : item
        )
      );

      setShowCompletionForm(false);

      setCompletionNotes("");

      /*
        Refresh conversation because completion
        creates an automatic backend message.
      */

      await loadMessages(selectedRequest.id);

      return true;
    } catch (err) {
      setActionError(getActionError(err));

      return false;
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================
     CONFIRM WORKFLOW
  ========================================= */

  const confirmWorkflow = async (workflow) => {
    if (
      workflow.action === "complete" &&
      !showCompletionForm
    ) {
      setShowCompletionForm(true);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${workflow.label.toLowerCase()}?`
    );

    if (!confirmed) return;

    const payload = {};

    if (workflow.action === "complete") {
      payload.completion_notes =
        completionNotes.trim();
    }

    const success = await performAction(
      workflow.action,
      payload
    );

    if (success) {
      await loadRequests(true);
    }
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = () => {
    localStorage.removeItem("civicfix_access_token");

    localStorage.removeItem("civicfix_refresh_token");

    localStorage.removeItem("civicfix_user");

    navigate("/senior-citizen/staff/login", {
      replace: true,
    });
  };

  /* =========================================
     NAVIGATION
  ========================================= */

  const navigateTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/senior-citizen/staff/dashboard",
    },
    {
      name: "My Assigned Requests",
      icon: ClipboardList,
      path: "/senior-citizen/staff/requests",
    },
    {
      name: "Notifications",
      icon: Bell,
      path: "/senior-citizen/staff/notifications",
    },
    {
      name: "Messages",
      icon: Mail,
      path: "/senior-citizen/staff/messages",
    },
    {
      name: "My Profile",
      icon: UserRound,
      path: "/senior-citizen/staff/profile",
    },
  ];

  const staffName = getFullName(user);

  const initials = getInitials(user);

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  /* =========================================
     CLOSE DETAIL
  ========================================= */

  const closeDetail = () => {
    setSelectedRequest(null);

    setMessages([]);
    setIssues([]);

    setActionError("");
    setDetailError("");
  };

  /* =========================================
     CURRENT WORKFLOW
  ========================================= */

  const currentWorkflow = selectedRequest
    ? STAFF_WORKFLOW[selectedRequest.status]
    : null;

  const isCompleted =
    selectedRequest?.status === "completed";

  const isClosed =
    selectedRequest?.status === "closed";

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="scr-page">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="scr-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside
        className={`scr-sidebar ${
          sidebarOpen ? "scr-sidebar-open" : ""
        }`}
      >

        <div className="scr-brand">

          <div className="scr-brand-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

          <button
            type="button"
            className="scr-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>

        </div>

        <div className="scr-sidebar-label">
          WORKSPACE
        </div>

        <nav className="scr-nav">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                className={`scr-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  navigateTo(item.path)
                }
              >
                <Icon size={19} />

                <span>{item.name}</span>
              </button>
            );
          })}

        </nav>

        <div className="scr-sidebar-footer">

          <div className="scr-user">

            <div className="scr-avatar">
              {initials}
            </div>

            <div>
              <strong>{staffName}</strong>
              <span>Senior Citizen Staff</span>
            </div>

          </div>

          <button
            type="button"
            className="scr-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>

      </aside>

      {/* =====================================
          MAIN
      ===================================== */}

      <main className="scr-main">

        {/* HEADER */}

        <header className="scr-header">

          <div className="scr-header-left">

            <button
              type="button"
              className="scr-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="scr-breadcrumb">
                Workspace <span>/</span> My Assigned Requests
              </div>

              <h2>My Assigned Requests</h2>
            </div>

          </div>

          <div className="scr-header-right">

            <div className="scr-header-date">
              <CalendarDays size={17} />
              {today}
            </div>

            <div className="scr-header-divider" />

            <div className="scr-header-profile">

              <div className="scr-avatar">
                {initials}
              </div>

              <div>
                <strong>{staffName}</strong>
                <span>Senior Citizen Staff</span>
              </div>

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}

        <div className="scr-content">

          {/* PAGE INTRO */}

          <section className="scr-heading">

            <div>
              <span className="scr-eyebrow">
                <span />
                STAFF WORKSPACE
              </span>

              <h1>My Assigned Requests</h1>

              <p>
                View request details, communicate with citizens,
                and manage the progress of your assigned assistance work.
              </p>
            </div>

            <button
              type="button"
              className="scr-refresh"
              onClick={() => loadRequests(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing ? "scr-spin" : ""
                }
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

          </section>

          {/* ERROR */}

          {error && (
            <div className="scr-alert scr-alert-error">
              <AlertTriangle size={18} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadRequests()}
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================
              STATISTICS
          ================================= */}

          <section className="scr-stats">

            <article className="scr-stat-card">

              <div className="scr-stat-icon blue">
                <ClipboardList size={22} />
              </div>

              <div>
                <span>Total Assigned</span>
                <strong>{stats.total}</strong>
              </div>

            </article>

            <article className="scr-stat-card">

              <div className="scr-stat-icon orange">
                <ClipboardCheck size={22} />
              </div>

              <div>
                <span>Assigned</span>
                <strong>{stats.assigned}</strong>
              </div>

            </article>

            <article className="scr-stat-card">

              <div className="scr-stat-icon purple">
                <Activity size={22} />
              </div>

              <div>
                <span>Active Work</span>
                <strong>{stats.active}</strong>
              </div>

            </article>

            <article className="scr-stat-card">

              <div className="scr-stat-icon green">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <span>Completed</span>
                <strong>{stats.completed}</strong>
              </div>

            </article>

            <article className="scr-stat-card">

              <div className="scr-stat-icon red">
                <AlertTriangle size={22} />
              </div>

              <div>
                <span>Urgent</span>
                <strong>{stats.urgent}</strong>
              </div>

            </article>

          </section>

          {/* =================================
              REQUEST LIST
          ================================= */}

          <section className="scr-panel">

            <div className="scr-panel-heading">

              <div>
                <h3>Assigned Assistance Requests</h3>

                <p>
                  Requests assigned to your staff account.
                </p>
              </div>

              <span className="scr-result-count">
                {filteredRequests.length} Requests
              </span>

            </div>

            {/* FILTERS */}

            <div className="scr-filters">

              <div className="scr-search">

                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search by request ID, name, phone, district..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All Statuses</option>

                {Object.entries(STATUS_LABELS).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}

              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
              >
                <option value="all">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

            </div>

            {/* REQUEST TABLE */}

            {loading ? (

              <div className="scr-state">

                <RefreshCw
                  size={28}
                  className="scr-spin"
                />

                <p>Loading assigned requests...</p>

              </div>

            ) : filteredRequests.length > 0 ? (

              <div className="scr-table-wrap">

                <table className="scr-table">

                  <thead>
                    <tr>
                      <th>REQUEST</th>
                      <th>SENIOR CITIZEN</th>
                      <th>ASSISTANCE</th>
                      <th>LOCATION</th>
                      <th>PRIORITY</th>
                      <th>STATUS</th>
                      <th>DEADLINE</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredRequests.map((request) => (

                      <tr key={request.id}>

                        <td>
                          <strong className="scr-request-id">
                            #{request.id}
                          </strong>

                          <span className="scr-date-small">
                            {formatDate(request.created_at)}
                          </span>
                        </td>

                        <td>
                          <div className="scr-citizen">

                            <div className="scr-citizen-avatar">
                              {String(
                                request.full_name || "S"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {request.full_name || "—"}
                              </strong>

                              <span>
                                {request.phone_number || "—"}
                              </span>
                            </div>

                          </div>
                        </td>

                        <td>
                          {formatAssistance(
                            request.assistance_type
                          )}
                        </td>

                        <td>
                          <div className="scr-location">
                            <MapPin size={14} />

                            <span>
                              {[
                                request.district,
                                request.state,
                              ]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`scr-priority scr-priority-${request.priority || "normal"}`}
                          >
                            {formatPriority(request.priority)}
                          </span>
                        </td>

                        <td>
                          <RequestStatus
                            status={request.status}
                          />
                        </td>

                        <td>
                          {formatDateTime(request.deadline)}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="scr-view-button"
                            onClick={() =>
                              openRequest(request)
                            }
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="scr-empty">

                <div className="scr-empty-icon">
                  <ClipboardList size={32} />
                </div>

                <h3>
                  {requests.length === 0
                    ? "No assigned requests yet"
                    : "No matching requests found"}
                </h3>

                <p>
                  {requests.length === 0
                    ? "When the manager assigns an assistance request to your account, it will appear here."
                    : "Try changing your search or filters."}
                </p>

                {requests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                  >
                    Clear Filters
                  </button>
                )}

              </div>

            )}

          </section>

          {/* FOOTER */}

          <footer className="scr-footer">
            <span>© 2026 CivicFix. All rights reserved.</span>
            <span>Senior Citizen Assistance Portal</span>
          </footer>

        </div>

      </main>

      {/* =====================================
          REQUEST DETAIL DRAWER
      ===================================== */}

      {selectedRequest && (

        <div className="scr-detail-overlay">

          <section className="scr-detail-drawer">

            {/* DETAIL HEADER */}

            <div className="scr-detail-header">

              <div>
                <div className="scr-breadcrumb">
                  Requests <span>/</span> #{selectedRequest.id}
                </div>

                <h2>Request Details</h2>
              </div>

              <button
                type="button"
                className="scr-detail-close"
                onClick={closeDetail}
              >
                <X size={21} />
              </button>

            </div>

            {detailLoading ? (

              <div className="scr-state">
                <RefreshCw
                  size={28}
                  className="scr-spin"
                />

                <p>Loading request details...</p>
              </div>

            ) : detailError ? (

              <div className="scr-detail-error">
                <AlertTriangle size={22} />
                <p>{detailError}</p>

                <button
                  type="button"
                  onClick={() => openRequest(selectedRequest)}
                >
                  Retry
                </button>
              </div>

            ) : (

              <div className="scr-detail-body">

                {/* REQUEST SUMMARY */}

                <section className="scr-detail-summary">

                  <div>
                    <span>REQUEST ID</span>
                    <h3>#{selectedRequest.id}</h3>
                  </div>

                  <RequestStatus
                    status={selectedRequest.status}
                  />

                </section>

                {/* WORKFLOW ALERT */}

                {isClosed && (
                  <div className="scr-workflow-notice success">
                    <CheckCircle2 size={21} />

                    <div>
                      <strong>Request Closed</strong>
                      <p>
                        Citizen verification has been completed.
                        No further staff actions are available.
                      </p>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="scr-workflow-notice success">
                    <CheckCircle2 size={21} />

                    <div>
                      <strong>Assistance Completed</strong>
                      <p>
                        Your completion update has been submitted.
                        The citizen must verify completion before
                        the request is automatically closed.
                      </p>
                    </div>
                  </div>
                )}

                {/* =================================
                    WORKFLOW ACTION
                ================================= */}

                {currentWorkflow && (

                  <section className="scr-workflow-card">

                    <div className="scr-workflow-heading">

                      <div className="scr-workflow-icon">
                        <currentWorkflow.icon size={21} />
                      </div>

                      <div>
                        <span>AVAILABLE STAFF ACTION</span>
                        <h3>{currentWorkflow.label}</h3>
                      </div>

                    </div>

                    <p>
                      {currentWorkflow.description}
                    </p>

                    {actionError && (
                      <div className="scr-inline-error">
                        <AlertTriangle size={16} />
                        {actionError}
                      </div>
                    )}

                    {/* COMPLETION NOTES */}

                    {showCompletionForm && (
                      <div className="scr-completion-form">

                        <label>
                          Completion Notes
                          <span className="scr-optional">
                            Optional
                          </span>
                        </label>

                        <textarea
                          rows="4"
                          value={completionNotes}
                          onChange={(event) =>
                            setCompletionNotes(event.target.value)
                          }
                          placeholder="Enter details about the completed assistance..."
                        />

                        <small>
                          These notes are submitted to the backend
                          as completion_notes.
                        </small>

                      </div>
                    )}

                    <div className="scr-workflow-actions">

                      <button
                        type="button"
                        className="scr-primary-action"
                        onClick={() =>
                          confirmWorkflow(currentWorkflow)
                        }
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <RefreshCw
                            size={17}
                            className="scr-spin"
                          />
                        ) : (
                          <currentWorkflow.icon size={17} />
                        )}

                        {actionLoading
                          ? "Updating..."
                          : showCompletionForm
                          ? "Confirm Completion"
                          : currentWorkflow.label}
                      </button>

                      {showCompletionForm && (
                        <button
                          type="button"
                          className="scr-cancel-action"
                          onClick={() => {
                            setShowCompletionForm(false);
                            setCompletionNotes("");
                          }}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      )}

                    </div>

                    {/* SECONDARY COMPLETE ACTION */}

                    {currentWorkflow.secondary &&
                      !showCompletionForm && (
                        <button
                          type="button"
                          className="scr-secondary-action"
                          onClick={() =>
                            confirmWorkflow(
                              currentWorkflow.secondary
                            )
                          }
                        >
                          <CheckCircle2 size={16} />
                          {currentWorkflow.secondary.label}
                        </button>
                      )}

                  </section>

                )}

                {/* =================================
                    SENIOR CITIZEN INFORMATION
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <UserRound size={19} />

                    <div>
                      <h3>Senior Citizen Information</h3>
                      <p>Registered citizen details</p>
                    </div>
                  </div>

                  <div className="scr-detail-grid">

                    <DetailField
                      icon={User}
                      label="Full Name"
                      value={selectedRequest.full_name}
                    />

                    <DetailField
                      icon={CalendarDays}
                      label="Age"
                      value={
                        selectedRequest.age
                          ? `${selectedRequest.age} years`
                          : "—"
                      }
                    />

                    <DetailField
                      icon={Phone}
                      label="Phone Number"
                      value={selectedRequest.phone_number}
                    />

                    <DetailField
                      icon={Mail}
                      label="Citizen Email"
                      value={selectedRequest.citizen_email}
                    />

                    <DetailField
                      icon={MapPin}
                      label="State"
                      value={selectedRequest.state}
                    />

                    <DetailField
                      icon={MapPin}
                      label="District"
                      value={selectedRequest.district}
                    />

                  </div>

                  <div className="scr-address-box">
                    <span>Home Address</span>
                    <p>{selectedRequest.address || "—"}</p>
                  </div>

                </section>

                {/* =================================
                    APPLICANT INFORMATION
                ================================= */}

                {(selectedRequest.applicant_name ||
                  selectedRequest.applicant_phone ||
                  selectedRequest.applicant_relationship) && (

                  <section className="scr-detail-section">

                    <div className="scr-section-title">
                      <User size={19} />

                      <div>
                        <h3>Applicant Information</h3>
                        <p>Person who submitted the request</p>
                      </div>
                    </div>

                    <div className="scr-detail-grid">

                      <DetailField
                        icon={User}
                        label="Applicant Name"
                        value={selectedRequest.applicant_name}
                      />

                      <DetailField
                        icon={Phone}
                        label="Applicant Phone"
                        value={selectedRequest.applicant_phone}
                      />

                      <DetailField
                        icon={UserRound}
                        label="Relationship"
                        value={selectedRequest.applicant_relationship}
                      />

                    </div>

                  </section>

                )}

                {/* =================================
                    ASSISTANCE INFORMATION
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <HeartHandshake size={19} />

                    <div>
                      <h3>Assistance Details</h3>
                      <p>Service requested by the citizen</p>
                    </div>
                  </div>

                  <div className="scr-detail-grid">

                    <DetailField
                      icon={ClipboardList}
                      label="Assistance Type"
                      value={formatAssistance(
                        selectedRequest.assistance_type
                      )}
                    />

                    <DetailField
                      icon={AlertTriangle}
                      label="Priority"
                      value={formatPriority(
                        selectedRequest.priority
                      )}
                    />

                    <DetailField
                      icon={CalendarDays}
                      label="Preferred Date"
                      value={formatDateTime(
                        selectedRequest.preferred_datetime
                      )}
                    />

                    <DetailField
                      icon={Clock}
                      label="Request Created"
                      value={formatDateTime(
                        selectedRequest.created_at
                      )}
                    />

                  </div>

                  <div className="scr-description-box">
                    <span>Request Description</span>

                    <p>
                      {selectedRequest.description || "—"}
                    </p>
                  </div>

                </section>

                {/* =================================
                    SERVICE LOCATIONS
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <MapPin size={19} />

                    <div>
                      <h3>Service Locations</h3>
                      <p>Pickup and destination information</p>
                    </div>
                  </div>

                  <div className="scr-location-card">

                    <div className="scr-location-point pickup">
                      <span />
                      <div>
                        <small>PICKUP LOCATION</small>
                        <p>
                          {selectedRequest.pickup_location || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="scr-location-line" />

                    <div className="scr-location-point destination">
                      <span />
                      <div>
                        <small>DESTINATION</small>
                        <p>
                          {selectedRequest.destination || "—"}
                        </p>
                      </div>
                    </div>

                  </div>

                  {selectedRequest.latitude != null &&
                    selectedRequest.longitude != null && (

                    <a
                      className="scr-map-link"
                      href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={16} />
                      Open Current Location in Maps
                      <ExternalLink size={14} />
                    </a>

                  )}

                  {selectedRequest.current_location && (
                    <div className="scr-address-box">
                      <span>Current Location Details</span>
                      <p>
                        {selectedRequest.current_location}
                      </p>
                    </div>
                  )}

                  {/* LOCATION VERIFICATION */}

                  {selectedRequest.location_mismatch && (
                    <div className="scr-location-warning">
                      <AlertTriangle size={17} />

                      <div>
                        <strong>Location Mismatch Warning</strong>

                        <p>
                          Selected Location:{" "}
                          {selectedRequest.district},{" "}
                          {selectedRequest.state}
                        </p>

                        <p>
                          Detected Location:{" "}
                          {selectedRequest.detected_district},{" "}
                          {selectedRequest.detected_state}
                        </p>
                      </div>
                    </div>
                  )}

                </section>

                {/* =================================
                    SCHEDULING
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <Clock size={19} />

                    <div>
                      <h3>Schedule & Deadline</h3>
                      <p>Manager assigned service timings</p>
                    </div>
                  </div>

                  <div className="scr-detail-grid">

                    <DetailField
                      icon={CalendarDays}
                      label="Deadline"
                      value={formatDateTime(
                        selectedRequest.deadline
                      )}
                    />

                    <DetailField
                      icon={Navigation}
                      label="Estimated Arrival"
                      value={formatDateTime(
                        selectedRequest.estimated_arrival
                      )}
                    />

                  </div>

                </section>

                {/* =================================
                    COMPLETION INFORMATION
                ================================= */}

                {(selectedRequest.completion_notes ||
                  selectedRequest.completed_at ||
                  selectedRequest.verified_at) && (

                  <section className="scr-detail-section">

                    <div className="scr-section-title">
                      <CheckCircle2 size={19} />

                      <div>
                        <h3>Completion Information</h3>
                        <p>Service completion details</p>
                      </div>
                    </div>

                    <div className="scr-detail-grid">

                      <DetailField
                        icon={CalendarDays}
                        label="Completed At"
                        value={formatDateTime(
                          selectedRequest.completed_at
                        )}
                      />

                      <DetailField
                        icon={ShieldCheck}
                        label="Citizen Verified At"
                        value={formatDateTime(
                          selectedRequest.verified_at
                        )}
                      />

                    </div>

                    {selectedRequest.completion_notes && (
                      <div className="scr-description-box">
                        <span>Staff Completion Notes</span>

                        <p>
                          {selectedRequest.completion_notes}
                        </p>
                      </div>
                    )}

                  </section>

                )}

                {/* =================================
                    REQUEST IMAGES
                ================================= */}

                {selectedRequest.images?.length > 0 && (

                  <section className="scr-detail-section">

                    <div className="scr-section-title">
                      <ImageIcon size={19} />

                      <div>
                        <h3>Request Images</h3>
                        <p>Images uploaded with the request</p>
                      </div>
                    </div>

                    <div className="scr-images">

                      {selectedRequest.images.map((image) => (

                        <a
                          key={image.id}
                          href={getImageUrl(image.image)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={getImageUrl(image.image)}
                            alt={`Request ${selectedRequest.id}`}
                          />
                        </a>

                      ))}

                    </div>

                  </section>

                )}

                {/* =================================
                    ISSUE REPORTS
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <CircleAlert size={19} />

                    <div>
                      <h3>Reported Issues</h3>
                      <p>Issues reported for this request</p>
                    </div>

                    <span className="scr-section-count">
                      {issues.length}
                    </span>

                  </div>

                  {issuesLoading ? (

                    <div className="scr-mini-loading">
                      <RefreshCw
                        size={17}
                        className="scr-spin"
                      />
                      Loading issue reports...
                    </div>

                  ) : issuesError ? (

                    <div className="scr-inline-error">
                      <AlertTriangle size={16} />
                      {issuesError}
                    </div>

                  ) : issues.length > 0 ? (

                    <div className="scr-issue-list">

                      {issues.map((issue) => (

                        <article
                          key={issue.id}
                          className="scr-issue-card"
                        >

                          <div className="scr-issue-top">

                            <strong>
                              Report #{issue.id}
                            </strong>

                            <span
                              className={`scr-issue-status ${issue.status}`}
                            >
                              {String(
                                issue.status || ""
                              ).replaceAll("_", " ")}
                            </span>

                          </div>

                          <h4>
                            {String(
                              issue.issue_type || ""
                            ).replaceAll("_", " ")}
                          </h4>

                          <p>{issue.description}</p>

                          <small>
                            Reported:{" "}
                            {formatDateTime(issue.created_at)}
                          </small>

                          {issue.manager_response && (
                            <div className="scr-manager-response">
                              <strong>Manager Response</strong>
                              <p>{issue.manager_response}</p>
                            </div>
                          )}

                          {issue.updated_eta && (
                            <small>
                              Updated ETA:{" "}
                              {formatDateTime(issue.updated_eta)}
                            </small>
                          )}

                        </article>

                      ))}

                    </div>

                  ) : (

                    <div className="scr-no-data">
                      <CheckCircle2 size={19} />
                      No issue reports found for this request.
                    </div>

                  )}

                </section>

                {/* =================================
                    CONVERSATION
                ================================= */}

                <section className="scr-detail-section">

                  <div className="scr-section-title">
                    <MessageSquare size={19} />

                    <div>
                      <h3>Request Conversation</h3>
                      <p>
                        Messages between the citizen, manager
                        and assigned staff.
                      </p>
                    </div>

                    <span className="scr-section-count">
                      {messages.length}
                    </span>

                  </div>

                  {messagesLoading ? (

                    <div className="scr-mini-loading">
                      <RefreshCw
                        size={17}
                        className="scr-spin"
                      />
                      Loading conversation...
                    </div>

                  ) : (

                    <div className="scr-message-list">

                      {messages.length > 0 ? (

                        messages.map((message) => {

                          const own =
                            message.sender === user?.id;

                          return (

                            <article
                              key={message.id}
                              className={`scr-message ${
                                own ? "own" : ""
                              }`}
                            >

                              <div className="scr-message-meta">

                                <strong>
                                  {own
                                    ? "You"
                                    : message.sender_email ||
                                      "Conversation Participant"}
                                </strong>

                                <span>
                                  {formatDateTime(
                                    message.created_at
                                  )}
                                </span>

                              </div>

                              <p>{message.content}</p>

                              {own && (
                                <small>
                                  {message.is_read
                                    ? "Read"
                                    : "Sent"}
                                </small>
                              )}

                            </article>

                          );
                        })

                      ) : (

                        <div className="scr-no-data">
                          <MessageSquare size={19} />
                          No messages in this conversation yet.
                        </div>

                      )}

                    </div>

                  )}

                  {messageError && (
                    <div className="scr-inline-error">
                      <AlertTriangle size={16} />
                      {messageError}
                    </div>
                  )}

                  {/* SEND MESSAGE */}

                  <form
                    className="scr-message-form"
                    onSubmit={sendMessage}
                  >

                    <textarea
                      rows="3"
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(event.target.value)
                      }
                      placeholder="Write a message about this assistance request..."
                    />

                    <button
                      type="submit"
                      disabled={
                        sendingMessage ||
                        !messageText.trim()
                      }
                    >
                      {sendingMessage ? (
                        <RefreshCw
                          size={16}
                          className="scr-spin"
                        />
                      ) : (
                        <Send size={16} />
                      )}

                      {sendingMessage
                        ? "Sending..."
                        : "Send Message"}
                    </button>

                  </form>

                </section>

                {/* =================================
                    WORKFLOW INFORMATION
                ================================= */}

                <div className="scr-detail-footer-note">

                  <ShieldCheck size={19} />

                  <div>
                    <strong>Staff Permission Notice</strong>

                    <p>
                      You can update progress only for requests
                      assigned to your account. Approval, rejection,
                      staff assignment and final closure are handled
                      by the manager or citizen verification workflow.
                    </p>
                  </div>

                </div>

              </div>

            )}

          </section>

        </div>

      )}

    </div>
  );
}