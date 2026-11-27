
import {
  useCallback,
  useEffect,
  useMemo,
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
  HeartHandshake,
  RefreshCw,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  MailCheck,
  User,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Phone,
  BriefcaseBusiness,
  LockKeyhole,
  BadgeCheck,
  Clock,
  AtSign,
  IdCard,
  Building2,
  Fingerprint,
} from "lucide-react";

import api, {
  getApiErrorMessage,
} from "../../api/axios";

import "./SeniorCitizenStaffRequests.css";
import "./SeniorCitizenStaffProfile.css";

/* =========================================
   HELPERS
========================================= */

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
    name ||
    person?.email ||
    "Staff Member"
  );
};

const getInitials = (person) => {
  const first =
    person?.first_name?.[0] || "";

  const last =
    person?.last_name?.[0] || "";

  return (
    `${first}${last}`.toUpperCase() ||
    person?.email?.[0]?.toUpperCase() ||
    "SC"
  );
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

/* =========================================
   PROFILE INFORMATION ITEM
========================================= */

function ProfileInfo({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="scsp-info-item">

      <div className="scsp-info-icon">
        <Icon size={19} />
      </div>

      <div className="scsp-info-text">

        <span>{label}</span>

        <strong>
          {value || "Not available"}
        </strong>

        {description && (
          <small>{description}</small>
        )}

      </div>

    </div>
  );
}

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({
  active,
  activeText,
  inactiveText,
}) {
  return (
    <span
      className={`scsp-status-badge ${
        active ? "active" : "inactive"
      }`}
    >
      {active ? (
        <CheckCircle2 size={15} />
      ) : (
        <ShieldAlert size={15} />
      )}

      {active ? activeText : inactiveText}
    </span>
  );
}

/* =========================================
   MAIN COMPONENT
========================================= */

export default function SeniorCitizenStaffProfile() {

  const navigate = useNavigate();

  const location = useLocation();

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

  const initials = getInitials(user);

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  /* =========================================
     PROFILE STATES
  ========================================= */

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

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
     LOAD PROFILE
     ACTUAL BACKEND API:
     GET /api/auth/me/
  ========================================= */

  const loadProfile = useCallback(async (quiet = false) => {

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

    try {

      const response = await api.get(
        "/senior-citizen/staff/my-profile/"
        );
      const currentUser = response.data;

      if (
        currentUser?.role &&
        currentUser.role !== "senior_citizen_staff"
      ) {
        throw new Error(
          "This profile is available only for Senior Citizen Staff."
        );
      }

      setUser(currentUser);

      localStorage.setItem(
        "civicfix_user",
        JSON.stringify(currentUser)
      );

    } catch (err) {

      setError(getError(err));

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, [checkAuthentication]);

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
     PROFILE VALUES
  ========================================= */

  const accountStatus = user?.account_is_active !== false;

  const isVerified = user?.is_verified === true;

  const roleLabel = useMemo(() => {

    if (user?.role === "senior_citizen_staff") {
      return "Senior Citizen Staff";
    }

    return user?.role || "Not available";

  }, [user]);

  /* =========================================
     RENDER
  ========================================= */

  return (

    <div className="scr-page scsp-page">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="scr-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

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
                onClick={() => navigateTo(item.path)}
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

      {/* MAIN */}

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
                Workspace <span>/</span> My Profile
              </div>

              <h2>My Profile</h2>

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

        {/* CONTENT */}

        <div className="scr-content scsp-content">

          {/* PAGE INTRO */}

          <section className="scr-heading scsp-heading">

            <div>

              <span className="scr-eyebrow">
                <span />
                STAFF WORKSPACE
              </span>

              <h1>My Profile</h1>

              <p>
                View your personal information and
                CivicFix staff account details.
              </p>

            </div>

            <button
              type="button"
              className="scr-refresh"
              onClick={() => loadProfile(true)}
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
                : "Refresh Profile"}

            </button>

          </section>

          {/* GLOBAL ERROR */}

          {error && (

            <div className="scr-alert scr-alert-error scsp-alert">

              <CircleAlert size={18} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadProfile(true)}
              >
                Retry
              </button>

            </div>

          )}

          {loading ? (

            <div className="scsp-loading">

              <RefreshCw
                size={30}
                className="scr-spin"
              />

              <h3>Loading your profile...</h3>

              <p>
                Please wait while we retrieve your account details.
              </p>

            </div>

          ) : (

            <>

              {/* PROFILE HERO */}

              <section className="scsp-profile-hero">

                <div className="scsp-profile-hero-main">

                  <div className="scsp-large-avatar">
                    {initials}
                  </div>

                  <div className="scsp-profile-hero-info">

                    <span className="scsp-profile-eyebrow">
                      CIVICFIX STAFF ACCOUNT
                    </span>

                    <h2>{getFullName(user)}</h2>

                    <p>
                      <Mail size={15} />
                      {user?.email || "Email not available"}
                    </p>

                    <div className="scsp-hero-badges">

                      <span className="scsp-role-badge">
                        <UserRound size={14} />
                        {roleLabel}
                      </span>

                      <StatusBadge
                        active={accountStatus}
                        activeText="Active Account"
                        inactiveText="Inactive Account"
                      />

                    </div>

                  </div>

                </div>

              </section>

              {/* PROFILE CONTENT GRID */}

              <div className="scsp-layout">

                {/* LEFT COLUMN */}

                <div className="scsp-main-column">

                  {/* PERSONAL INFORMATION */}

                  <section className="scsp-card">

                    <div className="scsp-card-heading">

                      <div className="scsp-card-heading-icon blue">
                        <UserRound size={20} />
                      </div>

                      <div>
                        <h3>Personal Information</h3>

                        <p>
                          Your registered personal account details.
                        </p>
                      </div>

                    </div>

                    <div className="scsp-info-grid">

                      <ProfileInfo
                        icon={User}
                        label="First Name"
                        value={user?.first_name}
                      />

                      <ProfileInfo
                        icon={User}
                        label="Last Name"
                        value={user?.last_name}
                      />

                      <ProfileInfo
                        icon={Mail}
                        label="Email Address"
                        value={user?.email}
                        description="Registered account email"
                      />

                      <ProfileInfo
                        icon={UserRound}
                        label="Account Role"
                        value={roleLabel}
                      />

                    </div>

                  </section>

                  {/* STAFF DETAILS */}

                  <section className="scsp-card">

                    <div className="scsp-card-heading">

                      <div className="scsp-card-heading-icon purple">
                        <BriefcaseBusiness size={20} />
                      </div>

                      <div>
                        <h3>Staff Information</h3>

                        <p>
                          Professional and assigned work details.
                        </p>
                      </div>

                    </div>

                    <div className="scsp-info-grid">

                      <ProfileInfo
                        icon={IdCard}
                        label="Staff ID"
                        value={
                          user?.id
                            ? `SC-${user.id}`
                            : "Not available"
                        }
                      />

                      <ProfileInfo
                        icon={BriefcaseBusiness}
                        label="Designation"
                        value={user?.designation}
                      />

                      <ProfileInfo
                        icon={Phone}
                        label="Phone Number"
                        value={user?.phone_number}
                      />

                      <ProfileInfo
                        icon={MapPin}
                        label="Assigned District"
                        value={user?.district}
                      />

                      <ProfileInfo
                        icon={MapPin}
                        label="Assigned State"
                        value={user?.state}
                      />

                      <ProfileInfo
                        icon={Building2}
                        label="Work Location"
                        value={user?.location}
                      />

                      <ProfileInfo
                        icon={UserRound}
                        label="Reporting Manager"
                        value={user?.manager_email}
                      />

                    </div>

                    

                  </section>

                </div>

                {/* RIGHT COLUMN */}

                <div className="scsp-side-column">

                  {/* ACCOUNT SECURITY */}

                  <section className="scsp-card">

                    <div className="scsp-card-heading">

                      <div className="scsp-card-heading-icon green">
                        <ShieldCheck size={20} />
                      </div>

                      <div>
                        <h3>Account Security</h3>

                        <p>
                          Your account verification information.
                        </p>
                      </div>

                    </div>

                    <div className="scsp-security-list">

                      <div className="scsp-security-item">

                        <div className="scsp-security-icon">
                          <MailCheck size={18} />
                        </div>

                        <div>
                          <strong>Email Verification</strong>

                          <span>
                            {isVerified
                              ? "Verified account"
                              : "Not verified"}
                          </span>
                        </div>

                        <StatusBadge
                          active={isVerified}
                          activeText="Verified"
                          inactiveText="Pending"
                        />

                      </div>

                      <div className="scsp-security-item">

                        <div className="scsp-security-icon">
                          <Fingerprint size={18} />
                        </div>

                        <div>
                          <strong>Google Account</strong>

                          <span>
                            {user?.google_linked
                              ? "Google account connected"
                              : "No Google account linked"}
                          </span>
                        </div>

                        <span
                          className={`scsp-small-status ${
                            user?.google_linked
                              ? "connected"
                              : "not-connected"
                          }`}
                        >
                          {user?.google_linked
                            ? "Linked"
                            : "Not linked"}
                        </span>

                      </div>

                      <div className="scsp-security-item">

                        <div className="scsp-security-icon">
                          <LockKeyhole size={18} />
                        </div>

                        <div>
                          <strong>Password Security</strong>

                          <span>
                            Password is managed by your CivicFix account.
                          </span>
                        </div>

                      </div>

                    </div>

                    

                  </section>

                  {/* ACCOUNT ACTIVITY */}

                  <section className="scsp-card">

                    <div className="scsp-card-heading">

                      <div className="scsp-card-heading-icon orange">
                        <Clock size={20} />
                      </div>

                      <div>
                        <h3>Account Activity</h3>

                        <p>
                          Important account information.
                        </p>
                      </div>

                    </div>

                    <div className="scsp-activity-list">

                      <div className="scsp-activity-item">

                        <div className="scsp-activity-icon">
                          <CalendarDays size={18} />
                        </div>

                        <div>
                          <span>Account Created</span>

                          <strong>
                            {formatDate(user?.date_joined)}
                          </strong>
                        </div>

                      </div>

                      <div className="scsp-activity-item">

                        <div className="scsp-activity-icon">
                          <BadgeCheck size={18} />
                        </div>

                        <div>
                          <span>Account Status</span>

                          <strong>
                            {accountStatus
                              ? "Active"
                              : "Inactive"}
                          </strong>
                        </div>

                      </div>

                      <div className="scsp-activity-item">

                        <div className="scsp-activity-icon">
                          <AtSign size={18} />
                        </div>

                        <div>
                          <span>Registered Email</span>

                          <strong className="scsp-email-value">
                            {user?.email || "Not available"}
                          </strong>
                        </div>

                      </div>

                    </div>

                  </section>

                  {/* ACCOUNT SUMMARY */}

                  <section className="scsp-account-summary">

                    <div className="scsp-summary-icon">
                      <HeartHandshake size={24} />
                    </div>

                    <h3>CivicFix Senior Care</h3>

                    <p>
                      Your staff account helps coordinate
                      assistance and support senior citizens
                      through the CivicFix platform.
                    </p>

                    <div className="scsp-summary-footer">

                      <ShieldCheck size={15} />

                      Secure Staff Workspace

                    </div>

                  </section>

                </div>

              </div>

            </>

          )}

          {/* FOOTER */}

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
