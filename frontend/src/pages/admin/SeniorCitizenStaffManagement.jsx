import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  BriefcaseBusiness,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  Power,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffManagement.css";


/* =====================================================
   API ENDPOINTS
===================================================== */

const STAFF_URL = "/senior-citizen/staff/";
const MANAGER_URL = "/senior-citizen/managers/";
const CREATE_URL = "/senior-citizen/admin/staff/";


/* =====================================================
   DESIGNATION OPTIONS
===================================================== */

const DESIGNATIONS = [
  { value: "driver", label: "Driver" },
  { value: "medical_assistant", label: "Medical Assistant" },
  { value: "care_assistant", label: "Care Assistant" },
  { value: "field_assistant", label: "Field Assistant" },
  { value: "other", label: "Other" },
];


/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
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
  manager_id: "",
};


/* =====================================================
   HELPERS
===================================================== */

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};


const getFullName = (person) => {
  const name = [
    person?.first_name,
    person?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || person?.email || "Staff Member";
};


const getInitials = (person) => {
  return getFullName(person)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};


const isActive = (person) => {
  return (
    person?.is_active !== false &&
    person?.account_is_active !== false
  );
};


const getDesignation = (value) => {
  return (
    DESIGNATIONS.find(
      (item) => item.value === value
    )?.label || value || "Not specified"
  );
};


const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};


const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return getApiErrorMessage(error);
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return `${key.replaceAll("_", " ")}: ${message}`;
    })
    .join(" | ") || getApiErrorMessage(error);
};


/* =====================================================
   COMPONENT
===================================================== */

