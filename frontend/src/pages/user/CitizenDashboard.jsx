
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import MyComplaints from './MyComplaints';
import SubmitComplaint from './SubmitComplaint';
import SeniorCitizenAssistance from './SeniorCitizenAssistance';
import Notifications from './Notifications';
import Messages from './Messages';
import Profile from './Profile';
import DashboardAnalytics, { CountUp } from './DashboardAnalytics';

import api, {
  getApiErrorMessage,
} from '../../api/axios';

import './CitizenDashboard.css';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: '▦',
    to: '/user/dashboard',
  },
  {
    label: 'My complaints',
    icon: '▤',
    to: '/user/complaints',
  },
  {
    label: 'Submit a complaint',
    icon: '+',
    to: '/user/complaints/new',
  },
  {
    label: 'Senior citizen assistance',
    icon: '♡',
    to: '/user/senior-citizen-assistance',
  },
  {
    label: 'Notifications',
    icon: '♧',
    to: '/user/notifications',
  },
  {
    label: 'Messages',
    icon: '▱',
    to: '/user/messages',
  },
  {
    label: 'My profile',
    icon: '◎',
    to: '/user/profile',
  },
];

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  transferred: 'Transferred',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
  verified: 'Verified',
  closed: 'Closed',
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

function displayName(user) {
  const name = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    user?.email?.split('@')[0] ||
    'Citizen'
  );
}

function getArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function BrandMark() {
  return (
    <span
      className="cf-brand-mark"
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none">
        <rect
          width="40"
          height="40"
          rx="12"
          fill="currentColor"
        />

        <path
          d="M11 13.5 20 8l9 5.5v13L20 32l-9-5.5v-13Z"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path
          d="m15.5 20 3.5 3.5 6.5-7"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Sidebar({
  onLogout,
  loggingOut,
  mobileOpen,
  closeMobile,
  isMyComplaints,
  isSubmitComplaint,
  isDashboard,
  isSeniorCitizenAssistance,
  isNotifications,
  isMessages,
  isProfile,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          className="cf-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`cf-sidebar ${
          mobileOpen ? 'is-open' : ''
        }`}
      >
        <Link
          className="cf-brand"
          to="/user/dashboard"
          onClick={closeMobile}
        >
          <BrandMark />

          <span>
            CivicFix</span>
            
          
        </Link>

        <div className="cf-nav-caption">
          WORKSPACE
        </div>

        <nav
          className="cf-side-nav"
          aria-label="Citizen navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              (item.to === '/user/dashboard' &&
                isDashboard) ||
              (item.to === '/user/complaints' &&
                isMyComplaints) ||
              (item.to === '/user/complaints/new' &&
                isSubmitComplaint) ||
              (item.to === '/user/senior-citizen-assistance' &&
                isSeniorCitizenAssistance) ||
              (item.to === '/user/notifications' &&
                isNotifications) ||
              (item.to === '/user/messages' &&
                isMessages) ||
              (item.to === '/user/profile' &&
                isProfile);

            const isSupportedRoute = [
              '/user/dashboard',
              '/user/complaints',
              '/user/complaints/new',
              '/user/senior-citizen-assistance',
              '/user/notifications',
              '/user/messages',
              '/user/profile',
            ].includes(item.to);

            if (isSupportedRoute) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={closeMobile}
                  className={`cf-nav-link ${
                    active ? 'active' : ''
                  }`}
                  aria-current={
                    active ? 'page' : undefined
                  }
                >
                  <span className="cf-nav-icon">
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {active && (
                    <span className="cf-nav-active-dot" />
                  )}
                </Link>
              );
            }

            // Preserve existing disabled navigation items.
            return (
              <div
                key={item.label}
                className="cf-nav-link cf-nav-disabled"
                aria-disabled="true"
                title="This page will be connected in its development step"
              >
                <span className="cf-nav-icon">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="cf-sidebar-help">
          <div className="cf-help-icon">✦</div>

          <strong>Making our city better</strong>

          <p>
            Your voice helps improve the community we share.
          </p>
        </div>

        <button
          className="cf-logout-button"
          onClick={onLogout}
          disabled={loggingOut}
        >
          <span className="cf-nav-icon">↪</span>

          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>

        <div className="cf-sidebar-foot">
          CivicFix · Citizen services
        </div>
      </aside>
    </>
  );
}

function StatusBadge({ status }) {
  const key = String(status || 'unknown').toLowerCase();

  return (
    <span className={`cf-status cf-status-${key}`}>
      {STATUS_LABELS[key] || key.replaceAll('_', ' ')}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}) {
  return (
    <article className="cf-stat-card">
      <div className={`cf-stat-icon ${tone}`}>
        {icon}
      </div>

      <div className="cf-stat-label">
        {label}
      </div>

      <div className="cf-stat-value">
        <CountUp value={value} />
      </div>

      <div className="cf-stat-detail">
        {detail}
      </div>
    </article>
  );
}

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath =
    location.pathname.replace(/\/+$/, '') || '/';

  const isMyComplaints =
    currentPath === '/user/complaints';

  const isSubmitComplaint =
    currentPath === '/user/complaints/new';

  const isSeniorCitizenAssistance =
    currentPath === '/user/senior-citizen-assistance';

  const isNotifications =
    currentPath === '/user/notifications';

  const isMessages =
    currentPath === '/user/messages';

  const isProfile =
    currentPath === '/user/profile';

  const isDashboard =
    currentPath === '/user/dashboard' ||
    currentPath === '/user';

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [profileError, setProfileError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [notificationsError, setNotificationsError] =
    useState('');

  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  // Live analytics: silent background refresh every 30 seconds.
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem(
      'civicfix_access_token'
    );

    if (!token) {
      navigate('/login', {
        replace: true,
        state: {
          message: 'Please log in to access your dashboard.',
        },
      });

      return;
    }

    setLoading(true);
    setProfileError('');
    setReportsError('');
    setNotificationsError('');

    const [
      profileResult,
      reportsResult,
      notificationsResult,
    ] = await Promise.allSettled([
      api.get('/auth/me/'),
      api.get('/reports/'),
      api.get('/notifications/'),
    ]);

    if (profileResult.status === 'fulfilled') {
      const profile = profileResult.value.data;

      if (
        String(profile?.role || '').toUpperCase() !==
        'CITIZEN'
      ) {
        navigate('/login', {
          replace: true,
          state: {
            message: 'This dashboard is for citizen accounts.',
          },
        });

        return;
      }

      setUser(profile);

      localStorage.setItem(
        'civicfix_user',
        JSON.stringify(profile)
      );
    } else {
      setProfileError(
        getApiErrorMessage(profileResult.reason)
      );

      if (
        profileResult.reason?.response?.status === 401
      ) {
        localStorage.removeItem('civicfix_access_token');
        localStorage.removeItem('civicfix_refresh_token');
        localStorage.removeItem('civicfix_user');

        navigate('/login', {
          replace: true,
          state: {
            message:
              'Your session has expired. Please log in again.',
          },
        });

        return;
      }
    }

    if (reportsResult.status === 'fulfilled') {
      setReports(getArray(reportsResult.value.data));
    } else {
      setReportsError(
        getApiErrorMessage(reportsResult.reason)
      );
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(
        getArray(notificationsResult.value.data)
      );
    } else {
      setNotificationsError(
        getApiErrorMessage(notificationsResult.reason)
      );
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshLive = useCallback(async () => {
    if (!localStorage.getItem('civicfix_access_token')) {
      return;
    }

    setRefreshing(true);

    const [reportsResult, notificationsResult] =
      await Promise.allSettled([
        api.get('/reports/'),
        api.get('/notifications/'),
      ]);

    if (reportsResult.status === 'fulfilled') {
      setReports(getArray(reportsResult.value.data));
      setReportsError('');
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(
        getArray(notificationsResult.value.data)
      );
      setNotificationsError('');
    }

    if (
      reportsResult.status === 'fulfilled' ||
      notificationsResult.status === 'fulfilled'
    ) {
      setLastUpdated(new Date());
    }

    setRefreshing(false);
  }, []);

  // Poll while the dashboard is visible and live mode is on.
  useEffect(() => {
    if (!isDashboard || !live) return undefined;

    const refreshIfVisible = () => {
      if (!document.hidden) refreshLive();
    };

    const timer = setInterval(refreshIfVisible, 30000);

    document.addEventListener(
      'visibilitychange',
      refreshIfVisible
    );

    return () => {
      clearInterval(timer);

      document.removeEventListener(
        'visibilitychange',
        refreshIfVisible
      );
    };
  }, [isDashboard, live, refreshLive]);

  // Close mobile navigation and profile menu after route changes.
  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const stats = useMemo(
    () => ({
      total: reports.length,

      submitted: reports.filter((report) =>
        ['submitted', 'under_review'].includes(
          String(report.status).toLowerCase()
        )
      ).length,

      progress: reports.filter((report) =>
        [
          'approved',
          'transferred',
          'assigned',
          'in_progress',
          'reopened',
        ].includes(String(report.status).toLowerCase())
      ).length,

      resolved: reports.filter((report) =>
        ['resolved', 'verified', 'closed'].includes(
          String(report.status).toLowerCase()
        )
      ).length,
    }),
    [reports]
  );

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const recentReports = reports.slice(0, 5);
  const recentNotifications = notifications.slice(0, 4);

  const handleLogout = async () => {
    setLoggingOut(true);

    const refresh = localStorage.getItem(
      'civicfix_refresh_token'
    );

    if (refresh) {
      try {
        await api.post('/auth/logout/', { refresh });
      } catch {
        // Clear the local session even if the server is unavailable.
      }
    }

    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');

    navigate('/', { replace: true });
  };

  return (
    <div className="cf-dashboard-shell">
      <Sidebar
        onLogout={handleLogout}
        loggingOut={loggingOut}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
        isMyComplaints={isMyComplaints}
        isSubmitComplaint={isSubmitComplaint}
        isDashboard={isDashboard}
        isSeniorCitizenAssistance={isSeniorCitizenAssistance}
        isNotifications={isNotifications}
        isMessages={isMessages}
        isProfile={isProfile}
      />

      <main className="cf-dashboard-main">
        {/* Persistent dashboard header */}
        <header className="cf-topbar">
          <button
            className="cf-mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="cf-breadcrumb">
            <span>Citizen portal</span>

            <span className="cf-breadcrumb-separator">
              /
            </span>

            <strong>
              {isProfile
                ? 'My profile'
                : isMessages
                  ? 'Messages'
                  : isNotifications
                    ? 'Notifications'
                    : isSeniorCitizenAssistance
                      ? 'Senior Citizen Assistance'
                      : isSubmitComplaint
                        ? 'Submit a complaint'
                        : isMyComplaints
                          ? 'My complaints'
                          : 'Dashboard'}
            </strong>
          </div>

          <div className="cf-topbar-actions">
            <Link
              to="/user/notifications"
              className="cf-icon-button cf-notification-button"
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} unread` : ''
              }`}
              title="Notifications"
              aria-current={
                isNotifications ? 'page' : undefined
              }
            >
              ♧

              {unreadCount > 0 && (
                <span className="cf-notification-dot" />
              )}
            </Link>

            <div className="cf-profile-wrap">
              <button
                className="cf-profile-trigger"
                onClick={() =>
                  setProfileMenuOpen((open) => !open)
                }
                aria-expanded={profileMenuOpen}
              >
                <span className="cf-avatar">
                  {displayName(user)
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <span className="cf-profile-trigger-text">
                  <strong>{displayName(user)}</strong>
                  <small>Citizen</small>
                </span>

                <span className="cf-chevron">⌄</span>
              </button>

              {profileMenuOpen && (
                <div className="cf-profile-menu">
                  <Link
                    to="/user/profile"
                    className="cf-profile-menu-disabled"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    My profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Only this content area changes between dashboard routes */}
        <div className="cf-dashboard-content">
          {isProfile ? (
            <Profile />
          ) : isMyComplaints ? (
            <MyComplaints />
          ) : isSubmitComplaint ? (
            <SubmitComplaint />
          ) : isSeniorCitizenAssistance ? (
            <SeniorCitizenAssistance />
          ) : isNotifications ? (
            <Notifications />
          ) : isMessages ? (
            <Messages />
          ) : (
            <>
              <section className="cf-welcome-row">
                <div>
                  <div className="cf-eyebrow">
                    <span className="cf-live-dot" />
                    YOUR CIVIC SPACE
                  </div>

                  <h1>
                    Welcome back,{' '}
                    {displayName(user).split(' ')[0]}{' '}
                    <span aria-hidden="true"></span>
                  </h1>

                  <p>
                    Here’s an overview of your community reports
                    and their latest progress.
                  </p>
                </div>

                <Link
                  to="/user/complaints/new"
                  className="cf-primary-button"
                >
                  <span>＋</span> Submit a complaint
                </Link>
              </section>

              {(profileError ||
                reportsError ||
                notificationsError) && (
                <div className="cf-api-notice" role="status">
                  <strong>
                    Some dashboard information could not be loaded.
                  </strong>

                  <span>
                    {[
                      profileError &&
                        `Profile: ${profileError}`,
                      reportsError &&
                        `Complaints: ${reportsError}`,
                      notificationsError &&
                        `Notifications: ${notificationsError}`,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </span>

                  <button onClick={loadDashboard}>
                    Try again
                  </button>
                </div>
              )}

              <section
                className="cf-stats-grid"
                aria-label="Complaint summary"
              >
                <StatCard
                  icon="▤"
                  label="Total complaints"
                  value={
                    loading || reportsError
                      ? '—'
                      : stats.total
                  }
                  detail="All reports submitted"
                  tone="blue"
                />

                <StatCard
                  icon="◷"
                  label="Awaiting action"
                  value={
                    loading || reportsError
                      ? '—'
                      : stats.submitted
                  }
                  detail="Submitted or under review"
                  tone="amber"
                />

                <StatCard
                  icon="↗"
                  label="In progress"
                  value={
                    loading || reportsError
                      ? '—'
                      : stats.progress
                  }
                  detail="Being handled by a team"
                  tone="violet"
                />

                <StatCard
                  icon="✓"
                  label="Resolved"
                  value={
                    loading || reportsError
                      ? '—'
                      : stats.resolved
                  }
                  detail="Resolved, verified or closed"
                  tone="green"
                />
              </section>

              <DashboardAnalytics
                reports={reports}
                notifications={notifications}
                loading={loading}
                error={Boolean(reportsError)}
                live={live}
                onToggleLive={() => setLive((value) => !value)}
                onRefresh={refreshLive}
                refreshing={refreshing}
                lastUpdated={lastUpdated}
              />

              <section className="cf-dashboard-grid">
                <article className="cf-panel cf-reports-panel">
                  <div className="cf-panel-heading">
                    <div>
                      <h2>Recent complaints</h2>

                      <p>
                        Track the latest updates on your reports.
                      </p>
                    </div>

                    <Link
                      to="/user/complaints"
                      className="cf-text-link"
                    >
                      View all <span>→</span>
                    </Link>
                  </div>

                  {loading ? (
                    <div className="cf-loading-state">
                      <span className="cf-spinner" />
                      Loading your complaints…
                    </div>
                  ) : reportsError ? (
                    <div className="cf-empty-state">
                      <span className="cf-empty-icon">!</span>

                      <strong>Complaints unavailable</strong>

                      <p>
                        We couldn't load your reports. Please try
                        again.
                      </p>

                      <button
                        className="cf-secondary-button"
                        onClick={loadDashboard}
                      >
                        Retry
                      </button>
                    </div>
                  ) : recentReports.length === 0 ? (
                    <div className="cf-empty-state">
                      <span className="cf-empty-icon">▤</span>

                      <strong>No complaints yet</strong>

                      <p>
                        When you report a community issue, you can
                        follow its progress here.
                      </p>

                      <Link
                        to="/user/complaints/new"
                        className="cf-primary-button cf-small-button"
                      >
                        Submit your first complaint{' '}
                        <span>→</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="cf-table-wrap">
                      <table className="cf-reports-table">
                        <thead>
                          <tr>
                            <th>Complaint</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>
                              <span className="cf-sr-only">
                                Details
                              </span>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {recentReports.map((report) => (
                            <tr key={report.id}>
                              <td>
                                <div className="cf-report-title">
                                  {report.title ||
                                    `Complaint #${report.id}`}
                                </div>

                                <div className="cf-report-meta">
                                  #{report.id}
                                  {report.category
                                    ? ` · ${report.category}`
                                    : ''}
                                </div>
                              </td>

                              <td className="cf-date-cell">
                                {formatDate(report.created_at)}
                              </td>

                              <td>
                                <StatusBadge
                                  status={report.status}
                                />
                              </td>

                              <td>
                                <Link
                                  className="cf-row-action"
                                  to={`/user/complaints/${report.id}`}
                                  aria-label={`View complaint ${report.id}`}
                                  title="View complaint"
                                >
                                  ↗
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="cf-panel cf-notifications-panel">
                  <div className="cf-panel-heading">
                    <div>
                      <h2>Notifications</h2>
                      <p>Recent activity and updates.</p>
                    </div>

                    <span className="cf-notification-count">
                      {unreadCount} new
                    </span>
                  </div>

                  {loading ? (
                    <div className="cf-loading-state">
                      <span className="cf-spinner" />
                      Loading updates…
                    </div>
                  ) : notificationsError ? (
                    <div className="cf-inline-error">
                      Notifications could not be loaded.
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="cf-notification-empty">
                      <span>♧</span>

                      <strong>You’re all caught up</strong>

                      <p>
                        Updates about your complaints will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="cf-notification-list">
                      {recentNotifications.map((item) => (
                        <div
                          className={`cf-notification-item ${
                            item.is_read ? '' : 'unread'
                          }`}
                          key={item.id}
                        >
                          <span className="cf-notification-symbol">
                            {item.is_read ? '✓' : '•'}
                          </span>

                          <div>
                            <p>{item.message}</p>

                            <time>
                              {formatDate(item.created_at)}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cf-notification-foot">
                    <span>
                      {unreadCount} unread notification
                      {unreadCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </article>
              </section>

              <section className="cf-quick-actions">
                <div className="cf-quick-heading">
                  <div>
                    <h2>What would you like to do?</h2>

                    <p>
                      Quick access to your citizen services.
                    </p>
                  </div>
                </div>

                <div className="cf-action-grid">
                  <Link
                    to="/user/complaints/new"
                    className="cf-action-card"
                  >
                    <span className="cf-action-icon blue">
                      ＋
                    </span>

                    <span>
                      <strong>Report an issue</strong>

                      <small>
                        Tell us about a community problem
                      </small>
                    </span>

                    <b>↗</b>
                  </Link>

                  <Link
                    to="/user/complaints"
                    className="cf-action-card"
                  >
                    <span className="cf-action-icon purple">
                      ▤
                    </span>

                    <span>
                      <strong>Track complaints</strong>

                      <small>
                        Check progress and status updates
                      </small>
                    </span>

                    <b>↗</b>
                  </Link>

                  <Link
                    to="/user/profile"
                    className="cf-action-card"
                  >
                    <span className="cf-action-icon green">
                      ◎
                    </span>

                    <span>
                      <strong>Manage profile</strong>

                      <small>
                        Review your account information
                      </small>
                    </span>

                    <b>↗</b>
                  </Link>
                </div>
              </section>

              <footer className="cf-dashboard-footer">
                <span>
                  © {new Date().getFullYear()} CivicFix. Built for
                  better communities.
                </span>

                <span>
                  <span className="cf-footer-status" />
                  Citizen services portal
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
