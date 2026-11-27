import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Filter,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  AlertCircle,
  Phone,
  Mail as MailIcon,
  CalendarDays,
  Building,
  MapPin,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./DepartmentManagerManagement.css";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  department_id: "",
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export default function DepartmentManagerManagement() {
  const navigate = useNavigate();

  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  const [viewManager, setViewManager] = useState(null);
  const [confirmManager, setConfirmManager] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const admin = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  // ADMIN AUTHENTICATION

  useEffect(() => {
    const token = localStorage.getItem(
      "civicfix_access_token"
    );

    if (!token || admin.role !== "super_admin") {
      navigate("/admin/login", { replace: true });
    }
  }, [admin, navigate]);

  // LOAD ACTIVE DEPARTMENTS
  // All active departments are displayed, including
  // departments that already have an assigned manager.

  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.get("/departments/");

      const data = response.data;

      const departmentList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];

      const activeDepartments = departmentList.filter(
        (department) =>
          department.is_active === true ||
          department.active === true ||
          String(department.status || "").toLowerCase() === "active"
      );

      setDepartments(activeDepartments);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  // LOAD MANAGERS

  const loadManagers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      if (departmentFilter !== "all") {
        params.department = departmentFilter;
      }

      const response = await api.get(
        "/departments/admin/managers/",
        { params }
      );

      setManagers(
        Array.isArray(response.data?.results)
          ? response.data.results
          : Array.isArray(response.data)
            ? response.data
            : []
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timer = setTimeout(loadManagers, 350);

    return () => clearTimeout(timer);
  }, [loadManagers]);

  // COUNTS

  const activeCount = managers.filter(
    (manager) => manager.is_active
  ).length;

  const inactiveCount = managers.filter(
    (manager) => !manager.is_active
  ).length;

  const assignedCount = managers.filter(
    (manager) => manager.department
  ).length;

  const unassignedCount = managers.length - assignedCount;

  // FORM HANDLER

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CREATE MODAL

  const openCreateModal = () => {
    setEditingManager(null);
    setForm(emptyForm);
    setShowPassword(false);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // EDIT MODAL

  const openEditModal = (manager) => {
    setEditingManager(manager);

    setForm({
      first_name: manager.first_name || "",
      last_name: manager.last_name || "",
      email: manager.email || "",
      phone_number: manager.phone_number || "",
      password: "",
      department_id: manager.department?.id
        ? String(manager.department.id)
        : "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingManager(null);
    setForm(emptyForm);
  };

  // CREATE / UPDATE MANAGER

  const saveManager = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingManager) {
        await api.patch(
          `/departments/admin/managers/${editingManager.id}/`,
          {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone_number: form.phone_number.trim(),
            department_id: form.department_id || null,
          }
        );

        setSuccess(
          "Department Manager updated successfully."
        );
      } else {
        await api.post(
          "/departments/admin/managers/",
          {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone_number: form.phone_number.trim(),
            password: form.password,
            department_id: form.department_id,
          }
        );

        setSuccess(
          "Department Manager created successfully."
        );
      }

      setModalOpen(false);
      setEditingManager(null);
      setForm(emptyForm);

      await loadManagers();
      await loadDepartments();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ACTIVATE MANAGER

  const activateManager = async (manager) => {
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/departments/admin/managers/${manager.id}/`,
        {
          is_active: true,
        }
      );

      setSuccess(
        `${manager.first_name} ${manager.last_name} activated successfully.`
      );

      await loadManagers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  // DEACTIVATE MANAGER

  const deactivateManager = async () => {
    if (!confirmManager || deleting) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/departments/admin/managers/${confirmManager.id}/`
      );

      setSuccess(
        `${confirmManager.first_name} ${confirmManager.last_name} deactivated successfully.`
      );

      setConfirmManager(null);

      await loadManagers();
      await loadDepartments();
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

  // SIDEBAR

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
    <div className="dmm-page">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <button
          className="dmm-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`dmm-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="dmm-brand">
          <div className="dmm-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Administration</span>
          </div>

          <button
            className="dmm-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="dmm-sidebar-heading">
          MAIN MENU
        </div>

        <nav className="dmm-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.path === "/admin/managers";

            return (
              <button
                key={item.label}
                className={`dmm-nav-item ${
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

        <div className="dmm-sidebar-bottom">
          <div className="dmm-admin-profile">
            <div className="dmm-avatar">
              {(admin.first_name || admin.email || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>{admin.email || "Administrator"}</strong>
              <span>Super Admin</span>
            </div>
          </div>

          <button
            className="dmm-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="dmm-main">

        {/* HEADER */}

        <header className="dmm-header">
          <div className="dmm-header-title">
            <button
              className="dmm-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>Department Managers</h2>
              <p>
                Manage department manager accounts and assignments.
              </p>
            </div>
          </div>

          <div className="dmm-header-user">
            <div className="dmm-header-avatar">A</div>

            <div>
              <strong>{admin.email || "Administrator"}</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </header>

        {/* CONTENT */}

        <section className="dmm-content">

          {/* PAGE TITLE */}

          <div className="dmm-page-heading">
            <div>
              <span className="dmm-eyebrow">
                <span /> PLATFORM ADMINISTRATION
              </span>

              <h1>Department Manager Management</h1>

              <p>
                Create, update, assign, activate and manage department managers.
              </p>
            </div>

            <button
              className="dmm-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Manager
            </button>
          </div>

          {/* ALERTS */}

          {error && (
            <div className="dmm-alert error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          {success && (
            <div className="dmm-alert success">
              <CheckCircle2 size={17} />
              {success}
            </div>
          )}

          {/* STATS */}

          <div className="dmm-stats">

            <article className="dmm-stat-card">
              <span className="blue">
                <Users size={21} />
              </span>
              <div>
                <small>Total Managers</small>
                <strong>{managers.length}</strong>
              </div>
            </article>

            <article className="dmm-stat-card">
              <span className="green">
                <UserCheck size={21} />
              </span>
              <div>
                <small>Active Managers</small>
                <strong>{activeCount}</strong>
              </div>
            </article>

            <article className="dmm-stat-card">
              <span className="orange">
                <UserX size={21} />
              </span>
              <div>
                <small>Inactive Managers</small>
                <strong>{inactiveCount}</strong>
              </div>
            </article>

            <article className="dmm-stat-card">
              <span className="purple">
                <Building size={21} />
              </span>
              <div>
                <small>Assigned Departments</small>
                <strong>{assignedCount}</strong>
              </div>
            </article>

          </div>

          {/* MANAGER TABLE */}

          <section className="dmm-table-card">

            <div className="dmm-table-heading">
              <div>
                <h3>All Department Managers</h3>
                <p>
                  View complete manager information and account status.
                </p>
              </div>

              <button
                className="dmm-refresh"
                onClick={() => {
                  loadManagers();
                  loadDepartments();
                }}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {/* FILTERS */}

            <div className="dmm-filters">

              <div className="dmm-search">
                <Search size={18} />
                <input
                  placeholder="Search name, email or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="dmm-filter">
                <Filter size={16} />

                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                >
                  <option value="all">All Departments</option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                className="dmm-status-filter"
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

            <div className="dmm-table-wrapper">
              <table className="dmm-table">

                <thead>
                  <tr>
                    <th>Manager</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Joined Date</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="7" className="dmm-empty">
                        Loading managers...
                      </td>
                    </tr>
                  ) : managers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="dmm-empty">
                        No department managers found.
                      </td>
                    </tr>
                  ) : (
                    managers.map((manager) => (
                      <tr key={manager.id}>

                        <td>
                          <div className="dmm-manager-cell">
                            <div className="dmm-manager-avatar">
                              {(manager.first_name || "M")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {manager.first_name} {manager.last_name}
                              </strong>
                              <span>{manager.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>{manager.phone_number || "—"}</td>

                        <td>
                          {manager.department ? (
                            <div className="dmm-department-cell">
                              <strong>
                                {manager.department.name}
                              </strong>
                              <span>
                                {manager.department.code}
                              </span>
                            </div>
                          ) : (
                            <span className="dmm-unassigned">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td>{formatDate(manager.date_joined)}</td>

                        <td>
                          <span
                            className={`dmm-verification ${
                              manager.is_verified
                                ? "verified"
                                : "unverified"
                            }`}
                          >
                            {manager.is_verified
                              ? <CheckCircle2 size={14} />
                              : <XCircle size={14} />}

                            {manager.is_verified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`dmm-status ${
                              manager.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {manager.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="dmm-actions">

                            <button
                              title="View details"
                              onClick={() =>
                                setViewManager(manager)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              title="Edit manager"
                              onClick={() =>
                                openEditModal(manager)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            {manager.is_active ? (
                              <button
                                title="Deactivate manager"
                                className="danger"
                                onClick={() =>
                                  setConfirmManager(manager)
                                }
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                title="Activate manager"
                                className="activate"
                                onClick={() =>
                                  activateManager(manager)
                                }
                              >
                                <UserCheck size={16} />
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>

            <div className="dmm-table-footer">
              Showing {managers.length} manager
              {managers.length === 1 ? "" : "s"}
            </div>

          </section>
        </section>
      </main>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div
          className="dmm-modal-backdrop"
          onMouseDown={closeModal}
        >
          <form
            className="dmm-modal"
            onSubmit={saveManager}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dmm-modal-heading">
              <div>
                <span>
                  {editingManager ? "EDIT MANAGER" : "NEW MANAGER"}
                </span>

                <h2>
                  {editingManager
                    ? "Update Department Manager"
                    : "Create Department Manager"}
                </h2>

                <p>
                  Enter the manager's account and department information.
                </p>
              </div>

              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="dmm-form-grid">

              <label>
                First Name
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Last Name
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="full">
                Email Address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  required
                />
              </label>

              {/* ACTIVE DEPARTMENT LIST */}

              <label>
                Assign Department

                <select
                  name="department_id"
                  value={form.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Active Department
                  </option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
                      {department.code
                        ? ` (${department.code})`
                        : ""}
                    </option>
                  ))}
                </select>

                {departments.length === 0 && (
                  <small>
                    No active departments available.
                    Please activate a department first.
                  </small>
                )}
              </label>

              {!editingManager && (
                <label className="full dmm-password-field">
                  Initial Password

                  <div>
                    <input
                      type={showPassword ? "text" : "password"}
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
                      {showPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}

            </div>

            <div className="dmm-modal-footer">
              <button
                type="button"
                className="dmm-cancel"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="dmm-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingManager
                    ? "Save Changes"
                    : "Create Manager"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* VIEW MANAGER DETAILS */}

      {viewManager && (
        <div
          className="dmm-modal-backdrop"
          onMouseDown={() => setViewManager(null)}
        >
          <div
            className="dmm-view-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="dmm-modal-heading">
              <div>
                <span>MANAGER INFORMATION</span>
                <h2>Manager Details</h2>
              </div>

              <button
                onClick={() => setViewManager(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="dmm-detail-profile">
              <div className="dmm-detail-avatar">
                {(viewManager.first_name || "M")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h3>
                {viewManager.first_name} {viewManager.last_name}
              </h3>

              <span>Department Manager</span>
            </div>

            <div className="dmm-detail-grid">

              <div>
                <MailIcon size={17} />
                <section>
                  <small>Email Address</small>
                  <strong>{viewManager.email}</strong>
                </section>
              </div>

              <div>
                <Phone size={17} />
                <section>
                  <small>Phone Number</small>
                  <strong>
                    {viewManager.phone_number || "Not provided"}
                  </strong>
                </section>
              </div>

              <div>
                <Building size={17} />
                <section>
                  <small>Department</small>
                  <strong>
                    {viewManager.department?.name || "Not assigned"}
                  </strong>
                </section>
              </div>

              <div>
                <MapPin size={17} />
                <section>
                  <small>Department Code</small>
                  <strong>
                    {viewManager.department?.code || "—"}
                  </strong>
                </section>
              </div>

              <div>
                <CalendarDays size={17} />
                <section>
                  <small>Joined Date</small>
                  <strong>
                    {formatDate(viewManager.date_joined)}
                  </strong>
                </section>
              </div>

              <div>
                <ShieldCheck size={17} />
                <section>
                  <small>Verification</small>
                  <strong>
                    {viewManager.is_verified
                      ? "Verified"
                      : "Unverified"}
                  </strong>
                </section>
              </div>

            </div>

            <div className="dmm-detail-status">
              <span
                className={`dmm-status ${
                  viewManager.is_active
                    ? "active"
                    : "inactive"
                }`}
              >
                {viewManager.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="dmm-modal-footer">
              <button
                className="dmm-cancel"
                onClick={() => setViewManager(null)}
              >
                Close
              </button>

              <button
                className="dmm-primary-button"
                onClick={() => {
                  setViewManager(null);
                  openEditModal(viewManager);
                }}
              >
                <Pencil size={16} />
                Edit Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATION CONFIRMATION */}

      {confirmManager && (
        <div className="dmm-modal-backdrop">
          <div className="dmm-confirm-modal">

            <div className="dmm-confirm-icon">
              <AlertCircle size={25} />
            </div>

            <h3>Deactivate Department Manager?</h3>

            <p>
              Are you sure you want to deactivate{" "}
              <strong>
                {confirmManager.first_name}{" "}
                {confirmManager.last_name}
              </strong>
              ?
            </p>

            <p className="dmm-warning">
              The manager will lose access to their account.
              Their department assignment will be removed.
              Historical records will be preserved.
            </p>

            <div>
              <button
                className="dmm-cancel"
                onClick={() => setConfirmManager(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="dmm-danger-button"
                onClick={deactivateManager}
                disabled={deleting}
              >
                {deleting ? "Deactivating..." : "Deactivate"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}