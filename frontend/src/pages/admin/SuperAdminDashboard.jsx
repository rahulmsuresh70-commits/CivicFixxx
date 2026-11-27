import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserRound,
  ShieldCheck,
  Building2,
  ClipboardList,
  HeartHandshake,
  Bell,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  CircleAlert,
  Activity,
  ArrowUpRight,
  UserCog,
  BriefcaseBusiness,
} from "lucide-react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./SuperAdminDashboard.css";

// SENIOR CITIZEN MANAGER MANAGEMENT
import SeniorCitizenManagerManagement from "./SeniorCitizenManagerManagement";

// SENIOR CITIZEN STAFF MANAGEMENT
import SeniorCitizenStaffManagement from "./SeniorCitizenStaffManagement";

// DEPARTMENT MANAGEMENT
import DepartmentManagement from "./DepartmentManagement";

// CIVICFIX REQUEST MANAGEMENT
import AdminCivicFixRequests from "./AdminCivicFixRequests";

// SENIOR ASSISTANCE MANAGEMENT
import SeniorAssistanceManagement from "./SeniorAssistanceManagement";

import AdminNotifications from "./AdminNotifications";

import AdminMessages from "./AdminMessages";
import AdminSettings from "./AdminSettings";
/* =========================================================
   SIDEBAR MENU ITEMS
========================================================= */

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    title: "User Management",
    icon: Users,
    path: "/admin/users",
  },
  {
    title: "Department Managers",
    icon: UserCog,
    path: "/admin/department-managers",
  },
  {
    title: "Department Staff",
    icon: BriefcaseBusiness,
    path: "/admin/department-staff",
  },
  {
    title: "Citizens",
    icon: UserRound,
    path: "/admin/citizens",
  },
  {
    title: "Senior Managers",
    icon: ShieldCheck,
    path: "/admin/senior-managers",
  },
  {
    title: "Senior Staff",
    icon: HeartHandshake,
    path: "/admin/senior-staff",
  },
  {
    title: "Departments",
    icon: Building2,
    path: "/admin/departments",
  },
  {
    title: "CivicFix Requests",
    icon: ClipboardList,
    path: "/admin/civicfix-requests",
  },
  {
    title: "Senior Assistance",
    icon: HeartHandshake,
    path: "/admin/senior-assistance",
  },
  {
    title: "Notifications",
    icon: Bell,
    path: "/admin/notifications",
  },
  {
    title: "Messages",
    icon: Mail,
    path: "/admin/messages",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/admin/settings",
  },
];


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

const statistics = [
  {
    title: "Total Users",
    value: "2,450",
    change: "+12.5%",
    positive: true,
    icon: Users,
    color: "blue",
  },
  {
    title: "Department Managers",
    value: "48",
    change: "+8.2%",
    positive: true,
    icon: UserCog,
    color: "purple",
  },
  {
    title: "Department Staff",
    value: "186",
    change: "+5.4%",
    positive: true,
    icon: BriefcaseBusiness,
    color: "orange",
  },
  {
    title: "Registered Citizens",
    value: "2,216",
    change: "+10.8%",
    positive: true,
    icon: UserRound,
    color: "green",
  },
];


/* =========================================================
   REQUEST STATISTICS
========================================================= */

const requestStatistics = [
  {
    title: "Total Requests",
    value: "1,284",
    icon: ClipboardList,
    color: "blue",
  },
  {
    title: "Pending Requests",
    value: "156",
    icon: Clock,
    color: "orange",
  },
  {
    title: "Completed Requests",
    value: "986",
    icon: CheckCircle2,
    color: "green",
  },
  {
    title: "Senior Assistance",
    value: "142",
    icon: HeartHandshake,
    color: "purple",
  },
];


/* =========================================================
   RECENT ACTIVITIES
========================================================= */

const recentActivities = [
  {
    title: "New citizen registered",
    description: "A new citizen account was created.",
    time: "10 minutes ago",
    icon: UserRound,
    color: "blue",
  },
  {
    title: "New department manager",
    description: "A department manager account was added.",
    time: "35 minutes ago",
    icon: UserCog,
    color: "purple",
  },
  {
    title: "CivicFix request submitted",
    description: "A new civic complaint was submitted.",
    time: "1 hour ago",
    icon: ClipboardList,
    color: "orange",
  },
  {
    title: "Senior assistance request",
    description: "A new senior assistance request was received.",
    time: "2 hours ago",
    icon: HeartHandshake,
    color: "green",
  },
];


