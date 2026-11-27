import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  User,
  Mail,
  Phone,
  LockKeyhole,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './SeniorCitizenManagerRegister.css';

const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  state: '',
  district: '',
  address: '',
  password: '',
  password_confirm: '',
};

export default function SeniorCitizenManagerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = form.email.trim().toLowerCase();

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (form.password !== form.password_confirm) {
      setError('Password and confirm password do not match.');
      return;
    }

    if (!form.state || !form.district.trim()) {
      setError('Please select your state and enter your district.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: normalizedEmail,
        phone_number: form.phone_number.trim(),
        state: form.state,
        district: form.district.trim(),
        address: form.address.trim(),
      };

      const response = await api.post(
        '/auth/senior-citizen/manager/register/',
        payload
      );

      navigate('/verify-email?portal=senior_citizen_manager', {
        replace: true,
        state: {
          email: normalizedEmail,
          message:
            response.data?.message ||
            'Registration successful. Please verify your email.',
          accountType: 'senior_citizen_manager',
          returnPath: '/senior-citizen/manager/login',
        },
      });
    } catch (err) {
      setError(
        err.response
          ? getApiErrorMessage(err)
          : err.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Google registration for Senior Citizen Manager.
  const handleGoogleRegister = async () => {
    setError('');

    if (!form.state || !form.district.trim()) {
      setError(
        'Please select your state and enter your district before continuing with Google.'
      );
      return;
    }

    setGoogleLoading(true);

    try {
      const response = await api.post(
        '/auth/senior-citizen/manager/google/register/',
        {
          state: form.state,
          district: form.district.trim(),
        }
      );

      const authorizationUrl = response.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          'Google registration URL was not returned by the server.'
        );
      }

      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(
        err.response
          ? getApiErrorMessage(err)
          : err.message ||
              'Google registration could not be started. Please try again.'
      );

      setGoogleLoading(false);
    }
  };

  return (
    <main className="scmr-page">
      <div className="scmr-decoration scmr-decoration-one" />
      <div className="scmr-decoration scmr-decoration-two" />

      <div className="scmr-container">
        {/* Header */}

        <header className="scmr-header">
          <Link to="/" className="scmr-brand">
            <span className="scmr-brand-icon">
              <HeartHandshake size={24} />
            </span>

            <span>
              CivicFix
              <small>Senior Citizen Care</small>
            </span>
          </Link>

          <Link
            to="/senior-citizen/manager/login"
            className="scmr-header-login"
          >
            Already registered?
            <strong>Sign in</strong>
          </Link>
        </header>

        {/* Registration Content */}

        <section className="scmr-content">
          {/* Information */}

          <aside className="scmr-information">
            <span className="scmr-eyebrow">
              SENIOR CITIZEN MANAGEMENT
            </span>

            <h1>
              Join us in
              <br />
              caring for seniors.
            </h1>

            <p>
              Create your manager account to coordinate
              senior citizen assistance, manage service
              areas and support elderly citizens in
              your district.
            </p>

            <div className="scmr-benefits">
              <div className="scmr-benefit">
                <span>
                  <ShieldCheck size={19} />
                </span>

                <div>
                  <strong>Secure manager account</strong>
                  <small>
                    Verified access to the management portal.
                  </small>
                </div>
              </div>

              <div className="scmr-benefit">
                <span>
                  <MapPin size={19} />
                </span>

                <div>
                  <strong>District-based management</strong>
                  <small>Register your state and district.</small>
                </div>
              </div>

              <div className="scmr-benefit">
                <span>
                  <HeartHandshake size={19} />
                </span>

                <div>
                  <strong>Coordinate assistance</strong>
                  <small>
                    Help organize services for senior citizens.
                  </small>
                </div>
              </div>
            </div>
          </aside>

          {/* Registration Form */}

          <div className="scmr-card">
            <div className="scmr-card-heading">
              <div className="scmr-card-icon">
                <User size={23} />
              </div>

              <span className="scmr-eyebrow">
                MANAGER REGISTRATION
              </span>

              <h2>Create your account</h2>

              <p>
                Enter your details to register as a
                Senior Citizen Manager.
              </p>
            </div>

            {error && (
              <div className="scmr-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="scmr-form"
              onSubmit={handleSubmit}
            >
              {/* Name */}

              <div className="scmr-field-row">
                <div className="scmr-field">
                  <label htmlFor="scmr-first-name">
                    First Name <span>*</span>
                  </label>

                  <div className="scmr-input">
                    <User size={17} />

                    <input
                      id="scmr-first-name"
                      name="first_name"
                      type="text"
                      placeholder="First name"
                      value={form.first_name}
                      onChange={updateForm}
                      autoComplete="given-name"
                      required
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

                <div className="scmr-field">
                  <label htmlFor="scmr-last-name">
                    Last Name <span>*</span>
                  </label>

                  <div className="scmr-input">
                    <User size={17} />

                    <input
                      id="scmr-last-name"
                      name="last_name"
                      type="text"
                      placeholder="Last name"
                      value={form.last_name}
                      onChange={updateForm}
                      autoComplete="family-name"
                      required
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}

              <div className="scmr-field">
                <label htmlFor="scmr-email">
                  Email Address <span>*</span>
                </label>

                <div className="scmr-input">
                  <Mail size={17} />

                  <input
                    id="scmr-email"
                    name="email"
                    type="email"
                    placeholder="manager@example.com"
                    value={form.email}
                    onChange={updateForm}
                    autoComplete="email"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              {/* Phone */}

              <div className="scmr-field">
                <label htmlFor="scmr-phone">
                  Phone Number
                </label>

                <div className="scmr-input">
                  <Phone size={17} />

                  <input
                    id="scmr-phone"
                    name="phone_number"
                    type="tel"
                    placeholder="Enter phone number"
                    value={form.phone_number}
                    onChange={updateForm}
                    autoComplete="tel"
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              {/* State and District */}

              <div className="scmr-field-row">
                <div className="scmr-field">
                  <label htmlFor="scmr-state">
                    State <span>*</span>
                  </label>

                  <div className="scmr-input scmr-select-wrap">
                    <MapPin size={17} />

                    <select
                      id="scmr-state"
                      name="state"
                      value={form.state}
                      onChange={updateForm}
                      required
                      disabled={loading || googleLoading}
                    >
                      <option value="">Select state</option>

                      {STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="scmr-field">
                  <label htmlFor="scmr-district">
                    District <span>*</span>
                  </label>

                  <div className="scmr-input">
                    <MapPin size={17} />

                    <input
                      id="scmr-district"
                      name="district"
                      type="text"
                      placeholder="Enter district"
                      value={form.district}
                      onChange={updateForm}
                      required
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}

              <div className="scmr-field">
                <label htmlFor="scmr-address">
                  Address
                </label>

                <div className="scmr-input scmr-address-input">
                  <MapPin size={17} />

                  <textarea
                    id="scmr-address"
                    name="address"
                    placeholder="Enter your address"
                    value={form.address}
                    onChange={updateForm}
                    rows={2}
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              {/* Password */}

              <div className="scmr-field">
                <label htmlFor="scmr-password">
                  Password <span>*</span>
                </label>

                <div className="scmr-input">
                  <LockKeyhole size={17} />

                  <input
                    id="scmr-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={updateForm}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={loading || googleLoading}
                  />

                  <button
                    type="button"
                    className="scmr-eye"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}

              <div className="scmr-field">
                <label htmlFor="scmr-confirm-password">
                  Confirm Password <span>*</span>
                </label>

                <div className="scmr-input">
                  <LockKeyhole size={17} />

                  <input
                    id="scmr-confirm-password"
                    name="password_confirm"
                    type={
                      showConfirmPassword ? 'text' : 'password'
                    }
                    placeholder="Re-enter your password"
                    value={form.password_confirm}
                    onChange={updateForm}
                    autoComplete="new-password"
                    required
                    disabled={loading || googleLoading}
                  />

                  <button
                    type="button"
                    className="scmr-eye"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                className="scmr-submit"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="scmr-spinner"
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Manager Account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Google Registration Section */}

            

            <div className="scmr-security-note">
              <ShieldCheck size={16} />
              Your information is protected by CivicFix.
            </div>

            <div className="scmr-login-footer">
              Already have an account?

              <Link to="/senior-citizen/manager/login">
                Sign in here
              </Link>
            </div>
          </div>
        </section>

        <footer className="scmr-page-footer">
          © {new Date().getFullYear()} CivicFix.
          Senior Citizen Management Portal.
        </footer>
      </div>
    </main>
  );
}