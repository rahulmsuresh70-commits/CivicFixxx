import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  Eye,
  Filter,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  Settings,
  ChartNoAxesCombined,
  Headset,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import useManagerUnreadNotifications from "./useManagerUnreadNotifications";

import "./SeniorCitizenManagerDashboard.css";
import "./SeniorCitizenManagerStaff.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const STAFF_URL = `${API_BASE}/api/senior-citizen/staff/`;

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  password_confirm: "",
  phone_number: "",
  state: "",
  district: "",
  designation: "care_assistant",
  location: "",
};

const designationLabels = {
  driver: "Driver",
  medical_assistant: "Medical Assistant",
  care_assistant: "Care Assistant",
  field_assistant: "Field Assistant",
  other: "Other",
};

const getToken = () => localStorage.getItem("civicfix_access_token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

function apiErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object"
        ? JSON.stringify(value)
        : value;

      return `${key.replaceAll("_", " ")}: ${message}`;
    })
    .join(" · ");
}

function initials(person) {
  return (
    `${person?.first_name?.[0] || ""}${
      person?.last_name?.[0] || ""
    }`.toUpperCase() || "SC"
  );
}

function SeniorCitizenManagerStaff() {
  const navigate = useNavigate();
  const location = useLocation();

  // NOTIFICATION COUNT
  const { unreadCount } = useManagerUnreadNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showRegister, setShowRegister] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const menuItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/senior-citizen/manager/dashboard",
  },
  {
    name: "Assistance Requests",
    icon: ClipboardList,
    path: "/senior-citizen/manager/requests",
  },
  {
    name: "Staff Management",
    icon: Users,
    path: "/senior-citizen/manager/staff",
  },
  {
    name: "Progress Tracking",
    icon: ChartNoAxesCombined,
    path: "/senior-citizen/manager/progress",
  },
  {
    name: "Notifications",
    icon: Bell,
    path: "/senior-citizen/manager/notifications",
  },
];
  const activeMenu = menuItems.find(
    (item) => item.path === location.pathname
  )?.name;

  // GET STAFF
  const loadStaff = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const response = await axios.get(STAFF_URL, {
        headers: authHeaders(),
      });

      const payload = response.data;

      setStaff(
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
          ? payload.results
          : []
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // SEARCH AND FILTER
  const filteredStaff = useMemo(() => {
    return staff.filter((person) => {
      const fullName =
        `${person.first_name || ""} ${person.last_name || ""}`.toLowerCase();

      const searchMatch = [
        fullName,
        person.email,
        person.phone_number,
        person.district,
        person.state,
        designationLabels[person.designation] || person.designation,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query.toLowerCase())
      );

      const active =
        person.is_active !== false &&
        person.account_is_active !== false;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      return searchMatch && statusMatch;
    });
  }, [staff, query, statusFilter]);

  const activeCount = staff.filter(
    (person) =>
      person.is_active !== false &&
      person.account_is_active !== false
  ).length;

  const activeStaff = (person) =>
    person.is_active !== false &&
    person.account_is_active !== false;

  // NAVIGATION
  const navigateTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    window.location.href = "/senior-citizen/manager/login";
  };

  // VIEW STAFF DETAILS
  const openStaffDetails = async (person) => {
    setSelectedStaff(person);
    setDetailLoading(true);

    try {
      const response = await axios.get(
        `${STAFF_URL}${person.id}/`,
        {
          headers: authHeaders(),
        }
      );

      setSelectedStaff(response.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  // FORM INPUT
  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // OPEN CREATE FORM
  const openCreateForm = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setFormError("");
    setShowRegister(true);
  };

  // OPEN EDIT FORM
  const openEditForm = (person) => {
    setEditingStaff(person);
    setSelectedStaff(null);

    setForm({
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      email: person.email || "",
      password: "",
      password_confirm: "",
      phone_number: person.phone_number || "",
      state: person.state || "",
      district: person.district || "",
      designation: person.designation || "care_assistant",
      location: person.location || "",
    });

    setFormError("");
    setShowRegister(true);
  };

  // CREATE / UPDATE STAFF
  const submitStaff = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!editingStaff && !form.password) {
      setFormError("Please set a password for the staff login account.");
      return;
    }

    if (
      form.password &&
      form.password !== form.password_confirm
    ) {
      setFormError("Password and confirm password do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        state: form.state,
        district: form.district,
        designation: form.designation,
        location: form.location,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (!editingStaff) {
        payload.password_confirm = form.password_confirm;
      }

      if (editingStaff) {
        // UPDATE STAFF
        await axios.patch(
          `${STAFF_URL}${editingStaff.id}/`,
          payload,
          {
            headers: authHeaders(),
          }
        );

        setSuccessMessage(
          "Staff details updated successfully."
        );
      } else {
        // CREATE STAFF
        await axios.post(STAFF_URL, payload, {
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
        });

        setSuccessMessage(
          "Staff account created. The staff member can now log in individually."
        );
      }

      setShowRegister(false);
      setEditingStaff(null);
      setForm(emptyForm);

      await loadStaff(true);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE STAFF
  const deleteStaff = async (person) => {
    const name =
      `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
      person.email ||
      "this staff member";

    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    try {
      await axios.delete(`${STAFF_URL}${person.id}/`, {
        headers: authHeaders(),
      });

      setSelectedStaff(null);

      setSuccessMessage(
        "Staff account deleted successfully."
      );

      await loadStaff(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="sc-dashboard">

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sc-sidebar ${
          sidebarOpen ? "sc-sidebar-open" : ""
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
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="sc-sidebar-label">
          WORKSPACE
        </div>

        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`sc-nav-item ${
                  activeMenu === item.name ? "active" : ""
                }`}
                onClick={() => navigateTo(item.path)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.name}</span>

                {/* UNREAD NOTIFICATION COUNT */}
                {item.name === "Notifications" && unreadCount > 0 && (
                  <span className="sc-nav-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
          <button
          type="button"
          className={`sidebar-link ${
            location.pathname === "/senior-citizen/manager/messages"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/senior-citizen/manager/messages")
          }
        >
          <Mail size={20} />
          <span>Messages</span>
        </button>
         <button
            type="button"
            className={`sidebar-link ${
              location.pathname ===
              "/senior-citizen/manager/work-management"
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate("/senior-citizen/manager/work-management");
              setSidebarOpen(false);
            }}
          >
            <Activity size={20} />
            <span>Work Management</span>
          </button>
        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">
          <button
            className="sc-nav-item"
            onClick={() =>
              navigateTo("/senior-citizen/manager/profile")
            }
          >
            <UserRound size={19} />
            <span>Manager Profile</span>
          </button>

          
        </nav>

        <div className="sc-sidebar-bottom">
          <div className="sc-help-card">
            <div className="sc-help-icon">
              <Headset size={20} />
            </div>

            <h4>Need assistance?</h4>
            <p>Contact the CivicFix support team.</p>

            <button
              onClick={() =>
                (window.location.href =
                  "mailto:support@civicfix.in")
              }
            >
              Contact Support
              <ArrowUpRight size={14} />
            </button>
          </div>

          <button className="sc-logout" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="sc-main">

        {/* HEADER */}
        <header className="sc-header">
          <div className="sc-header-left">
            <button
              className="sc-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="sc-breadcrumb">
                Workspace <span>/</span> Staff Management
              </div>

              <h2>Staff Management</h2>
            </div>
          </div>

          <div className="sc-header-right">
            <button
              className="sc-notification-button"
              aria-label="Notifications"
              onClick={() =>
                navigateTo(
                  "/senior-citizen/manager/notifications"
                )
              }
            >
              <Bell size={20} />
              <span />
            </button>
              <button
                type="button"
                className={`sidebar-link ${
                  location.pathname ===
                  "/senior-citizen/manager/work-management"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  navigate("/senior-citizen/manager/work-management");
                  setSidebarOpen(false);
                }}
              >
                <Activity size={20} />
                <span>Work Management</span>
              </button>
            <div className="sc-header-divider" />

            <button
              className="sc-profile-button"
              onClick={() =>
                navigateTo("/senior-citizen/manager/profile")
              }
            >
              <div className="sc-avatar">SM</div>

              <div className="sc-profile-info">
                <strong>Manager</strong>
                <span>Senior Citizen Manager</span>
              </div>

              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="sc-content sc-staff-content">

          {successMessage && (
            <div className="sc-staff-alert success">
              <span>{successMessage}</span>

              <button onClick={() => setSuccessMessage("")}>
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="sc-staff-alert error">
              <span>{error}</span>

              <button onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          )}

          {/* PAGE TITLE */}
          <section className="sc-staff-hero">
            <div>
              <div className="sc-welcome-tag">
                <span className="sc-live-dot" />
                TEAM WORKSPACE
              </div>

              <h1>Staff Management</h1>

              <p>
                Create, view, update and delete staff accounts
                for your Senior Citizen Department.
              </p>
            </div>

            <button
              className="sc-staff-primary"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add New Staff
            </button>
          </section>

          {/* STATISTICS */}
          <section className="sc-staff-stats">
            <article className="sc-staff-stat">
              <div className="sc-staff-stat-icon blue">
                <Users size={21} />
              </div>

              <div>
                <span>Total Staff</span>
                <strong>{staff.length}</strong>
                <small>Registered team members</small>
              </div>
            </article>

            <article className="sc-staff-stat">
              <div className="sc-staff-stat-icon green">
                <Activity size={21} />
              </div>

              <div>
                <span>Active Staff</span>
                <strong>{activeCount}</strong>
                <small>Accounts currently active</small>
              </div>
            </article>
          </section>

          {/* STAFF TABLE */}
          <section className="sc-panel sc-staff-list-panel">

            <div className="sc-staff-list-heading">
              <div>
                <h3>Senior Citizen Support Team</h3>
                <p>
                  Staff members registered under your manager account.
                </p>
              </div>

              <button
                className="sc-staff-refresh"
                onClick={() => loadStaff(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing ? "sc-spinning" : ""
                  }
                />
                Refresh
              </button>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="sc-staff-toolbar">
              <div className="sc-staff-search">
                <Search size={17} />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, phone or district..."
                />
              </div>

              <label className="sc-staff-filter">
                <Filter size={16} />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                >
                  <option value="all">All staff</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <span className="sc-staff-result-count">
                {filteredStaff.length} members
              </span>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="sc-staff-state">
                <LoaderCircle
                  className="sc-spinning"
                  size={28}
                />

                <strong>Loading staff members...</strong>
              </div>
            ) : filteredStaff.length === 0 ? (

              /* EMPTY STATE */
              <div className="sc-staff-empty">
                <div>
                  <Users size={26} />
                </div>

                <h3>
                  {staff.length
                    ? "No matching staff found"
                    : "No staff members yet"}
                </h3>

                <p>
                  {staff.length
                    ? "Try changing your search or status filter."
                    : "Register your first staff member to manage your support team."}
                </p>

                {!staff.length && (
                  <button
                    className="sc-staff-primary"
                    onClick={openCreateForm}
                  >
                    <Plus size={17} />
                    Add New Staff
                  </button>
                )}
              </div>
            ) : (

              /* STAFF LIST */
              <div className="sc-staff-table-wrap">
                <table className="sc-staff-table">
                  <thead>
                    <tr>
                      <th>STAFF MEMBER</th>
                      <th>DESIGNATION</th>
                      <th>CONTACT</th>
                      <th>SERVICE DISTRICT</th>
                      <th>ACCOUNT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStaff.map((person) => (
                      <tr key={person.id}>

                        <td>
                          <div className="sc-staff-person">
                            <div className="sc-staff-person-avatar">
                              {initials(person)}
                            </div>

                            <div>
                              <strong>
                                {`${person.first_name || ""} ${
                                  person.last_name || ""
                                }`.trim() || "Staff member"}
                              </strong>

                              <span>
                                {person.email || "Email unavailable"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="sc-staff-designation">
                            <BriefcaseBusiness size={14} />
                            {designationLabels[person.designation] ||
                              person.designation ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span className="sc-staff-contact">
                            {person.phone_number || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="sc-staff-district">
                            <MapPin size={14} />
                            {[
                              person.district,
                              person.state,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`sc-staff-pill ${
                              activeStaff(person)
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <i />
                            {activeStaff(person)
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="sc-staff-row-actions">

                            <button
                              className="sc-staff-view"
                              onClick={() =>
                                openStaffDetails(person)
                              }
                            >
                              <Eye size={16} />
                              View
                            </button>

                            <button
                              className="sc-staff-edit"
                              onClick={() =>
                                openEditForm(person)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="sc-staff-delete"
                              onClick={() =>
                                deleteStaff(person)
                              }
                            >
                              Delete
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="sc-footer">
            <span>© 2026 CivicFix. All rights reserved.</span>
            <span>
              Senior Citizen Assistance Management Portal
            </span>
          </footer>
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {showRegister && (
        <div
          className="sc-staff-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowRegister(false);
            }
          }}
        >
          <section
            className="sc-staff-modal sc-staff-register-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="sc-staff-modal-head">
              <div>
                <span className="sc-staff-modal-kicker">
                  TEAM ONBOARDING
                </span>

                <h2>
                  {editingStaff
                    ? "Edit Staff Details"
                    : "Register New Staff"}
                </h2>

                <p>
                  {editingStaff
                    ? "Update this staff member's account information."
                    : "Create a staff account. The staff member will log in using their own credentials."}
                </p>
              </div>

              <button
                onClick={() => setShowRegister(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="sc-staff-form-error">
                {formError}
              </div>
            )}

            <form onSubmit={submitStaff}>
              <div className="sc-staff-form-grid">

                <label>
                  First name *
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={updateForm}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Last name *
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={updateForm}
                    required
                    maxLength={100}
                  />
                </label>

                <label className="full">
                  Email address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  Phone number *
                  <input
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={updateForm}
                    required
                    maxLength={20}
                  />
                </label>

                <label>
                  Designation *
                  <select
                    name="designation"
                    value={form.designation}
                    onChange={updateForm}
                    required
                  >
                    <option value="driver">Driver</option>
                    <option value="medical_assistant">
                      Medical Assistant
                    </option>
                    <option value="care_assistant">
                      Care Assistant
                    </option>
                    <option value="field_assistant">
                      Field Assistant
                    </option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  State *
                  <input
                    name="state"
                    value={form.state}
                    onChange={updateForm}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  District *
                  <input
                    name="district"
                    value={form.district}
                    onChange={updateForm}
                    required
                    maxLength={100}
                  />
                </label>

                <label className="full">
                  Location
                  <input
                    name="location"
                    value={form.location}
                    onChange={updateForm}
                    maxLength={255}
                  />
                </label>

                <label>
                  Password {editingStaff
                    ? "(leave blank to keep current)"
                    : "*"}
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={updateForm}
                    required={!editingStaff}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>

                <label>
                  Confirm password
                  {form.password ? " *" : ""}
                  <input
                    type="password"
                    name="password_confirm"
                    value={form.password_confirm}
                    onChange={updateForm}
                    required={
                      !!form.password && !editingStaff
                    }
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>

              </div>

              <div className="sc-staff-form-note">
                <ShieldCheck size={16} />

                <span>
                  Email verification is not required for staff
                  accounts. The department manager creates and
                  manages the account. Each staff member logs
                  in individually using their own email and password.
                </span>
              </div>

              <div className="sc-staff-modal-actions">
                <button
                  type="button"
                  className="sc-staff-cancel"
                  onClick={() => setShowRegister(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sc-staff-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="sc-spinning"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingStaff
                        ? "Save Changes"
                        : "Create Staff Account"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* STAFF DETAILS MODAL */}
      {selectedStaff && (
        <div
          className="sc-staff-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedStaff(null);
            }
          }}
        >
          <section
            className="sc-staff-modal sc-staff-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="sc-staff-modal-head">
              <div>
                <span className="sc-staff-modal-kicker">
                  STAFF PROFILE
                </span>

                <h2>Staff Details</h2>

                <p>Registered staff account information.</p>
              </div>

              <button
                onClick={() => setSelectedStaff(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="sc-staff-state">
                <LoaderCircle
                  className="sc-spinning"
                  size={26}
                />
                Loading profile...
              </div>
            ) : (
              <>
                <div className="sc-staff-detail-person">
                  <div className="sc-staff-detail-avatar">
                    {initials(selectedStaff)}
                  </div>

                  <div>
                    <h3>
                      {`${selectedStaff.first_name || ""} ${
                        selectedStaff.last_name || ""
                      }`.trim()}
                    </h3>

                    <p>{selectedStaff.email}</p>

                    <span
                      className={`sc-staff-pill ${
                        activeStaff(selectedStaff)
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      <i />
                      {activeStaff(selectedStaff)
                        ? "Active account"
                        : "Inactive account"}
                    </span>
                  </div>
                </div>

                <div className="sc-staff-detail-grid">

                  <div>
                    <span>
                      <Phone size={14} />
                      Phone number
                    </span>
                    <strong>
                      {selectedStaff.phone_number || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <BriefcaseBusiness size={14} />
                      Designation
                    </span>
                    <strong>
                      {designationLabels[
                        selectedStaff.designation
                      ] ||
                        selectedStaff.designation ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <MapPin size={14} />
                      District
                    </span>
                    <strong>
                      {selectedStaff.district || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <MapPin size={14} />
                      State
                    </span>
                    <strong>
                      {selectedStaff.state || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <Activity size={14} />
                      Staff profile status
                    </span>
                    <strong>
                      {selectedStaff.is_active === false
                        ? "Inactive"
                        : "Active"}
                    </strong>
                  </div>

                  <div className="full">
                    <span>
                      <Mail size={14} />
                      Manager email
                    </span>
                    <strong>
                      {selectedStaff.manager_email || "—"}
                    </strong>
                  </div>

                  <div className="full">
                    <span>
                      <MapPin size={14} />
                      Location
                    </span>
                    <strong>
                      {selectedStaff.location || "—"}
                    </strong>
                  </div>

                </div>
              </>
            )}

            <div className="sc-staff-modal-actions">
              <button
                className="sc-staff-delete"
                onClick={() => deleteStaff(selectedStaff)}
              >
                Delete Staff
              </button>

              <button
                className="sc-staff-edit"
                onClick={() => openEditForm(selectedStaff)}
              >
                Edit Staff
              </button>

              <button
                className="sc-staff-cancel"
                onClick={() => setSelectedStaff(null)}
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

export default SeniorCitizenManagerStaff;