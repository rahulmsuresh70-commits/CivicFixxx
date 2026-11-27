import React, { useCallback, useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/axios';
import './StaffProfile.css';

const getValue = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== ''
  ) ?? null;

const getObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

const getInitials = (name) => {
  if (!name) return 'ST';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('civicfix_user');
    return storedUser ? JSON.parse(storedUser) : {};
  } catch (error) {
    console.error('Unable to read stored user:', error);
    return {};
  }
};

const displayValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'Not available';
  }

  return value;
};

const formatDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function InfoItem({ label, value, icon }) {
  return (
    <div className="staff-profile-info-item">
      <span className="staff-profile-info-label">{label}</span>

      <strong className="staff-profile-info-value">
        {icon && <i className={icon}></i>}
        {displayValue(value)}
      </strong>
    </div>
  );
}

function InfoSection({ id, title, icon, children }) {
  return (
    <section className="staff-profile-info-card" id={id}>
      <div className="staff-profile-card-heading">
        <div className="staff-profile-heading-icon">
          <i className={icon}></i>
        </div>

        <h3>{title}</h3>
      </div>

      <div className="staff-profile-info-grid">{children}</div>
    </section>
  );
}

function StaffProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await api.get('/departments/my/profile/');
      const responseData = response.data;

      console.log('STAFF PROFILE API RESPONSE:', responseData);

      const data =
        Object.keys(getObject(responseData?.profile)).length > 0
          ? responseData.profile
          : Object.keys(getObject(responseData?.staff)).length > 0
            ? responseData.staff
            : Object.keys(getObject(responseData?.data)).length > 0
              ? responseData.data
              : responseData;

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('The profile response is not in the expected format.');
      }

      setProfile(data);
    } catch (err) {
      console.error('Staff profile loading error:', err);

      setError(
        getApiErrorMessage
          ? getApiErrorMessage(err)
          : err.response?.data?.detail ||
              err.response?.data?.message ||
              err.message ||
              'Unable to load your profile.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const storedUser = getStoredUser();

  const nestedUser = getObject(profile?.user);
  const nestedStaff = getObject(profile?.staff);
  const department = getObject(profile?.department);

  const user = {
    ...storedUser,
    ...nestedStaff,
    ...nestedUser,
    ...profile,
  };

  const firstName = getValue(
    nestedUser.first_name,
    nestedStaff.first_name,
    profile?.first_name,
    storedUser.first_name
  );

  const lastName = getValue(
    nestedUser.last_name,
    nestedStaff.last_name,
    profile?.last_name,
    storedUser.last_name
  );

  const fullName =
    getValue(
      nestedUser.full_name,
      nestedUser.name,
      nestedStaff.full_name,
      nestedStaff.name,
      profile?.full_name,
      profile?.name,
      storedUser.full_name,
      storedUser.name
    ) ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    'Staff Member';

  const email = getValue(
    nestedUser.email,
    nestedStaff.email,
    profile?.email,
    storedUser.email
  );

  const phone = getValue(
    nestedUser.phone_number,
    nestedUser.phone,
    nestedStaff.phone_number,
    nestedStaff.phone,
    profile?.phone_number,
    profile?.phone,
    storedUser.phone_number,
    storedUser.phone
  );

  const departmentName = getValue(
    department.name,
    department.department_name,
    profile?.department_name,
    nestedStaff.department_name,
    storedUser.department_name
  );

  const departmentCode = getValue(
    department.code,
    department.department_code,
    profile?.department_code,
    storedUser.department_code
  );

  const role = getValue(
    nestedUser.role,
    nestedStaff.role,
    profile?.role,
    storedUser.role,
    'Staff'
  );

  const staffId = getValue(
    profile?.staff_id,
    profile?.employee_id,
    nestedStaff.staff_id,
    nestedStaff.employee_id,
    profile?.id
  );

  const isActive = getValue(
    nestedUser.is_active,
    nestedStaff.is_active,
    profile?.is_active,
    storedUser.is_active
  );

  const isVerified = getValue(
    nestedUser.is_verified,
    nestedStaff.is_verified,
    profile?.is_verified,
    storedUser.is_verified
  );

  const joinedDate = getValue(
    nestedUser.date_joined,
    nestedUser.created_at,
    nestedStaff.date_joined,
    nestedStaff.created_at,
    profile?.date_joined,
    profile?.created_at,
    storedUser.date_joined
  );

  // Optional fields: displayed only when supplied by existing data.
  const designation = getValue(
    profile?.designation,
    profile?.position,
    profile?.job_title,
    nestedStaff.designation,
    nestedStaff.position,
    storedUser.designation
  );

  const manager = getObject(
    profile?.manager || profile?.assigned_manager || nestedStaff.manager
  );

  const managerName = getValue(
    manager.full_name,
    manager.name,
    [manager.first_name, manager.last_name].filter(Boolean).join(' '),
    profile?.manager_name,
    profile?.assigned_manager_name
  );

  const state = getValue(
    profile?.state,
    nestedStaff.state,
    storedUser.state
  );

  const district = getValue(
    profile?.district,
    nestedStaff.district,
    storedUser.district
  );

  const address = getValue(
    profile?.address,
    nestedStaff.address,
    storedUser.address
  );

  const profileImage = getValue(
    user.profile_image,
    user.profile_picture,
    user.avatar,
    user.photo,
    user.image
  );

  const formattedRole = String(role).replaceAll('_', ' ');

  if (loading) {
    return (
      <div className="staff-profile-page">
        <div className="staff-profile-loading">
          <span className="staff-profile-spinner"></span>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="staff-profile-page">
        <div className="staff-profile-error">
          <i className="fa-solid fa-circle-exclamation"></i>

          <h3>Unable to load profile</h3>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => fetchProfile()}
            className="staff-profile-retry"
          >
            <i className="fa-solid fa-rotate-right"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-profile-page">

      {/* PAGE HEADER */}
      <div className="staff-profile-page-header">
        <div className="staff-profile-breadcrumb">
          <i className="fa-solid fa-house"></i>
          <span>/</span>
          <span>Profile</span>
        </div>

        <div className="staff-profile-title-row">
          <div>
            <h1>My Profile</h1>
            <p>
              View your personal and professional details.
            </p>
          </div>

          <button
            type="button"
            className="staff-profile-refresh"
            onClick={() => fetchProfile(true)}
            disabled={refreshing}
          >
            <i
              className={`fa-solid fa-rotate-right ${
                refreshing ? 'staff-profile-rotating' : ''
              }`}
            ></i>

            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && profile && (
        <div className="staff-profile-inline-error">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
        </div>
      )}

      {/* MAIN PROFILE LAYOUT */}
      <div className="staff-profile-layout">

        {/* LEFT PROFILE CARD */}
        <aside className="staff-profile-sidebar-card">

          <div className="staff-profile-avatar-wrapper">
            {profileImage ? (
              <img
                src={profileImage}
                alt={fullName}
                className="staff-profile-avatar-image"
              />
            ) : (
              <div className="staff-profile-avatar">
                {getInitials(fullName)}
              </div>
            )}
          </div>

          <h2>{fullName}</h2>

          <span className="staff-profile-role-badge">
            {formattedRole}
          </span>

          <div
            className={`staff-profile-active-badge ${
              isActive === false ? 'inactive' : ''
            }`}
          >
            <span></span>
            {isActive === null
              ? 'Status unavailable'
              : isActive
                ? 'Active'
                : 'Inactive'}
          </div>

          <div className="staff-profile-sidebar-divider"></div>

          <div className="staff-profile-sidebar-details">

            <div className="staff-profile-sidebar-item">
              <div className="staff-profile-sidebar-icon">
                <i className="fa-regular fa-id-card"></i>
              </div>

              <div>
                <span>Staff ID</span>
                <strong>{displayValue(staffId)}</strong>
              </div>
            </div>

            <div className="staff-profile-sidebar-item">
              <div className="staff-profile-sidebar-icon">
                <i className="fa-solid fa-building"></i>
              </div>

              <div>
                <span>Department</span>
                <strong>{displayValue(departmentName)}</strong>
              </div>
            </div>

            <div className="staff-profile-sidebar-item">
              <div className="staff-profile-sidebar-icon">
                <i className="fa-regular fa-calendar"></i>
              </div>

              <div>
                <span>Joined On</span>
                <strong>{formatDate(joinedDate)}</strong>
              </div>
            </div>

          </div>
        </aside>

        {/* RIGHT PROFILE CONTENT */}
        <main className="staff-profile-content">

          {/* PROFILE TABS */}
          <div className="staff-profile-tabs">
            <button
              type="button"
              className="staff-profile-tab active"
            >
              <i className="fa-regular fa-user"></i>
              Profile Information
            </button>

            <span className="staff-profile-tab-static">
              <i className="fa-solid fa-shield-halved"></i>
              Account Security
            </span>

            <span className="staff-profile-tab-static">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Activity
            </span>
          </div>

          {/* PERSONAL INFORMATION */}
          <InfoSection
            id="staff-personal-information"
            title="Personal Information"
            icon="fa-regular fa-user"
          >
            <InfoItem
              label="First Name"
              value={firstName}
            />

            <InfoItem
              label="Last Name"
              value={lastName}
            />

            <InfoItem
              label="Email Address"
              value={email}
              icon="fa-regular fa-envelope"
            />

            <InfoItem
              label="Phone Number"
              value={phone}
              icon="fa-solid fa-phone"
            />
          </InfoSection>

          {/* PROFESSIONAL INFORMATION */}
          <InfoSection
            id="staff-professional-information"
            title="Professional Information"
            icon="fa-solid fa-briefcase"
          >
            <InfoItem
              label="Staff ID"
              value={staffId}
            />

            <InfoItem
              label="Department"
              value={departmentName}
            />

            <InfoItem
              label="Designation"
              value={designation || formattedRole}
            />

            <InfoItem
              label="Assigned Manager"
              value={managerName}
            />
          </InfoSection>

          {/* ADDRESS INFORMATION */}
          <InfoSection
            id="staff-address-information"
            title="Address Information"
            icon="fa-solid fa-location-dot"
          >
            <InfoItem
              label="State"
              value={state}
            />

            <InfoItem
              label="District"
              value={district}
            />

            <InfoItem
              label="Address"
              value={address}
              icon="fa-solid fa-house"
            />
          </InfoSection>

          {/* ACCOUNT INFORMATION */}
          <InfoSection
            id="staff-account-information"
            title="Account Information"
            icon="fa-solid fa-shield-halved"
          >
            <InfoItem
              label="Account Status"
              value={
                isActive === null
                  ? 'Not available'
                  : isActive
                    ? 'Active'
                    : 'Inactive'
              }
            />

            <InfoItem
              label="Email Verification"
              value={
                isVerified === null
                  ? 'Not available'
                  : isVerified
                    ? 'Verified'
                    : 'Not Verified'
              }
            />

            <InfoItem
              label="Date Joined"
              value={formatDate(joinedDate)}
            />

            <InfoItem
              label="Department Code"
              value={departmentCode}
            />
          </InfoSection>

          {/* INFORMATION NOTICE */}
          <div className="staff-profile-notice">
            <div className="staff-profile-notice-icon">
              <i className="fa-solid fa-circle-info"></i>
            </div>

            <div>
              <h4>Need to update your information?</h4>

              <p>
                Contact your department manager if your personal
                or professional information needs to be corrected.
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

export default StaffProfile;