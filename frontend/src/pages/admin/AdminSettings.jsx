import React, { useCallback, useEffect, useState } from "react";
import {
  Settings,
  User,
  ShieldCheck,
  LockKeyhole,
  Mail,
  CalendarDays,
  BadgeCheck,
  UserRound,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ChevronRight,
  Info,
} from "lucide-react";

import api from "../../api/axios";
import "./AdminSettings.css";

const PROFILE_URL = "/auth/me/";
const CHANGE_PASSWORD_URL = "/auth/change-password/";

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;

  if (data.message) return data.message;

  const messages = Object.entries(data)
    .map(([field, errors]) => {
      const message = Array.isArray(errors)
        ? errors.join(" ")
        : String(errors);

      return `${field.replaceAll("_", " ")}: ${message}`;
    })
    .filter(Boolean);

  return messages.join(" ") || "Unable to complete the request.";
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getRoleLabel = (role) => {
  const roles = {
    super_admin: "Super Administrator",
    manager: "Department Manager",
    staff: "Department Staff",
    citizen: "Citizen",
    senior_citizen_manager: "Senior Citizen Manager",
    senior_citizen_staff: "Senior Citizen Staff",
  };

  return roles[role] || role || "Administrator";
};

const AdminSettings = () => {
  const [activeSection, setActiveSection] = useState("profile");

  const [profile, setProfile] = useState({
    id: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    is_verified: false,
    google_linked: false,
    date_joined: "",
  });

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(PROFILE_URL);

      const user = response.data;

      setProfile(user);

      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
      });

      const storedUser = localStorage.getItem("civicfix_user");

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          localStorage.setItem(
            "civicfix_user",
            JSON.stringify({
              ...parsedUser,
              ...user,
            })
          );
        } catch {
          // Keep the existing stored user if its format is invalid.
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!success) return undefined;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [success]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (
      !profileForm.first_name.trim() ||
      !profileForm.last_name.trim()
    ) {
      setError("First name and last name are required.");
      return;
    }

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      const response = await api.patch(PROFILE_URL, {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
      });

      const updatedUser = response.data?.user || {
        ...profile,
        ...profileForm,
      };

      setProfile(updatedUser);

      setProfileForm({
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
      });

      const storedUser = localStorage.getItem("civicfix_user");

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          localStorage.setItem(
            "civicfix_user",
            JSON.stringify({
              ...parsedUser,
              ...updatedUser,
            })
          );
        } catch {
          // Do not interrupt a successful backend update.
        }
      }

      setSuccess(
        response.data?.message || "Profile updated successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      setError("Please complete all password fields.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New password and confirmation password do not match.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    try {
      setChangingPassword(true);
      setError("");
      setSuccess("");

      const response = await api.post(CHANGE_PASSWORD_URL, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setSuccess(
        response.data?.message || "Password changed successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const navigateSection = (section) => {
    setActiveSection(section);
    setError("");
    setSuccess("");
  };

  const resetProfileForm = () => {
    setProfileForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
    });

    setError("");
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });

    setError("");
  };

  const renderPasswordInput = (
    label,
    name,
    visibilityKey,
    placeholder
  ) => (
    <div className="as-form-group">
      <label htmlFor={`as-${name}`}>{label}</label>

      <div className="as-password-input">
        <LockKeyhole size={17} />

        <input
          id={`as-${name}`}
          type={showPasswords[visibilityKey] ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={passwordForm[name]}
          onChange={handlePasswordChange}
          autoComplete="new-password"
          required
        />

        <button
          type="button"
          onClick={() => togglePasswordVisibility(visibilityKey)}
          aria-label={
            showPasswords[visibilityKey]
              ? "Hide password"
              : "Show password"
          }
        >
          {showPasswords[visibilityKey] ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="as-page">
        <div className="as-loading">
          <Loader2 size={32} className="as-spinner" />
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="as-page">
      <div className="as-header">
        <div>
          <div className="as-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span>Settings</span>
          </div>

          <h1>Settings</h1>

          <p>
            Manage your administrator profile and account security.
          </p>
        </div>

        <button
          type="button"
          className="as-refresh-btn"
          onClick={loadProfile}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="as-alert as-alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="as-alert as-alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="as-layout">
        <aside className="as-sidebar">
          <div className="as-sidebar-heading">
            <Settings size={18} />
            <span>Account Settings</span>
          </div>

          <button
            type="button"
            className={
              activeSection === "profile" ? "as-nav-item active" : "as-nav-item"
            }
            onClick={() => navigateSection("profile")}
          >
            <UserRound size={18} />
            <span>My Profile</span>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={
              activeSection === "security" ? "as-nav-item active" : "as-nav-item"
            }
            onClick={() => navigateSection("security")}
          >
            <ShieldCheck size={18} />
            <span>Security</span>
            <ChevronRight size={16} />
          </button>

          <div className="as-sidebar-divider" />

          <div className="as-sidebar-note">
            <div className="as-sidebar-note-icon">
              <Info size={17} />
            </div>

            <div>
              <strong>Account information</strong>
              <p>
                Your email and administrator role are managed by
                CivicFix authentication.
              </p>
            </div>
          </div>
        </aside>

        <main className="as-content">
          {activeSection === "profile" && (
            <>
              <section className="as-profile-card">
                <div className="as-profile-cover" />

                <div className="as-profile-main">
                  <div className="as-profile-avatar">
                    {profile.first_name?.charAt(0)?.toUpperCase() || "A"}
                    {profile.last_name?.charAt(0)?.toUpperCase() || ""}
                  </div>

                  <div className="as-profile-heading">
                    <h2>
                      {`${profile.first_name || ""} ${
                        profile.last_name || ""
                      }`.trim() || "Administrator"}
                    </h2>

                    <p>{profile.email}</p>

                    <div className="as-profile-badges">
                      <span className="as-role-badge">
                        <ShieldCheck size={13} />
                        {getRoleLabel(profile.role)}
                      </span>

                      {profile.is_verified && (
                        <span className="as-verified-badge">
                          <BadgeCheck size={13} />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="as-section-card">
                <div className="as-section-heading">
                  <div className="as-section-icon">
                    <User size={19} />
                  </div>

                  <div>
                    <h2>Personal Information</h2>
                    <p>Update your administrator profile details.</p>
                  </div>
                </div>

                <form
                  className="as-form"
                  onSubmit={handleProfileSubmit}
                >
                  <div className="as-form-grid">
                    <div className="as-form-group">
                      <label htmlFor="as-first-name">First Name</label>

                      <input
                        id="as-first-name"
                        type="text"
                        name="first_name"
                        placeholder="Enter first name"
                        value={profileForm.first_name}
                        onChange={handleProfileChange}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="as-form-group">
                      <label htmlFor="as-last-name">Last Name</label>

                      <input
                        id="as-last-name"
                        type="text"
                        name="last_name"
                        placeholder="Enter last name"
                        value={profileForm.last_name}
                        onChange={handleProfileChange}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="as-form-group as-full-width">
                      <label htmlFor="as-email">Email Address</label>

                      <div className="as-readonly-input">
                        <Mail size={17} />

                        <input
                          id="as-email"
                          type="email"
                          value={profile.email || ""}
                          readOnly
                        />

                        <span>Read only</span>
                      </div>

                      <small>
                        Email changes are not supported by the current
                        profile endpoint.
                      </small>
                    </div>
                  </div>

                  <div className="as-form-actions">
                    <button
                      type="button"
                      className="as-secondary-btn"
                      onClick={resetProfileForm}
                      disabled={savingProfile}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="as-primary-btn"
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 size={17} className="as-spinner" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={17} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>

              <section className="as-section-card">
                <div className="as-section-heading">
                  <div className="as-section-icon as-security-icon">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <h2>Account Information</h2>
                    <p>Your CivicFix account details and status.</p>
                  </div>
                </div>

                <div className="as-account-grid">
                  <div className="as-account-item">
                    <div className="as-account-item-icon">
                      <KeyRound size={17} />
                    </div>

                    <div>
                      <span>Account ID</span>
                      <strong>{profile.id || "Not available"}</strong>
                    </div>
                  </div>

                  <div className="as-account-item">
                    <div className="as-account-item-icon">
                      <ShieldCheck size={17} />
                    </div>

                    <div>
                      <span>Account Role</span>
                      <strong>{getRoleLabel(profile.role)}</strong>
                    </div>
                  </div>

                  <div className="as-account-item">
                    <div className="as-account-item-icon">
                      <CalendarDays size={17} />
                    </div>

                    <div>
                      <span>Joined Date</span>
                      <strong>{formatDate(profile.date_joined)}</strong>
                    </div>
                  </div>

                  <div className="as-account-item">
                    <div className="as-account-item-icon">
                      <BadgeCheck size={17} />
                    </div>

                    <div>
                      <span>Email Verification</span>
                      <strong
                        className={
                          profile.is_verified
                            ? "as-account-status verified"
                            : "as-account-status pending"
                        }
                      >
                        {profile.is_verified ? "Verified" : "Not verified"}
                      </strong>
                    </div>
                  </div>

                  <div className="as-account-item">
                    <div className="as-account-item-icon">
                      <User size={17} />
                    </div>

                    <div>
                      <span>Google Account</span>
                      <strong>
                        {profile.google_linked ? "Connected" : "Not connected"}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeSection === "security" && (
            <>
              <section className="as-security-banner">
                <div className="as-security-banner-icon">
                  <ShieldCheck size={27} />
                </div>

                <div>
                  <h2>Account Security</h2>
                  <p>
                    Keep your CivicFix administrator account protected
                    by using a strong, unique password.
                  </p>
                </div>
              </section>

              <section className="as-section-card">
                <div className="as-section-heading">
                  <div className="as-section-icon as-security-icon">
                    <LockKeyhole size={19} />
                  </div>

                  <div>
                    <h2>Change Password</h2>
                    <p>
                      Enter your current password and choose a new password.
                    </p>
                  </div>
                </div>

                <form
                  className="as-form"
                  onSubmit={handlePasswordSubmit}
                >
                  <div className="as-password-fields">
                    {renderPasswordInput(
                      "Current Password",
                      "current_password",
                      "current",
                      "Enter current password"
                    )}

                    {renderPasswordInput(
                      "New Password",
                      "new_password",
                      "new",
                      "Enter new password"
                    )}

                    {renderPasswordInput(
                      "Confirm New Password",
                      "confirm_password",
                      "confirm",
                      "Re-enter new password"
                    )}
                  </div>

                  <div className="as-password-guidelines">
                    <div>
                      <Info size={16} />
                      <strong>Password requirements</strong>
                    </div>

                    <ul>
                      <li>Use at least 8 characters.</li>
                      <li>Choose a password that is difficult to guess.</li>
                      <li>Do not reuse passwords from other accounts.</li>
                      <li>Both new password fields must match.</li>
                    </ul>
                  </div>

                  <div className="as-form-actions">
                    <button
                      type="button"
                      className="as-secondary-btn"
                      onClick={resetPasswordForm}
                      disabled={changingPassword}
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      className="as-primary-btn"
                      disabled={changingPassword}
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 size={17} className="as-spinner" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={17} />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>

              <section className="as-security-info">
                <div className="as-security-info-icon">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <h3>Your account is protected</h3>
                  <p>
                    Password changes are verified by the CivicFix
                    backend. Your current password must be correct
                    before a new password can be saved.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;