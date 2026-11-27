import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  Mail,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  ClipboardList,
  ChartNoAxesCombined,
  CalendarDays,
  CircleCheck,
  Info,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import './SeniorCitizenManagerDashboard.css';
import './SeniorCitizenManagerNotifications.css';

const NOTIFICATIONS_ENDPOINT = '/notifications/';

const getNotificationList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

const safeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = safeDate(value);

  if (!date) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatRelativeDate = (value) => {
  const date = safeDate(value);

  if (!date) return 'Date unavailable';

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const notificationDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (notificationDay.getTime() === today.getTime()) {
    return 'Today';
  }

  if (notificationDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const managerDisplayName = (user) =>
  [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() ||
  user?.email ||
  'Manager';

const getNotificationIcon = (message) => {
  const value = String(message || '').toLowerCase();

  if (
    value.includes('complete') ||
    value.includes('verified') ||
    value.includes('closed')
  ) {
    return CircleCheck;
  }

  if (
    value.includes('assign') ||
    value.includes('staff') ||
    value.includes('transfer')
  ) {
    return Users;
  }

  if (
    value.includes('reject') ||
    value.includes('issue') ||
    value.includes('problem') ||
    value.includes('overdue')
  ) {
    return CircleAlert;
  }

  if (
    value.includes('request') ||
    value.includes('report')
  ) {
    return ClipboardList;
  }

  return Bell;
};

function NotificationIcon({ notification }) {
  const Icon = getNotificationIcon(notification.message);

  return (
    <span
      className={`scmn-notification-icon ${
        notification.is_read ? 'read' : 'unread'
      }`}
    >
      <Icon size={18} />
    </span>
  );
}

export default function SeniorCitizenManagerNotifications() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [markingId, setMarkingId] = useState(null);

  const [user] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const managerName = managerDisplayName(user);

  /*
   * Fetch notifications from the authenticated user's account.
   * The backend already filters notifications by recipient.
   */
  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await api.get(NOTIFICATIONS_ENDPOINT);
        const list = getNotificationList(response.data);

        setNotifications(list);
      } catch (err) {
        setError(
          getApiErrorMessage(err) ||
            'Unable to load notifications. Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
   * Unread count is derived from the notification data.
   * No unread count is invented or stored separately.
   */
  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.is_read
      ).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  /*
   * Mark one notification as read.
   * This calls the exact backend endpoint:
   * POST /api/notifications/{id}/read/
   */
  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId || markingId !== null) return;

    setMarkingId(notificationId);
    setError('');

    try {
      await api.post(
        `${NOTIFICATIONS_ENDPOINT}${notificationId}/read/`
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
          'Unable to mark this notification as read.'
      );
    } finally {
      setMarkingId(null);
    }
  };

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...notifications]
      .filter((notification) => {
        if (filter === 'unread') {
          return !notification.is_read;
        }

        if (filter === 'read') {
          return notification.is_read;
        }

        return true;
      })
      .filter((notification) => {
        if (!term) return true;

        const searchable = [
          notification.id,
          notification.message,
          notification.report,
          notification.created_at,
        ];

        return searchable.some((value) =>
          String(value ?? '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const dateA =
          safeDate(a.created_at)?.getTime() || 0;
        const dateB =
          safeDate(b.created_at)?.getTime() || 0;

        return dateB - dateA;
      });
  }, [notifications, filter, search]);

  /*
   * Group notifications into Today, Yesterday, and Older.
   */
  const groupedNotifications = useMemo(() => {
    const groups = new Map();

    filteredNotifications.forEach((notification) => {
      const groupName = formatRelativeDate(
        notification.created_at
      );

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName).push(notification);
    });

    return Array.from(groups.entries());
  }, [filteredNotifications]);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/senior-citizen/manager/dashboard',
    },
    {
      name: 'Assistance Requests',
      icon: ClipboardList,
      path: '/senior-citizen/manager/requests',
    },
    {
      name: 'Staff Management',
      icon: Users,
      path: '/senior-citizen/manager/staff',
    },
    {
      name: 'Progress Tracking',
      icon: ChartNoAxesCombined,
      path: '/senior-citizen/manager/progress',
    },
    {
      name: 'Notifications',
      icon: Bell,
      path: '/senior-citizen/manager/notifications',
    },
    
  ];

  const logout = async () => {
    const refresh = localStorage.getItem(
      'civicfix_refresh_token'
    );

    if (refresh) {
      try {
        await api.post('/auth/logout/', { refresh });
      } catch {
        // Clear local session even if server logout fails.
      }
    }

    [
      'civicfix_access_token',
      'civicfix_refresh_token',
      'civicfix_user',
    ].forEach((key) => localStorage.removeItem(key));

    navigate('/senior-citizen/manager/login', {
      replace: true,
    });
  };

  return (
    <div className="sc-dashboard scmn-shell">
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sc-sidebar ${
          sidebarOpen ? 'sc-sidebar-open' : ''
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
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                className={`sc-nav-item ${
                  isActive ? 'active' : ''
                }`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />

                <span>{item.name}</span>

                {item.name === 'Notifications' &&
                  unreadCount > 0 && (
                    <span className="scmn-nav-count">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
              </button>
            );
          })}
          </nav>
          <button
          type="button"
          className={`sc-nav-item ${
            location.pathname === '/senior-citizen/manager/messages'
              ? 'active'
              : ''
          }`}
          onClick={() => {
            navigate('/senior-citizen/manager/messages');
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
            '/senior-citizen/manager/work-management'
              ? 'active'
              : ''
          }`}
          onClick={() => {
            navigate('/senior-citizen/manager/work-management');
            setSidebarOpen(false);
          }}
        >
          <Activity size={19} />
          <span>Work Management</span>
        </button>

        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">
          <button
            type="button"
            className="sc-nav-item"
            onClick={() =>
              navigate('/senior-citizen/manager/profile')
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
              Coordinate assistance and support your local
              senior community.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/senior-citizen/manager/requests')
              }
            >
              View requests
            </button>
          </div>

          <button
            type="button"
            className="sc-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main page */}
      <main className="sc-main">
        <header className="sc-header">
          <div className="sc-header-left">
            <button
              type="button"
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
                Notifications
              </div>

              <h2>Notifications</h2>
            </div>
          </div>

          <div className="sc-header-right">
            <button
              type="button"
              className="sc-notification-button"
              aria-label={`${unreadCount} unread notifications`}
            >
              <Bell size={17} />
              {unreadCount > 0 && <i />}
            </button>

            <button
              type="button"
              className="sc-profile-button"
              onClick={() =>
                navigate('/senior-citizen/manager/profile')
              }
            >
              <span className="sc-avatar">
                {managerName
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>

              <span className="sc-profile-info">
                <strong>{managerName}</strong>
                <small>Senior Citizen Manager</small>
              </span>
            </button>
          </div>
        </header>

        <div className="sc-content">
          {/* Page heading */}
          <section className="scmn-heading">
            <div>
              <span className="scmn-eyebrow">
                SENIOR CARE PORTAL
              </span>

              <h1>Notification centre</h1>

              <p>
                Stay informed about assistance requests,
                assignments, service updates, and other
                account notifications.
              </p>
            </div>

            <button
              type="button"
              className="scmn-refresh"
              onClick={() => loadNotifications(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw
                size={14}
                className={
                  refreshing ? 'scmn-spin' : ''
                }
              />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </section>

          {/* Error message */}
          {error && (
            <div className="scmn-alert" role="alert">
              <CircleAlert size={16} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError('')}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section className="scmn-stats">
            <article className="scmn-stat-card">
              <span className="scmn-stat-icon blue">
                <Bell size={19} />
              </span>

              <div>
                <small>Total notifications</small>
                <strong>
                  {loading ? '—' : notifications.length}
                </strong>
                <span>Notifications received by your account</span>
              </div>
            </article>

            <article className="scmn-stat-card">
              <span className="scmn-stat-icon orange">
                <Activity size={19} />
              </span>

              <div>
                <small>Unread notifications</small>
                <strong>
                  {loading ? '—' : unreadCount}
                </strong>
                <span>Notifications that need your attention</span>
              </div>
            </article>

            <article className="scmn-stat-card">
              <span className="scmn-stat-icon green">
                <CheckCheck size={19} />
              </span>

              <div>
                <small>Read notifications</small>
                <strong>
                  {loading ? '—' : readCount}
                </strong>
                <span>Notifications already marked as read</span>
              </div>
            </article>
          </section>

          {/* Notifications list */}
          <section className="scmn-panel">
            <div className="scmn-panel-heading">
              <div>
                <h3>All notifications</h3>
                <p>
                  {filteredNotifications.length} of{' '}
                  {notifications.length} notifications
                </p>
              </div>

              <span className="scmn-secure-label">
                <ShieldCheck size={14} />
                Private account notifications
              </span>
            </div>

            {/* Search and filters */}
            <div className="scmn-toolbar">
              <label className="scmn-search">
                <Search size={16} />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search notification message or request ID"
                  aria-label="Search notifications"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <div
                className="scmn-filter-tabs"
                role="group"
                aria-label="Filter notifications"
              >
                <button
                  type="button"
                  className={filter === 'all' ? 'active' : ''}
                  onClick={() => setFilter('all')}
                >
                  All
                  <span>{notifications.length}</span>
                </button>

                <button
                  type="button"
                  className={
                    filter === 'unread' ? 'active' : ''
                  }
                  onClick={() => setFilter('unread')}
                >
                  Unread
                  <span>{unreadCount}</span>
                </button>

                <button
                  type="button"
                  className={
                    filter === 'read' ? 'active' : ''
                  }
                  onClick={() => setFilter('read')}
                >
                  Read
                  <span>{readCount}</span>
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="scmn-state">
                <RefreshCw
                  size={22}
                  className="scmn-spin"
                />
                <strong>Loading notifications</strong>
                <p>
                  Please wait while we retrieve your
                  notifications.
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              /* Empty state */
              <div className="scmn-state">
                <span className="scmn-empty-icon">
                  <Bell size={25} />
                </span>

                <strong>
                  {notifications.length === 0
                    ? 'No notifications yet'
                    : 'No matching notifications'}
                </strong>

                <p>
                  {notifications.length === 0
                    ? 'New assistance request updates and service notifications will appear here.'
                    : 'Try another filter or change your search.'}
                </p>

                {(search || filter !== 'all') && (
                  <button
                    type="button"
                    className="scmn-reset"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              /* Notification groups */
              <div className="scmn-list">
                {groupedNotifications.map(
                  ([groupName, groupItems]) => (
                    <section
                      className="scmn-group"
                      key={groupName}
                    >
                      <div className="scmn-group-title">
                        <span>{groupName}</span>
                        <i />
                      </div>

                      {groupItems.map((notification) => (
                        <article
                          className={`scmn-notification ${
                            notification.is_read
                              ? 'is-read'
                              : 'is-unread'
                          }`}
                          key={notification.id}
                        >
                          <NotificationIcon
                            notification={notification}
                          />

                          <div className="scmn-notification-body">
                            <div className="scmn-notification-top">
                              {notification.is_read ? (
                                <span className="scmn-read-badge read">
                                  <Check size={11} />
                                  Read
                                </span>
                              ) : (
                                <span className="scmn-read-badge unread">
                                  <span className="scmn-unread-dot" />
                                  Unread
                                </span>
                              )}

                              <time
                                dateTime={
                                  notification.created_at || undefined
                                }
                              >
                                {formatDateTime(
                                  notification.created_at
                                )}
                              </time>
                            </div>

                            <p className="scmn-message">
                              {notification.message ||
                                'A new notification is available.'}
                            </p>

                            {notification.report !== null &&
                              notification.report !== undefined && (
                                <span className="scmn-report-reference">
                                  <FileText size={12} />
                                  Related report #{notification.report}
                                </span>
                              )}
                          </div>

                          <div className="scmn-notification-action">
                            {notification.is_read ? (
                              <span className="scmn-read-confirmed">
                                <CheckCircle size={13} />
                                Read
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkAsRead(
                                    notification.id
                                  )
                                }
                                disabled={
                                  markingId === notification.id
                                }
                              >
                                {markingId === notification.id ? (
                                  <>
                                    <RefreshCw
                                      size={12}
                                      className="scmn-spin"
                                    />
                                    Saving…
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    Mark as read
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </section>
                  )
                )}
              </div>
            )}

            <footer className="scmn-panel-footer">
              <span>
                Showing {filteredNotifications.length} of{' '}
                {notifications.length} notifications
              </span>

              <span>
                <ShieldCheck size={13} />
                Only your account notifications are shown
              </span>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}