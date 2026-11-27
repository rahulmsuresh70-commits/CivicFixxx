import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, RotateCcw, Bell, MessageSquare,
  Settings, LogOut, Search, Menu, X, RefreshCw, ChevronRight,
  ShieldCheck, Eye, Phone, MapPin, CalendarDays, Clock3, AlertCircle,
  CheckCircle2, Filter, UserRound, UserCheck, ClipboardList, CalendarClock,
  CircleAlert, ArrowRight, RotateCw
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import './DepartmentReopened.css';

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

const rowsFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const statusOf = (item) => String(item?.status || '').toLowerCase();
const display = (value) => value === null || value === undefined || value === '' ? 'Not provided' : value;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function getCitizenName(report) {
  const citizen = report?.citizen_details || report?.citizen_info || report?.citizen;
  if (citizen && typeof citizen === 'object') {
    const name = `${citizen.first_name || ''} ${citizen.last_name || ''}`.trim();
    return name || citizen.email || `Citizen #${citizen.id || report.citizen}`;
  }
  return citizen ? `Citizen #${citizen}` : 'Citizen';
}

function getStaffName(person) {
  const name = `${person?.first_name || ''} ${person?.last_name || ''}`.trim();
  return name || person?.name || `Staff #${person?.user || person?.id}`;
}

function getReopenReason(report) {
  const candidates = [
    report?.reopen_reason,
    report?.reopening_reason,
    report?.latest_reopen?.reason,
    report?.reopen?.reason,
    report?.reopen_details?.reason,
    report?.reopen_description,
    ...(Array.isArray(report?.reopen_requests) ? report.reopen_requests.slice().reverse().map((item) => item?.reason) : []),
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim()) || 'Reopening reason is not available in the report response.';
}

function getResolutionRecords(report) {
  const history = Array.isArray(report?.resolution_history) ? report.resolution_history : [];
  const current = report?.resolution;
  const records = [...history];
  if (current && !records.some((item) => String(item?.id) === String(current?.id))) {
    records.push(current);
  }
  return records;
}

function getError(error) {
  return getApiErrorMessage(error) || 'Something went wrong. Please try again.';
}

