import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './DepartmentManagerVerifyEmail.css';

export default function DepartmentManagerVerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(
    location.state?.email ||
    sessionStorage.getItem('civicfix_department_verification_email') ||
    ''
  );

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!email) {
      navigate('/department/register', { replace: true });
    }
  }, [email, navigate]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/verify-email/', {
        email: email.trim().toLowerCase(),
        code,
      });

      setSuccess(true);

      sessionStorage.removeItem(
        'civicfix_department_verification_email'
      );

      sessionStorage.removeItem('civicfix_department_name');

    } catch (error) {
      setErrorMessage(
        error.response
          ? getApiErrorMessage(error)
          : error.message || 'Verification failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dm-verify-page">

      <Link to="/" className="dm-verify-brand">
        <span><ShieldCheck size={25} /></span>
        <strong>Civic<span>Fix</span></strong>
      </Link>

      <section className="dm-verify-card">

        {success ? (
          <div className="dm-verify-success">

            <div className="dm-verify-success-icon">
              <CheckCircle2 size={34} />
            </div>

            <span>EMAIL VERIFICATION COMPLETE</span>

            <h1>Email Verified Successfully!</h1>

            <p>
              Your Department Manager account has been verified.
              You can now sign in to the Department Portal.
            </p>

            <button
              className="dm-verify-button"
              onClick={() => navigate('/department/login', { replace: true })}
            >
              Continue to Login
              <ArrowRight size={18} />
            </button>

          </div>
        ) : (
          <>

            <div className="dm-verify-icon">
              <Mail size={30} />
            </div>

            <span className="dm-verify-eyebrow">
              DEPARTMENT ACCOUNT VERIFICATION
            </span>

            <h1>Verify your email</h1>

            <p>
              Enter the six-digit verification code sent to:
            </p>

            <strong className="dm-verify-email">
              {email}
            </strong>

            {errorMessage && (
              <div className="dm-verify-error" role="alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerify}>

              <label htmlFor="dm-otp">Verification Code</label>

              <input
                id="dm-otp"
                className="dm-verify-otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6)
                  );
                  setErrorMessage('');
                }}
                maxLength={6}
                required
                disabled={loading}
              />

              <button
                type="submit"
                className="dm-verify-button"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={19} className="dm-verify-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Email
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

            </form>

            <div className="dm-verify-footer">
              <Link to="/department/register">
                Back to Registration
              </Link>
            </div>

          </>
        )}

      </section>

      <footer className="dm-verify-copyright">
        © {new Date().getFullYear()} CivicFix. Department Management Portal.
      </footer>

    </main>
  );
}