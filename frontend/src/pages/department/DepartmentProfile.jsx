import { useCallback, useEffect, useState } from 'react';
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
  Menu,
  X,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Building2,
  Mail,
  Hash,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  XCircle,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './DepartmentProfile.css';


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


function displayName(profile) {
  const name = [
    profile?.first_name,
    profile?.last_name,
  ].filter(Boolean).join(' ').trim();

  return name || profile?.email?.split('@')[0] || 'Department Manager';
}


function InfoItem({ icon: Icon, label, value, wide = false }) {
  return (
    <div className={`dp-info-item ${wide ? 'dp-info-wide' : ''}`}>
      <span className="dp-info-icon">
        <Icon size={17} />
      </span>

      <div className="dp-info-copy">
        <span>{label}</span>
        <strong>{value || 'Not provided'}</strong>
      </div>
    </div>
  );
}


export default function DepartmentProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });


  // Authentication check
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


  // Load manager profile
  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const response = await api.get('/departments/my/profile/');

      setProfile(response.data);
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to load department profile.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    if (user) loadProfile();
  }, [user, loadProfile]);


  // Start editing
  const startEditing = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      phone_number: profile?.phone_number || '',
    });

    setError('');
    setSuccess('');
    setEditing(true);
  };


  // Cancel editing
  const cancelEditing = () => {
    setEditing(false);

    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      phone_number: profile?.phone_number || '',
    });
  };


  // Profile input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(previous => ({
      ...previous,
      [name]: value,
    }));
  };


  // Update manager profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim().toLowerCase();
    const phoneNumber = formData.phone_number.trim();

    if (!firstName || !lastName || !email || !phoneNumber) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch(
        '/departments/my/profile/',
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phoneNumber,
        }
      );

      const updatedProfile = response.data.profile;

      if (!updatedProfile) {
        throw new Error('Updated profile information was not returned.');
      }

      setProfile(updatedProfile);
      setEditing(false);

      // Synchronize local storage
      try {
        const storedUser = JSON.parse(
          localStorage.getItem('civicfix_user') || '{}'
        );

        localStorage.setItem(
          'civicfix_user',
          JSON.stringify({
            ...storedUser,
            first_name: updatedProfile.first_name,
            last_name: updatedProfile.last_name,
            email: updatedProfile.email,
            phone_number: updatedProfile.phone_number,
          })
        );
      } catch (storageError) {
        console.error('Unable to synchronize stored user:', storageError);
      }

      setSuccess(
        response.data.message || 'Profile updated successfully.'
      );

    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        err.message ||
        'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };


  // Password input changes
  const handlePasswordInput = (e) => {
    const { name, value } = e.target;

    setPasswordData(previous => ({
      ...previous,
      [name]: value,
    }));
  };


  // Change manager password
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const {
      current_password,
      new_password,
      confirm_password,
    } = passwordData;

    if (!current_password || !new_password || !confirm_password) {
      setError('Please fill in all password fields.');
      return;
    }

    if (new_password.length < 8) {
      setError('New password must contain at least 8 characters.');
      return;
    }

    if (new_password !== confirm_password) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await api.post(
        '/departments/my/change-password/',
        {
          current_password,
          new_password,
          confirm_password,
        }
      );

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      setChangingPassword(false);

      setSuccess(
        response.data.message || 'Password changed successfully.'
      );

    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to change your password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };


  // Password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(previous => ({
      ...previous,
      [field]: !previous[field],
    }));
  };


  // Logout
  const logout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');

    navigate('/department/login', { replace: true });
  };


  const managerName = displayName(profile || user);
  const departmentName = profile?.department_name || 'Department';
  const isActive = profile?.department_is_active;


  return (
    <div className="department-dashboard dp-page">

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
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = path === '/department/profile';

              return (
                <button
                  key={path}
                  className={`dd-nav-item ${active ? 'active' : ''}`}
                  onClick={() => {
                    navigate(path);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={19} />
                  <span>{label}</span>

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
              <ShieldCheck size={19} />
            </div>

            <strong>Department Portal</strong>
            <p>Manage civic services in one place.</p>
          </div>

          <button
            className="dd-logout-button"
            onClick={logout}
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
                Department Portal <span>›</span> Profile
              </div>

              <h1>Department Profile</h1>
            </div>
          </div>

          <div className="dd-header-right">
            <button
              className="dd-refresh-button"
              onClick={() => loadProfile(true)}
              disabled={refreshing || loading || editing}
              title="Refresh profile"
            >
              <RefreshCw
                size={17}
                className={refreshing ? 'dp-spin' : ''}
              />
            </button>

            <div className="dd-header-divider" />

            <div className="dd-user-info">
              <div className="dd-user-avatar">
                {managerName.charAt(0).toUpperCase()}
              </div>

              <div className="dd-user-details">
                <strong>{managerName}</strong>
                <span>Department Manager</span>
              </div>
            </div>
          </div>
        </header>


        {/* PAGE CONTENT */}
        <div className="dd-content dp-content">

          <section className="dp-hero">
            <div className="dp-hero-main">
              <span className="dp-eyebrow">
                ACCOUNT & ORGANIZATION
              </span>

              <h2>Department profile</h2>

              <p>
                Manage your manager account information and
                view the department assigned to your account.
              </p>
            </div>

            <div className="dp-hero-art">
              <Building2 size={39} />
            </div>
          </section>


          {/* ERROR */}
          {error && (
            <div className="dp-alert">
              <AlertCircle size={18} />
              <span>{error}</span>

              {!editing && !changingPassword && (
                <button
                  onClick={() => loadProfile()}
                  disabled={loading}
                >
                  Try again
                </button>
              )}
            </div>
          )}


          {/* SUCCESS */}
          {success && (
            <div className="dp-success-alert">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}


          {loading ? (
            <div className="dp-loading">
              <RefreshCw size={24} className="dp-spin" />
              <span>Loading your profile...</span>
            </div>
          ) : profile ? (
            <>

              {/* PROFILE BANNER */}
              <section className="dp-profile-banner">

                <div className="dp-profile-avatar">
                  {managerName.charAt(0).toUpperCase()}
                </div>

                <div className="dp-profile-identity">
                  <span className="dp-profile-label">
                    DEPARTMENT MANAGER
                  </span>

                  <h2>{managerName}</h2>
                  <p>{profile.email || 'Email not available'}</p>
                </div>

                <div className={`dp-account-status ${isActive ? 'active' : 'inactive'}`}>
                  <span />

                  {isActive === undefined
                    ? 'Status unavailable'
                    : isActive
                      ? 'Department active'
                      : 'Department inactive'}
                </div>
              </section>


              <div className="dp-grid">

                {/* MANAGER INFORMATION */}
                <section className="dp-card">

                  <div className="dp-card-heading dp-edit-heading">

                    <span className="dp-card-heading-icon">
                      <UserRound size={19} />
                    </span>

                    <div className="dp-card-heading-text">
                      <h3>Manager information</h3>
                      <p>Your registered account details</p>
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        className="dp-edit-button"
                        onClick={startEditing}
                      >
                        <Edit3 size={15} />
                        Edit Profile
                      </button>
                    )}
                  </div>


                  {editing ? (
                    <form
                      className="dp-edit-form"
                      onSubmit={handleProfileUpdate}
                    >

                      <div className="dp-form-group">
                        <label htmlFor="first_name">First Name</label>

                        <input
                          id="first_name"
                          name="first_name"
                          type="text"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          maxLength={100}
                          required
                        />
                      </div>

                      <div className="dp-form-group">
                        <label htmlFor="last_name">Last Name</label>

                        <input
                          id="last_name"
                          name="last_name"
                          type="text"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          maxLength={100}
                          required
                        />
                      </div>

                      <div className="dp-form-group dp-form-wide">
                        <label htmlFor="email">Email Address</label>

                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          maxLength={254}
                          required
                        />
                      </div>

                      {/* PHONE NUMBER */}
                      <div className="dp-form-group dp-form-wide">
                        <label htmlFor="phone_number">
                          Phone Number
                        </label>

                        <input
                          id="phone_number"
                          name="phone_number"
                          type="tel"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          maxLength={20}
                          autoComplete="tel"
                          required
                        />
                      </div>

                      <div className="dp-form-actions">
                        <button
                          type="button"
                          className="dp-cancel-button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          <XCircle size={16} />
                          Cancel
                        </button>

                        <button
                          type="submit"
                          className="dp-save-button"
                          disabled={saving}
                        >
                          {saving
                            ? <RefreshCw size={16} className="dp-spin" />
                            : <Save size={16} />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="dp-info-grid">

                      <InfoItem
                        icon={UserRound}
                        label="First Name"
                        value={profile.first_name}
                      />

                      <InfoItem
                        icon={UserRound}
                        label="Last Name"
                        value={profile.last_name}
                      />

                      <InfoItem
                        icon={Mail}
                        label="Email Address"
                        value={profile.email}
                        wide
                      />

                      <InfoItem
                        icon={Phone}
                        label="Phone Number"
                        value={profile.phone_number}
                        wide
                      />

                    </div>
                  )}

                </section>


                {/* DEPARTMENT INFORMATION */}
                <section className="dp-card">

                  <div className="dp-card-heading">
                    <span className="dp-card-heading-icon department">
                      <Building2 size={19} />
                    </span>

                    <div>
                      <h3>Department information</h3>
                      <p>Department linked to your manager account</p>
                    </div>
                  </div>

                  <div className="dp-department-highlight">
                    <div className="dp-department-symbol">
                      <Building2 size={25} />
                    </div>

                    <div>
                      <span>ASSIGNED DEPARTMENT</span>
                      <strong>{departmentName}</strong>
                    </div>
                  </div>

                  <div className="dp-info-grid">
                    <InfoItem
                      icon={Building2}
                      label="Department name"
                      value={profile.department_name}
                      wide
                    />

                    <InfoItem
                      icon={Hash}
                      label="Department code"
                      value={profile.department_code}
                    />

                    <InfoItem
                      icon={BadgeCheck}
                      label="Department ID"
                      value={profile.department}
                    />

                    <InfoItem
                      icon={CheckCircle2}
                      label="Department status"
                      value={
                        isActive === undefined
                          ? 'Not available'
                          : isActive
                            ? 'Active'
                            : 'Inactive'
                      }
                    />
                  </div>

                </section>

              </div>


              {/* CHANGE PASSWORD SECTION */}
              <section className="dp-card dp-password-card">

                <div className="dp-card-heading dp-edit-heading">

                  <span className="dp-card-heading-icon">
                    <LockKeyhole size={19} />
                  </span>

                  <div className="dp-card-heading-text">
                    <h3>Security & Password</h3>
                    <p>Manage your account password securely</p>
                  </div>

                  {!changingPassword && (
                    <button
                      type="button"
                      className="dp-edit-button"
                      onClick={() => {
                        setError('');
                        setSuccess('');
                        setChangingPassword(true);
                      }}
                    >
                      <LockKeyhole size={15} />
                      Change Password
                    </button>
                  )}

                </div>


                {changingPassword ? (
                  <form
                    className="dp-edit-form dp-password-form"
                    onSubmit={handlePasswordChange}
                  >

                    <div className="dp-form-group dp-form-wide">
                      <label htmlFor="current_password">
                        Current Password
                      </label>

                      <div className="dp-password-input">
                        <input
                          id="current_password"
                          name="current_password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={handlePasswordInput}
                          autoComplete="current-password"
                          placeholder="Enter current password"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          aria-label="Toggle current password visibility"
                        >
                          {showPasswords.current
                            ? <EyeOff size={17} />
                            : <Eye size={17} />}
                        </button>
                      </div>
                    </div>


                    <div className="dp-form-group">
                      <label htmlFor="new_password">
                        New Password
                      </label>

                      <div className="dp-password-input">
                        <input
                          id="new_password"
                          name="new_password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.new_password}
                          onChange={handlePasswordInput}
                          autoComplete="new-password"
                          placeholder="Enter new password"
                          minLength={8}
                          required
                        />

                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          aria-label="Toggle new password visibility"
                        >
                          {showPasswords.new
                            ? <EyeOff size={17} />
                            : <Eye size={17} />}
                        </button>
                      </div>
                    </div>


                    <div className="dp-form-group">
                      <label htmlFor="confirm_password">
                        Confirm New Password
                      </label>

                      <div className="dp-password-input">
                        <input
                          id="confirm_password"
                          name="confirm_password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirm_password}
                          onChange={handlePasswordInput}
                          autoComplete="new-password"
                          placeholder="Confirm new password"
                          minLength={8}
                          required
                        />

                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          aria-label="Toggle confirm password visibility"
                        >
                          {showPasswords.confirm
                            ? <EyeOff size={17} />
                            : <Eye size={17} />}
                        </button>
                      </div>
                    </div>


                    <div className="dp-form-actions">

                      <button
                        type="button"
                        className="dp-cancel-button"
                        disabled={passwordSaving}
                        onClick={() => {
                          setChangingPassword(false);
                          setPasswordData({
                            current_password: '',
                            new_password: '',
                            confirm_password: '',
                          });
                        }}
                      >
                        <XCircle size={16} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="dp-save-button"
                        disabled={passwordSaving}
                      >
                        {passwordSaving
                          ? <RefreshCw size={16} className="dp-spin" />
                          : <LockKeyhole size={16} />}
                        Update Password
                      </button>

                    </div>

                  </form>
                ) : (
                  <div className="dp-password-summary">
                    <div className="dp-password-summary-icon">
                      <LockKeyhole size={20} />
                    </div>

                    <div>
                      <strong>Password protected</strong>
                      <p>
                        Your password is securely stored.
                        Use Change Password to update it.
                      </p>
                    </div>
                  </div>
                )}

              </section>


              <section className="dp-note">
                <ShieldCheck size={19} />

                <div>
                  <strong>Profile information</strong>
                  <p>
                    You can update your personal account information.
                    Department details are managed separately and cannot
                    be edited from this page.
                  </p>
                </div>
              </section>

            </>
          ) : !error ? (
            <div className="dp-empty">
              <UserRound size={28} />
              <strong>Profile information unavailable</strong>
              <p>No profile data was returned for this account.</p>
            </div>
          ) : null}

          <footer className="dd-footer">
            <span>© {new Date().getFullYear()} CivicFix</span>
            <span>Department Management Portal</span>
          </footer>

        </div>
      </main>
    </div>
  );
}