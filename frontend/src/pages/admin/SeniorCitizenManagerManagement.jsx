import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  Users,
  UserCheck,
  UserX,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Lock,
  UserRound,
  Building2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";

import "./SeniorCitizenManagerManagement.css";

const API_URL = "/senior-citizen/admin/managers/";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  password_confirm: "",
  state: "",
  district: "",
};

const getName = (manager) =>
  manager.full_name ||
  `${manager.first_name || ""} ${manager.last_name || ""}`.trim() ||
  manager.email ||
  "Unknown Manager";

const getArea = (manager) => {
  const areas = manager.service_areas || [];

  return areas
    .filter((area) => area.is_active)
    .map((area) => `${area.district}, ${area.state}`)
    .join(" | ") || "No active service area";
};

const getError = (error) => {
  const data = error?.response?.data;

  if (!data) return getApiErrorMessage(error);

  if (typeof data.detail === "string") return data.detail;

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value)
        ? value.join(", ")
        : String(value);

      return `${key.replaceAll("_", " ")}: ${message}`;
    })
    .join(" | ");
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function SeniorCitizenManagerManagement() {
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [selectedManager, setSelectedManager] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState(null);

  // ==========================================
  // LOAD MANAGERS
  // ==========================================

  const loadManagers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(API_URL);

      const result = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setManagers(result);
    } catch (err) {
      setError(getError(err));
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, []);

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalManagers = managers.length;

  const activeManagers = managers.filter(
    (manager) => manager.is_active
  ).length;

  const inactiveManagers = totalManagers - activeManagers;

  const verifiedManagers = managers.filter(
    (manager) => manager.is_verified
  ).length;

  // ==========================================
  // FILTER
  // ==========================================

  const filteredManagers = useMemo(() => {
    return managers.filter((manager) => {
      const keyword = search.toLowerCase();

      const matchesSearch = [
        manager.id,
        manager.first_name,
        manager.last_name,
        manager.full_name,
        manager.email,
        manager.phone_number,
        getArea(manager),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && manager.is_active) ||
        (statusFilter === "inactive" && !manager.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [managers, search, statusFilter]);

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (manager) => {
    const area = manager.service_areas?.find(
      (item) => item.is_active
    ) || manager.service_areas?.[0];

    setEditingId(manager.id);

    setForm({
      first_name: manager.first_name || "",
      last_name: manager.last_name || "",
      email: manager.email || "",
      phone_number: manager.phone_number || "",
      password: "",
      password_confirm: "",
      state: area?.state || "",
      district: area?.district || "",
    });

    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        const payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone_number: form.phone_number.trim(),
          state: form.state.trim(),
          district: form.district.trim(),
        };

        await api.patch(
          `${API_URL}${editingId}/`,
          payload
        );

        setSuccess("Manager information updated successfully.");
      } else {
        const payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone_number: form.phone_number.trim(),
          password: form.password,
          password_confirm: form.password_confirm,
          state: form.state.trim(),
          district: form.district.trim(),
        };

        await api.post(API_URL, payload);

        setSuccess("Senior Citizen Manager created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadManagers();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE / DEACTIVATE
  // ==========================================

  const toggleStatus = async (manager) => {
    const nextStatus = !manager.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } ${getName(manager)}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`${API_URL}${manager.id}/`, {
        is_active: nextStatus,
      });

      setSuccess(
        nextStatus
          ? "Manager activated successfully."
          : "Manager deactivated successfully."
      );

      await loadManagers();
    } catch (err) {
      setError(getError(err));
    }
  };

  // ==========================================
  // DELETE / ARCHIVE
  // ==========================================

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setSaving(true);
    setError("");

    try {
      await api.delete(`${API_URL}${confirmDelete.id}/`);

      setSuccess(
        "Manager deactivated and archived successfully."
      );

      setConfirmDelete(null);

      await loadManagers();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // VIEW DETAILS
  // ==========================================

  const openDetails = (manager) => {
    setSelectedManager(manager);
    setDetailsOpen(true);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="scmm-page">

      {/* PAGE INTRO */}

      <div className="scmm-intro">
        <div>
          <span className="scmm-eyebrow">
            <ShieldCheck size={14} />
            MANAGEMENT CONTROL
          </span>

          <h1>Senior Citizen Managers</h1>

          <p>
            Manage senior citizen care managers, their accounts
            and assigned service areas.
          </p>
        </div>

        <div className="scmm-intro-actions">
          <button
            className="scmm-refresh-btn"
            onClick={loadManagers}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "scmm-spin" : ""}
            />
            Refresh
          </button>

          <button
            className="scmm-add-btn"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Add Manager
          </button>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="scmm-alert scmm-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="scmm-alert scmm-success">
          <CheckCircle size={18} />
          <span>{success}</span>

          <button onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="scmm-stats">

        <article className="scmm-stat-card">
          <div className="scmm-stat-icon blue">
            <Users size={21} />
          </div>

          <div>
            <span>Total Managers</span>
            <h2>{loading ? "—" : totalManagers}</h2>
            <small>Registered manager profiles</small>
          </div>
        </article>

        <article className="scmm-stat-card">
          <div className="scmm-stat-icon green">
            <UserCheck size={21} />
          </div>

          <div>
            <span>Active Managers</span>
            <h2>{loading ? "—" : activeManagers}</h2>
            <small>Currently active accounts</small>
          </div>
        </article>

        <article className="scmm-stat-card">
          <div className="scmm-stat-icon orange">
            <UserX size={21} />
          </div>

          <div>
            <span>Inactive Managers</span>
            <h2>{loading ? "—" : inactiveManagers}</h2>
            <small>Deactivated accounts</small>
          </div>
        </article>

        <article className="scmm-stat-card">
          <div className="scmm-stat-icon purple">
            <ShieldCheck size={21} />
          </div>

          <div>
            <span>Verified Managers</span>
            <h2>{loading ? "—" : verifiedManagers}</h2>
            <small>Verified accounts</small>
          </div>
        </article>

      </div>

      {/* MANAGER TABLE */}

      <section className="scmm-table-card">

        <div className="scmm-table-header">
          <div>
            <h3>Manager Directory</h3>
            <p>
              {filteredManagers.length} manager
              {filteredManagers.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="scmm-filters">

            <label className="scmm-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

          </div>
        </div>

        {loading ? (
          <div className="scmm-empty">
            <RefreshCw className="scmm-spin" size={25} />
            <p>Loading manager information...</p>
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="scmm-empty">
            <Users size={36} />
            <h3>No managers found</h3>
            <p>
              No manager records match your search.
            </p>

            <button onClick={openCreateModal}>
              <Plus size={16} />
              Add your first manager
            </button>
          </div>
        ) : (
          <div className="scmm-table-scroll">
            <table className="scmm-table">

              <thead>
                <tr>
                  <th>MANAGER</th>
                  <th>CONTACT</th>
                  <th>SERVICE AREA</th>
                  <th>VERIFICATION</th>
                  <th>ACCOUNT STATUS</th>
                  <th>JOINED DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredManagers.map((manager) => (
                  <tr key={manager.id}>

                    <td>
                      <div className="scmm-person">
                        <div className="scmm-avatar">
                          {getName(manager)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{getName(manager)}</strong>
                          <small>
                            Manager ID: #{manager.id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="scmm-contact">
                        <span>
                          <Mail size={13} />
                          {manager.email || "—"}
                        </span>

                        <span>
                          <Phone size={13} />
                          {manager.phone_number || "—"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="scmm-area">
                        <MapPin size={15} />
                        <span>{getArea(manager)}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`scmm-badge ${
                          manager.is_verified
                            ? "verified"
                            : "unverified"
                        }`}
                      >
                        {manager.is_verified
                          ? "Verified"
                          : "Not verified"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`scmm-badge ${
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

                    <td>{formatDate(manager.created_at)}</td>

                    <td>
                      <div className="scmm-actions">

                        <button
                          className="view"
                          title="View details"
                          onClick={() => openDetails(manager)}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="edit"
                          title="Edit manager"
                          onClick={() => openEditModal(manager)}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          className="toggle"
                          title={
                            manager.is_active
                              ? "Deactivate"
                              : "Activate"
                          }
                          onClick={() => toggleStatus(manager)}
                        >
                          {manager.is_active
                            ? <ToggleRight size={19} />
                            : <ToggleLeft size={19} />}
                        </button>

                        <button
                          className="delete"
                          title="Archive manager"
                          onClick={() =>
                            setConfirmDelete(manager)
                          }
                        >
                          <Trash2 size={16} />
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

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div
          className="scmm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="scmm-modal">

            <div className="scmm-modal-header">
              <div>
                <span>
                  {editingId ? "UPDATE MANAGER" : "NEW MANAGER"}
                </span>

                <h2>
                  {editingId
                    ? "Edit Manager Information"
                    : "Create Senior Citizen Manager"}
                </h2>

                <p>
                  Enter the manager account and service area details.
                </p>
              </div>

              <button onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="scmm-form-grid">

                <label>
                  First Name *
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="First name"
                  />
                </label>

                <label>
                  Last Name *
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="Last name"
                  />
                </label>

                <label className="full">
                  Email Address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={Boolean(editingId)}
                    placeholder="manager@example.com"
                  />
                </label>

                <label className="full">
                  Phone Number
                  <input
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </label>

                {!editingId && (
                  <>
                    <label>
                      Password *
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        placeholder="Create password"
                      />
                    </label>

                    <label>
                      Confirm Password *
                      <input
                        type="password"
                        name="password_confirm"
                        value={form.password_confirm}
                        onChange={handleChange}
                        required
                        minLength={8}
                        placeholder="Confirm password"
                      />
                    </label>
                  </>
                )}

              </div>

              <div className="scmm-form-section">
                <h3>
                  <MapPin size={17} />
                  Service Area
                </h3>

                <div className="scmm-form-grid">

                  <label>
                    State *
                    <input
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      required
                      placeholder="Enter state"
                    />
                  </label>

                  <label>
                    District *
                    <input
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      required
                      placeholder="Enter district"
                    />
                  </label>

                </div>
              </div>

              {!editingId && (
                <div className="scmm-info">
                  <ShieldCheck size={17} />
                  <span>
                    Manager accounts created by the Super Admin
                    are verified and activated automatically.
                  </span>
                </div>
              )}

              <div className="scmm-modal-footer">
                <button
                  type="button"
                  className="scmm-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="scmm-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Manager"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DETAILS MODAL */}

      {detailsOpen && selectedManager && (
        <div
          className="scmm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailsOpen(false);
            }
          }}
        >
          <div className="scmm-modal scmm-details-modal">

            <div className="scmm-modal-header">
              <div>
                <span>MANAGER PROFILE</span>
                <h2>Manager Details</h2>
                <p>Complete account information.</p>
              </div>

              <button onClick={() => setDetailsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="scmm-profile-top">
              <div className="scmm-profile-avatar">
                {getName(selectedManager)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>{getName(selectedManager)}</h3>
                <p>Senior Citizen Manager</p>

                <span
                  className={`scmm-badge ${
                    selectedManager.is_active
                      ? "active"
                      : "inactive"
                  }`}
                >
                  {selectedManager.is_active
                    ? "Active Account"
                    : "Inactive Account"}
                </span>
              </div>
            </div>

            <div className="scmm-detail-grid">

              <div>
                <Mail size={17} />
                <span>Email Address</span>
                <strong>{selectedManager.email || "—"}</strong>
              </div>

              <div>
                <Phone size={17} />
                <span>Phone Number</span>
                <strong>
                  {selectedManager.phone_number || "—"}
                </strong>
              </div>

              <div>
                <UserRound size={17} />
                <span>Manager ID</span>
                <strong>#{selectedManager.id}</strong>
              </div>

              <div>
                <ShieldCheck size={17} />
                <span>Email Verification</span>
                <strong>
                  {selectedManager.is_verified
                    ? "Verified"
                    : "Not verified"}
                </strong>
              </div>

              <div>
                <Building2 size={17} />
                <span>Service Area</span>
                <strong>{getArea(selectedManager)}</strong>
              </div>

              <div>
                <Lock size={17} />
                <span>Account Created</span>
                <strong>
                  {formatDate(selectedManager.created_at)}
                </strong>
              </div>

            </div>

            <div className="scmm-modal-footer">
              <button
                className="scmm-cancel"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>

              <button
                className="scmm-submit"
                onClick={() => {
                  setDetailsOpen(false);
                  openEditModal(selectedManager);
                }}
              >
                <Edit size={15} />
                Edit Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION */}

      {confirmDelete && (
        <div className="scmm-modal-overlay">
          <div className="scmm-confirm-modal">

            <div className="scmm-confirm-icon">
              <Trash2 size={25} />
            </div>

            <h2>Archive Manager?</h2>

            <p>
              Are you sure you want to deactivate{" "}
              <strong>{getName(confirmDelete)}</strong>?
              The manager will no longer be able to access
              their account. Historical records will be preserved.
            </p>

            <div className="scmm-modal-footer">
              <button
                className="scmm-cancel"
                onClick={() => setConfirmDelete(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="scmm-danger-submit"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? "Processing..." : "Archive Manager"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default SeniorCitizenManagerManagement;