function toLocalDateTimeMinimum() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function DepartmentReopened() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

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

  const fetchData = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [reportResponse, staffResponse] = await Promise.all([
        api.get('/reports/manager/'),
        api.get('/departments/my/staff/'),
      ]);
      const allReports = rowsFrom(reportResponse.data);
      setReports(allReports.filter((item) => statusOf(item) === 'reopened'));
      setStaff(rowsFrom(staffResponse.data));
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const locations = useMemo(() => [...new Set(reports.map((r) => r.location).filter(Boolean))].sort(), [reports]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const location = String(report.location || '').toLowerCase();
      const matchesFilter = filter === 'all' || (filter === 'unassigned' ? !report.assigned_staff : filter === 'assigned' ? Boolean(report.assigned_staff) : location === filter);
      const searchable = [
        report.id, report.title, report.category, report.description, report.location,
        report.priority, getCitizenName(report), getReopenReason(report)
      ].join(' ').toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [reports, search, filter]);

  const stats = useMemo(() => ({
    total: reports.length,
    unassigned: reports.filter((r) => !r.assigned_staff).length,
    assigned: reports.filter((r) => Boolean(r.assigned_staff)).length,
    high: reports.filter((r) => String(r.priority || '').toLowerCase() === 'high').length,
  }), [reports]);

  const managerName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Department Manager';

  const logout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');
    navigate('/department/login', { replace: true });
  };

  const openAssign = (report) => {
    setAssigning(report);
    setStaffId('');
    setDeadline('');
    setActionError('');
    setSelected(null);
  };

  const closeAssign = () => {
    if (saving) return;
    setAssigning(null);
    setActionError('');
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    setActionError('');
    if (!staffId || !deadline) {
      setActionError('Select a staff member and provide a new deadline.');
      return;
    }
    const localDate = new Date(deadline);
    if (Number.isNaN(localDate.getTime()) || localDate <= new Date()) {
      setActionError('The deadline must be in the future.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post(`/reports/manager/${assigning.id}/reopened/assign/`, {
        staff_id: Number(staffId),
        deadline: localDate.toISOString(),
      });
      setNotice(response.data?.message || `Complaint #${assigning.id} reassigned successfully.`);
      setAssigning(null);
      await fetchData(true);
    } catch (err) {
      setActionError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="department-dashboard dr-page">
      {sidebarOpen && <div className="dd-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`dd-sidebar ${sidebarOpen ? 'dd-sidebar-open' : ''}`}>
        <div className="dd-brand">
          <div className="dd-brand-icon"><ShieldCheck size={25} /></div>
          <div className="dd-brand-text"><h2>Civic<span>Fix</span></h2><p>DEPARTMENT PORTAL</p></div>
          <button className="dd-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="dd-sidebar-section">
          <span className="dd-sidebar-label">WORKSPACE</span>
          <nav className="dd-navigation">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = path === '/department/reopened';
              return <button key={path} className={`dd-nav-item ${active ? 'active' : ''}`} onClick={() => { navigate(path); setSidebarOpen(false); }}>
                <Icon size={19} /><span>{label}</span>{active && <span className="dd-nav-active-indicator" />}
              </button>;
            })}
          </nav>
        </div>
        <div className="dd-sidebar-bottom">
          <div className="dd-sidebar-help"><div className="dd-help-icon"><ShieldCheck size={19} /></div><strong>Department Portal</strong><p>Manage civic services in one place.</p></div>
          <button className="dd-logout-button" onClick={logout}><LogOut size={19} /><span>Logout</span></button>
        </div>
      </aside>

      <main className="dd-main">
        <header className="dd-header">
          <div className="dd-header-left">
            <button className="dd-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div><div className="dd-breadcrumb">Department Portal <ChevronRight size={14} /> Reopened Complaints</div><h1>Reopened Complaints</h1></div>
          </div>
          <div className="dd-header-right">
            <button className="dd-refresh-button" onClick={() => fetchData(true)} disabled={refreshing} title="Refresh"><RefreshCw size={17} className={refreshing ? 'dd-spin' : ''} /></button>
            <button className="dd-notification-button" onClick={() => navigate('/department/notifications')} aria-label="Notifications"><Bell size={20} /></button>
            <div className="dd-header-divider" />
            <div className="dd-user-info"><div className="dd-user-avatar">{managerName.charAt(0).toUpperCase()}</div><div className="dd-user-details"><strong>{managerName}</strong><span>Department Manager</span></div></div>
          </div>
        </header>

        <div className="dd-content dr-content">
          <section className="dr-hero">
            <div><span className="dr-eyebrow">DEPARTMENT WORKSPACE</span><h2>Review and reassign reopened issues</h2><p>Follow up on complaints reopened by citizens and assign them to your department staff with a new deadline.</p></div>
            <div className="dr-hero-icon"><RotateCcw size={38} /></div>
          </section>

          {error && <div className="dr-alert dr-alert-error"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
          {notice && <div className="dr-alert dr-alert-success"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

          <section className="dr-stats">
            <Stat icon={RotateCcw} label="Reopened complaints" value={stats.total} tone="blue" />
            <Stat icon={UserCheck} label="Already reassigned" value={stats.assigned} tone="green" />
            <Stat icon={UserRound} label="Awaiting assignment" value={stats.unassigned} tone="orange" />
            <Stat icon={CircleAlert} label="High priority" value={stats.high} tone="purple" />
          </section>

          <section className="dd-panel dr-panel">
            <div className="dr-panel-heading"><div><h3>Reopened complaint queue</h3><p>Only reopened complaints belonging to your department are shown.</p></div><span className="dr-count">{filtered.length} Records</span></div>
            <div className="dr-toolbar">
              <label className="dr-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by complaint ID, title, citizen or location..." />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</label>
              <label className="dr-filter"><Filter size={16} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All reopened</option><option value="unassigned">Awaiting assignment</option><option value="assigned">Reassigned</option>{locations.map((location) => <option value={location} key={location}>{location}</option>)}</select></label>
            </div>

            {loading ? <div className="dr-state"><RefreshCw className="dr-spin" size={25} /><span>Loading reopened complaints...</span></div> :
              filtered.length === 0 ? <div className="dr-empty"><div><ClipboardList size={30} /></div><h3>{reports.length ? 'No matching complaints' : 'No reopened complaints'}</h3><p>{reports.length ? 'Try changing your search or filter.' : 'When a citizen reopens a complaint, it will appear here for review and reassignment.'}</p><button onClick={() => { setSearch(''); setFilter('all'); fetchData(true); }}>Refresh queue</button></div> :
              <div className="dr-list">
                {filtered.map((report) => {
                  const assignedUser = report.assigned_staff;
                  const staffMember = staff.find((s) => String(s.user) === String(assignedUser) || String(s.id) === String(assignedUser));
                  const assignedName = staffMember ? getStaffName(staffMember) : (typeof assignedUser === 'object' ? `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || `Staff #${assignedUser.id}` : assignedUser ? `Staff #${assignedUser}` : 'Not assigned');
                  return <article className="dr-card" key={report.id}>
                    <div className="dr-card-top"><div className="dr-id">COMPLAINT #{report.id}</div><div className="dr-badges"><span className="dr-status">Reopened</span><span className={`dr-priority ${String(report.priority || 'normal').toLowerCase()}`}>{report.priority || 'Normal'} priority</span></div></div>
                    <div className="dr-card-main"><div className="dr-card-copy"><h3>{display(report.title)}</h3><p>{display(report.description)}</p></div><div className="dr-card-actions"><button className="dr-view-button" onClick={() => setSelected(report)}><Eye size={16} /> View details</button><button className="dr-assign-button" onClick={() => openAssign(report)}><UserCheck size={16} /> {assignedUser ? 'Reassign staff' : 'Assign staff'}</button></div></div>
                    <div className="dr-meta-grid">
                      <Meta icon={UserRound} label="Citizen" value={getCitizenName(report)} />
                      <Meta icon={ClipboardList} label="Category" value={display(report.category)} />
                      <Meta icon={MapPin} label="Location" value={display(report.location)} />
                      <Meta icon={CalendarDays} label="Submitted" value={formatDate(report.created_at || report.created)} />
                      <Meta icon={UserCheck} label="Assigned staff" value={assignedName} />
                      <Meta icon={Clock3} label="Current deadline" value={formatDate(report.deadline)} />
                    </div>
                    <div className="dr-reason"><strong><RotateCw size={15} /> Reopening reason</strong><p>{getReopenReason(report)}</p></div>
                  </article>;
                })}
              </div>}
            <div className="dr-footer"><span>Showing {filtered.length} of {reports.length} reopened complaints</span><button onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button></div>
          </section>
          <footer className="dd-footer"><span>© {new Date().getFullYear()} CivicFix</span><span>Department Management Portal</span></footer>
        </div>
      </main>

      {selected && <div className="dr-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
        <section className="dr-modal" role="dialog" aria-modal="true" aria-labelledby="dr-details-title">
          <div className="dr-modal-head"><div><span className="dr-eyebrow">COMPLAINT #{selected.id}</span><h2 id="dr-details-title">Reopened complaint details</h2></div><button onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button></div>
          <div className="dr-detail-body">
            <h3>{display(selected.title)}</h3><p>{display(selected.description)}</p>
            <div className="dr-detail-grid">
              <Meta icon={UserRound} label="Citizen" value={getCitizenName(selected)} />
              <Meta icon={ClipboardList} label="Category" value={display(selected.category)} />
              <Meta icon={MapPin} label="Location" value={display(selected.location)} />
              <Meta icon={CalendarDays} label="Created" value={formatDate(selected.created_at || selected.created)} />
              <Meta icon={CalendarClock} label="Deadline" value={formatDate(selected.deadline)} />
              <Meta icon={UserCheck} label="Assigned staff ID" value={typeof selected.assigned_staff === 'object' ? selected.assigned_staff?.id : display(selected.assigned_staff)} />
            </div>
            <div className="dr-reason dr-detail-reason"><strong><RotateCw size={15} /> Reopening reason</strong><p>{getReopenReason(selected)}</p></div>
            <section className="dr-resolution-history">
              <h3>Previous staff resolution evidence</h3>
              {getResolutionRecords(selected).length === 0 ? (
                <p className="dr-resolution-empty">No previous resolution evidence is included in this report response.</p>
              ) : getResolutionRecords(selected).map((resolution, resolutionIndex) => {
                const resolutionImages = Array.isArray(resolution?.images) ? resolution.images : [];
                const resolutionVideos = Array.isArray(resolution?.videos) ? resolution.videos : [];
                return (
                  <article className="dr-resolution-record" key={resolution?.id ?? resolutionIndex}>
                    <div className="dr-resolution-record-heading">
                      <strong>Staff work completed</strong>
                      <span>{formatDate(resolution?.resolved_at || resolution?.created_at)}</span>
                    </div>
                    <p>{display(resolution?.work_description)}</p>
                    {resolutionImages.length > 0 && (
                      <div className="dr-resolution-media">
                        <strong>Completion photos</strong>
                        <div className="dr-resolution-image-grid">
                          {resolutionImages.map((item, index) => {
                            const url = typeof item === 'string' ? item : item?.image || item?.image_url;
                            return url ? <a key={item?.id ?? `${url}-${index}`} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Staff completion evidence ${index + 1}`} loading="lazy" /></a> : null;
                          })}
                        </div>
                      </div>
                    )}
                    {resolutionVideos.length > 0 && (
                      <div className="dr-resolution-media">
                        <strong>Completion videos</strong>
                        <div className="dr-resolution-video-list">
                          {resolutionVideos.map((item, index) => {
                            const url = typeof item === 'string' ? item : item?.video || item?.video_url;
                            return url ? <a key={item?.id ?? `${url}-${index}`} href={url} target="_blank" rel="noreferrer">▶ View staff completion video {index + 1}</a> : null;
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
            {Array.isArray(selected.images) && selected.images.length > 0 && <div className="dr-media"><strong>Complaint images</strong><div>{selected.images.map((item, index) => <a key={item.id || index} href={item.image || item.image_url || '#'} target="_blank" rel="noreferrer">View image {index + 1}</a>)}</div></div>}
          </div>
          <div className="dr-modal-actions"><button className="dr-view-button" onClick={() => setSelected(null)}>Close</button><button className="dr-assign-button" onClick={() => openAssign(selected)}><UserCheck size={16} /> Assign / Reassign</button></div>
        </section>
      </div>}

      {assigning && <div className="dr-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeAssign()}>
        <section className="dr-modal dr-assign-modal" role="dialog" aria-modal="true" aria-labelledby="dr-assign-title">
          <div className="dr-modal-head"><div><span className="dr-eyebrow">COMPLAINT #{assigning.id}</span><h2 id="dr-assign-title">Assign reopened complaint</h2><p>Select department staff and set a new deadline.</p></div><button onClick={closeAssign} disabled={saving} aria-label="Close"><X size={20} /></button></div>
          <form onSubmit={submitAssignment} className="dr-assign-form">
            <label>Department staff <span>*</span><select value={staffId} onChange={(e) => setStaffId(e.target.value)} required><option value="">Select staff member</option>{staff.map((person) => <option key={person.id} value={person.id}>{getStaffName(person)} — {person.phone_number || 'No phone'} </option>)}</select><small>Choose an active staff profile from your department.</small></label>
            <label>New completion deadline <span>*</span><input type="datetime-local" min={toLocalDateTimeMinimum()} value={deadline} onChange={(e) => setDeadline(e.target.value)} required /><small>The deadline must be in the future. The backend requires a timezone-aware date and time.</small></label>
            {actionError && <div className="dr-alert dr-alert-error"><AlertCircle size={17} /><span>{actionError}</span></div>}
            <div className="dr-assignment-note"><AlertCircle size={16} /><span>Reassigning a reopened complaint sets its status to Assigned and priority to High according to the current backend workflow.</span></div>
            <div className="dr-modal-actions"><button type="button" className="dr-view-button" onClick={closeAssign} disabled={saving}>Cancel</button><button type="submit" className="dr-assign-button" disabled={saving || staff.length === 0}>{saving ? <><RefreshCw size={16} className="dr-spin" /> Saving...</> : <><ArrowRight size={16} /> Confirm assignment</>}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return <div className="dr-stat"><div className={`dr-stat-icon ${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Meta({ icon: Icon, label, value }) {
  return <div className="dr-meta"><span><Icon size={14} /> {label}</span><strong>{display(value)}</strong></div>;
}
