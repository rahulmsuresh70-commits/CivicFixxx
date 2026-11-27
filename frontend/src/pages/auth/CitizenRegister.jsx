import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage, getApiBaseUrl } from '../../api/axios';
import './CitizenRegister.css';

function CivicFixLogo() {
  return (
    <Link to="/" className="register-brand" aria-label="CivicFix home">
      <span className="register-brand-icon">
        <svg
          viewBox="0 0 40 40"
          width="36"
          height="36"
          fill="none"
          aria-hidden="true"
        >
          <rect width="40" height="40" rx="12" fill="#4361EE" />
          <path
            d="M10 20.5L16.5 27L30 13.5"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="register-brand-text">CivicFix</span>
    </Link>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.59a2 2 0 002.83 2.83" />
      <path d="M9.88 5.09A10.6 10.6 0 0112 4.88c5.5 0 9 7.12 9 7.12a15.5 15.5 0 01-3.06 3.82" />
      <path d="M6.61 6.61C4.09 8.29 3 12 3 12s3.5 7.12 9 7.12a10.5 10.5 0 004.05-.8" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FieldIcon({ type }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (type === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </svg>
    );
  }

  if (type === 'email') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  error,
}) {
  return (
    <div className="register-field">
      <label htmlFor={id}>{label}</label>

      <div className={`register-input-wrap ${error ? 'has-error' : ''}`}>
        <span className="register-input-icon">
          <FieldIcon type="password" />
        </span>

        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="At least 8 characters"
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />

        <button
          type="button"
          className="register-password-toggle"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>

      {error && (
        <p className="register-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function CitizenRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage('');
    setFieldErrors((previous) => ({
      ...previous,
      [name]: '',
    }));
  }

  function validateForm() {
    const errors = {};

    if (!form.first_name.trim()) {
      errors.first_name = 'Enter your first name.';
    }

    if (!form.last_name.trim()) {
      errors.last_name = 'Enter your last name.';
    }

    if (!form.email.trim()) {
      errors.email = 'Enter your email address.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      errors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Create a password.';
    } else if (form.password.length < 8) {
      errors.password = 'Your password must contain at least 8 characters.';
    }

    if (!form.password_confirm) {
      errors.password_confirm = 'Confirm your password.';
    } else if (form.password !== form.password_confirm) {
      errors.password_confirm = 'Passwords do not match.';
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleGoogleRegister() {
    // Start the existing Django Google OAuth flow used by CivicFix login.
    window.location.assign(`${getApiBaseUrl()}/api/auth/google/login/`);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirm: form.password_confirm,
      };

      // api.js uses /api as its base URL.
      // The resulting endpoint is /api/auth/register/.
      const response = await api.post('/auth/register/', payload);

      const registeredEmail =
        response.data?.user?.email || payload.email;

      navigate('/verify-email', {
        replace: true,
        state: {
          email: registeredEmail,
          message:
            response.data?.message ||
            'Registration successful. Check your email for the verification code.',
        },
      });
    } catch (error) {
      const responseData = error.response?.data;

      if (responseData && typeof responseData === 'object') {
        const nextFieldErrors = {};

        for (const field of [
          'first_name',
          'last_name',
          'email',
          'password',
          'password_confirm',
        ]) {
          const value = responseData[field];

          if (Array.isArray(value)) {
            nextFieldErrors[field] = value.join(' ');
          } else if (typeof value === 'string') {
            nextFieldErrors[field] = value;
          }
        }

        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors((previous) => ({
            ...previous,
            ...nextFieldErrors,
          }));
        }
      }

      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="citizen-register-page">
      <div className="register-background-decoration register-decoration-one" />
      <div className="register-background-decoration register-decoration-two" />

      <header className="register-header">
        <CivicFixLogo />

        <Link to="/" className="register-back-home">
          <span aria-hidden="true">←</span>
          Back to home
        </Link>
      </header>

      <div className="register-layout">
        <section className="register-intro">
          <span className="register-intro-badge">
            <span className="register-status-dot" />
            YOUR COMMUNITY. YOUR VOICE.
          </span>

          <h1>
            Together, we can
            <br />
            build a <span>better city.</span>
          </h1>

          <p className="register-intro-description">
            Create your CivicFix account to report civic issues,
            follow complaint progress, and help make your community
            a better place to live.
          </p>

          <div className="register-benefits">
            <div className="register-benefit">
              <span className="register-benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>

              <div>
                <strong>Report issues with confidence</strong>
                <span>Share problems affecting your neighbourhood.</span>
              </div>
            </div>

            <div className="register-benefit">
              <span className="register-benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>

              <div>
                <strong>Track your complaints</strong>
                <span>Stay informed as your reports progress.</span>
              </div>
            </div>

            <div className="register-benefit">
              <span className="register-benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="10" cy="7" r="4" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
              </span>

              <div>
                <strong>Make your voice count</strong>
                <span>Help public services respond to local needs.</span>
              </div>
            </div>
          </div>

          <div className="register-intro-note">
            <span className="register-note-check">✓</span>
            A more connected community starts with you.
          </div>
        </section>

        <section className="register-card" aria-labelledby="register-title">
          <div className="register-card-heading">
            <span className="register-card-icon">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
            </span>

            <p className="register-card-eyebrow">CITIZEN ACCOUNT</p>

            <h2 id="register-title">Create your account</h2>

            <p className="register-card-subtitle">
              Join your community on CivicFix.
            </p>
          </div>

          {errorMessage && (
            <div className="register-alert" role="alert">
              <span className="register-alert-icon">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-name-grid">
              <div className="register-field">
                <label htmlFor="first_name">First name</label>

                <div
                  className={`register-input-wrap ${
                    fieldErrors.first_name ? 'has-error' : ''
                  }`}
                >
                  <span className="register-input-icon">
                    <FieldIcon type="user" />
                  </span>

                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={form.first_name}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.first_name)}
                    required
                  />
                </div>

                {fieldErrors.first_name && (
                  <p className="register-field-error">
                    {fieldErrors.first_name}
                  </p>
                )}
              </div>

              <div className="register-field">
                <label htmlFor="last_name">Last name</label>

                <div
                  className={`register-input-wrap ${
                    fieldErrors.last_name ? 'has-error' : ''
                  }`}
                >
                  <span className="register-input-icon">
                    <FieldIcon type="user" />
                  </span>

                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={form.last_name}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.last_name)}
                    required
                  />
                </div>

                {fieldErrors.last_name && (
                  <p className="register-field-error">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="email">Email address</label>

              <div
                className={`register-input-wrap ${
                  fieldErrors.email ? 'has-error' : ''
                }`}
              >
                <span className="register-input-icon">
                  <FieldIcon type="email" />
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  required
                />
              </div>

              {fieldErrors.email && (
                <p className="register-field-error">{fieldErrors.email}</p>
              )}
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              visible={showPassword}
              onToggle={() => setShowPassword((previous) => !previous)}
              autoComplete="new-password"
              error={fieldErrors.password}
            />

            <PasswordField
              id="password_confirm"
              label="Confirm password"
              value={form.password_confirm}
              onChange={handleChange}
              visible={showConfirmPassword}
              onToggle={() =>
                setShowConfirmPassword((previous) => !previous)
              }
              autoComplete="new-password"
              error={fieldErrors.password_confirm}
            />

            <p className="register-password-hint">
              Use at least 8 characters. Your password must also satisfy
              the server's password security rules.
            </p>

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="register-divider" aria-hidden="true">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="register-google-btn"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <svg
              className="register-google-icon"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.15 13.22l7.98 6.19C13.02 13.72 18.02 9.5 24 9.5z"
                transform="translate(0 4)"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.97 46.98 31.77 46.98 24.55z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.53 10.78z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-5.98 0-11.02-4.22-12.85-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="register-login-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>

          <div className="register-security-note">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 018 0v3" />
            </svg>

            Your account details are handled securely.
          </div>
        </section>
      </div>

      <footer className="register-footer">
        <span>© {new Date().getFullYear()} CivicFix</span>
        <span>Building better communities together.</span>
      </footer>
    </main>
  );
}