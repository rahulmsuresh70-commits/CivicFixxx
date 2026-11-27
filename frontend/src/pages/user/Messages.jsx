
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  LoaderCircle,
  Mail,
  MailOpen,
  MessageSquare,
  RefreshCw,
  Reply,
  Send,
  SquarePen,
} from 'lucide-react';
import { Clock3 } from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import './Messages.css';

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getInitials(name) {
  return (
    String(name || 'C')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'C'
  );
}

function getErrorMessage(error) {
  if (typeof getApiErrorMessage === 'function') {
    return getApiErrorMessage(error);
  }

  return error?.message || 'Something went wrong. Please try again.';
}

export default function Messages() {
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [replying, setReplying] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);

  const [composeForm, setComposeForm] = useState({
    recipient_email: '',
    subject: '',
    content: '',
  });

  const [replyContent, setReplyContent] = useState('');

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );
    } catch {
      return null;
    }
  }, []);

  const currentEmail = String(currentUser?.email || '').toLowerCase();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [inboxResponse, sentResponse] = await Promise.all([
        api.get('/messaging/internal/inbox/'),
        api.get('/messaging/internal/sent/'),
      ]);

      if (
        !Array.isArray(inboxResponse.data) ||
        !Array.isArray(sentResponse.data)
      ) {
        throw new Error('The server returned an unexpected message format.');
      }

      setInbox(inboxResponse.data);
      setSent(sentResponse.data);

      setSelectedMessage((previous) => {
        if (!previous) return null;

        const source = previous._folder === 'sent'
          ? sentResponse.data
          : inboxResponse.data;

        const updated = source.find((item) => item.id === previous.id);

        return updated
          ? { ...updated, _folder: previous._folder }
          : null;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const messages = activeTab === 'inbox' ? inbox : sent;

  const unreadCount = useMemo(
    () => inbox.filter((message) => !message.is_read).length,
    [inbox]
  );

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [messages]
  );

  const selectMessage = async (message, folder = activeTab) => {
    setError('');
    setSuccess('');
    setReplyOpen(false);
    setReplyContent('');

    const selected = { ...message, _folder: folder };
    setSelectedMessage(selected);
    setComposeOpen(false);

    if (folder === 'inbox' && !message.is_read) {
      setMarkingRead(true);

      try {
        const response = await api.post(
          `/messaging/internal/${message.id}/read/`
        );

        const updated = {
          ...message,
          ...response.data,
          _folder: folder,
        };

        setInbox((current) =>
          current.map((item) =>
            item.id === message.id ? response.data : item
          )
        );

        setSelectedMessage(updated);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setMarkingRead(false);
      }
    }
  };

  const updateComposeField = (event) => {
    const { name, value } = event.target;

    setComposeForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!composeForm.recipient_email.trim()) {
      setError('Enter the recipient email address.');
      return;
    }

    if (
      composeForm.recipient_email.trim().toLowerCase() === currentEmail
    ) {
      setError('You cannot send a message to yourself.');
      return;
    }

    if (!composeForm.subject.trim()) {
      setError('Enter a subject.');
      return;
    }

    if (!composeForm.content.trim()) {
      setError('Enter your message.');
      return;
    }

    setSending(true);

    try {
      const response = await api.post('/messaging/internal/send/', {
        recipient_email: composeForm.recipient_email.trim(),
        subject: composeForm.subject.trim(),
        content: composeForm.content.trim(),
      });

      const sentMessage = response.data;

      setSent((current) => [sentMessage, ...current]);
      setActiveTab('sent');
      setSelectedMessage({ ...sentMessage, _folder: 'sent' });
      setComposeForm({
        recipient_email: '',
        subject: '',
        content: '',
      });
      setComposeOpen(false);
      setSuccess('Your message was sent successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMessage || !replyContent.trim()) {
      setError('Enter a reply before sending.');
      return;
    }

    if (selectedMessage._folder !== 'inbox') {
      setError('Replies can only be sent to received messages.');
      return;
    }

    setReplying(true);

    try {
      const response = await api.post(
        `/messaging/internal/${selectedMessage.id}/reply/`,
        { content: replyContent.trim() }
      );

      const reply = response.data;

      setSent((current) => [reply, ...current]);
      setReplyContent('');
      setReplyOpen(false);
      setSuccess('Your reply was sent successfully.');

      await fetchMessages();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReplying(false);
    }
  };

  const openCompose = () => {
    setError('');
    setSuccess('');
    setSelectedMessage(null);
    setReplyOpen(false);
    setComposeOpen(true);
  };

  const closeDetail = () => {
    setSelectedMessage(null);
    setReplyOpen(false);
    setReplyContent('');
  };

  const otherPersonName = (message, folder) =>
    folder === 'inbox'
      ? message.sender_name || message.sender_email || 'Unknown sender'
      : message.recipient_name || message.recipient_email || 'Unknown recipient';

  const otherPersonEmail = (message, folder) =>
    folder === 'inbox'
      ? message.sender_email || ''
      : message.recipient_email || '';

  return (
    <main className="cf-messages-page">
      <div className="cf-messages-container">
        <header className="cf-messages-header">
          <div>
            <div className="cf-messages-eyebrow">
              <MessageSquare size={16} />
              Citizen dashboard
            </div>

            <h1>Messages</h1>

            <p>
              Communicate with registered CivicFix users and manage your
              conversations in one place.
            </p>
          </div>

          <div className="cf-messages-header-actions">
            <button
              type="button"
              className="cf-messages-refresh"
              onClick={fetchMessages}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? 'cf-messages-spin' : ''}
              />
              Refresh
            </button>

            <button
              type="button"
              className="cf-messages-primary"
              onClick={openCompose}
            >
              <SquarePen size={17} />
              Compose message
            </button>
          </div>
        </header>

        <section className="cf-messages-summary">
          <article className="cf-messages-summary-card">
            <div className="cf-messages-summary-icon">
              <Inbox size={22} />
            </div>
            <div>
              <span>Inbox</span>
              <strong>{inbox.length}</strong>
            </div>
          </article>

          <article className="cf-messages-summary-card">
            <div className="cf-messages-summary-icon sent">
              <Send size={22} />
            </div>
            <div>
              <span>Sent messages</span>
              <strong>{sent.length}</strong>
            </div>
          </article>

          <article className="cf-messages-summary-card">
            <div className="cf-messages-summary-icon unread">
              <Mail size={22} />
            </div>
            <div>
              <span>Unread messages</span>
              <strong>{unreadCount}</strong>
            </div>
          </article>
        </section>

        {error && (
          <div className="cf-messages-alert error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="cf-messages-alert success" role="status">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess('')}>
              Dismiss
            </button>
          </div>
        )}

        <section className="cf-messages-workspace">
          <aside className="cf-messages-list-panel">
            <div className="cf-messages-tabs">
              <button
                type="button"
                className={activeTab === 'inbox' ? 'active' : ''}
                onClick={() => {
                  setActiveTab('inbox');
                  closeDetail();
                  setComposeOpen(false);
                }}
              >
                <Inbox size={16} />
                Inbox
                {unreadCount > 0 && (
                  <span className="cf-messages-tab-count">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={activeTab === 'sent' ? 'active' : ''}
                onClick={() => {
                  setActiveTab('sent');
                  closeDetail();
                  setComposeOpen(false);
                }}
              >
                <Send size={16} />
                Sent
              </button>
            </div>

            <div className="cf-messages-list-heading">
              <h2>{activeTab === 'inbox' ? 'Received' : 'Sent messages'}</h2>
              <span>{messages.length}</span>
            </div>

            {loading ? (
              <div className="cf-messages-list-state">
                <LoaderCircle className="cf-messages-spin" size={24} />
                <span>Loading messages...</span>
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="cf-messages-list-state">
                <MailOpen size={28} />
                <strong>No messages yet</strong>
                <span>
                  {activeTab === 'inbox'
                    ? 'Messages you receive will appear here.'
                    : 'Messages you send will appear here.'}
                </span>
              </div>
            ) : (
              <div className="cf-messages-list">
                {sortedMessages.map((message) => {
                  const selected =
                    selectedMessage?.id === message.id &&
                    selectedMessage?._folder === activeTab;

                  return (
                    <button
                      key={message.id}
                      type="button"
                      className={`cf-messages-list-item ${
                        selected ? 'selected' : ''
                      } ${!message.is_read && activeTab === 'inbox' ? 'unread' : ''}`}
                      onClick={() => selectMessage(message, activeTab)}
                    >
                      <span className="cf-messages-avatar">
                        {getInitials(otherPersonName(message, activeTab))}
                      </span>

                      <span className="cf-messages-item-body">
                        <span className="cf-messages-item-top">
                          <strong>
                            {otherPersonName(message, activeTab)}
                          </strong>
                          {!message.is_read && activeTab === 'inbox' && (
                            <span className="cf-messages-unread-dot" />
                          )}
                        </span>

                        <span className="cf-messages-item-subject">
                          {message.subject}
                        </span>

                        <span className="cf-messages-item-preview">
                          {message.content}
                        </span>

                        <span className="cf-messages-item-date">
                          {formatDate(message.created_at)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="cf-messages-detail-panel">
            {composeOpen ? (
              <div className="cf-messages-compose">
                <div className="cf-messages-detail-header">
                  <div className="cf-messages-detail-title-icon">
                    <SquarePen size={20} />
                  </div>
                  <div>
                    <h2>Compose message</h2>
                    <p>Send a message to a registered CivicFix user.</p>
                  </div>
                </div>

                <form
                  className="cf-messages-form"
                  onSubmit={sendMessage}
                >
                  <label>
                    Recipient email
                    <input
                      type="email"
                      name="recipient_email"
                      value={composeForm.recipient_email}
                      onChange={updateComposeField}
                      placeholder="recipient@example.com"
                      maxLength={254}
                      required
                    />
                  </label>

                  <label>
                    Subject
                    <input
                      type="text"
                      name="subject"
                      value={composeForm.subject}
                      onChange={updateComposeField}
                      placeholder="Enter message subject"
                      maxLength={200}
                      required
                    />
                  </label>

                  <label>
                    Message
                    <textarea
                      name="content"
                      value={composeForm.content}
                      onChange={updateComposeField}
                      placeholder="Write your message here..."
                      rows={8}
                      maxLength={5000}
                      required
                    />
                    <small>{composeForm.content.length}/5000 characters</small>
                  </label>

                  <div className="cf-messages-form-actions">
                    <button
                      type="button"
                      className="cf-messages-secondary"
                      onClick={() => setComposeOpen(false)}
                      disabled={sending}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="cf-messages-primary"
                      disabled={sending}
                    >
                      {sending ? (
                        <LoaderCircle size={17} className="cf-messages-spin" />
                      ) : (
                        <Send size={17} />
                      )}
                      {sending ? 'Sending...' : 'Send message'}
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedMessage ? (
              <div className="cf-messages-detail">
                <div className="cf-messages-detail-header">
                  <button
                    type="button"
                    className="cf-messages-back"
                    onClick={closeDetail}
                    aria-label="Back to message list"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="cf-messages-detail-title-icon">
                    <MailOpen size={20} />
                  </div>

                  <div className="cf-messages-detail-heading">
                    <h2>{selectedMessage.subject}</h2>
                    <p>
                      {selectedMessage._folder === 'inbox'
                        ? 'Message received'
                        : 'Message sent'}
                    </p>
                  </div>

                  {selectedMessage.is_read && (
                    <span className="cf-messages-read-label">
                      <CheckCheck size={15} />
                      Read
                    </span>
                  )}
                </div>

                <div className="cf-messages-detail-content">
                  <div className="cf-messages-sender-card">
                    <span className="cf-messages-avatar large">
                      {getInitials(
                        otherPersonName(
                          selectedMessage,
                          selectedMessage._folder
                        )
                      )}
                    </span>

                    <div className="cf-messages-sender-info">
                      <strong>
                        {otherPersonName(
                          selectedMessage,
                          selectedMessage._folder
                        )}
                      </strong>

                      <span>
                        {otherPersonEmail(
                          selectedMessage,
                          selectedMessage._folder
                        )}
                      </span>

                      <small>
                        {selectedMessage._folder === 'inbox'
                          ? 'To you'
                          : `Sent ${formatDate(selectedMessage.created_at)}`}
                      </small>
                    </div>
                  </div>

                  <div className="cf-messages-message-body">
                    <p>{selectedMessage.content}</p>
                  </div>

                  <div className="cf-messages-message-meta">
                    <Clock3 size={15} />
                    {formatDate(selectedMessage.created_at)}
                    {markingRead && (
                      <span>Updating read status...</span>
                    )}
                  </div>

                  {selectedMessage.parent_message_id && (
                    <p className="cf-messages-thread-note">
                      <Reply size={15} />
                      This message is part of a reply thread.
                    </p>
                  )}

                  {selectedMessage._folder === 'inbox' && (
                    <div className="cf-messages-reply-area">
                      {!replyOpen ? (
                        <button
                          type="button"
                          className="cf-messages-primary"
                          onClick={() => {
                            setError('');
                            setReplyOpen(true);
                          }}
                        >
                          <Reply size={17} />
                          Reply
                        </button>
                      ) : (
                        <form
                          className="cf-messages-form cf-messages-reply-form"
                          onSubmit={sendReply}
                        >
                          <label>
                            Your reply
                            <textarea
                              value={replyContent}
                              onChange={(event) =>
                                setReplyContent(event.target.value)
                              }
                              placeholder="Write your reply..."
                              rows={5}
                              maxLength={5000}
                              required
                            />
                            <small>
                              {replyContent.length}/5000 characters
                            </small>
                          </label>

                          <div className="cf-messages-form-actions">
                            <button
                              type="button"
                              className="cf-messages-secondary"
                              onClick={() => setReplyOpen(false)}
                              disabled={replying}
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              className="cf-messages-primary"
                              disabled={replying}
                            >
                              {replying ? (
                                <LoaderCircle
                                  size={17}
                                  className="cf-messages-spin"
                                />
                              ) : (
                                <Send size={17} />
                              )}
                              {replying ? 'Sending...' : 'Send reply'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="cf-messages-welcome">
                <div className="cf-messages-welcome-icon">
                  <MessageSquare size={34} />
                </div>

                <h2>Your messages</h2>

                <p>
                  Select a message to read it, or compose a new message
                  to contact another registered CivicFix user.
                </p>

                <button
                  type="button"
                  className="cf-messages-primary"
                  onClick={openCompose}
                >
                  <SquarePen size={17} />
                  Compose message
                </button>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
