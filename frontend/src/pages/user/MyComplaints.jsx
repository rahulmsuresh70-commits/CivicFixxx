import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import {
  CircleCheck,
  Clock3,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Tag,
  TrendingUp,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';

import './MyComplaints.css';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  transferred: 'Transferred',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
  verified: 'Verified',
  closed: 'Closed',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All complaints' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'verified', label: 'Verified' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

function getArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}


function getFirstStaffValue(staff, keys) {
  const sources = [
    staff,
    staff?.staff_profile,
    staff?.profile,
    staff?.staff,
    staff?.user,
    staff?.staff?.staff_profile,
    staff?.user?.staff_profile,
  ];

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const key of keys) {
      const value = source[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }

  return '';
}

function getAssignedStaffDetails(staff) {
  if (!staff || typeof staff !== 'object') return null;

  const firstName = getFirstStaffValue(staff, ['first_name']);
  const lastName = getFirstStaffValue(staff, ['last_name']);
  const fullName = getFirstStaffValue(staff, ['name', 'full_name', 'staff_name', 'username']);
  const phone = getFirstStaffValue(staff, [
    'phone_number',
    'phone',
    'mobile_number',
    'mobile',
    'contact_number',
  ]);
  const location = getFirstStaffValue(staff, [
    'location',
    'address',
    'staff_location',
    'work_location',
  ]);

  return {
    ...staff,
    name: fullName || [firstName, lastName].filter(Boolean).join(' '),
    email: getFirstStaffValue(staff, ['email', 'staff_email']),
    phone_number: phone,
    location,
  };
}

function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();

  return (
    STATUS_LABELS[normalized] ||
    normalized.replaceAll('_', ' ') ||
    'Unknown'
  );
}

function getStatusClass(status) {
  const normalized = String(status || 'unknown')
    .toLowerCase()
    .replaceAll('_', '-');

  return `mc-status-${normalized}`;
}

function getErrorMessage(error) {
  return (
    getApiErrorMessage(error) ||
    'Unable to load complaints. Please try again.'
  );
}

function getComplaintCounts(reports) {
  const statusOf = (report) =>
    String(report.status || '').toLowerCase();

  return {
    total: reports.length,

    submitted: reports.filter((report) =>
      ['submitted', 'under_review'].includes(
        statusOf(report),
      ),
    ).length,

    progress: reports.filter((report) =>
      [
        'approved',
        'transferred',
        'assigned',
        'in_progress',
        'reopened',
      ].includes(statusOf(report)),
    ).length,

    resolved: reports.filter((report) =>
      ['resolved', 'verified', 'closed'].includes(
        statusOf(report),
      ),
    ).length,
  };
}

