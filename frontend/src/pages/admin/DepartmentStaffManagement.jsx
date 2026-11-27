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
  CalendarDays,
  Building,
  MapPin,
  Mail as MailIcon,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./DepartmentStaffManagement.css";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  location: "",
  password: "",
  department: "",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const getDepartmentName = (staff) => {
  return (
    staff.department?.name ||
    staff.department_name ||
    "Not assigned"
  );
};

// Extract readable validation errors from Django REST Framework.
const extractValidationErrors = (data) => {
  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => extractValidationErrors(item))
      .join("\n");
  }

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages
              .map((item) =>
                typeof item === "object"
                  ? extractValidationErrors(item)
                  : String(item)
              )
              .join(", ")
          : typeof messages === "object" && messages !== null
            ? extractValidationErrors(messages)
            : String(messages);

        return `${field}: ${message}`;
      })
      .join("\n");
  }

  return String(data);
};

export default function DepartmentStaffManagement() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] =
    useState("all");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [viewStaff, setViewStaff] = useState(null);
  const [confirmStaff, setConfirmStaff] = useState(null);

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

  // ==========================================
  // ADMIN AUTHENTICATION
  // ==========================================

  useEffect(() => {
    const token = localStorage.getItem(
      "civicfix_access_token"
    );

    if (!token || admin.role !== "super_admin") {
      navigate("/admin/login", {
        replace: true,
      });
    }
  }, [admin, navigate]);

  // ==========================================
  // LOAD DEPARTMENTS
  // ==========================================

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
          String(department.status || "").toLowerCase() ===
            "active"
      );

      setDepartments(activeDepartments);
    } catch (err) {
      console.error(
        "Department loading error:",
        err.response?.data || err
      );

      setError(getApiErrorMessage(err));
    }
  }, []);

  // ==========================================
  // LOAD DEPARTMENT STAFF
  // ==========================================

  const loadStaff = useCallback(async () => {
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
        "/departments/admin/staff/",
        { params }
      );

      const data = response.data;

      const staffList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setStaff(staffList);
    } catch (err) {
      console.error(
        "Staff loading error:",
        err.response?.data || err
      );

      setError(getApiErrorMessage(err));
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff();
    }, 350);

    return () => clearTimeout(timer);
  }, [loadStaff]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const activeCount = staff.filter(
    (person) => person.is_active
  ).length;

  const inactiveCount = staff.filter(
    (person) => !person.is_active
  ).length;

  const assignedCount = staff.filter(
    (person) => person.department
  ).length;

  const unassignedCount = staff.length - assignedCount;

  // ==========================================
  // FORM HANDLER
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE STAFF MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setShowPassword(false);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // ==========================================
  // EDIT STAFF MODAL
  // ==========================================

  const openEditModal = (person) => {
    setEditingStaff(person);

    const departmentId =
      person.department?.id ??
      person.department_id ??
      (typeof person.department === "number" ||
      typeof person.department === "string"
        ? person.department
        : "");

    setForm({
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      email: person.email || "",
      phone_number: person.phone_number || "",
      location: person.location || "",
      password: "",
      department: departmentId
        ? String(departmentId)
        : "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingStaff(null);
    setForm(emptyForm);
  };

  // ==========================================
  // CREATE / UPDATE STAFF
  // ==========================================

  const saveStaff = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    let submittedPayload = null;

    try {
      // Basic validation

      if (!form.first_name.trim()) {
        setError("Please enter the first name.");
        return;
      }

      if (!form.last_name.trim()) {
        setError("Please enter the last name.");
        return;
      }

      if (!form.email.trim()) {
        setError("Please enter the email address.");
        return;
      }

      if (!form.phone_number.trim()) {
        setError("Please enter the phone number.");
        return;
      }

      // Location validation
      if (!form.location.trim()) {
        setError("Please enter the staff location.");
        return;
      }

      if (!form.department) {
        setError("Please select a department.");
        return;
      }

      if (!editingStaff && !form.password.trim()) {
        setError("Please enter an initial password.");
        return;
      }

      if (!editingStaff && form.password.length < 8) {
        setError(
          "Password must contain at least 8 characters."
        );
        return;
      }

      const departmentId = Number(form.department);

      if (
        !Number.isInteger(departmentId) ||
        departmentId <= 0
      ) {
        setError("Please select a valid department.");
        return;
      }

      // ========================================
      // API PAYLOAD
      // ========================================

      submittedPayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone_number.trim(),

        // Staff location
        location: form.location.trim(),

        // Backend field name is department.
        // Value is the department database ID.
        department: departmentId,
      };

      if (!editingStaff) {
        submittedPayload.password = form.password;
      }

      console.log(
        "===================================="
      );

      console.log(
        "STAFF API REQUEST"
      );

      console.log(
        "Request type:",
        editingStaff ? "UPDATE" : "CREATE"
      );

      console.log(
        "API URL:",
        editingStaff
          ? `/departments/admin/staff/${editingStaff.id}/`
          : "/departments/admin/staff/"
      );

      console.log(
        "Staff API payload:",
        submittedPayload
      );

      console.log(
        "Full JSON payload:",
        JSON.stringify(submittedPayload, null, 2)
      );

      console.log(
        "===================================="
      );

      // ========================================
      // UPDATE STAFF
      // ========================================

      if (editingStaff) {
        await api.patch(
          `/departments/admin/staff/${editingStaff.id}/`,
          submittedPayload
        );

        setSuccess(
          "Department Staff updated successfully."
        );
      } else {
        // ======================================
        // CREATE STAFF
        // ======================================

        await api.post(
          "/departments/admin/staff/",
          submittedPayload
        );

        setSuccess(
          "Department Staff created successfully."
        );
      }

      setModalOpen(false);
      setEditingStaff(null);
      setForm(emptyForm);

      await loadStaff();
      await loadDepartments();

    } catch (err) {
      // ========================================
      // DETAILED BACKEND ERROR
      // ========================================

      const responseData = err.response?.data;

      const statusCode = err.response?.status;

      console.error(
        "===================================="
      );

      console.error(
        "STAFF CREATION / UPDATE FAILED"
      );

      console.error(
        "HTTP Status:",
        statusCode
      );

      console.error(
        "Backend Response:",
        responseData
      );

      console.error(
        "Submitted Payload:",
        submittedPayload
      );

      console.error(
        "Full Error:",
        err
      );

      console.error(
        "===================================="
      );

      const validationMessage =
        extractValidationErrors(responseData);

      const finalMessage =
        responseData
          ? validationMessage
          : getApiErrorMessage(err);

      setError(finalMessage);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE STAFF
  // ==========================================

  const activateStaff = async (person) => {
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/departments/admin/staff/${person.id}/`,
        {
          is_active: true,
        }
      );

      setSuccess(
        `${person.first_name} ${person.last_name} activated successfully.`
      );

      await loadStaff();
    } catch (err) {
      console.error(
        "Staff activation error:",
        err.response?.data || err
      );

      setError(
        extractValidationErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );
    }
  };

  // ==========================================
  // DEACTIVATE STAFF
  // ==========================================

  const deactivateStaff = async () => {
    if (!confirmStaff || processing) return;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/departments/admin/staff/${confirmStaff.id}/`
      );

      setSuccess(
        `${confirmStaff.first_name} ${confirmStaff.last_name} deactivated successfully.`
      );

      setConfirmStaff(null);

      await loadStaff();
    } catch (err) {
      console.error(
        "Staff deactivation error:",
        err.response?.data || err
      );

      setError(
        extractValidationErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================
  // REFRESH
  // ==========================================

  const refreshPage = async () => {
    await Promise.all([
      loadStaff(),
      loadDepartments(),
    ]);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    navigate("/admin/login", {
      replace: true,
    });
  };

  // ==========================================
  // SIDEBAR NAVIGATION
  // ==========================================

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

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="dsm-page">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <button
          className="dsm-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`dsm-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="dsm-brand">
          <div className="dsm-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Administration</span>
          </div>

          <button
            className="dsm-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="dsm-sidebar-heading">
          MAIN MENU
        </div>

        <nav className="dsm-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.path === "/admin/staff";

            return (
              <button
                key={item.label}
                className={`dsm-nav-item ${
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

        <div className="dsm-sidebar-bottom">
          <div className="dsm-admin-profile">
            <div className="dsm-avatar">
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
            className="dsm-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="dsm-main">

        {/* HEADER */}

        <header className="dsm-header">
          <div className="dsm-header-title">
            <button
              className="dsm-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>Department Staff</h2>
              <p>
                Manage all department staff accounts.
              </p>
            </div>
          </div>

          <div className="dsm-header-user">
            <div className="dsm-header-avatar">
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

        {/* CONTENT */}

        <section className="dsm-content">

          {/* PAGE HEADING */}

          <div className="dsm-page-heading">
            <div>
              <span className="dsm-eyebrow">
                <span />
                PLATFORM ADMINISTRATION
              </span>

              <h1>Department Staff Management</h1>

              <p>
                Create, update, assign, activate and manage
                department staff accounts.
              </p>
            </div>

            <button
              className="dsm-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Staff
            </button>
          </div>

          {/* ALERTS */}

          {error && (
            <div className="dsm-alert error">
              <AlertCircle size={17} />
              <span style={{ whiteSpace: "pre-line" }}>
                {error}
              </span>
              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="dsm-alert success">
              <CheckCircle2 size={17} />
              <span>{success}</span>
              <button onClick={() => setSuccess("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* STATISTICS */}

          <div className="dsm-stats">

            <article className="dsm-stat-card">
              <span className="blue">
                <Users size={21} />
              </span>

              <div>
                <small>Total Staff</small>
                <strong>{staff.length}</strong>
              </div>
            </article>

            <article className="dsm-stat-card">
              <span className="green">
                <UserCheck size={21} />
              </span>

              <div>
                <small>Active Staff</small>
                <strong>{activeCount}</strong>
              </div>
            </article>

            <article className="dsm-stat-card">
              <span className="orange">
                <UserX size={21} />
              </span>

              <div>
                <small>Inactive Staff</small>
                <strong>{inactiveCount}</strong>
              </div>
            </article>

            <article className="dsm-stat-card">
              <span className="purple">
                <Building size={21} />
              </span>

              <div>
                <small>Assigned Staff</small>
                <strong>{assignedCount}</strong>
              </div>
            </article>

          </div>

          {/* STAFF TABLE */}

          <section className="dsm-table-card">

            <div className="dsm-table-heading">
              <div>
                <h3>All Department Staff</h3>
                <p>
                  View and manage registered department staff.
                </p>
              </div>

              <button
                className="dsm-refresh"
                onClick={refreshPage}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={
                    loading ? "dsm-spinning" : ""
                  }
                />
                Refresh
              </button>
            </div>

            {/* SEARCH AND FILTERS */}

            <div className="dsm-filters">

              <div className="dsm-search">
                <Search size={18} />

                <input
                  placeholder="Search name, email or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="dsm-filter">
                <Filter size={16} />

                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All Departments
                  </option>

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
                className="dsm-status-filter"
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

            <div className="dsm-table-wrapper">
              <table className="dsm-table">

                <thead>
                  <tr>
                    <th>Staff Member</th>
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
                      <td
                        colSpan="7"
                        className="dsm-empty"
                      >
                        Loading department staff...
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="dsm-empty"
                      >
                        No department staff found.
                      </td>
                    </tr>
                  ) : (
                    staff.map((person) => (
                      <tr key={person.id}>

                        <td>
                          <div className="dsm-staff-cell">
                            <div className="dsm-staff-avatar">
                              {(person.first_name ||
                                person.email ||
                                "S")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {person.first_name}{" "}
                                {person.last_name}
                              </strong>

                              <span>{person.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {person.phone_number || "—"}
                        </td>

                        <td>
                          {person.department ? (
                            <div className="dsm-department-cell">
                              <strong>
                                {person.department.name ||
                                  person.department_name ||
                                  "Assigned"}
                              </strong>

                              <span>
                                {person.department.code ||
                                  "Department"}
                              </span>
                            </div>
                          ) : (
                            <span className="dsm-unassigned">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td>
                          {formatDate(person.date_joined)}
                        </td>

                        <td>
                          <span
                            className={`dsm-verification ${
                              person.is_verified
                                ? "verified"
                                : "unverified"
                            }`}
                          >
                            {person.is_verified ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}

                            {person.is_verified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`dsm-status ${
                              person.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {person.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="dsm-actions">

                            <button
                              title="View details"
                              onClick={() =>
                                setViewStaff(person)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              title="Edit staff"
                              onClick={() =>
                                openEditModal(person)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            {person.is_active ? (
                              <button
                                title="Deactivate staff"
                                className="danger"
                                onClick={() =>
                                  setConfirmStaff(person)
                                }
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                title="Activate staff"
                                className="activate"
                                onClick={() =>
                                  activateStaff(person)
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

            <div className="dsm-table-footer">
              <span>
                Showing {staff.length} staff member
                {staff.length === 1 ? "" : "s"}
              </span>

              <span>
                {unassignedCount} unassigned
              </span>
            </div>

          </section>
        </section>
      </main>

      {/* ==========================================
          CREATE / EDIT MODAL
      ========================================== */}

      {modalOpen && (
        <div
          className="dsm-modal-backdrop"
          onMouseDown={closeModal}
        >
          <form
            className="dsm-modal"
            onSubmit={saveStaff}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dsm-modal-heading">
              <div>
                <span>
                  {editingStaff
                    ? "EDIT STAFF"
                    : "NEW STAFF"}
                </span>

                <h2>
                  {editingStaff
                    ? "Update Department Staff"
                    : "Create Department Staff"}
                </h2>

                <p>
                  Enter the staff account and department information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="dsm-form-grid">

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
                  disabled={Boolean(editingStaff)}
                />
              </label>

              <label>
                Phone Number

                <input
                  type="tel"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  required
                />
              </label>

              {/* NEW STAFF LOCATION FIELD */}

              <label>
                Staff Location

                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Enter staff location"
                  required
                />
              </label>

              <label>
                Assign Department

                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Department
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
                    Activate a department first.
                  </small>
                )}
              </label>

              {!editingStaff && (
                <label className="full dsm-password-field">
                  Initial Password

                  <div>
                    <input
                      type={
                        showPassword ? "text" : "password"
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

            <div className="dsm-modal-footer">

              <button
                type="button"
                className="dsm-cancel"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="dsm-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingStaff
                    ? "Save Changes"
                    : "Create Staff"}
              </button>

            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          VIEW STAFF DETAILS
      ========================================== */}

      {viewStaff && (
        <div
          className="dsm-modal-backdrop"
          onMouseDown={() => setViewStaff(null)}
        >
          <div
            className="dsm-view-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dsm-modal-heading">
              <div>
                <span>STAFF INFORMATION</span>
                <h2>Staff Details</h2>
              </div>

              <button
                onClick={() => setViewStaff(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="dsm-detail-profile">
              <div className="dsm-detail-avatar">
                {(viewStaff.first_name || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h3>
                {viewStaff.first_name}{" "}
                {viewStaff.last_name}
              </h3>

              <span>Department Staff</span>
            </div>

            <div className="dsm-detail-grid">

              <div>
                <MailIcon size={17} />

                <section>
                  <small>Email Address</small>
                  <strong>{viewStaff.email}</strong>
                </section>
              </div>

              <div>
                <Phone size={17} />

                <section>
                  <small>Phone Number</small>
                  <strong>
                    {viewStaff.phone_number || "Not provided"}
                  </strong>
                </section>
              </div>

              <div>
                <Building size={17} />

                <section>
                  <small>Department</small>
                  <strong>
                    {getDepartmentName(viewStaff)}
                  </strong>
                </section>
              </div>

              <div>
                <MapPin size={17} />

                <section>
                  <small>Department Code</small>
                  <strong>
                    {viewStaff.department?.code || "—"}
                  </strong>
                </section>
              </div>

              <div>
                <CalendarDays size={17} />

                <section>
                  <small>Joined Date</small>
                  <strong>
                    {formatDate(viewStaff.date_joined)}
                  </strong>
                </section>
              </div>

              <div>
                <ShieldCheck size={17} />

                <section>
                  <small>Verification</small>
                  <strong>
                    {viewStaff.is_verified
                      ? "Verified"
                      : "Unverified"}
                  </strong>
                </section>
              </div>

            </div>

            <div className="dsm-detail-status">
              <span
                className={`dsm-status ${
                  viewStaff.is_active
                    ? "active"
                    : "inactive"
                }`}
              >
                {viewStaff.is_active
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div className="dsm-modal-footer">

              <button
                className="dsm-cancel"
                onClick={() => setViewStaff(null)}
              >
                Close
              </button>

              <button
                className="dsm-primary-button"
                onClick={() => {
                  setViewStaff(null);
                  openEditModal(viewStaff);
                }}
              >
                <Pencil size={16} />
                Edit Staff
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DEACTIVATION CONFIRMATION
      ========================================== */}

      {confirmStaff && (
        <div className="dsm-modal-backdrop">
          <div className="dsm-confirm-modal">

            <div className="dsm-confirm-icon">
              <AlertCircle size={25} />
            </div>

            <h3>Deactivate Staff Account?</h3>

            <p>
              Are you sure you want to deactivate{" "}
              <strong>
                {confirmStaff.first_name}{" "}
                {confirmStaff.last_name}
              </strong>
              ?
            </p>

            <p className="dsm-warning">
              This prevents the staff member from accessing
              CivicFix. Existing complaint and assignment
              records should be preserved by the backend.
            </p>

            <div>

              <button
                className="dsm-cancel"
                onClick={() => setConfirmStaff(null)}
                disabled={processing}
              >
                Cancel
              </button>

              <button
                className="dsm-danger-button"
                onClick={deactivateStaff}
                disabled={processing}
              >
                {processing
                  ? "Deactivating..."
                  : "Deactivate"}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}