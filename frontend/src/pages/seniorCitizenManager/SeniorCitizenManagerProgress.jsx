import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  Mail,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  ArrowUpRight,
  CircleDot,
  Phone,
  CalendarDays,
  Navigation,
  MapPinned,
  User,
  Route,
  FileText,
  Flag,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import api, { getApiErrorMessage } from '../../api/axios';
import './SeniorCitizenManagerDashboard.css';
import './SeniorCitizenManagerProgress.css';
import useManagerUnreadNotifications from './useManagerUnreadNotifications';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Staff assigned',
  in_progress: 'In progress',
  on_the_way: 'Staff on the way',
  arrived: 'Staff arrived',
  pickup_completed: 'Pickup completed',
  in_transit: 'In transit',
  completed: 'Completed',
  closed: 'Closed',
};

const WORKFLOW = [
  {
    key: 'submitted',
    label: 'Request submitted',
    description: 'Request received by CivicFix.',
  },
  {
    key: 'under_review',
    label: 'Under review',
    description: 'Manager is reviewing the request.',
  },
  {
    key: 'approved',
    label: 'Approved',
    description: 'Request approved for assistance.',
  },
  {
    key: 'assigned',
    label: 'Staff assigned',
    description: 'A staff member has been assigned.',
  },
  {
    key: 'in_progress',
    label: 'Work started',
    description: 'Staff has started handling the request.',
  },
  {
    key: 'on_the_way',
    label: 'Staff on the way',
    description: 'Staff is travelling to the pickup location.',
  },
  {
    key: 'arrived',
    label: 'Staff arrived',
    description: 'Staff has reached the pickup location.',
  },
  {
    key: 'pickup_completed',
    label: 'Pickup completed',
    description: 'The citizen has been picked up.',
  },
  {
    key: 'in_transit',
    label: 'In transit',
    description: 'Transport or assistance is in progress.',
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'The assistance request has been completed.',
  },
  {
    key: 'closed',
    label: 'Closed',
    description: 'The request has been closed.',
  },
];

const PENDING = new Set(['submitted', 'under_review']);

const ACTIVE = new Set([
  'assigned',
  'in_progress',
  'on_the_way',
  'arrived',
  'pickup_completed',
  'in_transit',
]);

const DONE = new Set(['completed', 'closed']);

const arrayFrom = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.data)
        ? data.data
        : [];

const safeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLabel = (value, withTime = false) => {
  const date = safeDate(value);

  if (!date) return 'Not recorded';

  return new Intl.DateTimeFormat(
    'en-IN',
    withTime
      ? {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
  ).format(date);
};

const statusLabel = (status) =>
  STATUS_LABELS[status] ||
  String(status || 'Unknown').replaceAll('_', ' ');

const cleanValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return value;
};

const firstValue = (...values) =>
  values.find((value) => cleanValue(value) !== null) ?? null;

const formatText = (value) =>
  String(value || '—').replaceAll('_', ' ');

const managerDisplayName = (user) =>
  [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() ||
  user?.email ||
  'Manager';

function StatusBadge({ status }) {
  return (
    <span
      className={`scmp-status ${String(
        status || 'unknown'
      ).replaceAll('_', '-')}`}
    >
      {statusLabel(status)}
    </span>
  );
}

/*
 * Coordinate helper:
 * Supports common latitude/longitude property names.
 * The map is shown only when real coordinates are present.
 */
function getCoordinates(object, prefixes = ['']) {
  if (!object) return null;

  for (const prefix of prefixes) {
    const lat = firstValue(
      object[`${prefix}latitude`],
      object[`${prefix}lat`],
      object[`${prefix}gps_latitude`],
      object[`${prefix}gps_lat`]
    );

    const lng = firstValue(
      object[`${prefix}longitude`],
      object[`${prefix}lng`],
      object[`${prefix}lon`],
      object[`${prefix}gps_longitude`],
      object[`${prefix}gps_lng`]
    );

    if (lat !== null && lng !== null) {
      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return [latitude, longitude];
      }
    }
  }

  return null;
}

