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
  CheckCheck,
  Check,
  Clock,
  CalendarDays,
  Info,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Filter,
  Inbox,
  BellRing,
  CircleCheck,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffRequests.css";
import "./SeniorCitizenStaffNotifications.css";

/* =========================================
   HELPERS
========================================= */

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

const getError = (error) => {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  return getApiErrorMessage(error);
};

const getFullName = (person) => {
  const name = [
    person?.first_name,
    person?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || person?.email || "Staff Member";
};

const getInitials = (person) => {
  return getFullName(person)
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getNotificationTitle = (notification) => {
  return (
    notification?.title ||
    notification?.subject ||
    notification?.notification_title ||
    "Notification"
  );
};

const getNotificationMessage = (notification) => {
  return (
    notification?.message ||
    notification?.description ||
    notification?.content ||
    notification?.body ||
    "You have received a new notification."
  );
};

const getNotificationDate = (notification) => {
  return (
    notification?.created_at ||
    notification?.timestamp ||
    notification?.date ||
    notification?.updated_at ||
    null
  );
};

const getNotificationType = (notification) => {
  return String(
    notification?.notification_type ||
    notification?.type ||
    notification?.category ||
    ""
  ).toLowerCase();
};

const getNotificationIcon = (notification) => {
  const type = getNotificationType(notification);

  const text = [
    getNotificationTitle(notification),
    getNotificationMessage(notification),
    type,
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("urgent") ||
    text.includes("emergency") ||
    text.includes("alert")
  ) {
    return {
      icon: AlertTriangle,
      color: "danger",
      label: "Important",
    };
  }

  if (
    text.includes("completed") ||
    text.includes("success") ||
    text.includes("verified")
  ) {
    return {
      icon: CheckCircle2,
      color: "success",
      label: "Completed",
    };
  }

  if (
    text.includes("assigned") ||
    text.includes("request")
  ) {
    return {
      icon: FileText,
      color: "blue",
      label: "Request Update",
    };
  }

  if (
    text.includes("message") ||
    text.includes("reply")
  ) {
    return {
      icon: Mail,
      color: "purple",
      label: "Message",
    };
  }

  if (
    text.includes("reminder") ||
    text.includes("schedule")
  ) {
    return {
      icon: Clock,
      color: "orange",
      label: "Reminder",
    };
  }

  return {
    icon: Bell,
    color: "blue",
    label: "General",
  };
};

/* =========================================
   NOTIFICATION CARD
========================================= */

function NotificationCard({
  notification,
  onMarkRead,
  markingId,
  onSelect,
  selected,
}) {
  const notificationInfo =
    getNotificationIcon(notification);

  const Icon = notificationInfo.icon;

  const date = getNotificationDate(notification);

  const isRead = Boolean(notification.is_read);

  return (
    <article
      className={`scsn-notification-card ${
        isRead ? "is-read" : "is-unread"
      } ${selected ? "is-selected" : ""}`}
    >
      <button
        type="button"
        className="scsn-notification-main"
        onClick={() => onSelect(notification)}
        aria-expanded={selected}
      >
        <div
          className={`scsn-notification-icon ${notificationInfo.color}`}
        >
          <Icon size={21} strokeWidth={1.9} />
        </div>

        <div className="scsn-notification-body">
          <div className="scsn-notification-topline">
            <div className="scsn-notification-title-group">
              <h3>
                {getNotificationTitle(notification)}
              </h3>

              {!isRead && (
                <span className="scsn-unread-dot" />
              )}
            </div>

            <span className="scsn-notification-time">
              {formatTime(date)}
            </span>
          </div>

          <p className="scsn-notification-description">
            {getNotificationMessage(notification)}
          </p>

          <div className="scsn-notification-meta">
            <span
              className={`scsn-type-label ${notificationInfo.color}`}
            >
              {notificationInfo.label}
            </span>

            <span className="scsn-meta-divider" />

            <span>
              <CalendarDays size={13} />
              {formatDate(date)}
            </span>

            <span className="scsn-meta-divider" />

            <span
              className={`scsn-read-status ${
                isRead ? "read" : "unread"
              }`}
            >
              {isRead ? (
                <>
                  <Check size={13} />
                  Read
                </>
              ) : (
                <>
                  <BellRing size={13} />
                  Unread
                </>
              )}
            </span>
          </div>
        </div>

        <ArrowRight
          className="scsn-notification-arrow"
          size={18}
        />
      </button>

      {!isRead && (
        <div className="scsn-notification-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMarkRead(notification);
            }}
            disabled={markingId === notification.id}
          >
            {markingId === notification.id ? (
              <RefreshCw
                size={14}
                className="scsn-spin"
              />
            ) : (
              <CheckCheck size={15} />
            )}

            {markingId === notification.id
              ? "Updating..."
              : "Mark as read"}
          </button>
        </div>
      )}

      {selected && (
        <div className="scsn-notification-expanded">
          <div className="scsn-expanded-heading">
            <Info size={15} />
            Notification details
          </div>

          <p>
            {getNotificationMessage(notification)}
          </p>

          <span>
            Received: {formatDateTime(date)}
          </span>
        </div>
      )}
    </article>
  );
}

