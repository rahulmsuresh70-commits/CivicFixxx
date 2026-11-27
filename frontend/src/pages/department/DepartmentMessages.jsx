import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, RotateCcw, Bell, MessageSquare,
  Settings, LogOut, Search, Menu, X, RefreshCw, ChevronRight,
  ShieldCheck, Send, UserRound, Clock3, MessageCircle, AlertCircle,
  CheckCircle2, Inbox, ArrowLeft, Paperclip, MoreVertical,
  Mail, Plus, Edit3, Reply, UserPlus
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../api/axios';
import './DepartmentMessages.css';

/*
 * Report conversation API:
 * The backend view contract is GET/POST for a report's messages, with
 * POST body { content }. Confirm the URL prefix in messaging/urls.py
 * and config/urls.py. This constant is isolated so it can be corrected
 * without changing the page workflow.
 */
const reportMessagesUrl = (reportId) => `/messaging/reports/${reportId}/messages/`;
const internalInboxUrl = '/messaging/internal/inbox/';
const internalSentUrl = '/messaging/internal/sent/';
const internalSendUrl = '/messaging/internal/send/';
const internalDetailUrl = (messageId) => `/messaging/internal/${messageId}/`;
const internalReadUrl = (messageId) => `/messaging/internal/${messageId}/read/`;
const internalReplyUrl = (messageId) => `/messaging/internal/${messageId}/reply/`;

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/department/dashboard' },
  { label: 'Complaints', icon: FileText, path: '/department/complaints' },
  { label: 'Staff Management', icon: Users, path: '/department/staff' },
  { label: 'Staff Work Tracking', icon: Users, path: '/department/staff-work-tracking' },
  { label: 'Reopened Complaints', icon: RotateCcw, path: '/department/reopened' },
  { label: 'Notifications', icon: Bell, path: '/department/notifications' },
  { label: 'Messages', icon: MessageSquare, path: '/department/messages' },
  { label: 'Department Profile', icon: Settings, path: '/department/profile' },
  
];

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.reports)) return data.reports;
  return [];
}

