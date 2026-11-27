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
  RefreshCw,
  Search,
  MapPin,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Eye,
  Play,
  Filter,
  ChevronRight,
  FileText,
  SlidersHorizontal,
  XCircle,
  ExternalLink,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';

import './StaffAssignedComplaints.css';

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

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.assigned_reports)) {
    return data.assigned_reports;
  }

  return [];
}

function formatDate(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatus(item) {
  return String(item?.status || '').toLowerCase().trim();
}

function getStatusLabel(status) {
  if (!status) return 'Unknown';

  return status.replaceAll('_', ' ');
}

function getStatusClass(status) {
  switch (status) {
    case 'assigned':
      return 'sac-status-assigned';

    case 'in_progress':
      return 'sac-status-progress';

    case 'resolved':
      return 'sac-status-resolved';

    case 'reopened':
      return 'sac-status-reopened';

    case 'verified':
    case 'closed':
      return 'sac-status-completed';

    default:
      return 'sac-status-default';
  }
}

function getPriorityClass(priority) {
  return String(priority || '').toLowerCase() === 'high'
    ? 'sac-priority-high'
    : 'sac-priority-normal';
}

function getComplaintId(id) {
  if (!id) return '—';

  return `CF-${String(id).padStart(4, '0')}`;
}

function getDeadlineState(value) {
  if (!value) return 'No deadline';

  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return 'No deadline';
  }

  if (deadline.getTime() < Date.now()) {
    return 'Overdue';
  }

  return 'Upcoming';
}

