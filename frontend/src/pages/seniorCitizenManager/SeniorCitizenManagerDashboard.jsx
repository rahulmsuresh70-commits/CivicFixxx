import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ChartNoAxesCombined,
  Bell,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  CircleAlert,
  UserRound,
  MapPin,
  CalendarDays,
  MoreHorizontal,
  Plus,
  Activity,
  Headset,
  HeartHandshake,
  TrendingUp,
  FileText,
} from "lucide-react";

import "./SeniorCitizenManagerDashboard.css";
import useManagerUnreadNotifications from "./useManagerUnreadNotifications";
import Manager2Analytics from "./Manager2analytics";
import api, { getApiErrorMessage } from "../../api/axios";
import SeniorCitizenManagerProfile from "./SeniorCitizenManagerProfile";
import { NavLink } from "react-router-dom";
const requests = [
  {
    id: "SC-2026-1042",
    name: "Mary Thomas",
    service: "Medical Assistance",
    district: "Kottayam",
    date: "04 Nov 2026",
    status: "Pending",
    priority: "High",
  },
  {
    id: "SC-2026-1041",
    name: "Joseph Mathew",
    service: "Daily Living Support",
    district: "Ernakulam",
    date: "04 Nov 2026",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "SC-2026-1040",
    name: "Anna George",
    service: "Transportation",
    district: "Pathanamthitta",
    date: "03 Nov 2026",
    status: "Assigned",
    priority: "Normal",
  },
  {
    id: "SC-2026-1039",
    name: "Thomas Varghese",
    service: "Emergency Assistance",
    district: "Idukki",
    date: "03 Nov 2026",
    status: "In Progress",
    priority: "High",
  },
];

const staff = [
  {
    name: "Anjali Joseph",
    role: "Senior Citizen Staff",
    initials: "AJ",
    assigned: 18,
    completed: 14,
    color: "purple",
  },
  {
    name: "David Thomas",
    role: "Senior Citizen Staff",
    initials: "DT",
    assigned: 15,
    completed: 12,
    color: "blue",
  },
  {
    name: "Maria George",
    role: "Senior Citizen Staff",
    initials: "MG",
    assigned: 12,
    completed: 10,
    color: "orange",
  },
];

function SeniorCitizenManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get the actual unread notification count
  const { unreadCount } = useManagerUnreadNotifications();

  // React Router navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Live analytics data (same endpoint the Assistance Requests page uses)
  const [liveRequests, setLiveRequests] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  const isProfilePage =
    location.pathname === "/senior-citizen/manager/profile";

  const loadAnalytics = useCallback(async (silent = false) => {
    if (!silent) {
      setAnalyticsLoading(true);
    }

    try {
      const response = await api.get("/senior-citizen/");

      setLiveRequests(
        Array.isArray(response.data) ? response.data : []
      );
      setAnalyticsError("");
    } catch (err) {
      setAnalyticsError(getApiErrorMessage(err));
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isProfilePage) {
      loadAnalytics();
    }
  }, [isProfilePage, loadAnalytics]);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/senior-citizen/manager/dashboard",
    },
    {
      name: "Assistance Requests",
      icon: ClipboardList,
      path: "/senior-citizen/manager/requests",
    },
    {
      name: "Staff Management",
      icon: Users,
      path: "/senior-citizen/manager/staff",
    },
    {
      name: "Progress Tracking",
      icon: ChartNoAxesCombined,
      path: "/senior-citizen/manager/progress",
    },
    {
      name: "Notifications",
      icon: Bell,
      path: "/senior-citizen/manager/notifications",
    },
    {
      name: "Messages",
      icon: Mail,
      path: "/senior-citizen/manager/messages",
    },
  ];

  // Determine active sidebar item from current URL
  const activeMenu =
    menuItems.find((item) => item.path === location.pathname)?.name ||
    (location.pathname === "/senior-citizen/manager/profile"
      ? "Manager Profile"
      : location.pathname === "/senior-citizen/manager/settings"
      ? "Settings"
      : "");

  // Updated navigation function
  const handleNavigation = (item) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("civicfix_access_token");
    localStorage.removeItem("civicfix_refresh_token");
    localStorage.removeItem("civicfix_user");

    window.location.href = "/senior-citizen/manager/login";
  };

  return (
    <div className="sc-dashboard">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sc-sidebar ${
          sidebarOpen ? "sc-sidebar-open" : ""
        }`}
      >
        <div className="sc-brand">
          <div className="sc-brand-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <h2>CivicFix</h2>
            <span>Senior Care Portal</span>
          </div>

          <button
            className="sc-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="sc-sidebar-label">WORKSPACE</div>

        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`sc-nav-item ${
                  activeMenu === item.name ? "active" : ""
                }`}
                onClick={() => handleNavigation(item)}
              >
                <Icon size={19} strokeWidth={1.8} />

                <span>{item.name}</span>

                {/* Actual unread notification count */}
                {item.name === "Notifications" && unreadCount > 0 && (
                  <span className="sc-nav-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
          <button
            type="button"
            className={`sc-nav-item ${
              location.pathname ===
              "/senior-citizen/manager/work-management"
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate("/senior-citizen/manager/work-management");
              setSidebarOpen(false);
            }}
          >
            <ChartNoAxesCombined size={19} strokeWidth={1.8} />
            <span>Work Management</span>
          </button>
        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">

          <button
            className={`sc-nav-item ${
              activeMenu === "Manager Profile" ? "active" : ""
            }`}
            onClick={() =>
              handleNavigation({
                name: "Manager Profile",
                path: "/senior-citizen/manager/profile",
              })
            }
          >
            <UserRound size={19} />
            <span>Manager Profile</span>
          </button>

          
        </nav>

        <div className="sc-sidebar-bottom">

          <div className="sc-help-card">
            <div className="sc-help-icon">
              <Headset size={20} />
            </div>

            <h4>Need assistance?</h4>

            <p>
              Contact the CivicFix support team.
            </p>

            <button
              onClick={() =>
                window.location.href = "mailto:support@civicfix.in"
              }
            >
              Contact Support <ArrowUpRight size={14} />
            </button>
          </div>

          <button
            className="sc-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

        </div>
      </aside>

      {/* Main Content */}
      <main className="sc-main">

        {/* Header */}
        <header className="sc-header">

          <div className="sc-header-left">

            <button
              className="sc-menu-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="sc-breadcrumb">
                Workspace <span>/</span>{" "}
                {location.pathname === "/senior-citizen/manager/profile"
                  ? "Manager Profile"
                  : "Dashboard"}
              </div>

              <h2>
                {location.pathname === "/senior-citizen/manager/profile"
                  ? "Manager Profile"
                  : "Dashboard Overview"}
              </h2>
            </div>

          </div>

          <div className="sc-header-right">

            <div className="sc-search">
              <Search size={17} />
              <input placeholder="Search anything..." />
              <span>⌘ K</span>
            </div>

            <button
              type="button"
              className="sc-nav-item"
              onClick={() =>
                navigate("/senior-citizen/manager/notifications")
              }
            >
              <Bell size={19} />
              <span>Notifications</span>

              {unreadCount > 0 && (
                <span className="scmn-nav-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="sc-header-divider" />

            <button
              className="sc-profile-button"
              onClick={() =>
                handleNavigation({
                  name: "Manager Profile",
                  path: "/senior-citizen/manager/profile",
                })
              }
            >
              <div className="sc-avatar">SM</div>

              <div className="sc-profile-info">
                <strong>Manager</strong>
                <span>Senior Citizen Manager</span>
              </div>

              <ChevronDown size={16} />
            </button>

          </div>
        </header>

        {/* Dashboard Content */}
        <div className="sc-content">

          {location.pathname === "/senior-citizen/manager/profile" ? (
            <SeniorCitizenManagerProfile />
          ) : (
            <>
          {/* Welcome */}
          <section className="sc-welcome-section">

            <div>
              <div className="sc-welcome-tag">
                <span className="sc-live-dot" />
                MANAGEMENT OVERVIEW
              </div>

              <h1>Welcome back, Manager 👋</h1>

              <p>
                Here's what's happening with senior citizen assistance
                services in your assigned district.
              </p>
            </div>

            <div className="sc-date-display">
              <CalendarDays size={18} />
              <span>Wednesday, November 04, 2026</span>
            </div>

          </section>

          {/* Stats */}
          <section className="sc-stats-grid">

            <div className="sc-stat-card">
              <div className="sc-stat-top">
                <div className="sc-stat-icon blue">
                  <ClipboardList size={21} />
                </div>

                <span className="sc-stat-trend positive">
                  <ArrowUpRight size={15} /> 12.5%
                </span>
              </div>

              <p>Total Requests</p>
              <h2>248</h2>

              <span className="sc-stat-caption">
                Compared to last month
              </span>
            </div>

            <div className="sc-stat-card">
              <div className="sc-stat-top">
                <div className="sc-stat-icon orange">
                  <Clock size={21} />
                </div>

                <span className="sc-stat-trend negative">
                  <ArrowUpRight size={15} /> 8.2%
                </span>
              </div>

              <p>Pending Requests</p>
              <h2>36</h2>

              <span className="sc-stat-caption">
                Awaiting manager review
              </span>
            </div>

            <div className="sc-stat-card">
              <div className="sc-stat-top">
                <div className="sc-stat-icon green">
                  <CheckCircle2 size={21} />
                </div>

                <span className="sc-stat-trend positive">
                  <ArrowUpRight size={15} /> 16.8%
                </span>
              </div>

              <p>Completed Requests</p>
              <h2>172</h2>

              <span className="sc-stat-caption">
                Successfully completed
              </span>
            </div>

            <div className="sc-stat-card">
              <div className="sc-stat-top">
                <div className="sc-stat-icon purple">
                  <Users size={21} />
                </div>

                <span className="sc-stat-trend positive">
                  <ArrowUpRight size={15} /> 4.3%
                </span>
              </div>

              <p>Active Staff</p>
              <h2>18</h2>

              <span className="sc-stat-caption">
                Currently available staff
              </span>
            </div>

          </section>

          {/* Live Analytics */}
          <Manager2Analytics
            requests={liveRequests}
            loading={analyticsLoading}
            error={analyticsError}
            onRefresh={() => loadAnalytics(true)}
          />

          {/* Main Grid */}
          <section className="sc-overview-grid">

            {/* Request Overview */}
            <div className="sc-panel sc-request-overview">

              <div className="sc-panel-heading">

                <div>
                  <h3>Assistance Overview</h3>
                  <p>Summary of request statuses</p>
                </div>

                <button className="sc-period-button">
                  This Month <ChevronDown size={15} />
                </button>

              </div>

              <div className="sc-overview-body">

                <div className="sc-chart-container">
                  <div className="sc-donut">

                    <div className="sc-donut-inner">
                      <strong>248</strong>
                      <span>Total Requests</span>
                    </div>

                  </div>
                </div>

                <div className="sc-chart-legend">

                  <div>
                    <span className="sc-legend-dot completed" />
                    <span>Completed</span>
                    <strong>172</strong>
                  </div>

                  <div>
                    <span className="sc-legend-dot pending" />
                    <span>Pending</span>
                    <strong>36</strong>
                  </div>

                  <div>
                    <span className="sc-legend-dot progress" />
                    <span>In Progress</span>
                    <strong>28</strong>
                  </div>

                  <div>
                    <span className="sc-legend-dot rejected" />
                    <span>Other</span>
                    <strong>12</strong>
                  </div>

                </div>

              </div>
            </div>

            {/* District Summary */}
            <div className="sc-panel sc-district-panel">

              <div className="sc-panel-heading">

                <div>
                  <h3>District Overview</h3>
                  <p>Your assigned service area</p>
                </div>

                <MapPin
                  size={20}
                  className="sc-heading-icon"
                />

              </div>

              <div className="sc-district-card">

                <div className="sc-district-location">

                  <div className="sc-location-icon">
                    <MapPin size={22} />
                  </div>

                  <div>
                    <span>ASSIGNED DISTRICT</span>
                    <h2>Kottayam</h2>
                    <p>Kerala, India</p>
                  </div>

                </div>

                <div className="sc-district-stats">

                  <div>
                    <strong>248</strong>
                    <span>Total Requests</span>
                  </div>

                  <div>
                    <strong>18</strong>
                    <span>Active Staff</span>
                  </div>

                </div>

                <div className="sc-district-footer">
                  <Activity size={16} />
                  <span>District service monitoring</span>
                  <span className="sc-monitoring-status">
                    Active
                  </span>
                </div>

              </div>
            </div>

          </section>

          {/* Requests Table */}
          <section className="sc-panel sc-table-panel">

            <div className="sc-panel-heading">

              <div>
                <h3>Recent Assistance Requests</h3>
                <p>
                  Monitor and manage the latest citizen requests.
                </p>
              </div>

              <button
                className="sc-view-all"
                onClick={() =>
                  handleNavigation({
                    name: "Assistance Requests",
                    path: "/senior-citizen/manager/requests",
                  })
                }
              >
                View All <ArrowUpRight size={16} />
              </button>

            </div>

            <div className="sc-table-wrapper">

              <table className="sc-table">

                <thead>
                  <tr>
                    <th>REQUEST ID</th>
                    <th>CITIZEN</th>
                    <th>SERVICE TYPE</th>
                    <th>DISTRICT</th>
                    <th>DATE</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>

                  {requests.map((request) => (

                    <tr key={request.id}>

                      <td className="sc-request-id">
                        {request.id}
                      </td>

                      <td>
                        <div className="sc-citizen-cell">

                          <div className="sc-citizen-avatar">
                            {request.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>

                          <strong>{request.name}</strong>

                        </div>
                      </td>

                      <td>{request.service}</td>
                      <td>{request.district}</td>
                      <td>{request.date}</td>

                      <td>
                        <span
                          className={`sc-priority ${request.priority.toLowerCase()}`}
                        >
                          {request.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`sc-status ${request.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          <span />
                          {request.status}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>

          {/* Bottom Grid */}
          <section className="sc-bottom-grid">

            {/* Staff Performance */}
            <div className="sc-panel sc-staff-panel">

              <div className="sc-panel-heading">

                <div>
                  <h3>Staff Performance</h3>
                  <p>
                    Assigned and completed assistance tasks
                  </p>
                </div>

                <button className="sc-icon-button">
                  <MoreHorizontal size={20} />
                </button>

              </div>

              <div className="sc-staff-list">

                {staff.map((person) => (

                  <div
                    className="sc-staff-item"
                    key={person.name}
                  >

                    <div
                      className={`sc-staff-avatar ${person.color}`}
                    >
                      {person.initials}
                    </div>

                    <div className="sc-staff-details">

                      <div className="sc-staff-name">
                        <strong>{person.name}</strong>

                        <span>
                          {person.completed}/{person.assigned} completed
                        </span>
                      </div>

                      <div className="sc-progress-track">

                        <div
                          className="sc-progress-fill"
                          style={{
                            width: `${
                              (person.completed / person.assigned) * 100
                            }%`,
                          }}
                        />

                      </div>

                      <span className="sc-staff-role">
                        {person.role}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

              <button
                className="sc-manage-staff"
                onClick={() =>
                  handleNavigation({
                    name: "Staff Management",
                    path: "/senior-citizen/manager/staff",
                  })
                }
              >
                Manage Staff <ArrowUpRight size={16} />
              </button>

            </div>

            {/* Notifications */}
            <div className="sc-panel sc-activity-panel">

              <div className="sc-panel-heading">

                <div>
                  <h3>Recent Activity</h3>
                  <p>Latest updates and notifications</p>
                </div>

                <button className="sc-icon-button">
                  <MoreHorizontal size={20} />
                </button>

              </div>

              <div className="sc-activity-list">

                <div className="sc-activity-item">

                  <div className="sc-activity-icon blue">
                    <FileText size={17} />
                  </div>

                  <div>
                    <strong>New assistance request</strong>
                    <p>
                      A new medical assistance request was submitted.
                    </p>
                    <span>10 minutes ago</span>
                  </div>

                </div>

                <div className="sc-activity-item">

                  <div className="sc-activity-icon green">
                    <CheckCircle2 size={17} />
                  </div>

                  <div>
                    <strong>Request completed</strong>
                    <p>
                      Staff successfully completed an assigned request.
                    </p>
                    <span>35 minutes ago</span>
                  </div>

                </div>

                <div className="sc-activity-item">

                  <div className="sc-activity-icon orange">
                    <CircleAlert size={17} />
                  </div>

                  <div>
                    <strong>Pending approval</strong>
                    <p>
                      There are requests waiting for your review.
                    </p>
                    <span>1 hour ago</span>
                  </div>

                </div>

              </div>

              <button
                className="sc-manage-staff"
                onClick={() =>
                  handleNavigation({
                    name: "Notifications",
                    path: "/senior-citizen/manager/notifications",
                  })
                }
              >
                View Notifications <ArrowUpRight size={16} />
              </button>

            </div>

          </section>
      
          

          {/* Footer */}
          <footer className="sc-footer">
            <span>
              © 2026 CivicFix. All rights reserved.
            </span>

            <span>
              Senior Citizen Assistance Management Portal
            </span>
          </footer>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
  
export default SeniorCitizenManagerDashboard;