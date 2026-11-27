import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  Mail,
  UserRound,
  LogOut,
  Menu,
  X,
  Search,
  RefreshCw,
  Send,
  Inbox,
  SendHorizontal,
  MessageSquare,
  Plus,
  ArrowLeft,
  Reply,
  Clock,
  CheckCheck,
  Check,
  CheckCircle2,
  CalendarDays,
  MailOpen,
  CircleAlert,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffRequests.css";
import "./SeniorCitizenStaffMessages.css";

/* =========================================
   CONSTANTS
========================================= */

const BASE = "/messaging/internal/";

const MAX_SUBJECT_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;

/* =========================================
   HELPERS
========================================= */

const getArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getError = (error) => {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key.replaceAll("_", " ")}: ${value.join(", ")}`;
        }

        if (typeof value === "string") {
          return `${key.replaceAll("_", " ")}: ${value}`;
        }

        return "";
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return (
    getApiErrorMessage(error) ||
    "Something went wrong. Please try again."
  );
};

const getFullName = (person) => {
  const name = [
    person?.first_name,
    person?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    person?.name ||
    person?.full_name ||
    name ||
    person?.email ||
    "Staff Member"
  );
};

const getInitials = (name) => {
  return (
    String(name || "SC")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SC"
  );
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/* =========================================
   MESSAGE STATUS (sent messages only)
========================================= */

function MessageStatus({ message, own }) {
  if (!own) {
    return null;
  }

  return (
    <span
      className={`scsm-message-status ${
        message?.is_read ? "read" : "sent"
      }`}
    >
      {message?.is_read ? (
        <>
          <CheckCheck size={13} />
          Read
        </>
      ) : (
        <>
          <Check size={13} />
          Sent
        </>
      )}
    </span>
  );
}

/* =========================================
   MESSAGE AVATAR
========================================= */

function MessageAvatar({
  name,
  email,
  size = "normal",
}) {
  return (
    <div
      className={`scsm-avatar scsm-avatar-${size}`}
    >
      {getInitials(name || email)}
    </div>
  );
}

/* =========================================
   MAIN COMPONENT
========================================= */

export default function SeniorCitizenStaffMessages() {
  const navigate = useNavigate();
  const location = useLocation();

  /* =========================================
     USER
  ========================================= */

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const staffName = getFullName(user);

  const initials = getInitials(staffName);

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  /* =========================================
     SIDEBAR
  ========================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/senior-citizen/staff/dashboard",
    },
    {
      name: "My Assigned Requests",
      icon: ClipboardList,
      path: "/senior-citizen/staff/requests",
    },
    {
      name: "Notifications",
      icon: Bell,
      path: "/senior-citizen/staff/notifications",
    },
    {
      name: "Messages",
      icon: Mail,
      path: "/senior-citizen/staff/messages",
    },
    {
      name: "My Profile",
      icon: UserRound,
      path: "/senior-citizen/staff/profile",
    },
  ];

  const navigateTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  /* =========================================
     MAILBOX STATES
  ========================================= */

  const [activeTab, setActiveTab] = useState("inbox");

  const [inboxMessages, setInboxMessages] = useState([]);

  const [sentMessages, setSentMessages] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  /* =========================================
     SELECTED MESSAGE
  ========================================= */

  const [selectedMessage, setSelectedMessage] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [detailError, setDetailError] = useState("");

  /* =========================================
     COMPOSE MESSAGE
  ========================================= */

  const [showCompose, setShowCompose] = useState(false);

  const [composeForm, setComposeForm] = useState({
    recipient_email: "",
    subject: "",
    content: "",
  });

  const [sending, setSending] = useState(false);

  const [composeError, setComposeError] = useState("");

  const [composeSuccess, setComposeSuccess] = useState("");

  /* =========================================
     REPLY
  ========================================= */

  const [replyText, setReplyText] = useState("");

  const [replyLoading, setReplyLoading] = useState(false);

  const [replyError, setReplyError] = useState("");

  const [replySuccess, setReplySuccess] = useState("");

  const [localReplies, setLocalReplies] = useState([]);

  /* =========================================
     CHAT SCROLL
  ========================================= */

  const threadRef = useRef(null);

  /* =========================================
     AUTHENTICATION
  ========================================= */

  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem(
      "civicfix_access_token"
    );

    if (!token) {
      navigate("/senior-citizen/staff/login", {
        replace: true,
      });

      return false;
    }

    let storedUser = null;

    try {
      storedUser = JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      storedUser = null;
    }

    if (
      storedUser?.role &&
      storedUser.role !== "senior_citizen_staff"
    ) {
      navigate("/senior-citizen/staff/login", {
        replace: true,
      });

      return false;
    }

    return true;
  }, [navigate]);

  /* =========================================
     LOAD CURRENT USER
  ========================================= */

  const loadUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me/");

      const currentUser = response.data;

      if (
        currentUser?.role &&
        currentUser.role !== "senior_citizen_staff"
      ) {
        throw new Error("Unauthorized staff account.");
      }

      setUser(currentUser);

      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(currentUser)
      );
    } catch (err) {
      console.error(
        "Unable to load staff account:",
        err
      );
    }
  }, []);

  /* =========================================
     LOAD INBOX
  ========================================= */

  const loadInbox = useCallback(async () => {
    const response = await api.get(
      `${BASE}inbox/`
    );

    const data = getArray(response.data);

    setInboxMessages(data);

    return data;
  }, []);

  /* =========================================
     LOAD SENT MESSAGES
  ========================================= */

  const loadSent = useCallback(async () => {
    const response = await api.get(
      `${BASE}sent/`
    );

    const data = getArray(response.data);

    setSentMessages(data);

    return data;
  }, []);

  /* =========================================
     MARK MESSAGE AS READ
  ========================================= */

  const markMessageRead = async (message) => {
    if (!message || message.is_read) {
      return message;
    }

    try {
      const response = await api.post(
        `${BASE}${message.id}/read/`
      );

      const updatedMessage = response.data;

      setInboxMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                ...updatedMessage,
                is_read: true,
              }
            : item
        )
      );

      return updatedMessage;
    } catch (err) {
      console.error(
        "Unable to mark message as read:",
        err
      );

      return message;
    }
  };

  /* =========================================
     LOAD BOTH MAILBOXES
  ========================================= */

  const loadMessages = useCallback(
    async (quiet = false) => {
      if (!checkAuthentication()) {
        setLoading(false);
        return;
      }

      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const results = await Promise.allSettled([
        loadInbox(),
        loadSent(),
      ]);

      const errors = [];

      if (results[0].status === "rejected") {
        errors.push(getError(results[0].reason));
      }

      if (results[1].status === "rejected") {
        errors.push(getError(results[1].reason));
      }

      setError(errors.join(" "));

      setLoading(false);
      setRefreshing(false);
    },
    [checkAuthentication, loadInbox, loadSent]
  );

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    if (!checkAuthentication()) {
      return;
    }

    loadMessages();
    loadUser();
  }, [
    checkAuthentication,
    loadMessages,
    loadUser,
  ]);

  /* =========================================
     SCROLL CHAT TO LATEST REPLY
  ========================================= */

  useEffect(() => {
    if (localReplies.length === 0) {
      return;
    }

    const thread = threadRef.current;

    if (thread) {
      thread.scrollTo({
        top: thread.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [localReplies.length]);

  /* =========================================
     CURRENT MESSAGES
  ========================================= */

  const currentMessages =
    activeTab === "inbox"
      ? inboxMessages
      : sentMessages;

  /* =========================================
     UNREAD COUNT
  ========================================= */

  const unreadCount = useMemo(() => {
    return inboxMessages.filter(
      (message) => !message.is_read
    ).length;
  }, [inboxMessages]);

  /* =========================================
     MESSAGE COUNTS
  ========================================= */

  const stats = useMemo(() => {
    return {
      inbox: inboxMessages.length,
      unread: unreadCount,
      sent: sentMessages.length,
    };
  }, [
    inboxMessages,
    sentMessages,
    unreadCount,
  ]);

  /* =========================================
     FILTER MESSAGES
  ========================================= */

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return currentMessages.filter((message) => {
      const matchesSearch =
        !query ||
        [
          message.subject,
          message.content,
          message.sender_name,
          message.sender_email,
          message.recipient_name,
          message.recipient_email,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !message.is_read) ||
        (filter === "read" && message.is_read);

      return matchesSearch && matchesFilter;
    });
  }, [
    currentMessages,
    search,
    filter,
  ]);

  /* =========================================
     OPEN MESSAGE
  ========================================= */

  const openMessage = async (message) => {
    setShowCompose(false);

    setSelectedMessage(message);

    setDetailLoading(true);

    setDetailError("");

    setReplyError("");
    setReplySuccess("");
    setReplyText("");

    setLocalReplies([]);

    try {
      const response = await api.get(
        `${BASE}${message.id}/`
      );

      let detail = response.data;

      /*
        Only received messages can be marked
        as read. The backend enforces this.
      */

      if (
        activeTab === "inbox" &&
        !detail.is_read
      ) {
        detail = await markMessageRead(detail);
      }

      setSelectedMessage(detail);
    } catch (err) {
      setDetailError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  /* =========================================
     CLOSE MESSAGE
  ========================================= */

  const closeMessage = () => {
    setSelectedMessage(null);

    setDetailError("");

    setReplyText("");
    setReplyError("");
    setReplySuccess("");

    setLocalReplies([]);
  };

  /* =========================================
     COMPOSE FORM CHANGE
  ========================================= */

  const updateCompose = (event) => {
    const { name, value } = event.target;

    setComposeForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /* =========================================
     OPEN COMPOSE
  ========================================= */

  const openCompose = () => {
    setSelectedMessage(null);

    setComposeForm({
      recipient_email: "",
      subject: "",
      content: "",
    });

    setComposeError("");
    setComposeSuccess("");

    setShowCompose(true);
  };

  /* =========================================
     CLOSE COMPOSE
  ========================================= */

  const closeCompose = () => {
    if (sending) return;

    setShowCompose(false);

    setComposeError("");
    setComposeSuccess("");
  };

  /* =========================================
     SEND NEW MESSAGE
  ========================================= */

  const sendNewMessage = async (event) => {
    event.preventDefault();

    const recipientEmail =
      composeForm.recipient_email.trim();

    const subject =
      composeForm.subject.trim();

    const content =
      composeForm.content.trim();

    setComposeError("");
    setComposeSuccess("");

    if (!recipientEmail || !subject || !content) {
      setComposeError(
        "Please complete all required fields."
      );

      return;
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      setComposeError(
        "Subject cannot exceed 200 characters."
      );

      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setComposeError(
        "Message cannot exceed 5000 characters."
      );

      return;
    }

    setSending(true);

    try {
      /*
        Actual backend contract:

        POST /api/messaging/internal/send/

        {
          recipient_email,
          subject,
          content
        }
      */

      await api.post(
        `${BASE}send/`,
        {
          recipient_email: recipientEmail,
          subject,
          content,
        }
      );

      setComposeSuccess(
        "Your message has been sent successfully."
      );

      setComposeForm({
        recipient_email: "",
        subject: "",
        content: "",
      });

      await loadMessages(true);

      setTimeout(() => {
        setShowCompose(false);
        setActiveTab("sent");
        setComposeSuccess("");
      }, 900);
    } catch (err) {
      setComposeError(getError(err));
    } finally {
      setSending(false);
    }
  };

  /* =========================================
     REPLY TO MESSAGE
  ========================================= */

  const sendReply = async (event) => {
    event.preventDefault();

    if (!selectedMessage) return;

    const content = replyText.trim();

    if (!content) {
      setReplyError(
        "Please enter your reply."
      );

      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setReplyError(
        "Message cannot exceed 5000 characters."
      );

      return;
    }

    setReplyLoading(true);

    setReplyError("");
    setReplySuccess("");

    try {
      /*
        Actual backend contract:

        POST /api/messaging/internal/<id>/reply/

        {
          content
        }

        The backend automatically:
        - Uses the original sender as recipient.
        - Adds Re: to the subject.
        - Stores parent_message.
        - Creates a notification.
      */

      const response = await api.post(
        `${BASE}${selectedMessage.id}/reply/`,
        {
          content,
        }
      );

      setLocalReplies((current) => [
        ...current,
        response.data,
      ]);

      setReplyText("");

      setReplySuccess(
        "Your reply has been sent successfully."
      );

      /*
        Refresh the Sent mailbox in the background.
        A failure here must not hide the successful reply.
      */

      loadSent().catch((err) => {
        console.error(
          "Unable to refresh sent messages:",
          err
        );
      });
    } catch (err) {
      setReplyError(getError(err));
    } finally {
      setReplyLoading(false);
    }
  };

  /* =========================================
     TAB CHANGE
  ========================================= */

  const changeTab = (tab) => {
    setActiveTab(tab);

    setSearch("");
    setFilter("all");

    setSelectedMessage(null);

    setDetailError("");

    setReplyError("");
    setReplySuccess("");
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = () => {
    localStorage.removeItem(
      "civicfix_access_token"
    );

    localStorage.removeItem(
      "civicfix_refresh_token"
    );

    localStorage.removeItem(
      "civicfix_user"
    );

    navigate("/senior-citizen/staff/login", {
      replace: true,
    });
  };

  /* =========================================
     SELECTED MESSAGE DETAILS
  ========================================= */

  const detailIsInbox = activeTab === "inbox";

  const detailPersonName = detailIsInbox
    ? selectedMessage?.sender_name
    : selectedMessage?.recipient_name;

  const detailPersonEmail = detailIsInbox
    ? selectedMessage?.sender_email
    : selectedMessage?.recipient_email;

  const detailPanelState =
    selectedMessage || showCompose
      ? "is-active"
      : "is-idle";

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="scr-page scsm-page">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="scr-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside
        className={`scr-sidebar ${
          sidebarOpen ? "scr-sidebar-open" : ""
        }`}
      >

        <div className="scr-brand">

          <div className="scr-brand-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

          <button
            type="button"
            className="scr-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>

        </div>

        <div className="scr-sidebar-label">
          WORKSPACE
        </div>

        <nav className="scr-nav">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                className={`scr-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  navigateTo(item.path)
                }
              >
                <Icon size={19} />

                <span>{item.name}</span>
              </button>
            );
          })}

        </nav>

        <div className="scr-sidebar-footer">

          <div className="scr-user">

            <div className="scr-avatar">
              {initials}
            </div>

            <div>
              <strong>{staffName}</strong>
              <span>Senior Citizen Staff</span>
            </div>

          </div>

          <button
            type="button"
            className="scr-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>

      </aside>

      {/* =====================================
          MAIN
      ===================================== */}

      <main className="scr-main">

        {/* HEADER */}

        <header className="scr-header">

          <div className="scr-header-left">

            <button
              type="button"
              className="scr-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>

            <div>

              <div className="scr-breadcrumb">
                Workspace <span>/</span> Messages
              </div>

              <h2>Messages</h2>

            </div>

          </div>

          <div className="scr-header-right">

            <div className="scr-header-date">
              <CalendarDays size={17} />
              {today}
            </div>

            <div className="scr-header-divider" />

            <div className="scr-header-profile">

              <div className="scr-avatar">
                {initials}
              </div>

              <div>
                <strong>{staffName}</strong>
                <span>Senior Citizen Staff</span>
              </div>

            </div>

          </div>

        </header>

        {/* =====================================
            PAGE CONTENT
        ===================================== */}

        <div className="scr-content scsm-content">

          {/* PAGE INTRO */}

          <section className="scr-heading">

            <div>

              <span className="scr-eyebrow">
                <span />
                STAFF WORKSPACE
              </span>

              <h1>Messages</h1>

              <p>
                Communicate directly with registered CivicFix
                users and manage your conversations.
              </p>

            </div>

            <div className="scsm-heading-actions">

              <button
                type="button"
                className="scr-refresh"
                onClick={() => loadMessages(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? "scr-spin" : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                className="scsm-compose-button"
                onClick={openCompose}
              >
                <Plus size={18} />
                Compose Message
              </button>

            </div>

          </section>

          {/* GLOBAL ERROR */}

          {error && (
            <div className="scr-alert scr-alert-error scsm-alert">
              <CircleAlert size={18} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadMessages(true)}
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================
              STATISTICS
          ================================= */}

          <section className="scsm-stats">

            <article className="scsm-stat-card">

              <div className="scsm-stat-icon blue">
                <Inbox size={21} />
              </div>

              <div>
                <span>Total Inbox</span>
                <strong>{stats.inbox}</strong>
              </div>

            </article>

            <article className="scsm-stat-card">

              <div className="scsm-stat-icon orange">
                <MailOpen size={21} />
              </div>

              <div>
                <span>Unread Messages</span>
                <strong>{stats.unread}</strong>
              </div>

            </article>

            <article className="scsm-stat-card">

              <div className="scsm-stat-icon green">
                <SendHorizontal size={21} />
              </div>

              <div>
                <span>Sent Messages</span>
                <strong>{stats.sent}</strong>
              </div>

            </article>

          </section>

          {/* =================================
              MESSAGING WORKSPACE
          ================================= */}

          <section className="scsm-workspace">

            {/* MAILBOX */}

            <div
              className={`scsm-mailbox ${
                selectedMessage || showCompose
                  ? "scsm-mailbox-hidden-mobile"
                  : ""
              }`}
            >

              {/* MAILBOX HEADER */}

              <div className="scsm-mailbox-header">

                <div>
                  <h3>My Mailbox</h3>

                  <p>
                    Manage your direct conversations.
                  </p>
                </div>

                <span className="scsm-total-badge">
                  {currentMessages.length} Messages
                </span>

              </div>

              {/* TABS */}

              <div className="scsm-tabs">

                <button
                  type="button"
                  className={
                    activeTab === "inbox"
                      ? "active"
                      : ""
                  }
                  onClick={() => changeTab("inbox")}
                >
                  <Inbox size={17} />

                  Inbox

                  {unreadCount > 0 && (
                    <span className="scsm-tab-count">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "sent"
                      ? "active"
                      : ""
                  }
                  onClick={() => changeTab("sent")}
                >
                  <SendHorizontal size={17} />

                  Sent
                </button>

              </div>

              {/* SEARCH */}

              <div className="scsm-mailbox-filters">

                <div className="scsm-search">

                  <Search size={17} />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search messages..."
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

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value)
                  }
                  aria-label="Filter messages"
                >
                  <option value="all">
                    All Messages
                  </option>

                  {activeTab === "inbox" && (
                    <>
                      <option value="unread">
                        Unread
                      </option>

                      <option value="read">
                        Read
                      </option>
                    </>
                  )}

                  {activeTab === "sent" && (
                    <>
                      <option value="unread">
                        Unread by recipient
                      </option>

                      <option value="read">
                        Read by recipient
                      </option>
                    </>
                  )}

                </select>

              </div>

              {/* MESSAGE LIST */}

              <div className="scsm-message-list">

                {loading ? (

                  <div className="scsm-state">

                    <RefreshCw
                      size={24}
                      className="scr-spin"
                    />

                    <p>Loading messages...</p>

                  </div>

                ) : filteredMessages.length > 0 ? (

                  filteredMessages.map((message) => {

                    const own =
                      activeTab === "sent";

                    const personName = own
                      ? message.recipient_name
                      : message.sender_name;

                    const personEmail = own
                      ? message.recipient_email
                      : message.sender_email;

                    const selected =
                      selectedMessage?.id === message.id;

                    return (
                      <button
                        type="button"
                        key={message.id}
                        className={`scsm-message-item ${
                          selected ? "selected" : ""
                        } ${
                          !own && !message.is_read
                            ? "unread"
                            : ""
                        }`}
                        onClick={() =>
                          openMessage(message)
                        }
                      >

                        <MessageAvatar
                          name={personName}
                          email={personEmail}
                        />

                        <div className="scsm-message-item-content">

                          <div className="scsm-message-item-top">

                            <strong>
                              {personName || personEmail}
                            </strong>

                            <span>
                              {getTime(message.created_at)}
                            </span>

                          </div>

                          <div className="scsm-message-subject">

                            <span>
                              {message.subject || "No subject"}
                            </span>

                            {!own && !message.is_read && (
                              <i />
                            )}

                          </div>

                          <p>
                            {message.content}
                          </p>

                          <div className="scsm-message-item-bottom">

                            <small>
                              {formatDate(message.created_at)}
                            </small>

                            {own && (
                              <span
                                className={
                                  message.is_read
                                    ? "read"
                                    : "unread-status"
                                }
                              >
                                {message.is_read
                                  ? "Read"
                                  : "Sent"}
                              </span>
                            )}

                          </div>

                        </div>

                      </button>
                    );
                  })

                ) : (

                  <div className="scsm-empty-list">

                    <div>
                      {activeTab === "inbox" ? (
                        <Inbox size={29} />
                      ) : (
                        <SendHorizontal size={29} />
                      )}
                    </div>

                    <h4>
                      {search
                        ? "No matching messages"
                        : activeTab === "inbox"
                        ? "Your inbox is empty"
                        : "No sent messages yet"}
                    </h4>

                    <p>
                      {search
                        ? "Try changing your search or filters."
                        : activeTab === "inbox"
                        ? "Messages received from other CivicFix users will appear here."
                        : "Messages you send will appear here."}
                    </p>

                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                      >
                        Clear Filters
                      </button>
                    )}

                  </div>

                )}

              </div>

              {/* MAILBOX FOOTER */}

              <div className="scsm-mailbox-footer">
                Showing {filteredMessages.length} of{" "}
                {currentMessages.length} messages
              </div>

            </div>

            {/* =================================
                DETAIL PANEL
            ================================= */}

            <div
              className={`scsm-detail-panel ${detailPanelState}`}
            >

              {showCompose ? (

                /* =================================
                   COMPOSE MESSAGE
                ================================= */

                <div className="scsm-compose-view">

                  <div className="scsm-detail-header">

                    <div className="scsm-detail-title">

                      <button
                        type="button"
                        className="scsm-back-button"
                        onClick={closeCompose}
                        aria-label="Back to mailbox"
                      >
                        <ArrowLeft size={18} />
                      </button>

                      <div>
                        <span>NEW MESSAGE</span>
                        <h3>Compose Message</h3>
                      </div>

                    </div>

                    <button
                      type="button"
                      className="scsm-icon-button"
                      onClick={closeCompose}
                      disabled={sending}
                      aria-label="Close compose"
                    >
                      <X size={19} />
                    </button>

                  </div>

                  <form
                    className="scsm-compose-form"
                    onSubmit={sendNewMessage}
                  >

                    <div className="scsm-compose-information">

                      <div className="scsm-compose-information-icon">
                        <MessageSquare size={23} />
                      </div>

                      <div>
                        <strong>Direct CivicFix Message</strong>

                        <p>
                          Send a private message to an existing
                          active CivicFix account.
                        </p>
                      </div>

                    </div>

                    {composeError && (
                      <div className="scsm-form-error">
                        <CircleAlert size={16} />
                        {composeError}
                      </div>
                    )}

                    {composeSuccess && (
                      <div className="scsm-form-success">
                        <CheckCircle2 size={16} />
                        {composeSuccess}
                      </div>
                    )}

                    <label className="scsm-form-field">

                      <span>
                        Recipient Email Address
                        <b>*</b>
                      </span>

                      <div className="scsm-input-wrapper">
                        <Mail size={17} />

                        <input
                          type="email"
                          name="recipient_email"
                          value={composeForm.recipient_email}
                          onChange={updateCompose}
                          placeholder="Enter registered CivicFix email"
                          required
                        />
                      </div>

                      <small>
                        The recipient must have an active
                        CivicFix account.
                      </small>

                    </label>

                    <label className="scsm-form-field">

                      <span>
                        Subject
                        <b>*</b>
                      </span>

                      <input
                        type="text"
                        name="subject"
                        value={composeForm.subject}
                        onChange={updateCompose}
                        maxLength={MAX_SUBJECT_LENGTH}
                        placeholder="Enter message subject"
                        required
                      />

                      <small>
                        {composeForm.subject.length}/
                        {MAX_SUBJECT_LENGTH} characters
                      </small>

                    </label>

                    <label className="scsm-form-field">

                      <span>
                        Message
                        <b>*</b>
                      </span>

                      <textarea
                        name="content"
                        value={composeForm.content}
                        onChange={updateCompose}
                        maxLength={MAX_CONTENT_LENGTH}
                        rows={9}
                        placeholder="Write your message here..."
                        required
                      />

                      <small>
                        {composeForm.content.length}/
                        {MAX_CONTENT_LENGTH} characters
                      </small>

                    </label>

                    <div className="scsm-compose-actions">

                      <button
                        type="button"
                        className="scsm-cancel-button"
                        onClick={closeCompose}
                        disabled={sending}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="scsm-send-button"
                        disabled={sending}
                      >

                        {sending ? (
                          <RefreshCw
                            size={17}
                            className="scr-spin"
                          />
                        ) : (
                          <Send size={17} />
                        )}

                        {sending
                          ? "Sending..."
                          : "Send Message"}

                      </button>

                    </div>

                  </form>

                </div>

              ) : selectedMessage ? (

                /* =================================
                   CONVERSATION VIEW
                ================================= */

                <div className="scsm-chat">

                  {/* CHAT HEADER */}

                  <div className="scsm-detail-header">

                    <div className="scsm-detail-title">

                      <button
                        type="button"
                        className="scsm-back-button"
                        onClick={closeMessage}
                        aria-label="Back to mailbox"
                      >
                        <ArrowLeft size={18} />
                      </button>

                      <MessageAvatar
                        name={detailPersonName}
                        email={detailPersonEmail}
                        size="large"
                      />

                      <div className="scsm-chat-person">

                        <span>
                          {detailIsInbox
                            ? "FROM"
                            : "TO"}
                        </span>

                        <h3>
                          {detailPersonName ||
                            detailPersonEmail ||
                            "Unknown user"}
                        </h3>

                        {detailPersonName &&
                          detailPersonEmail && (
                            <small>
                              {detailPersonEmail}
                            </small>
                          )}

                      </div>

                    </div>

                    <button
                      type="button"
                      className="scsm-icon-button"
                      onClick={closeMessage}
                      aria-label="Close message"
                    >
                      <X size={19} />
                    </button>

                  </div>

                  {detailLoading ? (

                    <div className="scsm-state">

                      <RefreshCw
                        size={25}
                        className="scr-spin"
                      />

                      <p>Loading message details...</p>

                    </div>

                  ) : detailError ? (

                    <div className="scsm-detail-error">

                      <CircleAlert size={27} />

                      <h3>Unable to load message</h3>

                      <p>{detailError}</p>

                      <button
                        type="button"
                        onClick={() =>
                          openMessage(selectedMessage)
                        }
                      >
                        Try Again
                      </button>

                    </div>

                  ) : (

                    <>

                      {/* SUBJECT BAR */}

                      <div className="scsm-chat-subject">

                        <div className="scsm-chat-subject-text">
                          <span>SUBJECT</span>

                          <h2>
                            {selectedMessage.subject ||
                              "No subject"}
                          </h2>
                        </div>

                        <div className="scsm-chat-chips">

                          <span className="scsm-chip">
                            #{selectedMessage.id}
                          </span>

                          <span
                            className={`scsm-chip ${
                              selectedMessage.is_read
                                ? "read"
                                : "unread-status"
                            }`}
                          >
                            {selectedMessage.is_read
                              ? "Read"
                              : "Unread"}
                          </span>

                        </div>

                      </div>

                      {/* CONVERSATION THREAD */}

                      <div
                        className="scsm-chat-thread"
                        ref={threadRef}
                      >

                        <div className="scsm-day-divider">
                          <span>
                            <CalendarDays size={13} />
                            {formatDate(
                              selectedMessage.created_at
                            )}
                          </span>
                        </div>

                        {/* ORIGINAL MESSAGE */}

                        <div
                          className={`scsm-bubble-row ${
                            detailIsInbox
                              ? "incoming"
                              : "own"
                          }`}
                        >

                          {detailIsInbox && (
                            <MessageAvatar
                              name={detailPersonName}
                              email={detailPersonEmail}
                              size="small"
                            />
                          )}

                          <div className="scsm-bubble">

                            <div className="scsm-bubble-meta">

                              <strong>
                                {detailIsInbox
                                  ? detailPersonName ||
                                    detailPersonEmail
                                  : "You"}
                              </strong>

                              <span>
                                <Clock size={11} />
                                {getTime(
                                  selectedMessage.created_at
                                )}
                              </span>

                            </div>

                            <p>
                              {selectedMessage.content}
                            </p>

                            <div className="scsm-bubble-footer">

                              <time>
                                {formatDateTime(
                                  selectedMessage.created_at
                                )}
                              </time>

                              <MessageStatus
                                message={selectedMessage}
                                own={!detailIsInbox}
                              />

                            </div>

                          </div>

                        </div>

                        {/* YOUR REPLIES */}

                        {localReplies.map((reply) => (

                          <div
                            key={reply.id}
                            className="scsm-bubble-row own"
                          >

                            <div className="scsm-bubble">

                              <div className="scsm-bubble-meta">

                                <strong>You</strong>

                                <span>
                                  <Clock size={11} />
                                  {getTime(reply.created_at)}
                                </span>

                              </div>

                              <p>{reply.content}</p>

                              <div className="scsm-bubble-footer">

                                <time>
                                  {formatDateTime(
                                    reply.created_at
                                  )}
                                </time>

                                <MessageStatus
                                  message={reply}
                                  own
                                />

                              </div>

                            </div>

                          </div>

                        ))}

                        {/* SENT MESSAGE NOTICE */}

                        {!detailIsInbox && (

                          <div className="scsm-sent-notice">

                            <ShieldCheck size={18} />

                            <div>
                              <strong>Sent Message</strong>

                              <p>
                                This message was sent from your
                                CivicFix staff account.
                              </p>
                            </div>

                          </div>

                        )}

                      </div>

                      {/* REPLY COMPOSER */}

                      {detailIsInbox && (

                        <form
                          onSubmit={sendReply}
                          className="scsm-composer"
                        >

                          <div className="scsm-composer-top">

                            <span>
                              <Reply size={15} />
                              Reply to{" "}
                              {selectedMessage.sender_email ||
                                detailPersonName}
                            </span>

                          </div>

                          {replyError && (
                            <div className="scsm-form-error">
                              <CircleAlert size={15} />
                              {replyError}
                            </div>
                          )}

                          {replySuccess && (
                            <div className="scsm-form-success">
                              <CheckCircle2 size={15} />
                              {replySuccess}
                            </div>
                          )}

                          <div className="scsm-composer-box">

                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(event) =>
                                setReplyText(event.target.value)
                              }
                              maxLength={MAX_CONTENT_LENGTH}
                              placeholder="Write your reply..."
                              aria-label="Write your reply"
                            />

                            <button
                              type="submit"
                              className="scsm-composer-send"
                              disabled={
                                replyLoading ||
                                !replyText.trim()
                              }
                            >

                              {replyLoading ? (
                                <RefreshCw
                                  size={17}
                                  className="scr-spin"
                                />
                              ) : (
                                <Send size={17} />
                              )}

                              <span className="scsm-send-label">
                                {replyLoading
                                  ? "Sending..."
                                  : "Send"}
                              </span>

                            </button>

                          </div>

                          <small className="scsm-composer-count">
                            {replyText.length}/
                            {MAX_CONTENT_LENGTH}
                          </small>

                        </form>

                      )}

                    </>

                  )}

                </div>

              ) : (

                /* =================================
                   DEFAULT EMPTY STATE
                ================================= */

                <div className="scsm-welcome">

                  <div className="scsm-welcome-icon">
                    <MessageSquare size={35} />
                  </div>

                  <h2>Your Messages</h2>

                  <p>
                    Select a conversation from your mailbox
                    to view its details and reply.
                  </p>

                  <button
                    type="button"
                    onClick={openCompose}
                  >
                    <Plus size={17} />
                    Compose New Message
                  </button>

                </div>

              )}

            </div>

          </section>

          {/* =================================
              FOOTER
          ================================= */}

          <footer className="scr-footer">
            <span>
              © 2026 CivicFix. All rights reserved.
            </span>

            <span>
              Senior Citizen Assistance Portal
            </span>
          </footer>

        </div>

      </main>

    </div>
  );
}