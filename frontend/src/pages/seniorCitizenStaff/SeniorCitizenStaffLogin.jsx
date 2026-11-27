import { useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  HeartHandshake,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  CircleAlert,
  ShieldCheck,
  ClipboardList,
  Bell,
  MessageSquare,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffLogin.css";

/* =========================================
   CONFIGURATION
   -----------------------------------------
   IMPORTANT: copy these values from your
   previous login page if they are different.
========================================= */

/* Backend login endpoint (axios base URL already adds /api) */
const LOGIN_ENDPOINT = "/auth/login/";

/* Endpoint used by the other staff pages to load the user */
const CURRENT_USER_ENDPOINT = "/auth/me/";

/* Only this role may enter the staff workspace */
const STAFF_ROLE = "senior_citizen_staff";

/* Page opened after a successful login */
const DASHBOARD_PATH = "/senior-citizen/staff/dashboard";

/* =========================================
   CONSTANTS
========================================= */

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Manage assigned requests",
    text: "See and update every senior citizen request assigned to you.",
  },
  {
    icon: Bell,
    title: "Stay informed",
    text: "Receive instant notifications about new assignments and updates.",
  },
  {
    icon: MessageSquare,
    title: "Direct messaging",
    text: "Communicate securely with CivicFix users and your managers.",
  },
];

/* =========================================
   HELPERS
========================================= */

const getError = (error) => {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key.replaceAll("_", " ")}: ${value.join(", ")}`;
        }

        if (typeof value === "string") {
          return `${key.replaceAll("_", " ")}: ${value}`;
        }

        return "";
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return (
    getApiErrorMessage(error) ||
    "Unable to sign in. Please try again."
  );
};

const clearSession = () => {
  localStorage.removeItem("civicfix_access_token");
  localStorage.removeItem("civicfix_refresh_token");
  localStorage.removeItem("civicfix_user");
};

/* =========================================
   MAIN COMPONENT
========================================= */

export default function SeniorCitizenStaffLogin() {
  const navigate = useNavigate();

  /* =========================================
     STATE
  ========================================= */

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* =========================================
     FORM CHANGE
  ========================================= */

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* =========================================
     SUBMIT
  ========================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const email = form.email.trim();

    const password = form.password;

    if (!email || !password) {
      setError(
        "Please enter your email address and password."
      );

      return;
    }

    setLoading(true);

    setError("");

    try {
      /*
        POST LOGIN_ENDPOINT
        { email, password }
      */

      const response = await api.post(LOGIN_ENDPOINT, {
        email,
        password,
      });

      const data = response.data || {};

      const accessToken =
        data.access ||
        data.access_token ||
        data.tokens?.access ||
        data.token;

      const refreshToken =
        data.refresh ||
        data.refresh_token ||
        data.tokens?.refresh;

      if (!accessToken) {
        throw new Error(
          "Sign in succeeded but no access token was returned."
        );
      }

      localStorage.setItem(
        "civicfix_access_token",
        accessToken
      );

      if (refreshToken) {
        localStorage.setItem(
          "civicfix_refresh_token",
          refreshToken
        );
      }

      /*
        Use the user sent with the login response.
        If the role is missing, load it from the
        same endpoint the other staff pages use.
      */

      let user = data.user || null;

      if (!user?.role) {
        const profile = await api.get(
          CURRENT_USER_ENDPOINT
        );

        user = profile.data;
      }

      if (user?.role !== STAFF_ROLE) {
        clearSession();

        setError(
          "This sign in is only for Senior Citizen Staff accounts."
        );

        return;
      }

      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(user)
      );

      navigate(DASHBOARD_PATH, {
        replace: true,
      });
    } catch (err) {
      clearSession();

      setError(
        err?.response ? getError(err) : err?.message || getError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="scsl-page">

      {/* =====================================
          BRAND PANEL (desktop / tablet)
      ===================================== */}

      <aside className="scsl-brand-panel">

        <span className="scsl-deco scsl-deco-one" />
        <span className="scsl-deco scsl-deco-two" />

        <div className="scsl-brand-top">

          <div className="scsl-logo">
            <HeartHandshake size={26} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

        </div>

        <div className="scsl-brand-content">

          <span className="scsl-eyebrow">
            <span className="scsl-eyebrow-dot" />
            STAFF WORKSPACE
          </span>

          <h1>
            Caring for senior citizens,
            made simple.
          </h1>

          <p>
            Sign in to manage your assigned requests,
            follow updates and stay connected with
            the people who rely on your support.
          </p>

          <ul className="scsl-feature-list">

            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <li
                  key={feature.title}
                  className="scsl-feature"
                >

                  <div className="scsl-feature-icon">
                    <Icon size={19} />
                  </div>

                  <div>
                    <strong>{feature.title}</strong>
                    <span>{feature.text}</span>
                  </div>

                </li>
              );
            })}

          </ul>

        </div>

        <div className="scsl-brand-footer">
          © 2026 CivicFix. All rights reserved.
        </div>

      </aside>

      {/* =====================================
          FORM PANEL
      ===================================== */}

      <main className="scsl-form-panel">

        {/* Brand header (mobile only) */}

        <div className="scsl-mobile-brand">

          <div className="scsl-logo">
            <HeartHandshake size={24} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

        </div>

        <section className="scsl-card">

          <header className="scsl-card-header">

            <div className="scsl-card-icon">
              <LockKeyhole size={22} />
            </div>

            <h1>Welcome back</h1>

            <p>
              Sign in to your Senior Citizen Staff
              account to continue.
            </p>

          </header>

          {error && (
            <div
              className="scsl-error"
              role="alert"
            >
              <CircleAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <form
            className="scsl-form"
            onSubmit={handleSubmit}
            noValidate
          >

            <label className="scsl-field">

              <span>Email address</span>

              <div className="scsl-input-wrap">

                <Mail size={18} />

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="Enter your email address"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />

              </div>

            </label>

            <label className="scsl-field">

              <span>Password</span>

              <div className="scsl-input-wrap">

                <LockKeyhole size={18} />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="scsl-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </label>

            <button
              type="submit"
              className="scsl-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <RefreshCw
                    size={18}
                    className="scsl-spin"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}

            </button>

          </form>

          <div className="scsl-secure">
            <ShieldCheck size={16} />
            Secure access for authorised staff only.
          </div>

        </section>

        <p className="scsl-copy">
          © 2026 CivicFix. Senior Citizen Assistance Portal.
        </p>

      </main>

    </div>
  );
}