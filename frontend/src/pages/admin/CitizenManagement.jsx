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
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Phone,
  CalendarDays,
  Mail as MailIcon,
  Trash2,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";

import "./CitizenManagement.css";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  password_confirm: "",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const extractErrors = (data) => {
  if (!data) return "Something went wrong.";

  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data.map(extractErrors).join("\n");
  }

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field}: ${message}`;
      })
      .join("\n");
  }

  return String(data);
};

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function CitizenManagement() {
  const navigate = useNavigate();

  const [citizens, setCitizens] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] =
    useState("all");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState(null);
  const [viewCitizen, setViewCitizen] = useState(null);
  const [confirmCitizen, setConfirmCitizen] = useState(null);
  const [deleteCitizen, setDeleteCitizen] = useState(null);

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
      navigate("/admin/login", { replace: true });
    }
  }, [admin, navigate]);

  // ==========================================
  // LOAD CITIZENS
  // ==========================================

  const loadCitizens = useCallback(async () => {
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

      if (verificationFilter !== "all") {
        params.is_verified = verificationFilter;
      }

      const response = await api.get(
        "/auth/admin/users/",
        { params }
      );

      const users = getList(response.data);

      // Display only citizen accounts.
      const citizenList = users.filter(
        (user) =>
          String(user.role || "").toLowerCase() === "citizen"
      );

      setCitizens(citizenList);
    } catch (err) {
      console.error(
        "Citizen loading error:",
        err.response?.data || err
      );

      setError(
        extractErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );

      setCitizens([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, verificationFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCitizens();
    }, 350);

    return () => clearTimeout(timer);
  }, [loadCitizens]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalCitizens = citizens.length;

  const activeCitizens = citizens.filter(
    (citizen) => citizen.is_active
  ).length;

  const inactiveCitizens = citizens.filter(
    (citizen) => !citizen.is_active
  ).length;

  const verifiedCitizens = citizens.filter(
    (citizen) => citizen.is_verified
  ).length;

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
  // CREATE CITIZEN
  // ==========================================

  const openCreateModal = () => {
    setEditingCitizen(null);
    setForm(emptyForm);
    setShowPassword(false);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // ==========================================
  // EDIT CITIZEN
  // ==========================================

  const openEditModal = (citizen) => {
    setEditingCitizen(citizen);

    setForm({
      first_name: citizen.first_name || "",
      last_name: citizen.last_name || "",
      email: citizen.email || "",
      phone_number: citizen.phone_number || "",
      password: "",
      password_confirm: "",
    });

    setShowPassword(false);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCitizen(null);
    setForm(emptyForm);
  };

  // ==========================================
  // CREATE / UPDATE CITIZEN
  // ==========================================

  const saveCitizen = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

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

    if (!editingCitizen) {
      if (!form.password) {
        setError("Please enter a password.");
        return;
      }

      if (form.password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }

      if (form.password !== form.password_confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone_number: form.phone_number.trim(),
    };

    if (!editingCitizen) {
      payload.password = form.password;
      payload.password_confirm = form.password_confirm;
      payload.role = "citizen";
    }

    setSaving(true);

    try {
      if (editingCitizen) {
        await api.patch(
          `/auth/admin/users/${editingCitizen.id}/`,
          payload
        );

        setSuccess("Citizen updated successfully.");
      } else {
        await api.post(
          "/auth/admin/users/",
          payload
        );

        setSuccess("Citizen account created successfully.");
      }

      setModalOpen(false);
      setEditingCitizen(null);
      setForm(emptyForm);

      await loadCitizens();
    } catch (err) {
      console.error(
        "Citizen create/update error:",
        err.response?.data || err
      );

      setError(
        extractErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE CITIZEN
  // ==========================================

  const activateCitizen = async (citizen) => {
    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/auth/admin/users/${citizen.id}/`,
        {
          is_active: true,
        }
      );

      setSuccess(
        `${citizen.first_name} ${citizen.last_name} activated successfully.`
      );

      await loadCitizens();
    } catch (err) {
      setError(
        extractErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================
  // DEACTIVATE CITIZEN
  // ==========================================

  const deactivateCitizen = async () => {
    if (!confirmCitizen || processing) return;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/auth/admin/users/${confirmCitizen.id}/`,
        {
          is_active: false,
        }
      );

      setSuccess(
        `${confirmCitizen.first_name} ${confirmCitizen.last_name} deactivated successfully.`
      );

      setConfirmCitizen(null);

      await loadCitizens();
    } catch (err) {
      setError(
        extractErrors(err.response?.data) ||
        getApiErrorMessage(err)
      );
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================
  // DELETE CITIZEN
  // ==========================================

  const permanentlyDeleteCitizen = async () => {
    if (!deleteCitizen || processing) return;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/auth/admin/users/${deleteCitizen.id}/`
      );

      setSuccess("Citizen account deleted successfully.");

      setDeleteCitizen(null);

      await loadCitizens();
    } catch (err) {
      console.error(
        "Citizen deletion error:",
        err.response?.data || err
      );

      setError(
        extractErrors(err.response?.data) ||
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
    await loadCitizens();
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    navigate("/admin/login", { replace: true });
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
    <div className="cm-page">

      {sidebarOpen && (
        <button
          className="cm-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`cm-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="cm-brand">
          <div className="cm-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Administration</span>
          </div>

          <button
            className="cm-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="cm-sidebar-heading">
          MAIN MENU
        </div>

        <nav className="cm-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.path === "/admin/citizens";

            return (
              <button
                key={item.label}
                className={`cm-nav-item ${
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

        <div className="cm-sidebar-bottom">
          <div className="cm-admin-profile">
            <div className="cm-avatar">
              {(admin.first_name || admin.email || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>{admin.email || "Administrator"}</strong>
              <span>Super Admin</span>
            </div>
          </div>

          <button className="cm-logout" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="cm-main">

        <header className="cm-header">
          <div className="cm-header-title">
            <button
              className="cm-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>Citizen Management</h2>
              <p>Manage all registered CivicFix citizens.</p>
            </div>
          </div>

          <div className="cm-header-user">
            <div className="cm-header-avatar">A</div>

            <div>
              <strong>{admin.email || "Administrator"}</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </header>

        <section className="cm-content">

          {/* PAGE HEADING */}

          <div className="cm-page-heading">
            <div>
              <span className="cm-eyebrow">
                <span />
                PLATFORM ADMINISTRATION
              </span>

              <h1>Citizen Management</h1>

              <p>
                Create, view, update, activate, deactivate and
                manage citizen accounts.
              </p>
            </div>

            <button
              className="cm-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Citizen
            </button>
          </div>

          {/* ALERTS */}

          {error && (
            <div className="cm-alert error">
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
            <div className="cm-alert success">
              <CheckCircle2 size={17} />
              <span>{success}</span>
              <button onClick={() => setSuccess("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* STATISTICS */}

          <div className="cm-stats">

            <article className="cm-stat-card">
              <span className="blue">
                <Users size={21} />
              </span>

              <div>
                <small>Total Citizens</small>
                <strong>{totalCitizens}</strong>
              </div>
            </article>

            <article className="cm-stat-card">
              <span className="green">
                <UserCheck size={21} />
              </span>

              <div>
                <small>Active Citizens</small>
                <strong>{activeCitizens}</strong>
              </div>
            </article>

            <article className="cm-stat-card">
              <span className="orange">
                <UserX size={21} />
              </span>

              <div>
                <small>Inactive Citizens</small>
                <strong>{inactiveCitizens}</strong>
              </div>
            </article>

            <article className="cm-stat-card">
              <span className="purple">
                <ShieldCheck size={21} />
              </span>

              <div>
                <small>Verified Citizens</small>
                <strong>{verifiedCitizens}</strong>
              </div>
            </article>

          </div>

          {/* CITIZEN TABLE */}

          <section className="cm-table-card">

            <div className="cm-table-heading">
              <div>
                <h3>All Citizens</h3>
                <p>
                  View and manage registered citizen accounts.
                </p>
              </div>

              <button
                className="cm-refresh"
                onClick={refreshPage}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={loading ? "cm-spinning" : ""}
                />
                Refresh
              </button>
            </div>

            {/* SEARCH AND FILTERS */}

            <div className="cm-filters">

              <div className="cm-search">
                <Search size={18} />

                <input
                  placeholder="Search name, email or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="cm-filter">
                <Filter size={16} />

                <select
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

              <select
                className="cm-status-filter"
                value={verificationFilter}
                onChange={(event) =>
                  setVerificationFilter(event.target.value)
                }
              >
                <option value="all">All Verification</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>

            </div>

            {/* TABLE */}

            <div className="cm-table-wrapper">
              <table className="cm-table">

                <thead>
                  <tr>
                    <th>Citizen</th>
                    <th>Phone Number</th>
                    <th>Joined Date</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="6" className="cm-empty">
                        Loading citizens...
                      </td>
                    </tr>
                  ) : citizens.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="cm-empty">
                        No citizens found.
                      </td>
                    </tr>
                  ) : (
                    citizens.map((citizen) => (
                      <tr key={citizen.id}>

                        <td>
                          <div className="cm-citizen-cell">
                            <div className="cm-citizen-avatar">
                              {(citizen.first_name ||
                                citizen.email ||
                                "C")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {citizen.first_name}{" "}
                                {citizen.last_name}
                              </strong>

                              <span>{citizen.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {citizen.phone_number || "—"}
                        </td>

                        <td>
                          {formatDate(citizen.date_joined)}
                        </td>

                        <td>
                          <span
                            className={`cm-verification ${
                              citizen.is_verified
                                ? "verified"
                                : "unverified"
                            }`}
                          >
                            {citizen.is_verified ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}

                            {citizen.is_verified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`cm-status ${
                              citizen.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {citizen.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="cm-actions">

                            <button
                              title="View citizen"
                              onClick={() =>
                                setViewCitizen(citizen)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              title="Edit citizen"
                              onClick={() =>
                                openEditModal(citizen)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            {citizen.is_active ? (
                              <button
                                title="Deactivate citizen"
                                className="danger"
                                onClick={() =>
                                  setConfirmCitizen(citizen)
                                }
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                title="Activate citizen"
                                className="activate"
                                disabled={processing}
                                onClick={() =>
                                  activateCitizen(citizen)
                                }
                              >
                                <UserCheck size={16} />
                              </button>
                            )}

                            <button
                              title="Delete citizen"
                              className="danger"
                              onClick={() =>
                                setDeleteCitizen(citizen)
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

            <div className="cm-table-footer">
              <span>
                Showing {citizens.length} citizen
                {citizens.length === 1 ? "" : "s"}
              </span>

              <span>
                {verifiedCitizens} verified accounts
              </span>
            </div>

          </section>
        </section>
      </main>

      {/* ==========================================
          CREATE / EDIT CITIZEN MODAL
      ========================================== */}

      {modalOpen && (
        <div
          className="cm-modal-backdrop"
          onMouseDown={closeModal}
        >
          <form
            className="cm-modal"
            onSubmit={saveCitizen}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="cm-modal-heading">
              <div>
                <span>
                  {editingCitizen ? "EDIT CITIZEN" : "NEW CITIZEN"}
                </span>

                <h2>
                  {editingCitizen
                    ? "Update Citizen Account"
                    : "Create Citizen Account"}
                </h2>

                <p>
                  Enter the citizen account information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cm-form-grid">

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
                  disabled={Boolean(editingCitizen)}
                  required
                />
              </label>

              <label className="full">
                Phone Number

                <input
                  type="tel"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  required
                />
              </label>

              {!editingCitizen && (
                <>
                  <label className="full cm-password-field">
                    Password

                    <div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        minLength={8}
                        required
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

                  <label className="full">
                    Confirm Password

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password_confirm"
                      value={form.password_confirm}
                      onChange={handleChange}
                      minLength={8}
                      required
                    />
                  </label>
                </>
              )}

            </div>

            <div className="cm-modal-footer">

              <button
                type="button"
                className="cm-cancel"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="cm-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingCitizen
                    ? "Save Changes"
                    : "Create Citizen"}
              </button>

            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          VIEW CITIZEN DETAILS
      ========================================== */}

      {viewCitizen && (
        <div
          className="cm-modal-backdrop"
          onMouseDown={() => setViewCitizen(null)}
        >
          <div
            className="cm-view-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="cm-modal-heading">
              <div>
                <span>CITIZEN INFORMATION</span>
                <h2>Citizen Details</h2>
              </div>

              <button
                onClick={() => setViewCitizen(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cm-detail-profile">
              <div className="cm-detail-avatar">
                {(viewCitizen.first_name || "C")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h3>
                {viewCitizen.first_name}{" "}
                {viewCitizen.last_name}
              </h3>

              <span>Registered Citizen</span>
            </div>

            <div className="cm-detail-grid">

              <div>
                <MailIcon size={17} />
                <section>
                  <small>Email Address</small>
                  <strong>{viewCitizen.email}</strong>
                </section>
              </div>

              <div>
                <Phone size={17} />
                <section>
                  <small>Phone Number</small>
                  <strong>
                    {viewCitizen.phone_number || "Not provided"}
                  </strong>
                </section>
              </div>

              <div>
                <CalendarDays size={17} />
                <section>
                  <small>Registration Date</small>
                  <strong>
                    {formatDate(viewCitizen.date_joined)}
                  </strong>
                </section>
              </div>

              <div>
                <ShieldCheck size={17} />
                <section>
                  <small>Email Verification</small>
                  <strong>
                    {viewCitizen.is_verified
                      ? "Verified"
                      : "Not verified"}
                  </strong>
                </section>
              </div>

            </div>

            <div className="cm-detail-status">
              <span
                className={`cm-status ${
                  viewCitizen.is_active
                    ? "active"
                    : "inactive"
                }`}
              >
                {viewCitizen.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="cm-modal-footer">

              <button
                className="cm-cancel"
                onClick={() => setViewCitizen(null)}
              >
                Close
              </button>

              <button
                className="cm-primary-button"
                onClick={() => {
                  setViewCitizen(null);
                  openEditModal(viewCitizen);
                }}
              >
                <Pencil size={16} />
                Edit Citizen
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DEACTIVATION CONFIRMATION
      ========================================== */}

      {confirmCitizen && (
        <div className="cm-modal-backdrop">
          <div className="cm-confirm-modal">

            <div className="cm-confirm-icon">
              <AlertCircle size={25} />
            </div>

            <h3>Deactivate Citizen Account?</h3>

            <p>
              Are you sure you want to deactivate{" "}
              <strong>
                {confirmCitizen.first_name}{" "}
                {confirmCitizen.last_name}
              </strong>
              ?
            </p>

            <p className="cm-warning">
              The citizen will no longer be able to access
              their CivicFix account while it is inactive.
            </p>

            <div>
              <button
                className="cm-cancel"
                onClick={() => setConfirmCitizen(null)}
                disabled={processing}
              >
                Cancel
              </button>

              <button
                className="cm-danger-button"
                onClick={deactivateCitizen}
                disabled={processing}
              >
                {processing ? "Processing..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE CONFIRMATION
      ========================================== */}

      {deleteCitizen && (
        <div className="cm-modal-backdrop">
          <div className="cm-confirm-modal">

            <div className="cm-confirm-icon">
              <Trash2 size={25} />
            </div>

            <h3>Delete Citizen Account?</h3>

            <p>
              Are you sure you want to permanently delete{" "}
              <strong>
                {deleteCitizen.first_name}{" "}
                {deleteCitizen.last_name}
              </strong>
              ?
            </p>

            <p className="cm-warning">
              This operation may permanently remove the
              citizen account. Check related records and
              backend deletion behavior before proceeding.
            </p>

            <div>
              <button
                className="cm-cancel"
                onClick={() => setDeleteCitizen(null)}
                disabled={processing}
              >
                Cancel
              </button>

              <button
                className="cm-danger-button"
                onClick={permanentlyDeleteCitizen}
                disabled={processing}
              >
                {processing ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}