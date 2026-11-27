
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
} from 'lucide-react';

import api, {
  getApiErrorMessage,
} from '../../api/axios';

import './DepartmentManagerRegister.css';

export default function DepartmentManagerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    department_name: '',
    department_code: '',
    department_description: '',
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === 'department_code'
          ? value.toUpperCase()
          : value,
    }));

    setErrorMessage('');
  };

  // --------------------------------------------------
  // NORMAL EMAIL REGISTRATION
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (form.password !== form.password_confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        department_name: form.department_name.trim(),
        department_code: form.department_code.trim().toUpperCase(),
        department_description: form.department_description.trim(),
      };

      const response = await api.post(
        '/auth/civic/department/register/',
        payload
      );

      sessionStorage.setItem(
        'civicfix_department_verification_email',
        payload.email
      );

      sessionStorage.setItem(
        'civicfix_department_name',
        payload.department_name
      );

      navigate('/department/verify-email', {
        replace: true,
        state: {
          email: payload.email,
          departmentName: payload.department_name,
          message: response.data?.message,
        },
      });
    } catch (error) {
      setErrorMessage(
        error.response
          ? getApiErrorMessage(error)
          : error.message || 'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isSubmitting = loading;

  return (
    <main className="dm-register-page">

      <header className="dm-register-header">

        <Link to="/" className="dm-register-brand">
          <span className="dm-register-brand-icon">
            <ShieldCheck size={26} />
          </span>

          <span>
            Civic<span>Fix</span>
            <small>DEPARTMENT PORTAL</small>
          </span>
        </Link>

        <Link to="/department/login" className="dm-register-back">
          <ChevronLeft size={17} />
          Back to Login
        </Link>

      </header>

      <section className="dm-register-wrapper">

        <div className="dm-register-heading">

          <div className="dm-register-heading-icon">
            <Building2 size={28} />
          </div>

          <span>DEPARTMENT MANAGEMENT</span>

          <h1>Create Department Account</h1>

          <p>
            Register your department and create your
            Department Manager account.
          </p>

        </div>

        <div className="dm-register-card">

          {errorMessage && (
            <div className="dm-register-error" role="alert">
              <AlertCircle size={19} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* DEPARTMENT INFORMATION */}

            <div className="dm-register-section-title">
              <Building2 size={19} />

              <div>
                <h3>Department Information</h3>
                <p>Enter your department details.</p>
              </div>
            </div>

            <div className="dm-register-grid">

              <div className="dm-register-field full">
                <label htmlFor="department_name">
                  Department Name *
                </label>

                <input
                  id="department_name"
                  name="department_name"
                  placeholder="e.g. Water Authority"
                  value={form.department_name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  disabled={isSubmitting}
                />
              </div>

              <div className="dm-register-field full">
                <label htmlFor="department_code">
                  Department Code *
                </label>

                <input
                  id="department_code"
                  name="department_code"
                  placeholder="e.g. KWA001"
                  value={form.department_code}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  disabled={isSubmitting}
                />

                <small>
                  Use a unique department identification code.
                </small>
              </div>

              <div className="dm-register-field full">
                <label htmlFor="department_description">
                  Department Description
                </label>

                <textarea
                  id="department_description"
                  name="department_description"
                  placeholder="Describe the department's responsibilities..."
                  value={form.department_description}
                  onChange={handleChange}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

            </div>

            {/* MANAGER INFORMATION */}

            <div className="dm-register-section-title dm-register-manager-title">
              <User size={19} />

              <div>
                <h3>Manager Information</h3>
                <p>Create the department manager account.</p>
              </div>
            </div>

            <div className="dm-register-grid">

              <div className="dm-register-field">
                <label htmlFor="first_name">First Name *</label>

                <input
                  id="first_name"
                  name="first_name"
                  placeholder="First name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  disabled={isSubmitting}
                />
              </div>

              <div className="dm-register-field">
                <label htmlFor="last_name">Last Name *</label>

                <input
                  id="last_name"
                  name="last_name"
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  disabled={isSubmitting}
                />
              </div>

              <div className="dm-register-field full">
                <label htmlFor="email">Email Address *</label>

                <div className="dm-register-input-icon">
                  <Mail size={18} />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="manager@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="dm-register-field">
                <label htmlFor="password">Password *</label>

                <div className="dm-register-input-icon">
                  <Lock size={18} />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label="Toggle password visibility"
                    disabled={isSubmitting}
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="dm-register-field">
                <label htmlFor="password_confirm">
                  Confirm Password *
                </label>

                <div className="dm-register-input-icon">
                  <Lock size={18} />

                  <input
                    id="password_confirm"
                    name="password_confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={form.password_confirm}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label="Toggle confirm password visibility"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="dm-register-submit"
              disabled={isSubmitting}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="dm-register-spin"
                  />
                  Creating Department Account...
                </>
              ) : (
                <>
                  Create Department Account
                  <ArrowRight size={19} />
                </>
              )}
            </button>

          </form>

          <div className="dm-register-note">
            <ShieldCheck size={18} />

            <p>
              Your account must be verified before you can
              access the Department Manager Portal.
            </p>
          </div>

          <div className="dm-register-login-link">
            Already have a department account?
            <Link to="/department/login"> Sign in</Link>
          </div>

        </div>

      </section>

      <footer className="dm-register-footer">
        © {new Date().getFullYear()} CivicFix. Department Management Portal.
      </footer>

    </main>
  );
}