/* =========================================================
   SUPER ADMIN DASHBOARD
========================================================= */

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [admin, setAdmin] = useState(null);


  /* =========================================================
     PAGE ROUTE DETECTION
  ========================================================= */

  const isSeniorManagersPage = location.pathname.startsWith(
    "/admin/senior-managers"
  );

  const isSeniorStaffPage = location.pathname.startsWith(
    "/admin/senior-staff"
  );

  const isDepartmentsPage = location.pathname.startsWith(
    "/admin/departments"
  );

  const isCivicFixRequestsPage = location.pathname.startsWith(
    "/admin/civicfix-requests"
  );

  const isSeniorAssistancePage = location.pathname.startsWith(
    "/admin/senior-assistance"
  );

  const isNotificationsPage = location.pathname.startsWith(
    "/admin/notifications"
  );
  const isMessagesPage = location.pathname.startsWith(
    "/admin/messages"
  );
  const isSettingsPage = location.pathname.startsWith(
    "/admin/settings"
  );
  /* =========================================================
     SUPER ADMIN AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    const token = localStorage.getItem("civicfix_access_token");

    let user = null;

    try {
      user = JSON.parse(
        localStorage.getItem("civicfix_user") || "null"
      );
    } catch {
      user = null;
    }

    if (
      !token ||
      !user ||
      String(user.role || "").toLowerCase() !== "super_admin"
    ) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setAdmin(user);
  }, [navigate]);


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    navigate("/admin/login", { replace: true });
  };


  /* =========================================================
     NAVIGATION
  ========================================================= */

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };


  /* =========================================================
     ADMIN INFORMATION
  ========================================================= */

  const adminName = admin
    ? `${admin.first_name || ""} ${admin.last_name || ""}`.trim() ||
      admin.email
    : "Super Admin";

  const adminInitials = adminName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  /* =========================================================
     MAIN RENDER
  ========================================================= */

  return (
    <div className="sa-layout">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (
        <div
          className="sa-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`sa-sidebar ${
          sidebarOpen ? "sa-sidebar-open" : ""
        }`}
      >

        {/* BRAND */}

        <div className="sa-brand">

          <div className="sa-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Administration</span>
          </div>

          <button
            className="sa-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>

        </div>


        {/* SIDEBAR LABEL */}

        <div className="sa-sidebar-label">
          MAIN MENU
        </div>


        {/* NAVIGATION */}

        <nav className="sa-navigation">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              location.pathname === item.path ||
              (item.path !== "/admin/dashboard" &&
                location.pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                className={`sa-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon size={19} />

                <span>{item.title}</span>

                {active && (
                  <span className="sa-active-indicator" />
                )}
              </button>
            );
          })}

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="sa-sidebar-bottom">

          {/* ADMIN PROFILE */}

          <div className="sa-sidebar-profile">

            <div className="sa-avatar">
              {adminInitials}
            </div>

            <div className="sa-profile-info">
              <strong>{adminName}</strong>
              <span>Super Administrator</span>
            </div>

          </div>


          {/* LOGOUT BUTTON */}

          <button
            className="sa-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="sa-main">


        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="sa-topbar">

          <div className="sa-topbar-left">

            {/* MOBILE MENU BUTTON */}

            <button
              className="sa-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={23} />
            </button>

            <div>
              <h1>Dashboard Overview</h1>
              <p>Manage and monitor your CivicFix platform.</p>
            </div>

          </div>


          {/* TOPBAR RIGHT */}

          <div className="sa-topbar-right">

            {/* SEARCH */}

            <div className="sa-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Search dashboard..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>


            {/* NOTIFICATIONS */}

            <button
              className="sa-notification-button"
              onClick={() =>
                handleNavigation("/admin/notifications")
              }
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span />
            </button>


            {/* ADMIN PROFILE */}

            <div className="sa-topbar-user">

              <div className="sa-avatar">
                {adminInitials}
              </div>

              <div>
                <strong>{adminName}</strong>
                <span>Super Admin</span>
              </div>

            </div>

          </div>

        </header>


        {/* ===================================================
            PAGE BODY

            1. Senior Managers
            2. Senior Staff
            3. Departments
            4. CivicFix Requests
            5. Senior Assistance
            6. Notifications
            7. Dashboard Overview
        =================================================== */}


        {/* SENIOR MANAGERS MANAGEMENT PAGE */}

        {isSeniorManagersPage ? (

          <SeniorCitizenManagerManagement />

        ) : isSeniorStaffPage ? (

          /* SENIOR STAFF MANAGEMENT PAGE */

          <SeniorCitizenStaffManagement />

        ) : isDepartmentsPage ? (

          /* DEPARTMENT MANAGEMENT PAGE */

          <DepartmentManagement />

        ) : isCivicFixRequestsPage ? (

          /* CIVICFIX REQUEST MANAGEMENT PAGE */

          <AdminCivicFixRequests />

        ) : isSeniorAssistancePage ? (

          /* SENIOR ASSISTANCE MANAGEMENT PAGE */

          <SeniorAssistanceManagement />

        ) : isNotificationsPage ? (

          /* NOTIFICATIONS MANAGEMENT PAGE */

          <AdminNotifications />

        ) : isMessagesPage ? (

          <AdminMessages />

        ) : isSettingsPage ? (

          <AdminSettings />

        ) : (

          /* =================================================
             MAIN DASHBOARD OVERVIEW
          ================================================= */

          <div className="sa-content">


            {/* ===============================================
                WELCOME SECTION
            =============================================== */}

            <section className="sa-welcome">

              <div>

                <span className="sa-welcome-label">
                  ADMINISTRATION PANEL
                </span>

                <h2>
                  Welcome back, {admin?.first_name || "Administrator"}!
                </h2>

                <p>
                  Here's what's happening across your CivicFix platform.
                </p>

              </div>

              <div className="sa-welcome-icon">
                <ShieldCheck size={45} />
              </div>

            </section>


            {/* ===============================================
                USER STATISTICS
            =============================================== */}

            <section className="sa-section">

              <div className="sa-section-heading">

                <div>
                  <h2>Platform Statistics</h2>
                  <p>Overview of registered platform accounts.</p>
                </div>

                <span className="sa-live-status">
                  <span />
                  Overview
                </span>

              </div>


              {/* STATISTICS GRID */}

              <div className="sa-stat-grid">

                {statistics
                  .filter((item) =>
                    item.title.toLowerCase().includes(
                      search.toLowerCase()
                    )
                  )
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        className="sa-stat-card"
                        key={item.title}
                      >

                        <div className="sa-stat-top">

                          <div className={`sa-stat-icon ${item.color}`}>
                            <Icon size={22} />
                          </div>

                          <span className="sa-stat-change">
                            <TrendingUp size={14} />
                            {item.change}
                          </span>

                        </div>

                        <h3>{item.value}</h3>

                        <p>{item.title}</p>

                        <div className="sa-stat-footer">
                          Platform account overview
                        </div>

                      </div>
                    );
                  })}

              </div>

            </section>


            {/* ===============================================
                REQUEST STATISTICS
            =============================================== */}

            <section className="sa-section">

              <div className="sa-section-heading">

                <div>
                  <h2>Service Overview</h2>
                  <p>
                    Monitor CivicFix and senior assistance activities.
                  </p>
                </div>

              </div>


              {/* REQUEST GRID */}

              <div className="sa-request-grid">

                {requestStatistics.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="sa-request-card"
                      key={item.title}
                    >

                      <div className={`sa-request-icon ${item.color}`}>
                        <Icon size={22} />
                      </div>

                      <div>
                        <h3>{item.value}</h3>
                        <p>{item.title}</p>
                      </div>

                      <ArrowUpRight
                        className="sa-request-arrow"
                        size={18}
                      />

                    </div>
                  );
                })}

              </div>

            </section>


            {/* ===============================================
                LOWER CONTENT
            =============================================== */}

            <div className="sa-bottom-grid">


              {/* =============================================
                  RECENT ACTIVITIES
              ============================================= */}

              <section className="sa-panel">

                <div className="sa-panel-heading">

                  <div>
                    <h2>Recent Activities</h2>
                    <p>Latest platform activity overview.</p>
                  </div>

                  <Activity size={20} />

                </div>


                {/* ACTIVITY LIST */}

                <div className="sa-activity-list">

                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon;

                    return (
                      <div
                        className="sa-activity-item"
                        key={index}
                      >

                        <div
                          className={`sa-activity-icon ${activity.color}`}
                        >
                          <Icon size={19} />
                        </div>

                        <div className="sa-activity-details">
                          <strong>{activity.title}</strong>
                          <p>{activity.description}</p>
                          <span>{activity.time}</span>
                        </div>

                      </div>
                    );
                  })}

                </div>

              </section>


              {/* =============================================
                  QUICK ACTIONS
              ============================================= */}

              <section className="sa-panel">

                <div className="sa-panel-heading">

                  <div>
                    <h2>Quick Actions</h2>
                    <p>Access important administration pages.</p>
                  </div>

                  <ArrowUpRight size={20} />

                </div>


                {/* QUICK ACTION BUTTONS */}

                <div className="sa-quick-actions">

                  <button
                    onClick={() =>
                      handleNavigation("/admin/users")
                    }
                  >
                    <Users size={19} />
                    <span>Manage Users</span>
                    <ArrowUpRight size={16} />
                  </button>


                  <button
                    onClick={() =>
                      handleNavigation("/admin/departments")
                    }
                  >
                    <Building2 size={19} />
                    <span>Manage Departments</span>
                    <ArrowUpRight size={16} />
                  </button>


                  <button
                    onClick={() =>
                      handleNavigation("/admin/civicfix-requests")
                    }
                  >
                    <ClipboardList size={19} />
                    <span>Manage CivicFix Requests</span>
                    <ArrowUpRight size={16} />
                  </button>


                  <button
                    onClick={() =>
                      handleNavigation("/admin/senior-assistance")
                    }
                  >
                    <HeartHandshake size={19} />
                    <span>Senior Assistance</span>
                    <ArrowUpRight size={16} />
                  </button>


                  <button
                    onClick={() =>
                      handleNavigation("/admin/messages")
                    }
                  >
                    <Mail size={19} />
                    <span>View Messages</span>
                    <ArrowUpRight size={16} />
                  </button>

                </div>

              </section>

            </div>


            {/* ===============================================
                FOOTER
            =============================================== */}

            <footer className="sa-footer">

              <span>
                © 2026 CivicFix. All rights reserved.
              </span>

              <span>
                Super Admin Control Panel
              </span>

            </footer>

          </div>

        )}

      </main>

    </div>
  );
}

export default SuperAdminDashboard;