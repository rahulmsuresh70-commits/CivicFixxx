import React, { useCallback, useEffect, useState } from "react";

import {
  UserRound,
  Mail,
  ShieldCheck,
  BadgeCheck,
  RefreshCw,
  Pencil,
  Save,
  X,
  LockKeyhole,
  MapPin,
  CalendarDays,
  Info,
  AlertCircle,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";

import "./SeniorCitizenManagerProfile.css";


const displayDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
};


export default function SeniorCitizenManagerProfile() {

  const [user, setUser] = useState(null);

  const [managerProfile, setManagerProfile] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
  });

  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [passwordSaving, setPasswordSaving] = useState(false);


  // ==========================================
  // LOAD MANAGER PROFILE
  // ==========================================

  const loadProfile = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const [
        accountResponse,
        managerResponse,
      ] = await Promise.all([

        api.get("/auth/me/"),

        api.get("/senior-citizen/manager/profile/"),

      ]);

      const account = accountResponse.data || {};

      setUser(account);

      setForm({

        first_name: account.first_name || "",

        last_name: account.last_name || "",

      });

      setManagerProfile(managerResponse.data || null);

    } catch (err) {

      setError(getApiErrorMessage(err));

    } finally {

      setLoading(false);

    }

  }, []);


  useEffect(() => {

    loadProfile();

  }, [loadProfile]);


  // ==========================================
  // START EDITING
  // ==========================================

  const startEditing = () => {

    setSuccess("");

    setError("");

    setForm({

      first_name: user?.first_name || "",

      last_name: user?.last_name || "",

    });

    setEditing(true);

  };


  // ==========================================
  // CANCEL EDITING
  // ==========================================

  const cancelEditing = () => {

    setForm({

      first_name: user?.first_name || "",

      last_name: user?.last_name || "",

    });

    setEditing(false);

    setError("");

  };


  // ==========================================
  // UPDATE MANAGER PROFILE
  // ==========================================

  const saveProfile = async (event) => {

    event.preventDefault();

    if (
      !form.first_name.trim() ||
      !form.last_name.trim()
    ) {

      setError(
        "First name and last name are required."
      );

      return;

    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {

      const response = await api.patch(
        "/auth/me/",
        {

          first_name: form.first_name.trim(),

          last_name: form.last_name.trim(),

        }
      );

      const updated = response.data?.user || {

        ...user,

        first_name: form.first_name.trim(),

        last_name: form.last_name.trim(),

      };

      setUser(updated);

      setForm({

        first_name: updated.first_name || "",

        last_name: updated.last_name || "",

      });

      setEditing(false);

      setSuccess(
        response.data?.message ||
        "Profile updated successfully."
      );


      // Update cached user details

      const storedUser = localStorage.getItem(
        "civicfix_user"
      );

      if (storedUser) {

        try {

          const parsed = JSON.parse(storedUser);

          localStorage.setItem(
            "civicfix_user",
            JSON.stringify({
              ...parsed,
              ...updated,
            })
          );

        } catch {

          // Ignore malformed cached data.

        }

      }

    } catch (err) {

      setError(getApiErrorMessage(err));

    } finally {

      setSaving(false);

    }

  };


  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  const changePassword = async (event) => {

    event.preventDefault();

    setError("");

    setSuccess("");


    if (
      passwordForm.new_password.length < 8
    ) {

      setError(
        "New password must contain at least 8 characters."
      );

      return;

    }


    if (
      passwordForm.new_password !==
      passwordForm.confirm_password
    ) {

      setError(
        "New password and confirmation do not match."
      );

      return;

    }


    setPasswordSaving(true);

    try {

      const response = await api.post(
        "/auth/change-password/",
        passwordForm
      );

      setPasswordForm({

        current_password: "",

        new_password: "",

        confirm_password: "",

      });

      setSuccess(
        response.data?.message ||
        "Password changed successfully."
      );

    } catch (err) {

      setError(getApiErrorMessage(err));

    } finally {

      setPasswordSaving(false);

    }

  };


  // ==========================================
  // DISPLAY VALUES
  // ==========================================

  const fullName = [

    user?.first_name,

    user?.last_name,

  ]
    .filter(Boolean)
    .join(" ") || "Manager";


  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  const serviceAreas =
    managerProfile?.service_areas || [];


  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {

    return (

      <section className="scmp-page">

        <div className="scmp-state">

          <RefreshCw
            className="scmp-spin"
            size={20}
          />

          Loading manager profile...

        </div>

      </section>

    );

  }


  // ==========================================
  // PROFILE CONTENT
  // ==========================================

  return (

    <section className="scmp-page">

      {/* PAGE HEADING */}

      <div className="scmp-heading">

        <div>

          <div className="scmp-breadcrumb">

            Account

            <span>/</span>

            Manager Profile

          </div>

          <h1>Manager Profile</h1>

          <p>
            View and update your account information.
          </p>

        </div>


        <button
          type="button"
          className="scmp-btn scmp-btn-light"
          onClick={loadProfile}
        >

          <RefreshCw size={16} />

          Refresh

        </button>

      </div>


      {/* ERROR MESSAGE */}

      {error && (

        <div className="scmp-alert scmp-error">

          <AlertCircle size={17} />

          {error}

        </div>

      )}


      {/* SUCCESS MESSAGE */}

      {success && (

        <div className="scmp-alert scmp-success">

          <BadgeCheck size={17} />

          {success}

        </div>

      )}


      {/* PROFILE HERO */}

      <div className="scmp-hero">

        <div className="scmp-avatar">

          {initials}

        </div>


        <div className="scmp-hero-copy">

          <span className="scmp-role">

            <ShieldCheck size={13} />

            SENIOR CITIZEN MANAGER

          </span>


          <h2>{fullName}</h2>


          <p>
            {user?.email || "Email not available"}
          </p>


          <div className="scmp-statuses">

            <span>

              <BadgeCheck size={14} />

              {user?.is_verified
                ? "Verified Account"
                : "Verification pending"}

            </span>


            <span>

              <i />

              {user?.is_active === false
                ? "Inactive"
                : "Active"}

            </span>

          </div>

        </div>


        <div className="scmp-account-box">

          <small>ACCOUNT ID</small>

          <strong>
            #{user?.id ?? "—"}
          </strong>

          <span>CivicFix Manager</span>

        </div>

      </div>


      {/* PERSONAL INFORMATION */}

      <section className="scmp-card">

        <div className="scmp-card-heading">

          <div className="scmp-card-icon">

            <UserRound size={20} />

          </div>


          <div>

            <h3>Personal Information</h3>

            <p>
              Your registered account information.
            </p>

          </div>


          <button
            type="button"
            className="scmp-btn scmp-btn-primary scmp-edit-btn"
            onClick={
              editing
                ? cancelEditing
                : startEditing
            }
          >

            {editing ? (

              <>

                <X size={16} />

                Cancel

              </>

            ) : (

              <>

                <Pencil size={16} />

                Edit Profile

              </>

            )}

          </button>

        </div>


        <form onSubmit={saveProfile}>

          <div className="scmp-fields">

            {/* FIRST NAME */}

            <label className="scmp-field">

              <span>First Name</span>

              <div>

                <UserRound size={17} />

                <input
                  type="text"
                  value={form.first_name}
                  disabled={!editing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  maxLength={100}
                />

              </div>

            </label>


            {/* LAST NAME */}

            <label className="scmp-field">

              <span>Last Name</span>

              <div>

                <UserRound size={17} />

                <input
                  type="text"
                  value={form.last_name}
                  disabled={!editing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  maxLength={100}
                />

              </div>

            </label>


            {/* EMAIL */}

            <label className="scmp-field">

              <span>Email Address</span>

              <div>

                <Mail size={17} />

                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  readOnly
                />

              </div>

              <small>
                Email cannot be changed here.
              </small>

            </label>


            {/* ROLE */}

            <label className="scmp-field">

              <span>Account Role</span>

              <div>

                <ShieldCheck size={17} />

                <input
                  value="Senior Citizen Manager"
                  disabled
                  readOnly
                />

              </div>

            </label>


            {/* ACCOUNT ID */}

            <label className="scmp-field">

              <span>Account ID</span>

              <div>

                <BadgeCheck size={17} />

                <input
                  value={user?.id ?? "—"}
                  disabled
                  readOnly
                />

              </div>

            </label>


            {/* ACCOUNT STATUS */}

            <label className="scmp-field">

              <span>Account Status</span>

              <div>

                <ShieldCheck size={17} />

                <input
                  value={
                    user?.is_active === false
                      ? "Inactive"
                      : "Active"
                  }
                  disabled
                  readOnly
                />

              </div>

            </label>

          </div>


          {/* SAVE / CANCEL */}

          {editing && (

            <div className="scmp-form-actions">

              <button
                className="scmp-btn scmp-btn-primary"
                type="submit"
                disabled={saving}
              >

                {saving ? (

                  <RefreshCw
                    className="scmp-spin"
                    size={16}
                  />

                ) : (

                  <Save size={16} />

                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}

              </button>


              <button
                className="scmp-btn scmp-btn-light"
                type="button"
                onClick={cancelEditing}
              >

                Cancel

              </button>

            </div>

          )}

        </form>


        <div className="scmp-note">

          <Info size={17} />

          <div>

            <strong>Profile editing</strong>

            <p>
              First name and last name can be updated.
              Email, account role and account ID are
              read-only under the current backend permissions.
            </p>

          </div>

        </div>

      </section>


      {/* MANAGER SERVICE AREAS */}

      <section className="scmp-card">

        <div className="scmp-card-heading">

          <div className="scmp-card-icon scmp-green">

            <MapPin size={20} />

          </div>


          <div>

            <h3>Manager Service Areas</h3>

            <p>
              Districts and service areas assigned
              to your manager account.
            </p>

          </div>

        </div>


        {serviceAreas.length > 0 ? (

          <div className="scmp-area-list">

            {serviceAreas.map((area, index) => (

              <div
                className="scmp-area"
                key={area.id || index}
              >

                <MapPin size={16} />

                <span>

                  {[
                    area.district,
                    area.state,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    area.name ||
                    `Service Area ${index + 1}`}

                </span>

              </div>

            ))}

          </div>

        ) : (

          <div className="scmp-empty">

            No service areas are currently listed
            for this account.

          </div>

        )}

      </section>


      {/* ACCOUNT SECURITY */}

      <section className="scmp-card scmp-security-card">

        <div className="scmp-card-heading">

          <div className="scmp-card-icon scmp-green">

            <LockKeyhole size={20} />

          </div>


          <div>

            <h3>Account Security</h3>

            <p>
              Password and account security information.
            </p>

          </div>

        </div>


        <form
          className="scmp-password-form"
          onSubmit={changePassword}
        >

          {/* CURRENT PASSWORD */}

          <label className="scmp-field">

            <span>Current Password</span>

            <div>

              <LockKeyhole size={17} />

              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    current_password: e.target.value,
                  }))
                }
                required
              />

            </div>

          </label>


          {/* NEW PASSWORD */}

          <label className="scmp-field">

            <span>New Password</span>

            <div>

              <LockKeyhole size={17} />

              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    new_password: e.target.value,
                  }))
                }
                minLength={8}
                required
              />

            </div>

          </label>


          {/* CONFIRM PASSWORD */}

          <label className="scmp-field">

            <span>Confirm New Password</span>

            <div>

              <LockKeyhole size={17} />

              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirm_password: e.target.value,
                  }))
                }
                minLength={8}
                required
              />

            </div>

          </label>


          <div className="scmp-form-actions">

            <button
              className="scmp-btn scmp-btn-primary"
              type="submit"
              disabled={passwordSaving}
            >

              {passwordSaving ? (

                <RefreshCw
                  className="scmp-spin"
                  size={16}
                />

              ) : (

                <LockKeyhole size={16} />

              )}

              {passwordSaving
                ? "Updating..."
                : "Update Password"}

            </button>

          </div>

        </form>


        {/* ACCOUNT CREATED */}

        <div className="scmp-security-row">

          <div>

            <strong>Account created</strong>

            <p>
              {displayDate(user?.date_joined)}
            </p>

          </div>

          <CalendarDays size={18} />

        </div>

      </section>

    </section>

  );

}