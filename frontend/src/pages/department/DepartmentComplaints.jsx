import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, RotateCcw, Bell, MessageSquare,
  Settings, LogOut, Search, Menu, X, RefreshCw, ChevronRight,
  ShieldCheck, Eye, CheckCircle2, XCircle, Clock3, AlertCircle,
  Filter, MapPin, CalendarDays, UserRound, Image as ImageIcon,
  Video, ArrowUpRight, ArrowRightLeft, UserPlus, Copy, Building2,
  AlertTriangle,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import LocationMap from '../../components/LocationMap';
import './DepartmentComplaints.css';

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

const FILTERS = [
  { label: 'All complaints', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Transferred to department', value: 'transferred' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Reopened', value: 'reopened' },
  { label: 'Closed', value: 'closed' },
];

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusLabel(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function complaintReference(id) {
  return `CF-${String(id).padStart(4, '0')}`;
}

function toApiDateTime(localValue) {
  if (!localValue) return '';
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function getStaffLabel(staff) {
  const linkedUser = staff?.user;
  if (staff?.name) return staff.name;
  if (staff?.first_name || staff?.last_name) {
    return `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  }
  if (staff?.email) return staff.email;
  return `Staff member #${staff?.id ?? linkedUser ?? '—'}`;
}

export default function DepartmentComplaints() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [actionMode, setActionMode] = useState('');
  const [actionError, setActionError] = useState('');
  const [assignment, setAssignment] = useState({
    staff_id: '', deadline: '', priority: 'normal',
  });
  const [transferDepartment, setTransferDepartment] = useState('');

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('civicfix_user') || 'null');
      const token = localStorage.getItem('civicfix_access_token');
      if (!token || !storedUser || String(storedUser.role || '').toLowerCase() !== 'manager') {
        navigate('/department/login', { replace: true });
        return;
      }
      setUser(storedUser);
    } catch {
      navigate('/department/login', { replace: true });
    }
  }, [navigate]);

  const loadComplaints = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/manager/');
      setComplaints(getRows(response.data));
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to load department complaints.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadActionData = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get('/departments/my/staff/'),
      api.get('/departments/active/'),
    ]);

    if (results[0].status === 'fulfilled') {
      setStaff(getRows(results[0].value.data));
    } else {
      setStaff([]);
      console.error('Unable to load department staff:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      setDepartments(getRows(results[1].value.data));
    } else {
      setDepartments([]);
      console.error('Unable to load active departments:', results[1].reason);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadComplaints();
      loadActionData();
    }
  }, [user, loadComplaints, loadActionData]);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();
    return complaints.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      const priority = String(item.priority || 'normal').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
      const haystack = [
        item.id, item.title, item.description, item.category,
        item.location, item.department_name,
      ].join(' ').toLowerCase();
      return matchesStatus && matchesPriority && (!query || haystack.includes(query));
    });
  }, [complaints, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => ({
    total: complaints.length,
    submitted: complaints.filter((item) => ['submitted', 'transferred'].includes(item.status)).length,
    approved: complaints.filter((item) => item.status === 'approved').length,
    active: complaints.filter((item) => ['assigned', 'in_progress'].includes(item.status)).length,
  }), [complaints]);

  const handleLogout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');
    navigate('/department/login', { replace: true });
  };

  const refreshAll = async () => {
    await Promise.all([loadComplaints(true), loadActionData()]);
  };

  const closeAction = () => {
    setActionMode('');
    setActionError('');
  };

  const performReviewAction = async (report, action) => {
    const actionLabel = action === 'approve' ? 'approve' : 'reject';
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} complaint ${complaintReference(report.id)}?`,
    );
    if (!confirmed) return;

    setBusyId(report.id);
    setError('');
    setNotice('');
    try {
      await api.post(`/reports/manager/${report.id}/${action}/`, {});
      setNotice(`Complaint ${complaintReference(report.id)} ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setSelected(null);
      await loadComplaints(true);
    } catch (err) {
      setError(getApiErrorMessage(err) || `Unable to ${actionLabel} this complaint.`);
    } finally {
      setBusyId(null);
    }
  };

  const performDuplicateReview = async (report, decision) => {
    const label = decision === 'approve' ? 'confirm this duplicate' : 'mark this as a separate complaint';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;

    setBusyId(report.id);
    setActionError('');
    setError('');
    try {
      await api.post(`/reports/manager/${report.id}/duplicate-review/`, { decision });
      setNotice(decision === 'approve'
        ? `Duplicate suggestion for ${complaintReference(report.id)} confirmed.`
        : `Duplicate suggestion for ${complaintReference(report.id)} rejected.`);
      setSelected(null);
      closeAction();
      await loadComplaints(true);
    } catch (err) {
      setActionError(getApiErrorMessage(err) || 'Unable to save duplicate review.');
    } finally {
      setBusyId(null);
    }
  };

  const openAssign = (report) => {
    setAssignment({ staff_id: '', deadline: '', priority: report.priority || 'normal' });
    setActionError('');
    setActionMode(report.status === 'reopened' ? 'reassign' : 'assign');
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    if (!selected) return;

    if (!assignment.staff_id || !assignment.deadline) {
      setActionError('Select a staff member and provide a deadline.');
      return;
    }

    const deadline = toApiDateTime(assignment.deadline);
    if (!deadline || new Date(deadline) <= new Date()) {
      setActionError('Choose a valid future deadline.');
      return;
    }

    const isReassign = actionMode === 'reassign';
    const endpoint = isReassign
      ? `/reports/manager/${selected.id}/reopened/assign/`
      : `/reports/manager/${selected.id}/assign/`;

    setBusyId(selected.id);
    setActionError('');
    try {
      const payload = {
        staff_id: Number(assignment.staff_id),
        deadline,
      };
      if (!isReassign) payload.priority = assignment.priority;

      await api.post(endpoint, payload);
      setNotice(
        isReassign
          ? `Reopened complaint ${complaintReference(selected.id)} reassigned successfully.`
          : `Complaint ${complaintReference(selected.id)} assigned successfully.`,
      );
      setSelected(null);
      closeAction();
      await loadComplaints(true);
    } catch (err) {
      setActionError(getApiErrorMessage(err) || 'Unable to assign this complaint.');
    } finally {
      setBusyId(null);
    }
  };

  const openTransfer = () => {
    setTransferDepartment('');
    setActionError('');
    setActionMode('transfer');
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    if (!selected || !transferDepartment) {
      setActionError('Select a target department.');
      return;
    }

    if (!window.confirm(`Transfer ${complaintReference(selected.id)} to the selected department?`)) {
      return;
    }

    setBusyId(selected.id);
    setActionError('');
    try {
      await api.post(`/reports/manager/${selected.id}/transfer/`, {
        department: Number(transferDepartment),
      });
      setNotice(`Complaint ${complaintReference(selected.id)} transferred successfully.`);
      setSelected(null);
      closeAction();
      await loadComplaints(true);
    } catch (err) {
      setActionError(getApiErrorMessage(err) || 'Unable to transfer this complaint.');
    } finally {
      setBusyId(null);
    }
  };

  const managerName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : 'Department Manager';

  const unreadNotifications = 0;
  const eligibleStaff = staff.filter((item) => item?.id && item?.user);

  return (
    <div className="department-dashboard dc-page">
      {sidebarOpen && <div className="dd-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`dd-sidebar ${sidebarOpen ? 'dd-sidebar-open' : ''}`}>
        <div className="dd-brand">
          <div className="dd-brand-icon"><ShieldCheck size={25} /></div>
          <div className="dd-brand-text">
            <h2>Civic<span>Fix</span></h2>
            <p>DEPARTMENT PORTAL</p>
          </div>
          <button className="dd-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="dd-sidebar-section">
          <span className="dd-sidebar-label">WORKSPACE</span>
          <nav className="dd-navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.path === '/department/complaints';
              return (
                <button
                  key={item.path}
                  className={`dd-nav-item ${active ? 'active' : ''}`}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.label === 'Notifications' && unreadNotifications > 0 && (
                    <span className="dd-nav-badge">{unreadNotifications}</span>
                  )}
                  {active && <span className="dd-nav-active-indicator" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="dd-sidebar-bottom">
          <div className="dd-sidebar-help">
            <div className="dd-help-icon"><ShieldCheck size={19} /></div>
            <strong>Department Portal</strong>
            <p>Manage civic services in one place.</p>
          </div>
          <button className="dd-logout-button" onClick={handleLogout}>
            <LogOut size={19} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dd-main">
        <header className="dd-header">
          <div className="dd-header-left">
            <button className="dd-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div>
              <div className="dd-breadcrumb">
                Department Portal <ChevronRight size={14} /> Complaints
              </div>
              <h1>Complaints Management</h1>
            </div>
          </div>
          <div className="dd-header-right">
            <button className="dd-refresh-button" onClick={refreshAll} disabled={refreshing} title="Refresh complaints">
              <RefreshCw size={17} className={refreshing ? 'dd-spin' : ''} />
            </button>
            <button className="dd-notification-button" onClick={() => navigate('/department/notifications')} aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="dd-header-divider" />
            <div className="dd-user-info">
              <div className="dd-user-avatar">{managerName.charAt(0).toUpperCase() || 'M'}</div>
              <div className="dd-user-details">
                <strong>{managerName || 'Manager'}</strong>
                <span>Department Manager</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dd-content dc-content">
          <section className="dc-page-intro">
            <div>
              <span className="dc-eyebrow">DEPARTMENT WORKSPACE</span>
              <h2>Manage complaints</h2>
              <p>Review, assign and track complaints submitted to your department.</p>
            </div>
            <div className="dc-intro-icon"><FileText size={34} /></div>
          </section>

          {error && (
            <div className="dc-alert dc-alert-error">
              <AlertCircle size={18} /><span>{error}</span>
              <button onClick={() => loadComplaints(true)}>Retry</button>
            </div>
          )}
          {notice && (
            <div className="dc-alert dc-alert-success">
              <CheckCircle2 size={18} /><span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
            </div>
          )}

          <section className="dc-metrics">
            <Metric icon={FileText} label="Total complaints" value={counts.total} tone="blue" />
            <Metric icon={Clock3} label="Awaiting review" value={counts.submitted} tone="orange" />
            <Metric icon={CheckCircle2} label="Approved" value={counts.approved} tone="green" />
            <Metric icon={Users} label="Assigned / active" value={counts.active} tone="purple" />
          </section>

          <section className="dd-panel dc-list-panel">
            <div className="dc-list-heading">
              <div>
                <h3>All department complaints</h3>
                <p>Only complaints assigned to your department are shown.</p>
              </div>
              <span className="dc-result-count">{filteredComplaints.length} records</span>
            </div>

            <div className="dc-toolbar">
              <label className="dc-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by ID, title, category or location..."
                />
              </label>
              <label className="dc-select-wrap">
                <Filter size={16} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                  {FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                </select>
              </label>
              <select
                className="dc-priority-select"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter by priority"
              >
                <option value="all">All priorities</option>
                <option value="normal">Normal priority</option>
                <option value="high">High priority</option>
              </select>
            </div>

            <div className="dd-table-wrapper">
              <table className="dd-table dc-table">
                <thead>
                  <tr>
                    <th>Complaint</th><th>Category</th><th>Submitted</th>
                    <th>Priority</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="dd-empty-state">Loading department complaints...</td></tr>
                  ) : filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="dd-empty-state">
                        <div className="dc-empty">
                          <FileText size={30} />
                          <strong>No complaints found</strong>
                          <span>{complaints.length ? 'Try changing your search or filters.' : 'There are currently no complaints for your department.'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredComplaints.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="dc-complaint-cell">
                          <strong>{complaintReference(item.id)}</strong>
                          <span>{item.title || 'Untitled complaint'}</span>
                        </div>
                      </td>
                      <td>{item.category || '—'}</td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <span className={`dc-priority dc-priority-${String(item.priority || 'normal').toLowerCase()}`}>
                          {item.priority || 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span className={`dd-status dd-status-${item.status || 'unknown'}`}>
                          <span />{statusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        <button className="dc-view-button" onClick={() => { setSelected(item); closeAction(); }}>
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dc-table-footer">
              <span>Showing {filteredComplaints.length} of {complaints.length} complaints</span>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); }}>Clear filters</button>
            </div>
          </section>

          <footer className="dd-footer">
            <span>© {new Date().getFullYear()} CivicFix</span>
            <span>Department Management Portal</span>
          </footer>
        </div>
      </main>

      {selected && (
        <div className="dc-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busyId) { setSelected(null); closeAction(); }
        }}>
          <section className="dc-detail-modal" role="dialog" aria-modal="true" aria-labelledby="dc-detail-title">
            <div className="dc-modal-header">
              <div>
                <span className="dc-eyebrow">COMPLAINT DETAILS</span>
                <h2 id="dc-detail-title">{complaintReference(selected.id)}</h2>
              </div>
              <button className="dc-modal-close" onClick={() => { setSelected(null); closeAction(); }} aria-label="Close details">
                <X size={20} />
              </button>
            </div>

            <div className="dc-modal-body">
              <div className="dc-detail-title-row">
                <div>
                  <h3>{selected.title || 'Untitled complaint'}</h3>
                  <span className={`dd-status dd-status-${selected.status || 'unknown'}`}>
                    <span />{statusLabel(selected.status)}
                  </span>
                </div>
                <span className={`dc-priority dc-priority-${String(selected.priority || 'normal').toLowerCase()}`}>
                  {selected.priority || 'Normal'} priority
                </span>
              </div>

              <p className="dc-description">{selected.description || 'No description provided.'}</p>

              <div className="dc-detail-grid">
                <Detail icon={FileText} label="Category" value={selected.category || '—'} />
                <Detail icon={CalendarDays} label="Submitted on" value={formatDate(selected.created_at)} />
                <Detail icon={MapPin} label="Location" value={selected.location || 'Not provided'} />
                <Detail icon={UserRound} label="Assigned staff" value={selected.assigned_staff?.name || 'Not assigned'} />
                <Detail icon={Clock3} label="Deadline" value={formatDate(selected.deadline)} />
                <Detail icon={Building2} label="Department" value={selected.department_name || 'Your department'} />
              </div>


              {/* COMPLAINT LOCATION */}
              <section className="dc-location-section">
                <div className="dc-location-section-heading">
                  <div className="dc-location-heading-icon"><MapPin size={18} /></div>
                  <div>
                    <h4>Complaint Location</h4>
                    <p>Location recorded with this complaint.</p>
                  </div>
                </div>

                <div className="dc-location-address">
                  <MapPin size={16} />
                  <span>{selected.location || 'Address information not provided'}</span>
                </div>

                {(() => {
                  const rawLat = selected.latitude;
                  const rawLng = selected.longitude;
                  const lat = Number(rawLat);
                  const lng = Number(rawLng);
                  const validCoordinates =
                    rawLat !== null && rawLat !== undefined && rawLat !== '' &&
                    rawLng !== null && rawLng !== undefined && rawLng !== '' &&
                    Number.isFinite(lat) && Number.isFinite(lng) &&
                    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

                  if (!validCoordinates) {
                    return (
                      <div className="dc-location-missing">
                        <AlertCircle size={18} />
                        <span>Valid latitude and longitude are not available for this complaint. No map marker can be shown.</span>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="dc-coordinate-grid">
                        <div><span>Latitude</span><strong>{lat.toFixed(6)}</strong></div>
                        <div><span>Longitude</span><strong>{lng.toFixed(6)}</strong></div>
                      </div>

                      <LocationMap
                        latitude={rawLat}
                        longitude={rawLng}
                        title="Exact complaint location"
                        readOnly
                      />

                      <a
                        className="dc-google-maps-link"
                        href={`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={16} />
                        View on Google Maps
                        <ArrowUpRight size={15} />
                      </a>
                    </>
                  );
                })()}
              </section>

              {(selected.images?.length > 0 || selected.videos?.length > 0) && (
                <div className="dc-media-section">
                  <h4>Complaint evidence</h4>
                  <div className="dc-media-grid">
                    {selected.images?.map((media) => (
                      <a key={media.id} href={media.image} target="_blank" rel="noreferrer" className="dc-media-link">
                        <ImageIcon size={17} /> View image <ArrowUpRight size={14} />
                      </a>
                    ))}
                    {selected.videos?.map((media) => (
                      <a key={media.id} href={media.video} target="_blank" rel="noreferrer" className="dc-media-link">
                        <Video size={17} /> View video <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.duplicate_of_id && (
                <div className="dc-duplicate-note">
                  <div className="dc-duplicate-copy">
                    <Copy size={17} />
                    <div>
                      <strong>Potential duplicate detected</strong>
                      <span>
                        This complaint may match {complaintReference(selected.duplicate_of_id)}.
                        Review status: {statusLabel(selected.duplicate_review_status)}.
                      </span>
                    </div>
                  </div>
                  {selected.duplicate_review_status === 'pending' && (
                    <div className="dc-inline-actions">
                      <button
                        className="dc-reject-button"
                        disabled={busyId === selected.id}
                        onClick={() => performDuplicateReview(selected, 'reject')}
                      >
                        <XCircle size={15} /> Not a duplicate
                      </button>
                      <button
                        className="dc-approve-button"
                        disabled={busyId === selected.id}
                        onClick={() => performDuplicateReview(selected, 'approve')}
                      >
                        <CheckCircle2 size={15} /> Confirm duplicate
                      </button>
                    </div>
                  )}
                </div>
              )}

              {actionError && <div className="dc-action-error"><AlertCircle size={16} />{actionError}</div>}

              {actionMode === 'assign' && (
                <form className="dc-action-panel" onSubmit={submitAssignment}>
                  <div className="dc-action-heading">
                    <UserPlus size={18} /><div><strong>Assign complaint to staff</strong><span>Select a staff profile and set a deadline.</span></div>
                  </div>
                  <label>
                    Department staff
                    <select value={assignment.staff_id} onChange={(event) => setAssignment((old) => ({ ...old, staff_id: event.target.value }))} required>
                      <option value="">Select staff member</option>
                      {eligibleStaff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {getStaffLabel(person)}{person.phone_number ? ` · ${person.phone_number}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {eligibleStaff.length === 0 && (
                    <p className="dc-form-hint">No staff profiles were returned by the department staff API. Check that staff members are registered and active.</p>
                  )}
                  <div className="dc-form-grid">
                    <label>
                      Assignment deadline
                      <input
                        type="datetime-local"
                        value={assignment.deadline}
                        onChange={(event) => setAssignment((old) => ({ ...old, deadline: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Priority
                      <select value={assignment.priority} onChange={(event) => setAssignment((old) => ({ ...old, priority: event.target.value }))}>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                  <div className="dc-action-buttons">
                    <button type="button" className="dc-secondary-button" onClick={closeAction}>Cancel</button>
                    <button type="submit" className="dc-approve-button" disabled={busyId === selected.id || eligibleStaff.length === 0}>
                      {busyId === selected.id ? 'Assigning...' : 'Assign staff'}
                    </button>
                  </div>
                </form>
              )}

              {actionMode === 'reassign' && (
                <form className="dc-action-panel" onSubmit={submitAssignment}>
                  <div className="dc-action-heading">
                    <RotateCcw size={18} /><div><strong>Reassign reopened complaint</strong><span>Choose a staff profile and a new deadline.</span></div>
                  </div>
                  <label>
                    Department staff
                    <select value={assignment.staff_id} onChange={(event) => setAssignment((old) => ({ ...old, staff_id: event.target.value }))} required>
                      <option value="">Select staff member</option>
                      {eligibleStaff.map((person) => (
                        <option key={person.id} value={person.id}>{getStaffLabel(person)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    New deadline
                    <input
                      type="datetime-local"
                      value={assignment.deadline}
                      onChange={(event) => setAssignment((old) => ({ ...old, deadline: event.target.value }))}
                      required
                    />
                  </label>
                  <p className="dc-form-hint">The existing backend sets reopened complaint priority to High during reassignment.</p>
                  <div className="dc-action-buttons">
                    <button type="button" className="dc-secondary-button" onClick={closeAction}>Cancel</button>
                    <button type="submit" className="dc-approve-button" disabled={busyId === selected.id || eligibleStaff.length === 0}>
                      {busyId === selected.id ? 'Reassigning...' : 'Reassign complaint'}
                    </button>
                  </div>
                </form>
              )}

              {actionMode === 'transfer' && (
                <form className="dc-action-panel" onSubmit={submitTransfer}>
                  <div className="dc-action-heading">
                    <ArrowRightLeft size={18} /><div><strong>Transfer to another department</strong><span>Only active departments are available.</span></div>
                  </div>
                  <label>
                    Target department
                    <select value={transferDepartment} onChange={(event) => setTransferDepartment(event.target.value)} required>
                      <option value="">Select department</option>
                      {departments
                        .filter((department) => department.is_active && Number(department.id) !== Number(selected.department))
                        .map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name} ({department.code})
                          </option>
                        ))}
                    </select>
                  </label>
                  <p className="dc-form-hint">After transfer, this complaint will appear in the receiving department manager's complaint list.</p>
                  <div className="dc-action-buttons">
                    <button type="button" className="dc-secondary-button" onClick={closeAction}>Cancel</button>
                    <button type="submit" className="dc-approve-button" disabled={busyId === selected.id}>
                      {busyId === selected.id ? 'Transferring...' : 'Transfer complaint'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="dc-modal-footer">
              <button className="dc-secondary-button" onClick={() => { setSelected(null); closeAction(); }}>Close</button>

              {!actionMode && selected.status === 'submitted' && (
                <>
                  <button className="dc-reject-button" disabled={busyId === selected.id} onClick={() => performReviewAction(selected, 'reject')}>
                    <XCircle size={16} /> Reject
                  </button>
                  <button className="dc-transfer-button" disabled={busyId === selected.id} onClick={openTransfer}>
                    <ArrowRightLeft size={16} /> Transfer
                  </button>
                  <button className="dc-approve-button" disabled={busyId === selected.id} onClick={() => performReviewAction(selected, 'approve')}>
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </>
              )}

              {!actionMode && selected.status === 'transferred' && (
                <div className="dc-transfer-info">
                  <AlertTriangle size={15} />
                  Transferred complaint: receiving-manager approval requires the backend to accept the transferred status.
                </div>
              )}

              {!actionMode && selected.status === 'approved' && (
                <button className="dc-approve-button" onClick={() => openAssign(selected)}>
                  <UserPlus size={16} /> Assign staff
                </button>
              )}

              {!actionMode && selected.status === 'reopened' && (
                <button className="dc-approve-button" onClick={() => openAssign(selected)}>
                  <RotateCcw size={16} /> Reassign staff
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="dc-metric">
      <div className={`dc-metric-icon ${tone}`}><Icon size={21} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="dc-detail-item">
      <div className="dc-detail-icon"><Icon size={16} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}
