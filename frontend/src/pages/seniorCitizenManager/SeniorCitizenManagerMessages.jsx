
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ChartNoAxesCombined,
  Bell,
  Mail,
   Activity,
  UserRound,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Headset,
  ArrowUpRight,
} from "lucide-react";

import "./SeniorCitizenManagerDashboard.css";
import useManagerUnreadNotifications from "./useManagerUnreadNotifications";
import SeniorCitizenManagerMessagesPanel
  from "./SeniorCitizenManagerMessagesPanel";

function SeniorCitizenManagerMessagesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useManagerUnreadNotifications();

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
    {
      name: "Work Management",
      icon: Activity,
      path: "/senior-citizen/manager/work-management",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
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

        <div className="sc-sidebar-label">
          WORKSPACE
        </div>

        <nav className="sc-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <button
                key={item.name}
                className={`sc-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon size={19} strokeWidth={1.8} />

                <span>{item.name}</span>

                {item.name === "Notifications" &&
                  unreadCount > 0 && (
                    <span className="sc-nav-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>
            
        <div className="sc-sidebar-label sc-management-label">
          ACCOUNT
        </div>

        <nav className="sc-nav">
          <button
            className="sc-nav-item"
            onClick={() =>
              handleNavigation(
                "/senior-citizen/manager/profile"
              )
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
                window.location.href =
                  "mailto:support@civicfix.in"
              }
            >
              Contact Support
              <ArrowUpRight size={14} />
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
                Workspace <span>/</span> Messages
              </div>

              <h2>Messages</h2>
            </div>
          </div>

          <div className="sc-header-right">
            <button
              type="button"
              className="sc-nav-item"
              onClick={() =>
                navigate(
                  "/senior-citizen/manager/notifications"
                )
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
                navigate(
                  "/senior-citizen/manager/profile"
                )
              }
            >
              <div className="sc-avatar">SM</div>

              <div className="sc-profile-info">
                <strong>Manager</strong>
                <span>Senior Citizen Manager</span>
              </div>
            </button>
          </div>
        </header>

        {/* Messages Page */}
        <div className="sc-content">

          <section className="sc-welcome-section">
            <div>
              <div className="sc-welcome-tag">
                <span className="sc-live-dot" />
                COMMUNICATION CENTER
              </div>

              <h1>Messages</h1>

              <p>
                Communicate with your senior citizen
                assistance team.
              </p>
            </div>
          </section>

          <section className="sc-messages-section">
            <SeniorCitizenManagerMessagesPanel />
          </section>

          <footer className="sc-footer">
            <span>
              © 2026 CivicFix. All rights reserved.
            </span>

            <span>
              Senior Citizen Assistance Management Portal
            </span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default SeniorCitizenManagerMessagesPage;
