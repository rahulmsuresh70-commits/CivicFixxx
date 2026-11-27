
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  Settings,
} from "lucide-react";

import api, { getApiErrorMessage } from "../../api/axios";

import "./SuperAdminLogin.css";

export default function SuperAdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage(
        "Please enter your email address and password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/admin/login/",
        {
          email: email.trim().toLowerCase(),
          password,
        }
      );

      const data = response.data;

      if (!data.access || !data.refresh || !data.user) {
        throw new Error(
          "Invalid login response received from server."
        );
      }

      if (
        String(data.user.role).toLowerCase() !==
        "super_admin"
      ) {
        throw new Error(
          "You are not authorized to access the Admin Portal."
        );
      }

      // Store authentication tokens
      localStorage.setItem(
        "civicfix_access_token",
        data.access
      );

      localStorage.setItem(
        "civicfix_refresh_token",
        data.refresh
      );

      // Store authenticated administrator
      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(data.user)
      );

      // Open admin dashboard
      navigate("/admin/dashboard", {
        replace: true,
      });

    } catch (error) {
      setErrorMessage(
        error.response
          ? getApiErrorMessage(error)
          : error.message || "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">

      <div className="admin-login-background">
        <div className="admin-login-orb admin-orb-one" />
        <div className="admin-login-orb admin-orb-two" />
      </div>

      <div className="admin-login-container">

        {/* HEADER */}

        <header className="admin-login-header">

          <Link to="/" className="admin-login-brand">

            <span className="admin-brand-icon">
              <ShieldCheck size={27} />
            </span>

            <span className="admin-brand-text">
              Civic<span>Fix</span>

              <small>
                ADMINISTRATION PORTAL
              </small>
            </span>

          </Link>

          <Link to="/" className="admin-back-home">
            Back to Home
            <ArrowRight size={15} />
          </Link>

        </header>

        {/* LOGIN CONTENT */}

        <section className="admin-login-content">

          <div className="admin-login-card">

            <div className="admin-login-heading">

              <div className="admin-login-icon">
                <Settings size={27} />
              </div>

              <span className="admin-eyebrow">
                SYSTEM ADMINISTRATION
              </span>

              <h1>
                Administrator Sign In
              </h1>

              <p>
                Sign in to access the CivicFix
                platform administration dashboard.
              </p>

            </div>

            {/* ERROR MESSAGE */}

            {errorMessage && (
              <div
                className="admin-login-error"
                role="alert"
              >
                <AlertCircle size={19} />

                <span>{errorMessage}</span>
              </div>
            )}

            {/* LOGIN FORM */}

            <form
              className="admin-login-form"
              onSubmit={handleLogin}
            >

              {/* EMAIL */}

              <div className="admin-form-group">

                <label htmlFor="admin-email">
                  Email Address
                </label>

                <div className="admin-input-wrapper">

                  <Mail size={19} />

                  <input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrorMessage("");
                    }}
                    autoComplete="username"
                    required
                    disabled={loading}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="admin-form-group">

                <label htmlFor="admin-password">
                  Password
                </label>

                <div className="admin-input-wrapper">

                  <Lock size={19} />

                  <input
                    id="admin-password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage("");
                    }}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                className="admin-login-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className="admin-loading-icon"
                    />

                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Admin Portal
                    <ArrowRight size={19} />
                  </>
                )}

              </button>

            </form>

            {/* SECURITY */}

            <div className="admin-login-security">

              <ShieldCheck size={19} />

              <span>
                Restricted access for authorized
                CivicFix Super Administrators.
              </span>

            </div>

          </div>

          {/* INFORMATION */}

          <aside className="admin-login-information">

            <span className="admin-info-label">
              CIVICFIX PLATFORM CONTROL
            </span>

            <h2>
              Complete control.
              <br />
              One administration portal.
            </h2>

            <p>
              Manage users, department managers,
              staff, departments, complaints and
              senior citizen assistance services
              from one central platform.
            </p>

            <div className="admin-feature-list">

              <div className="admin-feature-item">

                <span>
                  <UsersIcon />
                </span>

                <div>
                  <strong>
                    User Management
                  </strong>

                  <small>
                    Manage citizens, managers and staff.
                  </small>
                </div>

              </div>

              <div className="admin-feature-item">

                <span>
                  <Settings size={19} />
                </span>

                <div>
                  <strong>
                    Platform Management
                  </strong>

                  <small>
                    Control departments and services.
                  </small>
                </div>

              </div>

              <div className="admin-feature-item">

                <span>
                  <ShieldCheck size={19} />
                </span>

                <div>
                  <strong>
                    Secure Administration
                  </strong>

                  <small>
                    Role-validated administrator access.
                  </small>
                </div>

              </div>

            </div>

          </aside>

        </section>

        <footer className="admin-login-footer">
          © {new Date().getFullYear()} CivicFix.
          Administration Portal.
        </footer>

      </div>

    </main>
  );
}

function UsersIcon() {
  return <ShieldCheck size={19} />;
}