function getRequestLocations(request) {
  const pickup = getCoordinates(request, [
    'pickup_',
    'pickup_location_',
    'location_',
    '',
  ]);

  const destination = getCoordinates(request, [
    'destination_',
    'dropoff_',
    'destination_location_',
  ]);

  return { pickup, destination };
}

function getCurrentWorkflowIndex(status) {
  if (status === 'rejected') return -1;

  return WORKFLOW.findIndex((step) => step.key === status);
}

function buildVisibleMilestones(request) {
  const items = [];

  if (request.created_at) {
    items.push({
      title: 'Request submitted',
      date: request.created_at,
      note: 'The assistance request was received by CivicFix.',
    });
  }

  if (
    request.updated_at &&
    request.updated_at !== request.created_at
  ) {
    items.push({
      title: `Latest status: ${statusLabel(request.status)}`,
      date: request.updated_at,
      note: 'Last updated timestamp returned by the request API.',
    });
  }

  if (request.estimated_arrival) {
    items.push({
      title: 'Estimated arrival recorded',
      date: request.estimated_arrival,
      note: 'Estimated arrival time recorded for this request.',
    });
  }

  if (request.completed_at) {
    items.push({
      title: 'Request marked completed',
      date: request.completed_at,
      note:
        request.completion_notes ||
        'The request was marked as completed.',
    });
  }

  if (request.verified_at) {
    items.push({
      title: 'Completion verified',
      date: request.verified_at,
      note: 'Completion verification timestamp was recorded.',
    });
  }

  return items.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

function DetailItem({ icon: Icon, label, value, subValue }) {
  return (
    <div className="scmp-detail-item">
      <span className="scmp-detail-icon">
        <Icon size={16} />
      </span>

      <div>
        <small>{label}</small>
        <strong>{value || 'Not provided'}</strong>
        {subValue && <span>{subValue}</span>}
      </div>
    </div>
  );
}

function WorkflowTracker({ status }) {
  const currentIndex = getCurrentWorkflowIndex(status);

  if (status === 'rejected') {
    return (
      <div className="scmp-rejected-panel">
        <AlertTriangle size={19} />

        <div>
          <strong>Request rejected</strong>
          <p>
            This request did not proceed through the assistance
            workflow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scmp-workflow">
      {WORKFLOW.map((step, index) => {
        const completed =
          currentIndex >= 0 && index < currentIndex;

        const current = index === currentIndex;

        const future =
          currentIndex < 0 || index > currentIndex;

        return (
          <div
            className={`scmp-workflow-step ${
              completed ? 'is-complete' : ''
            } ${current ? 'is-current' : ''} ${
              future ? 'is-upcoming' : ''
            }`}
            key={step.key}
          >
            <div className="scmp-workflow-marker">
              {completed ? (
                <Check size={14} />
              ) : current ? (
                <CircleDot size={14} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <div className="scmp-workflow-copy">
              <strong>{step.label}</strong>
              <p>{step.description}</p>
              {current && <small>Current stage</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequestMap({ request }) {
  const { pickup, destination } =
    getRequestLocations(request);

  const center = pickup || destination;

  if (!center) {
    return (
      <div className="scmp-map-unavailable">
        <MapPinned size={27} />

        <strong>Map coordinates unavailable</strong>

        <p>
          The request API has not supplied valid GPS coordinates
          for this request. The address details are shown
          separately.
        </p>
      </div>
    );
  }

  const route =
    pickup && destination
      ? [pickup, destination]
      : [center];

  const mapCenter =
    pickup && destination
      ? [
          (pickup[0] + destination[0]) / 2,
          (pickup[1] + destination[1]) / 2,
        ]
      : center;

  return (
    <div className="scmp-map-wrap">
      <MapContainer
        center={mapCenter}
        zoom={pickup && destination ? 12 : 14}
        scrollWheelZoom={false}
        className="scmp-request-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <CircleMarker
            center={pickup}
            radius={9}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }}
          >
            <Popup>Pickup location</Popup>
          </CircleMarker>
        )}

        {destination && (
          <CircleMarker
            center={destination}
            radius={9}
            pathOptions={{
              color: '#15803d',
              fillColor: '#22c55e',
              fillOpacity: 1,
            }}
          >
            <Popup>Destination</Popup>
          </CircleMarker>
        )}

        {!pickup && destination && (
          <Marker position={destination}>
            <Popup>Destination location</Popup>
          </Marker>
        )}

        {pickup && !destination && (
          <Marker position={pickup}>
            <Popup>Pickup location</Popup>
          </Marker>
        )}

        {pickup && destination && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#435cf5',
              weight: 4,
              dashArray: '8 8',
            }}
          />
        )}
      </MapContainer>

      <div className="scmp-map-legend">
        {pickup && (
          <span>
            <i className="pickup-dot" /> Pickup
          </span>
        )}

        {destination && (
          <span>
            <i className="destination-dot" /> Destination
          </span>
        )}
      </div>
    </div>
  );
}

export default function SeniorCitizenManagerProgress() {
  const navigate = useNavigate();
  const location = useLocation();

  // Shared unread notification count
  const { unreadCount } =
    useManagerUnreadNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const [user] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/senior-citizen/');
      setRequests(arrayFrom(response.data));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) =>
        PENDING.has(item.status)
      ).length,
      approved: requests.filter(
        (item) => item.status === 'approved'
      ).length,
      active: requests.filter((item) =>
        ACTIVE.has(item.status)
      ).length,
      completed: requests.filter((item) =>
        DONE.has(item.status)
      ).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...requests]
      .filter((item) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') {
          return ACTIVE.has(item.status);
        }
        if (statusFilter === 'pending') {
          return PENDING.has(item.status);
        }
        if (statusFilter === 'completed') {
          return DONE.has(item.status);
        }

        return item.status === statusFilter;
      })
      .filter((item) => {
        if (!term) return true;

        const searchableValues = [
          item.id,
          item.full_name,
          item.phone_number,
          item.district,
          item.state,
          item.assigned_staff_full_name,
          item.assigned_staff_email,
          item.assistance_type,
        ];

        return searchableValues.some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          (safeDate(b.updated_at)?.getTime() || 0) -
          (safeDate(a.updated_at)?.getTime() || 0)
      );
  }, [requests, search, statusFilter]);

  const managerName = managerDisplayName(user);

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

  const selectedMilestones = selected
    ? buildVisibleMilestones(selected)
    : [];

  return (
    <div className="sc-dashboard scmp-progress-shell">
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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

        {/* Workspace navigation */}
        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path;

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
                    <span className="sc-nav-badge">
                      {unreadCount > 99
                        ? '99+'
                        : unreadCount}
                    </span>
                  )}
              </button>
            );
          })}

          {/* Messages - after Notifications */}
          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              '/senior-citizen/manager/messages'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              navigate(
                '/senior-citizen/manager/messages'
              );
              setSidebarOpen(false);
            }}
          >
            <Mail size={19} />
            <span>Messages</span>
          </button>

          {/* Work Management - after Messages */}
          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              '/senior-citizen/manager/work-management'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              navigate(
                '/senior-citizen/manager/work-management'
              );
              setSidebarOpen(false);
            }}
          >
            <Activity size={19} />
            <span>Work Management</span>
          </button>
        </nav>

        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">
          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              '/senior-citizen/manager/profile'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              navigate('/senior-citizen/manager/profile');
              setSidebarOpen(false);
            }}
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
              onClick={() =>
                navigate('/senior-citizen/manager/requests')
              }
            >
              View requests <ArrowUpRight size={13} />
            </button>
          </div>

          <button
            className="sc-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="sc-main">
        <header className="sc-header">
          <div className="sc-header-left">
            <button
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
                Progress Tracking
              </div>

              <h2>Progress Tracking</h2>
            </div>
          </div>

          <div className="sc-header-right">
            <button
              className="sc-notification-button"
              onClick={() =>
                navigate(
                  '/senior-citizen/manager/notifications'
                )
              }
              aria-label="Open notifications"
            >
              <Bell size={17} />

              {unreadCount > 0 && (
                <i />
              )}
            </button>

            <button
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
          <section className="scmp-page-heading">
            <div>
              <span className="scmp-eyebrow">
                SERVICE DELIVERY OVERVIEW
              </span>

              <h1>Track assistance progress</h1>

              <p>
                Monitor requests routed to your service area,
                from submission through completion.
              </p>
            </div>

            <button
              className="scmp-refresh"
              type="button"
              onClick={loadRequests}
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={
                  loading ? 'scmp-progress-spin' : ''
                }
              />
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          </section>

          {error && (
            <div className="scmp-alert" role="alert">
              <CircleAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <section
            className="scmp-progress-kpis"
            aria-label="Request summary"
          >
            {[
              {
                label: 'Total requests',
                value: stats.total,
                caption:
                  'All requests visible to your account',
                icon: ClipboardList,
                color: 'blue',
              },
              {
                label: 'Awaiting review',
                value: stats.pending,
                caption: 'Submitted or under review',
                icon: Clock3,
                color: 'orange',
              },
              {
                label: 'Approved',
                value: stats.approved,
                caption:
                  'Approved, awaiting staff assignment',
                icon: CheckCircle2,
                color: 'blue',
              },
              {
                label: 'In progress',
                value: stats.active,
                caption: 'Assigned and field-work stages',
                icon: Activity,
                color: 'purple',
              },
              {
                label: 'Completed',
                value: stats.completed,
                caption: 'Completed or closed',
                icon: CheckCircle2,
                color: 'green',
              },
            ].map((card) => {
              const Icon = card.icon;

              return (
                <article
                  className="sc-stat-card"
                  key={card.label}
                >
                  <div className="sc-stat-top">
                    <span
                      className={`sc-stat-icon ${card.color}`}
                    >
                      <Icon size={19} />
                    </span>
                  </div>

                  <div className="sc-stat-label">
                    {card.label}
                  </div>

                  <div className="sc-stat-value">
                    {loading ? '—' : card.value}
                  </div>

                  <div className="sc-stat-caption">
                    {card.caption}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="scmp-progress-table-card">
            <div className="scmp-progress-table-head">
              <div>
                <h3>Assistance request progress</h3>
                <p>
                  {filteredRequests.length} of{' '}
                  {requests.length} requests
                </p>
              </div>

              <button
                className="scmp-progress-link"
                onClick={() =>
                  navigate(
                    '/senior-citizen/manager/requests'
                  )
                }
              >
                Manage requests <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="scmp-progress-filters">
              <label className="scmp-progress-search">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by request, citizen, staff or area"
                  aria-label="Search assistance requests"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter by progress status"
              >
                <option value="all">All statuses</option>
                <option value="pending">
                  Awaiting review
                </option>
                <option value="active">In progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="scmp-progress-empty">
                <RefreshCw
                  size={19}
                  className="scmp-progress-spin"
                />
                Loading assistance progress…
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="scmp-progress-empty">
                <ClipboardList size={24} />

                <strong>No matching requests</strong>

                <span>
                  {requests.length
                    ? 'Try changing the search or status filter.'
                    : 'Requests routed to your service area will appear here.'}
                </span>
              </div>
            ) : (
              <div className="scmp-progress-table-scroll">
                <table className="scmp-progress-table">
                  <thead>
                    <tr>
                      <th>REQUEST</th>
                      <th>SENIOR CITIZEN</th>
                      <th>SERVICE / AREA</th>
                      <th>ASSIGNED STAFF</th>
                      <th>STATUS</th>
                      <th>LAST UPDATED</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong className="scmp-progress-id">
                            #{item.id}
                          </strong>
                          <small>
                            {dateLabel(item.created_at)}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {item.full_name ||
                              'Name unavailable'}
                          </strong>
                          <small>
                            {item.phone_number ||
                              'Phone not provided'}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {formatText(
                              item.assistance_type ||
                                'Assistance'
                            )}
                          </strong>

                          <small>
                            <MapPin size={11} />
                            {[
                              item.district,
                              item.state,
                            ]
                              .filter(Boolean)
                              .join(', ') ||
                              'Area not provided'}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {item.assigned_staff_full_name ||
                              'Not assigned'}
                          </strong>
                          <small>
                            {item.assigned_staff_email ||
                              'Awaiting staff assignment'}
                          </small>
                        </td>

                        <td>
                          <StatusBadge status={item.status} />
                        </td>

                        <td>
                          {dateLabel(item.updated_at, true)}
                        </td>

                        <td>
                          <button
                            className="scmp-progress-view"
                            onClick={() => setSelected(item)}
                            aria-label={`View progress for request ${item.id}`}
                          >
                            Timeline <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="sc-footer">
            <span>CivicFix · Senior Citizen Care</span>

            <span>
              <ShieldCheck size={13} />
              Secure management workspace
            </span>
          </div>
        </div>
      </main>

      {selected && (
        <div
          className="scmp-progress-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section
            className="scmp-progress-modal scmp-progress-modal-expanded"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scmp-progress-modal-title"
          >
            <div className="scmp-progress-modal-head">
              <div>
                <span className="scmp-eyebrow">
                  REQUEST #{selected.id}
                </span>

                <h2 id="scmp-progress-modal-title">
                  Request journey & progress
                </h2>

                <p>
                  {selected.full_name || 'Senior citizen'} ·{' '}
                  {statusLabel(selected.status)}
                </p>

                <div className="scmp-modal-status">
                  <StatusBadge status={selected.status} />
                  <span>
                    Last updated:{' '}
                    {dateLabel(selected.updated_at, true)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                aria-label="Close timeline"
              >
                <X size={19} />
              </button>
            </div>

            <section className="scmp-modal-section">
              <div className="scmp-section-heading">
                <span>
                  <Activity size={17} />
                </span>

                <div>
                  <h3>Current workflow</h3>
                  <p>
                    Current stage based on the request status
                    received from the API.
                  </p>
                </div>
              </div>

              <WorkflowTracker status={selected.status} />
            </section>

            <section className="scmp-modal-section">
              <div className="scmp-section-heading">
                <span>
                  <FileText size={17} />
                </span>

                <div>
                  <h3>Request information</h3>
                  <p>
                    Applicant and assistance details.
                  </p>
                </div>
              </div>

              <div className="scmp-expanded-grid">
                <DetailItem
                  icon={User}
                  label="Senior citizen"
                  value={selected.full_name}
                />

                <DetailItem
                  icon={Phone}
                  label="Contact number"
                  value={selected.phone_number}
                />

                <DetailItem
                  icon={Mail}
                  label="Email"
                  value={
                    selected.citizen_email ||
                    selected.email
                  }
                />

                <DetailItem
                  icon={Flag}
                  label="Assistance type"
                  value={formatText(
                    selected.assistance_type
                  )}
                />

                <DetailItem
                  icon={Activity}
                  label="Priority"
                  value={formatText(
                    selected.priority || 'Normal'
                  )}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Preferred date & time"
                  value={dateLabel(
                    selected.preferred_datetime,
                    true
                  )}
                />

                <DetailItem
                  icon={Clock3}
                  label="Deadline"
                  value={dateLabel(
                    selected.deadline,
                    true
                  )}
                />

                <DetailItem
                  icon={Navigation}
                  label="Estimated arrival"
                  value={dateLabel(
                    selected.estimated_arrival,
                    true
                  )}
                />
              </div>

              {selected.description && (
                <div className="scmp-description-block">
                  <small>Request description</small>
                  <p>{selected.description}</p>
                </div>
              )}
            </section>

            <section className="scmp-modal-section">
              <div className="scmp-section-heading">
                <span>
                  <Users size={17} />
                </span>

                <div>
                  <h3>Assigned staff & service handling</h3>
                  <p>
                    Staff assignment information returned by
                    the request API.
                  </p>
                </div>
              </div>

              <div className="scmp-staff-card">
                <div className="scmp-staff-avatar">
                  <UserRound size={23} />
                </div>

                <div className="scmp-staff-info">
                  <strong>
                    {selected.assigned_staff_full_name ||
                      'No staff assigned yet'}
                  </strong>

                  <span>
                    {selected.assigned_staff_email ||
                      'Staff email not available'}
                  </span>

                  {selected.assigned_staff_phone && (
                    <span>
                      <Phone size={12} />{' '}
                      {selected.assigned_staff_phone}
                    </span>
                  )}
                </div>

                <StatusBadge
                  status={
                    selected.assigned_staff
                      ? 'assigned'
                      : selected.status === 'approved'
                        ? 'approved'
                        : selected.status
                  }
                />
              </div>

              {selected.is_transferred && (
                <div className="scmp-transfer-note">
                  <Route size={16} />
                  This request has been marked as transferred.
                </div>
              )}
            </section>

            <section className="scmp-modal-section">
              <div className="scmp-section-heading">
                <span>
                  <MapPinned size={17} />
                </span>

                <div>
                  <h3>Pickup, destination & map</h3>
                  <p>
                    Location information available for this
                    request.
                  </p>
                </div>
              </div>

              <div className="scmp-location-grid">
                <div className="scmp-location-card">
                  <span className="scmp-location-pin pickup">
                    <MapPin size={16} />
                  </span>

                  <div>
                    <small>Pickup / current address</small>
                    <strong>
                      {firstValue(
                        selected.pickup_location,
                        selected.address,
                        'Address not provided'
                      )}
                    </strong>
                  </div>
                </div>

                <div className="scmp-location-card">
                  <span className="scmp-location-pin destination">
                    <Navigation size={16} />
                  </span>

                  <div>
                    <small>Destination</small>
                    <strong>
                      {firstValue(
                        selected.destination,
                        selected.destination_address,
                        selected.destination_location,
                        'Destination not provided'
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="scmp-area-line">
                <MapPin size={14} />
                {[
                  selected.district,
                  selected.state,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Area not provided'}
              </div>

              <RequestMap request={selected} />
            </section>

            <section className="scmp-modal-section">
              <div className="scmp-section-heading">
                <span>
                  <Clock3 size={17} />
                </span>

                <div>
                  <h3>Recorded milestones</h3>
                  <p>
                    Confirmed timestamps available in the
                    request response.
                  </p>
                </div>
              </div>

              {selectedMilestones.length ? (
                <ol className="scmp-progress-timeline">
                  {selectedMilestones.map(
                    (event, index) => (
                      <li
                        key={`${event.title}-${event.date}-${index}`}
                      >
                        <span className="scmp-progress-timeline-icon">
                          {index ===
                          selectedMilestones.length - 1 ? (
                            <CircleDot size={15} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                        </span>

                        <div>
                          <strong>{event.title}</strong>
                          <time>
                            {dateLabel(event.date, true)}
                          </time>
                          <p>{event.note}</p>
                        </div>
                      </li>
                    )
                  )}
                </ol>
              ) : (
                <div className="scmp-progress-empty-note">
                  No progress timestamps have been recorded
                  for this request yet.
                </div>
              )}

              <p className="scmp-progress-history-note">
                The current backend response does not expose
                the complete status-change history (previous
                status, staff/manager actor and notes). The
                workflow above represents the current stage;
                recorded milestones show only timestamps
                actually returned by the API.
              </p>
            </section>

            {selected.completion_notes && (
              <section className="scmp-modal-section">
                <div className="scmp-section-heading">
                  <span>
                    <CheckCircle2 size={17} />
                  </span>

                  <div>
                    <h3>Completion information</h3>
                    <p>
                      Completion note returned by the backend.
                    </p>
                  </div>
                </div>

                <div className="scmp-description-block">
                  <small>Completion notes</small>
                  <p>{selected.completion_notes}</p>

                  <div className="scmp-completion-dates">
                    <span>
                      Completed:{' '}
                      {dateLabel(
                        selected.completed_at,
                        true
                      )}
                    </span>

                    <span>
                      Verified:{' '}
                      {dateLabel(
                        selected.verified_at,
                        true
                      )}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="scmp-progress-modal-actions">
              <button
                onClick={() => {
                  setSelected(null);
                  navigate(
                    '/senior-citizen/manager/requests'
                  );
                }}
              >
                Open request management{' '}
                <ArrowUpRight size={14} />
              </button>

              <button
                className="secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}