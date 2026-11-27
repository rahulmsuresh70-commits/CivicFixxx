
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  Clock3,
  Inbox,
  Mail,
  MailOpen,
  MessageCircle,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  User,
  X,
  AlertCircle,
} from 'lucide-react';

import api, { getApiErrorMessage } from '../../api/axios';
import './StaffMessages.css';

const EMPTY_FORM = {
  recipient_email: '',
  subject: '',
  content: '',
};

function getMessageList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  return [];
}

function getDisplayName(message, mode) {
  if (mode === 'sent') {
    return (
      message?.recipient_name ||
      message?.recipient_email ||
      'Recipient'
    );
  }

  return (
    message?.sender_name ||
    message?.sender_email ||
    'Sender'
  );
}

function getInitials(name = '') {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === 'string') return data;

  if (data && typeof data === 'object') {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return firstValue[0] || fallback;
    }

    if (typeof firstValue === 'string') {
      return firstValue;
    }
  }

  return getApiErrorMessage(error) || fallback;
}

export default function StaffMessages() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [search, setSearch] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [replyContent, setReplyContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentMessages =
    activeTab === 'inbox' ? inboxMessages : sentMessages;

  const unreadCount = useMemo(
    () => inboxMessages.filter((message) => !message.is_read).length,
    [inboxMessages]
  );

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return currentMessages;

    return currentMessages.filter((message) => {
      const searchable = [
        message.subject,
        message.content,
        message.sender_name,
        message.sender_email,
        message.recipient_name,
        message.recipient_email,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [currentMessages, search]);

  // Load inbox and sent messages
  const loadMessages = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');
    setSuccess('');

    try {
      const [inboxResponse, sentResponse] = await Promise.all([
        api.get('/messaging/internal/inbox/'),
        api.get('/messaging/internal/sent/'),
      ]);

      setInboxMessages(getMessageList(inboxResponse.data));
      setSentMessages(getMessageList(sentResponse.data));
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to load messages. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Open message details
  const openMessage = async (message) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.get(
        `/messaging/internal/${message.id}/`
      );

      const detail = response.data;

      setSelectedMessage(detail);

      // Mark received unread messages as read
      if (
        activeTab === 'inbox' &&
        !detail.is_read
      ) {
        try {
          const readResponse = await api.post(
            `/messaging/internal/${detail.id}/read/`
          );

          setSelectedMessage(readResponse.data);

          setInboxMessages((previous) =>
            previous.map((item) =>
              item.id === detail.id
                ? { ...item, is_read: true }
                : item
            )
          );
        } catch (readError) {
          // Keep the message open even if read status update fails.
          setError(
            getApiErrorMessage(readError) ||
            'Message opened, but its read status could not be updated.'
          );
        }
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
        'Unable to open this message.'
      );
    }
  };

  // Compose form
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Send a new internal message
  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (sending) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        '/messaging/internal/send/',
        {
          recipient_email: form.recipient_email.trim(),
          subject: form.subject.trim(),
          content: form.content.trim(),
        }
      );

      setSentMessages((previous) => [
        response.data,
        ...previous,
      ]);

      setForm(EMPTY_FORM);
      setComposeOpen(false);
      setActiveTab('sent');
      setSuccess('Message sent successfully.');
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to send the message.')
      );
    } finally {
      setSending(false);
    }
  };

  // Reply to a received message
  const handleReply = async (event) => {
    event.preventDefault();

    if (!selectedMessage || replying) return;

    if (!replyContent.trim()) {
      setError('Please enter your reply.');
      return;
    }

    setReplying(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        `/messaging/internal/${selectedMessage.id}/reply/`,
        {
          content: replyContent.trim(),
        }
      );

      setSentMessages((previous) => [
        response.data,
        ...previous,
      ]);

      setReplyContent('');
      setSuccess('Reply sent successfully.');
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to send your reply.')
      );
    } finally {
      setReplying(false);
    }
  };

  const closeDetails = () => {
    setSelectedMessage(null);
    setReplyContent('');
    setError('');
    setSuccess('');
  };

  const openCompose = () => {
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
    setComposeOpen(true);
  };

  return (
    <section className="sm-page">

      {/* Page Heading */}
      <div className="sm-hero">
        <div>
          <span className="sm-eyebrow">
            STAFF WORKSPACE
          </span>

          <h1>Messages</h1>

          <p>
            Communicate with other CivicFix members
            and manage your conversations.
          </p>
        </div>

        <div className="sm-hero-actions">
          <div className="sm-hero-icon">
            <MessageCircle size={27} />
          </div>

          <button
            type="button"
            className="sm-compose-button"
            onClick={openCompose}
          >
            <Plus size={17} />
            Compose Message
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="sm-alert sm-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="sm-alert sm-success" role="status">
          <CheckCheck size={17} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="sm-stats">

        <article className="sm-stat-card">
          <span className="sm-stat-icon sm-stat-inbox">
            <Inbox size={20} />
          </span>

          <div>
            <span>Inbox Messages</span>
            <strong>{inboxMessages.length}</strong>
            <small>Messages received</small>
          </div>
        </article>

        <article className="sm-stat-card">
          <span className="sm-stat-icon sm-stat-unread">
            <Mail size={20} />
          </span>

          <div>
            <span>Unread Messages</span>
            <strong>{unreadCount}</strong>
            <small>Awaiting your attention</small>
          </div>
        </article>

        <article className="sm-stat-card">
          <span className="sm-stat-icon sm-stat-sent">
            <Send size={20} />
          </span>

          <div>
            <span>Sent Messages</span>
            <strong>{sentMessages.length}</strong>
            <small>Messages you sent</small>
          </div>
        </article>

      </div>

      {/* Main Messages Panel */}
      <div className="sm-panel">

        <div className="sm-panel-header">
          <div>
            <h2>Communication Center</h2>
            <p>Manage your inbox and sent messages.</p>
          </div>

          <button
            type="button"
            className="sm-refresh-button"
            onClick={() => loadMessages(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'sm-spinning' : ''}
            />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="sm-toolbar">

          <div className="sm-tabs">
            <button
              type="button"
              className={activeTab === 'inbox' ? 'active' : ''}
              onClick={() => {
                setActiveTab('inbox');
                setSelectedMessage(null);
                setSearch('');
                setError('');
                setSuccess('');
              }}
            >
              <Inbox size={16} />
              Inbox

              {unreadCount > 0 && (
                <span className="sm-tab-count">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className={activeTab === 'sent' ? 'active' : ''}
              onClick={() => {
                setActiveTab('sent');
                setSelectedMessage(null);
                setSearch('');
                setError('');
                setSuccess('');
              }}
            >
              <Send size={15} />
              Sent
            </button>
          </div>

          <label className="sm-search">
            <Search size={16} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages..."
            />
          </label>

        </div>

        {/* Message Details */}
        {selectedMessage ? (
          <div className="sm-detail">

            <div className="sm-detail-header">
              <button
                type="button"
                className="sm-back-button"
                onClick={closeDetails}
              >
                <ArrowLeft size={16} />
                Back to {activeTab === 'inbox' ? 'Inbox' : 'Sent'}
              </button>

              <span className="sm-detail-status">
                {selectedMessage.is_read ? (
                  <>
                    <MailOpen size={14} />
                    Read
                  </>
                ) : (
                  <>
                    <Mail size={14} />
                    Unread
                  </>
                )}
              </span>
            </div>

            <div className="sm-detail-content">

              <span className="sm-detail-label">
                MESSAGE DETAILS
              </span>

              <h2>
                {selectedMessage.subject}
              </h2>

              <div className="sm-sender-info">

                <div className="sm-avatar">
                  {getInitials(
                    getDisplayName(selectedMessage, activeTab)
                  )}
                </div>

                <div className="sm-sender-text">
                  <strong>
                    {activeTab === 'inbox'
                      ? selectedMessage.sender_name
                      : selectedMessage.recipient_name}
                  </strong>

                  <span>
                    {activeTab === 'inbox'
                      ? selectedMessage.sender_email
                      : selectedMessage.recipient_email}
                  </span>
                </div>

                <div className="sm-message-date">
                  <Clock3 size={13} />
                  {formatDate(selectedMessage.created_at)}
                </div>

              </div>

              <div className="sm-message-body">
                {selectedMessage.content}
              </div>

              {selectedMessage.parent_message_id && (
                <div className="sm-reply-reference">
                  <Reply size={14} />
                  This message is a reply to message #
                  {selectedMessage.parent_message_id}.
                </div>
              )}

              {/* Reply Form: only for inbox messages */}
              {activeTab === 'inbox' && (
                <form
                  className="sm-reply-form"
                  onSubmit={handleReply}
                >
                  <div className="sm-reply-heading">
                    <Reply size={17} />
                    <h3>Reply to this message</h3>
                  </div>

                  <textarea
                    value={replyContent}
                    onChange={(event) =>
                      setReplyContent(event.target.value)
                    }
                    placeholder="Write your reply..."
                    maxLength={5000}
                    rows={5}
                    required
                  />

                  <div className="sm-reply-footer">
                    <span>
                      {replyContent.length}/5000 characters
                    </span>

                    <button
                      type="submit"
                      disabled={
                        replying || !replyContent.trim()
                      }
                    >
                      <Send size={15} />
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        ) : (

          /* Message List */
          <div className="sm-message-list">

            {loading ? (
              <div className="sm-empty">
                <span>
                  <Mail size={25} />
                </span>
                <h3>Loading messages...</h3>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="sm-empty">
                <span>
                  {activeTab === 'inbox' ? (
                    <Inbox size={25} />
                  ) : (
                    <Archive size={25} />
                  )}
                </span>

                <h3>
                  {search
                    ? 'No matching messages'
                    : activeTab === 'inbox'
                      ? 'Your inbox is empty'
                      : 'No sent messages yet'}
                </h3>

                <p>
                  {search
                    ? 'Try another search term.'
                    : activeTab === 'inbox'
                      ? 'Messages sent to your account will appear here.'
                      : 'Messages you send will appear here.'}
                </p>
              </div>
            ) : (
              filteredMessages.map((message) => {
                const displayName = getDisplayName(
                  message,
                  activeTab
                );

                return (
                  <button
                    type="button"
                    className={`sm-message-row ${
                      !message.is_read && activeTab === 'inbox'
                        ? 'sm-unread'
                        : ''
                    }`}
                    key={message.id}
                    onClick={() => openMessage(message)}
                  >

                    <div className="sm-avatar">
                      {getInitials(displayName)}
                    </div>

                    <div className="sm-row-main">

                      <div className="sm-row-top">
                        <strong>{displayName}</strong>

                        <span className="sm-row-date">
                          {formatDate(message.created_at)}
                        </span>
                      </div>

                      <div className="sm-row-subject">
                        {message.subject || 'No subject'}
                      </div>

                      <p>
                        {message.content}
                      </p>

                    </div>

                    <div className="sm-row-indicator">
                      {activeTab === 'inbox' && !message.is_read ? (
                        <span className="sm-unread-dot" />
                      ) : (
                        <CheckCheck size={15} />
                      )}
                    </div>

                  </button>
                );
              })
            )}

          </div>
        )}

      </div>

      {/* Compose Message Modal */}
      {composeOpen && (
        <div
          className="sm-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setComposeOpen(false);
            }
          }}
        >
          <div
            className="sm-compose-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sm-compose-title"
          >

            <div className="sm-modal-header">
              <div>
                <span>NEW CONVERSATION</span>
                <h2 id="sm-compose-title">
                  Compose Message
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close compose window"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSendMessage}>

              <div className="sm-form-group">
                <label htmlFor="sm-recipient">
                  Recipient Email
                </label>

                <div className="sm-input-wrap">
                  <User size={16} />

                  <input
                    id="sm-recipient"
                    type="email"
                    name="recipient_email"
                    value={form.recipient_email}
                    onChange={handleFormChange}
                    placeholder="Enter registered CivicFix email"
                    required
                  />
                </div>

                <small>
                  Enter the email address of an active CivicFix account.
                </small>
              </div>

              <div className="sm-form-group">
                <label htmlFor="sm-subject">
                  Subject
                </label>

                <input
                  id="sm-subject"
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleFormChange}
                  placeholder="Enter message subject"
                  maxLength={200}
                  required
                />
              </div>

              <div className="sm-form-group">
                <label htmlFor="sm-content">
                  Message
                </label>

                <textarea
                  id="sm-content"
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  placeholder="Write your message here..."
                  maxLength={5000}
                  rows={7}
                  required
                />

                <small className="sm-character-count">
                  {form.content.length}/5000 characters
                </small>
              </div>

              <div className="sm-modal-actions">
                <button
                  type="button"
                  className="sm-cancel-button"
                  onClick={() => setComposeOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sm-send-button"
                  disabled={
                    sending ||
                    !form.recipient_email.trim() ||
                    !form.subject.trim() ||
                    !form.content.trim()
                  }
                >
                  <Send size={15} />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </section>
  );
}
