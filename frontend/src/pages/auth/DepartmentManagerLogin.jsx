import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import api, {
  getApiBaseUrl,
  getApiErrorMessage,
} from '../../api/axios';

import './DepartmentManagerLogin.css';

/*
|--------------------------------------------------------------------------
| Google exchange request protection
|--------------------------------------------------------------------------
|
| React StrictMode can execute effects more than once during development.
| Google login codes are single-use, so we reuse the same exchange request
| instead of sending two requests for the same code.
|
*/

const googleExchangeRequests = new Map();

function exchangeGoogleCodeOnce(code) {
  if (!googleExchangeRequests.has(code)) {
    const request = api.post(
      '/auth/google/exchange/',
      { code }
    );

    googleExchangeRequests.set(code, request);

    request.catch(() => {
      googleExchangeRequests.delete(code);
    });
  }

  return googleExchangeRequests.get(code);
}

/*
|--------------------------------------------------------------------------
| Google Icon
|--------------------------------------------------------------------------
*/

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2l6.6 5.1c3.9-3.6 6.1-8.9 6.1-15Z"
      />

      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4l-6.8 5.2C7.2 39.5 15 44 24 44Z"
      />

      <path
        fill="#FBBC05"
        d="M12.6 27.6a12 12 0 0 1 0-7.2l-6.8-5.2a20.4 20.4 0 0 0 0 27.6l6.8-5.2a12 12 0 0 1 0-10Z"
        transform="translate(0 -3)"
      />

      <path
        fill="#EA4335"
        d="M24 12.4c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.4 29.5 4 24 4 15 4 7.2 8.5 2.6 15.2l6.8 5.2c1.6-4.8 6.1-8 11.4-8Z"
      />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Department Manager Google Callback
|--------------------------------------------------------------------------
|
| This component:
| 1. Reads the Google authorization code.
| 2. Exchanges the code with the backend.
| 3. Verifies that the returned account role is manager.
| 4. Saves access token, refresh token and user.
| 5. Redirects to the Department Manager dashboard.
|
*/

