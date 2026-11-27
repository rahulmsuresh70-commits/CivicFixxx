import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  RefreshCw,
  Eye,
  X,
  HeartHandshake,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserRound,
  MapPin,
  CalendarDays,
  Phone,
  Mail,
  Filter,
  FileText,
  Users,
  UserPlus,
  ArrowRightLeft,
  Check,
  XCircle,
  Activity,
  Navigation,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Building2,
  CalendarClock,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorAssistanceManagement.css";


/* =========================================================
   API ENDPOINTS
========================================================= */

const REQUESTS_URL = "/senior-citizen/";
const STAFF_URL = "/senior-citizen/staff/";
const MANAGERS_URL = "/senior-citizen/managers/";


/* =========================================================
   STATUS CONFIGURATION
========================================================= */

const STATUS_OPTIONS = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "assigned",
  "in_progress",
  "on_the_way",
  "arrived",
  "pickup_completed",
  "in_transit",
  "completed",
  "closed",
];

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  in_progress: "In Progress",
  on_the_way: "On The Way",
  arrived: "Arrived",
  pickup_completed: "Pickup Completed",
  in_transit: "In Transit",
  completed: "Completed",
  closed: "Closed",
};

const ASSISTANCE_LABELS = {
  medical: "Medical Assistance",
  daily_living: "Daily Living",
  food: "Food Assistance",
  mobility: "Mobility Assistance",
  other: "Other",
};

const PRIORITY_LABELS = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getArray = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};


const formatLabel = (value) => {
  if (!value) return "Not available";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};


const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || formatLabel(status);
};


const getAssistanceLabel = (type) => {
  return ASSISTANCE_LABELS[type] || formatLabel(type);
};


const getPriorityLabel = (priority) => {
  return PRIORITY_LABELS[priority] || formatLabel(priority);
};


const formatDate = (value, includeTime = true) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    includeTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  ).format(date);
};


const getInitials = (name) => {
  if (!name) return "SC";

  return String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};


const getMediaUrl = (media) => {
  if (!media) return "";

  if (typeof media === "string") {
    return media;
  }

  return (
    media.image ||
    media.file ||
    media.url ||
    ""
  );
};


const getStaffName = (staff) => {
  if (!staff) return "Not assigned";

  if (typeof staff === "string" || typeof staff === "number") {
    return `Staff #${staff}`;
  }

  const name = [
    staff.first_name,
    staff.last_name,
  ].filter(Boolean).join(" ");

  return name || staff.email || `Staff #${staff.id || "—"}`;
};


const getLocation = (request) => {
  return [
    request.district,
    request.state,
  ].filter(Boolean).join(", ") || "Location unavailable";
};


const getErrorMessage = (error) => {
  return (
    getApiErrorMessage(error) ||
    error.response?.data?.detail ||
    error.response?.data?.message ||
    "Something went wrong. Please try again."
  );
};


const toIsoDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
};


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  return (
    <span
      className={`sam-status sam-status-${status || "unknown"}`}
    >
      <span className="sam-status-dot" />

      {getStatusLabel(status)}
    </span>
  );
}


/* =========================================================
   PRIORITY BADGE
========================================================= */

