import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  RotateCcw,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Building2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import DashboardCharts from './DashboardCharts'; // ADDED: analytics charts (design only)
import './DepartmentDashboard.css';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/department/dashboard' },
  { label: 'Complaints', icon: FileText, path: '/department/complaints' },
  { label: 'Staff Management', icon: Users, path: '/department/staff' },
  { label: 'Staff Work Tracking', icon: Users, path: '/department/staff-work-tracking' },
  { label: 'Reopened Complaints', icon: RotateCcw, path: '/department/reopened' },
  { label: 'Notifications', icon: Bell, path: '/department/notifications' },
  { label: 'Messages', icon: MessageSquare, path: '/department/messages' },
  { label: 'Department Profile', icon: Settings, path: '/department/profile' },
];

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.staff)) return data.staff;
  if (Array.isArray(data?.reports)) return data.reports;
  return [];
}

function getStatus(item) {
  return String(item?.status || '').toLowerCase().trim();
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getComplaintTitle(item) {
  return item?.title || item?.subject || 'Untitled complaint';
}

function getComplaintId(item) {
  return item?.id ? `CF-${String(item.id).padStart(4, '0')}` : '—';
}

function getStatusLabel(status) {
  return status.replaceAll('_', ' ');
}

export default function DepartmentDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );

      const token = localStorage.getItem('civicfix_access_token');

      if (
        !token ||
        !storedUser ||
        String(storedUser.role || '').toLowerCase() !== 'manager'
      ) {
        navigate('/department/login', { replace: true });
        return;
      }

      setUser(storedUser);
    } catch {
      navigate('/department/login', { replace: true });
    }
  }, [navigate]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const results = await Promise.allSettled([
        api.get('/reports/manager/'),
        api.get('/departments/my/staff/'),
        api.get('/notifications/'),
      ]);

      const [complaintResult, staffResult, notificationResult] = results;

      if (complaintResult.status === 'fulfilled') {
        setComplaints(getArray(complaintResult.value.data));
      } else {
        setComplaints([]);
      }

      if (staffResult.status === 'fulfilled') {
        setStaff(getArray(staffResult.value.data));
      } else {
        setStaff([]);
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(getArray(notificationResult.value.data));
      } else {
        setNotifications([]);
      }

      if (results.every((result) => result.status === 'rejected')) {
        throw complaintResult.reason || new Error('Unable to load dashboard.');
      }

      if (results.some((result) => result.status === 'rejected')) {
        setErrorMessage(
          'Some dashboard information could not be loaded. Please check the API connection.'
        );
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const stats = useMemo(() => {
    const total = complaints.length;

    const pending = complaints.filter((item) =>
      ['submitted', 'under_review'].includes(getStatus(item))
    ).length;

    const approved = complaints.filter((item) =>
      ['approved', 'transferred'].includes(getStatus(item))
    ).length;

    const inProgress = complaints.filter((item) =>
      ['assigned', 'in_progress'].includes(getStatus(item))
    ).length;

    const resolved = complaints.filter((item) =>
      ['resolved', 'verified', 'closed'].includes(getStatus(item))
    ).length;

    const reopened = complaints.filter(
      (item) => getStatus(item) === 'reopened'
    ).length;

    return {
      total,
      pending,
      approved,
      inProgress,
      resolved,
      reopened,
      staff: staff.length,
    };
  }, [complaints, staff]);

  const recentComplaints = useMemo(() => {
    return [...complaints]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.created || 0).getTime();
        const dateB = new Date(b.created_at || b.created || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [complaints]);

  const unreadNotifications = notifications.filter(
    (item) => !item.is_read && !item.read
  ).length;

  const handleLogout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');

    navigate('/department/login', { replace: true });
  };

  const managerName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : 'Department Manager';

  const departmentName =
    user?.department_name ||
    user?.department?.name ||
    user?.department?.department_name ||
    'Department Management';

  return (
    <div className="department-dashboard">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="dd-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`dd-sidebar ${sidebarOpen ? 'dd-sidebar-open' : ''}`}>

        <div className="dd-brand">
          <div className="dd-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div className="dd-brand-text">
            <h2>Civic<span>Fix</span></h2>
            <p>DEPARTMENT PORTAL</p>
          </div>

          <button
            className="dd-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="dd-sidebar-section">
          <span className="dd-sidebar-label">WORKSPACE</span>

          <nav className="dd-navigation">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`dd-nav-item ${index === 0 ? 'active' : ''}`}
                  onClick={() => {
                    if (index === 0) {
                      navigate(item.path);
                    } else {
                      navigate(item.path);
                    }
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>

                  {item.label === 'Notifications' &&
                    unreadNotifications > 0 && (
                      <span className="dd-nav-badge">
                        {unreadNotifications}
                      </span>
                    )}

                  {index === 0 && (
                    <span className="dd-nav-active-indicator" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="dd-sidebar-bottom">
          <div className="dd-sidebar-help">
            <div className="dd-help-icon">
              <Building2 size={19} />
            </div>
            <strong>Department Portal</strong>
            <p>Manage civic services in one place.</p>
          </div>

          <button className="dd-logout-button" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* MAIN AREA */}
      <main className="dd-main">

        {/* TOP HEADER */}
        <header className="dd-header">

          <div className="dd-header-left">
            <button
              className="dd-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="dd-breadcrumb">
                Department Portal <ChevronRight size={14} /> Overview
              </div>
              <h1>Dashboard Overview</h1>
            </div>
          </div>

          <div className="dd-header-right">

            <button
              className="dd-refresh-button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <RefreshCw
                size={17}
                className={refreshing ? 'dd-spin' : ''}
              />
            </button>

            <button
              className="dd-notification-button"
              onClick={() => navigate('/department/notifications')}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="dd-notification-dot" />
              )}
            </button>

            <div className="dd-header-divider" />

            <div className="dd-user-info">
              <div className="dd-user-avatar">
                {managerName.charAt(0).toUpperCase() || 'M'}
              </div>

              <div className="dd-user-details">
                <strong>{managerName || 'Manager'}</strong>
                <span>Department Manager</span>
              </div>
            </div>

          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="dd-content">

          <section className="dd-welcome-section">
            <div>
              <span className="dd-welcome-label">
                DEPARTMENT WORKSPACE
              </span>

              <h2>Welcome back, {user?.first_name || 'Manager'} </h2>

              <p>
                Here's what's happening in your department today.
              </p>

              <div className="dd-department-tag">
                <Building2 size={15} />
                {departmentName}
              </div>
            </div>

            <div className="dd-welcome-decoration">
              <LayoutDashboard size={65} />
            </div>
          </section>

          {errorMessage && (
            <div className="dd-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
              <button onClick={() => fetchDashboardData(true)}>
                Retry
              </button>
            </div>
          )}

          {/* STATISTICS */}
          <section className="dd-stats-grid">

            <StatCard
              title="Total Complaints"
              value={stats.total}
              icon={FileText}
              color="blue"
              description="Complaints received"
              loading={loading}
            />

            <StatCard
              title="Pending Review"
              value={stats.pending}
              icon={Clock}
              color="orange"
              description="Awaiting review"
              loading={loading}
            />

            <StatCard
              title="In Progress"
              value={stats.inProgress}
              icon={TrendingUp}
              color="purple"
              description="Currently assigned"
              loading={loading}
            />

            <StatCard
              title="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="green"
              description="Successfully completed"
              loading={loading}
            />

          </section>

          {/* SECONDARY STATISTICS */}
          <section className="dd-secondary-stats">

            <div className="dd-secondary-card">
              <div className="dd-secondary-icon blue">
                <Users size={20} />
              </div>
              <div>
                <span>Department Staff</span>
                <strong>{loading ? '—' : stats.staff}</strong>
              </div>
              <button onClick={() => navigate('/department/staff')}>
                <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="dd-secondary-card">
              <div className="dd-secondary-icon orange">
                <RotateCcw size={20} />
              </div>
              <div>
                <span>Reopened Complaints</span>
                <strong>{loading ? '—' : stats.reopened}</strong>
              </div>
              <button onClick={() => navigate('/department/reopened')}>
                <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="dd-secondary-card">
              <div className="dd-secondary-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span>Approved Complaints</span>
                <strong>{loading ? '—' : stats.approved}</strong>
              </div>
              <button onClick={() => navigate('/department/complaints')}>
                <ArrowUpRight size={18} />
              </button>
            </div>

          </section>

          {/* DASHBOARD ANALYTICS (ADDED: design only, uses the complaints already loaded above) */}
          <DashboardCharts complaints={complaints} loading={loading} />

          {/* RECENT COMPLAINTS */}
          <section className="dd-panel">

            <div className="dd-panel-header">
              <div>
                <h3>Recent Complaints</h3>
                <p>Latest complaints submitted to your department.</p>
              </div>

              <button
                className="dd-view-all"
                onClick={() => navigate('/department/complaints')}
              >
                View all
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="dd-table-wrapper">

              <table className="dd-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Complaint</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="5" className="dd-empty-state">
                        Loading complaints...
                      </td>
                    </tr>
                  ) : recentComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="dd-empty-state">
                        No complaints found for this department.
                      </td>
                    </tr>
                  ) : (
                    recentComplaints.map((item) => {
                      const status = getStatus(item);

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong className="dd-complaint-id">
                              {getComplaintId(item)}
                            </strong>
                          </td>

                          <td>
                            <div className="dd-complaint-title">
                              {getComplaintTitle(item)}
                            </div>
                          </td>

                          <td>
                            {item.category || 'General'}
                          </td>

                          <td>
                            {formatDate(item.created_at || item.created)}
                          </td>

                          <td>
                            <span className={`dd-status dd-status-${status || 'unknown'}`}>
                              <span />
                              {getStatusLabel(status || 'unknown')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}

                </tbody>
              </table>

            </div>
          </section>

          {/* BOTTOM PANELS */}
          <section className="dd-bottom-grid">

            <div className="dd-panel dd-activity-panel">
              <div className="dd-panel-header">
                <div>
                  <h3>Department Summary</h3>
                  <p>Current complaint distribution.</p>
                </div>
              </div>

              <div className="dd-summary-list">
                <SummaryRow label="Pending review" value={stats.pending} total={stats.total} color="orange" />
                <SummaryRow label="Approved" value={stats.approved} total={stats.total} color="blue" />
                <SummaryRow label="In progress" value={stats.inProgress} total={stats.total} color="purple" />
                <SummaryRow label="Resolved" value={stats.resolved} total={stats.total} color="green" />
              </div>
            </div>

            <div className="dd-panel dd-notifications-panel">
              <div className="dd-panel-header">
                <div>
                  <h3>Recent Notifications</h3>
                  <p>Latest department updates.</p>
                </div>

                <button
                  className="dd-icon-link"
                  onClick={() => navigate('/department/notifications')}
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>

              {loading ? (
                <div className="dd-notification-empty">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="dd-notification-empty">
                  <Bell size={25} />
                  <span>No notifications yet.</span>
                </div>
              ) : (
                <div className="dd-notification-list">
                  {notifications.slice(0, 4).map((item, index) => (
                    <div className="dd-notification-item" key={item.id || index}>
                      <div className="dd-notification-icon">
                        <Bell size={17} />
                      </div>

                      <div>
                        <strong>
                          {item.title || item.message || 'Department update'}
                        </strong>
                        <span>
                          {formatDate(item.created_at || item.created)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

          <footer className="dd-footer">
            <span>© {new Date().getFullYear()} CivicFix</span>
            <span>Department Management Portal</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description, loading }) {
  return (
    <div className="dd-stat-card">
      <div className={`dd-stat-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div className="dd-stat-body">
        <span>{title}</span>
        <strong>{loading ? '—' : value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, total, color }) {
  const percentage = total > 0
    ? Math.min(100, (value / total) * 100)
    : 0;

  return (
    <div className="dd-summary-row">
      <div className="dd-summary-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="dd-progress-track">
        <div
          className={`dd-progress-fill ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}