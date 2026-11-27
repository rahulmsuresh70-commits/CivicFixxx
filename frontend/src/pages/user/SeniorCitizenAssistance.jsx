
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/axios';
import LocationMap from '../../components/LocationMap';
import {
  CircleCheck,
  Clock3,
  FileText,
  HeartHandshake,
  MapPin,
  Plus,
  RefreshCw,
  Upload,
  UserRound,
} from 'lucide-react';
import './SeniorCitizenAssistance.css';

const BASE = '/senior-citizen/';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Staff assigned',
  in_progress: 'In progress',
  on_the_way: 'Staff on the way',
  arrived: 'Staff arrived',
  pickup_completed: 'Pickup completed',
  in_transit: 'In transit',
  completed: 'Completed',
  closed: 'Closed',
};

const ASSISTANCE_TYPES = [
  { value: 'medical', label: 'Medical assistance' },
  { value: 'daily_living', label: 'Daily living support' },
  { value: 'food', label: 'Food assistance' },
  { value: 'mobility', label: 'Mobility assistance' },
  { value: 'other', label: 'Other assistance' },
];

const EMPTY_FORM = {
  full_name: '',
  age: '60',
  phone_number: '',
  address: '',
  state: '',
  district: '',
  assistance_type: 'daily_living',
  description: '',
  pickup_location: '',
  destination: '',
  location_method: 'manual',
  current_location: '',
  latitude: '',
  longitude: '',
  preferred_datetime: '',
  priority: 'normal',
};

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.requests)) return data.requests;
  return [];
}

function formatDate(value) {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

function statusLabel(status) {
  return STATUS_LABELS[status] ||
    String(status || 'Unknown').replaceAll('_', ' ');
}

function getRequestId(request) {
  return request?.id ?? request?.pk;
}

function getAssignedStaffDetails(request) {
  // Read staff information from common nested and flat API response shapes.
  // This is frontend-only mapping; it does not call or change backend functions.
  const objects = [];
  const seen = new Set();

  const addObject = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && !seen.has(value)) {
      seen.add(value);
      objects.push(value);
    }
  };

  addObject(request);
  addObject(request?.assigned_staff_details);
  addObject(request?.staff_details);
  addObject(request?.assigned_staff);
  addObject(request?.staff);
  addObject(request?.assigned_staff_profile);
  addObject(request?.staff_profile);
  addObject(request?.assigned_staff_user);

  // Walk likely nested user/profile/staff objects without changing request data.
  for (let index = 0; index < objects.length; index += 1) {
    const item = objects[index];
    addObject(item?.assigned_staff_details);
    addObject(item?.staff_details);
    addObject(item?.assigned_staff);
    addObject(item?.staff);
    addObject(item?.staff_profile);
    addObject(item?.profile);
    addObject(item?.user);
    addObject(item?.assigned_user);
    addObject(item?.department_staff);
  }

  const firstValue = (keys) => {
    for (const object of objects) {
      for (const key of keys) {
        const value = object?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          if (typeof value !== 'object') return String(value).trim();
          if (value?.name && typeof value.name !== 'object') return String(value.name).trim();
          if (value?.full_name && typeof value.full_name !== 'object') return String(value.full_name).trim();
        }
      }
    }
    return '';
  };

  const firstName = firstValue(['first_name', 'firstName', 'staff_first_name']);
  const lastName = firstValue(['last_name', 'lastName', 'staff_last_name']);

  const fullName =
    firstValue([
      'assigned_staff_full_name',
      'staff_full_name',
      'assigned_staff_name',
      'staff_name',
      'full_name',
      'fullName',
      'name',
      'display_name',
      'displayName',
      'username',
    ]) ||
    [firstName, lastName].filter(Boolean).join(' ');

  const email = firstValue([
    'assigned_staff_email',
    'staff_email',
    'email',
    'email_address',
  ]);

  // Prefer explicit staff phone fields anywhere in the response. Generic phone
  // fields are read ONLY from nested assigned-staff/profile objects, never from
  // the request root (whose phone_number belongs to the citizen).
  const phone =
    firstValue([
      'assigned_staff_phone_number',
      'assigned_staff_phone',
      'staff_phone_number',
      'staff_phone',
    ]) ||
    (() => {
      const staffPhoneKeys = [
        'phone_number',
        'phoneNumber',
        'phone',
        'mobile_number',
        'mobile',
        'contact_number',
        'contactNumber',
      ];
      for (const object of objects.slice(1)) {
        for (const key of staffPhoneKeys) {
          const value = object?.[key];
          if (value !== null && value !== undefined && String(value).trim() !== '') {
            if (typeof value !== 'object') return String(value).trim();
          }
        }
      }
      return '';
    })();

  const location = firstValue([
    'assigned_staff_location',
    'assigned_staff_address',
    'staff_location',
    'staff_address',
    'location',
    'address',
    'office_address',
    'work_location',
  ]);

  const department = firstValue([
    'assigned_department_name',
    'department_name',
    'department',
  ]);

  const id =
    firstValue(['assigned_staff_id', 'staff_id']) ||
    (() => {
      for (const object of objects.slice(1)) {
        const value = object?.id ?? object?.pk;
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    })();

  // An assigned_staff field can be an ID rather than a nested object.
  const assignedStaffValue = request?.assigned_staff;
  const hasAssignment = Boolean(
    fullName ||
    email ||
    phone ||
    location ||
    (assignedStaffValue !== null && assignedStaffValue !== undefined && assignedStaffValue !== '') ||
    request?.assigned_staff_id ||
    request?.assigned_staff_name ||
    request?.assigned_staff_email ||
    request?.staff_id ||
    request?.staff_name ||
    ['assigned', 'in_progress', 'on_the_way', 'arrived', 'pickup_completed',
      'in_transit', 'completed', 'closed'].includes(request?.status)
  );

  return {
    fullName,
    email,
    phone,
    location,
    department: typeof department === 'string' ? department : '',
    id: id && id !== '[object Object]' ? id : '',
    hasAssignment,
  };
}