function PriorityBadge({ priority }) {
  return (
    <span
      className={`sam-priority sam-priority-${priority || "normal"}`}
    >
      {getPriorityLabel(priority)}
    </span>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function SeniorAssistanceManagement() {

  /* =======================================================
     STATE
  ======================================================= */

  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assistanceFilter, setAssistanceFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [transferHistory, setTransferHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [assignForm, setAssignForm] = useState({
    staff_id: "",
    deadline: "",
    estimated_arrival: "",
  });

  const [transferForm, setTransferForm] = useState({
    manager_id: "",
    note: "",
  });


  /* =======================================================
     LOAD REQUESTS, STAFF AND MANAGERS
  ======================================================= */

  const loadData = useCallback(async (quiet = false) => {

    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSuccess("");

    try {

      const results = await Promise.allSettled([
        api.get(REQUESTS_URL),
        api.get(STAFF_URL),
        api.get(MANAGERS_URL),
      ]);

      /* REQUESTS */

      if (results[0].status === "fulfilled") {

        setRequests(
          getArray(results[0].value.data)
        );

      } else {

        throw results[0].reason;

      }


      /* STAFF */

      if (results[1].status === "fulfilled") {

        setStaff(
          getArray(results[1].value.data)
        );

      } else {

        console.error(
          "Senior Citizen Staff loading failed:",
          results[1].reason
        );

        setStaff([]);

      }


      /* MANAGERS */

      if (results[2].status === "fulfilled") {

        setManagers(
          getArray(results[2].value.data)
        );

      } else {

        console.error(
          "Senior Citizen Managers loading failed:",
          results[2].reason
        );

        setManagers([]);

      }

    } catch (err) {

      console.error(
        "Senior Assistance loading failed:",
        err
      );

      setError(getErrorMessage(err));

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);


  /* =======================================================
     LOAD TRANSFER HISTORY
  ======================================================= */

  const loadTransferHistory = async (requestId) => {

    setHistoryLoading(true);
    setTransferHistory([]);

    try {

      const response = await api.get(
        `/senior-citizen/${requestId}/transfer-history/`
      );

      setTransferHistory(
        getArray(response.data)
      );

    } catch (err) {

      console.error(
        "Transfer history loading failed:",
        err
      );

    } finally {

      setHistoryLoading(false);

    }

  };


  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics = useMemo(() => {

    const total = requests.length;

    const pending = requests.filter((item) =>
      ["submitted", "under_review"].includes(item.status)
    ).length;

    const approved = requests.filter((item) =>
      item.status === "approved"
    ).length;

    const active = requests.filter((item) =>
      [
        "assigned",
        "in_progress",
        "on_the_way",
        "arrived",
        "pickup_completed",
        "in_transit",
      ].includes(item.status)
    ).length;

    const completed = requests.filter((item) =>
      ["completed", "closed"].includes(item.status)
    ).length;

    const rejected = requests.filter((item) =>
      item.status === "rejected"
    ).length;

    return {
      total,
      pending,
      approved,
      active,
      completed,
      rejected,
    };

  }, [requests]);


  /* =======================================================
     FILTER REQUESTS
  ======================================================= */

  const filteredRequests = useMemo(() => {

    const query = search.trim().toLowerCase();

    return requests.filter((request) => {

      const searchable = [
        request.id,
        request.full_name,
        request.phone_number,
        request.citizen_email,
        request.assistance_type,
        request.description,
        request.district,
        request.state,
        request.assigned_staff_full_name,
        request.assigned_staff_email,
        request.applicant_name,
      ]
        .map((value) => String(value || ""))
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        !query || searchable.includes(query);


      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;


      const matchesPriority =
        priorityFilter === "all" ||
        request.priority === priorityFilter;


      const matchesAssistance =
        assistanceFilter === "all" ||
        request.assistance_type === assistanceFilter;


      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssistance
      );

    });

  }, [
    requests,
    search,
    statusFilter,
    priorityFilter,
    assistanceFilter,
  ]);


  /* =======================================================
     OPEN REQUEST DETAILS
  ======================================================= */

  const openDetails = (request) => {

    setSelectedRequest(request);

    setTransferHistory([]);

    loadTransferHistory(request.id);

  };


  /* =======================================================
     CLOSE DETAILS
  ======================================================= */

  const closeDetails = () => {

    setSelectedRequest(null);

    setTransferHistory([]);

  };


  /* =======================================================
     UPDATE REQUEST AFTER API ACTION
  ======================================================= */

  const updateRequestData = (updatedRequest) => {

    if (!updatedRequest?.id) return;

    setRequests((current) =>
      current.map((item) =>
        item.id === updatedRequest.id
          ? updatedRequest
          : item
      )
    );

    setSelectedRequest(updatedRequest);

  };


  /* =======================================================
     REQUEST ACTION
     REVIEW / APPROVE / REJECT / CLOSE
  ======================================================= */

  const performAction = async (request, action) => {

    if (!request || processing) return;


    const confirmationMessages = {

      review:
        "Move this request to Under Review?",

      approve:
        "Are you sure you want to approve this request?",

      reject:
        "Are you sure you want to reject this request?",

      close:
        "Close this verified assistance request?",

    };


    const confirmed = window.confirm(
      confirmationMessages[action] ||
      "Are you sure you want to continue?"
    );

    if (!confirmed) return;


    setProcessing(true);

    setError("");
    setSuccess("");

    try {

      const response = await api.post(
        `/senior-citizen/${request.id}/action/`,
        {
          action,
        }
      );


      updateRequestData(response.data);


      const messages = {

        review:
          "Request moved to Under Review successfully.",

        approve:
          "Senior assistance request approved successfully.",

        reject:
          "Senior assistance request rejected successfully.",

        close:
          "Senior assistance request closed successfully.",

      };


      setSuccess(
        messages[action] || "Request updated successfully."
      );


      await loadData(true);

    } catch (err) {

      console.error(
        "Senior assistance action failed:",
        err
      );

      setError(getErrorMessage(err));

    } finally {

      setProcessing(false);

    }

  };


  /* =======================================================
     OPEN ASSIGN MODAL
  ======================================================= */

  const openAssignModal = (request) => {

    setSelectedRequest(request);

    setAssignForm({
      staff_id: "",
      deadline: "",
      estimated_arrival: "",
    });

    setError("");

    setShowAssignModal(true);

  };


  /* =======================================================
     ASSIGN STAFF
  ======================================================= */

  const assignStaff = async (event) => {

    event.preventDefault();

    if (!selectedRequest || processing) return;


    if (!assignForm.staff_id) {

      setError("Please select a Senior Citizen Staff member.");

      return;

    }


    if (
      !assignForm.deadline ||
      !assignForm.estimated_arrival
    ) {

      setError(
        "Deadline and estimated arrival are required."
      );

      return;

    }


    const deadline = new Date(assignForm.deadline);
    const arrival = new Date(assignForm.estimated_arrival);

    if (
      Number.isNaN(deadline.getTime()) ||
      Number.isNaN(arrival.getTime())
    ) {

      setError("Please enter valid date and time values.");

      return;

    }


    if (
      deadline <= new Date() ||
      arrival <= new Date()
    ) {

      setError("Deadline and estimated arrival must be in the future.");

      return;

    }


    setProcessing(true);

    setError("");
    setSuccess("");

    try {

      const response = await api.post(
        `/senior-citizen/${selectedRequest.id}/action/`,
        {
          action: "assign",
          staff_id: Number(assignForm.staff_id),
          deadline: toIsoDateTime(assignForm.deadline),
          estimated_arrival: toIsoDateTime(
            assignForm.estimated_arrival
          ),
        }
      );


      updateRequestData(response.data);


      setShowAssignModal(false);

      setSuccess(
        "Senior Citizen Staff assigned successfully."
      );


      await loadData(true);

    } catch (err) {

      console.error(
        "Staff assignment failed:",
        err
      );

      setError(getErrorMessage(err));

    } finally {

      setProcessing(false);

    }

  };


  /* =======================================================
     OPEN TRANSFER MODAL
  ======================================================= */

  const openTransferModal = (request) => {

    setSelectedRequest(request);

    setTransferForm({
      manager_id: "",
      note: "",
    });

    setError("");

    setShowTransferModal(true);

  };


  /* =======================================================
     TRANSFER REQUEST TO ANOTHER MANAGER
  ======================================================= */

  const transferRequest = async (event) => {

    event.preventDefault();

    if (!selectedRequest || processing) return;


    if (!transferForm.manager_id) {

      setError("Please select a destination manager.");

      return;

    }


    setProcessing(true);

    setError("");
    setSuccess("");

    try {

      await api.post(
        `/senior-citizen/${selectedRequest.id}/transfer/`,
        {
          manager_id: Number(transferForm.manager_id),
          note: transferForm.note.trim(),
        }
      );


      setShowTransferModal(false);

      setSuccess(
        "Senior assistance request transferred successfully."
      );


      await loadData(true);

      await loadTransferHistory(selectedRequest.id);

    } catch (err) {

      console.error(
        "Request transfer failed:",
        err
      );

      setError(getErrorMessage(err));

    } finally {

      setProcessing(false);

    }

  };


  /* =======================================================
     AVAILABLE STAFF
  ======================================================= */

  const availableStaff = useMemo(() => {

    return staff.filter((person) => {

      return (
        person.is_active !== false &&
        person.account_is_active !== false
      );

    });

  }, [staff]);


  /* =======================================================
     CURRENT SELECTED REQUEST
  ======================================================= */

  const currentRequest = selectedRequest
    ? requests.find(
        (item) => item.id === selectedRequest.id
      ) || selectedRequest
    : null;


  /* =======================================================
     PAGE UI
  ======================================================= */

  return (

    <div className="sam-page">


      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="sam-header">

        <div>

          <span className="sam-eyebrow">
            SUPER ADMINISTRATION
          </span>

          <h2>Senior Assistance Management</h2>

          <p>
            Monitor and manage senior citizen assistance
            requests across all service areas.
          </p>

        </div>


        <button
          type="button"
          className="sam-refresh-button"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing ? "sam-spin" : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh"}

        </button>

      </div>


      {/* ===================================================
          SUCCESS MESSAGE
      =================================================== */}

      {success && (

        <div className="sam-alert sam-alert-success">

          <CheckCircle2 size={19} />

          <span>{success}</span>

          <button
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>

        </div>

      )}


      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {error && (

        <div className="sam-alert sam-alert-error">

          <AlertCircle size={19} />

          <span>{error}</span>

          <button
            onClick={() => setError("")}
            aria-label="Dismiss error message"
          >
            <X size={17} />
          </button>

        </div>

      )}


      {/* ===================================================
          STATISTICS
      =================================================== */}

      <section className="sam-stat-grid">


        <article className="sam-stat-card">

          <div className="sam-stat-icon blue">
            <ClipboardList size={23} />
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{statistics.total}</strong>
          </div>

        </article>


        <article className="sam-stat-card">

          <div className="sam-stat-icon orange">
            <Clock size={23} />
          </div>

          <div>
            <span>Pending Review</span>
            <strong>{statistics.pending}</strong>
          </div>

        </article>


        <article className="sam-stat-card">

          <div className="sam-stat-icon purple">
            <Activity size={23} />
          </div>

          <div>
            <span>Active Assistance</span>
            <strong>{statistics.active}</strong>
          </div>

        </article>


        <article className="sam-stat-card">

          <div className="sam-stat-icon green">
            <CheckCircle2 size={23} />
          </div>

          <div>
            <span>Completed</span>
            <strong>{statistics.completed}</strong>
          </div>

        </article>

      </section>


      {/* ===================================================
          ADDITIONAL STATISTICS
      =================================================== */}

      <section className="sam-summary-row">

        <div className="sam-summary-item">

          <span>Approved Requests</span>

          <strong>{statistics.approved}</strong>

        </div>


        <div className="sam-summary-item">

          <span>Rejected Requests</span>

          <strong>{statistics.rejected}</strong>

        </div>


        <div className="sam-summary-item">

          <span>Available Staff</span>

          <strong>{availableStaff.length}</strong>

        </div>


        <div className="sam-summary-item">

          <span>Senior Managers</span>

          <strong>{managers.length}</strong>

        </div>

      </section>


      {/* ===================================================
          REQUEST MANAGEMENT TABLE
      =================================================== */}

      <section className="sam-table-card">


        {/* TABLE HEADER */}

        <div className="sam-table-heading">

          <div>

            <h3>All Senior Assistance Requests</h3>

            <p>
              Review, assign and monitor assistance requests.
            </p>

          </div>


          <span className="sam-record-count">

            {filteredRequests.length} Records

          </span>

        </div>


        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="sam-filters">


          <div className="sam-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search citizen, request ID, phone, district..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (

              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>

            )}

          </div>


          <div className="sam-filter-select">

            <Filter size={17} />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >

              <option value="all">All Statuses</option>

              {STATUS_OPTIONS.map((status) => (

                <option
                  key={status}
                  value={status}
                >
                  {getStatusLabel(status)}
                </option>

              ))}

            </select>

          </div>


          <select
            className="sam-normal-select"
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
          >

            <option value="all">All Priorities</option>

            <option value="normal">Normal</option>

            <option value="high">High</option>

            <option value="urgent">Urgent</option>

          </select>


          <select
            className="sam-normal-select"
            value={assistanceFilter}
            onChange={(event) =>
              setAssistanceFilter(event.target.value)
            }
          >

            <option value="all">All Assistance Types</option>

            {Object.entries(ASSISTANCE_LABELS).map(
              ([value, label]) => (

                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>

              )
            )}

          </select>

        </div>


        {/* =================================================
            REQUEST TABLE
        ================================================= */}

        <div className="sam-table-wrapper">

          <table className="sam-table">

            <thead>

              <tr>

                <th>REQUEST</th>

                <th>SENIOR CITIZEN</th>

                <th>ASSISTANCE TYPE</th>

                <th>LOCATION</th>

                <th>PRIORITY</th>

                <th>STATUS</th>

                <th>SUBMITTED</th>

                <th>ACTION</th>

              </tr>

            </thead>


            <tbody>


              {/* LOADING */}

              {loading ? (

                <tr>

                  <td
                    colSpan="8"
                    className="sam-empty"
                  >

                    <RefreshCw
                      size={23}
                      className="sam-spin"
                    />

                    <span>
                      Loading senior assistance requests...
                    </span>

                  </td>

                </tr>


              ) : filteredRequests.length === 0 ? (

                /* EMPTY */

                <tr>

                  <td
                    colSpan="8"
                    className="sam-empty"
                  >

                    <HeartHandshake size={32} />

                    <strong>
                      No assistance requests found
                    </strong>

                    <span>
                      Try changing your search or filters.
                    </span>

                  </td>

                </tr>


              ) : (

                /* REQUESTS */

                filteredRequests.map((request) => (

                  <tr key={request.id}>


                    {/* REQUEST */}

                    <td>

                      <div className="sam-request-cell">

                        <strong>
                          #SC-{request.id}
                        </strong>

                        <span>
                          {getAssistanceLabel(
                            request.assistance_type
                          )}
                        </span>

                      </div>

                    </td>


                    {/* CITIZEN */}

                    <td>

                      <div className="sam-citizen-cell">

                        <div className="sam-avatar">

                          {getInitials(request.full_name)}

                        </div>

                        <div>

                          <strong>
                            {request.full_name || "Unknown citizen"}
                          </strong>

                          <span>
                            {request.phone_number || "No phone number"}
                          </span>

                        </div>

                      </div>

                    </td>


                    {/* ASSISTANCE TYPE */}

                    <td>

                      <span className="sam-service-type">

                        <HeartHandshake size={15} />

                        {getAssistanceLabel(
                          request.assistance_type
                        )}

                      </span>

                    </td>


                    {/* LOCATION */}

                    <td>

                      <div className="sam-location-cell">

                        <MapPin size={15} />

                        <span>
                          {getLocation(request)}
                        </span>

                      </div>

                    </td>


                    {/* PRIORITY */}

                    <td>

                      <PriorityBadge
                        priority={request.priority}
                      />

                    </td>


                    {/* STATUS */}

                    <td>

                      <StatusBadge
                        status={request.status}
                      />

                    </td>


                    {/* SUBMITTED */}

                    <td>

                      <span className="sam-date">

                        {formatDate(
                          request.created_at,
                          false
                        )}

                      </span>

                    </td>


                    {/* ACTION */}

                    <td>

                      <button
                        type="button"
                        className="sam-view-button"
                        onClick={() => openDetails(request)}
                      >

                        <Eye size={16} />

                        View

                      </button>

                    </td>


                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>


        {/* TABLE FOOTER */}

        <div className="sam-table-footer">

          <span>

            Showing {filteredRequests.length} of {requests.length} requests

          </span>

          <span>
            Read-only citizen information
          </span>

        </div>

      </section>


      {/* ===================================================
          REQUEST DETAILS MODAL
      =================================================== */}

      {currentRequest && (

        <div
          className="sam-modal-overlay"
          onClick={closeDetails}
        >

          <section
            className="sam-modal sam-details-modal"
            onClick={(event) => event.stopPropagation()}
          >


            {/* MODAL HEADER */}

            <div className="sam-modal-header">

              <div>

                <span>ASSISTANCE REQUEST DETAILS</span>

                <h3>
                  Request #SC-{currentRequest.id}
                </h3>

              </div>


              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close details"
              >
                <X size={21} />
              </button>

            </div>


            {/* MODAL BODY */}

            <div className="sam-modal-body">


              {/* REQUEST TITLE */}

              <div className="sam-detail-title">

                <div>

                  <span className="sam-detail-eyebrow">
                    SENIOR CITIZEN ASSISTANCE
                  </span>

                  <h2>
                    {getAssistanceLabel(
                      currentRequest.assistance_type
                    )}
                  </h2>

                </div>


                <StatusBadge
                  status={currentRequest.status}
                />

              </div>


              {/* =================================================
                  CITIZEN INFORMATION
              ================================================= */}

              <section className="sam-detail-section">

                <h4>
                  <UserRound size={18} />
                  Senior Citizen Information
                </h4>


                <div className="sam-detail-grid">


                  <div>

                    <span>Full Name</span>

                    <strong>
                      {currentRequest.full_name || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Age</span>

                    <strong>
                      {currentRequest.age
                        ? `${currentRequest.age} Years`
                        : "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Phone Number</span>

                    <strong>
                      {currentRequest.phone_number || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Email</span>

                    <strong>
                      {currentRequest.citizen_email || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Citizen Account ID</span>

                    <strong>
                      {currentRequest.citizen || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Home Address</span>

                    <strong>
                      {currentRequest.address || "—"}
                    </strong>

                  </div>


                </div>

              </section>


              {/* =================================================
                  APPLICANT INFORMATION
              ================================================= */}

              {(currentRequest.applicant_name ||
                currentRequest.applicant_phone ||
                currentRequest.applicant_relationship) && (

                <section className="sam-detail-section">

                  <h4>
                    <Users size={18} />
                    Applicant Information
                  </h4>


                  <div className="sam-detail-grid">

                    <div>

                      <span>Applicant Name</span>

                      <strong>
                        {currentRequest.applicant_name || "—"}
                      </strong>

                    </div>


                    <div>

                      <span>Applicant Phone</span>

                      <strong>
                        {currentRequest.applicant_phone || "—"}
                      </strong>

                    </div>


                    <div>

                      <span>Relationship</span>

                      <strong>
                        {currentRequest.applicant_relationship || "—"}
                      </strong>

                    </div>

                  </div>

                </section>

              )}


              {/* =================================================
                  ASSISTANCE INFORMATION
              ================================================= */}

              <section className="sam-detail-section">

                <h4>
                  <HeartHandshake size={18} />
                  Assistance Information
                </h4>


                <div className="sam-detail-grid">


                  <div>

                    <span>Assistance Type</span>

                    <strong>
                      {getAssistanceLabel(
                        currentRequest.assistance_type
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>Priority</span>

                    <strong>
                      <PriorityBadge
                        priority={currentRequest.priority}
                      />
                    </strong>

                  </div>


                  <div>

                    <span>Submitted At</span>

                    <strong>
                      {formatDate(currentRequest.created_at)}
                    </strong>

                  </div>


                  <div>

                    <span>Last Updated</span>

                    <strong>
                      {formatDate(currentRequest.updated_at)}
                    </strong>

                  </div>


                  <div>

                    <span>Preferred Date</span>

                    <strong>
                      {formatDate(
                        currentRequest.preferred_datetime
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>Deadline</span>

                    <strong>
                      {formatDate(currentRequest.deadline)}
                    </strong>

                  </div>


                  <div>

                    <span>Estimated Arrival</span>

                    <strong>
                      {formatDate(
                        currentRequest.estimated_arrival
                      )}
                    </strong>

                  </div>


                </div>


                <div className="sam-description">

                  <span>Request Description</span>

                  <p>
                    {currentRequest.description ||
                      "No description provided."}
                  </p>

                </div>

              </section>


              {/* =================================================
                  LOCATION INFORMATION
              ================================================= */}

              <section className="sam-detail-section">

                <h4>
                  <MapPin size={18} />
                  Location Information
                </h4>


                <div className="sam-detail-grid">


                  <div>

                    <span>State</span>

                    <strong>
                      {currentRequest.state || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>District</span>

                    <strong>
                      {currentRequest.district || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Location Method</span>

                    <strong>
                      {formatLabel(
                        currentRequest.location_method
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>Location Mismatch</span>

                    <strong>
                      {currentRequest.location_mismatch
                        ? "Mismatch detected"
                        : "No mismatch reported"}
                    </strong>

                  </div>


                  <div>

                    <span>Detected State</span>

                    <strong>
                      {currentRequest.detected_state || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Detected District</span>

                    <strong>
                      {currentRequest.detected_district || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Latitude</span>

                    <strong>
                      {currentRequest.latitude ?? "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Longitude</span>

                    <strong>
                      {currentRequest.longitude ?? "—"}
                    </strong>

                  </div>


                </div>


                <div className="sam-location-block">

                  <div>

                    <span>Current Location</span>

                    <p>
                      {currentRequest.current_location || "—"}
                    </p>

                  </div>


                  <div>

                    <span>Pickup Location</span>

                    <p>
                      {currentRequest.pickup_location || "—"}
                    </p>

                  </div>


                  <div>

                    <span>Destination</span>

                    <p>
                      {currentRequest.destination || "—"}
                    </p>

                  </div>

                </div>


                {currentRequest.latitude != null &&
                  currentRequest.longitude != null && (

                    <a
                      className="sam-map-link"
                      href={`https://www.google.com/maps?q=${currentRequest.latitude},${currentRequest.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >

                      <Navigation size={16} />

                      Open location in Google Maps

                      <ExternalLink size={14} />

                    </a>

                  )}

              </section>


              {/* =================================================
                  ASSIGNMENT INFORMATION
              ================================================= */}

              <section className="sam-detail-section">

                <h4>
                  <Users size={18} />
                  Assignment Information
                </h4>


                <div className="sam-detail-grid">


                  <div>

                    <span>Assigned Staff</span>

                    <strong>
                      {currentRequest.assigned_staff_full_name ||
                        (currentRequest.assigned_staff
                          ? `Staff #${currentRequest.assigned_staff}`
                          : "Not assigned")}
                    </strong>

                  </div>


                  <div>

                    <span>Staff Email</span>

                    <strong>
                      {currentRequest.assigned_staff_email || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Staff Phone</span>

                    <strong>
                      {currentRequest.assigned_staff_phone_number || "—"}
                    </strong>

                  </div>


                  <div>

                    <span>Assigned Manager ID</span>

                    <strong>
                      {currentRequest.assigned_manager || "Not assigned"}
                    </strong>

                  </div>


                </div>

              </section>


              {/* =================================================
                  COMPLETION INFORMATION
              ================================================= */}

              {(currentRequest.completion_notes ||
                currentRequest.completed_at ||
                currentRequest.verified_at) && (

                <section className="sam-detail-section">

                  <h4>
                    <CheckCircle2 size={18} />
                    Completion Information
                  </h4>


                  <div className="sam-detail-grid">


                    <div>

                      <span>Completed At</span>

                      <strong>
                        {formatDate(currentRequest.completed_at)}
                      </strong>

                    </div>


                    <div>

                      <span>Verified At</span>

                      <strong>
                        {formatDate(currentRequest.verified_at)}
                      </strong>

                    </div>


                    <div>

                      <span>Verified By</span>

                      <strong>
                        {currentRequest.verified_by || "—"}
                      </strong>

                    </div>


                  </div>


                  <div className="sam-description">

                    <span>Completion Notes</span>

                    <p>
                      {currentRequest.completion_notes ||
                        "No completion notes available."}
                    </p>

                  </div>

                </section>

              )}


              {/* =================================================
                  REQUEST IMAGES
              ================================================= */}

              {Array.isArray(currentRequest.images) &&
                currentRequest.images.length > 0 && (

                  <section className="sam-detail-section">

                    <h4>
                      <ImageIcon size={18} />
                      Request Images
                    </h4>


                    <div className="sam-image-grid">

                      {currentRequest.images.map(
                        (media, index) => {

                          const url = getMediaUrl(media);

                          if (!url) return null;

                          return (

                            <a
                              key={media.id || index}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >

                              <img
                                src={url}
                                alt={`Assistance request ${currentRequest.id}`}
                              />

                            </a>

                          );

                        }
                      )}

                    </div>

                  </section>

                )}


              {/* =================================================
                  TRANSFER HISTORY
              ================================================= */}

              <section className="sam-detail-section">

                <h4>
                  <ArrowRightLeft size={18} />
                  Manager Transfer History
                </h4>


                {historyLoading ? (

                  <div className="sam-history-loading">

                    <RefreshCw
                      size={17}
                      className="sam-spin"
                    />

                    Loading transfer history...

                  </div>

                ) : transferHistory.length > 0 ? (

                  <div className="sam-history-list">

                    {transferHistory.map((item) => (

                      <article
                        key={item.id}
                        className="sam-history-item"
                      >

                        <div className="sam-history-icon">
                          <ArrowRightLeft size={17} />
                        </div>


                        <div className="sam-history-content">

                          <strong>
                            Request transferred
                          </strong>

                          <p>
                            {item.from_manager_name ||
                              "Unassigned"}
                            {" → "}
                            {item.to_manager_name ||
                              "Unknown manager"}
                          </p>

                          {item.note && (

                            <span>
                              {item.note}
                            </span>

                          )}

                          <small>
                            {formatDate(item.created_at)}
                          </small>

                        </div>

                      </article>

                    ))}

                  </div>

                ) : (

                  <div className="sam-history-empty">

                    No transfer history recorded for this request.

                  </div>

                )}

              </section>


            </div>


            {/* =================================================
                MODAL FOOTER ACTIONS
            ================================================= */}

            <div className="sam-modal-footer">


              <span className="sam-readonly-note">

                <ShieldCheck size={15} />

                Super Admin Management

              </span>


              <div className="sam-modal-actions">


                {/* REVIEW */}

                {currentRequest.status === "submitted" && (

                  <button
                    type="button"
                    className="sam-action-button review"
                    onClick={() =>
                      performAction(currentRequest, "review")
                    }
                    disabled={processing}
                  >

                    <Eye size={16} />

                    Review

                  </button>

                )}


                {/* APPROVE */}

                {[
                  "submitted",
                  "under_review",
                ].includes(currentRequest.status) && (

                  <button
                    type="button"
                    className="sam-action-button approve"
                    onClick={() =>
                      performAction(currentRequest, "approve")
                    }
                    disabled={processing}
                  >

                    <Check size={16} />

                    Approve

                  </button>

                )}


                {/* REJECT */}

                {[
                  "submitted",
                  "under_review",
                ].includes(currentRequest.status) && (

                  <button
                    type="button"
                    className="sam-action-button reject"
                    onClick={() =>
                      performAction(currentRequest, "reject")
                    }
                    disabled={processing}
                  >

                    <XCircle size={16} />

                    Reject

                  </button>

                )}


                {/* ASSIGN STAFF */}

                {[
                  "approved",
                ].includes(currentRequest.status) && (

                  <button
                    type="button"
                    className="sam-action-button assign"
                    onClick={() =>
                      openAssignModal(currentRequest)
                    }
                    disabled={processing}
                  >

                    <UserPlus size={16} />

                    Assign Staff

                  </button>

                )}


                {/* TRANSFER MANAGER */}

                {currentRequest.status !== "closed" &&
                  managers.length > 0 && (

                    <button
                      type="button"
                      className="sam-action-button transfer"
                      onClick={() =>
                        openTransferModal(currentRequest)
                      }
                      disabled={processing}
                    >

                      <ArrowRightLeft size={16} />

                      Transfer

                    </button>

                  )}


                {/* CLOSE AFTER VERIFICATION */}

                {currentRequest.status === "completed" &&
                  currentRequest.verified_at &&
                  currentRequest.verified_by && (

                    <button
                      type="button"
                      className="sam-action-button close"
                      onClick={() =>
                        performAction(currentRequest, "close")
                      }
                      disabled={processing}
                    >

                      <CheckCircle2 size={16} />

                      Close Request

                    </button>

                  )}


                <button
                  type="button"
                  className="sam-close-button"
                  onClick={closeDetails}
                >

                  Close

                </button>

              </div>

            </div>

          </section>

        </div>

      )}


      {/* ===================================================
          ASSIGN STAFF MODAL
      =================================================== */}

      {showAssignModal && selectedRequest && (

        <div
          className="sam-modal-overlay sam-secondary-overlay"
          onClick={() => setShowAssignModal(false)}
        >

          <section
            className="sam-modal sam-form-modal"
            onClick={(event) => event.stopPropagation()}
          >


            <div className="sam-modal-header">

              <div>

                <span>STAFF MANAGEMENT</span>

                <h3>Assign Senior Citizen Staff</h3>

              </div>


              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={21} />
              </button>

            </div>


            <form onSubmit={assignStaff}>


              <div className="sam-form-body">


                <div className="sam-form-info">

                  <UserRound size={20} />

                  <div>

                    <strong>
                      {selectedRequest.full_name}
                    </strong>

                    <span>
                      Request #SC-{selectedRequest.id}
                    </span>

                  </div>

                </div>


                <div className="sam-form-group">

                  <label>
                    Select Senior Citizen Staff
                    <span>*</span>
                  </label>


                  <select
                    value={assignForm.staff_id}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        staff_id: event.target.value,
                      }))
                    }
                    required
                  >

                    <option value="">
                      Select staff member
                    </option>


                    {availableStaff.map((person) => (

                      <option
                        key={person.id}
                        value={person.user}
                      >

                        {`${person.first_name || ""} ${person.last_name || ""}`.trim() ||
                          person.email}
                        {" — "}
                        {person.district || "No district"}

                      </option>

                    ))}

                  </select>


                  {availableStaff.length === 0 && (

                    <small className="sam-field-note">
                      No active Senior Citizen Staff members are available.
                    </small>

                  )}

                </div>


                <div className="sam-form-group">

                  <label>
                    Deadline
                    <span>*</span>
                  </label>


                  <div className="sam-input-icon">

                    <CalendarDays size={17} />

                    <input
                      type="datetime-local"
                      value={assignForm.deadline}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          deadline: event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="sam-form-group">

                  <label>
                    Estimated Arrival
                    <span>*</span>
                  </label>


                  <div className="sam-input-icon">

                    <CalendarClock size={17} />

                    <input
                      type="datetime-local"
                      value={assignForm.estimated_arrival}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          estimated_arrival: event.target.value,
                        }))
                      }
                      required
                    />

                  </div>

                </div>


                <div className="sam-form-notice">

                  <AlertCircle size={17} />

                  Deadline and estimated arrival are required by the backend.
                  Both dates must be in the future.

                </div>


                {error && (

                  <div className="sam-inline-error">

                    <AlertCircle size={16} />

                    {error}

                  </div>

                )}

              </div>


              <div className="sam-form-footer">

                <button
                  type="button"
                  className="sam-cancel-button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="sam-submit-button"
                  disabled={
                    processing ||
                    availableStaff.length === 0
                  }
                >

                  {processing ? (

                    <>
                      <RefreshCw
                        size={16}
                        className="sam-spin"
                      />

                      Assigning...

                    </>

                  ) : (

                    <>
                      <UserPlus size={16} />

                      Assign Staff

                    </>

                  )}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}


      {/* ===================================================
          TRANSFER REQUEST MODAL
      =================================================== */}

      {showTransferModal && selectedRequest && (

        <div
          className="sam-modal-overlay sam-secondary-overlay"
          onClick={() => setShowTransferModal(false)}
        >

          <section
            className="sam-modal sam-form-modal"
            onClick={(event) => event.stopPropagation()}
          >


            <div className="sam-modal-header">

              <div>

                <span>MANAGER MANAGEMENT</span>

                <h3>Transfer Assistance Request</h3>

              </div>


              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
              >
                <X size={21} />
              </button>

            </div>


            <form onSubmit={transferRequest}>


              <div className="sam-form-body">


                <div className="sam-form-info">

                  <ArrowRightLeft size={20} />

                  <div>

                    <strong>
                      {selectedRequest.full_name}
                    </strong>

                    <span>
                      Request #SC-{selectedRequest.id}
                    </span>

                  </div>

                </div>


                <div className="sam-form-group">

                  <label>
                    Destination Senior Citizen Manager
                    <span>*</span>
                  </label>


                  <select
                    value={transferForm.manager_id}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        manager_id: event.target.value,
                      }))
                    }
                    required
                  >

                    <option value="">
                      Select destination manager
                    </option>


                    {managers.map((manager) => (

                      <option
                        key={manager.id}
                        value={manager.manager_id || manager.id}
                      >

                        {manager.full_name || manager.email}

                        {" — "}

                        {manager.email}

                      </option>

                    ))}

                  </select>

                </div>


                <div className="sam-form-group">

                  <label>
                    Transfer Note
                  </label>


                  <textarea
                    rows="4"
                    placeholder="Enter the reason for transferring this request..."
                    value={transferForm.note}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />

                </div>


                <div className="sam-form-notice">

                  <AlertCircle size={17} />

                  Transferring changes the assigned manager.
                  The request ID, status, assigned staff and existing
                  messages are preserved by the backend.

                </div>


                {error && (

                  <div className="sam-inline-error">

                    <AlertCircle size={16} />

                    {error}

                  </div>

                )}

              </div>


              <div className="sam-form-footer">

                <button
                  type="button"
                  className="sam-cancel-button"
                  onClick={() => setShowTransferModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="sam-submit-button"
                  disabled={processing || managers.length === 0}
                >

                  {processing ? (

                    <>
                      <RefreshCw
                        size={16}
                        className="sam-spin"
                      />

                      Transferring...

                    </>

                  ) : (

                    <>
                      <ArrowRightLeft size={16} />

                      Transfer Request

                    </>

                  )}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </div>

  );

}