function StatusBadge({ status }) {
  return (
    <span
      className={`mc-status-badge ${getStatusClass(status)}`}
    >
      <span className="mc-status-indicator" />

      {getStatusLabel(status)}
    </span>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  tone,
}) {
  return (
    <div className={`mc-summary-item mc-summary-${tone}`}>
      <div className="mc-summary-icon" aria-hidden="true">
        {icon}
      </div>

      <div className="mc-summary-text">
        <span>{label}</span>

        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ComplaintCard({
  report,
  onView,
}) {
  const description = String(
    report.description || '',
  ).trim();

  return (
    <article className="mc-complaint-card">
      <div className="mc-card-main">
        <div className="mc-card-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M5 3.75h9l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />

            <path d="M14 3.75v5h5" />

            <path d="M8 13h8M8 17h8" />
          </svg>
        </div>

        <div className="mc-card-heading">
          <div className="mc-card-eyebrow">
            <span>COMPLAINT #{report.id}</span>

            <span className="mc-card-dot">•</span>

            <span>{formatDate(report.created_at)}</span>
          </div>

          <h3>
            {report.title || `Complaint #${report.id}`}
          </h3>

          <div className="mc-card-category">
            <span className="mc-category-symbol"><Tag aria-hidden="true" /></span>

            {report.category || 'General complaint'}
          </div>
        </div>

        <div className="mc-card-status">
          <StatusBadge status={report.status} />
        </div>
      </div>

      {description && (
        <p className="mc-card-description">
          {description}
        </p>
      )}

      <div className="mc-card-divider" />

      <div className="mc-card-footer">
        <div className="mc-card-department">
          <span className="mc-footer-label">
            RESPONSIBLE DEPARTMENT
          </span>

          <strong>
            {report.department_name || 'Department unavailable'}
          </strong>

          {report.department_code && (
            <span className="mc-department-code">
              {report.department_code}
            </span>
          )}
        </div>

        <button
          type="button"
          className="mc-details-button"
          onClick={() => onView(report)}
        >
          View details

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  filtered,
  onClear,
  onSubmit,
}) {
  return (
    <div className="mc-empty-state">
      <div className="mc-empty-art">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="13"
            y="8"
            width="38"
            height="48"
            rx="7"
            fill="#EAF0FF"
          />

          <rect
            x="20"
            y="19"
            width="24"
            height="4"
            rx="2"
            fill="#7088F5"
          />

          <rect
            x="20"
            y="28"
            width="18"
            height="3"
            rx="1.5"
            fill="#A9B8FF"
          />

          <rect
            x="20"
            y="36"
            width="22"
            height="3"
            rx="1.5"
            fill="#A9B8FF"
          />

          <circle
            cx="47"
            cy="46"
            r="11"
            fill="#DDF8EB"
          />

          <path
            d="m42 46 3.5 3.5 6-7"
            stroke="#1B9A69"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3>
        {filtered
          ? 'No matching complaints'
          : 'Your complaint space is empty'}
      </h3>

      <p>
        {filtered
          ? 'Try another search term or change the status filter to find your complaints.'
          : 'Your submitted civic complaints will appear here, along with their latest status and department information.'}
      </p>

      {filtered ? (
        <button
          type="button"
          className="mc-primary-button"
          onClick={onClear}
        >
          Clear filters
        </button>
      ) : (
        <button
          type="button"
          className="mc-primary-button"
          onClick={onSubmit}
        >
          <span><Plus aria-hidden="true" /></span>
          Submit a complaint
        </button>
      )}
    </div>
  );
}


const WORKFLOW_STAGES = [
  { value: 'submitted', label: 'Submitted', detail: 'Your report was received.' },
  { value: 'under_review', label: 'Under review', detail: 'The report is being checked.' },
  { value: 'approved', label: 'Approved', detail: 'The report was approved for action.' },
  { value: 'assigned', label: 'Assigned', detail: 'The report was assigned to staff.' },
  { value: 'in_progress', label: 'In progress', detail: 'Work is underway.' },
  { value: 'resolved', label: 'Resolved', detail: 'A resolution has been recorded.' },
  { value: 'verified', label: 'Verified', detail: 'The resolution has been verified.' },
  { value: 'closed', label: 'Closed', detail: 'The report is closed.' },
];

function ComplaintWorkflow({ status }) {
  const normalized = String(status || 'submitted').toLowerCase();
  const isRejected = normalized === 'rejected';
  const isTransferred = normalized === 'transferred';
  const isReopened = normalized === 'reopened';
  const currentIndex = WORKFLOW_STAGES.findIndex(
    (stage) => stage.value === normalized,
  );
  const effectiveIndex = normalized === 'transferred' ? 2 : currentIndex;
  const stages = isRejected
    ? [
        WORKFLOW_STAGES[0],
        WORKFLOW_STAGES[1],
        { value: 'rejected', label: 'Rejected', detail: 'The report was rejected.' },
      ]
    : isTransferred
      ? [
          WORKFLOW_STAGES[0],
          WORKFLOW_STAGES[1],
          { value: 'transferred', label: 'Transferred', detail: 'The report was transferred for further handling.' },
          ...WORKFLOW_STAGES.slice(3),
        ]
      : isReopened
        ? [
            ...WORKFLOW_STAGES.slice(0, 5),
            { value: 'reopened', label: 'Reopened', detail: 'The report has been reopened for further action.' },
            ...WORKFLOW_STAGES.slice(5),
          ]
        : WORKFLOW_STAGES;
  const activeIndex = stages.findIndex((stage) => stage.value === normalized);
  const fallbackIndex = normalized === 'transferred'
    ? 2
    : normalized === 'reopened'
      ? 5
      : Math.max(0, effectiveIndex);

  return (
    <section className="mc-workflow-card" aria-label="Complaint status workflow">
      <div className="mc-workflow-heading">
        <div>
          <span className="mc-section-kicker">STATUS TRACKING</span>
          <h3>Complaint progress</h3>
          <p>Follow the report through the available processing stages.</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <ol className="mc-workflow">
        {stages.map((stage, index) => {
          const isCurrent = stage.value === normalized;
          const isPast = !isRejected && !isReopened && !isTransferred
            ? index < activeIndex
            : index < (activeIndex >= 0 ? activeIndex : fallbackIndex);
          const isTerminalAlternative = stage.value === 'rejected' || stage.value === 'reopened';
          const stateClass = isCurrent
            ? 'is-current'
            : isPast
              ? 'is-complete'
              : 'is-upcoming';

          return (
            <li className={`mc-workflow-step ${stateClass}`} key={stage.value}>
              <span className="mc-workflow-marker" aria-hidden="true">
                {isPast ? '✓' : index + 1}
              </span>
              <div className="mc-workflow-step-copy">
                <strong>{stage.label}</strong>
                <span>{stage.detail}</span>
                {isCurrent && <small>Current status</small>}
              </div>
              {index < stages.length - 1 && (
                <span className="mc-workflow-connector" aria-hidden="true" />
              )}
              {isTerminalAlternative && isCurrent && (
                <span className="mc-workflow-note">Alternative status</span>
              )}
            </li>
          );
        })}
      </ol>
      {isTransferred && (
        <p className="mc-workflow-notice">
          This report has been transferred. The remaining stages show the general path after transfer; they are not a status history.
        </p>
      )}
      {isReopened && (
        <p className="mc-workflow-notice">
          This report is reopened and may return to active processing before it is resolved again.
        </p>
      )}
      {isRejected && (
        <p className="mc-workflow-notice mc-workflow-notice-danger">
          This report is marked as rejected. Contact the responsible department if you need clarification.
        </p>
      )}
    </section>
  );
}

function ComplaintDetailsModal({
  report,
  onClose,
  onVerify,
  onReject,
  actionLoading,
  actionError,
  actionNotice,
  showRejectForm,
  rejectionReason,
  setRejectionReason,
  onRejectSubmit,
  onCancelReject,
}) {
  useEffect(() => {
    if (!report) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [report, onClose]);

  if (!report) {
    return null;
  }

  const images = Array.isArray(report.images)
    ? report.images
    : [];

  const videos = Array.isArray(report.videos)
    ? report.videos
    : [];

  const assignedStaff = getAssignedStaffDetails(report.assigned_staff);

  return (
    <div className="mc-detail-page">
      <div className="mc-detail-page-topbar">
        <button type="button" className="mc-back-button" onClick={onClose}>
          <span aria-hidden="true">←</span> Back to complaints
        </button>
        <span className="mc-detail-page-reference">CIVICFIX / COMPLAINT #{report.id}</span>
      </div>
      <section className="mc-detail-page-shell" aria-labelledby="mc-modal-heading">
        <header className="mc-modal-header">
          <div>
            <span className="mc-modal-kicker">
              COMPLAINT #{report.id}
            </span>

            <h2 id="mc-modal-heading">
              Complaint details
            </h2>
          </div>

          <button
            type="button"
            className="mc-modal-close"
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        </header>

        <div className="mc-modal-content">
          <div className="mc-modal-title-row">
            <div>
              <h3>
                {report.title || `Complaint #${report.id}`}
              </h3>

              <p>
                Submitted on {formatDate(report.created_at)}
              </p>
            </div>

            <StatusBadge status={report.status} />
          </div>

          <ComplaintWorkflow status={report.status} />

          <div className="mc-detail-grid">
            <div className="mc-detail-box">
              <span>Complaint ID</span>

              <strong>#{report.id}</strong>
            </div>

            <div className="mc-detail-box">
              <span>Category</span>

              <strong>
                {report.category || 'Not provided'}
              </strong>
            </div>

            <div className="mc-detail-box">
              <span>Department</span>

              <strong>
                {report.department_name || 'Not assigned'}
              </strong>
            </div>

            <div className="mc-detail-box">
              <span>Priority</span>

              <strong>
                {report.priority
                  ? String(report.priority).replaceAll('_', ' ')
                  : 'Not specified'}
              </strong>
            </div>

            <div className="mc-detail-box">
              <span>Submitted</span>

              <strong>
                {formatDate(report.created_at)}
              </strong>
            </div>

            <div className="mc-detail-box">
              <span>Deadline</span>

              <strong>
                {formatDate(report.deadline)}
              </strong>
            </div>
          </div>

          <section className="mc-detail-section">
            <h4>Description</h4>

            <p className="mc-detail-description">
              {report.description ||
                'No description is available.'}
            </p>
          </section>

          <section className="mc-detail-section">
            <h4>Location</h4>

            <p className="mc-detail-description">
              {report.location || 'Location not provided'}
            </p>

            {report.latitude != null &&
              report.longitude != null && (
                <p className="mc-detail-coordinates">
                  Coordinates: {report.latitude},{' '}
                  {report.longitude}
                </p>
              )}
          </section>

          <section className="mc-detail-section">
            <h4>Assigned staff details</h4>

            {assignedStaff ? (
              <div className="mc-assigned-staff mc-assigned-staff-details">
                <div className="mc-staff-avatar" aria-hidden="true">
                  {(assignedStaff.name || 'S').trim().charAt(0).toUpperCase()}
                </div>

                <div className="mc-staff-information">
                  <strong>{assignedStaff.name || 'Assigned staff'}</strong>
                  <div className="mc-staff-meta-grid">
                    <div>
                      <span>Email</span>
                      {assignedStaff.email ? (
                        <a href={`mailto:${assignedStaff.email}`}>{assignedStaff.email}</a>
                      ) : <p>Not provided</p>}
                    </div>
                    <div>
                      <span>Phone</span>
                      {assignedStaff.phone_number ? (
                        <a href={`tel:${assignedStaff.phone_number}`}>{assignedStaff.phone_number}</a>
                      ) : <p>Not provided</p>}
                    </div>
                    <div>
                      <span>Location</span>
                      <p>{assignedStaff.location || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mc-detail-empty">
                Staff has not been assigned to this complaint yet.
              </div>
            )}
          </section>

          {images.length > 0 && (
            <section className="mc-detail-section">
              <h4>Complaint images</h4>

              <div className="mc-evidence-grid">
                {images.map((item, index) => {
                  const imageUrl =
                    typeof item === 'string'
                      ? item
                      : item?.image;

                  if (!imageUrl) {
                    return null;
                  }

                  return (
                    <a
                      key={
                        item?.id ??
                        `${imageUrl}-${index}`
                      }
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mc-evidence-item"
                    >
                      <img
                        src={imageUrl}
                        alt={`Complaint ${report.id} evidence ${index + 1}`}
                        loading="lazy"
                      />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section className="mc-detail-section">
              <h4>Complaint videos</h4>

              <div className="mc-evidence-videos">
                {videos.map((item, index) => {
                  const videoUrl =
                    typeof item === 'string'
                      ? item
                      : item?.video;

                  if (!videoUrl) {
                    return null;
                  }

                  return (
                    <a
                      key={
                        item?.id ??
                        `${videoUrl}-${index}`
                      }
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mc-video-link"
                    >
                      ▶ View complaint video
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {(() => {
            const resolutionRecords = [
              ...(Array.isArray(report.resolution_history) ? report.resolution_history : []),
              ...(report.resolution && !(
                Array.isArray(report.resolution_history) &&
                report.resolution_history.some((item) => item?.id === report.resolution?.id)
              ) ? [report.resolution] : []),
            ];
            const resolutionImages = resolutionRecords.flatMap((resolution) =>
              (Array.isArray(resolution?.images) ? resolution.images : [])
                .map((item) => ({
                  id: item?.id,
                  url: typeof item === 'string' ? item : item?.image,
                  resolutionId: resolution?.id,
                }))
                .filter((item) => item.url),
            );
            const resolutionVideos = resolutionRecords.flatMap((resolution) =>
              (Array.isArray(resolution?.videos) ? resolution.videos : [])
                .map((item) => ({
                  id: item?.id,
                  url: typeof item === 'string' ? item : item?.video,
                  resolutionId: resolution?.id,
                }))
                .filter((item) => item.url),
            );
            const workDescriptions = resolutionRecords
              .filter((resolution) => resolution?.work_description)
              .map((resolution) => ({
                id: resolution.id,
                description: resolution.work_description,
                date: resolution.resolved_at || resolution.created_at,
              }));

            if (!resolutionImages.length && !resolutionVideos.length && !workDescriptions.length) {
              return (
                <section className="mc-detail-section">
                  <h4>Staff completion evidence</h4>
                  <div className="mc-detail-empty">
                    Staff has not submitted completion evidence for this complaint yet.
                  </div>
                </section>
              );
            }

            return (
              <section className="mc-detail-section mc-resolution-evidence">
                <h4>Staff completion evidence</h4>
                <p className="mc-evidence-intro">
                  Work descriptions and evidence submitted by staff during resolution.
                </p>

                {workDescriptions.map((item) => (
                  <article className="mc-work-description" key={item.id ?? item.description}>
                    <div className="mc-work-description-heading">
                      <strong>Work completed</strong>
                      {item.date && <span>{formatDate(item.date)}</span>}
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}

                {resolutionImages.length > 0 && (
                  <>
                    <h5 className="mc-evidence-subheading">Completion photos</h5>
                    <div className="mc-evidence-grid">
                      {resolutionImages.map((item, index) => (
                        <a
                          key={item.id ?? `${item.url}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mc-evidence-item"
                        >
                          <img
                            src={item.url}
                            alt={`Staff completion evidence ${index + 1}`}
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </>
                )}

                {resolutionVideos.length > 0 && (
                  <>
                    <h5 className="mc-evidence-subheading">Completion videos</h5>
                    <div className="mc-evidence-videos">
                      {resolutionVideos.map((item, index) => (
                        <a
                          key={item.id ?? `${item.url}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mc-video-link"
                        >
                          ▶ View staff completion video {index + 1}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </section>
            );
          })()}
        </div>

        {String(report.status || '').toLowerCase() === 'resolved' && (
          <section className="mc-resolution-actions" aria-label="Resolution verification">
            <div className="mc-resolution-actions-copy">
              <h4>Are you satisfied with the completed work?</h4>
              <p>Review the staff evidence above. Verify the work to close this complaint, or reject it with a reason to reopen it.</p>
            </div>
            {actionError && <div className="mc-action-alert mc-action-alert-error" role="alert">{actionError}</div>}
            {actionNotice && <div className="mc-action-alert mc-action-alert-success" role="status">{actionNotice}</div>}
            <div className="mc-resolution-action-buttons">
              <button type="button" className="mc-verify-button" onClick={onVerify} disabled={actionLoading}>
                {actionLoading ? 'Please wait...' : 'Verify Resolution'}
              </button>
              <button type="button" className="mc-reject-button" onClick={onReject} disabled={actionLoading}>
                Not Verified / Reject
              </button>
            </div>
          </section>
        )}

        {String(report.status || '').toLowerCase() !== 'resolved' && actionNotice && (
          <div className="mc-action-alert mc-action-alert-success" role="status">{actionNotice}</div>
        )}

        {showRejectForm && String(report.status || '').toLowerCase() === 'resolved' && (
          <form className="mc-rejection-form" onSubmit={onRejectSubmit}>
            <label htmlFor="mc-rejection-reason">Why are you not verifying this resolution?</label>
            <textarea
              id="mc-rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Explain what is incomplete or still needs attention..."
              required
              disabled={actionLoading}
            />
            <div className="mc-rejection-form-actions">
              <button type="button" onClick={onCancelReject} disabled={actionLoading}>Cancel</button>
              <button type="submit" disabled={actionLoading || !rejectionReason.trim()}>{actionLoading ? 'Submitting...' : 'Submit rejection'}</button>
            </div>
          </form>
        )}

        <footer className="mc-modal-footer mc-detail-page-footer">
          <button
            type="button"
            className="mc-secondary-button"
            onClick={onClose}
          >
            Back to complaints
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function MyComplaints() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedReport, setSelectedReport] =
    useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadReports = useCallback(
    async (showLoader = true) => {
      const token = localStorage.getItem(
        'civicfix_access_token',
      );

      if (!token) {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Please log in to view your complaints.',
          },
        });

        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError('');

      try {
        const [profileResponse, reportsResponse] =
          await Promise.all([
            api.get('/auth/me/'),
            api.get('/reports/'),
          ]);

        const profile = profileResponse.data;

        if (
          String(profile?.role || '').toUpperCase() !==
          'CITIZEN'
        ) {
          navigate('/login', {
            replace: true,
            state: {
              message:
                'This page is available to citizen accounts.',
            },
          });

          return;
        }

        const reportList = getArray(
          reportsResponse.data,
        );

        setReports(reportList);

        localStorage.setItem(
          'civicfix_user',
          JSON.stringify(profile),
        );

        setSelectedReport((current) => {
          if (!current) {
            return null;
          }

          return (
            reportList.find(
              (report) => report.id === current.id,
            ) || null
          );
        });
      } catch (requestError) {
        if (
          requestError?.response?.status === 401
        ) {
          localStorage.removeItem(
            'civicfix_access_token',
          );

          localStorage.removeItem(
            'civicfix_refresh_token',
          );

          localStorage.removeItem('civicfix_user');

          navigate('/login', {
            replace: true,
            state: {
              message:
                'Your session has expired. Please log in again.',
            },
          });

          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleVerifyResolution = async () => {
    if (!selectedReport || actionLoading) return;
    const confirmed = window.confirm('Are you sure you want to verify this resolution? The complaint will be marked as completed and closed.');
    if (!confirmed) return;
    setActionError('');
    setActionNotice('');
    setActionLoading(true);
    try {
      const response = await api.post(`/reports/${selectedReport.id}/verify/`);
      setActionNotice(response.data?.message || 'Resolution verified successfully. Complaint closed.');
      await loadReports(false);
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectResolution = async (event) => {
    event.preventDefault();
    if (!selectedReport || actionLoading) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setActionError('Please enter why the resolution is not verified.');
      return;
    }
    if (!window.confirm('Reject this resolution and reopen the complaint?')) return;
    setActionError('');
    setActionNotice('');
    setActionLoading(true);
    try {
      const response = await api.post(`/reports/${selectedReport.id}/reopen/`, { reason });
      setActionNotice(response.data?.message || 'Resolution rejected. The complaint has been reopened and sent to the department manager.');
      setShowRejectForm(false);
      setRejectionReason('');
      await loadReports(false);
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(
    () => getComplaintCounts(reports),
    [reports],
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        const status = String(
          report.status || '',
        ).toLowerCase();

        const matchesStatus =
          statusFilter === 'all' ||
          status === statusFilter;

        const searchableText = [
          report.id,
          report.title,
          report.category,
          report.location,
          report.department_name,
          report.department_code,
        ]
          .filter(
            (value) =>
              value !== null &&
              value !== undefined,
          )
          .join(' ')
          .toLowerCase();

        const matchesSearch =
          !query || searchableText.includes(query);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.created_at || 0,
        ).getTime();

        const dateB = new Date(
          b.created_at || 0,
        ).getTime();

        return dateB - dateA;
      });
  }, [reports, search, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports(false);
  };

  const handleSubmitComplaint = () => {
    navigate('/user/complaints/new');
  };

  if (selectedReport) {
    return (
      <main className="mc-page">
        <ComplaintDetailsModal
          report={selectedReport}
          onClose={() => {
            setSelectedReport(null);
            setActionError('');
            setActionNotice('');
            setShowRejectForm(false);
            setRejectionReason('');
          }}
          onVerify={handleVerifyResolution}
          onReject={() => {
            setActionError('');
            setShowRejectForm(true);
          }}
          actionLoading={actionLoading}
          actionError={actionError}
          actionNotice={actionNotice}
          showRejectForm={showRejectForm}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          onRejectSubmit={handleRejectResolution}
          onCancelReject={() => setShowRejectForm(false)}
        />
      </main>
    );
  }

  return (
    <main className="mc-page">
      <header className="mc-header">
        

        <div className="mc-header-actions">
          <button
            type="button"
            className="mc-refresh-button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <span className="mc-refresh-symbol"><RefreshCw aria-hidden="true" /></span>

            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            className="mc-primary-button"
            onClick={handleSubmitComplaint}
          >
            <span><Plus aria-hidden="true" /></span>
            Submit complaint
          </button>
        </div>
      </header>

      <div className="mc-content">
        <section className="mc-hero">
          <div className="mc-hero-content">
            <span className="mc-eyebrow">
              <span className="mc-live-indicator" />
              CITIZEN SERVICES
            </span>

            <h1>
              Your complaints,
              <br />
              <span>your community.</span>
            </h1>

            <p>
              Keep track of the civic issues you have
              reported and follow their progress from
              submission to resolution.
            </p>
          </div>

          <div className="mc-hero-decoration" aria-hidden="true">
            <div className="mc-decoration-orbit mc-orbit-one" />
            <div className="mc-decoration-orbit mc-orbit-two" />

            <div className="mc-decoration-document">
              <svg
                viewBox="0 0 100 100"
                fill="none"
              >
                <rect
                  x="24"
                  y="12"
                  width="53"
                  height="70"
                  rx="9"
                  fill="#FFFFFF"
                  stroke="#D9E2FF"
                  strokeWidth="2"
                />

                <rect
                  x="36"
                  y="29"
                  width="29"
                  height="5"
                  rx="2.5"
                  fill="#8096FA"
                />

                <rect
                  x="36"
                  y="41"
                  width="23"
                  height="4"
                  rx="2"
                  fill="#CCD6FF"
                />

                <rect
                  x="36"
                  y="51"
                  width="27"
                  height="4"
                  rx="2"
                  fill="#CCD6FF"
                />

                <circle
                  cx="69"
                  cy="70"
                  r="17"
                  fill="#DDF8EB"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />

                <path
                  d="m61 70 5 5 10-11"
                  stroke="#159A69"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="mc-floating-chip mc-chip-one">
              <span><CircleCheck aria-hidden="true" /></span>
              Report submitted
            </div>

            <div className="mc-floating-chip mc-chip-two">
              <span><TrendingUp aria-hidden="true" /></span>
              Track progress
            </div>
          </div>
        </section>

        <section className="mc-overview">
          <div className="mc-overview-heading">
            <div>
              <span className="mc-section-kicker">
                YOUR ACTIVITY
              </span>

              <h2>Complaint overview</h2>
            </div>

            <span className="mc-live-label">
              <span />
              Live account data
            </span>
          </div>

          <div className="mc-summary-strip">
            <SummaryItem
              icon={<FileText aria-hidden="true" />}
              label="Total complaints"
              value={loading ? '—' : stats.total}
              tone="blue"
            />

            <div className="mc-summary-divider" />

            <SummaryItem
              icon={<Clock3 aria-hidden="true" />}
              label="Awaiting action"
              value={loading ? '—' : stats.submitted}
              tone="amber"
            />

            <div className="mc-summary-divider" />

            <SummaryItem
              icon={<TrendingUp aria-hidden="true" />}
              label="In progress"
              value={loading ? '—' : stats.progress}
              tone="purple"
            />

            <div className="mc-summary-divider" />

            <SummaryItem
              icon={<CircleCheck aria-hidden="true" />}
              label="Resolved"
              value={loading ? '—' : stats.resolved}
              tone="green"
            />
          </div>
        </section>

        <section className="mc-complaints-section">
          <div className="mc-section-heading">
            <div>
              <span className="mc-section-kicker">
                YOUR REPORTS
              </span>

              <h2>Complaint history</h2>

              <p>
                All your reported issues in one place.
              </p>
            </div>

            <span className="mc-result-pill">
              {loading
                ? 'Loading...'
                : `${filteredReports.length} ${filteredReports.length === 1 ? 'complaint' : 'complaints'}`}
            </span>
          </div>

          <div className="mc-filter-panel">
            <label className="mc-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />

                <path d="m16 16 4 4" />
              </svg>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search complaints, categories, departments..."
                aria-label="Search complaints"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>

            <label className="mc-filter-select">
              <span>Status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter by complaint status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="mc-error-message" role="alert">
              <div className="mc-error-symbol">!</div>

              <div className="mc-error-content">
                <strong>
                  We couldn't load your complaints
                </strong>

                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() => loadReports()}
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="mc-loading">
              <span className="mc-spinner" />

              <strong>Loading your complaints</strong>

              <p>
                Retrieving your latest complaint information.
              </p>
            </div>
          ) : !error &&
            filteredReports.length === 0 ? (
            <EmptyState
              filtered={
                Boolean(search.trim()) ||
                statusFilter !== 'all'
              }
              onClear={clearFilters}
              onSubmit={handleSubmitComplaint}
            />
          ) : !error ? (
            <div className="mc-complaint-list">
              {filteredReports.map((report) => (
                <ComplaintCard
                  key={report.id}
                  report={report}
                  onView={setSelectedReport}
                />
              ))}
            </div>
          ) : null}

          {!loading &&
            !error &&
            filteredReports.length > 0 && (
              <div className="mc-list-footer">
                <span>
                  Showing {filteredReports.length} of{' '}
                  {reports.length} complaints
                </span>

                {(search ||
                  statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
        </section>

        <footer className="mc-footer">
          <div className="mc-footer-icon"><Landmark aria-hidden="true" /></div>

          <div>
            <strong>Building a better community together</strong>

            <p>
              Every report helps make our neighbourhood safer,
              cleaner, and better for everyone.
            </p>
          </div>
        </footer>
      </div>

    </main>
  );
}