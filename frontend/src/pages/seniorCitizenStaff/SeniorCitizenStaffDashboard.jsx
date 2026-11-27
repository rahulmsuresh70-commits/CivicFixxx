import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Clock,
  CheckCircle2,
  UserRound,
  CalendarDays,
  MapPin,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  Bell,
  Mail,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";

import "./SeniorCitizenStaffDashboard.css";

/* =========================================
   STATUS LABELS
========================================= */

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

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatStatus = (status) => {
  return (
    STATUS_LABELS[status] ||
    String(status || "Unknown").replaceAll("_", " ")
  );
};

const getInitials = (user) => {
  const name = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!name) {
    return user?.email?.charAt(0)?.toUpperCase() || "S";
  }

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({ status }) {
  return (
    <span
      className={`scstaff-status scstaff-status-${String(
        status || "unknown"
      ).replaceAll("_", "-")}`}
    >
      <span className="scstaff-status-dot" />

      {formatStatus(status)}
    </span>
  );
}

/* =========================================
   DASHBOARD COMPONENT
========================================= */

export default function SeniorCitizenStaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  /* =========================================
     UNREAD COUNTS
  ========================================= */

  const unreadNotifications = useMemo(() => {
    return notifications.filter(
      (item) => !item.is_read
    ).length;
  }, [notifications]);

  const unreadMessages = useMemo(() => {
    return messages.filter(
      (item) => !item.is_read
    ).length;
  }, [messages]);

  /* =========================================
     AUTHENTICATION CHECK
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
     LOAD DASHBOARD DATA
  ========================================= */

  const loadDashboard = useCallback(
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
        const results = await Promise.allSettled([
          // Assigned requests
          api.get("/senior-citizen/"),

          // Authenticated user
          api.get("/auth/me/"),

          // Notifications
          api.get("/notifications/"),

          // Internal inbox
          api.get("/messaging/internal/inbox/"),
        ]);

        const errors = [];

        /* =================================
           ASSIGNED REQUESTS
        ================================= */

        if (results[0].status === "fulfilled") {
          setRequests(
            getArray(results[0].value.data)
          );
        } else {
          errors.push(
            getApiErrorMessage(results[0].reason)
          );
        }

        /* =================================
           AUTHENTICATED USER
        ================================= */

        if (results[1].status === "fulfilled") {
          const currentUser = results[1].value.data;

          if (
            currentUser?.role &&
            currentUser.role !== "senior_citizen_staff"
          ) {
            localStorage.removeItem(
              "civicfix_access_token"
            );

            localStorage.removeItem(
              "civicfix_refresh_token"
            );

            localStorage.removeItem("civicfix_user");

            navigate("/senior-citizen/staff/login", {
              replace: true,
            });

            return;
          }

          setUser(currentUser);

          localStorage.setItem(
            "civicfix_user",
            JSON.stringify(currentUser)
          );
        } else {
          errors.push(
            getApiErrorMessage(results[1].reason)
          );
        }

        /* =================================
           NOTIFICATIONS
        ================================= */

        if (results[2].status === "fulfilled") {
          setNotifications(
            getArray(results[2].value.data)
          );
        } else {
          // Notification API failure should not
          // prevent the dashboard from loading.
          setNotifications([]);
          console.error(
            "Unable to load notifications:",
            results[2].reason
          );
        }

        /* =================================
           INTERNAL MESSAGES
        ================================= */

        if (results[3].status === "fulfilled") {
          setMessages(
            getArray(results[3].value.data)
          );
        } else {
          // Inbox API failure should not
          // prevent the dashboard from loading.
          setMessages([]);
          console.error(
            "Unable to load messages:",
            results[3].reason
          );
        }

        setError(
          [...new Set(errors)].filter(Boolean).join(" ")
        );
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checkAuthentication, navigate]
  );

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =========================================
     DASHBOARD STATISTICS
  ========================================= */

  const stats = useMemo(() => {
    const total = requests.length;

    const activeStatuses = [
      "assigned",
      "in_progress",
      "on_the_way",
      "arrived",
      "pickup_completed",
      "in_transit",
    ];

    const active = requests.filter((request) =>
      activeStatuses.includes(request.status)
    ).length;

    const inProgress = requests.filter((request) =>
      [
        "in_progress",
        "on_the_way",
        "arrived",
        "pickup_completed",
        "in_transit",
      ].includes(request.status)
    ).length;

    const completed = requests.filter((request) =>
      ["completed", "closed"].includes(request.status)
    ).length;

    const assigned = requests.filter(
      (request) => request.status === "assigned"
    ).length;

    return {
      total,
      active,
      inProgress,
      completed,
      assigned,
    };
  }, [requests]);

  /* =========================================
     RECENT REQUESTS
  ========================================= */

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const first = new Date(
          a.created_at || 0
        ).getTime();

        const second = new Date(
          b.created_at || 0
        ).getTime();

        return second - first;
      })
      .slice(0, 6);
  }, [requests]);

  /* =========================================
     NAVIGATION
  ========================================= */

  const handleNavigation = (path) => {
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
      badge: unreadNotifications,
    },
    {
      name: "Messages",
      icon: Mail,
      path: "/senior-citizen/staff/messages",
      badge: unreadMessages,
    },
    {
      name: "My Profile",
      icon: UserRound,
      path: "/senior-citizen/staff/profile",
    },
  ];

  const activePath = location.pathname;

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
     CURRENT DATE
  ========================================= */

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const staffName = getFullName(user);
  const initials = getInitials(user);

  /* =========================================
     DASHBOARD UI
  ========================================= */

  return (
    <div className="scstaff-dashboard">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="scstaff-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside
        className={`scstaff-sidebar ${
          sidebarOpen ? "scstaff-sidebar-open" : ""
        }`}
      >

        {/* BRAND */}

        <div className="scstaff-brand">

          <div className="scstaff-brand-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

          <button
            type="button"
            className="scstaff-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>

        </div>

        {/* WORKSPACE */}

        <div className="scstaff-sidebar-label">
          WORKSPACE
        </div>

        {/* SIDEBAR NAVIGATION */}

        <nav className="scstaff-nav">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              activePath === item.path;

            return (
              <button
                key={item.path}
                type="button"
                className={`scstaff-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() =>
                  handleNavigation(item.path)
                }
              >
                <Icon size={19} />

                <span>{item.name}</span>

                {item.badge > 0 && (
                  <span className="scstaff-nav-badge">
                    {item.badge > 99
                      ? "99+"
                      : item.badge}
                  </span>
                )}

              </button>
            );
          })}

        </nav>

        {/* SIDEBAR FOOTER */}

        <div className="scstaff-sidebar-footer">

          <div className="scstaff-sidebar-user">

            <div className="scstaff-avatar">
              {initials}
            </div>

            <div className="scstaff-sidebar-user-info">
              <strong>{staffName}</strong>
              <span>Senior Citizen Staff</span>
            </div>

          </div>

          <button
            type="button"
            className="scstaff-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* =====================================
          MAIN AREA
      ===================================== */}

      <main className="scstaff-main">

        {/* HEADER */}

        <header className="scstaff-header">

          <div className="scstaff-header-left">

            <button
              type="button"
              className="scstaff-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="scstaff-breadcrumb">
                Workspace <span>/</span> Dashboard
              </div>

              <h2>Dashboard Overview</h2>
            </div>

          </div>

          <div className="scstaff-header-right">

            <div className="scstaff-header-date">
              <CalendarDays size={17} />
              <span>{today}</span>
            </div>

            <div className="scstaff-header-divider" />

            <div className="scstaff-header-profile">

              <div className="scstaff-avatar">
                {initials}
              </div>

              <div>
                <strong>{staffName}</strong>
                <span>Senior Citizen Staff</span>
              </div>

            </div>

          </div>

        </header>

        {/* CONTENT */}

        <div className="scstaff-content">

          {/* WELCOME */}

          <section className="scstaff-welcome">

            <div>

              <div className="scstaff-welcome-tag">
                <span className="scstaff-live-dot" />
                STAFF WORKSPACE
              </div>

              <h1>
                Welcome back, {user?.first_name || "Staff"}!
                👋
              </h1>

              <p>
                Manage your assigned senior citizen
                assistance requests and track their progress.
              </p>

            </div>

            <button
              type="button"
              className="scstaff-refresh-button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing ? "scstaff-spin" : ""
                }
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

          </section>

          {/* ERROR */}

          {error && (
            <div className="scstaff-alert scstaff-alert-error">

              <AlertTriangle size={19} />

              <div>
                <strong>
                  Unable to load some dashboard data
                </strong>

                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard()}
              >
                Try Again
              </button>

            </div>
          )}

          {/* LOADING */}

          {loading ? (

            <div className="scstaff-loading">

              <RefreshCw
                size={28}
                className="scstaff-spin"
              />

              <p>Loading your dashboard...</p>

            </div>

          ) : (

            <>

              {/* =================================
                  STATISTICS
              ================================= */}

              <section className="scstaff-stats-grid">

                {/* TOTAL */}

                <article className="scstaff-stat-card">

                  <div className="scstaff-stat-top">

                    <div className="scstaff-stat-icon blue">
                      <ClipboardList size={22} />
                    </div>

                    <span className="scstaff-stat-label">
                      ALL REQUESTS
                    </span>

                  </div>

                  <h2>{stats.total}</h2>

                  <p>Total requests assigned to you</p>

                </article>

                {/* ACTIVE */}

                <article className="scstaff-stat-card">

                  <div className="scstaff-stat-top">

                    <div className="scstaff-stat-icon orange">
                      <Activity size={22} />
                    </div>

                    <span className="scstaff-stat-label">
                      ACTIVE
                    </span>

                  </div>

                  <h2>{stats.active}</h2>

                  <p>Requests currently assigned or active</p>

                </article>

                {/* IN PROGRESS */}

                <article className="scstaff-stat-card">

                  <div className="scstaff-stat-top">

                    <div className="scstaff-stat-icon purple">
                      <Clock size={22} />
                    </div>

                    <span className="scstaff-stat-label">
                      IN PROGRESS
                    </span>

                  </div>

                  <h2>{stats.inProgress}</h2>

                  <p>Requests currently being handled</p>

                </article>

                {/* COMPLETED */}

                <article className="scstaff-stat-card">

                  <div className="scstaff-stat-top">

                    <div className="scstaff-stat-icon green">
                      <CheckCircle2 size={22} />
                    </div>

                    <span className="scstaff-stat-label">
                      COMPLETED
                    </span>

                  </div>

                  <h2>{stats.completed}</h2>

                  <p>Successfully completed or closed</p>

                </article>

              </section>

              {/* =================================
                  QUICK STATUS
              ================================= */}

              <section className="scstaff-quick-section">

                <div className="scstaff-section-heading">

                  <div>
                    <h3>Request Overview</h3>

                    <p>
                      Current status of your assigned work.
                    </p>
                  </div>

                </div>

                <div className="scstaff-quick-grid">

                  <div className="scstaff-quick-card">

                    <div className="scstaff-quick-icon blue">
                      <ClipboardCheck size={20} />
                    </div>

                    <div>
                      <span>Assigned</span>
                      <strong>{stats.assigned}</strong>
                    </div>

                  </div>

                  <div className="scstaff-quick-card">

                    <div className="scstaff-quick-icon purple">
                      <Activity size={20} />
                    </div>

                    <div>
                      <span>In Progress</span>
                      <strong>{stats.inProgress}</strong>
                    </div>

                  </div>

                  <div className="scstaff-quick-card">

                    <div className="scstaff-quick-icon green">
                      <CheckCircle2 size={20} />
                    </div>

                    <div>
                      <span>Completed</span>
                      <strong>{stats.completed}</strong>
                    </div>

                  </div>

                </div>

              </section>

              {/* =================================
                  RECENT REQUESTS
              ================================= */}

              <section className="scstaff-requests-panel">

                <div className="scstaff-panel-heading">

                  <div>
                    <h3>Recent Assigned Requests</h3>

                    <p>
                      Your latest assigned senior citizen
                      assistance requests.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="scstaff-view-all"
                    onClick={() =>
                      handleNavigation(
                        "/senior-citizen/staff/requests"
                      )
                    }
                  >
                    View all
                    <ArrowRight size={15} />
                  </button>

                </div>

                {recentRequests.length > 0 ? (

                  <div className="scstaff-table-wrapper">

                    <table className="scstaff-table">

                      <thead>
                        <tr>
                          <th>REQUEST</th>
                          <th>SENIOR CITIZEN</th>
                          <th>ASSISTANCE TYPE</th>
                          <th>LOCATION</th>
                          <th>STATUS</th>
                          <th>DATE</th>
                        </tr>
                      </thead>

                      <tbody>

                        {recentRequests.map((request) => (

                          <tr key={request.id}>

                            <td>
                              <strong className="scstaff-request-id">
                                #{request.id}
                              </strong>
                            </td>

                            <td>

                              <div className="scstaff-citizen">

                                <div className="scstaff-citizen-avatar">
                                  {String(
                                    request.full_name || "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <strong>
                                  {request.full_name || "—"}
                                </strong>

                              </div>

                            </td>

                            <td>
                              {request.assistance_type
                                ? String(
                                    request.assistance_type
                                  ).replaceAll("_", " ")
                                : "—"}
                            </td>

                            <td>

                              <div className="scstaff-location">

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
                              <StatusBadge
                                status={request.status}
                              />
                            </td>

                            <td>
                              {formatDate(request.created_at)}
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                ) : (

                  <div className="scstaff-empty">

                    <div className="scstaff-empty-icon">
                      <ClipboardList size={30} />
                    </div>

                    <h3>No assigned requests yet</h3>

                    <p>
                      Requests assigned to your staff account
                      will appear here.
                    </p>

                  </div>

                )}

              </section>

              {/* =================================
                  INFORMATION
              ================================= */}

              <section className="scstaff-info-card">

                <div className="scstaff-info-icon">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h3>Your Staff Workspace</h3>

                  <p>
                    This dashboard displays assistance requests
                    assigned to your account. You can view
                    request information and update the progress
                    of requests assigned to you.
                  </p>
                </div>

              </section>

            </>

          )}

          {/* FOOTER */}

          <footer className="scstaff-footer">

            <span>
              © 2026 CivicFix. All rights reserved.
            </span>

            <span>
              Senior Citizen Assistance Portal
            </span>

          </footer>

        </div>

      </main>

    </div>
  );
}