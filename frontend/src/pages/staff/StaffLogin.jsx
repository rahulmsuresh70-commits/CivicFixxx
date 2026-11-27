import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import api, {
  getApiErrorMessage,
} from '../../api/axios';

import './StaffLogin.css';


export default function StaffLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
        '/auth/civic/staff/login/',
        {
          email: normalizedEmail,
          password,
        }
      );

      const data = response.data;

      if (
        !data?.access ||
        !data?.refresh ||
        !data?.user
      ) {
        throw new Error(
          'The server returned an incomplete login response.'
        );
      }

      const role = String(
        data.user.role || ''
      ).trim().toLowerCase();

      if (role !== 'staff') {
        throw new Error(
          'This login portal is only for department staff.'
        );
      }

      // Save authentication information.
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

      // Navigate to the staff dashboard.
      navigate('/staff/dashboard', {
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


  return (
    <main className="staff-login-page">

      <div className="staff-login-background">
        <div className="staff-login-orb staff-orb-one" />
        <div className="staff-login-orb staff-orb-two" />
      </div>


      <div className="staff-login-container">

        {/* HEADER */}

        <header className="staff-login-header">

          <Link
            to="/"
            className="staff-login-brand"
          >

            <span className="staff-brand-icon">
              <ShieldCheck size={27} />
            </span>

            <span>
              Civic<span>Fix</span>

              <small>
                STAFF PORTAL
              </small>
            </span>

          </Link>


          <Link
            to="/"
            className="staff-back-home"
          >
            Back to Home
            <ArrowRight size={15} />
          </Link>

        </header>


        {/* MAIN CONTENT */}

        <section className="staff-login-content">


          {/* LOGIN CARD */}

          <div className="staff-login-card">

            <div className="staff-login-card-heading">

              <div className="staff-login-icon">
                <Users size={27} />
              </div>

              <span className="staff-login-eyebrow">
                DEPARTMENT STAFF
              </span>

              <h1>
                Welcome back
              </h1>

              <p>
                Sign in to view your assigned complaints,
                manage your work progress, and submit
                resolution reports.
              </p>

            </div>


            {/* ERROR */}

            {errorMessage && (

              <div
                className="staff-error-message"
                role="alert"
              >

                <AlertCircle size={19} />

                <span>
                  {errorMessage}
                </span>

              </div>

            )}


            {/* LOGIN FORM */}

            <form
              className="staff-login-form"
              onSubmit={handleSubmit}
            >


              {/* EMAIL */}

              <div className="staff-form-group">

                <label htmlFor="staff-email">
                  Email Address
                </label>

                <div className="staff-input-wrapper">

                  <Mail size={19} />

                  <input
                    id="staff-email"
                    type="email"
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrorMessage('');
                    }}
                    autoComplete="username"
                    required
                    disabled={loading}
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="staff-form-group">

                <label htmlFor="staff-password">
                  Password
                </label>

                <div className="staff-input-wrapper">

                  <Lock size={19} />

                  <input
                    id="staff-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage('');
                    }}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />


                  <button
                    type="button"
                    className="staff-password-toggle"
                    onClick={() => {
                      setShowPassword(
                        (current) => !current
                      );
                    }}
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    disabled={loading}
                  >

                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />
                    }

                  </button>

                </div>

              </div>


              {/* SUBMIT */}

              <button
                type="submit"
                className="staff-submit-button"
                disabled={loading}
              >

                {loading ? (

                  <>
                    <LoaderCircle
                      size={19}
                      className="staff-loading-icon"
                    />

                    Signing in...

                  </>

                ) : (

                  <>
                    Sign in to Staff Portal

                    <ArrowRight size={19} />
                  </>

                )}

              </button>

            </form>


            {/* SECURITY */}

            <div className="staff-login-security">

              <ShieldCheck size={18} />

              <span>
                Secure access for authorized department staff.
              </span>

            </div>

          </div>


          {/* INFORMATION PANEL */}

          <aside className="staff-login-information">

            <span className="staff-info-label">
              CIVICFIX FIELD OPERATIONS
            </span>


            <h2>
              Your work makes
              <br />
              communities better.
            </h2>


            <p>
              Access assigned civic complaints, coordinate
              your work, and keep citizens informed about
              the progress of their reported issues.
            </p>


            <div className="staff-feature-list">


              <div className="staff-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>

                  <strong>
                    Assigned complaints
                  </strong>

                  <small>
                    View complaints assigned to you.
                  </small>

                </div>

              </div>


              <div className="staff-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>

                  <strong>
                    Work progress
                  </strong>

                  <small>
                    Accept assignments and update your work
                    through the supported workflow.
                  </small>

                </div>

              </div>


              <div className="staff-feature-item">

                <span>
                  <CheckCircle2 size={19} />
                </span>

                <div>

                  <strong>
                    Resolution submission
                  </strong>

                  <small>
                    Submit work descriptions and supporting
                    evidence.
                  </small>

                </div>

              </div>


            </div>

          </aside>

        </section>


        {/* FOOTER */}

        <footer className="staff-login-footer">

          © {new Date().getFullYear()} CivicFix.
          Department Staff Portal.

        </footer>

      </div>

    </main>
  );
}