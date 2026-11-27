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
  UserPlus,
  UserRound,
  Phone,
  MapPin,
  Mail,
  CalendarDays,
  Trash2,
  Eye,
  Pencil,
  UsersRound,
  CheckCircle2,
  AlertCircle,
  Filter,
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  EyeOff,
  UserCheck,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';

import './DepartmentStaff.css';


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
  { label: 'Staff Work Tracking', icon: Users, path: '/department/staff-work-tracking' },
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


const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  location: '',
  password: '',
  password_confirm: '',
};


function getRows(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.staff)) {
    return data.staff;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}


function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}


function getStaffName(staff) {
  if (staff.first_name || staff.last_name) {
    return `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  }

  if (staff.name) {
    return staff.name;
  }

  return `Staff Member #${staff.user || staff.id}`;
}


function getInitials(staff) {
  const name = getStaffName(staff);

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


function getErrorMessage(error) {
  const message = getApiErrorMessage(error);

  if (message) return message;

  return 'Something went wrong. Please try again.';
}


export default function DepartmentStaff() {
  const navigate = useNavigate();


  // Authentication
  const [user, setUser] = useState(null);


  // Staff data
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);


  // Messages
  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');


  // Search and filtering
  const [search, setSearch] = useState('');

  const [locationFilter, setLocationFilter] = useState('all');


  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState('');


  // Staff details modal
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Edit staff profile
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    location: '',
  });
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);


  // Delete
  const [deletingId, setDeletingId] = useState(null);


  // ==========================================
  // AUTHENTICATION CHECK
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
  // FETCH DEPARTMENT STAFF
  // ==========================================

  const fetchStaff = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get(
        '/departments/my/staff/'
      );

      setStaff(getRows(response.data));

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      setLoading(false);

      setRefreshing(false);
    }

  }, []);


  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user, fetchStaff]);


  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = () => {
    fetchStaff(true);
  };


  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((person) => {
      const matchesLocation =
        locationFilter === 'all' ||
        person.location === locationFilter;

      const searchableText = [
        person.id,
        person.user,
        person.phone_number,
        person.location,
        person.first_name,
        person.last_name,
        person.email,
        person.name,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return matchesLocation && matchesSearch;
    });

  }, [staff, search, locationFilter]);


  const locations = useMemo(() => {
    return [
      ...new Set(
        staff
          .map((person) => person.location)
          .filter(Boolean)
      ),
    ].sort();

  }, [staff]);


  // ==========================================
  // STATISTICS
  // ==========================================

  const statistics = useMemo(() => {
    return {
      total: staff.length,

      withPhone: staff.filter(
        (person) => person.phone_number
      ).length,

      withLocation: staff.filter(
        (person) => person.location
      ).length,

      recent: staff.filter((person) => {
        if (!person.created_at) return false;

        const created = new Date(person.created_at);

        if (Number.isNaN(created.getTime())) {
          return false;
        }

        const days =
          (Date.now() - created.getTime()) /
          (1000 * 60 * 60 * 24);

        return days <= 30;
      }).length,
    };

  }, [staff]);


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
  // FORM HANDLING
  // ==========================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const openAddModal = () => {
    setForm(INITIAL_FORM);

    setFormError('');

    setShowPassword(false);

    setShowConfirmPassword(false);

    setShowAddModal(true);
  };


  const closeAddModal = () => {
    if (submitting) return;

    setShowAddModal(false);

    setFormError('');

    setForm(INITIAL_FORM);
  };


  // ==========================================
  // CREATE STAFF
  // ==========================================

  const handleCreateStaff = async (event) => {
    event.preventDefault();

    setFormError('');

    const payload = {
      first_name: form.first_name.trim(),

      last_name: form.last_name.trim(),

      email: form.email.trim().toLowerCase(),

      phone_number: form.phone_number.trim(),

      location: form.location.trim(),

      password: form.password,

      password_confirm: form.password_confirm,
    };


    if (
      !payload.first_name ||
      !payload.last_name ||
      !payload.email ||
      !payload.phone_number ||
      !payload.location ||
      !payload.password ||
      !payload.password_confirm
    ) {
      setFormError('Please complete all required fields.');

      return;
    }


    if (payload.password.length < 8) {
      setFormError(
        'Password must contain at least 8 characters.'
      );

      return;
    }


    if (payload.password !== payload.password_confirm) {
      setFormError('Passwords do not match.');

      return;
    }


    setSubmitting(true);

    try {
      const response = await api.post(
        '/departments/my/staff/',
        payload
      );

      setNotice(
        response.data?.message ||
        'Staff account created and assigned successfully.'
      );

      setShowAddModal(false);

      setForm(INITIAL_FORM);

      await fetchStaff(true);

    } catch (err) {
      setFormError(getErrorMessage(err));

    } finally {
      setSubmitting(false);
    }
  };


  // ==========================================
  // EDIT STAFF PROFILE
  // ==========================================

  const openEditModal = (person) => {
    setEditingStaff(person);
    setEditForm({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      email: person.email || '',
      phone_number: person.phone_number || '',
      location: person.location || '',
    });
    setEditError('');
    setSelectedStaff(null);
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditingStaff(null);
    setEditError('');
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditError('');
  };

  const handleUpdateStaff = async (event) => {
    event.preventDefault();
    if (!editingStaff?.user) {
      setEditError('Staff user ID is missing. Cannot update this profile.');
      return;
    }

    const payload = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone_number: editForm.phone_number.trim(),
      location: editForm.location.trim(),
    };

    if (Object.values(payload).some((value) => !value)) {
      setEditError('Please complete all profile fields.');
      return;
    }

    setUpdating(true);
    setEditError('');
    setError('');
    setNotice('');

    try {
      const response = await api.patch(
        `/departments/my/staff/${editingStaff.user}/`,
        payload
      );

      setNotice(
        response.data?.message || 'Staff profile updated successfully.'
      );
      setEditingStaff(null);
      await fetchStaff(true);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };


  // ==========================================
  // REMOVE STAFF FROM DEPARTMENT
  // ==========================================

  const handleRemoveStaff = async (person) => {
    const userId = person.user;

    if (!userId) {
      setError(
        'The staff user ID is missing. Cannot remove this staff member.'
      );

      return;
    }

    const confirmed = window.confirm(
      `Remove Staff Member #${userId} from your department?`
    );

    if (!confirmed) return;


    setDeletingId(userId);

    setError('');

    setNotice('');

    try {
      const response = await api.delete(
        `/departments/my/staff/${userId}/`
      );

      setNotice(
        response.data?.message ||
        'Staff member removed from your department.'
      );

      setSelectedStaff(null);

      await fetchStaff(true);

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      setDeletingId(null);
    }
  };


  // ==========================================
  // MANAGER DETAILS
  // ==========================================

  const managerName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : 'Department Manager';


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="department-dashboard ds-page">

      {/* MOBILE SIDEBAR OVERLAY */}

      {sidebarOpen && (
        <div
          className="dd-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}


      {/* ======================================
          SIDEBAR
      ====================================== */}

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
                item.path === '/department/staff';

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
              <ShieldCheck size={19} />
            </div>

            <strong>Department Portal</strong>

            <p>
              Manage civic services in one place.
            </p>

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


      {/* ======================================
          MAIN CONTENT
      ====================================== */}

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

                Staff Management
              </div>

              <h1>Staff Management</h1>

            </div>

          </div>


          <div className="dd-header-right">

            <button
              className="dd-refresh-button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh staff"
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

                <strong>
                  {managerName || 'Manager'}
                </strong>

                <span>Department Manager</span>

              </div>

            </div>

          </div>

        </header>


        {/* PAGE CONTENT */}

        <div className="dd-content ds-content">


          {/* ======================================
              INTRODUCTION
          ====================================== */}

          <section className="ds-page-intro">

            <div>

              <span className="ds-eyebrow">
                DEPARTMENT WORKSPACE
              </span>

              <h2>Manage your department team</h2>

              <p>
                Create staff accounts, view team information
                and manage department staff members.
              </p>

            </div>


            <div className="ds-intro-actions">

              <div className="ds-intro-icon">
                <UsersRound size={35} />
              </div>

              <button
                className="ds-add-button"
                onClick={openAddModal}
              >
                <UserPlus size={17} />

                Add Staff
              </button>

            </div>

          </section>


          {/* ======================================
              NOTIFICATIONS
          ====================================== */}

          {error && (
            <div className="ds-alert ds-alert-error">

              <AlertCircle size={18} />

              <span>{error}</span>

              <button
                onClick={() => setError('')}
                aria-label="Dismiss"
              >
                ×
              </button>

            </div>
          )}


          {notice && (
            <div className="ds-alert ds-alert-success">

              <CheckCircle2 size={18} />

              <span>{notice}</span>

              <button
                onClick={() => setNotice('')}
                aria-label="Dismiss"
              >
                ×
              </button>

            </div>
          )}


          {/* ======================================
              STATISTICS
          ====================================== */}

          <section className="ds-stats-grid">

            <StatCard
              icon={UsersRound}
              label="Total staff"
              value={statistics.total}
              color="blue"
            />

            <StatCard
              icon={Phone}
              label="Contact details available"
              value={statistics.withPhone}
              color="green"
            />

            <StatCard
              icon={MapPin}
              label="Location records"
              value={statistics.withLocation}
              color="orange"
            />

            <StatCard
              icon={UserCheck}
              label="Added in last 30 days"
              value={statistics.recent}
              color="purple"
            />

          </section>


          {/* ======================================
              STAFF LIST
          ====================================== */}

          <section className="dd-panel ds-staff-panel">

            <div className="ds-section-heading">

              <div>

                <h3>Department team</h3>

                <p>
                  Staff members assigned to your department.
                </p>

              </div>


              <span className="ds-count-badge">
                {staff.length} Staff Members
              </span>

            </div>


            {/* SEARCH */}

            <div className="ds-toolbar">

              <label className="ds-search">

                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search by staff ID, phone or location..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}

              </label>


              <label className="ds-filter">

                <Filter size={16} />

                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                >

                  <option value="all">
                    All locations
                  </option>

                  {locations.map((location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ))}

                </select>

              </label>

            </div>


            {/* STAFF TABLE */}

            <div className="dd-table-wrapper">

              <table className="dd-table ds-table">

                <thead>

                  <tr>
                    <th>Staff member</th>

                    <th>Phone number</th>

                    <th>Location</th>

                    <th>Joined date</th>

                    <th>Actions</th>
                  </tr>

                </thead>


                <tbody>

                  {loading ? (

                    <tr>
                      <td colSpan="5" className="dd-empty-state">
                        Loading department staff...
                      </td>
                    </tr>

                  ) : filteredStaff.length === 0 ? (

                    <tr>

                      <td colSpan="5" className="dd-empty-state">

                        <div className="ds-empty">

                          <Users size={32} />

                          <strong>
                            {staff.length === 0
                              ? 'No staff members yet'
                              : 'No matching staff found'}
                          </strong>

                          <span>
                            {staff.length === 0
                              ? 'Add your first staff member to get started.'
                              : 'Try changing your search or filter.'}
                          </span>

                          {staff.length === 0 && (
                            <button
                              className="ds-empty-add"
                              onClick={openAddModal}
                            >
                              <UserPlus size={15} />

                              Add Staff
                            </button>
                          )}

                        </div>

                      </td>

                    </tr>

                  ) : (

                    filteredStaff.map((person) => (

                      <tr key={person.id}>

                        <td>

                          <div className="ds-staff-identity">

                            <div className="ds-staff-avatar">
                              {getInitials(person)}
                            </div>

                            <div>

                              <strong>
                                {getStaffName(person)}
                              </strong>

                              <span>
                                Profile ID: {person.id}
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <span className="ds-table-contact">
                            <Phone size={14} />

                            {person.phone_number || 'Not provided'}
                          </span>

                        </td>


                        <td>

                          <span className="ds-table-location">
                            <MapPin size={14} />

                            {person.location || 'Not provided'}
                          </span>

                        </td>


                        <td>
                          {formatDate(person.created_at)}
                        </td>


                        <td>

                          <div className="ds-row-actions">

                            <button
                              className="ds-action-view"
                              onClick={() => setSelectedStaff(person)}
                              title="View staff details"
                            >
                              <Eye size={15} />
                            </button>


                            <button
                              className="ds-action-edit"
                              onClick={() => openEditModal(person)}
                              title="Edit staff profile"
                            >
                              <Pencil size={15} />
                            </button>


                            <button
                              className="ds-action-delete"
                              onClick={() => handleRemoveStaff(person)}
                              disabled={deletingId === person.user}
                              title="Remove staff from department"
                            >
                              {deletingId === person.user
                                ? <RefreshCw size={15} className="ds-spin" />
                                : <Trash2 size={15} />
                              }
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>


            <div className="ds-table-footer">

              <span>
                Showing {filteredStaff.length} of {staff.length} staff members
              </span>

              <button
                onClick={() => {
                  setSearch('');

                  setLocationFilter('all');
                }}
              >
                Clear filters
              </button>

            </div>

          </section>


          {/* FOOTER */}

          <footer className="dd-footer">

            <span>
              © {new Date().getFullYear()} CivicFix
            </span>

            <span>
              Department Management Portal
            </span>

          </footer>

        </div>

      </main>


      {/* ======================================
          ADD STAFF MODAL
      ====================================== */}

      {showAddModal && (

        <div
          className="ds-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddModal();
            }
          }}
        >

          <section
            className="ds-modal ds-add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ds-add-title"
          >

            <div className="ds-modal-header">

              <div className="ds-modal-title-icon">
                <UserPlus size={21} />
              </div>

              <div>

                <h2 id="ds-add-title">
                  Add Department Staff
                </h2>

                <p>
                  Create a new staff account for your department.
                </p>

              </div>


              <button
                className="ds-modal-close"
                onClick={closeAddModal}
                disabled={submitting}
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="ds-form"
              onSubmit={handleCreateStaff}
            >

              <div className="ds-form-section">

                <h4>
                  <UserRound size={16} />

                  Personal information
                </h4>


                <div className="ds-form-grid">

                  <FormField
                    label="First name"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleFormChange}
                    placeholder="Enter first name"
                    required
                  />


                  <FormField
                    label="Last name"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleFormChange}
                    placeholder="Enter last name"
                    required
                  />


                  <FormField
                    label="Email address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="staff@example.com"
                    icon={Mail}
                    required
                  />


                  <FormField
                    label="Phone number"
                    name="phone_number"
                    type="tel"
                    value={form.phone_number}
                    onChange={handleFormChange}
                    placeholder="Enter phone number"
                    icon={Phone}
                    required
                  />

                </div>


                <FormField
                  label="Staff location"
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="Enter assigned work location"
                  icon={MapPin}
                  required
                />

              </div>


              <div className="ds-form-section">

                <h4>
                  <LockKeyhole size={16} />

                  Account security
                </h4>


                <div className="ds-form-grid">

                  <div className="ds-form-field">

                    <label>
                      Password <span>*</span>
                    </label>

                    <div className="ds-password-input">

                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleFormChange}
                        placeholder="Minimum 8 characters"
                        minLength="8"
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword
                          ? <EyeOff size={17} />
                          : <Eye size={17} />
                        }
                      </button>

                    </div>

                  </div>


                  <div className="ds-form-field">

                    <label>
                      Confirm password <span>*</span>
                    </label>

                    <div className="ds-password-input">

                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirm"
                        value={form.password_confirm}
                        onChange={handleFormChange}
                        placeholder="Confirm password"
                        minLength="8"
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword
                          ? <EyeOff size={17} />
                          : <Eye size={17} />
                        }
                      </button>

                    </div>

                  </div>

                </div>

                <p className="ds-security-note">
                  Staff accounts are created as verified and active
                  according to your existing backend implementation.
                </p>

              </div>


              {formError && (

                <div className="ds-form-error">

                  <AlertCircle size={17} />

                  <span>{formError}</span>

                </div>

              )}


              <div className="ds-form-footer">

                <button
                  type="button"
                  className="ds-cancel-button"
                  onClick={closeAddModal}
                  disabled={submitting}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="ds-submit-button"
                  disabled={submitting}
                >

                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="ds-spin" />

                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />

                      Create Staff Account
                    </>
                  )}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}


      {/* ======================================
          EDIT STAFF MODAL
      ====================================== */}

      {editingStaff && (
        <div
          className="ds-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <section
            className="ds-modal ds-add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ds-edit-title"
          >
            <div className="ds-modal-header">
              <div className="ds-modal-title-icon">
                <Pencil size={21} />
              </div>
              <div>
                <h2 id="ds-edit-title">Edit Staff Profile</h2>
                <p>Update this staff member's personal and contact information.</p>
              </div>
              <button
                className="ds-modal-close"
                onClick={closeEditModal}
                disabled={updating}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form className="ds-form" onSubmit={handleUpdateStaff}>
              <div className="ds-form-section">
                <h4><UserRound size={16} /> Personal information</h4>
                <div className="ds-form-grid">
                  <FormField
                    label="First name"
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleEditFormChange}
                    placeholder="Enter first name"
                    required
                  />
                  <FormField
                    label="Last name"
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleEditFormChange}
                    placeholder="Enter last name"
                    required
                  />
                  <FormField
                    label="Email address"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditFormChange}
                    placeholder="staff@example.com"
                    icon={Mail}
                    required
                  />
                  <FormField
                    label="Phone number"
                    name="phone_number"
                    type="tel"
                    value={editForm.phone_number}
                    onChange={handleEditFormChange}
                    placeholder="Enter phone number"
                    icon={Phone}
                    required
                  />
                </div>
                <FormField
                  label="Staff location"
                  name="location"
                  value={editForm.location}
                  onChange={handleEditFormChange}
                  placeholder="Enter assigned work location"
                  icon={MapPin}
                  required
                />
              </div>

              <p className="ds-security-note">
                Password, department assignment and account status are not changed by profile editing.
              </p>

              {editError && (
                <div className="ds-form-error">
                  <AlertCircle size={17} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="ds-form-footer">
                <button
                  type="button"
                  className="ds-cancel-button"
                  onClick={closeEditModal}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ds-submit-button"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <RefreshCw size={16} className="ds-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}


      {/* ======================================
          STAFF DETAILS MODAL
      ====================================== */}

      {selectedStaff && (

        <div
          className="ds-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStaff(null);
            }
          }}
        >

          <section
            className="ds-modal ds-details-modal"
            role="dialog"
            aria-modal="true"
          >

            <div className="ds-modal-header">

              <div>

                <span className="ds-eyebrow">
                  STAFF INFORMATION
                </span>

                <h2>
                  Staff Member Details
                </h2>

              </div>


              <button
                className="ds-modal-close"
                onClick={() => setSelectedStaff(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>


            <div className="ds-details-body">

              <div className="ds-details-profile">

                <div className="ds-details-avatar">
                  {getInitials(selectedStaff)}
                </div>

                <div>

                  <h3>
                    {getStaffName(selectedStaff)}
                  </h3>

                  <span>
                    Department Staff
                  </span>

                </div>

              </div>


              <div className="ds-details-grid">

                <DetailItem
                  icon={UserRound}
                  label="Staff Profile ID"
                  value={selectedStaff.id}
                />

                <DetailItem
                  icon={UserCheck}
                  label="User ID"
                  value={selectedStaff.user}
                />

                <DetailItem
                  icon={Phone}
                  label="Phone number"
                  value={selectedStaff.phone_number || 'Not provided'}
                />

                <DetailItem
                  icon={MapPin}
                  label="Location"
                  value={selectedStaff.location || 'Not provided'}
                />

                <DetailItem
                  icon={Building2}
                  label="Department ID"
                  value={selectedStaff.department || '—'}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Created on"
                  value={formatDate(selectedStaff.created_at)}
                />

              </div>


              <div className="ds-details-note">
                <AlertCircle size={16} />

                <span>
                  Account status and password are not editable from this screen.
                </span>

              </div>


              <div className="ds-details-footer">

                <button
                  className="ds-cancel-button"
                  onClick={() => setSelectedStaff(null)}
                >
                  Close
                </button>


                <button
                  className="ds-cancel-button"
                  onClick={() => openEditModal(selectedStaff)}
                >
                  <Pencil size={15} />
                  Edit profile
                </button>

                <button
                  className="ds-remove-button"
                  onClick={() => handleRemoveStaff(selectedStaff)}
                  disabled={deletingId === selectedStaff.user}
                >
                  <Trash2 size={16} />

                  Remove from department
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
// STAT CARD
// ==========================================

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="ds-stat-card">

      <div className={`ds-stat-icon ${color}`}>
        <Icon size={21} />
      </div>

      <div>

        <span>{label}</span>

        <strong>{value}</strong>

      </div>

    </div>
  );
}


// ==========================================
// FORM FIELD
// ==========================================

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  required = false,
}) {
  return (
    <div className="ds-form-field">

      <label htmlFor={name}>
        {label}

        {required && <span>*</span>}
      </label>

      <div className={`ds-input-wrapper ${Icon ? 'has-icon' : ''}`}>

        {Icon && <Icon size={16} />}

        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />

      </div>

    </div>
  );
}


// ==========================================
// STAFF DETAIL ITEM
// ==========================================

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="ds-detail-item">

      <div className="ds-detail-icon">
        <Icon size={16} />
      </div>

      <div>

        <span>{label}</span>

        <strong>{value || '—'}</strong>

      </div>

    </div>
  );
}