function SeniorCitizenAssistance() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [issues, setIssues] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [issueType, setIssueType] = useState('staff_not_arrived');
  const [issueDescription, setIssueDescription] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationWarning, setLocationWarning] = useState('');
  const locationWatchRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const locationFinishedRef = useRef(true);
  const bestPositionRef = useRef(null);
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshRequests = useCallback(async () => {
    try {
      const response = await api.get(BASE);
      setRequests(getList(response.data));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  useEffect(() => {
    return () => {
      locationFinishedRef.current = true;
      if (locationWatchRef.current !== null) {
        navigator.geolocation?.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      if (locationTimeoutRef.current !== null) {
        window.clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
    };
  }, []);

  const counts = useMemo(() => ({
    total: requests.length,
    active: requests.filter((item) =>
      !['completed', 'closed', 'rejected'].includes(item.status)
    ).length,
    completed: requests.filter((item) =>
      ['completed', 'closed'].includes(item.status)
    ).length,
  }), [requests]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openRequest = async (request) => {
    const id = getRequestId(request);
    if (!id) return;

    setSelected(request);
    setView('details');
    setDetailLoading(true);
    setError('');
    setSuccess('');
    setMessages([]);
    setIssues([]);

    try {
      const [detailResult, messageResult, issueResult] = await Promise.allSettled([
        api.get(`${BASE}${id}/`),
        api.get(`${BASE}${id}/messages/`),
        api.get(`${BASE}${id}/issues/`),
      ]);

      if (detailResult.status === 'fulfilled') {
        const data = detailResult.value.data;
        setSelected(data?.request ?? data);
      }

      if (messageResult.status === 'fulfilled') {
        setMessages(getList(messageResult.value.data));
      }

      if (issueResult.status === 'fulfilled') {
        setIssues(getList(issueResult.value.data));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (Number(form.age) < 60) {
      setError('The applicant must be at least 60 years old.');
      return;
    }

    if (form.location_method === 'manual' && !form.current_location.trim()) {
      setError('Enter the current location when using manual location.');
      return;
    }

    if (
      form.location_method === 'live' &&
      (!form.latitude || !form.longitude)
    ) {
      setError('Use the location button to capture GPS coordinates.');
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          payload.append(key, value);
        }
      });

      if (image) payload.append('image', image);

      await api.post(BASE, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Your assistance request was submitted successfully.');
      setForm(EMPTY_FORM);
      setImage(null);
      setLocationAccuracy(null);
      setLocationWarning('');
      setView('overview');
      setLoading(true);
      await refreshRequests();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (locationTimeoutRef.current !== null) {
      window.clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
  };

  const captureLocation = () => {
    if (!window.isSecureContext) {
      setError('Location access requires HTTPS or localhost. Open CivicFix using http://localhost:5173.');
      return;
    }

    if (!navigator.geolocation) {
      setError('Live location is not supported by this browser. You can use manual location instead.');
      return;
    }

    stopLocationTracking();
    locationFinishedRef.current = false;
    bestPositionRef.current = null;
    setLocationLoading(true);
    setError('');
    setSuccess('');
    setLocationWarning('');
    setLocationAccuracy(null);

    const isValidPosition = (position) => {
      if (!position?.coords) return false;
      const { latitude, longitude, accuracy } = position.coords;
      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Number.isFinite(accuracy) &&
        accuracy >= 0 &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      );
    };

    const finishLocationRequest = (position, errorMessage = '') => {
      if (locationFinishedRef.current) return;
      locationFinishedRef.current = true;
      stopLocationTracking();
      setLocationLoading(false);

      if (!position || !isValidPosition(position)) {
        setError(errorMessage || 'Unable to obtain a valid location. Try again or select your location on the map.');
        return;
      }

      const { latitude, longitude, accuracy } = position.coords;
      console.info('CivicFix senior citizen location diagnostic:', {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
        capturedAt: new Date().toISOString(),
      });

      // Do not accept a Windows/IP fallback as a precise live location.
      if (accuracy > 1000) {
        setLocationAccuracy(accuracy);
        setLocationWarning(
          `Windows/browser returned a location with approximately ${Math.round(accuracy)} metres of uncertainty. It was not accepted as a precise live location. Try again, or select the correct location on the map.`
        );
        return;
      }

      setForm((previous) => ({
        ...previous,
        location_method: 'live',
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        current_location: '',
      }));
      setLocationAccuracy(Math.round(accuracy));

      setLocationWarning(
        accuracy > 100
          ? `Location captured, but reported uncertainty is approximately ±${Math.round(accuracy)} metres. Verify the marker on the map.`
          : `Location captured with reported accuracy of approximately ±${Math.round(accuracy)} metres. Verify the marker before submitting.`
      );
      setError('');
    };

    const onSuccess = (position) => {
      if (locationFinishedRef.current || !isValidPosition(position)) return;

      const accuracy = position.coords.accuracy;
      const previousBest = bestPositionRef.current;
      if (!previousBest || accuracy < previousBest.coords.accuracy) {
        bestPositionRef.current = position;
      }

      console.info('CivicFix senior citizen location reading:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
        timestamp: position.timestamp,
      });

      if (accuracy <= 100) {
        finishLocationRequest(position);
      }
    };

    const onError = (locationError) => {
      if (locationFinishedRef.current) return;
      console.error('CivicFix senior citizen geolocation error:', {
        code: locationError.code,
        message: locationError.message,
      });

      if (locationError.code === 1) {
        finishLocationRequest(
          null,
          'Location permission was denied. Allow location access for localhost in Edge settings, then try again.'
        );
      }
      // For temporary/unavailable errors, keep listening until the timeout.
    };

    try {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
      );

      locationTimeoutRef.current = window.setTimeout(() => {
        if (locationFinishedRef.current) return;
        const bestPosition = bestPositionRef.current;
        if (bestPosition) {
          finishLocationRequest(bestPosition);
        } else {
          finishLocationRequest(
            null,
            'No valid location reading was received within 30 seconds. Check browser location permission and try again.'
          );
        }
      }, 30000);
    } catch (locationError) {
      locationFinishedRef.current = true;
      stopLocationTracking();
      setLocationLoading(false);
      setError('The browser could not start location detection. Check location permission and try again.');
      console.error('CivicFix senior citizen geolocation setup error:', locationError);
    }
  };

  const updateLocationCoordinate = (field, value) => {
    if (field !== 'latitude' && field !== 'longitude') return;
    setForm((previous) => ({
      ...previous,
      location_method: 'live',
      current_location: '',
      [field]: value,
    }));
    setLocationAccuracy(null);
    setLocationWarning('Location adjusted on the map. Verify the marker before submitting.');
    setError('');
    setSuccess('');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selected || !messageText.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const id = getRequestId(selected);
      await api.post(`${BASE}${id}/messages/`, {
        content: messageText.trim(),
      });
      setMessageText('');
      const response = await api.get(`${BASE}${id}/messages/`);
      setMessages(getList(response.data));
      setSuccess('Message sent.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const reportIssue = async (event) => {
    event.preventDefault();
    if (!selected || !issueDescription.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const id = getRequestId(selected);
      await api.post(`${BASE}${id}/issues/`, {
        issue_type: issueType,
        description: issueDescription.trim(),
      });
      setIssueDescription('');
      const response = await api.get(`${BASE}${id}/issues/`);
      setIssues(getList(response.data));
      setSuccess('Your issue report was submitted.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const verifyCompletion = async () => {
    if (!selected) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const id = getRequestId(selected);
      await api.post(`${BASE}${id}/verify-completion/`);
      setSuccess('Completion verified. Thank you.');
      await refreshRequests();
      await openRequest({ ...selected, status: 'closed' });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const backToOverview = () => {
    setView('overview');
    setSelected(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="sca-page">
      <div className="sca-heading-row">
        <div>
          <div className="sca-eyebrow">CITIZEN SERVICES</div>
          <h1>Senior Citizen Assistance</h1>
          <p>Request support, track your assistance, and stay connected with your assigned team.</p>
        </div>

        {view !== 'form' && view !== 'details' && (
          <button className="sca-primary" onClick={() => {
            setError('');
            setSuccess('');
            setView('form');
          }}>
            <span aria-hidden="true"><Plus aria-hidden="true" /></span> New assistance request
          </button>
        )}
      </div>

      {error && (
        <div className="sca-alert sca-alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      {success && (
        <div className="sca-alert sca-alert-success" role="status">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      {view === 'overview' && (
        <>
          <section className="sca-hero">
            <div className="sca-hero-copy">
             
              <h2>Support when you need it most.</h2>
              <p>Submit an assistance request and follow its progress from review to completion.</p>
              <button className="sca-hero-button" onClick={() => setView('form')}>
                Request assistance <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="sca-hero-art" aria-hidden="true">
              <div className="sca-art-circle sca-art-circle-one" />
              <div className="sca-art-circle sca-art-circle-two" />
              <div className="sca-art-card">
                <span className="sca-art-icon"><HeartHandshake aria-hidden="true" /></span>
                <strong>Care that connects</strong>
                <small>Request · Track · Receive support</small>
              </div>
            </div>
          </section>

          <section className="sca-stats">
            <article className="sca-stat-card">
              <span className="sca-stat-icon sca-icon-blue"><FileText aria-hidden="true" /></span>
              <div><span>Total requests</span><strong>{counts.total}</strong></div>
            </article>
            <article className="sca-stat-card">
              <span className="sca-stat-icon sca-icon-orange"><Clock3 aria-hidden="true" /></span>
              <div><span>In progress</span><strong>{counts.active}</strong></div>
            </article>
            <article className="sca-stat-card">
              <span className="sca-stat-icon sca-icon-green"><CircleCheck aria-hidden="true" /></span>
              <div><span>Completed</span><strong>{counts.completed}</strong></div>
            </article>
          </section>

          <section className="sca-section">
            <div className="sca-section-heading">
              <div>
                <h2>Your assistance requests</h2>
                <p>Review the latest status and open a request for more details.</p>
              </div>
              <button className="sca-text-button" onClick={refreshRequests}>Refresh <RefreshCw aria-hidden="true" /></button>
            </div>

            {loading ? (
              <div className="sca-empty"><span className="sca-spinner" />Loading your requests…</div>
            ) : requests.length === 0 ? (
              <div className="sca-empty">
                <span className="sca-empty-icon"><HeartHandshake aria-hidden="true" /></span>
                <h3>No assistance requests yet</h3>
                <p>Your submitted requests will appear here so you can follow their progress.</p>
                <button className="sca-primary" onClick={() => setView('form')}>Create your first request</button>
              </div>
            ) : (
              <div className="sca-request-list">
                {requests.map((request) => {
                  const id = getRequestId(request);
                  return (
                    <article className="sca-request-card" key={id}>
                      <div className="sca-request-symbol"><HeartHandshake aria-hidden="true" /></div>
                      <div className="sca-request-main">
                        <div className="sca-request-title-row">
                          <h3>{request.full_name || 'Assistance request'}</h3>
                          <span className={`sca-status sca-status-${request.status || 'unknown'}`}>
                            {statusLabel(request.status)}
                          </span>
                        </div>
                        <p>{request.description || 'No description provided.'}</p>
                        <div className="sca-request-meta">
                          <span>Request #{id}</span>
                          <span>{request.assistance_type?.replaceAll('_', ' ') || 'Assistance'}</span>
                          <span>{formatDate(request.created_at || request.submitted_at)}</span>
                        </div>
                      </div>
                      <button className="sca-outline-button" onClick={() => openRequest(request)}>
                        View details <span aria-hidden="true">→</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="sca-info-strip">
            <span className="sca-info-icon">i</span>
            <div>
              <strong>Need to update your request?</strong>
              <p>Requests can be edited while their status is still Submitted. Open a request to review the details.</p>
            </div>
          </section>
        </>
      )}

      {view === 'form' && (
        <section className="sca-panel">
          <div className="sca-panel-heading">
            <button className="sca-back-button" onClick={backToOverview}>← Back to requests</button>
            <span className="sca-form-step">NEW REQUEST</span>
            <h2>Request senior citizen assistance</h2>
            <p>Enter the applicant's details and explain the support needed. Fields marked * are required.</p>
          </div>

          <form className="sca-form" onSubmit={submitRequest}>
            <div className="sca-form-section">
              <h3><span>01</span> Applicant information</h3>
              <div className="sca-form-grid">
                <label className="sca-field">
                  Full name *
                  <input name="full_name" value={form.full_name} onChange={updateForm} required maxLength={150} placeholder="Enter full name" />
                </label>
                <label className="sca-field">
                  Age *
                  <input name="age" type="number" min="60" max="120" value={form.age} onChange={updateForm} required />
                  <small>Applicant must be 60 years or older.</small>
                </label>
                <label className="sca-field">
                  Phone number *
                  <input name="phone_number" type="tel" value={form.phone_number} onChange={updateForm} required placeholder="Enter contact number" />
                </label>
                <label className="sca-field sca-field-wide">
                  Residential address *
                  <textarea name="address" value={form.address} onChange={updateForm} required rows="2" placeholder="House name, street, and nearby landmark" />
                </label>
                <label className="sca-field">
                  State *
                  <input name="state" value={form.state} onChange={updateForm} required placeholder="Enter state" />
                </label>
                <label className="sca-field">
                  District *
                  <input name="district" value={form.district} onChange={updateForm} required placeholder="Enter district" />
                </label>
              </div>
            </div>

            <div className="sca-form-section">
              <h3><span>02</span> Assistance details</h3>
              <div className="sca-form-grid">
                <label className="sca-field">
                  Type of assistance *
                  <select name="assistance_type" value={form.assistance_type} onChange={updateForm} required>
                    {ASSISTANCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="sca-field">
                  Priority
                  <select name="priority" value={form.priority} onChange={updateForm}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <label className="sca-field sca-field-wide">
                  Describe the assistance needed *
                  <textarea name="description" value={form.description} onChange={updateForm} required rows="4" maxLength={5000} placeholder="Explain the support required and any important details…" />
                </label>
                <label className="sca-field">
                  Pickup location *
                  <input name="pickup_location" value={form.pickup_location} onChange={updateForm} required placeholder="Where should staff meet you?" />
                </label>
                <label className="sca-field">
                  Destination *
                  <input name="destination" value={form.destination} onChange={updateForm} required placeholder="Where do you need to go?" />
                </label>
                <label className="sca-field sca-field-wide">
                  Preferred date and time
                  <input name="preferred_datetime" type="datetime-local" value={form.preferred_datetime} onChange={updateForm} />
                </label>
              </div>
            </div>

            <div className="sca-form-section">
              <h3><span>03</span> Current location</h3>
              <p className="sca-section-note">Choose manual location or capture your current GPS coordinates.</p>
              <div className="sca-location-options">
                <label className={`sca-location-option ${form.location_method === 'manual' ? 'selected' : ''}`}>
                  <input type="radio" name="location_method" value="manual" checked={form.location_method === 'manual'} onChange={() => setForm((prev) => ({ ...prev, location_method: 'manual', latitude: '', longitude: '' }))} />
                  <span><strong>Enter manually</strong><small>Describe your current location</small></span>
                </label>
                <label className={`sca-location-option ${form.location_method === 'live' ? 'selected' : ''}`}>
                  <input type="radio" name="location_method" value="live" checked={form.location_method === 'live'} onChange={() => setForm((prev) => ({ ...prev, location_method: 'live' }))} />
                  <span><strong>Use live GPS</strong><small>Capture latitude and longitude</small></span>
                </label>
              </div>

              {form.location_method === 'manual' ? (
                <label className="sca-field sca-field-location">
                  Current location *
                  <textarea name="current_location" value={form.current_location} onChange={updateForm} required rows="2" placeholder="Enter your current location or nearby landmark" />
                </label>
              ) : (
                <div className="sca-gps-box">
                  <div>
                    <strong>{form.latitude && form.longitude ? 'Location selected' : 'GPS location required'}</strong>
                    <p>
                      {form.latitude && form.longitude
                        ? `Latitude ${form.latitude}, Longitude ${form.longitude}${locationAccuracy !== null ? ` · Accuracy ±${Math.round(locationAccuracy)} m` : ''}`
                        : 'Use live location or click the map to select the correct location.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sca-outline-button"
                    onClick={captureLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? 'Locating…' : (<><MapPin aria-hidden="true" /> Get my location</>)}
                  </button>
                </div>
              )}

              {form.location_method === 'live' && (
                <>
                  {locationWarning && (
                    <div className="sca-alert" role="status" style={{ marginTop: '12px' }}>
                      <p>{locationWarning}</p>
                    </div>
                  )}
                  <LocationMap
                    latitude={form.latitude}
                    longitude={form.longitude}
                    title="Current location preview"
                    onCoordinateChange={updateLocationCoordinate}
                  />
                </>
              )}
            </div>

            <div className="sca-form-section">
              <h3><span>04</span> Supporting image <small>OPTIONAL</small></h3>
              <label className="sca-upload">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError('Image must be 5 MB or smaller.');
                    event.target.value = '';
                    setImage(null);
                    return;
                  }
                  setError('');
                  setImage(file || null);
                }} />
                <span className="sca-upload-icon"><Upload aria-hidden="true" /></span>
                <strong>{image ? image.name : 'Upload a supporting image'}</strong>
                <small>JPG, PNG or WebP · Maximum 5 MB</small>
                {image && <span className="sca-file-size">{(image.size / 1024 / 1024).toFixed(2)} MB selected</span>}
              </label>
            </div>

            <div className="sca-form-actions">
              <button type="button" className="sca-outline-button" onClick={backToOverview}>Cancel</button>
              <button type="submit" className="sca-primary" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit assistance request →'}
              </button>
            </div>
          </form>
        </section>
      )}

      {view === 'details' && selected && (
        <section className="sca-panel sca-details-panel">
          <button className="sca-back-button" onClick={backToOverview}>← Back to requests</button>

          {detailLoading ? (
            <div className="sca-empty"><span className="sca-spinner" />Loading request details…</div>
          ) : (
            <>
              <div className="sca-detail-heading">
                <div>
                  <span className="sca-form-step">REQUEST #{getRequestId(selected)}</span>
                  <h2>{selected.full_name || 'Assistance request'}</h2>
                  <p>Submitted {formatDate(selected.created_at || selected.submitted_at)}</p>
                </div>
                <span className={`sca-status sca-status-${selected.status || 'unknown'}`}>{statusLabel(selected.status)}</span>
              </div>

              <div className="sca-progress">
                {['submitted', 'approved', 'assigned', 'in_progress', 'completed'].map((step, index) => {
                  const stages = ['submitted', 'under_review', 'approved', 'assigned', 'in_progress', 'on_the_way', 'arrived', 'pickup_completed', 'in_transit', 'completed', 'closed'];
                  const current = stages.indexOf(selected.status);
                  const active = current >= 0 && stages.indexOf(step) <= current;
                  return (
                    <div className={`sca-progress-step ${active ? 'done' : ''}`} key={step}>
                      <span>{active ? '✓' : index + 1}</span>
                      <small>{statusLabel(step)}</small>
                    </div>
                  );
                })}
              </div>

              <div className="sca-detail-grid">
                <div><span>Assistance type</span><strong>{selected.assistance_type?.replaceAll('_', ' ') || '—'}</strong></div>
                <div><span>Priority</span><strong>{selected.priority || 'Normal'}</strong></div>
                <div><span>Phone</span><strong>{selected.phone_number || '—'}</strong></div>
                <div><span>Preferred time</span><strong>{formatDate(selected.preferred_datetime)}</strong></div>
                <div className="sca-detail-wide"><span>Description</span><strong>{selected.description || '—'}</strong></div>
                <div className="sca-detail-wide"><span>Address</span><strong>{selected.address || '—'}</strong></div>
                <div><span>Pickup location</span><strong>{selected.pickup_location || '—'}</strong></div>
                <div><span>Destination</span><strong>{selected.destination || '—'}</strong></div>
                {selected.deadline && <div><span>Deadline</span><strong>{formatDate(selected.deadline)}</strong></div>}
              </div>

              {(() => {
                const staff = getAssignedStaffDetails(selected);

                if (!staff.hasAssignment) {
                  return null;
                }

                return (
                  <section
                    className="sca-assigned-staff"
                    aria-labelledby="sca-assigned-staff-title"
                  >
                    <div className="sca-assigned-staff-heading">
                      <span className="sca-assigned-staff-avatar" aria-hidden="true"><UserRound aria-hidden="true" /></span>
                      <div>
                        <span className="sca-form-step">ASSIGNED TEAM MEMBER</span>
                        <h3 id="sca-assigned-staff-title">
                          {staff.fullName || 'Assigned staff'}
                        </h3>
                        <p>Contact details for the staff member assigned to this request.</p>
                      </div>
                    </div>

                    <div className="sca-assigned-staff-grid">
                      <div>
                        <span>Full name</span>
                        <strong>{staff.fullName || 'Not provided by API'}</strong>
                      </div>

                      {staff.id && (
                        <div>
                          <span>Staff ID</span>
                          <strong>{staff.id}</strong>
                        </div>
                      )}

                      <div>
                        <span>Email</span>
                        <strong>
                          {staff.email ? (
                            <a href={`mailto:${staff.email}`}>{staff.email}</a>
                          ) : (
                            'Not provided by API'
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Phone number</span>
                        <strong>
                          {staff.phone ? (
                            <a href={`tel:${staff.phone}`}>{staff.phone}</a>
                          ) : (
                            'Not provided by API'
                          )}
                        </strong>
                      </div>

                      <div className="sca-assigned-staff-wide">
                        <span>Location / address</span>
                        <strong>{staff.location || 'Not provided by API'}</strong>
                      </div>

                      {staff.department && (
                        <div className="sca-assigned-staff-wide">
                          <span>Department</span>
                          <strong>{staff.department}</strong>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {selected.image && (
                <div className="sca-image-preview">
                  <h3>Supporting image</h3>
                  <a href={selected.image} target="_blank" rel="noreferrer">
                    <img src={selected.image} alt="Assistance request supporting evidence" />
                  </a>
                </div>
              )}

              {selected.status === 'submitted' && (
                <div className="sca-info-strip">
                  <span className="sca-info-icon">i</span>
                  <div><strong>Request editing</strong><p>Your request can be edited while its status is Submitted. Use the edit action only if your backend permits the corresponding fields.</p></div>
                </div>
              )}

              {selected.status === 'completed' && (
                <div className="sca-completion-banner">
                  <div><strong>Has the assistance been completed?</strong><p>Verify completion if the requested assistance was provided.</p></div>
                  <button className="sca-primary" disabled={saving} onClick={verifyCompletion}>
                    {saving ? 'Please wait…' : 'Verify completion'}
                  </button>
                </div>
              )}

              <div className="sca-detail-columns">
                <section className="sca-subpanel">
                  <div className="sca-section-heading">
                    <div><h3>Messages</h3><p>Messages for this request</p></div>
                  </div>
                  <div className="sca-message-list">
                    {messages.length === 0 ? <p className="sca-muted">No messages yet.</p> : messages.map((message, index) => (
                      <article className="sca-message" key={message.id || index}>
                        <div className="sca-message-top"><strong>{message.sender_name || message.sender_email || 'Team member'}</strong><small>{formatDate(message.created_at)}</small></div>
                        <p>{message.content || message.message || ''}</p>
                      </article>
                    ))}
                  </div>
                  <form className="sca-inline-form" onSubmit={sendMessage}>
                    <label className="sca-field">
                      Send a message
                      <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} rows="2" maxLength={5000} required placeholder="Write a message…" />
                    </label>
                    <button className="sca-primary" disabled={saving || !messageText.trim()}>{saving ? 'Sending…' : 'Send message'}</button>
                  </form>
                </section>

                <section className="sca-subpanel">
                  <div className="sca-section-heading">
                    <div><h3>Report a problem</h3><p>Let the team know if something went wrong.</p></div>
                  </div>
                  <div className="sca-issue-list">
                    {issues.length === 0 ? <p className="sca-muted">No issues reported for this request.</p> : issues.map((issue, index) => (
                      <article className="sca-issue" key={issue.id || index}>
                        <div className="sca-message-top"><strong>{issue.issue_type?.replaceAll('_', ' ') || 'Issue'}</strong><span className={`sca-status sca-status-${issue.status || 'open'}`}>{statusLabel(issue.status || 'open')}</span></div>
                        <p>{issue.description}</p>
                        <small>{formatDate(issue.created_at)}</small>
                        {issue.manager_response && <p className="sca-manager-response"><strong>Response:</strong> {issue.manager_response}</p>}
                      </article>
                    ))}
                  </div>
                  <form className="sca-inline-form" onSubmit={reportIssue}>
                    <label className="sca-field">
                      Problem type *
                      <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
                        <option value="staff_not_arrived">Staff did not arrive</option>
                        <option value="pickup_not_completed">Pickup not completed</option>
                      </select>
                    </label>
                    <label className="sca-field">
                      Describe the problem *
                      <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} rows="3" maxLength={5000} required placeholder="Tell us what happened…" />
                    </label>
                    <button className="sca-primary" disabled={saving || !issueDescription.trim()}>{saving ? 'Submitting…' : 'Submit issue report'}</button>
                  </form>
                </section>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default SeniorCitizenAssistance;