export function DepartmentManagerGoogleAuthCallback() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const completeGoogleLogin = async () => {
      const code = new URLSearchParams(
        window.location.search
      ).get('code');

      const expectedRole = sessionStorage.getItem(
        'civicfix_google_role'
      );

      // Do not allow this callback to authenticate another portal.
      if (expectedRole !== 'manager') {
        setErrorMessage(
          'Invalid login portal. Please start again from the Department Manager login page.'
        );

        setLoading(false);
        return;
      }

      if (!code) {
        setErrorMessage(
          'Google authorization code is missing. Please try signing in again.'
        );

        setLoading(false);
        return;
      }

      try {
        const response = await exchangeGoogleCodeOnce(code);

        if (cancelled) return;

        const data = response.data;

        if (
          !data?.access ||
          !data?.refresh ||
          !data?.user
        ) {
          throw new Error(
            'The server returned an incomplete Google login response.'
          );
        }

        const returnedRole = String(
          data.user.role || ''
        ).trim().toLowerCase();

        // Strict role validation.
        if (returnedRole !== 'manager') {
          throw new Error(
            'This Google account is not registered as a Department Manager.'
          );
        }

        // Save authentication details.
        localStorage.setItem(
          'civicfix_access_token',
          data.access
        );

        localStorage.setItem(
          'civicfix_refresh_token',
          data.refresh
        );

        localStorage.setItem(
          'civicfix_user',
          JSON.stringify(data.user)
        );

        // Remove temporary Google OAuth information.
        sessionStorage.removeItem(
          'civicfix_google_callback'
        );

        sessionStorage.removeItem(
          'civicfix_google_role'
        );

        // Redirect to Department Manager dashboard.
        navigate('/department/dashboard', {
          replace: true,
        });

      } catch (error) {
        if (cancelled) return;

        console.error(
          'Department Manager Google Login Error:',
          error
        );

        setErrorMessage(
          error.response
            ? getApiErrorMessage(error)
            : error.message || 'Google sign-in failed.'
        );

        setLoading(false);
      }
    };

    completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="dm-login-page">
      <div className="dm-login-background">
        <div className="dm-login-orb dm-orb-one" />
        <div className="dm-login-orb dm-orb-two" />
      </div>

      <div className="dm-login-container">
        <header className="dm-login-header">
          <Link to="/" className="dm-login-brand">
            <span className="dm-brand-icon">
              <ShieldCheck size={27} />
            </span>

            <span>
              Civic<span>Fix</span>
              <small>DEPARTMENT PORTAL</small>
            </span>
          </Link>

          <Link
            to="/department/login"
            className="dm-back-home"
          >
            Back to Login
            <ArrowRight size={15} />
          </Link>
        </header>

        <section className="dm-login-content">
          <div className="dm-login-card">
            <div className="dm-login-card-heading">
              <div className="dm-login-icon">
                {errorMessage ? (
                  <AlertCircle size={27} />
                ) : (
                  <Building2 size={27} />
                )}
              </div>

              <span className="dm-eyebrow">
                DEPARTMENT MANAGEMENT
              </span>

              <h1>
                {errorMessage
                  ? 'Google Sign-in Failed'
                  : 'Verifying your account'}
              </h1>

              <p>
                {errorMessage
                  ? errorMessage
                  : 'Please wait while we securely verify your Department Manager account.'}
              </p>
            </div>

            {errorMessage ? (
              <div
                className="dm-error-message"
                role="alert"
              >
                <AlertCircle size={19} />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 0',
                }}
              >
                <LoaderCircle
                  size={24}
                  className="dm-loading-icon"
                />

                <span>
                  {loading
                    ? 'Authenticating Department Manager...'
                    : 'Redirecting...'}
                </span>
              </div>
            )}

            {errorMessage && (
              <Link
                to="/department/login"
                className="dm-submit-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  marginTop: '20px',
                }}
              >
                Return to Department Login
                <ArrowRight size={19} />
              </Link>
            )}
          </div>
        </section>

        <footer className="dm-login-footer">
          © {new Date().getFullYear()} CivicFix.
          Department Management Portal.
        </footer>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| Department Manager Login
|--------------------------------------------------------------------------
*/

export default function DepartmentManagerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(
        'Please enter your email address and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/auth/civic/department/login/',
        {
          email: normalizedEmail,
          password,
        }
      );

      const data = response.data;

      if (!data?.access || !data?.refresh || !data?.user) {
        throw new Error(
          'The server returned an incomplete login response.'
        );
      }

      const role = String(
        data.user.role || ''
      ).trim().toLowerCase();

      if (role !== 'manager') {
        throw new Error(
          'This login portal is only for department managers.'
        );
      }

      localStorage.setItem(
        'civicfix_access_token',
        data.access
      );

      localStorage.setItem(
        'civicfix_refresh_token',
        data.refresh
      );

      localStorage.setItem(
        'civicfix_user',
        JSON.stringify(data.user)
      );

      navigate('/department/dashboard', {
        replace: true,
      });

    } catch (error) {
      setErrorMessage(
        error.response
          ? getApiErrorMessage(error)
          : error.message || 'Unable to sign in.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Start Department Manager Google OAuth.
  const handleGoogleLogin = () => {
    setErrorMessage('');
    setGoogleLoading(true);

    const callbackUrl =
      `${window.location.origin}/auth/google/callback`;

    sessionStorage.setItem(
      'civicfix_google_callback',
      callbackUrl
    );

    sessionStorage.setItem(
      'civicfix_google_role',
      'manager'
    );

    const oauthStartUrl =
      `${getApiBaseUrl()}/api/auth/google/login/?portal=manager`;

    window.location.assign(oauthStartUrl);
  };

  return (
    <main className="dm-login-page">
      <div className="dm-login-background">
        <div className="dm-login-orb dm-orb-one" />
        <div className="dm-login-orb dm-orb-two" />
      </div>

      <div className="dm-login-container">

        <header className="dm-login-header">
          <Link to="/" className="dm-login-brand">
            <span className="dm-brand-icon">
              <ShieldCheck size={27} />
            </span>

            <span>
              Civic<span>Fix</span>
              <small>DEPARTMENT PORTAL</small>
            </span>
          </Link>

          <Link to="/" className="dm-back-home">
            Back to Home
            <ArrowRight size={15} />
          </Link>
        </header>

        <section className="dm-login-content">

          <div className="dm-login-card">

            <div className="dm-login-card-heading">
              <div className="dm-login-icon">
                <Building2 size={27} />
              </div>

              <span className="dm-eyebrow">
                DEPARTMENT MANAGEMENT
              </span>

              <h1>Welcome back</h1>

              <p>
                Sign in to manage department complaints,
                coordinate staff, and monitor civic services.
              </p>
            </div>

            {errorMessage && (
              <div className="dm-error-message" role="alert">
                <AlertCircle size={19} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              className="dm-login-form"
              onSubmit={handleSubmit}
            >

              <div className="dm-form-group">
                <label htmlFor="dm-email">
                  Email Address
                </label>

                <div className="dm-input-wrapper">
                  <Mail size={19} />

                  <input
                    id="dm-email"
                    type="email"
                    placeholder="manager@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrorMessage('');
                    }}
                    autoComplete="username"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              <div className="dm-form-group">
                <label htmlFor="dm-password">
                  Password
                </label>

                <div className="dm-input-wrapper">
                  <Lock size={19} />

                  <input
                    id="dm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage('');
                    }}
                    autoComplete="current-password"
                    required
                    disabled={loading || googleLoading}
                  />

                  <button
                    type="button"
                    className="dm-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    disabled={loading || googleLoading}
                  >
                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="dm-submit-button"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className="dm-loading-icon"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to Department Portal
                    <ArrowRight size={19} />
                  </>
                )}
              </button>

            </form>

            <div className="dm-login-divider">
              <span />
              <p>OR CONTINUE WITH</p>
              <span />
            </div>

            <button
              type="button"
              className="dm-google-button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <LoaderCircle
                  size={19}
                  className="dm-loading-icon"
                />
              ) : (
                <GoogleIcon />
              )}

              {googleLoading
                ? 'Connecting to Google...'
                : 'Continue with Google'}
            </button>
             <div className="dm-register-login-link">
                 Don't have a manager account?
            <Link to="/department/register"> Register here</Link>
          </div>
            <div className="dm-login-security">
              <ShieldCheck size={18} />
              <span>
                Secure access for authorized department managers.
              </span>
            </div>

          </div>

          <aside className="dm-login-information">

            <span className="dm-info-label">
              CIVICFIX MANAGEMENT
            </span>

            <h2>
              Better coordination.
              <br />
              Better communities.
            </h2>

            <p>
              Manage civic complaints, coordinate department
              staff, and help deliver faster public services
              through one connected platform.
            </p>

            <div className="dm-feature-list">

              <div className="dm-feature-item">
                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Complaint management</strong>
                  <small>
                    Review and manage department complaints.
                  </small>
                </div>
              </div>

              <div className="dm-feature-item">
                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Staff coordination</strong>
                  <small>
                    Organize and assign department staff.
                  </small>
                </div>
              </div>

              <div className="dm-feature-item">
                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Progress monitoring</strong>
                  <small>
                    Follow complaint progress and deadlines.
                  </small>
                </div>
              </div>

            </div>
          </aside>

        </section>

        <footer className="dm-login-footer">
          © {new Date().getFullYear()} CivicFix.
          Department Management Portal.
        </footer>

      </div>
    </main>
  );
}