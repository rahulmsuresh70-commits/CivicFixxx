import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  MailOpen,
  Send,
  Search,
  RefreshCw,
  Plus,
  X,
  Reply,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ArrowLeft,
  Loader2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

import api from "../../api/axios";
import "./AdminMessages.css";

const INBOX_URL = "/messaging/internal/inbox/";
const SENT_URL = "/messaging/internal/sent/";
const SEND_URL = "/messaging/internal/send/";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;

  const firstError = Object.values(data).flat()[0];

  return typeof firstError === "string"
    ? firstError
    : "Unable to complete the request.";
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const AdminMessages = () => {
  const [activeTab, setActiveTab] = useState("inbox");

  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);

  const [selectedMessage, setSelectedMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);

  const [showCompose, setShowCompose] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [composeForm, setComposeForm] = useState({
    recipient_email: "",
    subject: "",
    content: "",
  });

  const [replyContent, setReplyContent] = useState("");

  const messages =
    activeTab === "inbox" ? inboxMessages : sentMessages;

  const loadMessages = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [inboxResponse, sentResponse] = await Promise.all([
        api.get(INBOX_URL),
        api.get(SENT_URL),
      ]);

      setInboxMessages(getArray(inboxResponse.data));
      setSentMessages(getArray(sentResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!success) return undefined;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [success]);

  const unreadCount = useMemo(
    () => inboxMessages.filter((message) => !message.is_read).length,
    [inboxMessages]
  );

  const filteredMessages = useMemo(() => {
    let result = [...messages];

    if (activeTab === "inbox") {
      if (filter === "unread") {
        result = result.filter((message) => !message.is_read);
      } else if (filter === "read") {
        result = result.filter((message) => message.is_read);
      }
    }

    const search = searchTerm.trim().toLowerCase();

    if (search) {
      result = result.filter((message) => {
        const searchable = [
          message.subject,
          message.content,
          message.sender_name,
          message.sender_email,
          message.recipient_name,
          message.recipient_email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(search);
      });
    }

    return result;
  }, [messages, activeTab, filter, searchTerm]);

  const openMessage = async (message) => {
    setSelectedMessage(message);
    setReplyContent("");
    setError("");

    if (activeTab !== "inbox" || message.is_read) {
      return;
    }

    try {
      const response = await api.post(
        `/messaging/internal/${message.id}/read/`
      );

      const updatedMessage = response.data || {
        ...message,
        is_read: true,
      };

      setInboxMessages((previous) =>
        previous.map((item) =>
          item.id === message.id
            ? { ...item, ...updatedMessage, is_read: true }
            : item
        )
      );

      setSelectedMessage((previous) =>
        previous?.id === message.id
          ? { ...previous, ...updatedMessage, is_read: true }
          : previous
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleComposeChange = (event) => {
    const { name, value } = event.target;

    setComposeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (
      !composeForm.recipient_email.trim() ||
      !composeForm.subject.trim() ||
      !composeForm.content.trim()
    ) {
      setError("Please complete all message fields.");
      return;
    }

    try {
      setSending(true);
      setError("");

      await api.post(SEND_URL, {
        recipient_email: composeForm.recipient_email.trim(),
        subject: composeForm.subject.trim(),
        content: composeForm.content.trim(),
      });

      setComposeForm({
        recipient_email: "",
        subject: "",
        content: "",
      });

      setShowCompose(false);
      setActiveTab("sent");
      setFilter("all");

      setSuccess("Message sent successfully.");

      await loadMessages(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!selectedMessage || !replyContent.trim()) {
      setError("Please enter your reply.");
      return;
    }

    try {
      setReplying(true);
      setError("");

      await api.post(
        `/messaging/internal/${selectedMessage.id}/reply/`,
        {
          content: replyContent.trim(),
        }
      );

      setReplyContent("");
      setSuccess("Reply sent successfully.");

      await loadMessages(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReplying(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedMessage(null);
    setSearchTerm("");
    setFilter("all");
    setError("");
  };

  const closeCompose = () => {
    if (sending) return;

    setShowCompose(false);
    setComposeForm({
      recipient_email: "",
      subject: "",
      content: "",
    });
  };

  const getMessagePerson = (message) => {
    if (activeTab === "inbox") {
      return {
        name: message.sender_name || message.sender_email || "Unknown sender",
        email: message.sender_email || "",
      };
    }

    return {
      name:
        message.recipient_name ||
        message.recipient_email ||
        "Unknown recipient",
      email: message.recipient_email || "",
    };
  };

  const renderMessageList = () => {
    if (loading) {
      return (
        <div className="am-state">
          <Loader2 className="am-spinner" size={30} />
          <p>Loading messages...</p>
        </div>
      );
    }

    if (filteredMessages.length === 0) {
      return (
        <div className="am-empty">
          <div className="am-empty-icon">
            <Mail size={30} />
          </div>

          <h3>No messages found</h3>

          <p>
            {searchTerm
              ? "Try another search term."
              : activeTab === "inbox"
                ? "Your inbox is currently empty."
                : "You haven't sent any messages yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="am-message-list">
        {filteredMessages.map((message) => {
          const person = getMessagePerson(message);
          const isSelected = selectedMessage?.id === message.id;

          return (
            <button
              type="button"
              className={`am-message-item ${
                !message.is_read && activeTab === "inbox"
                  ? "am-unread"
                  : ""
              } ${isSelected ? "am-selected" : ""}`}
              key={message.id}
              onClick={() => openMessage(message)}
            >
              <div className="am-avatar">
                {getInitials(person.name)}
              </div>

              <div className="am-message-main">
                <div className="am-message-top">
                  <span className="am-message-person">
                    {person.name}
                  </span>

                  <span className="am-message-date">
                    {formatDate(message.created_at)}
                  </span>
                </div>

                <div className="am-message-subject">
                  {message.subject || "No subject"}
                </div>

                <p className="am-message-preview">
                  {message.content || "No message content"}
                </p>

                <div className="am-message-bottom">
                  <span className="am-message-email">
                    {person.email}
                  </span>

                  {!message.is_read && activeTab === "inbox" && (
                    <span className="am-unread-label">Unread</span>
                  )}
                </div>
              </div>

              <ChevronRight
                className="am-message-chevron"
                size={18}
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <div className="am-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span>Messages</span>
          </div>

          <h1>Messages</h1>

          <p>
            Manage your CivicFix conversations and communicate with
            registered users.
          </p>
        </div>

        <div className="am-header-actions">
          <button
            type="button"
            className="am-refresh-btn"
            onClick={() => loadMessages(false)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "am-spinner" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="am-compose-btn"
            onClick={() => {
              setError("");
              setShowCompose(true);
            }}
          >
            <Plus size={18} />
            Compose Message
          </button>
        </div>
      </div>

      {error && (
        <div className="am-alert am-alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="am-alert am-alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="am-stats">
        <div className="am-stat-card">
          <div className="am-stat-icon am-stat-blue">
            <Inbox size={21} />
          </div>

          <div>
            <span>Total Inbox</span>
            <strong>{inboxMessages.length}</strong>
          </div>
        </div>

        <div className="am-stat-card">
          <div className="am-stat-icon am-stat-orange">
            <MailOpen size={21} />
          </div>

          <div>
            <span>Unread Messages</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div className="am-stat-card">
          <div className="am-stat-icon am-stat-green">
            <Send size={21} />
          </div>

          <div>
            <span>Sent Messages</span>
            <strong>{sentMessages.length}</strong>
          </div>
        </div>

        <div className="am-stat-card">
          <div className="am-stat-icon am-stat-purple">
            <MessageSquare size={21} />
          </div>

          <div>
            <span>Total Conversations</span>
            <strong>
              {inboxMessages.length + sentMessages.length}
            </strong>
          </div>
        </div>
      </div>

      <div className="am-workspace">
        <section className="am-list-panel">
          <div className="am-panel-heading">
            <div>
              <h2>Mailbox</h2>
              <p>Your messages and conversations</p>
            </div>
          </div>

          <div className="am-tabs">
            <button
              type="button"
              className={activeTab === "inbox" ? "active" : ""}
              onClick={() => handleTabChange("inbox")}
            >
              <Inbox size={17} />
              Inbox

              {unreadCount > 0 && (
                <span className="am-tab-badge">{unreadCount}</span>
              )}
            </button>

            <button
              type="button"
              className={activeTab === "sent" ? "active" : ""}
              onClick={() => handleTabChange("sent")}
            >
              <Send size={17} />
              Sent
            </button>
          </div>

          <div className="am-list-toolbar">
            <div className="am-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {activeTab === "inbox" && (
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter messages"
              >
                <option value="all">All messages</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            )}
          </div>

          <div className="am-list-count">
            {filteredMessages.length}{" "}
            {filteredMessages.length === 1 ? "message" : "messages"}
          </div>

          {renderMessageList()}
        </section>

        <section className="am-detail-panel">
          {!selectedMessage ? (
            <div className="am-detail-empty">
              <div className="am-detail-empty-icon">
                <MailOpen size={34} />
              </div>

              <h3>Select a message</h3>

              <p>
                Choose a message from your mailbox to view its full
                content and reply.
              </p>

              <button
                type="button"
                onClick={() => setShowCompose(true)}
              >
                <Plus size={17} />
                Compose a message
              </button>
            </div>
          ) : (
            <div className="am-detail-content">
              <div className="am-detail-toolbar">
                <div>
                  <span className="am-detail-label">
                    {activeTab === "inbox" ? "Received message" : "Sent message"}
                  </span>
                  <span className="am-detail-id">
                    Message #{selectedMessage.id}
                  </span>
                </div>

                <button
                  type="button"
                  className="am-close-detail"
                  onClick={() => setSelectedMessage(null)}
                  aria-label="Close message"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="am-detail-subject">
                <h2>{selectedMessage.subject || "No subject"}</h2>

                {activeTab === "inbox" && (
                  <span
                    className={
                      selectedMessage.is_read
                        ? "am-status-read"
                        : "am-status-unread"
                    }
                  >
                    {selectedMessage.is_read ? "Read" : "Unread"}
                  </span>
                )}
              </div>

              <div className="am-sender-card">
                <div className="am-avatar am-avatar-large">
                  {getInitials(
                    activeTab === "inbox"
                      ? selectedMessage.sender_name
                      : selectedMessage.recipient_name
                  )}
                </div>

                <div className="am-sender-info">
                  <strong>
                    {activeTab === "inbox"
                      ? selectedMessage.sender_name || "Unknown sender"
                      : "To: " +
                        (selectedMessage.recipient_name ||
                          selectedMessage.recipient_email ||
                          "Unknown recipient")}
                  </strong>

                  <span>
                    {activeTab === "inbox"
                      ? selectedMessage.sender_email
                      : selectedMessage.recipient_email}
                  </span>

                  <small>
                    <Clock size={13} />
                    {formatDate(selectedMessage.created_at)}
                  </small>
                </div>
              </div>

              <div className="am-message-body">
                {selectedMessage.content}
              </div>

              {selectedMessage.parent_message_id && (
                <div className="am-reply-reference">
                  <MessageSquare size={15} />
                  This message is part of a reply conversation.
                </div>
              )}

              {activeTab === "inbox" && (
                <form
                  className="am-reply-form"
                  onSubmit={handleReply}
                >
                  <div className="am-reply-heading">
                    <Reply size={18} />
                    <h3>Reply to this message</h3>
                  </div>

                  <textarea
                    value={replyContent}
                    onChange={(event) =>
                      setReplyContent(event.target.value)
                    }
                    placeholder="Write your reply here..."
                    rows={5}
                    maxLength={5000}
                    required
                  />

                  <div className="am-reply-footer">
                    <span>{replyContent.length}/5000 characters</span>

                    <button
                      type="submit"
                      disabled={replying || !replyContent.trim()}
                    >
                      {replying ? (
                        <>
                          <Loader2 size={17} className="am-spinner" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {showCompose && (
        <div
          className="am-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCompose();
            }
          }}
        >
          <div
            className="am-compose-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="am-compose-title"
          >
            <div className="am-modal-header">
              <div>
                <div className="am-modal-icon">
                  <Send size={20} />
                </div>

                <div>
                  <h2 id="am-compose-title">Compose Message</h2>
                  <p>Send a message to a CivicFix account.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCompose}
                disabled={sending}
                aria-label="Close compose window"
              >
                <X size={21} />
              </button>
            </div>

            <form
              className="am-compose-form"
              onSubmit={handleSendMessage}
            >
              <label htmlFor="am-recipient">
                Recipient Email <span>*</span>
              </label>

              <div className="am-input-with-icon">
                <User size={17} />

                <input
                  id="am-recipient"
                  type="email"
                  name="recipient_email"
                  placeholder="Enter registered CivicFix email"
                  value={composeForm.recipient_email}
                  onChange={handleComposeChange}
                  required
                />
              </div>

              <small className="am-field-hint">
                Enter the email address of an active CivicFix account.
              </small>

              <label htmlFor="am-subject">
                Subject <span>*</span>
              </label>

              <input
                id="am-subject"
                type="text"
                name="subject"
                placeholder="Enter message subject"
                value={composeForm.subject}
                onChange={handleComposeChange}
                maxLength={200}
                required
              />

              <div className="am-character-count">
                {composeForm.subject.length}/200 characters
              </div>

              <label htmlFor="am-content">
                Message <span>*</span>
              </label>

              <textarea
                id="am-content"
                name="content"
                placeholder="Write your message..."
                value={composeForm.content}
                onChange={handleComposeChange}
                rows={7}
                maxLength={5000}
                required
              />

              <div className="am-character-count">
                {composeForm.content.length}/5000 characters
              </div>

              <div className="am-compose-actions">
                <button
                  type="button"
                  className="am-cancel-btn"
                  onClick={closeCompose}
                  disabled={sending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="am-send-btn"
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <Loader2 size={17} className="am-spinner" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;