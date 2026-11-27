import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImagePlus,
  Lock,
  MapPin,
  Plus,
  Video,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import LocationMap from '../../components/LocationMap';
import './SubmitComplaint.css';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const LOCATION_TIMEOUT = 30000;
const MAX_ACCEPTABLE_ACCURACY = 100;
const MAX_ALLOWED_LOCATION_UNCERTAINTY = 1000;

const INITIAL_FORM = {
  department: '',
  title: '',
  description: '',
  category: '',
  location: '',
  latitude: '',
  longitude: '',
};

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(' ')
          : typeof value === 'string'
            ? value
            : JSON.stringify(value);

        return `${
          field === 'non_field_errors' ? 'Form' : field
        }: ${message}`;
      })
      .join('\n');
  }

  return (
    getApiErrorMessage(error) ||
    'Unable to submit your complaint. Please try again.'
  );
}

function getDepartmentsArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function getDepartmentName(department) {
  return (
    department.name ||
    department.department_name ||
    department.title ||
    department.code ||
    `Department ${department.id}`
  );
}

/**
 * Exclude Senior Citizen departments when the API
 * provides an explicit module/type indicator.
 */
function isCivicFixDepartment(department) {
  const seniorCitizenFlag =
    department.is_senior_citizen_department === true ||
    department.is_senior_citizen === true;

  if (seniorCitizenFlag) return false;

  const type = [
    department.department_type,
    department.service_type,
    department.module,
    department.portal,
    department.system,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return !type.includes('senior citizen');
}

export default function SubmitComplaint() {
  const navigate = useNavigate();

  const imageInput = useRef(null);
  const videoInput = useRef(null);

  const locationWatchRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const locationFinishedRef = useRef(true);
  const bestPositionRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] =
    useState(true);
  const [departmentsError, setDepartmentsError] =
    useState('');

  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [imagePreview, setImagePreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationAccuracy, setLocationAccuracy] =
    useState(null);
  const [locationWarning, setLocationWarning] =
    useState('');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load active CivicFix departments.
  useEffect(() => {
    let cancelled = false;

    const loadActiveDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        setDepartmentsError('');

        const response = await api.get(
          '/departments/active/'
        );

        const items = getDepartmentsArray(response.data)
          .filter(
            (department) =>
              department?.id !== undefined &&
              department?.id !== null
          )
          .filter(isCivicFixDepartment);

        if (!cancelled) {
          setDepartments(items);
        }
      } catch (requestError) {
        if (!cancelled) {
          setDepartments([]);

          setDepartmentsError(
            getApiErrorMessage(requestError) ||
              'Unable to load active CivicFix departments. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false);
        }
      }
    };

    loadActiveDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  // Release preview URLs when replaced or when this page unmounts.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [imagePreview, videoPreview]);

  // Stop location tracking if the page is unmounted.
  useEffect(() => {
    return () => {
      locationFinishedRef.current = true;

      if (locationWatchRef.current !== null) {
        navigator.geolocation?.clearWatch(
          locationWatchRef.current
        );
        locationWatchRef.current = null;
      }

      if (locationTimeoutRef.current !== null) {
        window.clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
    };
  }, []);

  // Update ordinary form fields.
  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  // Update coordinates selected on the map or entered manually.
  const updateCoordinate = (field, value) => {
    if (field !== 'latitude' && field !== 'longitude') {
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    // Manual correction replaces the browser reading.
    setLocationAccuracy(null);

    setLocationWarning(
      'Coordinates adjusted manually. Verify that the marker is at the actual complaint location before submitting.'
    );

    setError('');
    setSuccess('');
  };

  // Validate and select the complaint image.
  const selectImage = (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('The image must be 10 MB or smaller.');
      return;
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  // Validate and select the complaint video.
  const selectVideo = (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    if (!VIDEO_TYPES.includes(file.type)) {
      setError('Choose an MP4, WebM, or MOV video.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError('The video must be 100 MB or smaller.');
      return;
    }

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  // Stop the current location request and release its timer.
  const stopLocationTracking = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(
        locationWatchRef.current
      );
      locationWatchRef.current = null;
    }

    if (locationTimeoutRef.current !== null) {
      window.clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
  };

  /*
   * Capture the current browser location.
   *
   * Keep listening for updates instead of accepting the first
   * inaccurate location returned by Windows.
   *
   * Important:
   * JavaScript cannot force Windows to provide GPS coordinates.
   * If Windows only supplies an approximate IP-based location,
   * this function reports that result instead of treating it as
   * an accurate live location.
   */
  const detectLiveLocation = () => {
    if (!window.isSecureContext) {
      setLocationLoading(false);
      setError(
        'Location access requires HTTPS or localhost. Open CivicFix using http://localhost:5173.'
      );
      return;
    }

    if (!navigator.geolocation) {
      setLocationLoading(false);

      setError(
        'Location detection is not supported by this browser. Select the location directly on the map or enter coordinates manually.'
      );

      return;
    }

    // Cancel any previous request.
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

      const {
        latitude,
        longitude,
        accuracy,
      } = position.coords;

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

    const finishLocationRequest = (
      position,
      errorMessage = ''
    ) => {
      if (locationFinishedRef.current) return;

      locationFinishedRef.current = true;

      stopLocationTracking();
      setLocationLoading(false);

      if (!position || !isValidPosition(position)) {
        setError(
          errorMessage ||
            'Unable to obtain a valid location. Try again, or select the complaint location directly on the map.'
        );

        return;
      }

      const {
        latitude,
        longitude,
        accuracy,
      } = position.coords;

      console.info('CivicFix location diagnostic:', {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
        capturedAt: new Date().toISOString(),
      });

      /*
       * Reject very coarse readings.
       * The previous test on this laptop returned approximately
       * 100,000 metres of uncertainty, which is not a useful
       * complaint location.
       */
      if (accuracy > MAX_ALLOWED_LOCATION_UNCERTAINTY) {
        setLocationAccuracy(accuracy);

        setLocationWarning(
          `Windows/browser returned a location with approximately ${Math.round(
            accuracy
          )} metres of uncertainty. CivicFix has rejected this as an accurate live location. Your laptop's location provider is not returning a precise fix. Try again, or use CivicFix on a phone with location services enabled.`
        );

        return;
      }

      // A usable position was received.
      setForm((current) => ({
        ...current,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));

      setLocationAccuracy(accuracy);

      if (accuracy > MAX_ACCEPTABLE_ACCURACY) {
        setLocationWarning(
          `A location was received, but its reported uncertainty is approximately ±${Math.round(
            accuracy
          )} metres. Verify the marker and correct the location on the map if necessary.`
        );
      } else {
        setLocationWarning(
          `Location captured with reported accuracy of approximately ±${Math.round(
            accuracy
          )} metres. Verify the marker before submitting.`
        );
      }

      setError('');
    };

    const onSuccess = (position) => {
      if (locationFinishedRef.current) return;

      if (!isValidPosition(position)) {
        return;
      }

      const accuracy = position.coords.accuracy;

      const previousBest = bestPositionRef.current;

      /*
       * Remember the most accurate reading received so far.
       * Continue listening when the accuracy is poor.
       */
      if (
        !previousBest ||
        accuracy < previousBest.coords.accuracy
      ) {
        bestPositionRef.current = position;
      }

      console.info('CivicFix location reading:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
        timestamp: position.timestamp,
      });

      /*
       * Accept immediately only when the reported accuracy
       * meets the desired threshold.
       */
      if (accuracy <= MAX_ACCEPTABLE_ACCURACY) {
        finishLocationRequest(position);
      }
    };

    const onError = (locationError) => {
      if (locationFinishedRef.current) return;

      console.error(
        'CivicFix browser geolocation error:',
        {
          code: locationError.code,
          message: locationError.message,
        }
      );

      /*
       * Permission denial cannot be fixed by waiting, so stop.
       * For other errors, allow the outer timer to finish the
       * request and inspect any position already received.
       */
      if (locationError.code === 1) {
        finishLocationRequest(
          null,
          'Location permission was denied. Allow location access for localhost in your browser settings, then try again.'
        );
      }
    };

    try {
      locationWatchRef.current =
        navigator.geolocation.watchPosition(
          onSuccess,
          onError,
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: LOCATION_TIMEOUT,
          }
        );

      /*
       * Keep tracking for up to 30 seconds.
       * At the end, use the best reading only if it is sufficiently
       * accurate; otherwise show the location provider warning.
       */
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
      }, LOCATION_TIMEOUT);
    } catch (locationError) {
      locationFinishedRef.current = true;

      stopLocationTracking();

      setLocationLoading(false);

      setError(
        'The browser could not start location detection. Check location permission and try again.'
      );

      console.error(
        'CivicFix geolocation setup error:',
        locationError
      );
    }
  };

  // Validate and submit the complaint.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!form.department) {
      setError(
        'Please select an active CivicFix department.'
      );

      return;
    }

    if (
      form.latitude === '' ||
      form.longitude === ''
    ) {
      setError(
        'Enter your location coordinates or select the location on the map before submitting.'
      );

      return;
    }

    // Do not block submission solely because a browser reading
    // was inaccurate. Citizens can correct the location on the map.

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        'Please enter valid latitude and longitude coordinates.'
      );

      return;
    }

    if (!image || !video) {
      setError(
        'Both a complaint image and a video are required.'
      );

      return;
    }

    const payload = new FormData();

    payload.append('department', form.department);
    payload.append('title', form.title.trim());

    payload.append(
      'description',
      form.description.trim()
    );

    payload.append('category', form.category.trim());
    payload.append('location', form.location.trim());
    payload.append('latitude', String(latitude));
    payload.append('longitude', String(longitude));
    payload.append('image', image);
    payload.append('video', video);

    try {
      setSubmitting(true);

      const response = await api.post(
        '/reports/',
        payload,
        {
          timeout: 120000,
          headers: {
            'Content-Type': undefined,
          },
        }
      );

      const report = response.data;

      setSuccess(
        `Complaint #${report.id} was submitted successfully.`
      );

      navigate('/user/complaints', {
        replace: true,
        state: {
          message: `Complaint #${report.id} was submitted successfully.`,
        },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="sc-page">
      <div className="sc-heading">
        <button
          type="button"
          className="sc-back"
          onClick={() => navigate('/user/complaints')}
        >
          <span aria-hidden="true">←</span>
          My Complaints
        </button>

        <div className="sc-title-row">
          <div>
            <span className="sc-eyebrow">
              CITIZEN SERVICES
            </span>

            <h1>Submit a complaint</h1>

            <p>
              Tell us about the civic issue so the responsible
              department can review it.
            </p>
          </div>

          
        </div>
      </div>

      {error && (
        <div
          className="sc-alert sc-alert-error"
          role="alert"
        >
          <strong>Unable to continue</strong>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          className="sc-alert sc-alert-success"
          role="status"
        >
          {success}
        </div>
      )}

      <form
        className="sc-form"
        onSubmit={handleSubmit}
      >
        {/* SECTION 01: COMPLAINT DETAILS */}

        <section className="sc-card">
          <div className="sc-card-heading">
            <span className="sc-step">01</span>

            <div>
              <h2>Complaint details</h2>

              <p>
                Describe the issue and select its department.
              </p>
            </div>
          </div>

          <div className="sc-grid">
            <label className="sc-field">
              <span>
                Department <b>*</b>
              </span>

              <select
                name="department"
                value={form.department}
                onChange={updateField}
                required
                disabled={
                  departmentsLoading ||
                  departments.length === 0
                }
              >
                <option value="">
                  {departmentsLoading
                    ? 'Loading active departments...'
                    : departments.length === 0
                      ? 'No active CivicFix departments available'
                      : 'Select a department'}
                </option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={String(department.id)}
                  >
                    {getDepartmentName(department)}
                  </option>
                ))}
              </select>

              <small>
                {departmentsError ||
                  (departmentsLoading
                    ? 'Fetching active CivicFix departments.'
                    : departments.length > 0
                      ? 'Only active CivicFix departments are intended to be shown.'
                      : 'No eligible departments were returned. Please contact support.')}
              </small>
            </label>

            <label className="sc-field">
              <span>
                Category <b>*</b>
              </span>

              <input
                name="category"
                value={form.category}
                onChange={updateField}
                maxLength={100}
                placeholder="e.g. Water Supply"
                required
              />
            </label>

            <label className="sc-field sc-field-full">
              <span>
                Complaint title <b>*</b>
              </span>

              <input
                name="title"
                value={form.title}
                onChange={updateField}
                maxLength={200}
                placeholder="Briefly describe the issue"
                required
              />
            </label>

            <label className="sc-field sc-field-full">
              <span>
                Description <b>*</b>
              </span>

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows={5}
                placeholder="Explain what happened, where it occurred, and any details that may help."
                required
              />
            </label>
          </div>
        </section>

        {/* SECTION 02: LOCATION */}

        <section className="sc-card">
          <div className="sc-card-heading">
            <span className="sc-step">02</span>

            <div>
              <h2>Issue location</h2>

              <p>
                Capture your current coordinates and provide a
                recognizable location description.
              </p>
            </div>
          </div>

          <label className="sc-field">
            <span>
              Location description <b>*</b>
            </span>

            <input
              name="location"
              value={form.location}
              onChange={updateField}
              maxLength={255}
              placeholder="Street, junction, landmark, or locality"
              required
            />
          </label>

          <div className="sc-location-panel">
            <div
              className="sc-location-symbol"
              aria-hidden="true"
            >
              <MapPin aria-hidden="true" />
            </div>

            <div className="sc-location-copy">
              <strong>Location coordinates</strong>

              {form.latitude !== '' &&
              form.longitude !== '' ? (
                <p>
                  Latitude: {form.latitude}
                  <br />
                  Longitude: {form.longitude}

                  {locationAccuracy !== null && (
                    <>
                      <br />
                      Browser accuracy estimate: ±
                      {Math.round(locationAccuracy)} metres
                    </>
                  )}
                </p>
              ) : (
                <p>
                  No coordinates selected yet. Use your
                  location or enter coordinates below.
                </p>
              )}
            </div>

            <button
              type="button"
              className="sc-secondary-button"
              onClick={detectLiveLocation}
              disabled={locationLoading}
            >
              {locationLoading
                ? 'Locating…'
                : 'Use my location'}
            </button>
          </div>

          {locationWarning && (
            <div
              className="sc-alert"
              role="status"
              style={{ marginTop: '12px' }}
            >
              <p>{locationWarning}</p>
            </div>
          )}

          <LocationMap
            latitude={form.latitude}
            longitude={form.longitude}
            title="Complaint location preview"
            onCoordinateChange={updateCoordinate}
          />
        </section>

        {/* SECTION 03: EVIDENCE */}

        <section className="sc-card">
          <div className="sc-card-heading">
            <span className="sc-step">03</span>

            <div>
              <h2>Photo and video evidence</h2>

              <p>
                Both files are required by the current backend.
              </p>
            </div>
          </div>

          <div className="sc-upload-grid">
            <div className="sc-upload-box">
              <div
                className="sc-upload-icon"
                aria-hidden="true"
              >
                <ImagePlus aria-hidden="true" />
              </div>

              <h3>
                Complaint image <b>*</b>
              </h3>

              <p>
                JPG, PNG or WebP · Maximum 10 MB
              </p>

              {imagePreview && (
                <img
                  className="sc-image-preview"
                  src={imagePreview}
                  alt="Selected complaint evidence"
                />
              )}

              {image && (
                <span className="sc-file-name">
                  {image.name}
                </span>
              )}

              <input
                ref={imageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectImage}
                hidden
              />

              <button
                type="button"
                className="sc-upload-button"
                onClick={() => imageInput.current?.click()}
              >
                {image ? 'Change image' : 'Choose image'}
              </button>
            </div>

            <div className="sc-upload-box">
              <div
                className="sc-upload-icon"
                aria-hidden="true"
              >
                <Video aria-hidden="true" />
              </div>

              <h3>
                Complaint video <b>*</b>
              </h3>

              <p>
                MP4, WebM or MOV · Maximum 100 MB
              </p>

              {videoPreview && (
                <video
                  className="sc-video-preview"
                  src={videoPreview}
                  controls
                />
              )}

              {video && (
                <span className="sc-file-name">
                  {video.name}
                </span>
              )}

              <input
                ref={videoInput}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={selectVideo}
                hidden
              />

              <button
                type="button"
                className="sc-upload-button"
                onClick={() => videoInput.current?.click()}
              >
                {video ? 'Change video' : 'Choose video'}
              </button>
            </div>
          </div>
        </section>

        {/* SUBMIT */}

        <div className="sc-submit-bar">
          <p>
            <span aria-hidden="true"><Lock aria-hidden="true" /></span>
            Your complaint will be submitted to the selected
            department.
          </p>

          <div className="sc-submit-actions">
            <button
              type="button"
              className="sc-cancel-button"
              onClick={() => navigate('/user/complaints')}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="sc-submit-button"
              disabled={
                submitting ||
                locationLoading ||
                departmentsLoading ||
                departments.length === 0
              }
            >
              {submitting
                ? 'Submitting…'
                : 'Submit complaint'}

              {!submitting && (
                <span aria-hidden="true">→</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}