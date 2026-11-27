import { useCallback, useEffect, useMemo, useState } from 'react';
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
RefreshCw,
ChevronRight,
ShieldCheck,
Eye,
Clock3,
CheckCircle2,
AlertCircle,
AlertTriangle,
CalendarDays,
Mail,
Phone,
UserRound,
Filter,
BriefcaseBusiness,
TrendingUp,
Building2,
ArrowUpRight,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './StaffWorkTracking.css';

const NAV_ITEMS = [
{
label: 'Overview',
icon: LayoutDashboard,
path: '/department/dashboard',
},
{
label: 'Complaints',
icon: FileText,
path: '/department/complaints',
},
{
label: 'Staff Management',
icon: Users,
path: '/department/staff',
},
{
label: 'Staff Work Tracking',
icon: TrendingUp,
path: '/department/staff-work-tracking',
},
{
label: 'Reopened Complaints',
icon: RotateCcw,
path: '/department/reopened',
},
{
label: 'Notifications',
icon: Bell,
path: '/department/notifications',
},
{
label: 'Messages',
icon: MessageSquare,
path: '/department/messages',
},
{
label: 'Department Profile',
icon: Settings,
path: '/department/profile',
},
];

const COMPLETED_STATUSES = [
'resolved',
'verified',
'closed',
];

const IN_PROGRESS_STATUSES = [
'assigned',
'in_progress',
];

const PENDING_STATUSES = [
'approved',
'submitted',
'under_review',
'transferred',
'reopened',
];

function getRows(data) {
if (Array.isArray(data)) return data;

if (Array.isArray(data?.results)) return data.results;

if (Array.isArray(data?.data)) return data.data;

if (Array.isArray(data?.reports)) return data.reports;

if (Array.isArray(data?.staff)) return data.staff;

return [];
}

function getStatus(item) {
return String(item?.status || '').toLowerCase().trim();
}

function isCompleted(item) {
return COMPLETED_STATUSES.includes(getStatus(item));
}

function isInProgress(item) {
return IN_PROGRESS_STATUSES.includes(getStatus(item));
}

function isPending(item) {
return PENDING_STATUSES.includes(getStatus(item));
}

function isOverdue(item, now = Date.now()) {
if (isCompleted(item) || !item?.deadline) {
return false;
}

const deadline = new Date(item.deadline).getTime();

if (Number.isNaN(deadline)) {
return false;
}

return deadline < now;
}

function getComplaintTitle(item) {
return item?.title || item?.subject || 'Untitled complaint';
}

function getComplaintId(item) {
return item?.id
? `CF-${String(item.id).padStart(4, '0')}`
: '—';
}

function getStatusLabel(status) {
return String(status || 'unknown').replaceAll('_', ' ');
}

function formatDate(value) {
if (!value) return 'Unavailable';

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Unavailable';
}

return date.toLocaleDateString('en-IN', {
day: '2-digit',
month: 'short',
year: 'numeric',
});
}

function formatDateTime(value) {
if (!value) return 'Unavailable';

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Unavailable';
}

return date.toLocaleString('en-IN', {
day: '2-digit',
month: 'short',
year: 'numeric',
hour: '2-digit',
minute: '2-digit',
});
}

function getStaffName(person) {
if (person?.name) return person.name;

const firstName = person?.first_name || '';
const lastName = person?.last_name || '';

const fullName = `${firstName} ${lastName}`.trim();

if (fullName) return fullName;

return `Staff Member #${person?.user || person?.id || '—'}`;
}

function getStaffEmail(person) {
return person?.email || person?.user_email || 'Email unavailable';
}

function getStaffPhone(person) {
return person?.phone_number || 'Phone unavailable';
}

function getStaffInitials(person) {
const name = getStaffName(person);

if (name.startsWith('Staff Member #')) {
return 'ST';
}

return name
.split(' ')
.filter(Boolean)
.slice(0, 2)
.map((word) => word[0].toUpperCase())
.join('');
}

/*

* The report API may return assigned_staff as a nested object
* or as a staff/user ID.
*
* Match against both staff profile ID and linked user ID.
  */
  function getAssignedStaffId(report) {
  const assigned = report?.assigned_staff;

if (assigned && typeof assigned === 'object') {
return (
assigned.user ??
assigned.id ??
assigned.staff_id ??
null
);
}

return assigned ?? null;
}