/* =========================================
   MAIN COMPONENT
========================================= */

export default function SeniorCitizenStaffNotifications() {
  const navigate = useNavigate();

  const location = useLocation();

  /* =========================================
     USER
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

  /* =========================================
     SIDEBAR
  ========================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =========================================
     NOTIFICATION STATES
  ========================================= */

  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [markingId, setMarkingId] = useState(null);

  /* =========================================
     FILTER STATES
  ========================================= */

  const [search, setSearch] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");

  const [selectedNotification, setSelectedNotification] =
    useState(null);

  /* =========================================
     AUTHENTICATION
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
        return;
      }

      setUser(currentUser);

      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(currentUser)
      );
    } catch (err) {
      console.error(
        "Unable to load staff profile:",
        err
      );
    }
  }, []);

  /* =========================================
     LOAD NOTIFICATIONS
  ========================================= */

  const loadNotifications = useCallback(
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
          Existing backend endpoint:

          GET /api/notifications/

          Axios base URL already handles /api/.
        */

        const response = await api.get("/notifications/");

        const data = getArray(response.data);

        setNotifications(data);
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

    loadNotifications();

    loadUser();
  }, [
    checkAuthentication,
    loadNotifications,
    loadUser,
  ]);

  /* =========================================
     NOTIFICATION STATISTICS
  ========================================= */

  const stats = useMemo(() => {
    const total = notifications.length;

    const unread = notifications.filter(
      (item) => !item.is_read
    ).length;

    const read = total - unread;

    return {
      total,
      unread,
      read,
    };
  }, [notifications]);

  /* =========================================
     FILTER NOTIFICATIONS
  ========================================= */

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...notifications]
      .filter((notification) => {
        if (activeFilter === "unread") {
          return !notification.is_read;
        }

        if (activeFilter === "read") {
          return Boolean(notification.is_read);
        }

        return true;
      })
      .filter((notification) => {
        if (!term) return true;

        const searchable = [
          getNotificationTitle(notification),
          getNotificationMessage(notification),
          getNotificationType(notification),
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(term);
      })
      .sort((a, b) => {
        const firstDate = new Date(
          getNotificationDate(a) || 0
        ).getTime();

        const secondDate = new Date(
          getNotificationDate(b) || 0
        ).getTime();

        return secondDate - firstDate;
      });
  }, [
    notifications,
    search,
    activeFilter,
  ]);

  /* =========================================
     MARK INDIVIDUAL NOTIFICATION AS READ
  ========================================= */

  const markAsRead = async (notification) => {
    if (
      !notification?.id ||
      notification.is_read ||
      markingId !== null
    ) {
      return;
    }

    setMarkingId(notification.id);

    setError("");

    setSuccessMessage("");

    try {
      /*
        Existing backend endpoint:

        POST /api/notifications/<id>/read/

        No request body is required.
      */

      await api.post(
        `/notifications/${notification.id}/read/`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );

      setSelectedNotification((current) =>
        current?.id === notification.id
          ? {
              ...current,
              is_read: true,
            }
          : current
      );

      setSuccessMessage(
        "Notification marked as read."
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setMarkingId(null);
    }
  };

  /* =========================================
     SELECT NOTIFICATION
  ========================================= */

  const selectNotification = (notification) => {
    setSelectedNotification((current) =>
      current?.id === notification.id
        ? null
        : notification
    );
  };

  /* =========================================
     NAVIGATION
  ========================================= */

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

  const navigateTo = (path) => {
    navigate(path);

    setSidebarOpen(false);
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

  const staffName = getFullName(user);

  const initials = getInitials(user);

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="scr-page scsn-page">

      {/* =====================================
          MOBILE SIDEBAR OVERLAY
      ===================================== */}

      {sidebarOpen && (
        <div
          className="scr-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================
          LEFT SIDEBAR
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
            aria-label="Close menu"
          >
            <X size={21} />
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
                onClick={() => navigateTo(item.path)}
              >
                <Icon size={19} strokeWidth={1.8} />

                <span>{item.name}</span>

                {item.name === "Notifications" &&
                  stats.unread > 0 && (
                    <span className="scsn-nav-badge">
                      {stats.unread > 99
                        ? "99+"
                        : stats.unread}
                    </span>
                  )}
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
          RIGHT MAIN CONTENT
      ===================================== */}

      <main className="scr-main">

        {/* HEADER */}

        <header className="scr-header">
          <div className="scr-header-left">
            <button
              type="button"
              className="scr-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="scr-breadcrumb">
                Workspace <span>/</span> Notifications
              </div>

              <h2>Notifications</h2>
            </div>
          </div>

          <div className="scr-header-right">
            <div className="scsn-header-badge">
              <Bell size={17} />

              <span>
                {stats.unread} unread
              </span>
            </div>

            <div className="scr-header-divider" />

            <button
              type="button"
              className="scr-header-profile scsn-profile-button"
              onClick={() =>
                navigateTo(
                  "/senior-citizen/staff/profile"
                )
              }
              aria-label="Open my profile"
            >
              <div className="scr-avatar">
                {initials}
              </div>

              <div>
                <strong>{staffName}</strong>
                <span>Senior Citizen Staff</span>
              </div>
            </button>
          </div>
        </header>

        {/* =====================================
            PAGE CONTENT
        ===================================== */}

        <div className="scr-content scsn-content">

          {/* PAGE INTRO */}

          <section className="scsn-page-intro">
            <div>
              <div className="scsn-eyebrow">
                <span className="scsn-live-dot" />
                STAFF WORKSPACE
              </div>

              <h1>Notifications</h1>

              <p>
                Stay updated with your assigned requests,
                important announcements and assistance
                activity.
              </p>
            </div>

            <button
              type="button"
              className="scsn-refresh-button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing || loading}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "scsn-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {/* SUCCESS MESSAGE */}

          {successMessage && (
            <div className="scsn-alert success">
              <CheckCircle2 size={17} />

              <span>{successMessage}</span>

              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                aria-label="Dismiss success message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ERROR MESSAGE */}

          {error && (
            <div className="scsn-alert error">
              <AlertTriangle size={17} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =====================================
              STATISTICS
          ===================================== */}

          <section className="scsn-stats-grid">

            <article className="scsn-stat-card">
              <div className="scsn-stat-icon blue">
                <Inbox size={22} />
              </div>

              <div className="scsn-stat-info">
                <span>Total Notifications</span>
                <strong>{stats.total}</strong>
                <small>All received notifications</small>
              </div>
            </article>

            <article className="scsn-stat-card">
              <div className="scsn-stat-icon orange">
                <BellRing size={22} />
              </div>

              <div className="scsn-stat-info">
                <span>Unread Notifications</span>
                <strong>{stats.unread}</strong>
                <small>Waiting for your attention</small>
              </div>
            </article>

            <article className="scsn-stat-card">
              <div className="scsn-stat-icon green">
                <CircleCheck size={22} />
              </div>

              <div className="scsn-stat-info">
                <span>Read Notifications</span>
                <strong>{stats.read}</strong>
                <small>Already viewed notifications</small>
              </div>
            </article>

          </section>

          {/* =====================================
              NOTIFICATION WORKSPACE
          ===================================== */}

          <section className="scsn-workspace">

            {/* WORKSPACE HEADER */}

            <div className="scsn-workspace-header">
              <div>
                <h2>All Notifications</h2>

                <p>
                  View and manage your latest updates.
                </p>
              </div>

              <span className="scsn-count-pill">
                {filteredNotifications.length}{" "}
                {filteredNotifications.length === 1
                  ? "Notification"
                  : "Notifications"}
              </span>
            </div>

            {/* TOOLBAR */}

            <div className="scsn-toolbar">

              <div className="scsn-search">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search notifications..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="scsn-filter-group">
                <Filter size={16} />

                {[
                  {
                    label: "All",
                    value: "all",
                    count: stats.total,
                  },
                  {
                    label: "Unread",
                    value: "unread",
                    count: stats.unread,
                  },
                  {
                    label: "Read",
                    value: "read",
                    count: stats.read,
                  },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={
                      activeFilter === filter.value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                  >
                    {filter.label}

                    <span>{filter.count}</span>
                  </button>
                ))}
              </div>

            </div>

            {/* NOTIFICATION LIST */}

            <div className="scsn-notification-list">

              {loading ? (
                <div className="scsn-state">
                  <div className="scsn-loader">
                    <RefreshCw size={25} />
                  </div>

                  <h3>Loading notifications</h3>

                  <p>
                    Please wait while we retrieve your
                    notifications.
                  </p>
                </div>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    markingId={markingId}
                    onSelect={selectNotification}
                    selected={
                      selectedNotification?.id ===
                      notification.id
                    }
                  />
                ))
              ) : (
                <div className="scsn-state">
                  <div className="scsn-empty-icon">
                    {activeFilter === "unread" ? (
                      <CheckCheck size={27} />
                    ) : (
                      <Bell size={27} />
                    )}
                  </div>

                  <h3>
                    {search
                      ? "No matching notifications"
                      : activeFilter === "unread"
                      ? "You're all caught up!"
                      : activeFilter === "read"
                      ? "No read notifications"
                      : "No notifications yet"}
                  </h3>

                  <p>
                    {search
                      ? "Try using a different search term."
                      : activeFilter === "unread"
                      ? "You don't have any unread notifications."
                      : "New updates will appear here when they arrive."}
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* LIST FOOTER */}

            {!loading && notifications.length > 0 && (
              <div className="scsn-list-footer">
                <span>
                  Showing {filteredNotifications.length} of{" "}
                  {notifications.length} notifications
                </span>

                <span>
                  <ShieldCheck size={14} />
                  Updates from CivicFix
                </span>
              </div>
            )}

          </section>

          {/* FOOTER */}

          <footer className="scsn-footer">
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