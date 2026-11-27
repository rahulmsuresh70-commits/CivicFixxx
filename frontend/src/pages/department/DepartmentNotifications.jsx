import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, RotateCcw, Bell, MessageSquare,
  Settings, LogOut, Search, Menu, X, RefreshCw, ChevronRight,
  ShieldCheck, CheckCheck, Clock3, CheckCircle2, AlertCircle,
  Filter, Mail, MailOpen, ArrowUpRight, Inbox, CircleDot
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import './DepartmentNotifications.css';

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

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
}

function getMessage(item) {
  return item?.message || item?.title || 'Department update';
}

export default function DepartmentNotifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.get('/notifications/');
      setNotifications(getArray(response.data));
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const isRead = Boolean(item.is_read);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' && !isRead) ||
        (filter === 'read' && isRead);
      const searchable = `${getMessage(item)} ${item.report || ''} ${item.id || ''}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [notifications, filter, search]);

  const markAsRead = async (notification) => {
    if (notification.is_read || markingId !== null) return;
    setMarkingId(notification.id);
    setError('');
    setSuccess('');
    try {
      await api.post(`/notifications/${notification.id}/read/`);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      setSuccess('Notification marked as read.');
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to mark this notification as read.');
    } finally {
      setMarkingId(null);
    }
  };

  const markVisibleAsRead = async () => {
    const unread = visibleNotifications.filter((item) => !item.is_read);
    if (!unread.length || markingId !== null) return;
    // The API exposes a per-notification read endpoint; call it for each visible unread item.
    setError('');
    setSuccess('');
    let completed = 0;
    for (const item of unread) {
      setMarkingId(item.id);
      try {
        await api.post(`/notifications/${item.id}/read/`);
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === item.id ? { ...notification, is_read: true } : notification
          )
        );
        completed += 1;
      } catch (err) {
        setError(getApiErrorMessage(err) || `Could not mark notification #${item.id} as read.`);
        break;
      }
    }
    setMarkingId(null);
    if (completed) setSuccess(`${completed} notification${completed === 1 ? '' : 's'} marked as read.`);
  };

  const managerName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Department Manager';

  const logout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');
    navigate('/department/login', { replace: true });
  };

  const openRelatedComplaint = (item) => {
    if (item.report) navigate('/department/complaints');
    else setSuccess('This notification is not linked to a complaint record.');
  };

  return (
    <div className="department-dashboard dn-page">
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
              const active = path === '/department/notifications';
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
            <div><div className="dd-breadcrumb">Department Portal <ChevronRight size={14} /> Notifications</div><h1>Notifications</h1></div>
          </div>
          <div className="dd-header-right">
            <button className="dd-refresh-button" onClick={() => fetchNotifications(true)} disabled={refreshing} title="Refresh"><RefreshCw size={17} className={refreshing ? 'dn-spin' : ''} /></button>
            <div className="dd-header-divider" />
            <div className="dd-user-info"><div className="dd-user-avatar">{managerName.charAt(0).toUpperCase()}</div><div className="dd-user-details"><strong>{managerName}</strong><span>Department Manager</span></div></div>
          </div>
        </header>

        <div className="dd-content dn-content">
          <section className="dn-hero">
            <div><span className="dn-eyebrow">DEPARTMENT WORKSPACE</span><h2>Stay updated with department activity</h2><p>View complaint updates, staff assignments and other notifications related to your department account.</p></div>
            <div className="dn-hero-icon"><Bell size={38} /></div>
          </section>

          {error && <div className="dn-alert dn-error"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
          {success && <div className="dn-alert dn-success"><CheckCircle2 size={18} /><span>{success}</span><button onClick={() => setSuccess('')} aria-label="Dismiss">×</button></div>}

          <section className="dn-stats">
            <Stat icon={Inbox} label="Total notifications" value={notifications.length} tone="blue" />
            <Stat icon={Mail} label="Unread notifications" value={unreadCount} tone="orange" />
            <Stat icon={MailOpen} label="Read notifications" value={notifications.length - unreadCount} tone="green" />
          </section>

          <section className="dd-panel dn-panel">
            <div className="dn-panel-heading">
              <div><h3>All notifications</h3><p>Your personal department notifications, newest activity first.</p></div>
              <button className="dn-mark-all" onClick={markVisibleAsRead} disabled={!visibleNotifications.some((item) => !item.is_read) || markingId !== null}>
                <CheckCheck size={16} /> Mark visible as read
              </button>
            </div>

            <div className="dn-toolbar">
              <label className="dn-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notification message or complaint ID..." />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</label>
              <label className="dn-filter"><Filter size={16} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All notifications</option><option value="unread">Unread</option><option value="read">Read</option></select></label>
            </div>

            {loading ? <div className="dn-state"><RefreshCw size={25} className="dn-spin" /><span>Loading notifications...</span></div> :
              visibleNotifications.length === 0 ? <div className="dn-empty"><div><Bell size={30} /></div><h3>{notifications.length ? 'No matching notifications' : 'You are all caught up'}</h3><p>{notifications.length ? 'Try another search term or notification filter.' : 'Department updates and complaint activity will appear here when notifications are generated.'}</p><button onClick={() => { setFilter('all'); setSearch(''); fetchNotifications(true); }}>Refresh notifications</button></div> :
              <div className="dn-list">
                {visibleNotifications.map((item) => (
                  <article key={item.id} className={`dn-item ${item.is_read ? '' : 'dn-unread'}`}>
                    <div className={`dn-item-icon ${item.is_read ? 'read' : 'unread'}`}>{item.is_read ? <MailOpen size={19} /> : <Bell size={19} />}</div>
                    <div className="dn-item-content">
                      <div className="dn-item-top"><span className="dn-item-type">{item.report ? `Complaint #${item.report}` : 'Department update'}</span><span className={`dn-read-badge ${item.is_read ? 'read' : 'unread'}`}>{item.is_read ? 'Read' : 'Unread'}</span></div>
                      <p>{getMessage(item)}</p>
                      <div className="dn-item-bottom"><span><Clock3 size={14} /> {formatDate(item.created_at || item.created)}</span><div className="dn-item-actions">
                        {item.report && <button className="dn-link-action" onClick={() => openRelatedComplaint(item)}>View complaints <ArrowUpRight size={14} /></button>}
                        {!item.is_read && <button className="dn-read-action" onClick={() => markAsRead(item)} disabled={markingId !== null}>{markingId === item.id ? <RefreshCw size={14} className="dn-spin" /> : <CheckCheck size={14} />} Mark as read</button>}
                      </div></div>
                    </div>
                    {!item.is_read && <span className="dn-unread-dot" title="Unread notification"><CircleDot size={11} /></span>}
                  </article>
                ))}
              </div>}
            <div className="dn-footer"><span>Showing {visibleNotifications.length} of {notifications.length} notifications</span><button onClick={() => { setFilter('all'); setSearch(''); }}>Clear filters</button></div>
          </section>
          <footer className="dd-footer"><span>© {new Date().getFullYear()} CivicFix</span><span>Department Management Portal</span></footer>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return <div className="dn-stat"><div className={`dn-stat-icon ${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}