function isAssignedToStaff(report, person) {
const assignedId = getAssignedStaffId(report);

if (assignedId === null || assignedId === undefined) {
return false;
}

const possibleIds = [
person?.id,
person?.user,
]
.filter((value) => value !== null && value !== undefined)
.map(String);

return possibleIds.includes(String(assignedId));
}

function getAssignedStaffName(report) {
const assigned = report?.assigned_staff;

if (!assigned) return 'Not assigned';

if (typeof assigned === 'object') {
if (assigned.name) return assigned.name;

const name = `${assigned.first_name || ''} ${
  assigned.last_name || ''
}`.trim();

if (name) return name;

if (assigned.email) return assigned.email;

}

return 'Assigned staff';
}

/*

* Display only actual date properties returned by the API.
* Do not use created_at as an assignment date.
  */
  function getAssignmentDate(report) {
  return (
  report?.assigned_at ||
  report?.assignment_date ||
  report?.assigned_on ||
  null
  );
  }

function getCompletionDate(report) {
return (
report?.resolved_at ||
report?.completed_at ||
report?.verified_at ||
report?.closed_at ||
null
);
}

function getRemainingTime(deadline, completed, now) {
if (completed) {
return 'Completed';
}

if (!deadline) {
return 'Deadline unavailable';
}

const deadlineTime = new Date(deadline).getTime();

if (Number.isNaN(deadlineTime)) {
return 'Deadline unavailable';
}

const difference = deadlineTime - now;

if (difference < 0) {
const overdueMinutes = Math.floor(Math.abs(difference) / 60000);

const days = Math.floor(overdueMinutes / 1440);
const hours = Math.floor((overdueMinutes % 1440) / 60);
const minutes = overdueMinutes % 60;

if (days > 0) {
  return `${days}d ${hours}h overdue`;
}

if (hours > 0) {
  return `${hours}h ${minutes}m overdue`;
}

return `${minutes}m overdue`;

}

const remainingMinutes = Math.floor(difference / 60000);

const days = Math.floor(remainingMinutes / 1440);
const hours = Math.floor((remainingMinutes % 1440) / 60);
const minutes = remainingMinutes % 60;

if (days > 0) {
return `${days}d ${hours}h remaining`;
}

if (hours > 0) {
return `${hours}h ${minutes}m remaining`;
}

return `${minutes}m remaining`;
}

function getWorkStatus(person, reports, now) {
if (reports.some((report) => isOverdue(report, now))) {
return {
label: 'Overdue',
className: 'swt-status-overdue',
};
}

if (reports.some(isInProgress)) {
return {
label: 'In Progress',
className: 'swt-status-progress',
};
}

if (reports.some((report) => !isCompleted(report))) {
return {
label: 'Pending',
className: 'swt-status-pending',
};
}

if (reports.length > 0) {
return {
label: 'Completed',
className: 'swt-status-completed',
};
}

return {
label: 'No Assigned Work',
className: 'swt-status-neutral',
};
}

function getErrorMessage(error) {
return (
getApiErrorMessage(error) ||
'Unable to load staff work tracking information.'
);
}
// ==========================================
// STAFF WORK PROGRESS TIMELINE
// Uses only statuses and timestamps provided
// by the existing complaint API.
// ==========================================

function getComplaintProgress(report) {
  const status = getStatus(report);

  const stages = [
    {
      key: 'assigned',
      label: 'Complaint Assigned',
      description: 'The complaint has been assigned to staff.',
      date: getAssignmentDate(report),
    },
    {
      key: 'in_progress',
      label: 'Work In Progress',
      description: 'Staff work is currently in progress.',
      date: null,
    },
    {
      key: 'resolved',
      label: 'Work Completed',
      description: 'The complaint has been marked as resolved.',
      date: getCompletionDate(report),
    },
    {
      key: 'verified',
      label: 'Complaint Verified',
      description: 'The complaint has been verified.',
      date: report?.verified_at || null,
    },
    {
      key: 'closed',
      label: 'Complaint Closed',
      description: 'The complaint has been closed.',
      date: report?.closed_at || null,
    },
  ];

  const stageIndex = {
    assigned: 0,
    in_progress: 1,
    resolved: 2,
    verified: 3,
    closed: 4,
  };

  const currentIndex = stageIndex[status];

  return {
    status,
    stages,
    currentIndex:
      currentIndex === undefined ? -1 : currentIndex,
    isCompleted: isCompleted(report),
  };
}

