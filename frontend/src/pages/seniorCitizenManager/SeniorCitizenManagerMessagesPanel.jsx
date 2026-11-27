import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  Mail,
  RefreshCw,
  Send,
  X,
  MessageSquare,
  ClipboardList,
  UserRound,
  Clock,
  CheckCircle2,
} from "lucide-react";

import api from "../../api/axios";
import "./SeniorCitizenManagerMessagesPanel.css";

const endpoints = {
  inbox: "/messaging/internal/inbox/",
  sent: "/messaging/internal/sent/",
  requests: "/senior-citizen/",
};

// Local API error helper
const getApiErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.response?.data?.recipient_email?.[0] ||
  error?.message ||
  "Something went wrong. Please try again.";

// Handle API response formats
function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.issues)) return data.issues;
  return [];
}

// Get a readable date
const formatDate = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleDateString();
};

const formatDateTime = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString();
};

// Get citizen name from available request fields
const getCitizenName = (request) => {
  return (
    request?.senior_citizen_name ||
    request?.citizen_name ||
    request?.full_name ||
    request?.name ||
    request?.citizen?.full_name ||
    request?.citizen?.name ||
    request?.user?.full_name ||
    request?.user?.name ||
    request?.user?.email ||
    request?.email ||
    "Senior Citizen"
  );
};

// Get request identifier
const getRequestId = (request) =>
  request?.id || request?.request_id;

// Issue type labels
const getIssueLabel = (issueType) => {
  const labels = {
    staff_not_arrived: "Staff Did Not Arrive",
    pickup_not_completed: "Pickup Not Completed",
  };

  return labels[issueType] || issueType || "Reported Issue";
};

// Issue status labels
const getIssueStatusLabel = (status) => {
  const labels = {
    open: "Open",
    under_review: "Under Review",
    resolved: "Resolved",
  };

  return labels[status] || status || "Open";
};

