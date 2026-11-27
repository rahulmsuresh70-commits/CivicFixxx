
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../../api/axios';
import './Notifications.css';

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/notifications/');

      if (!Array.isArray(response.data)) {
        throw new Error(
          'Unexpected notifications response from the server.'
        );
      }

      setNotifications(response.data);
    } catch (err) {
      setError(
        getApiErrorMessage
          ? getApiErrorMessage(err)
          : err.message || 'Unable to load notifications.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.is_read);
    }

    if (filter === 'read') {
      return notifications.filter((item) => item.is_read);
    }

    return notifications;
  }, [notifications, filter]);

  const markAsRead = async (notification) => {
    if (notification.is_read || markingId !== null) return;

    setMarkingId(notification.id);
    setError('');

    try {
      await api.post(`/notifications/${notification.id}/read/`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      setError(
        getApiErrorMessage
          ? getApiErrorMessage(err)
          : err.message || 'Unable to mark this notification as read.'
      );
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <main className="cf-notifications-page">
      <div className="cf-notifications-container">

        {/* Page heading */}
        <header className="cf-notifications-header">
          <div className="cf-notifications-heading">
            <div className="cf-notifications-eyebrow">
              <Bell size={16} />
              Citizen dashboard
            </div>

            <h1>Notifications</h1>

            <p>
              Stay informed about updates to your CivicFix complaints
              and assistance requests.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="cf-notifications-refresh"
          >
            <RefreshCw
              size={16}
              className={loading ? 'cf-notifications-spin' : ''}
            />
            Refresh
          </button>
        </header>

        {/* Summary cards */}
        <section className="cf-notifications-stats">
          <article className="cf-notifications-stat">
            <div>
              <div className="cf-notifications-stat-label">
                Total notifications
              </div>

              <div className="cf-notifications-stat-value">
                {notifications.length}
              </div>
            </div>

            <div className="cf-notifications-stat-icon">
              <Bell size={23} />
            </div>
          </article>

          <article className="cf-notifications-stat">
            <div>
              <div className="cf-notifications-stat-label">
                Unread notifications
              </div>

              <div className="cf-notifications-stat-value">
                {unreadCount}
              </div>
            </div>

            <div className="cf-notifications-stat-icon is-unread">
              <Clock3 size={23} />
            </div>
          </article>
        </section>

        {/* Notifications panel */}
        <section className="cf-notifications-panel">
          <div className="cf-notifications-panel-header">
            <div className="cf-notifications-panel-title">
              <h2>Recent activity</h2>

              <p>
                Your latest notifications, newest first.
              </p>
            </div>

            {/* Notification filters */}
            <div className="cf-notifications-filters">
              {[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'read', label: 'Read' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`cf-notifications-filter ${
                    filter === option.value ? 'active' : ''
                  }`}
                  aria-pressed={filter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="cf-notifications-error" role="alert">
              <p>{error}</p>

              <button
                type="button"
                onClick={fetchNotifications}
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="cf-notifications-loading">
              <LoaderCircle
                size={30}
                className="cf-notifications-spinner"
              />

              <p>Loading your notifications...</p>
            </div>
          ) : visibleNotifications.length === 0 ? (

            /* Empty state */
            <div className="cf-notifications-empty">
              <div className="cf-notifications-empty-icon">
                {filter === 'unread' ? (
                  <CheckCheck size={30} />
                ) : (
                  <Bell size={30} />
                )}
              </div>

              <h3>
                {filter === 'unread'
                  ? 'You are all caught up'
                  : filter === 'read'
                    ? 'No read notifications'
                    : 'No notifications yet'}
              </h3>

              <p>
                {filter === 'unread'
                  ? 'You have no unread notifications right now.'
                  : filter === 'read'
                    ? 'Notifications you have read will appear here.'
                    : 'Updates from your CivicFix activity will appear here.'}
              </p>
            </div>
          ) : (

            /* Notification list */
            <div className="cf-notifications-list">
              {visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`cf-notification-row ${
                    !notification.is_read ? 'is-unread' : ''
                  }`}
                >
                  <div className="cf-notification-icon">
                    <Bell size={20} />
                  </div>

                  <div className="cf-notification-row-content">
                    <div className="cf-notification-row-heading">
                      <h3>Notification</h3>

                      {!notification.is_read && (
                        <span className="cf-notification-new">
                          New
                        </span>
                      )}
                    </div>

                    <p className="cf-notification-message">
                      {notification.message}
                    </p>

                    <div className="cf-notification-meta">
                      <span className="cf-notification-time">
                        <Clock3 size={14} />
                        {formatDate(notification.created_at)}
                      </span>

                      {notification.report != null && (
                        <Link
                          to="/user/complaints"
                          className="cf-notification-report-link"
                        >
                          Complaint #{notification.report}
                          <ExternalLink size={13} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification)}
                      disabled={markingId !== null}
                      aria-label={`Mark notification ${notification.id} as read`}
                      title="Mark as read"
                      className="cf-notification-read-button"
                    >
                      {markingId === notification.id ? (
                        <LoaderCircle
                          size={17}
                          className="cf-notifications-spinner"
                        />
                      ) : (
                        <CheckCheck size={18} />
                      )}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Panel footer */}
          {!loading && (
            <footer className="cf-notifications-footer">
              <span>
                <strong>{unreadCount}</strong>{' '}
                unread notification{unreadCount === 1 ? '' : 's'}
              </span>

              <span>
                CivicFix · Citizen services
              </span>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
