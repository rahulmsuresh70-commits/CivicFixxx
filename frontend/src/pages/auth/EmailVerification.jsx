import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import api, { getApiErrorMessage } from '../../api/axios';
import './EmailVerification.css';

function VerificationLogo() {
  return (
    <Link to="/" className="verify-brand" aria-label="CivicFix home">
      <span className="verify-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
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
      <span className="verify-brand-text">CivicFix</span>
    </Link>
  );
}

export default function EmailVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inputRefs = useRef([]);

  const [email, setEmail] = useState(location.state?.email || '');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailEditMode, setEmailEditMode] = useState(
    !location.state?.email
  );

  // Identify the account type being verified.
  const isSeniorCitizenManager =
    location.state?.accountType === 'senior_citizen_manager' ||
    searchParams.get('portal') === 'senior_citizen_manager';

  const loginPath = isSeniorCitizenManager
    ? '/senior-citizen/manager/login'
    : '/login';

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state?.email]);

  function handleDigitChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);

    setDigits((previous) => {
      const next = [...previous];
      next[index] = digit;
      return next;
    });

    setErrorMessage('');
    setSuccessMessage('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (!pasted) return;

    event.preventDefault();

    const next = Array.from(
      { length: 6 },
      (_, index) => pasted[index] || ''
    );

    setDigits(next);
    setErrorMessage('');

    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const code = digits.join('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Enter the complete 6-digit verification code.');

      const firstEmptyIndex = digits.findIndex((digit) => !digit);

      inputRefs.current[
        firstEmptyIndex === -1 ? 0 : firstEmptyIndex
      ]?.focus();

      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/verify-email/', {
        email: normalizedEmail,
        code,
      });

      const verificationMessage =
        response.data?.message ||
        'Email verified successfully. You can now sign in.';

      setSuccessMessage(
        response.data?.message ||
          'Your email has been verified successfully.'
      );

      setDigits(['', '', '', '', '', '']);

      window.setTimeout(() => {
        navigate(loginPath, {
          replace: true,
          state: {
            email: normalizedEmail,
            message: verificationMessage,
          },
        });
      }, 1000);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="email-verify-page">
      <div className="verify-decoration verify-decoration-one" />
      <div className="verify-decoration verify-decoration-two" />

      <header className="verify-header">
        <VerificationLogo />

        <Link to={loginPath} className="verify-back-link">
          <span aria-hidden="true">←</span> Back to sign in
        </Link>
      </header>

      <section className="verify-content" aria-labelledby="verify-title">
        <div className="verify-illustration" aria-hidden="true">
          <div className="verify-illustration-ring">
            <svg viewBox="0 0 100 100" width="78" height="78" fill="none">
              <rect
                x="15"
                y="26"
                width="70"
                height="49"
                rx="10"
                fill="#E9EEFF"
                stroke="#4361EE"
                strokeWidth="2.5"
              />
              <path
                d="M18 32L50 56L82 32"
                stroke="#4361EE"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="76"
                cy="72"
                r="15"
                fill="#20B486"
                stroke="white"
                strokeWidth="4"
              />
              <path
                d="M69 72L74 77L83 67"
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="verify-card">
          <span className="verify-eyebrow">ACCOUNT SECURITY</span>

          <h1 id="verify-title">Verify your email</h1>

          <p className="verify-description">
            We sent a 6-digit verification code to your email. Enter the code
            below to activate your CivicFix account.
          </p>

          {location.state?.message && (
            <div className="verify-info-message" role="status">
              {location.state.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="verify-email-field">
              <label htmlFor="verify-email-address">
                Email address
              </label>

              <div className="verify-email-input-row">
                <span className="verify-email-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7L12 13L21 7" />
                  </svg>
                </span>

                <input
                  id="verify-email-address"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage('');
                  }}
                  readOnly={!emailEditMode}
                  placeholder="you@example.com"
                  required
                />

                {email && !emailEditMode && (
                  <button
                    type="button"
                    className="verify-change-email"
                    onClick={() => setEmailEditMode(true)}
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            <div className="verify-code-heading">
              <label htmlFor="verify-code-0">
                Verification code
              </label>
              <span>6 digits</span>
            </div>

            <div className="verify-code-inputs" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  id={`verify-code-${index}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0 ? 'one-time-code' : 'off'
                  }
                  aria-label={`Verification digit ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  onChange={(event) =>
                    handleDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) =>
                    handleDigitKeyDown(index, event)
                  }
                  required
                />
              ))}
            </div>

            {errorMessage && (
              <div className="verify-alert" role="alert">
                <span className="verify-alert-icon">!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="verify-success" role="status">
                <span aria-hidden="true">✓</span> {successMessage}
              </div>
            )}

            <button
              className="verify-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="verify-spinner" />
                  Verifying email...
                </>
              ) : (
                <>
                  Verify email <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="verify-help">
            <span className="verify-help-icon" aria-hidden="true">
              i
            </span>
            <p>
              Check your inbox and spam folder. Verification codes expire,
              so use the latest code sent to you.
            </p>
          </div>

          <p className="verify-login-link">
            Already verified? <Link to={loginPath}>Sign in</Link>
          </p>
        </div>
      </section>

      <footer className="verify-footer">
        <span>© {new Date().getFullYear()} CivicFix</span>
        <span>Building better communities together.</span>
      </footer>
    </main>
  );
}