export default function SeniorCitizenManagerMessagesPanel() {
  const [tab, setTab] = useState("inbox");

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);

  const [sending, setSending] = useState(false);

  const [reply, setReply] = useState("");

  const [replying, setReplying] = useState(false);

  // Senior Citizen request messages
  const [requestMessages, setRequestMessages] = useState([]);

  const [requestMessagesLoading, setRequestMessagesLoading] =
    useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [requestReply, setRequestReply] = useState("");

  const [requestReplying, setRequestReplying] = useState(false);

  // Senior Citizen issue reports
  const [requestIssues, setRequestIssues] = useState([]);

  const [issuesLoading, setIssuesLoading] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState(null);

  const [issueResponse, setIssueResponse] = useState("");

  const [issueStatus, setIssueStatus] = useState("under_review");

  const [issueUpdating, setIssueUpdating] = useState(false);

  // Compose message form
  const [form, setForm] = useState({
    recipient_email: "",
    subject: "",
    content: "",
  });

  // =========================================
  // EXISTING INTERNAL INBOX / SENT FUNCTIONS
  // =========================================

  // Load Inbox / Sent messages
  const loadMessages = useCallback(async (folder = tab) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(endpoints[folder], {
        timeout: 12000,
      });

      setMessages(getRows(response.data));
    } catch (err) {
      setMessages([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // =========================================
  // LOAD SENIOR CITIZEN REQUEST CONVERSATIONS
  // =========================================

  const loadRequestMessages = useCallback(async () => {
    setRequestMessagesLoading(true);
    setError("");

    try {
      // Get manager-accessible Senior Citizen requests
      const requestResponse = await api.get(
        endpoints.requests,
        {
          timeout: 15000,
        }
      );

      const requests = getRows(requestResponse.data);

      // Load conversations for each accessible request
      const conversationResults = await Promise.allSettled(
        requests.map(async (request) => {
          const requestId = getRequestId(request);

          if (!requestId) return [];

          const response = await api.get(
            `/senior-citizen/${requestId}/messages/`,
            {
              timeout: 15000,
            }
          );

          const rows = getRows(response.data);

          return rows.map((message) => ({
            ...message,
            request_id: requestId,
            request_name: getCitizenName(request),
            request_data: request,
          }));
        })
      );

      const allMessages = [];

      conversationResults.forEach((result) => {
        if (result.status === "fulfilled") {
          allMessages.push(...result.value);
        }
      });

      allMessages.sort((a, b) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

      setRequestMessages(allMessages);

    } catch (err) {
      setRequestMessages([]);
      setError(getApiErrorMessage(err));
    } finally {
      setRequestMessagesLoading(false);
    }
  }, []);

  // =========================================
  // LOAD SENIOR CITIZEN ISSUE REPORTS
  // =========================================

  const loadRequestIssues = useCallback(async () => {
    setIssuesLoading(true);
    setError("");

    try {
      const requestResponse = await api.get(
        endpoints.requests,
        {
          timeout: 15000,
        }
      );

      const requests = getRows(requestResponse.data);

      const issueResults = await Promise.allSettled(
        requests.map(async (request) => {
          const requestId = getRequestId(request);

          if (!requestId) return [];

          const response = await api.get(
            `/senior-citizen/${requestId}/issues/`,
            {
              timeout: 15000,
            }
          );

          const rows = getRows(response.data);

          return rows.map((issue) => ({
            ...issue,
            request_id: requestId,
            request_name: getCitizenName(request),
            request_data: request,
          }));
        })
      );

      const allIssues = [];

      issueResults.forEach((result) => {
        if (result.status === "fulfilled") {
          allIssues.push(...result.value);
        }
      });

      allIssues.sort((a, b) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

      setRequestIssues(allIssues);

    } catch (err) {
      setRequestIssues([]);
      setError(getApiErrorMessage(err));
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  // =========================================
  // LOAD DATA WHEN TAB CHANGES
  // =========================================

  useEffect(() => {
    if (tab === "inbox" || tab === "sent") {
      loadMessages(tab);
    }

    if (tab === "request-messages") {
      loadRequestMessages();
    }

    if (tab === "issues") {
      loadRequestIssues();
    }
  }, [
    tab,
    loadMessages,
    loadRequestMessages,
    loadRequestIssues,
  ]);

  // =========================================
  // EXISTING COMPOSE FUNCTION
  // =========================================

  // Open Compose Modal
  const openCompose = () => {
    setForm({
      recipient_email: "",
      subject: "",
      content: "",
    });

    setError("");
    setComposeOpen(true);
  };

  // =========================================
  // EXISTING INTERNAL MESSAGE READ FUNCTION
  // =========================================

  // Open message and mark as read
  const openMessage = async (message) => {
    setSelected(message);
    setReply("");

    if (tab !== "inbox" || message.is_read) return;

    try {
      await api.post(
        `/messaging/internal/${message.id}/read/`,
        {},
        { timeout: 10000 }
      );

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setSelected((current) =>
        current?.id === message.id
          ? { ...current, is_read: true }
          : current
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  // =========================================
  // EXISTING INTERNAL SEND FUNCTION
  // =========================================

  // Send new message using recipient email
  const sendMessage = async (event) => {
    event.preventDefault();

    const recipientEmail = form.recipient_email.trim();
    const subject = form.subject.trim();
    const content = form.content.trim();

    if (!recipientEmail || !subject || !content) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(recipientEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await api.post(
        "/messaging/internal/send/",
        {
          recipient_email: recipientEmail,
          subject,
          content,
        },
        {
          timeout: 15000,
        }
      );

      setComposeOpen(false);

      setForm({
        recipient_email: "",
        subject: "",
        content: "",
      });

      setTab("sent");

      await loadMessages("sent");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // =========================================
  // EXISTING INTERNAL REPLY FUNCTION
  // =========================================

  // Reply to received message
  const sendReply = async (event) => {
    event.preventDefault();

    if (!reply.trim() || !selected) return;

    setReplying(true);
    setError("");

    try {
      await api.post(
        `/messaging/internal/${selected.id}/reply/`,
        {
          content: reply.trim(),
        },
        {
          timeout: 15000,
        }
      );

      setReply("");
      setSelected(null);
      setTab("sent");

      await loadMessages("sent");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReplying(false);
    }
  };

  // =========================================
  // REQUEST CONVERSATION FUNCTIONS
  // =========================================

  const openRequestConversation = (message) => {
    setError("");

    const requestId = message.request_id;

    const conversation = requestMessages
      .filter(
        (item) => String(item.request_id) === String(requestId)
      )
      .sort((a, b) => {
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      });

    setSelectedRequest({
      request_id: requestId,
      request_name: message.request_name,
      request_data: message.request_data,
      messages: conversation,
    });

    setRequestReply("");
  };

  // Send reply to Senior Citizen request conversation
  const sendRequestReply = async (event) => {
    event.preventDefault();

    if (!selectedRequest || !requestReply.trim()) return;

    setRequestReplying(true);
    setError("");

    try {
      await api.post(
        `/senior-citizen/${selectedRequest.request_id}/messages/`,
        {
          content: requestReply.trim(),
        },
        {
          timeout: 15000,
        }
      );

      setRequestReply("");

      // Reload conversations to show the newly sent message
      await loadRequestMessages();

      // Refresh selected conversation
      const response = await api.get(
        `/senior-citizen/${selectedRequest.request_id}/messages/`,
        {
          timeout: 15000,
        }
      );

      const updatedMessages = getRows(response.data);

      setSelectedRequest((current) => {
        if (
          !current ||
          String(current.request_id) !==
            String(selectedRequest.request_id)
        ) {
          return current;
        }

        return {
          ...current,
          messages: updatedMessages,
        };
      });

    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRequestReplying(false);
    }
  };

  // =========================================
  // ISSUE REPORT FUNCTIONS
  // =========================================

  const openIssue = (issue) => {
    setSelectedIssue(issue);
    setIssueResponse(issue.manager_response || "");
    setIssueStatus(
      issue.status === "open"
        ? "under_review"
        : issue.status || "under_review"
    );
    setError("");
  };

  // Manager response and issue status update
  const updateIssue = async (event) => {
    event.preventDefault();

    if (!selectedIssue) return;

    if (!issueResponse.trim()) {
      setError("Please enter your response.");
      return;
    }

    setIssueUpdating(true);
    setError("");

    try {
      await api.patch(
        `/senior-citizen/issues/${selectedIssue.id}/`,
        {
          manager_response: issueResponse.trim(),
          status: issueStatus,
        },
        {
          timeout: 15000,
        }
      );

      setSelectedIssue(null);
      setIssueResponse("");

      await loadRequestIssues();

    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIssueUpdating(false);
    }
  };

  // =========================================
  // EXISTING PERSON FUNCTION
  // =========================================

  // Get sender / recipient name
  const person = (message) =>
    tab === "sent"
      ? message.recipient_name ||
        message.recipient_email ||
        "Recipient"
      : message.sender_name ||
        message.sender_email ||
        "Sender";

  // =========================================
  // REQUEST MESSAGE PERSON
  // =========================================

  const getRequestMessagePerson = (message) =>
    message.sender_name ||
    message.sender_email ||
    message.request_name ||
    "Senior Citizen";

  // =========================================
  // REFRESH CURRENT TAB
  // =========================================

  const refreshCurrentTab = () => {
    if (tab === "inbox" || tab === "sent") {
      loadMessages(tab);
    } else if (tab === "request-messages") {
      loadRequestMessages();
    } else if (tab === "issues") {
      loadRequestIssues();
    }
  };

  const currentLoading =
    loading ||
    (tab === "request-messages" && requestMessagesLoading) ||
    (tab === "issues" && issuesLoading);

  // =========================================
  // RENDER
  // =========================================

  return (
    <section className="scmp-messages-panel">

      {/* PANEL HEADING */}
      <div className="sc-panel-heading scmp-messages-heading">

        <div>
          <h3>Team Messages</h3>

          <p>
            Internal communication and Senior Citizen request conversations
          </p>
        </div>

        <div className="scmp-message-heading-actions">

          <button
            type="button"
            className="scmp-message-refresh"
            onClick={refreshCurrentTab}
            disabled={currentLoading}
            aria-label="Refresh messages"
          >
            {currentLoading ? (
              <LoaderCircle size={15} className="scmp-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
          </button>

          <button
            type="button"
            className="scmp-compose-button"
            onClick={openCompose}
          >
            <Mail size={14} />
            Compose
          </button>

        </div>
      </div>

      {/* MESSAGE TABS */}
      <div className="scmp-message-tabs">

        <button
          type="button"
          className={tab === "inbox" ? "active" : ""}
          onClick={() => setTab("inbox")}
        >
          <Mail size={13} />
          Inbox
        </button>

        <button
          type="button"
          className={tab === "sent" ? "active" : ""}
          onClick={() => setTab("sent")}
        >
          <Send size={13} />
          Sent
        </button>

        <button
          type="button"
          className={
            tab === "request-messages" ? "active" : ""
          }
          onClick={() => setTab("request-messages")}
        >
          <MessageSquare size={13} />
          Request Messages
        </button>

        <button
          type="button"
          className={tab === "issues" ? "active" : ""}
          onClick={() => setTab("issues")}
        >
          <ClipboardList size={13} />
          Issue Reports
        </button>

      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="scmp-message-error"
          role="alert"
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* =====================================
          INTERNAL INBOX / SENT LIST
      ====================================== */}

      {(tab === "inbox" || tab === "sent") && (

        <>
          {loading ? (

            <div className="scmp-message-empty">
              <LoaderCircle size={20} className="scmp-spin" />
              <span>Loading messages...</span>
            </div>

          ) : messages.length === 0 ? (

            <div className="scmp-message-empty">
              <Mail size={22} />

              <strong>No messages yet</strong>

              <span>
                Your {tab} messages will appear here.
              </span>
            </div>

          ) : (

            <div className="scmp-message-list">

              {messages.map((message) => (

                <button
                  type="button"
                  className={`scmp-message-row ${
                    !message.is_read && tab === "inbox"
                      ? "unread"
                      : ""
                  }`}
                  key={message.id}
                  onClick={() => openMessage(message)}
                >

                  <span className="scmp-message-avatar">
                    {(person(message).match(/\b\w/g) || ["M"])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>

                  <span className="scmp-message-summary">

                    <span className="scmp-message-person">
                      {person(message)}
                    </span>

                    <strong>
                      {message.subject || "(No subject)"}
                    </strong>

                    <span className="scmp-message-preview">
                      {message.content || ""}
                    </span>

                  </span>

                  <span className="scmp-message-meta">

                    <time>
                      {formatDate(message.created_at)}
                    </time>

                    {!message.is_read && tab === "inbox" && (
                      <i>New</i>
                    )}

                  </span>

                </button>

              ))}

            </div>

          )}
        </>

      )}

      {/* =====================================
          SENIOR CITIZEN REQUEST MESSAGES
      ====================================== */}

      {tab === "request-messages" && (

        <div className="scmp-request-section">

          {requestMessagesLoading ? (

            <div className="scmp-message-empty">
              <LoaderCircle
                size={20}
                className="scmp-spin"
              />
              <span>Loading request conversations...</span>
            </div>

          ) : requestMessages.length === 0 ? (

            <div className="scmp-message-empty">
              <MessageSquare size={23} />

              <strong>No request conversations found</strong>

              <span>
                Messages from Senior Citizen assistance requests
                will appear here.
              </span>
            </div>

          ) : (

            <div className="scmp-message-list">

              {requestMessages.map((message) => (

                <button
                  type="button"
                  className="scmp-message-row"
                  key={`${message.request_id}-${message.id}`}
                  onClick={() =>
                    openRequestConversation(message)
                  }
                >

                  <span className="scmp-message-avatar scmp-request-avatar">
                    <UserRound size={17} />
                  </span>

                  <span className="scmp-message-summary">

                    <span className="scmp-message-person">
                      {message.request_name || "Senior Citizen"}
                    </span>

                    <strong>
                      Request #{message.request_id}
                    </strong>

                    <span className="scmp-message-preview">
                      {message.content || ""}
                    </span>

                  </span>

                  <span className="scmp-message-meta">

                    <time>
                      {formatDate(message.created_at)}
                    </time>

                    <i className="scmp-request-badge">
                      Request
                    </i>

                  </span>

                </button>

              ))}

            </div>

          )}

        </div>

      )}

      {/* =====================================
          SENIOR CITIZEN ISSUE REPORTS
      ====================================== */}

      {tab === "issues" && (

        <div className="scmp-issues-section">

          {issuesLoading ? (

            <div className="scmp-message-empty">
              <LoaderCircle
                size={20}
                className="scmp-spin"
              />
              <span>Loading issue reports...</span>
            </div>

          ) : requestIssues.length === 0 ? (

            <div className="scmp-message-empty">
              <ClipboardList size={23} />

              <strong>No issue reports found</strong>

              <span>
                Reported Senior Citizen assistance problems
                will appear here.
              </span>
            </div>

          ) : (

            <div className="scmp-issue-list">

              {requestIssues.map((issue) => (

                <button
                  type="button"
                  className="scmp-issue-row"
                  key={issue.id}
                  onClick={() => openIssue(issue)}
                >

                  <span className="scmp-issue-icon">
                    <AlertCircle size={19} />
                  </span>

                  <span className="scmp-issue-content">

                    <strong>
                      {getIssueLabel(issue.issue_type)}
                    </strong>

                    <span>
                      {issue.request_name || "Senior Citizen"}
                    </span>

                    <small>
                      Request #{issue.request_id}
                    </small>

                    <p>
                      {issue.description || ""}
                    </p>

                  </span>

                  <span className="scmp-issue-meta">

                    <i
                      className={`scmp-issue-status scmp-status-${issue.status}`}
                    >
                      {getIssueStatusLabel(issue.status)}
                    </i>

                    <time>
                      {formatDate(issue.created_at)}
                    </time>

                  </span>

                </button>

              ))}

            </div>

          )}

        </div>

      )}

      {/* =====================================
          EXISTING COMPOSE MESSAGE MODAL
      ====================================== */}

      {composeOpen && (

        <div
          className="scmp-message-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setComposeOpen(false);
            }
          }}
        >

          <div className="scmp-message-modal">

            <div className="scmp-message-modal-head">

              <div>
                <span>NEW MESSAGE</span>
                <h2>Compose message</h2>
              </div>

              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close compose window"
              >
                <X size={18} />
              </button>

            </div>

            <form
              className="scmp-message-form"
              onSubmit={sendMessage}
            >

              <label>
                Recipient Email Address

                <input
                  type="email"
                  name="recipient_email"
                  placeholder="Enter recipient email address"
                  value={form.recipient_email}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      recipient_email: event.target.value,
                    });
                  }}
                  required
                  autoComplete="email"
                />

              </label>

              <label>
                Subject

                <input
                  type="text"
                  name="subject"
                  placeholder="Enter message subject"
                  maxLength={200}
                  value={form.subject}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      subject: event.target.value,
                    });
                  }}
                  required
                />

              </label>

              <label>
                Message

                <textarea
                  name="content"
                  rows={6}
                  placeholder="Write your message here..."
                  value={form.content}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      content: event.target.value,
                    });
                  }}
                  required
                />

              </label>

              <div className="scmp-message-modal-actions">

                <button
                  className="secondary"
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={sending}
                >

                  {sending ? (
                    <>
                      <LoaderCircle
                        size={14}
                        className="scmp-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =====================================
          EXISTING INTERNAL MESSAGE DETAILS
      ====================================== */}

      {selected && (

        <div
          className="scmp-message-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >

          <div className="scmp-message-modal scmp-message-detail-modal">

            <div className="scmp-message-modal-head">

              <div>
                <span>MESSAGE DETAILS</span>

                <h2>
                  {selected.subject || "(No subject)"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close message"
              >
                <X size={18} />
              </button>

            </div>

            <div className="scmp-message-detail-meta">

              <p>
                <strong>From:</strong>{" "}
                {selected.sender_name ||
                  selected.sender_email ||
                  "—"}
              </p>

              <p>
                <strong>To:</strong>{" "}
                {selected.recipient_name ||
                  selected.recipient_email ||
                  "—"}
              </p>

              <time>
                {formatDateTime(selected.created_at)}
              </time>

            </div>

            <div className="scmp-message-detail-content">
              {selected.content}
            </div>

            {tab === "inbox" && (

              <form
                className="scmp-message-reply-form"
                onSubmit={sendReply}
              >

                <label>
                  Reply

                  <textarea
                    rows={4}
                    placeholder="Write your reply..."
                    value={reply}
                    onChange={(event) =>
                      setReply(event.target.value)
                    }
                    required
                  />

                </label>

                <div>

                  <small>
                    Reply will be sent to the original sender.
                  </small>

                  <button
                    type="submit"
                    disabled={replying || !reply.trim()}
                  >

                    {replying ? (
                      <>
                        <LoaderCircle
                          size={13}
                          className="scmp-spin"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        Reply
                      </>
                    )}

                  </button>

                </div>

              </form>

            )}

          </div>

        </div>

      )}

      {/* =====================================
          SENIOR CITIZEN REQUEST CONVERSATION
      ====================================== */}

      {selectedRequest && (

        <div
          className="scmp-message-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >

          <div className="scmp-message-modal scmp-request-detail-modal">

            <div className="scmp-message-modal-head">

              <div>
                <span>ASSISTANCE REQUEST CONVERSATION</span>

                <h2>
                  {selectedRequest.request_name}
                </h2>

                <small>
                  Request #{selectedRequest.request_id}
                </small>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close conversation"
              >
                <X size={18} />
              </button>

            </div>

            <div className="scmp-request-conversation">

              {!selectedRequest.messages?.length ? (

                <div className="scmp-message-empty">
                  <MessageSquare size={22} />

                  <strong>No conversation messages</strong>

                  <span>
                    Send a message to start this conversation.
                  </span>
                </div>

              ) : (

                selectedRequest.messages.map((message) => (

                  <div
                    className="scmp-request-chat-message"
                    key={message.id}
                  >

                    <div className="scmp-request-chat-header">

                      <strong>
                        {getRequestMessagePerson(message)}
                      </strong>

                      <time>
                        {formatDateTime(message.created_at)}
                      </time>

                    </div>

                    <p>
                      {message.content}
                    </p>

                  </div>

                ))

              )}

            </div>

            <form
              className="scmp-message-reply-form scmp-request-reply-form"
              onSubmit={sendRequestReply}
            >

              <label>
                Reply to Senior Citizen

                <textarea
                  rows={4}
                  placeholder="Write your response..."
                  value={requestReply}
                  onChange={(event) =>
                    setRequestReply(event.target.value)
                  }
                  required
                />

              </label>

              <div>

                <small>
                  Your reply will be added to this request conversation.
                </small>

                <button
                  type="submit"
                  disabled={
                    requestReplying || !requestReply.trim()
                  }
                >

                  {requestReplying ? (
                    <>
                      <LoaderCircle
                        size={13}
                        className="scmp-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Send Reply
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =====================================
          SENIOR CITIZEN ISSUE DETAILS
      ====================================== */}

      {selectedIssue && (

        <div
          className="scmp-message-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIssue(null);
            }
          }}
        >

          <div className="scmp-message-modal scmp-issue-detail-modal">

            <div className="scmp-message-modal-head">

              <div>
                <span>SENIOR CITIZEN ISSUE REPORT</span>

                <h2>
                  {getIssueLabel(selectedIssue.issue_type)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                aria-label="Close issue"
              >
                <X size={18} />
              </button>

            </div>

            <div className="scmp-message-detail-meta">

              <p>
                <strong>Citizen:</strong>{" "}
                {selectedIssue.request_name || "Senior Citizen"}
              </p>

              <p>
                <strong>Request ID:</strong>{" "}
                #{selectedIssue.request_id}
              </p>

              <p>
                <strong>Reported by:</strong>{" "}
                {selectedIssue.reported_by_email || "—"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {getIssueStatusLabel(selectedIssue.status)}
              </p>

              <time>
                Reported: {formatDateTime(selectedIssue.created_at)}
              </time>

            </div>

            <div className="scmp-issue-description">

              <strong>Problem Description</strong>

              <p>
                {selectedIssue.description || "No description provided."}
              </p>

            </div>

            {selectedIssue.updated_eta && (

              <div className="scmp-issue-eta">

                <Clock size={14} />

                <span>
                  Updated ETA: {selectedIssue.updated_eta}
                </span>

              </div>

            )}

            <form
              className="scmp-message-form scmp-issue-response-form"
              onSubmit={updateIssue}
            >

              <label>
                Manager Response

                <textarea
                  rows={4}
                  placeholder="Write your response to the reported issue..."
                  value={issueResponse}
                  onChange={(event) =>
                    setIssueResponse(event.target.value)
                  }
                  required
                />

              </label>

              <label>
                Update Issue Status

                <select
                  value={issueStatus}
                  onChange={(event) =>
                    setIssueStatus(event.target.value)
                  }
                  required
                >
                  <option value="open">Open</option>

                  <option value="under_review">
                    Under Review
                  </option>

                  <option value="resolved">
                    Resolved
                  </option>
                </select>

              </label>

              {selectedIssue.manager_response && (

                <div className="scmp-existing-manager-response">

                  <strong>Previous Manager Response</strong>

                  <p>
                    {selectedIssue.manager_response}
                  </p>

                </div>

              )}

              <div className="scmp-message-modal-actions">

                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedIssue(null)}
                  disabled={issueUpdating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={issueUpdating || !issueResponse.trim()}
                >

                  {issueUpdating ? (
                    <>
                      <LoaderCircle
                        size={14}
                        className="scmp-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Update Issue
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>
  );
}