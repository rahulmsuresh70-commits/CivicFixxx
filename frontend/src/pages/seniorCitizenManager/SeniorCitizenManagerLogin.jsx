import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';

import './SeniorCitizenManagerLogin.css';

// =========================================================
// GOOGLE CODE EXCHANGE - PREVENT DUPLICATE REQUESTS
// =========================================================

const seniorManagerGoogleExchangeRequests = new Map();

function exchangeSeniorManagerGoogleCodeOnce(code) {
  if (!seniorManagerGoogleExchangeRequests.has(code)) {
    const request = api.post('/auth/google/exchange/', {
      code,
    });

    seniorManagerGoogleExchangeRequests.set(code, request);

    request.catch(() => {
      seniorManagerGoogleExchangeRequests.delete(code);
    });
  }

  return seniorManagerGoogleExchangeRequests.get(code);
}


// =========================================================
// SENIOR CITIZEN MANAGER LOGIN
// =========================================================

export default function SeniorCitizenManagerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Normal Email and Password Login
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
        '/auth/senior-citizen/manager/login/',
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

      const role = String(data.user.role || '')
        .trim()
        .toLowerCase();

      if (role !== 'senior_citizen_manager') {
        throw new Error(
          'This portal is only for Senior Citizen Managers.'
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

      navigate(
        '/senior-citizen/manager/dashboard',
        { replace: true }
      );

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


  // Google OAuth Login
  const handleGoogleLogin = () => {
    setErrorMessage('');
    setGoogleLoading(true);

    // Identify the expected Google login portal
    sessionStorage.setItem(
      'civicfix_google_role',
      'senior_citizen_manager'
    );

    sessionStorage.setItem(
      'civicfix_google_flow',
      'login'
    );

    const backendBaseURL =
      import.meta.env.VITE_API_BASE_URL ||
      'http://127.0.0.1:8000';

    const googleLoginURL =
      `${backendBaseURL.replace(/\/+$/, '')}` +
      '/api/auth/google/login/' +
      '?portal=senior_citizen_manager';

    window.location.assign(googleLoginURL);
  };


  return (
    <main className="scm-login-page">

      <div className="scm-login-background">
        <div className="scm-login-orb scm-orb-one" />
        <div className="scm-login-orb scm-orb-two" />
      </div>

      <div className="scm-login-container">

        {/* Header */}

        <header className="scm-login-header">

          <Link to="/" className="scm-login-brand">

            <span className="scm-brand-icon">
              <ShieldCheck size={27} />
            </span>

            <span>
              Civic<span>Fix</span>
              <small>SENIOR CITIZEN PORTAL</small>
            </span>

          </Link>

          <Link to="/" className="scm-back-home">
            Back to Home
            <ArrowRight size={15} />
          </Link>

        </header>

        {/* Main Content */}

        <section className="scm-login-content">

          {/* Login Card */}

          <div className="scm-login-card">

            <div className="scm-login-card-heading">

              <div className="scm-login-icon">
                <HeartHandshake size={27} />
              </div>

              <span className="scm-eyebrow">
                SENIOR CITIZEN MANAGEMENT
              </span>

              <h1>Welcome back</h1>

              <p>
                Sign in to manage senior citizen assistance
                requests, coordinate staff, and monitor
                support activities.
              </p>

            </div>

            {/* Error Message */}

            {errorMessage && (
              <div
                className="scm-error-message"
                role="alert"
              >
                <AlertCircle size={19} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}

            <form
              className="scm-login-form"
              onSubmit={handleSubmit}
            >

              {/* Email */}

              <div className="scm-form-group">

                <label htmlFor="scm-email">
                  Email Address
                </label>

                <div className="scm-input-wrapper">

                  <Mail size={19} />

                  <input
                    id="scm-email"
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

              {/* Password */}

              <div className="scm-form-group">

                <label htmlFor="scm-password">
                  Password
                </label>

                <div className="scm-input-wrapper">

                  <Lock size={19} />

                  <input
                    id="scm-password"
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
                    className="scm-password-toggle"
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
                      : <Eye size={19} />
                    }
                  </button>

                </div>

              </div>

              {/* Email Login Button */}

              <button
                type="submit"
                className="scm-submit-button"
                disabled={loading || googleLoading}
              >

                {loading ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className="scm-loading-icon"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to Manager Portal
                    <ArrowRight size={19} />
                  </>
                )}

              </button>

            </form>

            {/* Divider */}

            <div className="scm-google-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            {/* Google Login */}

            <button
              type="button"
              className="scm-google-button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >

              {googleLoading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="scm-loading-icon"
                  />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 48 48"
                    width="19"
                    height="19"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
                    />

                    <path
                      fill="#34A853"
                      d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"
                    />

                    <path
                      fill="#FBBC05"
                      d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z"
                    />

                    <path
                      fill="#EA4335"
                      d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"
                    />
                  </svg>

                  Continue with Google
                </>
              )}

            </button>

            {/* Security Information */}

            <div className="scm-login-security">

              <ShieldCheck size={18} />

              <span>
                Secure access for authorized Senior Citizen Managers.
              </span>

            </div>

            {/* Registration Link */}

            <div className="scm-register-link">

              Don't have a manager account?

              <Link to="/senior-citizen/manager/register">
                Register here
              </Link>

            </div>

          </div>

          {/* Information Section */}

          <aside className="scm-login-information">

            <span className="scm-info-label">
              CIVICFIX SENIOR CITIZEN CARE
            </span>

            <h2>
              Supporting seniors.
              <br />
              Strengthening communities.
            </h2>

            <p>
              Coordinate senior citizen assistance services
              through one connected platform. Manage requests,
              organize staff, and ensure timely support for
              elderly citizens.
            </p>

            <div className="scm-feature-list">

              <div className="scm-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Assistance management</strong>

                  <small>
                    Review and manage senior citizen requests.
                  </small>
                </div>

              </div>

              <div className="scm-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Staff coordination</strong>

                  <small>
                    Manage staff and coordinate assistance.
                  </small>
                </div>

              </div>

              <div className="scm-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>
                  <strong>Service monitoring</strong>

                  <small>
                    Monitor assistance progress and completion.
                  </small>
                </div>

              </div>

            </div>

          </aside>

        </section>

        {/* Footer */}

        <footer className="scm-login-footer">
          © {new Date().getFullYear()} CivicFix.
          Senior Citizen Management Portal.
        </footer>

      </div>

    </main>
  );
}


// =========================================================
// SENIOR CITIZEN MANAGER GOOGLE AUTH CALLBACK
// =========================================================

export function SeniorCitizenManagerGoogleAuthCallback() {
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const handleGoogleCallback = async () => {
      try {
        const expectedRole = sessionStorage.getItem(
          'civicfix_google_role'
        );

        if (expectedRole !== 'senior_citizen_manager') {
          throw new Error(
            'Invalid Google login portal. Please sign in through the Senior Citizen Manager portal.'
          );
        }

        const params = new URLSearchParams(
          window.location.search
        );

        const code = params.get('code');
        const oauthError = params.get('error');

        if (oauthError) {
          throw new Error(
            params.get('error_description') ||
            'Google authentication was cancelled or failed.'
          );
        }

        if (!code) {
          throw new Error(
            'Google did not return an authentication code. Please try again.'
          );
        }

        const response =
          await exchangeSeniorManagerGoogleCodeOnce(code);

        const data = response.data;

        if (!data?.access || !data?.refresh || !data?.user) {
          throw new Error(
            'The server returned an incomplete Google login response.'
          );
        }

        const role = String(data.user.role || '')
          .trim()
          .toLowerCase();

        if (role !== 'senior_citizen_manager') {
          throw new Error(
            'This Google account is not registered as a Senior Citizen Manager.'
          );
        }

        // Save authentication only after role validation
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

        sessionStorage.removeItem('civicfix_google_role');
        sessionStorage.removeItem('civicfix_google_flow');

        if (active) {
          navigate(
            '/senior-citizen/manager/dashboard',
            { replace: true }
          );
        }

      } catch (error) {
        const message = error.response
          ? getApiErrorMessage(error)
          : error.message || 'Google login failed.';

        sessionStorage.removeItem('civicfix_google_role');
        sessionStorage.removeItem('civicfix_google_flow');

        if (active) {
          setErrorMessage(message);
          setLoading(false);
        }
      }
    };

    handleGoogleCallback();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="scm-login-page">

      <div className="scm-login-background">
        <div className="scm-login-orb scm-orb-one" />
        <div className="scm-login-orb scm-orb-two" />
      </div>

      <div className="scm-login-container">

        <div className="scm-login-card">

          {loading ? (
            <>
              <LoaderCircle
                size={32}
                className="scm-loading-icon"
              />

              <h2>Verifying Google Login...</h2>

              <p>
                Please wait while we verify your account.
              </p>
            </>
          ) : (
            <>
              <AlertCircle size={32} />

              <h2>Google Login Failed</h2>

              <div
                className="scm-error-message"
                role="alert"
              >
                {errorMessage}
              </div>

              <button
                type="button"
                className="scm-submit-button"
                onClick={() =>
                  navigate(
                    '/senior-citizen/manager/login',
                    { replace: true }
                  )
                }
              >
                Return to Manager Login
              </button>
            </>
          )}

        </div>

      </div>

    </main>
  );
}