function dateLabel(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function senderLabel(message) {
  if (message?.sender_email) return message.sender_email;
  if (message?.sender_details?.email) return message.sender_details.email;
  if (message?.sender_name) return message.sender_name;
  return `User #${message?.sender ?? '—'}`;
}

export default function DepartmentMessages() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileConversation, setMobileConversation] = useState(false);

  // Direct internal mailbox is separate from complaint-linked conversations.
  const [messageSection, setMessageSection] = useState('conversations');
  const [mailboxMessages, setMailboxMessages] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [mailboxSearch, setMailboxSearch] = useState('');
  const [composeForm, setComposeForm] = useState({
    recipient_email: '',
    subject: '',
    content: '',
  });
  const [mailSending, setMailSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('civicfix_user') || 'null');
      const token = localStorage.getItem('civicfix_access_token');
      if (!token || !storedUser || String(storedUser.role || '').toLowerCase() !== 'manager') {
        navigate('/department/login', { replace: true });
        return;
      }
      setUser(storedUser);
    } catch {
      navigate('/department/login', { replace: true });
    }
  }, [navigate]);

  const loadReports = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      // Manager endpoint is department-scoped by the backend.
      const response = await api.get('/reports/manager/');
      const rows = getRows(response.data);
      setReports(rows);
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to load department complaints.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadReports();
  }, [user, loadReports]);

  const loadMailbox = useCallback(async (section = messageSection) => {
    if (section !== 'inbox' && section !== 'sent') return;
    setMailboxLoading(true);
    setError('');
    try {
      const endpoint = section === 'inbox' ? internalInboxUrl : internalSentUrl;
      const response = await api.get(endpoint);
      setMailboxMessages(getRows(response.data));
      setSelectedMail(null);
    } catch (err) {
      setMailboxMessages([]);
      setError(getApiErrorMessage(err) || `Unable to load ${section} messages.`);
    } finally {
      setMailboxLoading(false);
    }
  }, [messageSection]);

  const changeMessageSection = (section) => {
    setMessageSection(section);
    setError('');
    setSuccess('');
    setSelectedMail(null);
    if (section === 'inbox' || section === 'sent') loadMailbox(section);
    if (section === 'conversations') setMobileConversation(false);
  };

  const openInternalMessage = async (message, section = messageSection) => {
    setMailboxLoading(true);
    setError('');
    try {
      const response = await api.get(internalDetailUrl(message.id));
      let detail = response.data;
      const isRecipient = String(detail.recipient) === String(user?.id);
      if (section === 'inbox' && isRecipient && !detail.is_read) {
        const readResponse = await api.post(internalReadUrl(message.id));
        detail = readResponse.data;
        setMailboxMessages((current) =>
          current.map((item) => String(item.id) === String(message.id)
            ? { ...item, ...detail, is_read: true }
            : item)
        );
      }
      setSelectedMail(detail);
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to open this message.');
    } finally {
      setMailboxLoading(false);
    }
  };

  const sendInternalMessage = async (event) => {
    event.preventDefault();
    if (mailSending) return;
    setMailSending(true);
    setError('');
    setSuccess('');
    try {
      await api.post(internalSendUrl, {
        recipient_email: composeForm.recipient_email.trim(),
        subject: composeForm.subject.trim(),
        content: composeForm.content.trim(),
      });
      setComposeForm({ recipient_email: '', subject: '', content: '' });
      setSuccess('Message sent successfully.');
      setMessageSection('sent');
      await loadMailbox('sent');
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to send this message.');
    } finally {
      setMailSending(false);
    }
  };

  const replyToInternalMessage = async (event) => {
    event.preventDefault();
    if (!selectedMail || !replyText.trim() || replySending) return;
    setReplySending(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post(internalReplyUrl(selectedMail.id), {
        content: replyText.trim(),
      });
      setReplyText('');
      setSuccess('Reply sent successfully.');
      setSelectedMail(response.data);
      await loadMailbox('sent');
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to send your reply.');
    } finally {
      setReplySending(false);
    }
  };

  const filteredMailboxMessages = useMemo(() => {
    const q = mailboxSearch.trim().toLowerCase();
    if (!q) return mailboxMessages;
    return mailboxMessages.filter((item) =>
      [item.subject, item.content, item.sender_email, item.recipient_email,
       item.sender_name, item.recipient_name].join(' ').toLowerCase().includes(q)
    );
  }, [mailboxMessages, mailboxSearch]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const searchable = [
        report.id, report.title, report.category, report.location,
        report.citizen_email, report.citizen_name, report.status,
      ].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    });
  }, [reports, search]);

  const loadConversation = async (report) => {
    setSelectedReport(report);
    setMobileConversation(true);
    setConversationLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.get(reportMessagesUrl(report.id));
      setMessages(getRows(response.data));
    } catch (err) {
      setMessages([]);
      setError(getApiErrorMessage(err) || 'Unable to load this complaint conversation. Check the messaging API URL and your access permissions.');
    } finally {
      setConversationLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedReport || !messageText.trim() || sending) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await api.post(reportMessagesUrl(selectedReport.id), { content: messageText.trim() });
      setMessageText('');
      const response = await api.get(reportMessagesUrl(selectedReport.id));
      setMessages(getRows(response.data));
      setSuccess('Message sent successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');
    navigate('/department/login', { replace: true });
  };

  const managerName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Department Manager';
  const unreadCount = messages.filter((message) => !message.is_read && String(message.sender) !== String(user?.id)).length;

  return (
    <div className="department-dashboard dm-page">
      {sidebarOpen && <div className="dd-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`dd-sidebar ${sidebarOpen ? 'dd-sidebar-open' : ''}`}>
        <div className="dd-brand">
          <div className="dd-brand-icon"><ShieldCheck size={25} /></div>
          <div className="dd-brand-text"><h2>Civic<span>Fix</span></h2><p>DEPARTMENT PORTAL</p></div>
          <button className="dd-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="dd-sidebar-section">
          <span className="dd-sidebar-label">WORKSPACE</span>
          <nav className="dd-navigation">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = path === '/department/messages';
              return <button key={path} className={`dd-nav-item ${active ? 'active' : ''}`} onClick={() => { navigate(path); setSidebarOpen(false); }}>
                <Icon size={19} /><span>{label}</span>{active && <span className="dd-nav-active-indicator" />}
              </button>;
            })}
          </nav>
        </div>
        <div className="dd-sidebar-bottom">
          <div className="dd-sidebar-help"><div className="dd-help-icon"><ShieldCheck size={19} /></div><strong>Department Portal</strong><p>Manage civic services in one place.</p></div>
          <button className="dd-logout-button" onClick={logout}><LogOut size={19} /><span>Logout</span></button>
        </div>
      </aside>

      <main className="dd-main">
        <header className="dd-header">
          <div className="dd-header-left">
            <button className="dd-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div><div className="dd-breadcrumb">Department Portal <ChevronRight size={14} /> Messages</div><h1>Messages</h1></div>
          </div>
          <div className="dd-header-right">
            <button className="dd-refresh-button" onClick={() => messageSection === 'inbox' || messageSection === 'sent' ? loadMailbox(messageSection) : selectedReport ? loadConversation(selectedReport) : loadReports(true)} disabled={refreshing || conversationLoading} title="Refresh"><RefreshCw size={17} className={refreshing || conversationLoading ? 'dm-spin' : ''} /></button>
            <div className="dd-header-divider" />
            <div className="dd-user-info"><div className="dd-user-avatar">{managerName.charAt(0).toUpperCase()}</div><div className="dd-user-details"><strong>{managerName}</strong><span>Department Manager</span></div></div>
          </div>
        </header>

        <div className="dd-content dm-content">
          <section className="dm-hero">
            <div><span className="dm-eyebrow">DEPARTMENT WORKSPACE</span><h2>Complaint conversations</h2><p>Communicate with citizens and assigned staff through conversations linked to complaints you are authorized to access.</p></div>
            <div className="dm-hero-icon"><MessageCircle size={38} /></div>
          </section>

          {error && <div className="dm-alert dm-error"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
          {success && <div className="dm-alert dm-success"><CheckCircle2 size={18} /><span>{success}</span><button onClick={() => setSuccess('')} aria-label="Dismiss">×</button></div>}

          <div className="dm-section-tabs" role="tablist" aria-label="Message sections">
            <button className={messageSection === 'inbox' ? 'active' : ''} onClick={() => changeMessageSection('inbox')}>
              <Inbox size={17} /> Inbox
            </button>
            <button className={messageSection === 'sent' ? 'active' : ''} onClick={() => changeMessageSection('sent')}>
              <Send size={16} /> Sent
            </button>
            <button className={messageSection === 'compose' ? 'active' : ''} onClick={() => changeMessageSection('compose')}>
              <Edit3 size={16} /> Compose
            </button>
            <button className={messageSection === 'conversations' ? 'active' : ''} onClick={() => changeMessageSection('conversations')}>
              <MessageSquare size={17} /> Complaint Conversations
            </button>
          </div>

          {messageSection === 'conversations' && (
          <section className="dm-workspace">
            <aside className={`dm-conversation-list ${mobileConversation ? 'dm-hide-mobile' : ''}`}>
              <div className="dm-list-heading"><div><h3>Conversations</h3><p>{reports.length} department complaints</p></div><span><MessageSquare size={17} /></span></div>
              <label className="dm-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search complaints..." /></label>
              {loading ? <div className="dm-list-state"><RefreshCw size={21} className="dm-spin" /> Loading conversations...</div> :
                filteredReports.length === 0 ? <div className="dm-list-empty"><Inbox size={27} /><strong>No complaints found</strong><p>Department complaint conversations will appear here.</p></div> :
                <div className="dm-report-list">
                  {filteredReports.map((report) => {
                    const active = String(selectedReport?.id) === String(report.id);
                    return <button key={report.id} className={`dm-report-row ${active ? 'selected' : ''}`} onClick={() => loadConversation(report)}>
                      <div className="dm-report-avatar"><FileText size={18} /></div>
                      <div className="dm-report-copy"><strong>{report.title || `Complaint #${report.id}`}</strong><span>#{report.id} · {report.category || 'Complaint'}</span><small>{report.location || 'Location not provided'}</small></div>
                      <span className={`dm-status dm-status-${String(report.status || '').toLowerCase()}`}>{String(report.status || 'unknown').replaceAll('_', ' ')}</span>
                    </button>;
                  })}
                </div>}
            </aside>

            <section className={`dm-chat-panel ${mobileConversation ? 'dm-show-mobile' : ''}`}>
              {!selectedReport ? <div className="dm-chat-placeholder"><div><MessageSquare size={34} /></div><h3>Select a complaint</h3><p>Choose a complaint from the list to open its authorized conversation.</p></div> :
                <>
                  <div className="dm-chat-header">
                    <button className="dm-back-button" onClick={() => setMobileConversation(false)} aria-label="Back to conversations"><ArrowLeft size={19} /></button>
                    <div className="dm-chat-avatar"><FileText size={19} /></div>
                    <div className="dm-chat-title"><strong>{selectedReport.title || `Complaint #${selectedReport.id}`}</strong><span>Complaint #{selectedReport.id} · {selectedReport.category || 'General'}</span></div>
                    <div className="dm-chat-meta"><span>{String(selectedReport.status || 'unknown').replaceAll('_', ' ')}</span><small>{unreadCount ? `${unreadCount} unread in this conversation` : 'Complaint conversation'}</small></div>
                  </div>
                  <div className="dm-chat-body">
                    {conversationLoading ? <div className="dm-chat-state"><RefreshCw size={23} className="dm-spin" /> Loading messages...</div> :
                      messages.length === 0 ? <div className="dm-chat-empty"><div><MessageCircle size={28} /></div><strong>No messages yet</strong><p>Send the first message in this complaint conversation.</p></div> :
                      <div className="dm-message-list">
                        {messages.map((message) => {
                          const mine = String(message.sender) === String(user?.id);
                          return <div key={message.id} className={`dm-message-line ${mine ? 'mine' : 'theirs'}`}>
                            {!mine && <div className="dm-sender-avatar"><UserRound size={14} /></div>}
                            <div className="dm-message-bubble"><span className="dm-sender-name">{mine ? 'You' : senderLabel(message)}</span><p>{message.content || message.message}</p><small><Clock3 size={11} /> {dateLabel(message.created_at)}</small></div>
                          </div>;
                        })}
                      </div>}
                  </div>
                  <form className="dm-composer" onSubmit={sendMessage}>
                    <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={2} maxLength={5000} placeholder="Write a message..." disabled={sending || conversationLoading} />
                    <div className="dm-composer-footer"><span>{messageText.length}/5000 · Messages are visible to authorized complaint participants.</span><button type="submit" disabled={!messageText.trim() || sending || conversationLoading}>{sending ? <RefreshCw size={16} className="dm-spin" /> : <Send size={16} />} {sending ? 'Sending...' : 'Send message'}</button></div>
                  </form>
                </>}
            </section>
          </section>

          )}

          {(messageSection === 'inbox' || messageSection === 'sent') && (
            <section className="dm-mail-workspace">
              <aside className={`dm-mail-list ${selectedMail ? 'dm-mail-list-hidden-mobile' : ''}`}>
                <div className="dm-list-heading">
                  <div>
                    <h3>{messageSection === 'inbox' ? 'Inbox' : 'Sent Messages'}</h3>
                    <p>{mailboxMessages.length} messages</p>
                  </div>
                  <span>{messageSection === 'inbox' ? <Inbox size={18} /> : <Send size={18} />}</span>
                </div>
                <label className="dm-search">
                  <Search size={17} />
                  <input value={mailboxSearch} onChange={(e) => setMailboxSearch(e.target.value)} placeholder="Search messages..." />
                </label>
                {mailboxLoading ? (
                  <div className="dm-list-state"><RefreshCw size={21} className="dm-spin" /> Loading messages...</div>
                ) : filteredMailboxMessages.length === 0 ? (
                  <div className="dm-list-empty"><Mail size={27} /><strong>No messages found</strong><p>Your {messageSection} messages will appear here.</p></div>
                ) : (
                  <div className="dm-report-list">
                    {filteredMailboxMessages.map((mail) => {
                      const active = String(selectedMail?.id) === String(mail.id);
                      const person = messageSection === 'inbox'
                        ? (mail.sender_email || mail.sender_name || `User #${mail.sender ?? '—'}`)
                        : (mail.recipient_email || mail.recipient_name || `User #${mail.recipient ?? '—'}`);
                      return (
                        <button key={mail.id} className={`dm-report-row ${active ? 'selected' : ''}`} onClick={() => openInternalMessage(mail)}>
                          <div className="dm-report-avatar"><Mail size={18} /></div>
                          <div className="dm-report-copy">
                            <strong>{mail.subject || '(No subject)'}</strong>
                            <span>{messageSection === 'inbox' ? 'From: ' : 'To: '}{person}</span>
                            <small>{mail.content || 'No message preview'}</small>
                          </div>
                          {messageSection === 'inbox' && !mail.is_read && <span className="dm-unread-dot" title="Unread" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>
              <section className={`dm-mail-detail ${selectedMail ? 'dm-mail-detail-mobile' : ''}`}>
                {!selectedMail ? (
                  <div className="dm-chat-placeholder">
                    <div><Mail size={34} /></div><h3>Select a message</h3>
                    <p>Choose a message from your {messageSection} to read it.</p>
                  </div>
                ) : (
                  <>
                    <div className="dm-chat-header">
                      <button className="dm-back-button" onClick={() => setSelectedMail(null)} aria-label="Back to messages"><ArrowLeft size={19} /></button>
                      <div className="dm-chat-avatar"><Mail size={19} /></div>
                      <div className="dm-chat-title">
                        <strong>{selectedMail.subject || '(No subject)'}</strong>
                        <span>{messageSection === 'inbox' ? `From: ${selectedMail.sender_email || `User #${selectedMail.sender}`}` : `To: ${selectedMail.recipient_email || `User #${selectedMail.recipient}`}`}</span>
                      </div>
                      <div className="dm-chat-meta"><span>{selectedMail.is_read ? 'Read' : 'Unread'}</span><small>{dateLabel(selectedMail.created_at)}</small></div>
                    </div>
                    <div className="dm-mail-message-content">
                      <div className="dm-mail-message-meta">
                        <span>{messageSection === 'inbox' ? 'Received message' : 'Sent message'}</span>
                        <time>{dateLabel(selectedMail.created_at)}</time>
                      </div>
                      <p>{selectedMail.content}</p>
                    </div>
                    {messageSection === 'inbox' && (
                      <form className="dm-composer" onSubmit={replyToInternalMessage}>
                        <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} maxLength={5000} placeholder="Write your reply..." />
                        <div className="dm-composer-footer">
                          <span>{replyText.length}/5000</span>
                          <button type="submit" disabled={!replyText.trim() || replySending}>
                            {replySending ? <RefreshCw size={16} className="dm-spin" /> : <Reply size={16} />}
                            {replySending ? 'Sending...' : 'Reply'}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </section>
            </section>
          )}

          {messageSection === 'compose' && (
            <section className="dm-compose-card">
              <div className="dm-compose-heading">
                <div className="dm-compose-icon"><Edit3 size={21} /></div>
                <div><h3>Compose a message</h3><p>Send a direct message to an active CivicFix account.</p></div>
              </div>
              <form onSubmit={sendInternalMessage} className="dm-compose-form">
                <label>Recipient email
                  <input type="email" required value={composeForm.recipient_email} onChange={(e) => setComposeForm((old) => ({ ...old, recipient_email: e.target.value }))} placeholder="Enter registered CivicFix email" />
                </label>
                <label>Subject
                  <input type="text" required maxLength={200} value={composeForm.subject} onChange={(e) => setComposeForm((old) => ({ ...old, subject: e.target.value }))} placeholder="Enter message subject" />
                </label>
                <label>Message
                  <textarea required maxLength={5000} rows={7} value={composeForm.content} onChange={(e) => setComposeForm((old) => ({ ...old, content: e.target.value }))} placeholder="Write your message..." />
                  <small>{composeForm.content.length}/5000 characters</small>
                </label>
                <div className="dm-compose-actions">
                  <button type="button" className="dm-compose-cancel" onClick={() => setComposeForm({ recipient_email: '', subject: '', content: '' })}>Clear</button>
                  <button type="submit" disabled={mailSending || !composeForm.recipient_email.trim() || !composeForm.subject.trim() || !composeForm.content.trim()}>
                    {mailSending ? <RefreshCw size={16} className="dm-spin" /> : <Send size={16} />}
                    {mailSending ? 'Sending...' : 'Send message'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <footer className="dd-footer"><span>© {new Date().getFullYear()} CivicFix</span><span>Department Management Portal</span></footer>
        </div>
      </main>
    </div>
  );
}
