import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserRound,
  Mail,
  ShieldCheck,
  CalendarDays,
  RefreshCw,
  ArrowLeft,
  CircleCheck,
  PencilLine,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Bell,
  BadgeCheck,
  Lock,
  ChevronRight,
  Clock,
  Info,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './Profile.css';

/* ==========================================================================
   Helpers
========================================================================== */

const RESOLVED_STATUSES = ['resolved', 'verified', 'closed'];

function formatDate(value) {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not provided';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user?.email?.split('@')[0] || 'Citizen';
}

function titleCase(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function getInitials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'C'
  );
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function clearSession() {
  localStorage.removeItem('civicfix_access_token');
  localStorage.removeItem('civicfix_refresh_token');
  localStorage.removeItem('civicfix_user');
}

/* ==========================================================================
   Small components
========================================================================== */

function ProfileDetail({ icon: Icon, label, value }) {
  return (
    <div className="cp-detail">
      <span className="cp-detail-icon">
        <Icon size={19} aria-hidden="true" />
      </span>

      <div className="cp-detail-content">
        <span className="cp-detail-label">{label}</span>
        <strong>{value || 'Not provided'}</strong>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, hint, full = false }) {
  return (
    <div
      className={`cp-form-field${full ? ' cp-form-field-full' : ''}`}
    >
      <span className="cp-form-label">{label}</span>

      <div className="cp-readonly-field" aria-readonly="true">
        {value || 'Not provided'}
      </div>

      {hint && <span className="cp-field-hint">{hint}</span>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone, loading }) {
  return (
    <article className={`cp-stat cp-stat-${tone}`}>
      <span className="cp-stat-icon">
        <Icon size={20} aria-hidden="true" />
      </span>

      <div className="cp-stat-copy">
        <span className="cp-stat-label">{label}</span>

        <strong className="cp-stat-value">
          {loading ? (
            <span className="cp-skeleton cp-skeleton-number" />
          ) : (
            value
          )}
        </strong>

        <span className="cp-stat-detail">{detail}</span>
      </div>
    </article>
  );
}

/* ==========================================================================
   Page
========================================================================== */

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('details');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
  });

  const [activity, setActivity] = useState({
    loading: true,
    failed: false,
    reports: [],
    notifications: [],
  });

  /* ---------------- Data loading ---------------- */

  const loadActivity = useCallback(async () => {
    setActivity((current) => ({ ...current, loading: true }));

    const [reportsResult, notificationsResult] =
      await Promise.allSettled([
        api.get('/reports/'),
        api.get('/notifications/'),
      ]);

    setActivity({
      loading: false,
      failed:
        reportsResult.status === 'rejected' &&
        notificationsResult.status === 'rejected',
      reports:
        reportsResult.status === 'fulfilled'
          ? toArray(reportsResult.value.data)
          : [],
      notifications:
        notificationsResult.status === 'fulfilled'
          ? toArray(notificationsResult.value.data)
          : [],
    });
  }, []);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('civicfix_access_token');

    if (!token) {
      navigate('/login', {
        replace: true,
        state: {
          message: 'Please log in to view your profile.',
        },
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get('/auth/me/');
      const data = response.data;

      if (String(data?.role || '').toLowerCase() !== 'citizen') {
        navigate('/login', {
          replace: true,
          state: {
            message: 'This profile is available to citizen accounts.',
          },
        });
        return;
      }

      setProfile(data);

      setFormData({
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
      });

      localStorage.setItem('civicfix_user', JSON.stringify(data));

      loadActivity();
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        clearSession();

        navigate('/login', {
          replace: true,
          state: {
            message: 'Your session has expired. Please log in again.',
          },
        });
        return;
      }

      setError(
        getApiErrorMessage(requestError) ||
          'Unable to load your profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, loadActivity]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ---------------- Edit flow ---------------- */

  const startEditing = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
    });

    setFormErrors({});
    setError('');
    setSuccess('');
    setActiveTab('details');
    setEditing(true);
  };

  const cancelEditing = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
    });

    setFormErrors({});
    setError('');
    setEditing(false);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: '' }));
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    const errors = {};

    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();

    if (!firstName) {
      errors.first_name = 'First name is required.';
    } else if (firstName.length > 100) {
      errors.first_name = 'First name cannot exceed 100 characters.';
    }

    if (!lastName) {
      errors.last_name = 'Last name is required.';
    } else if (lastName.length > 100) {
      errors.last_name = 'Last name cannot exceed 100 characters.';
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
    };

    try {
      /*
       * The existing Django /auth/me/ endpoint must implement
       * PATCH before this request can save profile changes.
       */
      await api.patch('/auth/me/', payload);

      /* Fetch again so the page shows what the backend stored. */
      const refreshedResponse = await api.get('/auth/me/');
      const updatedProfile = refreshedResponse.data;

      setProfile(updatedProfile);

      setFormData({
        first_name: updatedProfile?.first_name || '',
        last_name: updatedProfile?.last_name || '',
      });

      localStorage.setItem(
        'civicfix_user',
        JSON.stringify(updatedProfile)
      );

      setEditing(false);
      setFormErrors({});
      setSuccess('Your profile has been updated successfully.');
    } catch (requestError) {
      const statusCode = requestError?.response?.status;

      if (statusCode === 401) {
        clearSession();

        navigate('/login', {
          replace: true,
          state: {
            message: 'Your session has expired. Please log in again.',
          },
        });
        return;
      }

      if (statusCode === 404 || statusCode === 405) {
        setError(
          'The backend profile update endpoint is not enabled. ' +
            'Please implement PATCH support for /api/auth/me/.'
        );
      } else {
        const data = requestError?.response?.data;
        const fieldErrors = {};

        if (data && typeof data === 'object') {
          ['first_name', 'last_name'].forEach((field) => {
            if (data[field]) {
              fieldErrors[field] = Array.isArray(data[field])
                ? data[field][0]
                : String(data[field]);
            }
          });
        }

        setFormErrors(fieldErrors);

        setError(
          getApiErrorMessage(requestError) ||
            'Unable to save your profile. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const refreshAll = () => {
    setSuccess('');
    loadProfile();
  };

  /* ---------------- Derived values ---------------- */

  const name = getDisplayName(profile);
  const initials = getInitials(name);
  const memberSince = formatDate(
    profile?.date_joined || profile?.created_at
  );
  const verified = Boolean(profile?.is_verified);
  const roleLabel = titleCase(profile?.role) || 'Citizen';

  const completeness = useMemo(() => {
    const checks = [
      Boolean(profile?.first_name),
      Boolean(profile?.last_name),
      Boolean(profile?.email),
      verified,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [profile, verified]);

  const stats = useMemo(() => {
    const total = activity.reports.length;

    const resolved = activity.reports.filter((report) =>
      RESOLVED_STATUSES.includes(
        String(report?.status || '').toLowerCase()
      )
    ).length;

    const unread = activity.notifications.filter(
      (item) => item?.is_read === false || item?.read === false
    ).length;

    return { total, resolved, open: total - resolved, unread };
  }, [activity]);

  const showSkeleton = activity.loading;
  const statValue = (value) =>
    activity.failed ? '—' : value;

  /* ---------------- Render ---------------- */

  return (
    <section className="cp-page">
      {/* Page header */}
      <header className="cp-hero">
        <div className="cp-hero-copy">
          <nav className="cp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/user/dashboard">Dashboard</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Profile</span>
          </nav>

          <h1>My profile</h1>

          <p>View and manage your citizen account information.</p>
        </div>

        <div className="cp-hero-actions">
          <button
            type="button"
            className="cp-ghost-button"
            onClick={refreshAll}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? 'cp-spin' : undefined}
              aria-hidden="true"
            />
            Refresh
          </button>

          <Link to="/user/dashboard" className="cp-ghost-button">
            <ArrowLeft size={16} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      {error && (
        <div className="cp-alert" role="alert">
          <AlertCircle size={18} aria-hidden="true" />

          <span>{error}</span>

          <button
            type="button"
            onClick={editing ? () => setError('') : loadProfile}
          >
            {editing ? (
              <X size={15} aria-hidden="true" />
            ) : (
              <RefreshCw size={15} aria-hidden="true" />
            )}
            {editing ? 'Dismiss' : 'Try again'}
          </button>
        </div>
      )}

      {success && (
        <div className="cp-success-alert" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {loading && !profile ? (
        <div className="cp-loading">
          <span className="cp-spinner" />
          <span>Loading your profile...</span>
        </div>
      ) : (
        <div className="cp-layout">
          {/* ---------------- Summary card ---------------- */}
          <aside className="cp-summary" aria-label="Profile summary">
            <div className="cp-summary-cover" />

            <div className="cp-summary-body">
              <div
                className="cp-avatar"
                role="img"
                aria-label={`Avatar for ${name}`}
              >
                {initials}
              </div>

              <h2>{name}</h2>

              <p className="cp-summary-email">
                {profile?.email || 'Email not provided'}
              </p>

              <div className="cp-badges">
                <span className="cp-role-badge">
                  <UserRound size={14} aria-hidden="true" />
                  Citizen account
                </span>

                {verified ? (
                  <span className="cp-verified-badge">
                    <CircleCheck size={14} aria-hidden="true" />
                    Email verified
                  </span>
                ) : (
                  <span className="cp-unverified-badge">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Verification pending
                  </span>
                )}
              </div>

              <div className="cp-progress">
                <div className="cp-progress-head">
                  <span>Profile completeness</span>
                  <strong>{completeness}%</strong>
                </div>

                <div
                  className="cp-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={completeness}
                  aria-label="Profile completeness"
                >
                  <span style={{ width: `${completeness}%` }} />
                </div>
              </div>

              <dl className="cp-meta">
                <div>
                  <dt>
                    <CalendarDays size={15} aria-hidden="true" />
                    Member since
                  </dt>
                  <dd>{memberSince}</dd>
                </div>

                <div>
                  <dt>
                    <ShieldCheck size={15} aria-hidden="true" />
                    Account role
                  </dt>
                  <dd>{roleLabel}</dd>
                </div>

                <div>
                  <dt>
                    <BadgeCheck size={15} aria-hidden="true" />
                    Email status
                  </dt>
                  <dd>{verified ? 'Verified' : 'Pending'}</dd>
                </div>
              </dl>

              <nav className="cp-quick-links" aria-label="Quick links">
                <Link to="/user/complaints">
                  <ClipboardList size={17} aria-hidden="true" />
                  My complaints
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>

                <Link to="/user/notifications">
                  <Bell size={17} aria-hidden="true" />
                  Notifications
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </nav>
            </div>
          </aside>

          {/* ---------------- Main column ---------------- */}
          <div className="cp-main">
            <div className="cp-stats">
              <StatCard
                icon={ClipboardList}
                tone="blue"
                label="Total complaints"
                value={statValue(stats.total)}
                detail="Submitted by you"
                loading={showSkeleton}
              />

              <StatCard
                icon={CheckCircle2}
                tone="green"
                label="Resolved"
                value={statValue(stats.resolved)}
                detail={
                  activity.failed
                    ? 'Unavailable right now'
                    : `${statValue(stats.open)} still open`
                }
                loading={showSkeleton}
              />

              <StatCard
                icon={Bell}
                tone="amber"
                label="Unread notifications"
                value={statValue(stats.unread)}
                detail="Updates waiting for you"
                loading={showSkeleton}
              />
            </div>

            <div className="cp-panel">
              <div
                className="cp-tabs"
                role="tablist"
                aria-label="Profile sections"
              >
                <button
                  type="button"
                  role="tab"
                  id="cp-tab-details"
                  aria-selected={activeTab === 'details'}
                  aria-controls="cp-panel-details"
                  className={activeTab === 'details' ? 'is-active' : ''}
                  onClick={() => setActiveTab('details')}
                >
                  <UserRound size={16} aria-hidden="true" />
                  Personal information
                </button>

                <button
                  type="button"
                  role="tab"
                  id="cp-tab-security"
                  aria-selected={activeTab === 'security'}
                  aria-controls="cp-panel-security"
                  className={activeTab === 'security' ? 'is-active' : ''}
                  onClick={() => setActiveTab('security')}
                >
                  <Lock size={16} aria-hidden="true" />
                  Account security
                </button>
              </div>

              {/* ---------- Personal information ---------- */}
              {activeTab === 'details' && (
                <div
                  className="cp-tab-panel"
                  role="tabpanel"
                  id="cp-panel-details"
                  aria-labelledby="cp-tab-details"
                >
                  <div className="cp-card-heading">
                    <div>
                      <h2>
                        {editing
                          ? 'Edit personal information'
                          : 'Personal information'}
                      </h2>

                      <p>
                        {editing
                          ? 'Update your account details below.'
                          : 'Details associated with your CivicFix account.'}
                      </p>
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        className="cp-edit-button"
                        onClick={startEditing}
                      >
                        <PencilLine size={16} aria-hidden="true" />
                        Edit profile
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <form
                      className="cp-edit-form"
                      onSubmit={handleSaveProfile}
                      noValidate
                    >
                      <div className="cp-form-grid">
                        <div className="cp-form-field">
                          <label htmlFor="cp-first-name">
                            First name
                          </label>

                          <input
                            id="cp-first-name"
                            name="first_name"
                            type="text"
                            value={formData.first_name}
                            onChange={handleFieldChange}
                            autoComplete="given-name"
                            maxLength={100}
                            required
                            aria-invalid={Boolean(
                              formErrors.first_name
                            )}
                            aria-describedby={
                              formErrors.first_name
                                ? 'cp-first-name-error'
                                : undefined
                            }
                          />

                          {formErrors.first_name && (
                            <span
                              className="cp-field-error"
                              id="cp-first-name-error"
                            >
                              <AlertCircle size={13} aria-hidden="true" />
                              {formErrors.first_name}
                            </span>
                          )}
                        </div>

                        <div className="cp-form-field">
                          <label htmlFor="cp-last-name">
                            Last name
                          </label>

                          <input
                            id="cp-last-name"
                            name="last_name"
                            type="text"
                            value={formData.last_name}
                            onChange={handleFieldChange}
                            autoComplete="family-name"
                            maxLength={100}
                            required
                            aria-invalid={Boolean(
                              formErrors.last_name
                            )}
                            aria-describedby={
                              formErrors.last_name
                                ? 'cp-last-name-error'
                                : undefined
                            }
                          />

                          {formErrors.last_name && (
                            <span
                              className="cp-field-error"
                              id="cp-last-name-error"
                            >
                              <AlertCircle size={13} aria-hidden="true" />
                              {formErrors.last_name}
                            </span>
                          )}
                        </div>

                        <div className="cp-form-field cp-form-field-full">
                          <label htmlFor="cp-email">
                            Email address
                          </label>

                          <input
                            id="cp-email"
                            type="email"
                            value={profile?.email || ''}
                            autoComplete="email"
                            readOnly
                            aria-readonly="true"
                          />

                          <span className="cp-field-hint">
                            Email is read-only to protect account
                            verification.
                          </span>
                        </div>

                        <ReadOnlyField
                          label="Account role"
                          value={roleLabel}
                          hint="Your account role cannot be changed here."
                        />

                        <ReadOnlyField
                          label="Member since"
                          value={memberSince}
                        />
                      </div>

                      <div className="cp-edit-notice">
                        <Info size={17} aria-hidden="true" />

                        <div>
                          <strong>Account security</strong>

                          <p>
                            Your role, email address, and verification
                            status cannot be changed from this form.
                          </p>
                        </div>
                      </div>

                      <div className="cp-edit-actions">
                        <button
                          type="button"
                          className="cp-cancel-button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          <X size={16} aria-hidden="true" />
                          Cancel
                        </button>

                        <button
                          type="submit"
                          className="cp-save-button"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <span className="cp-button-spinner" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={16} aria-hidden="true" />
                              Save changes
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="cp-details-grid">
                        <ProfileDetail
                          icon={UserRound}
                          label="First name"
                          value={profile?.first_name}
                        />

                        <ProfileDetail
                          icon={UserRound}
                          label="Last name"
                          value={profile?.last_name}
                        />

                        <ProfileDetail
                          icon={Mail}
                          label="Email address"
                          value={profile?.email}
                        />

                        <ProfileDetail
                          icon={ShieldCheck}
                          label="Account role"
                          value={roleLabel}
                        />

                        <ProfileDetail
                          icon={CalendarDays}
                          label="Member since"
                          value={memberSince}
                        />

                        <ProfileDetail
                          icon={BadgeCheck}
                          label="Email verification"
                          value={verified ? 'Verified' : 'Verification pending'}
                        />
                      </div>

                      <div className="cp-edit-notice">
                        <PencilLine size={17} aria-hidden="true" />

                        <div>
                          <strong>Keep your information up to date</strong>

                          <p>
                            Use Edit profile to update your name. Your
                            email, role, and verification status are
                            displayed for reference.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ---------- Account security ---------- */}
              {activeTab === 'security' && (
                <div
                  className="cp-tab-panel"
                  role="tabpanel"
                  id="cp-panel-security"
                  aria-labelledby="cp-tab-security"
                >
                  <div className="cp-card-heading">
                    <div>
                      <h2>Account security</h2>

                      <p>
                        Your profile information is loaded from your
                        authenticated CivicFix account.
                      </p>
                    </div>
                  </div>

                  <ul className="cp-security-list">
                    <li>
                      <span
                        className={`cp-security-icon ${
                          verified ? 'is-good' : 'is-warn'
                        }`}
                      >
                        <BadgeCheck size={20} aria-hidden="true" />
                      </span>

                      <div>
                        <strong>Email verification</strong>

                        <p>
                          {verified
                            ? 'Your email address has been verified.'
                            : 'Your email address is not verified yet. Check your inbox for the verification message.'}
                        </p>
                      </div>

                      <span
                        className={`cp-pill ${
                          verified ? 'is-good' : 'is-warn'
                        }`}
                      >
                        {verified ? 'Verified' : 'Pending'}
                      </span>
                    </li>

                    <li>
                      <span className="cp-security-icon is-good">
                        <ShieldCheck size={20} aria-hidden="true" />
                      </span>

                      <div>
                        <strong>Account role</strong>

                        <p>
                          This is a citizen account. The role is set by
                          the platform and cannot be changed here.
                        </p>
                      </div>

                      <span className="cp-pill">{roleLabel}</span>
                    </li>

                    <li>
                      <span className="cp-security-icon">
                        <Clock size={20} aria-hidden="true" />
                      </span>

                      <div>
                        <strong>Signed-in session</strong>

                        <p>
                          If your session expires, you will be asked to
                          sign in again before continuing.
                        </p>
                      </div>

                      <span className="cp-pill is-good">Active</span>
                    </li>
                  </ul>

                  <div className="cp-edit-notice">
                    <Lock size={17} aria-hidden="true" />

                    <div>
                      <strong>Keep your account safe</strong>

                      <p>
                        Do not share your password, and sign out when
                        you use a shared device.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="cp-page-footer">
              <span>© {new Date().getFullYear()} CivicFix</span>
              <span>Your account, your community.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}