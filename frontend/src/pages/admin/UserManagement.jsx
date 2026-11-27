import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  UserRound,
  UserCog,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  HeartHandshake,
  Bell,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  UserX,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";
import "./UserManagement.css";

const ROLES = [
  { value: "citizen", label: "Citizen" },
  { value: "manager", label: "Department Manager" },
  { value: "staff", label: "Department Staff" },
  {
    value: "senior_citizen_manager",
    label: "Senior Citizen Manager",
  },
  {
    value: "senior_citizen_staff",
    label: "Senior Citizen Staff",
  },
];

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  role: "citizen",
  password: "",
};

const roleLabel = (role) =>
  ROLES.find((item) => item.value === role)?.label || role;

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export default function UserManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [confirmUser, setConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ADMIN DETAILS

  const admin = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  // ADMIN AUTHENTICATION CHECK

  useEffect(() => {
    const token = localStorage.getItem("civicfix_access_token");

    if (!token || admin.role !== "super_admin") {
      navigate("/admin/login", { replace: true });
    }
  }, [admin, navigate]);

  // LOAD USERS

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (roleFilter !== "all") {
        params.role = roleFilter;
      }

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await api.get("/auth/admin/users/", {
        params,
      });

      const result = response.data?.results;

      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 350);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  // USER COUNTS

  const activeCount = users.filter(
    (user) => user.is_active
  ).length;

  const inactiveCount = users.filter(
    (user) => !user.is_active
  ).length;

  // CREATE USER MODAL

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowPassword(false);
    setModalOpen(true);
  };

  // EDIT USER MODAL

  const openEditModal = (user) => {
    setEditingUser(user);

    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      role: user.role || "citizen",
      password: "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // CLOSE MODAL

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  // FORM INPUT HANDLER

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CREATE / UPDATE USER

  const saveUser = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone_number: form.phone_number.trim(),
      role: form.role,
    };

    try {
      if (editingUser) {
        await api.patch(
          `/auth/admin/users/${editingUser.id}/`,
          payload
        );

        setSuccess("User updated successfully.");
      } else {
        await api.post("/auth/admin/users/", {
          ...payload,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        setSuccess("User created successfully.");
      }

      setModalOpen(false);
      setEditingUser(null);
      setForm(emptyForm);

      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // DEACTIVATE USER
  // DELETE endpoint performs soft deletion in the backend.

  const deactivateUser = async (user) => {
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/auth/admin/users/${user.id}/`
      );

      setSuccess(
        `${user.first_name} ${user.last_name} was deactivated successfully.`
      );

      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  // ACTIVATE USER

  const activateUser = async (user) => {
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/auth/admin/users/${user.id}/`,
        {
          is_active: true,
        }
      );

      setSuccess(
        `${user.first_name} ${user.last_name} was activated successfully.`
      );

      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  // PERMANENTLY DELETE USER

  const permanentlyDeleteUser = async () => {
    if (!confirmUser || deleting) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/auth/admin/users/${confirmUser.id}/`,
        {
          confirm_delete: true,
        }
      );

      setSuccess(
        `${confirmUser.first_name} ${confirmUser.last_name} was permanently deleted.`
      );

      setConfirmUser(null);

      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // LOGOUT

  const logout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    navigate("/admin/login", { replace: true });
  };

  // SIDEBAR NAVIGATION

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      label: "User Management",
      icon: Users,
      path: "/admin/users",
    },
    {
      label: "Department Managers",
      icon: UserCog,
      path: "/admin/managers",
    },
    {
      label: "Department Staff",
      icon: BriefcaseBusiness,
      path: "/admin/staff",
    },
    {
      label: "Citizens",
      icon: UserRound,
      path: "/admin/citizens",
    },
    {
      label: "Senior Managers",
      icon: HeartHandshake,
      path: "/admin/senior-managers",
    },
    {
      label: "Senior Staff",
      icon: Users,
      path: "/admin/senior-staff",
    },
    {
      label: "Departments",
      icon: Building2,
      path: "/admin/departments",
    },
    {
      label: "CivicFix Requests",
      icon: ClipboardList,
      path: "/admin/requests",
    },
    {
      label: "Senior Assistance",
      icon: HeartHandshake,
      path: "/admin/senior-assistance",
    },
    {
      label: "Notifications",
      icon: Bell,
      path: "/admin/notifications",
    },
    {
      label: "Messages",
      icon: Mail,
      path: "/admin/messages",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/admin/settings",
    },
  ];

  return (
    <div className="admin-users-page">

      {/* MOBILE SIDEBAR OVERLAY */}

      {sidebarOpen && (
        <button
          className="aum-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`aum-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="aum-brand">
          <div className="aum-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Administration</span>
          </div>

          <button
            className="aum-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="aum-sidebar-heading">
          MAIN MENU
        </div>

        <nav className="aum-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.path === "/admin/users";

            return (
              <button
                key={item.label}
                className={`aum-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {active && <i />}
              </button>
            );
          })}
        </nav>

        <div className="aum-sidebar-bottom">
          <div className="aum-admin-profile">
            <div className="aum-avatar">
              {(admin.first_name || admin.email || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {admin.email || "Administrator"}
              </strong>

              <span>Super Admin</span>
            </div>
          </div>

          <button
            className="aum-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="aum-main">

        {/* HEADER */}

        <header className="aum-header">
          <div className="aum-header-title">
            <button
              className="aum-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>User Management</h2>

              <p>
                Manage all accounts across the CivicFix platform.
              </p>
            </div>
          </div>

          <div className="aum-header-right">
            <div className="aum-header-avatar">
              A
            </div>

            <div>
              <strong>
                {admin.email || "Administrator"}
              </strong>

              <span>Super Admin</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <section className="aum-content">

          {/* PAGE HEADING */}

          <div className="aum-page-heading">
            <div>
              <span className="aum-eyebrow">
                <span /> PLATFORM ADMINISTRATION
              </span>

              <h1>User Management</h1>

              <p>
                Create, update, search and manage every user account.
              </p>
            </div>

            <button
              className="aum-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add New User
            </button>
          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div className="aum-alert error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {success && (
            <div className="aum-alert success">
              <CheckCircle2 size={17} />
              {success}
            </div>
          )}

          {/* STATISTICS */}

          <div className="aum-stats">

            <article className="aum-stat-card">
              <span className="aum-stat-icon blue">
                <Users size={21} />
              </span>

              <div>
                <span>Total Users</span>
                <strong>{users.length}</strong>
              </div>
            </article>

            <article className="aum-stat-card">
              <span className="aum-stat-icon green">
                <CheckCircle2 size={21} />
              </span>

              <div>
                <span>Active Accounts</span>
                <strong>{activeCount}</strong>
              </div>
            </article>

            <article className="aum-stat-card">
              <span className="aum-stat-icon orange">
                <XCircle size={21} />
              </span>

              <div>
                <span>Inactive Accounts</span>
                <strong>{inactiveCount}</strong>
              </div>
            </article>

            <article className="aum-stat-card">
              <span className="aum-stat-icon purple">
                <ShieldCheck size={21} />
              </span>

              <div>
                <span>Available Roles</span>
                <strong>{ROLES.length}</strong>
              </div>
            </article>

          </div>

          {/* USER TABLE */}

          <section className="aum-table-card">

            <div className="aum-table-heading">
              <div>
                <h3>All Platform Users</h3>

                <p>
                  View and manage registered CivicFix accounts.
                </p>
              </div>

              <button
                className="aum-refresh-button"
                onClick={loadUsers}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={
                    loading ? "aum-spinning" : ""
                  }
                />

                Refresh
              </button>
            </div>

            {/* SEARCH AND FILTERS */}

            <div className="aum-filters">

              <div className="aum-search">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search name, email or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="aum-filter-control">
                <Filter size={16} />

                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value)
                  }
                >
                  <option value="all">All Roles</option>

                  {ROLES.map((role) => (
                    <option
                      key={role.value}
                      value={role.value}
                    >
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <select
                className="aum-status-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

            </div>

            {/* TABLE */}

            <div className="aum-table-wrapper">
              <table className="aum-table">

                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Joined Date</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="aum-empty"
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="aum-empty"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>

                        {/* USER DETAILS */}

                        <td>
                          <div className="aum-user-cell">

                            <div className="aum-user-avatar">
                              {(user.first_name || user.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {user.first_name} {user.last_name}
                              </strong>

                              <span>{user.email}</span>
                            </div>

                          </div>
                        </td>

                        {/* PHONE */}

                        <td>
                          {user.phone_number || "—"}
                        </td>

                        {/* ROLE */}

                        <td>
                          <span
                            className={`aum-role role-${user.role}`}
                          >
                            {roleLabel(user.role)}
                          </span>
                        </td>

                        {/* JOINED DATE */}

                        <td>
                          {formatDate(user.date_joined)}
                        </td>

                        {/* VERIFICATION */}

                        <td>
                          <span
                            className={`aum-verification ${
                              user.is_verified
                                ? "verified"
                                : "unverified"
                            }`}
                          >
                            {user.is_verified ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}

                            {user.is_verified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`aum-status ${
                              user.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {user.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="aum-actions">

                            {/* EDIT USER */}

                            <button
                              title="Edit user"
                              onClick={() =>
                                openEditModal(user)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            {/* ACTIVATE / DEACTIVATE */}

                            {user.is_active ? (
                              <button
                                title="Deactivate user"
                                className="danger"
                                onClick={() =>
                                  deactivateUser(user)
                                }
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                title="Activate user"
                                className="activate"
                                onClick={() =>
                                  activateUser(user)
                                }
                              >
                                <UserCheck size={16} />
                              </button>
                            )}

                            {/* PERMANENT DELETE */}

                            <button
                              title="Permanently delete user"
                              className="danger"
                              onClick={() =>
                                setConfirmUser(user)
                              }
                            >
                              <Trash2 size={16} />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER */}

            <div className="aum-table-footer">
              <span>
                Showing {users.length} user
                {users.length === 1 ? "" : "s"}
              </span>

              <div>
                <button disabled>
                  <ChevronLeft size={16} />
                </button>

                <button className="selected">
                  1
                </button>

                <button disabled>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </section>
        </section>
      </main>

      {/* CREATE / EDIT USER MODAL */}

      {modalOpen && (
        <div
          className="aum-modal-backdrop"
          onMouseDown={closeModal}
        >
          <form
            className="aum-modal"
            onSubmit={saveUser}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="aum-modal-heading">
              <div>
                <span>
                  {editingUser
                    ? "EDIT ACCOUNT"
                    : "NEW ACCOUNT"}
                </span>

                <h2>
                  {editingUser
                    ? "Update User"
                    : "Create User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update this user's account information."
                    : "Create a new CivicFix platform account."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="aum-form-grid">

              {/* FIRST NAME */}

              <label>
                First Name

                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </label>

              {/* LAST NAME */}

              <label>
                Last Name

                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </label>

              {/* EMAIL */}

              <label className="full">
                Email Address

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={Boolean(editingUser)}
                />
              </label>

              {/* PHONE */}

              <label>
                Phone Number

                <input
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                />
              </label>

              {/* ROLE */}

              <label>
                Account Role

                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {ROLES.map((role) => (
                    <option
                      key={role.value}
                      value={role.value}
                    >
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* PASSWORD */}

              {!editingUser && (
                <label className="full aum-password-field">
                  Initial Password

                  <div>
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength={8}
                      required
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="aum-modal-footer">

              <button
                type="button"
                className="aum-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="aum-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingUser
                    ? "Save Changes"
                    : "Create User"}
              </button>

            </div>

          </form>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION */}

      {confirmUser && (
        <div className="aum-modal-backdrop">
          <div className="aum-confirm-modal">

            <div className="aum-confirm-icon">
              <Trash2 size={25} />
            </div>

            <h3>Permanently Delete User?</h3>

            <p>
              Are you sure you want to permanently delete{" "}
              <strong>
                {confirmUser.first_name}{" "}
                {confirmUser.last_name}
              </strong>
              ?
            </p>

            <p className="aum-delete-warning">
              This action cannot be undone. Related records may
              also be affected depending on your database
              relationships.
            </p>

            <div>
              <button
                className="aum-cancel-button"
                onClick={() => setConfirmUser(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="aum-danger-button"
                onClick={permanentlyDeleteUser}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}