export default function SeniorCitizenStaffManagement() {

  const navigate = useNavigate();


  /* ===================================================
     STATES
  =================================================== */

  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [designationFilter, setDesignationFilter] =
    useState("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingStaff, setEditingStaff] =
    useState(null);

  const [selectedStaff, setSelectedStaff] =
    useState(null);

  const [confirmDelete, setConfirmDelete] =
    useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [formError, setFormError] = useState("");


  /* ===================================================
     ADMIN AUTHENTICATION
  =================================================== */

  useEffect(() => {

    const token = localStorage.getItem(
      "civicfix_access_token"
    );

    let user = null;

    try {
      user = JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      user = null;
    }

    if (
      !token ||
      String(user?.role || "").toLowerCase() !== "super_admin"
    ) {
      navigate("/admin/login", {
        replace: true,
      });
    }

  }, [navigate]);


  /* ===================================================
     LOAD STAFF
  =================================================== */

  const loadStaff = useCallback(async (quiet = false) => {

    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {

      const response = await api.get(STAFF_URL);

      setStaff(getArray(response.data));

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, []);


  /* ===================================================
     LOAD MANAGERS
  =================================================== */

  const loadManagers = useCallback(async () => {

    try {

      const response = await api.get(MANAGER_URL);

      setManagers(getArray(response.data));

    } catch (err) {

      setManagers([]);
      setError(getErrorMessage(err));

    }

  }, []);


  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {

    loadStaff();
    loadManagers();

  }, [loadStaff, loadManagers]);


  /* ===================================================
     REFRESH
  =================================================== */

  const refreshPage = async () => {

    await Promise.all([
      loadStaff(true),
      loadManagers(),
    ]);

  };


  /* ===================================================
     FILTER STAFF
  =================================================== */

  const filteredStaff = useMemo(() => {

    return staff.filter((person) => {

      const searchableText = [
        getFullName(person),
        person.email,
        person.phone_number,
        person.state,
        person.district,
        person.designation,
        person.manager_email,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(
        search.trim().toLowerCase()
      );

      const active = isActive(person);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      const matchesDesignation =
        designationFilter === "all" ||
        person.designation === designationFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDesignation
      );

    });

  }, [
    staff,
    search,
    statusFilter,
    designationFilter,
  ]);


  /* ===================================================
     STATISTICS
  =================================================== */

  const totalStaff = staff.length;

  const activeStaff = staff.filter(
    (person) => isActive(person)
  ).length;

  const inactiveStaff = totalStaff - activeStaff;


  /* ===================================================
     ACTIVATE / DEACTIVATE STAFF
  =================================================== */

  const updateStaffStatus = async (person) => {

    if (!person?.id || updatingStatusId !== null) {
      return;
    }

    const currentlyActive = isActive(person);
    const nextStatus = !currentlyActive;

    const action = nextStatus
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      nextStatus
        ? `Are you sure you want to activate ${getFullName(person)}? This will allow the staff member to log in again.`
        : `Are you sure you want to deactivate ${getFullName(person)}? This will prevent the staff member from logging in.`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingStatusId(person.id);
    setError("");
    setSuccess("");

    try {

      const response = await api.patch(
        `${STAFF_URL}${person.id}/status/`,
        {
          is_active: nextStatus,
        }
      );

      const updatedStaff =
        response.data?.data || response.data;

      setStaff((previous) =>
        previous.map((item) =>
          item.id === person.id
            ? {
                ...item,
                ...updatedStaff,
                is_active: nextStatus,
                account_is_active: nextStatus,
              }
            : item
        )
      );

      if (selectedStaff?.id === person.id) {

        setSelectedStaff((previous) => ({
          ...previous,
          ...updatedStaff,
          is_active: nextStatus,
          account_is_active: nextStatus,
        }));

      }

      setSuccess(
        `${getFullName(person)} has been ${action}d successfully.`
      );

      await loadStaff(true);

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setUpdatingStatusId(null);

    }

  };


  /* ===================================================
     OPEN CREATE FORM
  =================================================== */

  const openCreateModal = () => {

    setEditingStaff(null);

    setForm({
      ...EMPTY_FORM,
      manager_id: "",
    });

    setFormError("");
    setError("");
    setSuccess("");

    setModalOpen(true);

  };


  /* ===================================================
     OPEN EDIT FORM
  =================================================== */

  const openEditModal = (person) => {

    if (!isActive(person)) {
      setError("Inactive staff cannot be edited.");
      return;
    }

    setEditingStaff(person);

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
      manager_id: "",
    });

    setFormError("");
    setError("");

    setModalOpen(true);

  };


  /* ===================================================
     FORM CHANGE
  =================================================== */

  const handleChange = (event) => {

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  /* ===================================================
     FORM VALIDATION
  =================================================== */

  const validateForm = () => {

    if (!form.first_name.trim()) {
      return "First name is required.";
    }

    if (!form.last_name.trim()) {
      return "Last name is required.";
    }

    if (!form.email.trim()) {
      return "Email address is required.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return "Please enter a valid email address.";
    }

    if (!form.phone_number.trim()) {
      return "Phone number is required.";
    }

    if (!form.state.trim()) {
      return "State is required.";
    }

    if (!form.district.trim()) {
      return "District is required.";
    }

    if (!form.designation) {
      return "Please select a designation.";
    }

    if (!editingStaff) {

      if (!form.manager_id) {
        return "Please select a Senior Citizen Manager.";
      }

      if (!form.password) {
        return "Password is required.";
      }

      if (form.password.length < 8) {
        return "Password must contain at least 8 characters.";
      }

      if (form.password !== form.password_confirm) {
        return "Passwords do not match.";
      }

    }

    return "";

  };


  /* ===================================================
     CREATE / UPDATE STAFF
  =================================================== */

  const submitStaff = async (event) => {

    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    setError("");
    setSuccess("");

    try {

      if (editingStaff) {

        const payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone_number: form.phone_number.trim(),
          state: form.state.trim(),
          district: form.district.trim(),
          designation: form.designation,
          location: form.location.trim(),
        };

        await api.patch(
          `${STAFF_URL}${editingStaff.id}/`,
          payload
        );

        setSuccess(
          "Senior Citizen Staff updated successfully."
        );

      } else {

        const payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirm: form.password_confirm,
          phone_number: form.phone_number.trim(),
          state: form.state.trim(),
          district: form.district.trim(),
          designation: form.designation,
          address: form.location.trim(),
          manager_id: Number(form.manager_id),
        };

        await api.post(
          CREATE_URL,
          payload
        );

        setSuccess(
          "Senior Citizen Staff registered successfully."
        );

      }

      setModalOpen(false);
      setEditingStaff(null);
      setForm(EMPTY_FORM);

      await loadStaff(true);

    } catch (err) {

      setFormError(getErrorMessage(err));

    } finally {

      setSaving(false);

    }

  };


  /* ===================================================
     VIEW STAFF DETAILS
  =================================================== */

  const openDetails = async (person) => {

    setSelectedStaff(person);
    setError("");

    try {

      const response = await api.get(
        `${STAFF_URL}${person.id}/`
      );

      setSelectedStaff(response.data);

    } catch (err) {

      setError(getErrorMessage(err));

    }

  };


  /* ===================================================
     DELETE STAFF
  =================================================== */

  const deleteStaff = async () => {

    if (!confirmDelete || deleting) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {

      await api.delete(
        `${STAFF_URL}${confirmDelete.id}/`
      );

      setSuccess(
        `${getFullName(confirmDelete)} deleted successfully.`
      );

      setConfirmDelete(null);

      if (selectedStaff?.id === confirmDelete.id) {
        setSelectedStaff(null);
      }

      await loadStaff(true);

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setDeleting(false);

    }

  };


  /* ===================================================
     RENDER
  =================================================== */

  return (

    <div className="scsm-page">

      {/* PAGE HEADER */}

      <div className="scsm-heading">

        <div>

          <div className="scsm-breadcrumb">
            Administration
            <span>/</span>
            Senior Citizen Staff
          </div>

          <h1>Senior Citizen Staff Management</h1>

          <p>
            Manage staff accounts, view staff information
            and monitor senior care service teams.
          </p>

        </div>

        <div className="scsm-heading-actions">

          <button
            type="button"
            className="scsm-btn scsm-btn-light"
            onClick={refreshPage}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "scsm-spin" : ""}
            />

            Refresh
          </button>

          <button
            type="button"
            className="scsm-btn scsm-btn-primary"
            onClick={openCreateModal}
          >
            <UserPlus size={17} />
            Add Staff
          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (

        <div className="scsm-alert scsm-alert-error">

          <AlertCircle size={17} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>

        </div>

      )}


      {/* SUCCESS */}

      {success && (

        <div className="scsm-alert scsm-alert-success">

          <CheckCircle2 size={17} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>

        </div>

      )}


      {/* STATISTICS */}

      <section className="scsm-stats">

        <article className="scsm-stat-card">

          <div className="scsm-stat-icon blue">
            <Users size={21} />
          </div>

          <div>
            <span>Total Staff</span>
            <h2>{loading ? "—" : totalStaff}</h2>
            <small>Registered staff profiles</small>
          </div>

        </article>


        <article className="scsm-stat-card">

          <div className="scsm-stat-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Active Staff</span>
            <h2>{loading ? "—" : activeStaff}</h2>
            <small>Currently active accounts</small>
          </div>

        </article>


        <article className="scsm-stat-card">

          <div className="scsm-stat-icon orange">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Inactive Staff</span>
            <h2>{loading ? "—" : inactiveStaff}</h2>
            <small>Inactive profiles</small>
          </div>

        </article>


        <article className="scsm-stat-card">

          <div className="scsm-stat-icon purple">
            <ShieldCheck size={21} />
          </div>

          <div>
            <span>Managers</span>
            <h2>{managers.length}</h2>
            <small>Available managers</small>
          </div>

        </article>

      </section>


      {/* STAFF TABLE */}

      <section className="scsm-table-card">

        <div className="scsm-table-header">

          <div>
            <h3>All Senior Citizen Staff</h3>

            <p>
              {filteredStaff.length} matching staff members
            </p>
          </div>


          <div className="scsm-filters">

            <label className="scsm-search">

              <Search size={17} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search staff..."
              />

            </label>


            <label className="scsm-select-wrap">

              <Filter size={15} />

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

            </label>


            <select
              className="scsm-designation-filter"
              value={designationFilter}
              onChange={(event) =>
                setDesignationFilter(event.target.value)
              }
            >

              <option value="all">
                All Designations
              </option>

              {DESIGNATIONS.map((item) => (

                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>

              ))}

            </select>

          </div>

        </div>


        {/* LOADING */}

        {loading ? (

          <div className="scsm-loading">

            <Loader2
              size={28}
              className="scsm-spin"
            />

            <p>Loading Senior Citizen Staff...</p>

          </div>

        ) : filteredStaff.length === 0 ? (

          <div className="scsm-empty">

            <div>
              <Users size={30} />
            </div>

            <h3>No staff members found</h3>

            <p>
              No staff members match your current search or filters.
            </p>

            <button
              type="button"
              className="scsm-btn scsm-btn-primary"
              onClick={openCreateModal}
            >
              <UserPlus size={16} />
              Add Staff Member
            </button>

          </div>

        ) : (

          <div className="scsm-table-scroll">

            <table className="scsm-table">

              <thead>

                <tr>
                  <th>STAFF MEMBER</th>
                  <th>CONTACT</th>
                  <th>DESIGNATION</th>
                  <th>SERVICE AREA</th>
                  <th>MANAGER</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>

              </thead>


              <tbody>

                {filteredStaff.map((person) => {

                  const active = isActive(person);
                  const updating = updatingStatusId === person.id;

                  return (

                    <tr key={person.id}>

                      <td>

                        <div className="scsm-person">

                          <div className="scsm-avatar">
                            {getInitials(person)}
                          </div>

                          <div>

                            <strong>
                              {getFullName(person)}
                            </strong>

                            <small>
                              Staff ID: #{person.id}
                            </small>

                          </div>

                        </div>

                      </td>


                      <td>

                        <div className="scsm-contact">

                          <span>
                            <Mail size={13} />
                            {person.email || "—"}
                          </span>

                          <span>
                            <Phone size={13} />
                            {person.phone_number || "—"}
                          </span>

                        </div>

                      </td>


                      <td>

                        <span className="scsm-designation">
                          {getDesignation(person.designation)}
                        </span>

                      </td>


                      <td>

                        <div className="scsm-area">

                          <MapPin size={14} />

                          <span>
                            {[
                              person.district,
                              person.state,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>

                        </div>

                      </td>


                      <td>

                        <span className="scsm-manager">
                          {person.manager_email || "—"}
                        </span>

                      </td>


                      <td>

                        <span
                          className={`scsm-status ${
                            active ? "active" : "inactive"
                          }`}
                        >
                          <span />

                          {active ? "Active" : "Inactive"}
                        </span>

                      </td>


                      <td>

                        <div className="scsm-actions">

                          <button
                            type="button"
                            title="View details"
                            onClick={() => openDetails(person)}
                          >
                            <Eye size={16} />
                          </button>


                          <button
                            type="button"
                            title="Edit staff"
                            disabled={!active || updating}
                            onClick={() => openEditModal(person)}
                          >
                            <Pencil size={16} />
                          </button>


                          {/* ACTIVATE / DEACTIVATE */}

                          <button
                            type="button"
                            className={`scsm-status-action ${
                              active ? "deactivate" : "activate"
                            }`}
                            title={
                              active
                                ? "Deactivate staff account"
                                : "Activate staff account"
                            }
                            disabled={updating || updatingStatusId !== null}
                            onClick={() => updateStaffStatus(person)}
                          >

                            {updating ? (

                              <Loader2
                                size={16}
                                className="scsm-spin"
                              />

                            ) : (

                              <Power size={16} />

                            )}

                          </button>


                          <button
                            type="button"
                            title="Delete staff"
                            className="delete"
                            disabled={updating}
                            onClick={() => setConfirmDelete(person)}
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      {modalOpen && (

        <div
          className="scsm-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setModalOpen(false);
            }

          }}
        >

          <div className="scsm-modal">

            <div className="scsm-modal-header">

              <div>

                <span>
                  {editingStaff
                    ? "UPDATE STAFF"
                    : "NEW STAFF ACCOUNT"}
                </span>

                <h2>
                  {editingStaff
                    ? "Edit Staff Details"
                    : "Register New Staff"}
                </h2>

                <p>
                  {editingStaff
                    ? "Update the selected staff information."
                    : "Create a staff account and assign a manager."}
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  !saving && setModalOpen(false)
                }
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

            </div>


            {formError && (

              <div className="scsm-form-error">

                <AlertCircle size={16} />

                <span>{formError}</span>

              </div>

            )}


            <form onSubmit={submitStaff}>

              <div className="scsm-form-grid">

                <label>
                  First Name *

                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    required
                  />
                </label>


                <label>
                  Last Name *

                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    required
                  />
                </label>


                <label>
                  Email Address *

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="staff@example.com"
                    required
                  />
                </label>


                <label>
                  Phone Number *

                  <input
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                  />
                </label>


                {!editingStaff && (
                  <>

                    <label>
                      Password *

                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        required
                      />
                    </label>


                    <label>
                      Confirm Password *

                      <input
                        type="password"
                        name="password_confirm"
                        value={form.password_confirm}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        required
                      />
                    </label>

                  </>
                )}


                <label>
                  State *

                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                    required
                  />
                </label>


                <label>
                  District *

                  <input
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    placeholder="Enter district"
                    required
                  />
                </label>


                <label>
                  Designation *

                  <select
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    required
                  >

                    {DESIGNATIONS.map((item) => (

                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>

                    ))}

                  </select>

                </label>


                {!editingStaff && (

                  <label>
                    Assign Senior Citizen Manager *

                    <select
                      name="manager_id"
                      value={form.manager_id}
                      onChange={handleChange}
                      required
                    >

                      <option value="">
                        Select Manager
                      </option>

                      {managers.map((manager) => (

                        <option
                          key={manager.id}
                          value={manager.id}
                        >
                          {manager.full_name} ({manager.email})
                        </option>

                      ))}

                    </select>

                    {managers.length === 0 && (
                      <small className="scsm-field-note">
                        No active managers are available.
                      </small>
                    )}

                  </label>

                )}


                <label className="scsm-full-field">
                  Address / Location

                  <textarea
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Enter staff address or location"
                    rows={3}
                  />

                </label>

              </div>


              <div className="scsm-modal-footer">

                <button
                  type="button"
                  className="scsm-btn scsm-btn-light"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="scsm-btn scsm-btn-primary"
                  disabled={
                    saving ||
                    (!editingStaff && managers.length === 0)
                  }
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="scsm-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    editingStaff
                      ? "Save Changes"
                      : "Create Staff"
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =================================================
          STAFF DETAILS MODAL
      ================================================= */}

      {selectedStaff && (

        <div
          className="scsm-modal-overlay"
          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {
              setSelectedStaff(null);
            }

          }}
        >

          <div className="scsm-detail-modal">

            <div className="scsm-modal-header">

              <div>
                <span>STAFF PROFILE</span>
                <h2>Staff Details</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>

            </div>


            <div className="scsm-detail-profile">

              <div className="scsm-detail-avatar">
                {getInitials(selectedStaff)}
              </div>

              <h3>{getFullName(selectedStaff)}</h3>

              <p>
                {getDesignation(selectedStaff.designation)}
              </p>

              <span
                className={`scsm-status ${
                  isActive(selectedStaff)
                    ? "active"
                    : "inactive"
                }`}
              >
                <span />

                {isActive(selectedStaff)
                  ? "Active Account"
                  : "Inactive Account"}
              </span>

            </div>


            <div className="scsm-detail-grid">

              <div>
                <Mail size={16} />
                <span>Email</span>
                <strong>
                  {selectedStaff.email || "—"}
                </strong>
              </div>


              <div>
                <Phone size={16} />
                <span>Phone</span>
                <strong>
                  {selectedStaff.phone_number || "—"}
                </strong>
              </div>


              <div>
                <MapPin size={16} />
                <span>Service Area</span>
                <strong>
                  {[
                    selectedStaff.district,
                    selectedStaff.state,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </strong>
              </div>


              <div>
                <BriefcaseBusiness size={16} />
                <span>Manager</span>
                <strong>
                  {selectedStaff.manager_email || "—"}
                </strong>
              </div>


              <div>
                <ShieldCheck size={16} />
                <span>Verified</span>
                <strong>
                  {selectedStaff.is_verified
                    ? "Verified"
                    : "Not verified"}
                </strong>
              </div>


              <div>
                <Users size={16} />
                <span>Staff ID</span>
                <strong>
                  #{selectedStaff.id}
                </strong>
              </div>


              <div className="scsm-detail-full">
                <MapPin size={16} />
                <span>Address</span>
                <strong>
                  {selectedStaff.location || "Not provided"}
                </strong>
              </div>


              <div>
                <Users size={16} />
                <span>Created</span>
                <strong>
                  {formatDate(selectedStaff.created_at)}
                </strong>
              </div>

            </div>


            <div className="scsm-modal-footer">

              <button
                type="button"
                className="scsm-btn scsm-btn-light"
                onClick={() => setSelectedStaff(null)}
              >
                Close
              </button>


              <button
                type="button"
                className={`scsm-btn ${
                  isActive(selectedStaff)
                    ? "scsm-btn-danger"
                    : "scsm-btn-primary"
                }`}
                disabled={updatingStatusId !== null}
                onClick={() => updateStaffStatus(selectedStaff)}
              >

                {updatingStatusId === selectedStaff.id ? (

                  <Loader2
                    size={16}
                    className="scsm-spin"
                  />

                ) : (

                  <Power size={16} />

                )}

                {isActive(selectedStaff)
                  ? "Deactivate Account"
                  : "Activate Account"}

              </button>


              {isActive(selectedStaff) && (

                <button
                  type="button"
                  className="scsm-btn scsm-btn-primary"
                  onClick={() => {
                    const person = selectedStaff;

                    setSelectedStaff(null);

                    openEditModal(person);
                  }}
                >
                  <Pencil size={15} />
                  Edit Staff
                </button>

              )}

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          DELETE CONFIRMATION
      ================================================= */}

      {confirmDelete && (

        <div className="scsm-modal-overlay">

          <div className="scsm-confirm-modal">

            <div className="scsm-confirm-icon">
              <Trash2 size={24} />
            </div>

            <h2>Delete Staff Account?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>
                {getFullName(confirmDelete)}
              </strong>
              ? The staff profile will be deleted and
              the associated account deactivated.
            </p>


            <div className="scsm-modal-footer">

              <button
                type="button"
                className="scsm-btn scsm-btn-light"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>


              <button
                type="button"
                className="scsm-btn scsm-btn-danger"
                disabled={deleting}
                onClick={deleteStaff}
              >

                {deleting ? (
                  <>
                    <Loader2
                      size={16}
                      className="scsm-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Staff
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}