export default function StaffAssignedComplaints() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [staffUser, setStaffUser] = useState(null);
  const [department, setDepartment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  // Completion workflow state is limited to the complaint details modal.
  const [workDescription, setWorkDescription] = useState('');
  const [completionImages, setCompletionImages] = useState([]);
  const [completionVideos, setCompletionVideos] = useState([]);
  const [resolutionCreated, setResolutionCreated] = useState(false);
  const [uploadedImageIndexes, setUploadedImageIndexes] = useState([]);
  const [uploadedVideoIndexes, setUploadedVideoIndexes] = useState([]);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');

  /* =====================================
     AUTHENTICATION
  ===================================== */

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

      if (
        String(storedUser.role || '').toLowerCase() !== 'staff'
      ) {
        navigate('/staff/login', { replace: true });
        return;
      }

      setStaffUser(storedUser);
    } catch {
      navigate('/staff/login', { replace: true });
    }
  }, [navigate]);

  /* =====================================
     FETCH ASSIGNED COMPLAINTS
  ===================================== */

  const fetchComplaints = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.get('/departments/my/dashboard/');

      const data = response.data;

      if (!data || !data.staff || !data.department) {
        throw new Error('The staff dashboard response is incomplete.');
      }

      setStaffUser((previous) => ({
        ...(previous || {}),
        ...data.staff,
      }));

      setDepartment(data.department);
      setComplaints(getArray(data.assigned_reports));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (staffUser) {
      fetchComplaints();
    }
  }, [Boolean(staffUser), fetchComplaints]);

  /* =====================================
     OPEN COMPLAINT LOCATION
  ===================================== */

  const openComplaintLocation = (complaint) => {
    const latitude = Number(complaint?.latitude);
    const longitude = Number(complaint?.longitude);

    const hasCoordinates =
      complaint?.latitude !== null &&
      complaint?.latitude !== undefined &&
      complaint?.latitude !== '' &&
      complaint?.longitude !== null &&
      complaint?.longitude !== undefined &&
      complaint?.longitude !== '' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    let mapsUrl = '';

    if (hasCoordinates) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    } else if (complaint?.location) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        complaint.location
      )}`;
    } else {
      setErrorMessage(
        'Location information is not available for this complaint.'
      );
      return;
    }

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  /* =====================================
     FILTER AND SEARCH
  ===================================== */

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const status = getStatus(item);

      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        String(item.id || '').includes(search) ||
        String(item.title || '').toLowerCase().includes(search) ||
        String(item.category || '').toLowerCase().includes(search) ||
        String(item.location || '').toLowerCase().includes(search) ||
        String(item.description || '').toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === 'all' || status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        String(item.priority || '').toLowerCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter]);

  /* =====================================
     STATISTICS
  ===================================== */

  const statistics = useMemo(() => {
    return {
      total: complaints.length,

      assigned: complaints.filter(
        (item) => getStatus(item) === 'assigned'
      ).length,

      inProgress: complaints.filter(
        (item) => getStatus(item) === 'in_progress'
      ).length,

      resolved: complaints.filter(
        (item) =>
          ['resolved', 'verified', 'closed'].includes(getStatus(item))
      ).length,

      highPriority: complaints.filter(
        (item) =>
          String(item.priority || '').toLowerCase() === 'high'
      ).length,
    };
  }, [complaints]);

  /* =====================================
     STAFF INFORMATION
  ===================================== */

  const staffName =
    staffUser?.name ||
    `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() ||
    'Staff Member';

  const staffInitials = staffName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  /* =====================================
     NAVIGATION
  ===================================== */

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  /* =====================================
     LOGOUT
  ===================================== */

  const handleLogout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');

    navigate('/staff/login', { replace: true });
  };

  /* =====================================
     ACCEPT COMPLAINT
  ===================================== */

  const handleAcceptComplaint = async (complaint) => {
    if (getStatus(complaint) !== 'assigned') {
      return;
    }

    const confirmed = window.confirm(
      `Do you want to accept complaint ${getComplaintId(complaint.id)}?`
    );

    if (!confirmed) return;

    setAcceptingId(complaint.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.post(
        `/reports/staff/${complaint.id}/accept/`
      );

      setSuccessMessage(
        response.data?.message || 'Complaint accepted successfully.'
      );

      await fetchComplaints(true);

      setSelectedComplaint(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setAcceptingId(null);
    }
  };

  /* =====================================
     SUBMIT WORK COMPLETION
  ===================================== */

  const handleSubmitCompletion = async () => {
    if (!selectedComplaint?.id) return;

    if (!workDescription.trim()) {
      setCompletionError('Please enter a work completion description.');
      return;
    }

    if (completionImages.length === 0 && completionVideos.length === 0) {
      setCompletionError('Upload at least one completion photo or video.');
      return;
    }

    setCompletionLoading(true);
    setCompletionError('');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Create the resolution once. If a media upload fails, a retry in this
      // open modal continues with uploads instead of creating a duplicate.
      if (!resolutionCreated) {
        await api.post(
          `/reports/staff/${selectedComplaint.id}/resolution/`,
          { work_description: workDescription.trim() }
        );
        setResolutionCreated(true);
      }

      for (let index = 0; index < completionImages.length; index += 1) {
        if (uploadedImageIndexes.includes(index)) continue;
        const formData = new FormData();
        formData.append('image', completionImages[index]);
        await api.post(
          `/reports/staff/${selectedComplaint.id}/resolution/image/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setUploadedImageIndexes((previous) => [...previous, index]);
      }

      for (let index = 0; index < completionVideos.length; index += 1) {
        if (uploadedVideoIndexes.includes(index)) continue;
        const formData = new FormData();
        formData.append('video', completionVideos[index]);
        await api.post(
          `/reports/staff/${selectedComplaint.id}/resolution/video/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setUploadedVideoIndexes((previous) => [...previous, index]);
      }

      const resolveResponse = await api.post(
        `/reports/staff/${selectedComplaint.id}/resolve/`
      );

      const resolvedComplaint = {
        ...selectedComplaint,
        status: 'resolved',
      };

      setSelectedComplaint(resolvedComplaint);
      setComplaints((previous) =>
        previous.map((item) =>
          String(item.id) === String(selectedComplaint.id)
            ? { ...item, status: 'resolved' }
            : item
        )
      );

      setWorkDescription('');
      setCompletionImages([]);
      setCompletionVideos([]);
      setResolutionCreated(false);
      setUploadedImageIndexes([]);
      setUploadedVideoIndexes([]);
      setSuccessMessage(
        resolveResponse.data?.message || 'Complaint resolved successfully.'
      );
    } catch (error) {
      setCompletionError(getApiErrorMessage(error));
    } finally {
      setCompletionLoading(false);
    }
  };

  /* =====================================
     LOADING
  ===================================== */

  

  /* =====================================
     MAIN PAGE
  ===================================== */

  return (
    <div className="staff-dashboard sac-page">

      {sidebarOpen && (
        <div
          className="staff-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`staff-sidebar ${
          sidebarOpen ? 'staff-sidebar-open' : ''
        }`}
      >
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

        <div className="staff-sidebar-section">
          <span className="staff-sidebar-label">
            WORKSPACE
          </span>

          <nav className="staff-navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              const active =
                item.path === '/staff/complaints';

              return (
                <button
                  key={item.path}
                  className={`staff-nav-item ${
                    active ? 'active' : ''
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>

                  {active && (
                    <span className="staff-nav-indicator" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

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

      {/* MAIN */}

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
                My Assigned Complaints
              </div>

              <h1>My Assigned Complaints</h1>
            </div>
          </div>

          <div className="staff-header-right">
            <button
              className={`staff-refresh-button ${
                refreshing ? 'is-refreshing' : ''
              }`}
              onClick={() => fetchComplaints(true)}
              disabled={refreshing}
            >
              <RefreshCw size={17} />
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

        {/* CONTENT */}

        <div className="staff-page-content sac-content">

          {/* PAGE INTRO */}

          <section className="sac-page-intro">
            <div>
              <span className="sac-eyebrow">
                <ClipboardList size={15} />
                STAFF WORKSPACE
              </span>

              <h2>Manage Your Assigned Complaints</h2>

              <p>
                Review complaint information, check deadlines,
                and accept assignments to begin your work.
              </p>

              {department?.name && (
                <div className="sac-department-label">
                  <Building2 size={15} />
                  {department.name}
                  {department.code && (
                    <span>· {department.code}</span>
                  )}
                </div>
              )}
            </div>

            <div className="sac-intro-icon">
              <FileText size={43} />
            </div>
          </section>

          {/* MESSAGES */}

          {errorMessage && (
            <div className="sac-alert sac-alert-error">
              <AlertCircle size={19} />

              <span>{errorMessage}</span>

              <button
                onClick={() => setErrorMessage('')}
                aria-label="Dismiss error"
              >
                <XCircle size={17} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="sac-alert sac-alert-success">
              <CheckCircle2 size={19} />

              <span>{successMessage}</span>

              <button
                onClick={() => setSuccessMessage('')}
                aria-label="Dismiss success message"
              >
                <XCircle size={17} />
              </button>
            </div>
          )}

          {/* STATISTICS */}

          <section className="sac-stat-grid">

            <div className="sac-stat-card">
              <div className="sac-stat-icon sac-stat-teal">
                <ClipboardList size={21} />
              </div>

              <span>Total Assigned</span>
              <strong>{statistics.total}</strong>
              <small>All assigned complaints</small>
            </div>

            <div className="sac-stat-card">
              <div className="sac-stat-icon sac-stat-orange">
                <Clock3 size={21} />
              </div>

              <span>Awaiting Acceptance</span>
              <strong>{statistics.assigned}</strong>
              <small>Waiting for your acceptance</small>
            </div>

            <div className="sac-stat-card">
              <div className="sac-stat-icon sac-stat-blue">
                <Play size={21} />
              </div>

              <span>In Progress</span>
              <strong>{statistics.inProgress}</strong>
              <small>Currently being handled</small>
            </div>

            <div className="sac-stat-card">
              <div className="sac-stat-icon sac-stat-green">
                <CheckCircle2 size={21} />
              </div>

              <span>Resolved</span>
              <strong>{statistics.resolved}</strong>
              <small>Completed work submissions</small>
            </div>

          </section>

          {/* FILTERS */}

          <section className="sac-filter-panel">
            <div className="sac-filter-heading">
              <div>
                <h3>Complaint Records</h3>
                <p>
                  {filteredComplaints.length} of {complaints.length} complaints
                </p>
              </div>

              <SlidersHorizontal size={20} />
            </div>

            <div className="sac-filter-controls">

              <div className="sac-search-box">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search by complaint ID, title, category or location..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="sac-select-wrapper">
                <Filter size={16} />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="reopened">Reopened</option>
                  <option value="verified">Verified</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="sac-select-wrapper">
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  aria-label="Filter by priority"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal Priority</option>
                </select>
              </div>

            </div>
          </section>

          {/* COMPLAINT LIST */}

          <section className="sac-complaint-section">

            {filteredComplaints.length === 0 ? (
              <div className="sac-empty-state">
                <div className="sac-empty-icon">
                  <ClipboardList size={32} />
                </div>

                <h3>
                  {complaints.length === 0
                    ? 'No Complaints Assigned Yet'
                    : 'No Matching Complaints'}
                </h3>

                <p>
                  {complaints.length === 0
                    ? 'Complaints assigned to you by your department manager will appear here.'
                    : 'Try changing your search or filter options.'}
                </p>

                {(searchTerm ||
                  statusFilter !== 'all' ||
                  priorityFilter !== 'all') && (
                  <button
                    className="sac-reset-button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="sac-complaint-list">

                {filteredComplaints.map((complaint) => {
                  const status = getStatus(complaint);

                  const deadlineState = getDeadlineState(
                    complaint.deadline
                  );

                  return (
                    <article
                      className="sac-complaint-card"
                      key={complaint.id}
                    >

                      <div className="sac-card-top">
                        <div className="sac-card-id">
                          <div className="sac-card-icon">
                            <FileText size={21} />
                          </div>

                          <div>
                            <span>COMPLAINT ID</span>
                            <strong>{getComplaintId(complaint.id)}</strong>
                          </div>
                        </div>

                        <span
                          className={`sac-status ${getStatusClass(status)}`}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </div>

                      <div className="sac-card-main">
                        <h3>{complaint.title || 'Untitled Complaint'}</h3>

                        <p>
                          {complaint.description ||
                            'No description provided.'}
                        </p>
                      </div>

                      <div className="sac-card-details">

                        <div>
                          <span className="sac-detail-icon">
                            <Building2 size={16} />
                          </span>

                          <div>
                            <small>Category</small>
                            <strong>
                              {complaint.category || 'Not specified'}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <span className="sac-detail-icon">
                            <MapPin size={16} />
                          </span>

                          <div>
                            <small>Location</small>
                            <strong>
                              {complaint.location || 'Not specified'}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <span className="sac-detail-icon">
                            <CalendarDays size={16} />
                          </span>

                          <div>
                            <small>Submitted</small>
                            <strong>
                              {formatDate(complaint.created_at)}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <span className="sac-detail-icon">
                            <Clock3 size={16} />
                          </span>

                          <div>
                            <small>Deadline</small>
                            <strong
                              className={
                                deadlineState === 'Overdue'
                                  ? 'sac-overdue'
                                  : ''
                              }
                            >
                              {formatDateTime(complaint.deadline)}
                            </strong>
                          </div>
                        </div>

                      </div>

                      <div className="sac-card-footer">

                        <div className="sac-card-tags">
                          <span
                            className={`sac-priority ${getPriorityClass(
                              complaint.priority
                            )}`}
                          >
                            {complaint.priority || 'Normal'} Priority
                          </span>

                          {deadlineState === 'Overdue' && (
                            <span className="sac-overdue-tag">
                              Overdue
                            </span>
                          )}
                        </div>

                        <div className="sac-card-actions">

                          <button
                            className="sac-view-button"
                            onClick={() =>
                              setSelectedComplaint(complaint)
                            }
                          >
                            <Eye size={16} />
                            View Details
                          </button>

                          {status === 'assigned' && (
                            <button
                              className="sac-accept-button"
                              onClick={() =>
                                handleAcceptComplaint(complaint)
                              }
                              disabled={acceptingId === complaint.id}
                            >
                              {acceptingId === complaint.id ? (
                                <>
                                  <RefreshCw
                                    size={16}
                                    className="sac-spin"
                                  />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={16} />
                                  Accept Complaint
                                </>
                              )}
                            </button>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                })}

              </div>
            )}

          </section>

        </div>
      </main>

      {/* COMPLAINT DETAILS MODAL */}

      {selectedComplaint && (
        <div
          className="sac-modal-overlay"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="sac-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sac-modal-header">
              <div>
                <span>COMPLAINT DETAILS</span>
                <h2>{getComplaintId(selectedComplaint.id)}</h2>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="sac-modal-body">

              <div className="sac-modal-title">
                <h3>{selectedComplaint.title}</h3>

                <span
                  className={`sac-status ${getStatusClass(
                    getStatus(selectedComplaint)
                  )}`}
                >
                  {getStatusLabel(getStatus(selectedComplaint))}
                </span>
              </div>

              <div className="sac-modal-field">
                <label>Description</label>
                <p>
                  {selectedComplaint.description || 'No description provided.'}
                </p>
              </div>

              <div className="sac-modal-grid">
                <div className="sac-modal-field">
                  <label>Category</label>
                  <p>{selectedComplaint.category || 'Not specified'}</p>
                </div>

                <div className="sac-modal-field">
                  <label>Priority</label>
                  <p>{selectedComplaint.priority || 'Normal'}</p>
                </div>

                <div className="sac-modal-field">
                  <label>Location</label>
                  <p>{selectedComplaint.location || 'Not specified'}</p>
                </div>

                <div className="sac-modal-field">
                  <label>Department</label>
                  <p>
                    {selectedComplaint.department_name ||
                      department?.name ||
                      'Not specified'}
                  </p>
                </div>

                <div className="sac-modal-field">
                  <label>Submitted Date</label>
                  <p>{formatDate(selectedComplaint.created_at)}</p>
                </div>

                <div className="sac-modal-field">
                  <label>Deadline</label>
                  <p>{formatDateTime(selectedComplaint.deadline)}</p>
                </div>
              </div>

              {/* COMPLAINT LOCATION */}

              <div className="sac-modal-location">
                <div className="sac-modal-location-info">
                  <span className="sac-modal-location-icon">
                    <MapPin size={19} />
                  </span>

                  <div>
                    <strong>Complaint Location</strong>
                    <p>
                      {selectedComplaint.location || 'Location not specified'}
                    </p>

                    {selectedComplaint.latitude != null &&
                      selectedComplaint.longitude != null && (
                        <small>
                          Coordinates: {selectedComplaint.latitude},{' '}
                          {selectedComplaint.longitude}
                        </small>
                      )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openComplaintLocation(selectedComplaint)
                  }
                >
                  <MapPin size={16} />
                  View Live Location
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* EXISTING COMPLAINT IMAGES */}

              {Array.isArray(selectedComplaint.images) &&
                selectedComplaint.images.length > 0 && (
                  <div className="sac-modal-field">
                    <label>Complaint Images</label>

                    <div className="sac-media-grid">
                      {selectedComplaint.images.map((image, index) => (
                        <a
                          key={image.id || index}
                          href={image.image}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={image.image}
                            alt={`Complaint evidence ${index + 1}`}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* EXISTING COMPLAINT VIDEOS */}

              {Array.isArray(selectedComplaint.videos) &&
                selectedComplaint.videos.length > 0 && (
                  <div className="sac-modal-field">
                    <label>Complaint Videos</label>

                    <div className="sac-video-grid">
                      {selectedComplaint.videos.map((video, index) => (
                        <video
                          key={video.id || index}
                          src={video.video}
                          controls
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* STAFF WORK COMPLETION */}

              {getStatus(selectedComplaint) === 'in_progress' && (
                <section className="sac-staff-completion">
                  <div className="sac-completion-heading">
                    <div>
                      <span>WORK UPDATE</span>
                      <h3>Complete Complaint</h3>
                      <p>
                        Add a description and upload evidence of the completed
                        work before resolving this complaint.
                      </p>
                    </div>
                    <span className="sac-status sac-status-progress">
                      In Progress
                    </span>
                  </div>

                  {completionError && (
                    <div className="sac-alert sac-alert-error">
                      <AlertCircle size={17} />
                      <span>{completionError}</span>
                      <button
                        type="button"
                        onClick={() => setCompletionError('')}
                        aria-label="Dismiss completion error"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}

                  <div className="sac-modal-field">
                    <label htmlFor="sac-work-description">
                      Work Completion Description
                    </label>
                    <textarea
                      id="sac-work-description"
                      value={workDescription}
                      onChange={(event) =>
                        setWorkDescription(event.target.value)
                      }
                      placeholder="Describe the work performed and how the complaint was addressed..."
                      rows={4}
                      disabled={completionLoading || resolutionCreated}
                    />
                  </div>

                  <div className="sac-completion-upload-grid">
                    <div className="sac-modal-field">
                      <label htmlFor="sac-completion-images">
                        Completion Photos
                      </label>
                      <input
                        id="sac-completion-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          setCompletionImages(Array.from(event.target.files || []));
                          setUploadedImageIndexes([]);
                        }}
                        disabled={completionLoading}
                      />
                      <small>
                        {completionImages.length
                          ? `${completionImages.length} photo(s) selected`
                          : 'Upload photos showing the completed work.'}
                      </small>
                    </div>

                    <div className="sac-modal-field">
                      <label htmlFor="sac-completion-videos">
                        Completion Videos
                      </label>
                      <input
                        id="sac-completion-videos"
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={(event) => {
                          setCompletionVideos(Array.from(event.target.files || []));
                          setUploadedVideoIndexes([]);
                        }}
                        disabled={completionLoading}
                      />
                      <small>
                        {completionVideos.length
                          ? `${completionVideos.length} video(s) selected`
                          : 'Upload videos showing the completed work.'}
                      </small>
                    </div>
                  </div>

                  <div className="sac-completion-note">
                    At least one completion photo or video is required.
                  </div>

                  <button
                    type="button"
                    className="sac-completion-submit"
                    onClick={handleSubmitCompletion}
                    disabled={completionLoading}
                  >
                    {completionLoading ? (
                      <>
                        <RefreshCw size={16} className="sac-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Submit Work & Resolve Complaint
                      </>
                    )}
                  </button>
                </section>
              )}

              {['resolved', 'verified', 'closed'].includes(
                getStatus(selectedComplaint)
              ) && (
                <div className="sac-completion-note sac-completion-done">
                  This complaint is currently {getStatusLabel(
                    getStatus(selectedComplaint)
                  )}. No further staff completion action is available here.
                </div>
              )}

            </div>

            <div className="sac-modal-footer">

              <button
                className="sac-view-button"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </button>

              {getStatus(selectedComplaint) === 'assigned' && (
                <button
                  className="sac-accept-button"
                  onClick={() =>
                    handleAcceptComplaint(selectedComplaint)
                  }
                  disabled={acceptingId === selectedComplaint.id}
                >
                  <CheckCircle2 size={16} />
                  Accept Complaint
                </button>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}