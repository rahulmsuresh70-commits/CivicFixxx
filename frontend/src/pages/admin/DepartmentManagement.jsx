
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserRound,
  Mail,
  CalendarDays,
  FileText,
  Hash,
  ChevronDown,
  MapPin,
  Loader2,
  Filter,
  BriefcaseBusiness,
} from "lucide-react";

import api from "../../api/axios";

import "./DepartmentManagement.css";

const DEPARTMENTS_URL = "/departments/";
const MANAGERS_URL = "/departments/admin/managers/";

const initialForm = {
  name: "",
  code: "",
  description: "",
  manager: "",
  is_active: true,
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;
  if (data.message) return data.message;

  const firstError = Object.values(data).flat(Infinity)[0];

  return typeof firstError === "string"
    ? firstError
    : "Please check the entered information.";
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getManagerName = (manager, managers = []) => {
  if (!manager) return null;

  if (typeof manager === "object") {
    return (
      `${manager.first_name || ""} ${manager.last_name || ""}`.trim() ||
      manager.email ||
      "Assigned Manager"
    );
  }

  const found = managers.find(
    (item) => String(item.id) === String(manager)
  );

  if (!found) return `Manager #${manager}`;

  return (
    `${found.first_name || ""} ${found.last_name || ""}`.trim() ||
    found.email ||
    "Assigned Manager"
  );
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");

  const [modalType, setModalType] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  // --------------------------------------------------
  // LOAD DEPARTMENTS AND MANAGERS
  // --------------------------------------------------

  const loadDepartments = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get(DEPARTMENTS_URL);

      const departmentData = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setDepartments(departmentData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const response = await api.get(MANAGERS_URL);

      const managerData = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setManagers(managerData);
    } catch (err) {
      console.error("Unable to load department managers:", err);
    }
  }, []);

  const loadPageData = useCallback(async () => {
    await Promise.all([
      loadDepartments(),
      loadManagers(),
    ]);
  }, [loadDepartments, loadManagers]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // --------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------

  const showSuccess = (message) => {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const total = departments.length;

    const active = departments.filter(
      (department) => department.is_active
    ).length;

    const inactive = total - active;

    const assignedManagers = departments.filter(
      (department) => department.manager
    ).length;

    return [
      {
        title: "Total Departments",
        value: total,
        description: "Registered departments",
        icon: Building2,
        color: "blue",
      },
      {
        title: "Active Departments",
        value: active,
        description: "Currently operational",
        icon: CheckCircle2,
        color: "green",
      },
      {
        title: "Inactive Departments",
        value: inactive,
        description: "Currently unavailable",
        icon: AlertCircle,
        color: "orange",
      },
      {
        title: "Assigned Managers",
        value: assignedManagers,
        description: "Departments with managers",
        icon: ShieldCheck,
        color: "purple",
      },
    ];
  }, [departments]);

  // --------------------------------------------------
  // FILTER DEPARTMENTS
  // --------------------------------------------------

  const filteredDepartments = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return departments.filter((department) => {
      const managerName = getManagerName(
        department.manager,
        managers
      );

      const matchesSearch =
        !search ||
        department.name?.toLowerCase().includes(search) ||
        department.code?.toLowerCase().includes(search) ||
        department.description?.toLowerCase().includes(search) ||
        managerName?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && department.is_active) ||
        (statusFilter === "inactive" && !department.is_active);

      const matchesManager =
        managerFilter === "all" ||
        (managerFilter === "assigned" && Boolean(department.manager)) ||
        (managerFilter === "unassigned" && !department.manager);

      return matchesSearch && matchesStatus && matchesManager;
    });
  }, [
    departments,
    managers,
    searchTerm,
    statusFilter,
    managerFilter,
  ]);

  // --------------------------------------------------
  // OPEN MODALS
  // --------------------------------------------------

  const openAddModal = () => {
    setForm(initialForm);
    setFormError("");
    setSelectedDepartment(null);
    setModalType("add");
  };

  const openEditModal = (department) => {
    setSelectedDepartment(department);

    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
      manager: department.manager
        ? String(
            typeof department.manager === "object"
              ? department.manager.id
              : department.manager
          )
        : "",
      is_active: department.is_active ?? true,
    });

    setFormError("");
    setModalType("edit");
  };

  const openViewModal = (department) => {
    setSelectedDepartment(department);
    setModalType("view");
  };

  const closeModal = () => {
    if (submitting) return;

    setModalType(null);
    setSelectedDepartment(null);
    setForm(initialForm);
    setFormError("");
  };

  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Department name is required.";
    }

    if (!form.code.trim()) {
      return "Department code is required.";
    }

    return "";
  };

  // --------------------------------------------------
  // CREATE / UPDATE DEPARTMENT
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    setError("");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      manager: form.manager
        ? Number(form.manager)
        : null,
      is_active: Boolean(form.is_active),
    };

    try {
      if (modalType === "add") {
        await api.post(DEPARTMENTS_URL, payload);

        showSuccess("Department created successfully.");
      } else {
        await api.patch(
          `${DEPARTMENTS_URL}${selectedDepartment.id}/`,
          payload
        );

        showSuccess("Department updated successfully.");
      }

      setModalType(null);
      setSelectedDepartment(null);
      setForm(initialForm);

      await loadDepartments(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // ACTIVATE / DEACTIVATE
  // --------------------------------------------------

  const handleStatusToggle = async (department) => {
    const nextStatus = !department.is_active;

    const action = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${department.name}"?`
    );

    if (!confirmed) return;

    setUpdatingStatusId(department.id);
    setError("");

    try {
      await api.patch(
        `${DEPARTMENTS_URL}${department.id}/`,
        {
          is_active: nextStatus,
        }
      );

      setDepartments((previous) =>
        previous.map((item) =>
          item.id === department.id
            ? { ...item, is_active: nextStatus }
            : item
        )
      );

      if (
        selectedDepartment?.id === department.id
      ) {
        setSelectedDepartment((previous) => ({
          ...previous,
          is_active: nextStatus,
        }));
      }

      showSuccess(
        `Department ${nextStatus ? "activated" : "deactivated"} successfully.`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="adm-dept-page">

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="adm-dept-toast success">
          <CheckCircle2 size={19} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="adm-dept-toast error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* PAGE HEADING */}
      <div className="adm-dept-heading">

        <div className="adm-dept-heading-content">
          <div className="adm-dept-breadcrumb">
            <span>Administration</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-current">
              Departments
            </span>
          </div>

          <h1>Department Management</h1>

          <p>
            Manage departments, assign managers and monitor
            department operations across CivicFix.
          </p>
        </div>

        <div className="adm-dept-heading-actions">
          <button
            type="button"
            className="adm-dept-btn secondary"
            onClick={() => loadDepartments(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "adm-dept-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="adm-dept-btn primary"
            onClick={openAddModal}
          >
            <Plus size={18} />
            Add Department
          </button>
        </div>

      </div>

      {/* STATISTICS */}
      <div className="adm-dept-stats-grid">

        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className="adm-dept-stat-card"
              key={stat.title}
            >
              <div className="adm-dept-stat-content">
                <div className="adm-dept-stat-info">
                  <span>{stat.title}</span>
                  <h2>{stat.value}</h2>
                  <small>{stat.description}</small>
                </div>

                <div
                  className={`adm-dept-stat-icon ${stat.color}`}
                >
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* DEPARTMENT TABLE CARD */}
      <section className="adm-dept-table-card">

        <div className="adm-dept-table-header">

          <div>
            <h2>All Departments</h2>

            <p>
              {filteredDepartments.length} matching departments
            </p>
          </div>

          <div className="adm-dept-table-controls">

            <div className="adm-dept-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="adm-dept-select-wrap">
              <Filter size={16} />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown size={15} />
            </div>

            <div className="adm-dept-select-wrap manager-filter">
              <Users size={16} />

              <select
                value={managerFilter}
                onChange={(event) =>
                  setManagerFilter(event.target.value)
                }
                aria-label="Filter by manager"
              >
                <option value="all">All Managers</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>

              <ChevronDown size={15} />
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="adm-dept-table-scroll">

          <table className="adm-dept-table">

            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>DEPARTMENT CODE</th>
                <th>MANAGER</th>
                <th>DESCRIPTION</th>
                <th>CREATED DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-dept-loading">
                      <Loader2 className="adm-dept-spin" size={27} />
                      <span>Loading departments...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-dept-empty">
                      <div className="adm-dept-empty-icon">
                        <Building2 size={30} />
                      </div>

                      <h3>No departments found</h3>

                      <p>
                        {searchTerm ||
                        statusFilter !== "all" ||
                        managerFilter !== "all"
                          ? "Try changing your search or filters."
                          : "Start by adding your first department."}
                      </p>

                      {!searchTerm &&
                        statusFilter === "all" &&
                        managerFilter === "all" && (
                          <button
                            type="button"
                            className="adm-dept-btn primary"
                            onClick={openAddModal}
                          >
                            <Plus size={17} />
                            Add Department
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((department) => {
                  const managerName = getManagerName(
                    department.manager,
                    managers
                  );

                  return (
                    <tr key={department.id}>

                      {/* DEPARTMENT */}
                      <td>
                        <div className="adm-dept-name-cell">

                          <div className="adm-dept-avatar">
                            <Building2 size={19} />
                          </div>

                          <div>
                            <strong>{department.name}</strong>
                            <span>
                              Department ID: #{department.id}
                            </span>
                          </div>

                        </div>
                      </td>

                      {/* CODE */}
                      <td>
                        <span className="adm-dept-code">
                          {department.code}
                        </span>
                      </td>

                      {/* MANAGER */}
                      <td>
                        {managerName ? (
                          <div className="adm-dept-manager-cell">
                            <div className="adm-dept-manager-avatar">
                              <UserRound size={16} />
                            </div>

                            <div>
                              <strong>{managerName}</strong>

                              <span>
                                {typeof department.manager === "object"
                                  ? department.manager.email || "Department Manager"
                                  : "Department Manager"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="adm-dept-unassigned">
                            Not assigned
                          </span>
                        )}
                      </td>

                      {/* DESCRIPTION */}
                      <td>
                        <span className="adm-dept-description">
                          {department.description?.trim()
                            ? department.description.length > 45
                              ? `${department.description.slice(0, 45)}...`
                              : department.description
                            : "No description"}
                        </span>
                      </td>

                      {/* DATE */}
                      <td>
                        <div className="adm-dept-date">
                          <CalendarDays size={15} />
                          {formatDate(department.created_at)}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`adm-dept-status ${
                            department.is_active
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          <span className="status-dot" />
                          {department.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div className="adm-dept-actions">

                          <button
                            type="button"
                            className="adm-dept-action-btn view"
                            title="View department"
                            onClick={() =>
                              openViewModal(department)
                            }
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            className="adm-dept-action-btn edit"
                            title="Edit department"
                            onClick={() =>
                              openEditModal(department)
                            }
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            className={`adm-dept-action-btn power ${
                              department.is_active
                                ? "deactivate"
                                : "activate"
                            }`}
                            title={
                              department.is_active
                                ? "Deactivate department"
                                : "Activate department"
                            }
                            disabled={
                              updatingStatusId === department.id
                            }
                            onClick={() =>
                              handleStatusToggle(department)
                            }
                          >
                            {updatingStatusId === department.id ? (
                              <Loader2
                                size={16}
                                className="adm-dept-spin"
                              />
                            ) : (
                              <Power size={17} />
                            )}
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>
          </table>

        </div>

        {/* TABLE FOOTER */}
        {!loading && filteredDepartments.length > 0 && (
          <div className="adm-dept-table-footer">
            <span>
              Showing {filteredDepartments.length} of{" "}
              {departments.length} departments
            </span>

            <span className="adm-dept-footer-note">
              CivicFix Administration
            </span>
          </div>
        )}

      </section>

      {/* ==========================================
          ADD / EDIT DEPARTMENT MODAL
      ========================================== */}

      {(modalType === "add" || modalType === "edit") && (
        <div
          className="adm-dept-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="adm-dept-modal">

            <div className="adm-dept-modal-header">

              <div className="adm-dept-modal-title-icon">
                <Building2 size={22} />
              </div>

              <div>
                <h2>
                  {modalType === "add"
                    ? "Add New Department"
                    : "Edit Department"}
                </h2>

                <p>
                  {modalType === "add"
                    ? "Enter the details to create a new department."
                    : "Update department information and manager assignment."}
                </p>
              </div>

              <button
                type="button"
                className="adm-dept-modal-close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="adm-dept-modal-body">

                {formError && (
                  <div className="adm-dept-form-error">
                    <AlertCircle size={17} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="adm-dept-form-grid">

                  {/* DEPARTMENT NAME */}
                  <div className="adm-dept-form-group full">
                    <label htmlFor="department-name">
                      Department Name
                      <span>*</span>
                    </label>

                    <div className="adm-dept-input-wrap">
                      <Building2 size={17} />

                      <input
                        id="department-name"
                        name="name"
                        type="text"
                        placeholder="Enter department name"
                        value={form.name}
                        onChange={handleFormChange}
                        maxLength={150}
                        required
                      />
                    </div>
                  </div>

                  {/* DEPARTMENT CODE */}
                  <div className="adm-dept-form-group">
                    <label htmlFor="department-code">
                      Department Code
                      <span>*</span>
                    </label>

                    <div className="adm-dept-input-wrap">
                      <Hash size={17} />

                      <input
                        id="department-code"
                        name="code"
                        type="text"
                        placeholder="Example: HEALTH"
                        value={form.code}
                        onChange={handleFormChange}
                        maxLength={50}
                        required
                      />
                    </div>
                  </div>

                  {/* MANAGER */}
                  <div className="adm-dept-form-group">
                    <label htmlFor="department-manager">
                      Assign Department Manager
                    </label>

                    <div className="adm-dept-input-wrap select">
                      <UserRound size={17} />

                      <select
                        id="department-manager"
                        name="manager"
                        value={form.manager}
                        onChange={handleFormChange}
                      >
                        <option value="">
                          No manager assigned
                        </option>

                        {managers
                          .filter((manager) => {
                            if (!manager.is_active) return false;

                            const assignedDepartment =
                              manager.department?.id;

                            const currentManagerId =
                              modalType === "edit"
                                ? Number(form.manager)
                                : null;

                            return (
                              !assignedDepartment ||
                              currentManagerId === manager.id
                            );
                          })
                          .map((manager) => (
                            <option
                              key={manager.id}
                              value={manager.id}
                            >
                              {`${manager.first_name || ""} ${
                                manager.last_name || ""
                              }`.trim() || manager.email}
                              {" — "}
                              {manager.email}
                            </option>
                          ))}
                      </select>

                      <ChevronDown size={16} />
                    </div>

                    <small>
                      Only active managers without another department
                      assignment are available.
                    </small>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="adm-dept-form-group full">
                    <label htmlFor="department-description">
                      Department Description
                    </label>

                    <div className="adm-dept-textarea-wrap">
                      <FileText size={17} />

                      <textarea
                        id="department-description"
                        name="description"
                        placeholder="Describe the department and its responsibilities..."
                        value={form.description}
                        onChange={handleFormChange}
                        rows={4}
                      />
                    </div>
                  </div>

                </div>

                {/* STATUS */}
                <label className="adm-dept-checkbox-row">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleFormChange}
                  />

                  <span className="adm-dept-custom-checkbox">
                    <CheckCircle2 size={15} />
                  </span>

                  <span>
                    <strong>Active Department</strong>
                    <small>
                      This department is available for operations.
                    </small>
                  </span>
                </label>

              </div>

              <div className="adm-dept-modal-footer">

                <button
                  type="button"
                  className="adm-dept-btn secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="adm-dept-btn primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="adm-dept-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      {modalType === "add" ? (
                        <Plus size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}

                      {modalType === "add"
                        ? "Create Department"
                        : "Save Changes"}
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          VIEW DEPARTMENT MODAL
      ========================================== */}

      {modalType === "view" && selectedDepartment && (
        <div
          className="adm-dept-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="adm-dept-modal adm-dept-view-modal">

            <div className="adm-dept-modal-header">

              <div className="adm-dept-modal-title-icon">
                <Building2 size={22} />
              </div>

              <div>
                <h2>Department Details</h2>
                <p>Complete department information.</p>
              </div>

              <button
                type="button"
                className="adm-dept-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

            </div>

            <div className="adm-dept-modal-body">

              <div className="adm-dept-view-banner">
                <div className="adm-dept-view-avatar">
                  <Building2 size={29} />
                </div>

                <div>
                  <h3>{selectedDepartment.name}</h3>

                  <span>
                    Department ID: #{selectedDepartment.id}
                  </span>
                </div>

                <span
                  className={`adm-dept-status ${
                    selectedDepartment.is_active
                      ? "active"
                      : "inactive"
                  }`}
                >
                  <span className="status-dot" />

                  {selectedDepartment.is_active
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <div className="adm-dept-details-grid">

                <div className="adm-dept-detail-item">
                  <span>
                    <Hash size={16} />
                    Department Code
                  </span>

                  <strong>{selectedDepartment.code}</strong>
                </div>

                <div className="adm-dept-detail-item">
                  <span>
                    <UserRound size={16} />
                    Assigned Manager
                  </span>

                  <strong>
                    {getManagerName(
                      selectedDepartment.manager,
                      managers
                    ) || "Not assigned"}
                  </strong>
                </div>

                <div className="adm-dept-detail-item">
                  <span>
                    <CalendarDays size={16} />
                    Created Date
                  </span>

                  <strong>
                    {formatDate(selectedDepartment.created_at)}
                  </strong>
                </div>

                <div className="adm-dept-detail-item">
                  <span>
                    <RefreshCw size={16} />
                    Last Updated
                  </span>

                  <strong>
                    {formatDate(selectedDepartment.updated_at)}
                  </strong>
                </div>

                <div className="adm-dept-detail-item full">
                  <span>
                    <FileText size={16} />
                    Department Description
                  </span>

                  <p>
                    {selectedDepartment.description?.trim() ||
                      "No description available."}
                  </p>
                </div>

              </div>

            </div>

            <div className="adm-dept-modal-footer">

              <button
                type="button"
                className="adm-dept-btn secondary"
                onClick={closeModal}
              >
                Close
              </button>

              <button
                type="button"
                className="adm-dept-btn primary"
                onClick={() => openEditModal(selectedDepartment)}
              >
                <Pencil size={17} />
                Edit Department
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentManagement;