function StaffWorkProgressTimeline({ report }) {
  const progress = getComplaintProgress(report);

  const hasAssignment = Boolean(getAssignmentDate(report));

  const statusLabels = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    approved: 'Approved',
    transferred: 'Transferred',
    reopened: 'Reopened',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    verified: 'Verified',
    closed: 'Closed',
    rejected: 'Rejected',
  };

  const currentStatus =
    statusLabels[progress.status] ||
    getStatusLabel(progress.status);

  return (
    <section className="swt-progress-section">

      <div className="swt-progress-heading">
        <div>
          <span className="swt-eyebrow">
            WORKFLOW TRACKING
          </span>

          <h3>Staff Work Progress Timeline</h3>

          <p>
            Track the current progress of this assigned complaint.
          </p>
        </div>

        <span className="swt-progress-current-status">
          {currentStatus}
        </span>
      </div>

      {progress.currentIndex === -1 ? (
        <div className="swt-progress-notice">
          <Clock3 size={19} />

          <div>
            <strong>
              {progress.status === 'reopened'
                ? 'Complaint Reopened'
                : progress.status === 'rejected'
                  ? 'Complaint Rejected'
                  : 'Awaiting Staff Assignment'}
            </strong>

            <p>
              {progress.status === 'reopened'
                ? 'The complaint has been reopened. The current status does not indicate a new assignment or work-start timestamp.'
                : progress.status === 'rejected'
                  ? 'This complaint has been rejected. No active work progress is indicated.'
                  : 'The current complaint status does not indicate that staff work has started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="swt-progress-timeline">

          {progress.stages.map((stage, index) => {
            const completed =
              index < progress.currentIndex;

            const current =
              index === progress.currentIndex;

            const reached =
              index <= progress.currentIndex;

            // Assignment stage is supported by the actual
            // assigned status even if its timestamp is absent.
            const showAssignmentDate =
              stage.key === 'assigned' && hasAssignment;

            const showStageDate =
              Boolean(stage.date);

            // A stage is displayed only as reached when
            // the actual status supports that stage.
            const stageClass = [
              'swt-progress-step',
              completed ? 'completed' : '',
              current ? 'current' : '',
              !reached ? 'pending' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                className={stageClass}
                key={stage.key}
              >

                <div className="swt-progress-marker-column">

                  <div className="swt-progress-marker">
                    {completed ? (
                      <CheckCircle2 size={18} />
                    ) : current ? (
                      <span className="swt-progress-current-dot" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {index !== progress.stages.length - 1 && (
                    <div className="swt-progress-line" />
                  )}

                </div>

                <div className="swt-progress-content">

                  <div className="swt-progress-step-heading">
                    <strong>{stage.label}</strong>

                    {current && (
                      <span className="swt-progress-current-tag">
                        CURRENT STAGE
                      </span>
                    )}

                    {completed && (
                      <span className="swt-progress-completed-tag">
                        COMPLETED
                      </span>
                    )}

                    {!reached && (
                      <span className="swt-progress-pending-tag">
                        UPCOMING
                      </span>
                    )}
                  </div>

                  <p>{stage.description}</p>

                  {showAssignmentDate || showStageDate ? (
                    <span className="swt-progress-date">
                      <CalendarDays size={13} />

                      {formatDateTime(
                        stage.key === 'assigned'
                          ? getAssignmentDate(report)
                          : stage.date
                      )}
                    </span>
                  ) : current ? (
                    <span className="swt-progress-date-unavailable">
                      Status is current. Timestamp unavailable.
                    </span>
                  ) : null}

                </div>

              </div>
            );
          })}

        </div>
      )}

      {progress.isCompleted && (
        <div className="swt-progress-completion">

          <CheckCircle2 size={19} />

          <div>
            <strong>Work completion recorded</strong>

            <p>
              {getCompletionDate(report)
                ? `Completion date: ${formatDateTime(
                    getCompletionDate(report)
                  )}`
                : 'The complaint has reached a completed status, but the API has not provided a completion timestamp.'}
            </p>
          </div>

        </div>
      )}

      <div className="swt-progress-note">
        <AlertCircle size={15} />

        <span>
          Timeline stages are derived from the current complaint
          status. Historical dates are displayed only when
          supplied by the API.
        </span>
      </div>

    </section>
  );
}
export default function StaffWorkTracking() {
const navigate = useNavigate();

const [user, setUser] = useState(null);

const [staff, setStaff] = useState([]);
const [complaints, setComplaints] = useState([]);

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const [error, setError] = useState('');

const [sidebarOpen, setSidebarOpen] = useState(false);

const [search, setSearch] = useState('');
const [statusFilter, setStatusFilter] = useState('all');
const [deadlineFilter, setDeadlineFilter] = useState('all');

const [selectedStaff, setSelectedStaff] = useState(null);
const [selectedComplaint, setSelectedComplaint] = useState(null);

const [now, setNow] = useState(Date.now());

// ==========================================
// AUTHENTICATION
// ==========================================

useEffect(() => {
try {
const storedUser = JSON.parse(
localStorage.getItem('civicfix_user') || 'null'
);

  const token = localStorage.getItem(
    'civicfix_access_token'
  );

  if (
    !token ||
    !storedUser ||
    String(storedUser.role || '').toLowerCase() !== 'manager'
  ) {
    navigate('/department/login', {
      replace: true,
    });

    return;
  }

  setUser(storedUser);
} catch {
  navigate('/department/login', {
    replace: true,
  });
}

}, [navigate]);

// ==========================================
// LIVE DEADLINE CLOCK
// ==========================================

useEffect(() => {
const timer = window.setInterval(() => {
setNow(Date.now());
}, 60000);

return () => window.clearInterval(timer);

}, []);

// ==========================================
// FETCH STAFF AND COMPLAINTS
// ==========================================

const fetchData = useCallback(async (isRefresh = false) => {
if (isRefresh) {
setRefreshing(true);
} else {
setLoading(true);
}


setError('');

try {
  const results = await Promise.allSettled([
    api.get('/reports/manager/'),
    api.get('/departments/my/staff/'),
  ]);

  const [complaintResult, staffResult] = results;

  if (complaintResult.status === 'fulfilled') {
    setComplaints(getRows(complaintResult.value.data));
  } else {
    setComplaints([]);
  }

  if (staffResult.status === 'fulfilled') {
    setStaff(getRows(staffResult.value.data));
  } else {
    setStaff([]);
  }

  if (
    complaintResult.status === 'rejected' &&
    staffResult.status === 'rejected'
  ) {
    throw complaintResult.reason ||
      staffResult.reason ||
      new Error('Unable to load staff tracking data.');
  }

  if (
    complaintResult.status === 'rejected' ||
    staffResult.status === 'rejected'
  ) {
    setError(
      'Some tracking information could not be loaded. Please check the API connection.'
    );
  }
} catch (err) {
  setError(getErrorMessage(err));
} finally {
  setLoading(false);
  setRefreshing(false);
}

}, []);

useEffect(() => {
if (user) {
fetchData();
}
}, [user, fetchData]);

// ==========================================
// STAFF WORK DATA
// ==========================================

const staffWorkData = useMemo(() => {
return staff.map((person) => {
const assignedReports = complaints.filter((report) =>
isAssignedToStaff(report, person)
);

  const completed = assignedReports.filter(isCompleted);

  const inProgress = assignedReports.filter(isInProgress);

  const pending = assignedReports.filter(isPending);

  const overdue = assignedReports.filter((report) =>
    isOverdue(report, now)
  );

  return {
    person,
    reports: assignedReports,
    total: assignedReports.length,
    completed: completed.length,
    pending: pending.length,
    inProgress: inProgress.length,
    overdue: overdue.length,
    workStatus: getWorkStatus(
      person,
      assignedReports,
      now
    ),
  };
});

}, [staff, complaints, now]);

// ==========================================
// SUMMARY STATISTICS
// ==========================================

const statistics = useMemo(() => {
const assignedReports = complaints.filter(
(report) => getAssignedStaffId(report) !== null &&
getAssignedStaffId(report) !== undefined
);

const completed = assignedReports.filter(isCompleted);

const pending = assignedReports.filter(isPending);

const inProgress = assignedReports.filter(isInProgress);

const overdue = assignedReports.filter((report) =>
  isOverdue(report, now)
);

return {
  totalStaff: staff.length,
  totalAssigned: assignedReports.length,
  completed: completed.length,
  pending: pending.length,
  inProgress: inProgress.length,
  overdue: overdue.length,
};

}, [staff, complaints, now]);

// ==========================================
// FILTER STAFF
// ==========================================

const filteredStaff = useMemo(() => {
const query = search.trim().toLowerCase();

return staffWorkData.filter((item) => {
  const person = item.person;

  const searchableText = [
    getStaffName(person),
    getStaffEmail(person),
    getStaffPhone(person),
    person.location,
    person.id,
    person.user,
  ]
    .join(' ')
    .toLowerCase();

  const matchesSearch =
    !query || searchableText.includes(query);

  const status = item.workStatus.label
    .toLowerCase()
    .replaceAll(' ', '_');

  const matchesStatus =
    statusFilter === 'all' ||
    status === statusFilter;

  const matchesDeadline =
    deadlineFilter === 'all' ||
    (deadlineFilter === 'overdue' && item.overdue > 0) ||
    (deadlineFilter === 'on_track' && item.overdue === 0);

  return (
    matchesSearch &&
    matchesStatus &&
    matchesDeadline
  );
});

}, [
staffWorkData,
search,
statusFilter,
deadlineFilter,
]);

// ==========================================
// SELECT STAFF
// ==========================================

const openStaffDetails = (item) => {
setSelectedStaff(item);
};

const closeStaffDetails = () => {
setSelectedStaff(null);
};

// ==========================================
// COMPLAINT DETAILS
// ==========================================

const openComplaintDetails = (report) => {
setSelectedComplaint(report);
};

const closeComplaintDetails = () => {
setSelectedComplaint(null);
};

// ==========================================
// LOGOUT
// ==========================================

const handleLogout = () => {
localStorage.removeItem('civicfix_access_token');
localStorage.removeItem('civicfix_refresh_token');
localStorage.removeItem('civicfix_user');

navigate('/department/login', {
  replace: true,
});

};

// ==========================================
// MANAGER DETAILS
// ==========================================

const managerName = user
? `${user.first_name || ''} ${user.last_name || ''}`.trim()
: 'Department Manager';

const departmentName =
user?.department_name ||
user?.department?.name ||
'Department Management';

// ==========================================
// RENDER
// ==========================================

return ( <div className="department-dashboard swt-page">

  {/* MOBILE OVERLAY */}

  {sidebarOpen && (
    <div
      className="dd-overlay"
      onClick={() => setSidebarOpen(false)}
    />
  )}

  {/* SIDEBAR */}

  <aside
    className={`dd-sidebar ${
      sidebarOpen ? 'dd-sidebar-open' : ''
    }`}
  >
    <div className="dd-brand">
      <div className="dd-brand-icon">
        <ShieldCheck size={25} />
      </div>

      <div className="dd-brand-text">
        <h2>
          Civic<span>Fix</span>
        </h2>

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
      <span className="dd-sidebar-label">
        WORKSPACE
      </span>

      <nav className="dd-navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          const active =
            item.path === '/department/staff-work-tracking';

          return (
            <button
              key={item.path}
              className={`dd-nav-item ${
                active ? 'active' : ''
              }`}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            >
              <Icon size={19} />

              <span>{item.label}</span>

              {active && (
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

      <button
        className="dd-logout-button"
        onClick={handleLogout}
      >
        <LogOut size={19} />
        <span>Logout</span>
      </button>
    </div>
  </aside>

  {/* MAIN CONTENT */}

  <main className="dd-main">

    {/* HEADER */}

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
            Department Portal
            <ChevronRight size={14} />
            Staff Work Tracking
          </div>

          <h1>Staff Work Tracking</h1>
        </div>
      </div>

      <div className="dd-header-right">
        <button
          className="dd-refresh-button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          title="Refresh tracking data"
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

    {/* PAGE CONTENT */}

    <div className="dd-content swt-content">

      {/* INTRO */}

      <section className="swt-intro">
        <div>
          <span className="swt-eyebrow">
            DEPARTMENT WORKSPACE
          </span>

          <h2>Monitor staff performance and workload</h2>

          <p>
            View assigned complaints, monitor deadlines and
            track the progress of your department staff.
          </p>

          <div className="swt-department-tag">
            <Building2 size={15} />
            {departmentName}
          </div>
        </div>

        <div className="swt-intro-icon">
          <BriefcaseBusiness size={43} />
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="swt-alert swt-alert-error">
          <AlertCircle size={19} />

          <span>{error}</span>

          <button onClick={() => fetchData(true)}>
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <section className="swt-stat-grid">

        <StatCard
          icon={Users}
          title="Total Staff"
          value={statistics.totalStaff}
          color="blue"
          loading={loading}
        />

        <StatCard
          icon={FileText}
          title="Assigned Complaints"
          value={statistics.totalAssigned}
          color="purple"
          loading={loading}
        />

        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={statistics.completed}
          color="green"
          loading={loading}
        />

        <StatCard
          icon={Clock3}
          title="Pending"
          value={statistics.pending}
          color="orange"
          loading={loading}
        />

        <StatCard
          icon={TrendingUp}
          title="In Progress"
          value={statistics.inProgress}
          color="indigo"
          loading={loading}
        />

        <StatCard
          icon={AlertTriangle}
          title="Overdue"
          value={statistics.overdue}
          color="red"
          loading={loading}
        />

      </section>

      {/* STAFF TABLE */}

      <section className="dd-panel swt-panel">

        <div className="swt-panel-heading">
          <div>
            <h3>Department Staff</h3>

            <p>
              View individual workloads and assigned complaints.
            </p>
          </div>

          <span className="swt-record-count">
            {filteredStaff.length} staff members
          </span>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="swt-toolbar">

          <label className="swt-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search staff by name, email or phone..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <label className="swt-filter">
            <Filter size={16} />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by work status"
            >
              <option value="all">All work statuses</option>
              <option value="overdue">Overdue</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="no_assigned_work">
                No Assigned Work
              </option>
            </select>
          </label>

          <label className="swt-filter">
            <CalendarDays size={16} />

            <select
              value={deadlineFilter}
              onChange={(event) =>
                setDeadlineFilter(event.target.value)
              }
              aria-label="Filter by deadline"
            >
              <option value="all">All deadlines</option>
              <option value="overdue">Overdue</option>
              <option value="on_track">Not overdue</option>
            </select>
          </label>

        </div>

        {/* STAFF TABLE */}

        <div className="swt-table-wrapper">
          <table className="swt-table">

            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Contact</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>In Progress</th>
                <th>Overdue</th>
                <th>Work Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="9" className="swt-empty">
                    <RefreshCw className="swt-loading-icon" size={22} />
                    <span>Loading staff work information...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="9" className="swt-empty">
                    <Users size={30} />
                    <strong>No staff members found</strong>
                    <span>
                      Try changing your search or filters.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((item) => {
                  const person = item.person;

                  return (
                    <tr key={person.id || person.user}>

                      <td>
                        <div className="swt-staff-cell">
                          <div className="swt-avatar">
                            {getStaffInitials(person)}
                          </div>

                          <div>
                            <strong>{getStaffName(person)}</strong>
                            <span>
                              Staff ID: {person.user || person.id || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="swt-contact-cell">
                          <span>
                            <Mail size={14} />
                            {getStaffEmail(person)}
                          </span>

                          <span>
                            <Phone size={14} />
                            {getStaffPhone(person)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong className="swt-number">
                          {item.total}
                        </strong>
                      </td>

                      <td>
                        <strong className="swt-number swt-green">
                          {item.completed}
                        </strong>
                      </td>

                      <td>
                        <strong className="swt-number swt-orange">
                          {item.pending}
                        </strong>
                      </td>

                      <td>
                        <strong className="swt-number swt-blue">
                          {item.inProgress}
                        </strong>
                      </td>

                      <td>
                        <strong className="swt-number swt-red">
                          {item.overdue}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`swt-status ${
                            item.workStatus.className
                          }`}
                        >
                          {item.workStatus.label}
                        </span>
                      </td>

                      <td>
                        <button
                          className="swt-view-button"
                          onClick={() =>
                            openStaffDetails(item)
                          }
                        >
                          <Eye size={15} />
                          View Work
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="swt-table-footer">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        )}

      </section>

      {/* FOOTER */}

      <footer className="dd-footer">
        <span>© {new Date().getFullYear()} CivicFix</span>
        <span>Department Management Portal</span>
      </footer>

    </div>
  </main>

  {/* ==========================================
      STAFF WORK DETAILS MODAL
  ========================================== */}

  {selectedStaff && (
    <div
      className="swt-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeStaffDetails();
        }
      }}
    >
      <section
        className="swt-modal swt-work-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swt-staff-modal-title"
      >

        <div className="swt-modal-header">
          <div>
            <span className="swt-eyebrow">
              STAFF WORK DETAILS
            </span>

            <h2 id="swt-staff-modal-title">
              {getStaffName(selectedStaff.person)}
            </h2>

            <p>
              Review all complaints assigned to this staff member.
            </p>
          </div>

          <button
            className="swt-close-button"
            onClick={closeStaffDetails}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="swt-modal-body">

          {/* STAFF INFORMATION */}

          <div className="swt-staff-information">
            <div className="swt-large-avatar">
              {getStaffInitials(selectedStaff.person)}
            </div>

            <div>
              <h3>{getStaffName(selectedStaff.person)}</h3>

              <span>
                Staff ID: {selectedStaff.person.user || selectedStaff.person.id || '—'}
              </span>

              <p>
                <Mail size={14} />
                {getStaffEmail(selectedStaff.person)}
              </p>

              <p>
                <Phone size={14} />
                {getStaffPhone(selectedStaff.person)}
              </p>
            </div>
          </div>

          {/* STAFF SUMMARY */}

          <div className="swt-detail-stat-grid">
            <DetailStat
              label="Assigned"
              value={selectedStaff.total}
            />

            <DetailStat
              label="Completed"
              value={selectedStaff.completed}
              tone="green"
            />

            <DetailStat
              label="Pending"
              value={selectedStaff.pending}
              tone="orange"
            />

            <DetailStat
              label="In Progress"
              value={selectedStaff.inProgress}
              tone="blue"
            />

            <DetailStat
              label="Overdue"
              value={selectedStaff.overdue}
              tone="red"
            />
          </div>

          {/* ASSIGNED COMPLAINTS */}

          <div className="swt-assigned-heading">
            <div>
              <h3>Assigned Complaints</h3>
              <p>
                Work records associated with this staff member.
              </p>
            </div>

            <span>
              {selectedStaff.reports.length} complaints
            </span>
          </div>

          {selectedStaff.reports.length === 0 ? (
            <div className="swt-no-work">
              <BriefcaseBusiness size={32} />

              <strong>No assigned complaints</strong>

              <span>
                This staff member currently has no assigned complaints.
              </span>
            </div>
          ) : (
            <div className="swt-complaint-list">

              {selectedStaff.reports.map((report) => {
                const completed = isCompleted(report);
                const overdue = isOverdue(report, now);

                const status = getStatus(report);

                return (
                  <article
                    className="swt-complaint-card"
                    key={report.id}
                  >

                    <div className="swt-complaint-card-top">
                      <div>
                        <span className="swt-complaint-reference">
                          {getComplaintId(report)}
                        </span>

                        <h4>{getComplaintTitle(report)}</h4>

                        <span className="swt-category">
                          {report.category || 'Category unavailable'}
                        </span>
                      </div>

                      <span
                        className={`swt-status ${
                          completed
                            ? 'swt-status-completed'
                            : overdue
                              ? 'swt-status-overdue'
                              : isInProgress(report)
                                ? 'swt-status-progress'
                                : 'swt-status-pending'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="swt-complaint-information">

                      <InfoItem
                        icon={AlertTriangle}
                        label="Priority"
                        value={report.priority || 'Unavailable'}
                      />

                      <InfoItem
                        icon={CalendarDays}
                        label="Assignment Date"
                        value={formatDate(getAssignmentDate(report))}
                      />

                      <InfoItem
                        icon={Clock3}
                        label="Deadline"
                        value={formatDateTime(report.deadline)}
                      />

                      <InfoItem
                        icon={CheckCircle2}
                        label="Completion Date"
                        value={formatDate(getCompletionDate(report))}
                      />

                      <InfoItem
                        icon={TrendingUp}
                        label="Time Status"
                        value={getRemainingTime(
                          report.deadline,
                          completed,
                          now
                        )}
                      />

                    </div>

                    <div className="swt-complaint-card-footer">

                      <span
                        className={
                          overdue
                            ? 'swt-time-overdue'
                            : completed
                              ? 'swt-time-completed'
                              : 'swt-time-normal'
                        }
                      >
                        {completed
                          ? 'Completed'
                          : overdue
                            ? 'Deadline exceeded'
                            : 'Deadline tracking'}
                      </span>

                      <button
                        className="swt-complaint-view-button"
                        onClick={() =>
                          openComplaintDetails(report)
                        }
                      >
                        <Eye size={15} />
                        View Complaint Details
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </div>
      </section>
    </div>
  )}

  {/* ==========================================
      COMPLAINT DETAILS MODAL
  ========================================== */}

  {selectedComplaint && (
    <div
      className="swt-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeComplaintDetails();
        }
      }}
    >
      <section
        className="swt-modal swt-complaint-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swt-complaint-title"
      >

        <div className="swt-modal-header">
          <div>
            <span className="swt-eyebrow">
              COMPLAINT DETAILS
            </span>

            <h2 id="swt-complaint-title">
              {getComplaintId(selectedComplaint)}
            </h2>
          </div>

          <button
            className="swt-close-button"
            onClick={closeComplaintDetails}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="swt-modal-body">

          <div className="swt-complaint-detail-title">
            <div>
              <h3>{getComplaintTitle(selectedComplaint)}</h3>

              <span
                className={`swt-status ${
                  isCompleted(selectedComplaint)
                    ? 'swt-status-completed'
                    : isOverdue(selectedComplaint, now)
                      ? 'swt-status-overdue'
                      : isInProgress(selectedComplaint)
                        ? 'swt-status-progress'
                        : 'swt-status-pending'
                }`}
              >
                {getStatusLabel(getStatus(selectedComplaint))}
              </span>
            </div>

            <span className="swt-priority">
              {selectedComplaint.priority || 'Priority unavailable'}
            </span>
          </div>

          <div className="swt-description">
            <h4>Description</h4>

            <p>
              {selectedComplaint.description ||
                'No description provided.'}
            </p>
          </div>

          <div className="swt-complaint-detail-grid">

            <InfoItem
              icon={FileText}
              label="Complaint ID"
              value={getComplaintId(selectedComplaint)}
            />

            <InfoItem
              icon={BriefcaseBusiness}
              label="Category"
              value={selectedComplaint.category || 'Unavailable'}
            />

            <InfoItem
              icon={AlertTriangle}
              label="Priority"
              value={selectedComplaint.priority || 'Unavailable'}
            />

            <InfoItem
              icon={UserRound}
              label="Assigned Staff"
              value={getAssignedStaffName(selectedComplaint)}
            />

            <InfoItem
              icon={CalendarDays}
              label="Submitted Date"
              value={formatDate(selectedComplaint.created_at)}
            />

            <InfoItem
              icon={CalendarDays}
              label="Assignment Date"
              value={formatDate(getAssignmentDate(selectedComplaint))}
            />

            <InfoItem
              icon={Clock3}
              label="Deadline"
              value={formatDateTime(selectedComplaint.deadline)}
            />

            <InfoItem
              icon={CheckCircle2}
              label="Completion Date"
              value={formatDate(getCompletionDate(selectedComplaint))}
            />

            <InfoItem
              icon={Building2}
              label="Department"
              value={selectedComplaint.department_name || 'Your department'}
            />

          </div>

          <div className="swt-description">
            <h4>Location</h4>

            <p>
              {selectedComplaint.location || 'Location unavailable'}
            </p>
          </div>

          {/* STAFF WORK PROGRESS TIMELINE */}
          <StaffWorkProgressTimeline report={selectedComplaint} />

          <div className="swt-detail-footer">
            <button
              className="swt-secondary-button"
              onClick={closeComplaintDetails}
            >
              Close Details
            </button>
          </div>

        </div>
      </section>
    </div>
  )}

</div>


);
}

// ==========================================
// SUMMARY CARD
// ==========================================

function StatCard({
icon: Icon,
title,
value,
color,
loading,
}) {
return ( <div className="swt-stat-card">

  <div className={`swt-stat-icon ${color}`}>
    <Icon size={22} />
  </div>

  <div className="swt-stat-body">
    <span>{title}</span>

    <strong>{loading ? '—' : value}</strong>
  </div>

  <div className="swt-stat-decoration">
    <ArrowUpRight size={18} />
  </div>

</div>

);
}

// ==========================================
// DETAIL STAT
// ==========================================

function DetailStat({ label, value, tone = 'default' }) {
return (
<div className={`swt-detail-stat ${tone}`}> <span>{label}</span> <strong>{value}</strong> </div>
);
}

// ==========================================
// INFORMATION ITEM
// ==========================================

function InfoItem({ icon: Icon, label, value }) {
return ( <div className="swt-info-item">



  <div className="swt-info-icon">
    <Icon size={17} />
  </div>

  <div>
    <span>{label}</span>
    <strong>{value || 'Unavailable'}</strong>
  </div>

</div>



);
}
