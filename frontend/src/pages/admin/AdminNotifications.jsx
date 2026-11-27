import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Search,
  RefreshCw,
  Eye,
  Mail,
  MailOpen,
  FileText,
  AlertCircle,
  X,
  CalendarDays,
  Filter,
  Inbox,
} from "lucide-react";

import api from "../../api/axios";
import "./AdminNotifications.css";

const NOTIFICATIONS_URL = "/notifications/";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data === "string") {
    return data;
  }

  if (!error?.response) {
    return "Unable to connect to the server. Please check your connection.";
  }

  return "Unable to load notifications. Please try again.";
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRelativeTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 0) return "Just now";
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  /* =========================================
     LOAD NOTIFICATIONS
  ========================================= */

  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get(NOTIFICATIONS_URL);

      const data = getArray(response.data);

      setNotifications(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /* =========================================
     STATISTICS
  ========================================= */

  const statistics = useMemo(() => {
    const total = notifications.length;

    const unread = notifications.filter(
      (item) => !item.is_read
    ).length;

    const read = notifications.filter(
      (item) => item.is_read
    ).length;

    const today = new Date();

    const todayCount = notifications.filter((item) => {
      if (!item.created_at) return false;

      const date = new Date(item.created_at);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toDateString() === today.toDateString()
      );
    }).length;

    return {
      total,
      unread,
      read,
      today: todayCount,
    };
  }, [notifications]);

  /* =========================================
     SEARCH AND FILTER
  ========================================= */

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications
      .filter((item) => {
        if (filter === "unread") {
          return !item.is_read;
        }

        if (filter === "read") {
          return item.is_read;
        }

        return true;
      })
      .filter((item) => {
        if (!term) return true;

        const searchableValues = [
          item.id,
          item.message,
          item.report,
          item.created_at,
        ];

        return searchableValues.some((value) =>
          String(value ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return dateB - dateA;
      });
  }, [notifications, search, filter]);

  /* =========================================
     MARK NOTIFICATION AS READ
  ========================================= */

  const markAsRead = async (notification) => {
    if (!notification || notification.is_read) return;

    setActionLoading(notification.id);
    setError("");

    try {
      await api.post(
        `${NOTIFICATIONS_URL}${notification.id}/read/`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setSelectedNotification((current) =>
        current?.id === notification.id
          ? { ...current, is_read: true }
          : current
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  /* =========================================
     MARK ALL AS READ
     Uses the existing individual read endpoint.
  ========================================= */

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (item) => !item.is_read
    );

    if (unreadNotifications.length === 0) return;

    setActionLoading("all");
    setError("");

    const successfulIds = [];

    for (const notification of unreadNotifications) {
      try {
        await api.post(
          `${NOTIFICATIONS_URL}${notification.id}/read/`
        );

        successfulIds.push(notification.id);
      } catch (err) {
        console.error(
          `Unable to mark notification ${notification.id} as read:`,
          err
        );
      }
    }

    if (successfulIds.length > 0) {
      setNotifications((current) =>
        current.map((item) =>
          successfulIds.includes(item.id)
            ? { ...item, is_read: true }
            : item
        )
      );

      setSelectedNotification((current) =>
        current && successfulIds.includes(current.id)
          ? { ...current, is_read: true }
          : current
      );
    }

    if (successfulIds.length !== unreadNotifications.length) {
      setError(
        "Some notifications could not be marked as read. Please try again."
      );
    }

    setActionLoading(null);
  };

  /* =========================================
     OPEN NOTIFICATION DETAILS
  ========================================= */

  const openNotification = async (notification) => {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      await markAsRead(notification);
    }
  };

  /* =========================================
     CLOSE DETAILS
  ========================================= */

  const closeDetails = () => {
    setSelectedNotification(null);
  };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="an-page">

      {/* PAGE HEADER */}

      <div className="an-page-header">

        <div className="an-header-content">

          <div className="an-header-icon">
            <BellRing size={25} />
          </div>

          <div>
            <span className="an-eyebrow">
              ADMINISTRATION
            </span>

            <h2>Notifications</h2>

            <p>
              View and manage notifications received by your admin account.
            </p>
          </div>

        </div>

        <div className="an-header-actions">

          <button
            type="button"
            className="an-refresh-button"
            onClick={() => loadNotifications(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "an-spinning" : ""}
            />

            <span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            className="an-mark-all-button"
            onClick={markAllAsRead}
            disabled={
              statistics.unread === 0 ||
              actionLoading === "all"
            }
          >
            <CheckCheck size={17} />

            <span>
              {actionLoading === "all"
                ? "Updating..."
                : "Mark all as read"}
            </span>
          </button>

        </div>

      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="an-error-message">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <section className="an-stats-grid">

        <div className="an-stat-card">

          <div className="an-stat-icon an-stat-blue">
            <Bell size={21} />
          </div>

          <div className="an-stat-info">
            <span>Total Notifications</span>
            <h3>{statistics.total}</h3>
            <small>Notifications received</small>
          </div>

        </div>

        <div className="an-stat-card">

          <div className="an-stat-icon an-stat-orange">
            <Mail size={21} />
          </div>

          <div className="an-stat-info">
            <span>Unread</span>
            <h3>{statistics.unread}</h3>
            <small>Waiting for your attention</small>
          </div>

        </div>

        <div className="an-stat-card">

          <div className="an-stat-icon an-stat-green">
            <MailOpen size={21} />
          </div>

          <div className="an-stat-info">
            <span>Read</span>
            <h3>{statistics.read}</h3>
            <small>Already viewed</small>
          </div>

        </div>

        <div className="an-stat-card">

          <div className="an-stat-icon an-stat-purple">
            <CalendarDays size={21} />
          </div>

          <div className="an-stat-info">
            <span>Today</span>
            <h3>{statistics.today}</h3>
            <small>Received today</small>
          </div>

        </div>

      </section>

      {/* NOTIFICATION CONTENT */}

      <section className="an-main-card">

        <div className="an-content-heading">

          <div>
            <h3>All Notifications</h3>

            <p>
              Your notification activity and updates.
            </p>
          </div>

          <div className="an-total-badge">
            <Bell size={15} />
            {filteredNotifications.length} notifications
          </div>

        </div>

        {/* TOOLBAR */}

        <div className="an-toolbar">

          <div className="an-search-box">
            <Search size={18} />

            <input
              type="text"
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
                <X size={16} />
              </button>
            )}
          </div>

          <div className="an-filter-wrapper">

            <Filter size={17} />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              aria-label="Filter notifications"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

          </div>

        </div>

        {/* NOTIFICATION LIST */}

        <div className="an-notification-list">

          {loading ? (

            <div className="an-state-container">
              <div className="an-loader" />

              <h3>Loading notifications</h3>

              <p>Please wait while we retrieve your notifications.</p>
            </div>

          ) : filteredNotifications.length === 0 ? (

            <div className="an-state-container">

              <div className="an-empty-icon">
                <Inbox size={32} />
              </div>

              <h3>
                {search || filter !== "all"
                  ? "No matching notifications"
                  : "No notifications yet"}
              </h3>

              <p>
                {search || filter !== "all"
                  ? "Try changing your search or filter."
                  : "New notifications will appear here when they are received."}
              </p>

              {(search || filter !== "all") && (
                <button
                  type="button"
                  className="an-clear-filters"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              )}

            </div>

          ) : (

            filteredNotifications.map((notification) => (

              <article
                className={`an-notification-item ${
                  notification.is_read ? "an-is-read" : "an-is-unread"
                }`}
                key={notification.id}
              >

                <div className="an-item-icon">
                  {notification.is_read ? (
                    <MailOpen size={20} />
                  ) : (
                    <BellRing size={20} />
                  )}
                </div>

                <div className="an-item-content">

                  <div className="an-item-topline">

                    <div className="an-item-status">

                      <span
                        className={`an-status-dot ${
                          notification.is_read
                            ? "an-dot-read"
                            : "an-dot-unread"
                        }`}
                      />

                      <span>
                        {notification.is_read ? "Read" : "Unread"}
                      </span>

                    </div>

                    <span className="an-item-relative-time">
                      <Clock size={13} />
                      {getRelativeTime(notification.created_at)}
                    </span>

                  </div>

                  <p className="an-item-message">
                    {notification.message || "No notification message available."}
                  </p>

                  <div className="an-item-meta">

                    <span>
                      <CalendarDays size={14} />
                      {formatDate(notification.created_at)}
                    </span>

                    {notification.report !== null &&
                      notification.report !== undefined && (
                        <span>
                          <FileText size={14} />
                          Report #{notification.report}
                        </span>
                      )}

                  </div>

                </div>

                <div className="an-item-actions">

                  <button
                    type="button"
                    className="an-view-button"
                    onClick={() => openNotification(notification)}
                    title="View notification"
                  >
                    <Eye size={17} />
                    <span>View</span>
                  </button>

                  {!notification.is_read && (
                    <button
                      type="button"
                      className="an-read-button"
                      onClick={() => markAsRead(notification)}
                      disabled={actionLoading === notification.id}
                      title="Mark as read"
                    >
                      <Check size={17} />
                    </button>
                  )}

                </div>

              </article>

            ))

          )}

        </div>

        {/* LIST FOOTER */}

        {!loading && notifications.length > 0 && (
          <div className="an-list-footer">

            <span>
              Showing {filteredNotifications.length} of{" "}
              {notifications.length} notifications
            </span>

            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={14}
                className={refreshing ? "an-spinning" : ""}
              />
              Refresh list
            </button>

          </div>
        )}

      </section>

      {/* NOTIFICATION DETAILS MODAL */}

      {selectedNotification && (

        <div
          className="an-modal-overlay"
          onClick={closeDetails}
        >

          <div
            className="an-details-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="an-modal-header">

              <div className="an-modal-heading">

                <div className="an-modal-icon">
                  <BellRing size={21} />
                </div>

                <div>
                  <h3>Notification Details</h3>
                  <p>Notification #{selectedNotification.id}</p>
                </div>

              </div>

              <button
                type="button"
                className="an-modal-close"
                onClick={closeDetails}
                aria-label="Close notification details"
              >
                <X size={21} />
              </button>

            </div>

            <div className="an-modal-body">

              <div className="an-detail-status-row">

                <span
                  className={`an-detail-status ${
                    selectedNotification.is_read
                      ? "an-detail-read"
                      : "an-detail-unread"
                  }`}
                >
                  {selectedNotification.is_read ? (
                    <CheckCheck size={15} />
                  ) : (
                    <Bell size={15} />
                  )}

                  {selectedNotification.is_read ? "Read" : "Unread"}
                </span>

                <span className="an-detail-date">
                  <Clock size={14} />
                  {getRelativeTime(selectedNotification.created_at)}
                </span>

              </div>

              <div className="an-detail-message-box">

                <span className="an-detail-label">
                  Notification Message
                </span>

                <p>
                  {selectedNotification.message ||
                    "No notification message available."}
                </p>

              </div>

              <div className="an-detail-information">

                <div className="an-detail-info-row">
                  <span>Notification ID</span>
                  <strong>#{selectedNotification.id}</strong>
                </div>

                <div className="an-detail-info-row">
                  <span>Report ID</span>

                  <strong>
                    {selectedNotification.report !== null &&
                    selectedNotification.report !== undefined
                      ? `#${selectedNotification.report}`
                      : "Not linked to a report"}
                  </strong>
                </div>

                <div className="an-detail-info-row">
                  <span>Received on</span>

                  <strong>
                    {formatDate(selectedNotification.created_at)}
                  </strong>
                </div>

                <div className="an-detail-info-row">
                  <span>Read status</span>

                  <strong>
                    {selectedNotification.is_read ? "Read" : "Unread"}
                  </strong>
                </div>

              </div>

            </div>

            <div className="an-modal-footer">

              <button
                type="button"
                className="an-modal-secondary"
                onClick={closeDetails}
              >
                Close
              </button>

              {!selectedNotification.is_read && (
                <button
                  type="button"
                  className="an-modal-primary"
                  onClick={() => markAsRead(selectedNotification)}
                  disabled={
                    actionLoading === selectedNotification.id
                  }
                >
                  <Check size={17} />

                  {actionLoading === selectedNotification.id
                    ? "Updating..."
                    : "Mark as read"}
                </button>
              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminNotifications;