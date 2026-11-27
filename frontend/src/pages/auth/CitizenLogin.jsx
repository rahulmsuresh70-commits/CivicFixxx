import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import api, {
  getApiBaseUrl,
  getApiErrorMessage,
} from '../../api/axios';

/* =========================================================
   GOOGLE EXCHANGE REQUEST DEDUPLICATION
========================================================= */

// Prevent React StrictMode from exchanging the same
// one-time Google login code more than once.
const googleExchangeRequests = new Map();

function exchangeGoogleCodeOnce(code) {
  if (!googleExchangeRequests.has(code)) {
    const request = api.post(
      '/auth/google/exchange/',
      { code },
    );

    googleExchangeRequests.set(code, request);
  }

  return googleExchangeRequests.get(code);
}

/* =========================================================
   GOOGLE ICON
========================================================= */

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
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

/* =========================================================
   CIVICFIX BRAND ICON
========================================================= */

function CivicFixIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect
        width="40"
        height="40"
        rx="12"
        fill="currentColor"
      />

      <path
        d="M11 13.5L20 8L29 13.5V26.5L20 32L11 26.5V13.5Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M15.5 20L19 23.5L25.5 16.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   PASSWORD VISIBILITY ICON
========================================================= */

function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M10.58 10.59A2 2 0 0 0 13.41 13.42"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M9.88 5.09A10.8 10.8 0 0 1 12 4.9c5.2 0 8.7 4.1 9.5 7.1a10.5 10.5 0 0 1-2.6 4.4M6.2 6.2A11.6 11.6 0 0 0 2.5 12c.8 3 4.3 7.1 9.5 7.1 1.3 0 2.5-.3 3.6-.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12S6 4.9 12 4.9 21.5 12 21.5 12 18 19.1 12 19.1 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/* =========================================================
   AUTHENTICATION HELPERS
========================================================= */

function saveAuthentication(data) {
  if (!data?.access || !data?.refresh || !data?.user) {
    throw new Error(
      'The server returned an incomplete authentication response.'
    );
  }

  const role = String(data.user.role ?? '')
    .trim()
    .toLowerCase();

  // Accept the backend's actual role value: "citizen".
  if (role !== 'citizen') {
    throw new Error(
      role
        ? `Citizen login denied. Your account role is "${data.user.role}". Please use the correct login portal.`
        : 'The server response does not include a user role.'
    );
  }

  // Save authentication only after validating the role.
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
}

function getGoogleCallbackUrl() {
  return `${window.location.origin}/auth/google/callback`;
}

/* =========================================================
   CITIZEN LOGIN PAGE
========================================================= */

export default function CitizenLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
    setErrorMessage('');
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setErrorMessage('');
  };

  /* -------------------------------------------------------
     EMAIL AND PASSWORD LOGIN
  ------------------------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(
        'Please enter both your email address and password.',
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/auth/citizen/login/',
        {
          email: normalizedEmail,
          password,
        },
      );

      saveAuthentication(response.data);

      navigate('/user/dashboard', {
        replace: true,
      });
    } catch (error) {
      const message = getApiErrorMessage(error);

      if (
        /verify your email|email.*verif|not verified/i.test(message)
      ) {
        setErrorMessage(
          `${message} Please verify your email before logging in.`,
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     START GOOGLE OAUTH
  ------------------------------------------------------- */

  const handleGoogleLogin = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);

    const callbackUrl = getGoogleCallbackUrl();

    sessionStorage.setItem(
      'civicfix_google_callback',
      callbackUrl,
    );

    // IMPORTANT:
    // Explicitly identify this authentication as Citizen.
    sessionStorage.setItem(
      'civicfix_google_role',
      'citizen',
    );

    // IMPORTANT:
    // Start Google authentication through the Citizen portal.
    const oauthStartUrl =
      `${getApiBaseUrl()}/api/auth/google/login/?portal=citizen`;

    window.location.assign(oauthStartUrl);
  };

  return (
    <main className="citizen-login-page">
      <div className="citizen-login-background">
        <span className="login-decoration login-decoration-one" />
        <span className="login-decoration login-decoration-two" />
        <span className="login-decoration login-decoration-three" />
      </div>

      <div className="citizen-login-shell">

        {/* BRAND AND PUBLIC NAVIGATION */}

        <header className="citizen-login-header">
          <Link
            to="/"
            className="citizen-login-brand"
            aria-label="CivicFix public home"
          >
            <span className="citizen-login-brand-icon">
              <CivicFixIcon />
            </span>

            <span className="citizen-login-brand-name">
              Civic<span>Fix</span>
            </span>
          </Link>

          <Link
            to="/"
            className="citizen-login-back-link"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>
        </header>

        {/* LOGIN CONTENT */}

        <section className="citizen-login-content">
          <div className="citizen-login-card">

            <div className="citizen-login-card-heading">
              <div className="citizen-login-heading-icon">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 12A4 4 0 1 0 12 4A4 4 0 0 0 12 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M4.5 20C4.5 16.7 7.5 14 12 14C16.5 14 19.5 16.7 19.5 20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <span className="citizen-login-eyebrow">
                CITIZEN PORTAL
              </span>

              <h1>Welcome back</h1>

              <p>
                Sign in to report civic issues and keep track
                of the services that matter to your community.
              </p>
            </div>

            {/* API FEEDBACK */}

            {errorMessage && (
              <div
                className="citizen-login-alert citizen-login-alert-error"
                role="alert"
              >
                <span className="citizen-login-alert-icon">
                  !
                </span>

                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                className="citizen-login-alert citizen-login-alert-success"
                role="status"
              >
                {successMessage}
              </div>
            )}

            {/* EMAIL AND PASSWORD FORM */}

            <form
              className="citizen-login-form"
              onSubmit={handleSubmit}
            >
              <div className="citizen-login-field">
                <label htmlFor="citizen-email">
                  Email address
                </label>

                <div className="citizen-login-input-wrapper">
                  <span
                    className="citizen-login-input-icon"
                    aria-hidden="true"
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <path
                        d="M4 7L12 13L20 7"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="citizen-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="citizen-login-field">
                <label htmlFor="citizen-password">
                  Password
                </label>

                <div className="citizen-login-input-wrapper">
                  <span
                    className="citizen-login-input-icon"
                    aria-hidden="true"
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <path
                        d="M8 10V7A4 4 0 0 1 16 7V10"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="citizen-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="citizen-login-password-toggle"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() => {
                      setShowPassword((current) => !current);
                    }}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <div className="citizen-login-form-options">
                <label className="citizen-login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => {
                      setRememberMe(event.target.checked);
                    }}
                  />

                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                className="citizen-login-submit"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <span className="citizen-login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to CivicFix

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12H19M13 6L19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}

            <div className="citizen-login-divider">
              <span />
              <p>OR CONTINUE WITH</p>
              <span />
            </div>

            {/* GOOGLE LOGIN */}

            <button
              type="button"
              className="citizen-login-google-button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <span className="citizen-login-spinner citizen-login-spinner-dark" />
              ) : (
                <GoogleIcon />
              )}

              {googleLoading
                ? 'Connecting to Google...'
                : 'Continue with Google'}
            </button>

            {/* REGISTRATION LINK */}

            <p className="citizen-login-register">
              Don't have an account?

              {' '}

              <Link to="/register">
                Create an account
              </Link>
            </p>

            {/* SECURITY NOTE */}

            <div className="citizen-login-security">
              <span aria-hidden="true">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 3L20 6V11C20 16 16.6 19.5 12 21C7.4 19.5 4 16 4 11V6L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M9 12L11 14L15.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span>
                Your account helps keep your civic service
                activity connected and secure.
              </span>
            </div>
          </div>

          {/* INFORMATION PANEL */}

          <aside className="citizen-login-info">
            <div className="citizen-login-info-badge">
              <span />
              YOUR COMMUNITY. YOUR VOICE.
            </div>

            <h2>
              Make your
              <br />
              community
              <br />
              <span>better.</span>
            </h2>

            <p>
              Report local issues, follow complaint progress,
              and stay connected with the services working
              to improve your neighbourhood.
            </p>

            <div className="citizen-login-benefits">

              <div className="citizen-login-benefit">
                <span className="citizen-login-benefit-icon">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 21S19 14.5 19 9.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <circle
                      cx="12"
                      cy="9.5"
                      r="2.3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>

                <div>
                  <strong>Report civic issues</strong>
                  <span>
                    Bring important local problems to attention.
                  </span>
                </div>
              </div>

              <div className="citizen-login-benefit">
                <span className="citizen-login-benefit-icon">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M12 7V12L15.5 14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div>
                  <strong>Follow your progress</strong>
                  <span>
                    Keep track of updates on your complaints.
                  </span>
                </div>
              </div>

              <div className="citizen-login-benefit">
                <span className="citizen-login-benefit-icon">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3L20 6V11C20 16 16.6 19.5 12 21C7.4 19.5 4 16 4 11V6L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M9 12L11 14L15.5 9.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div>
                  <strong>One connected platform</strong>
                  <span>
                    Access your civic activity in one place.
                  </span>
                </div>
              </div>
            </div>

            <div className="citizen-login-info-footer">
              <div className="citizen-login-info-footer-mark">
                <CivicFixIcon />
              </div>

              <div>
                <strong>CivicFix</strong>
                <span>Building better communities together.</span>
              </div>
            </div>
          </aside>
        </section>

        <footer className="citizen-login-footer">
          <span>
            © {new Date().getFullYear()} CivicFix
          </span>

          <span>
            A smarter way to connect with civic services.
          </span>
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   GOOGLE CALLBACK PAGE
========================================================= */

export function GoogleAuthCallback() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function exchangeGoogleCode() {
      const code = searchParams.get('code');
      const oauthError = searchParams.get('error');

      if (oauthError) {
        setErrorMessage(
          'Google sign-in was cancelled or could not be completed.',
        );
        return;
      }

      if (!code) {
        setErrorMessage(
          'The Google authentication code is missing. Please try again.',
        );
        return;
      }

      try {
        // Both StrictMode effect executions reuse this
        // exact same request for the same authorization code.
        const response = await exchangeGoogleCodeOnce(code);

        // Only the active effect handles the response.
        if (cancelled) {
          return;
        }

        saveAuthentication(response.data);

        sessionStorage.removeItem(
          'civicfix_google_callback',
        );

        navigate('/user/dashboard', {
          replace: true,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(error),
        );
      }
    }

    exchangeGoogleCode();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <main className="google-callback-page">
      <div className="google-callback-card">
        {errorMessage ? (
          <>
            <div className="google-callback-error-icon">
              !
            </div>

            <h1>Sign-in unsuccessful</h1>

            <p>{errorMessage}</p>

            <Link
              to="/login"
              className="citizen-login-submit google-callback-retry"
            >
              Return to Login
            </Link>
          </>
        ) : (
          <>
            <div className="google-callback-loader">
              <span />
            </div>

            <h1>Completing sign-in</h1>

            <p>
              Please wait while CivicFix securely verifies
              your Google sign-in.
            </p>
          </>
        )}
      </div>
    </main>
  );
}