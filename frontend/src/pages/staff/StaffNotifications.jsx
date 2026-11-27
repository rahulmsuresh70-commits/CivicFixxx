
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  CircleDot,
  Inbox,
  AlertCircle,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './StaffNotifications.css';

function getNotifications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function notificationCategory(item) {
  const message = String(item?.message || '').toLowerCase();

  if (message.includes('message')) return 'Message';
  if (message.includes('deadline')) return 'Deadline';
  if (message.includes('assign')) return 'Assignment';
  if (
    message.includes('resolved') ||
    message.includes('verified')
  ) {
    return 'Resolution';
  }

  return 'Complaint update';
}

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  // Fetch notifications
  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    setError('');
    setSuccess('');

    try {
      const response = await api.get('/notifications/');

      setNotifications(getNotifications(response.data));
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to load notifications. Please try again.'
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Notification statistics
  const unreadCount = useMemo(() => {
    return notifications.filter(
      (item) => !item.is_read
    ).length;
  }, [notifications]);

  // Search and filtering
  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const isRead = Boolean(item.is_read);

      if (filter === 'unread' && isRead) {
        return false;
      }

      if (filter === 'read' && !isRead) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        item.message,
        item.report ? `complaint ${item.report}` : '',
        notificationCategory(item),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [notifications, search, filter]);

  // Mark notification as read
  const handleMarkRead = async (notification) => {
    if (
      notification.is_read ||
      markingId === notification.id
    ) {
      return;
    }

    setMarkingId(notification.id);
    setError('');
    setSuccess('');

    try {
      await api.post(
        `/notifications/${notification.id}/read/`
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setSuccess('Notification marked as read.');
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to update this notification.'
      );
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <section className="sn-page">

      {/* Page Header */}
      <div className="sn-hero">
        <div>
          <span className="sn-eyebrow">
            STAFF WORKSPACE
          </span>

          <h1>Notifications</h1>

          <p>
            Stay informed about complaint assignments,
            updates, and important activity.
          </p>
        </div>

        <div className="sn-hero-icon">
          <Bell size={29} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="sn-alert sn-error" role="alert">
          <AlertCircle size={17} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => loadNotifications(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="sn-alert sn-success" role="status">
          <CheckCheck size={17} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="sn-stats">

        <article className="sn-stat-card">
          <span className="sn-stat-icon sn-icon-total">
            <Inbox size={20} />
          </span>

          <div>
            <span className="sn-stat-label">
              Total Notifications
            </span>

            <strong>{notifications.length}</strong>

            <small>All notifications received</small>
          </div>
        </article>

        <article className="sn-stat-card">
          <span className="sn-stat-icon sn-icon-unread">
            <CircleDot size={20} />
          </span>

          <div>
            <span className="sn-stat-label">
              Unread
            </span>

            <strong>{unreadCount}</strong>

            <small>Need your attention</small>
          </div>
        </article>

        <article className="sn-stat-card">
          <span className="sn-stat-icon sn-icon-read">
            <CheckCheck size={20} />
          </span>

          <div>
            <span className="sn-stat-label">
              Read
            </span>

            <strong>
              {notifications.length - unreadCount}
            </strong>

            <small>Already viewed</small>
          </div>
        </article>

      </div>

      {/* Notification Records */}
      <div className="sn-records">

        <div className="sn-records-heading">
          <div>
            <h2>Recent Activity</h2>

            <p>
              {filteredNotifications.length} of{' '}
              {notifications.length} notifications
            </p>
          </div>

          <button
            type="button"
            className="sn-refresh"
            onClick={() => loadNotifications(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'sn-spinning' : ''}
            />

            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="sn-toolbar">

          <label className="sn-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search notifications or complaint ID..."
            />
          </label>

          <div
            className="sn-filters"
            role="group"
            aria-label="Notification filters"
          >
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ].map((option) => (
              <button
                type="button"
                key={option.value}
                className={
                  filter === option.value ? 'active' : ''
                }
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 ? (
          <div className="sn-empty">

            <span>
              <Bell size={25} />
            </span>

            <h3>
              {notifications.length === 0
                ? 'No notifications yet'
                : 'No matching notifications'}
            </h3>

            <p>
              {notifications.length === 0
                ? 'New complaint and workspace updates will appear here.'
                : 'Try changing your search or notification filter.'}
            </p>

          </div>
        ) : (

          /* Notification List */
          <div className="sn-list">

            {filteredNotifications.map((item) => (
              <article
                className={`sn-item ${
                  item.is_read ? 'is-read' : 'is-unread'
                }`}
                key={item.id}
              >

                <span
                  className={`sn-item-icon ${
                    item.is_read ? 'read' : 'unread'
                  }`}
                >
                  {item.report ? (
                    <FileText size={19} />
                  ) : (
                    <Bell size={19} />
                  )}
                </span>

                <div className="sn-item-body">

                  <div className="sn-item-topline">

                    <span className="sn-category">
                      {notificationCategory(item)}
                    </span>

                    {!item.is_read && (
                      <span className="sn-unread-pill">
                        <span />
                        New
                      </span>
                    )}

                  </div>

                  <p className="sn-message">
                    {item.message ||
                      'You have a new CivicFix update.'}
                  </p>

                  <div className="sn-item-meta">

                    <span>
                      <Clock3 size={13} />
                      {formatDate(item.created_at)}
                    </span>

                    {item.report && (
                      <span>
                        <FileText size={13} />
                        Complaint #{item.report}
                      </span>
                    )}

                  </div>

                </div>

                <div className="sn-item-action">

                  {item.is_read ? (
                    <span className="sn-read-label">
                      <Check size={14} />
                      Read
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item)}
                      disabled={markingId === item.id}
                    >
                      <Check size={14} />

                      {markingId === item.id
                        ? 'Updating'
                        : 'Mark as read'}
                    </button>
                  )}

                </div>

              </article>
            ))}

          </div>
        )}

      </div>

    </section>
  );
}
