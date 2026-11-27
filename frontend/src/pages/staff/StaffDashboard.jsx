import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  MessageSquare,
  UserRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Building2,
  Clock3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ChevronRight,
  CalendarDays,
  MapPin,
  FileText,
  Activity,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';

import StaffAnalytics from './StaffAnalytics'; // ADDED: analytics section (display only)

import './StaffDashboard.css';

const NAV_ITEMS = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    path: '/staff/dashboard',
  },
  {
    label: 'My Assigned Complaints',
    icon: ClipboardList,
    path: '/staff/complaints',
  },
  {
    label: 'Notifications',
    icon: Bell,
    path: '/staff/notifications',
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    path: '/staff/messages',
  },
  {
    label: 'My Profile',
    icon: UserRound,
    path: '/staff/profile',
  },
];

function getStatus(item) {
  return String(item?.status || '').toLowerCase().trim();
}

function formatDate(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getComplaintId(id) {
  if (!id) return '—';

  return `CF-${String(id).padStart(4, '0')}`;
}

function getStatusLabel(status) {
  if (!status) return 'Unknown';

  return status.replaceAll('_', ' ');
}

function getStatusClass(status) {
  const normalized = getStatus(status);

  if (normalized === 'assigned') return 'staff-status-assigned';

  if (normalized === 'in_progress') return 'staff-status-progress';

  if (normalized === 'resolved') return 'staff-status-resolved';

  if (normalized === 'reopened') return 'staff-status-reopened';

  if (normalized === 'verified' || normalized === 'closed') {
    return 'staff-status-completed';
  }

  return 'staff-status-default';
}

function getPriorityClass(priority) {
  return String(priority || '').toLowerCase() === 'high'
    ? 'staff-priority-high'
    : 'staff-priority-normal';
}

function getArray(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.assigned_reports)) {
    return data.assigned_reports;
  }

  return [];
}

