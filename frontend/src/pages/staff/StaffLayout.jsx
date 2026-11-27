import { useEffect, useState } from 'react';

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  MessageSquare,
  UserRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Building2,
  ChevronRight,
} from 'lucide-react';

import './StaffDashboard.css';
import './StaffLayout.css';

const NAV_ITEMS = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    path: '/staff/dashboard',
  },
  {
    label: 'My Assigned Complaints',
    icon: ClipboardList,
    path: '/staff/complaints',
  },
  {
    label: 'Notifications',
    icon: Bell,
    path: '/staff/notifications',
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    path: '/staff/messages',
  },
  {
    label: 'My Profile',
    icon: UserRound,
    path: '/staff/profile',
  },
];

function getPageTitle(pathname) {
  const currentItem = NAV_ITEMS.find(
    (item) => item.path === pathname
  );

  return currentItem?.label || 'Staff Portal';
}

export default function StaffLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staffUser, setStaffUser] = useState(null);

  /* =====================================
     AUTHENTICATION
  ===================================== */

  useEffect(() => {
    const token = localStorage.getItem('civicfix_access_token');

    try {
      const user = JSON.parse(
        localStorage.getItem('civicfix_user') || 'null'
      );

      if (!token || !user) {
        navigate('/staff/login', { replace: true });
        return;
      }

      if (
        String(user.role || '').toLowerCase() !== 'staff'
      ) {
        navigate('/staff/login', { replace: true });
        return;
      }

      setStaffUser(user);
    } catch {
      navigate('/staff/login', { replace: true });
    }
  }, [navigate]);

  /* =====================================
     STAFF INFORMATION
  ===================================== */

  const staffName =
    staffUser?.name ||
    `${staffUser?.first_name || ''} ${
      staffUser?.last_name || ''
    }`.trim() ||
    'Staff Member';

  const staffInitials = staffName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  /* =====================================
     NAVIGATION
  ===================================== */

  const handleNavigation = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  /* =====================================
     LOGOUT
  ===================================== */

  const handleLogout = () => {
    localStorage.removeItem('civicfix_access_token');
    localStorage.removeItem('civicfix_refresh_token');
    localStorage.removeItem('civicfix_user');

    navigate('/staff/login', { replace: true });
  };

  /* =====================================
     PAGE TITLE
  ===================================== */

  const pageTitle = getPageTitle(location.pathname);

  /* =====================================
     LAYOUT
  ===================================== */

  return (
    <div className="staff-dashboard staff-layout">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="staff-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =================================
          SIDEBAR
      ================================= */}

      <aside
        className={`staff-sidebar ${
          sidebarOpen ? 'staff-sidebar-open' : ''
        }`}
      >

        {/* BRAND */}

        <div className="staff-brand">

          <div className="staff-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div className="staff-brand-text">
            <h2>
              Civic<span>Fix</span>
            </h2>

            <p>STAFF PORTAL</p>
          </div>

          <button
            type="button"
            className="staff-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>

        </div>

        {/* NAVIGATION */}

        <div className="staff-sidebar-section">

          <span className="staff-sidebar-label">
            WORKSPACE
          </span>

          <nav className="staff-navigation">

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `staff-nav-item ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  <Icon size={19} />

                  <span>{item.label}</span>

                  {location.pathname === item.path && (
                    <span className="staff-nav-indicator" />
                  )}
                </NavLink>
              );
            })}

          </nav>

        </div>

        {/* SIDEBAR BOTTOM */}

        <div className="staff-sidebar-bottom">

          <div className="staff-sidebar-help">

            <div className="staff-help-icon">
              <Building2 size={20} />
            </div>

            <strong>Staff Workspace</strong>

            <p>
              Manage your assigned civic complaints.
            </p>

          </div>

          <button
            type="button"
            className="staff-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />

            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* =================================
          MAIN CONTENT
      ================================= */}

      <main className="staff-main">

        {/* PERSISTENT HEADER */}

        <header className="staff-header">

          <div className="staff-header-left">

            <button
              type="button"
              className="staff-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>

            <div>

              <div className="staff-breadcrumb">
                Staff Portal

                <ChevronRight size={14} />

                {pageTitle}
              </div>

              <h1>{pageTitle}</h1>

            </div>

          </div>

          <div className="staff-header-right">

            <div className="staff-header-user">

              <div className="staff-avatar">
                {staffInitials || 'ST'}
              </div>

              <div className="staff-header-user-info">
                <strong>{staffName}</strong>
                <span>Department Staff</span>
              </div>

            </div>

          </div>

        </header>

        {/* =================================
            DYNAMIC PAGE CONTENT

            Only this section changes
            during staff navigation.
        ================================= */}

        <div className="staff-layout-content">
          <Outlet />
        </div>

      </main>

    </div>
  );
}