export default function StaffDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [staffUser, setStaffUser] = useState(null);

  /*

  # AUTHENTICATION CHECK

  */

  useEffect(() => {
    try {
      const token = localStorage.getItem('civicfix_access_token');

      const storedUser = JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );

      if (!token || !storedUser) {
        navigate('/staff/login', { replace: true });
        return;
      }

      const role = String(storedUser.role || '').toLowerCase();

      if (role !== 'staff') {
        navigate('/staff/login', { replace: true });
        return;
      }

      setStaffUser(storedUser);
    } catch {
      navigate('/staff/login', { replace: true });
    }
  }, [navigate]);

  /*

  # FETCH STAFF DASHBOARD

  */

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const response = await api.get('/departments/my/dashboard/');

      const data = response.data;

      if (!data || !data.staff || !data.department) {
        throw new Error('The dashboard response is incomplete.');
      }

      setDashboard({
        staff: data.staff,
        department: data.department,
        assigned_reports: getArray(data.assigned_reports),
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (staffUser) {
      fetchDashboard();
    }
  }, [staffUser, fetchDashboard]);

  /*

  # DASHBOARD DATA

  */

  const complaints = dashboard?.assigned_reports || [];

  const statistics = useMemo(() => {
    const total = complaints.length;

    const assigned = complaints.filter(
      (item) => getStatus(item) === 'assigned'
    ).length;

    const inProgress = complaints.filter(
      (item) => getStatus(item) === 'in_progress'
    ).length;

    const resolved = complaints.filter(
      (item) =>
        ['resolved', 'verified', 'closed'].includes(getStatus(item))
    ).length;

    const reopened = complaints.filter(
      (item) => getStatus(item) === 'reopened'
    ).length;

    return {
      total,
      assigned,
      inProgress,
      resolved,
      reopened,
    };
  }, [complaints]);

  const recentComplaints = useMemo(() => {
    return [...complaints]
      .sort((a, b) => {
        const dateA = new Date(
          a.created_at || a.updated_at || 0
        ).getTime();

        const dateB = new Date(
          b.created_at || b.updated_at || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [complaints]);

  const upcomingDeadlines = useMemo(() => {
    return [...complaints]
      .filter((item) => {
        if (!item.deadline) return false;

        if (
          ['resolved', 'verified', 'closed'].includes(getStatus(item))
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() -
          new Date(b.deadline).getTime()
      )
      .slice(0, 4);
  }, [complaints]);

  /*

  # USER INFORMATION

  */

  const staffName =
    dashboard?.staff?.name ||
    `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() ||
    'Staff Member';

  const departmentName =
    dashboard?.department?.name || 'Department';

  const staffEmail =
    dashboard?.staff?.email ||
    staffUser?.email ||
    '';

  const staffInitials = staffName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  /*

  # NAVIGATION

  */

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  /*

  # LOGOUT

  */

  const handleLogout = () => {
    localStorage.removeItem('civicfix_access_token');

    localStorage.removeItem('civicfix_refresh_token');

    localStorage.removeItem('civicfix_user');

    navigate('/staff/login', { replace: true });
  };

  /*

  # LOADING SCREEN

  */

  /*

  # DASHBOARD

  */

  return (
    <div className="staff-dashboard">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="staff-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =================================
          SIDEBAR
      ================================= */}

      <aside
        className={`staff-sidebar ${
          sidebarOpen ? 'staff-sidebar-open' : ''
        }`}
      >

        {/* BRAND */}

        <div className="staff-brand">

          <div className="staff-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div className="staff-brand-text">
            <h2>
              Civic<span>Fix</span>
            </h2>

            <p>STAFF PORTAL</p>
          </div>

          <button
            className="staff-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>

        </div>

        {/* NAVIGATION */}

        <div className="staff-sidebar-section">

          <span className="staff-sidebar-label">
            WORKSPACE
          </span>

          <nav className="staff-navigation">

            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`staff-nav-item ${
                    index === 0 ? 'active' : ''
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon size={19} />

                  <span>{item.label}</span>

                  {index === 0 && (
                    <span className="staff-nav-indicator" />
                  )}
                </button>
              );
            })}

          </nav>

        </div>

        {/* SIDEBAR BOTTOM */}

        <div className="staff-sidebar-bottom">

          <div className="staff-sidebar-help">

            <div className="staff-help-icon">
              <Building2 size={20} />
            </div>

            <strong>Staff Workspace</strong>

            <p>
              Manage your assigned civic complaints.
            </p>

          </div>

          <button
            className="staff-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />

            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* =================================
          MAIN CONTENT
      ================================= */}

      <main className="staff-main">

        {/* HEADER */}

        <header className="staff-header">

          <div className="staff-header-left">

            <button
              className="staff-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>

            <div>

              <div className="staff-breadcrumb">
                Staff Portal

                <ChevronRight size={14} />

                Overview
              </div>

              <h1>Staff Dashboard</h1>

            </div>

          </div>

          <div className="staff-header-right">

            <button
              className={`staff-refresh-button ${
                refreshing ? 'is-refreshing' : ''
              }`}
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <RefreshCw size={18} />

              <span>Refresh</span>
            </button>

            <div className="staff-header-user">

              <div className="staff-avatar">
                {staffInitials || 'ST'}
              </div>

              <div className="staff-header-user-info">
                <strong>{staffName}</strong>

                <span>Department Staff</span>
              </div>

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}

        <div className="staff-page-content">

          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="staff-error-message">

              <AlertCircle size={19} />

              <div>
                <strong>Unable to load dashboard</strong>

                <p>{errorMessage}</p>
              </div>

              <button onClick={() => fetchDashboard()}>
                Try Again
              </button>

            </div>
          )}

          {/* WELCOME SECTION */}

          <section className="staff-welcome-section">

            <div className="staff-welcome-content">

              <span className="staff-welcome-eyebrow">
                <Activity size={15} />

                STAFF WORKSPACE
              </span>

              <h2>
                Welcome back, {staffName.split(' ')[0]}!
              </h2>

              <p>
                Here is an overview of your assigned civic complaints
                and current work progress.
              </p>

              <div className="staff-welcome-meta">

                <span>
                  <Building2 size={16} />

                  {departmentName}
                </span>

                <span>
                  <ShieldCheck size={16} />

                  Staff Account
                </span>

              </div>

            </div>

            <div className="staff-welcome-decoration">
              <div className="staff-decoration-circle">
                <ShieldCheck size={65} />
              </div>
            </div>

          </section>

          {/* STATISTICS */}

          <section className="staff-stats-grid">

            <div className="staff-stat-card">

              <div className="staff-stat-top">
                <div className="staff-stat-icon staff-icon-blue">
                  <ClipboardList size={22} />
                </div>

                <span className="staff-stat-label">
                  Total Assigned
                </span>
              </div>

              <div className="staff-stat-value">
                {statistics.total}
              </div>

              <p className="staff-stat-description">
                Complaints assigned to you
              </p>

            </div>

            <div className="staff-stat-card">

              <div className="staff-stat-top">
                <div className="staff-stat-icon staff-icon-orange">
                  <Clock3 size={22} />
                </div>

                <span className="staff-stat-label">
                  Awaiting Acceptance
                </span>
              </div>

              <div className="staff-stat-value">
                {statistics.assigned}
              </div>

              <p className="staff-stat-description">
                Assigned complaints awaiting acceptance
              </p>

            </div>

            <div className="staff-stat-card">

              <div className="staff-stat-top">
                <div className="staff-stat-icon staff-icon-purple">
                  <Activity size={22} />
                </div>

                <span className="staff-stat-label">
                  In Progress
                </span>
              </div>

              <div className="staff-stat-value">
                {statistics.inProgress}
              </div>

              <p className="staff-stat-description">
                Complaints currently being handled
              </p>

            </div>

            <div className="staff-stat-card">

              <div className="staff-stat-top">
                <div className="staff-stat-icon staff-icon-green">
                  <CheckCircle2 size={22} />
                </div>

                <span className="staff-stat-label">
                  Resolved
                </span>
              </div>

              <div className="staff-stat-value">
                {statistics.resolved}
              </div>

              <p className="staff-stat-description">
                Completed work submissions
              </p>

            </div>

          </section>

          {/* DEPARTMENT INFORMATION */}

          <section className="staff-department-card">

            <div className="staff-department-icon">
              <Building2 size={23} />
            </div>

            <div className="staff-department-details">

              <span>YOUR DEPARTMENT</span>

              <h3>{departmentName}</h3>

              <p>
                Department Code:{' '}
                <strong>
                  {dashboard?.department?.code || '—'}
                </strong>
              </p>

            </div>

            <div className="staff-department-status">
              <span className="staff-online-dot" />
              Staff Portal Active
            </div>

          </section>

          {/* DASHBOARD ANALYTICS (ADDED: display only, uses the complaints list above) */}

          <StaffAnalytics complaints={complaints} loading={loading} />

          {/* MAIN GRID */}

          <section className="staff-dashboard-grid">

            {/* RECENT COMPLAINTS */}

            <div className="staff-panel staff-recent-panel">

              <div className="staff-panel-header">

                <div>
                  <span className="staff-panel-eyebrow">
                    WORK OVERVIEW
                  </span>

                  <h3>My Assigned Complaints</h3>

                  <p>
                    Recently assigned complaints from your department.
                  </p>
                </div>

                <button
                  className="staff-view-all-button"
                  onClick={() => navigate('/staff/complaints')}
                >
                  View all

                  <ArrowUpRight size={16} />
                </button>

              </div>

              {complaints.length === 0 ? (

                <div className="staff-empty-state">

                  <div className="staff-empty-icon">
                    <FileText size={30} />
                  </div>

                  <h4>No assigned complaints yet</h4>

                  <p>
                    Complaints assigned to you by your department
                    manager will appear here.
                  </p>

                </div>

              ) : (

                <div className="staff-complaint-list">

                  {recentComplaints.map((item) => (

                    <div
                      className="staff-complaint-item"
                      key={item.id}
                    >

                      <div className="staff-complaint-icon">
                        <FileText size={20} />
                      </div>

                      <div className="staff-complaint-info">

                        <div className="staff-complaint-title-row">

                          <h4>
                            {item.title || 'Untitled complaint'}
                          </h4>

                          <span
                            className={`staff-status-badge ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>

                        </div>

                        <div className="staff-complaint-meta">

                          <span>
                            {getComplaintId(item.id)}
                          </span>

                          <span className="staff-meta-divider">•</span>

                          <span>
                            {item.category || 'General'}
                          </span>

                          <span className="staff-meta-divider">•</span>

                          <span>
                            {formatDate(item.created_at)}
                          </span>

                        </div>

                        <div className="staff-complaint-extra">

                          <span
                            className={`staff-priority ${getPriorityClass(
                              item.priority
                            )}`}
                          >
                            {item.priority || 'normal'} priority
                          </span>

                          {item.location && (
                            <span>
                              <MapPin size={13} />

                              {item.location}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

            {/* DEADLINES */}

            <div className="staff-panel staff-deadline-panel">

              <div className="staff-panel-header">

                <div>
                  <span className="staff-panel-eyebrow">
                    TASK MANAGEMENT
                  </span>

                  <h3>Upcoming Deadlines</h3>

                  <p>
                    Deadlines for your active complaints.
                  </p>
                </div>

                <CalendarDays size={21} className="staff-panel-heading-icon" />

              </div>

              {upcomingDeadlines.length === 0 ? (

                <div className="staff-deadline-empty">

                  <div className="staff-empty-icon">
                    <CalendarDays size={27} />
                  </div>

                  <h4>No upcoming deadlines</h4>

                  <p>
                    There are no active complaint deadlines to display.
                  </p>

                </div>

              ) : (

                <div className="staff-deadline-list">

                  {upcomingDeadlines.map((item) => (

                    <div
                      className="staff-deadline-item"
                      key={item.id}
                    >

                      <div className="staff-deadline-icon">
                        <Clock3 size={18} />
                      </div>

                      <div className="staff-deadline-info">

                        <strong>
                          {item.title || 'Untitled complaint'}
                        </strong>

                        <span>
                          {getComplaintId(item.id)}
                        </span>

                        <p>
                          Deadline: {formatDateTime(item.deadline)}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </section>

          {/* QUICK INFORMATION */}

          <section className="staff-bottom-grid">

            <div className="staff-information-card">

              <div className="staff-information-icon staff-info-purple">
                <RotateCcwIcon />
              </div>

              <div>
                <strong>{statistics.reopened}</strong>

                <span>Reopened Complaints</span>
              </div>

            </div>

            <div className="staff-information-card">

              <div className="staff-information-icon staff-info-blue">
                <UserRound size={21} />
              </div>

              <div>
                <strong>{staffEmail || '—'}</strong>

                <span>Staff Email Address</span>
              </div>

            </div>

            <div className="staff-information-card">

              <div className="staff-information-icon staff-info-green">
                <ShieldCheck size={21} />
              </div>

              <div>
                <strong>
                  {dashboard?.staff?.is_verified ? 'Verified' : 'Not verified'}
                </strong>

                <span>Account Verification</span>
              </div>

            </div>

          </section>

          {/* FOOTER */}

          <footer className="staff-footer">

            <span>
              © {new Date().getFullYear()} CivicFix. All rights reserved.
            </span>

            <span>
              Department Staff Portal
            </span>

          </footer>

        </div>

      </main>

    </div>
  );
}

function RotateCcwIcon() {
  return <RefreshCw size={21} />;
}