import {
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

// Public pages
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import HowItWorks from "./pages/public/HowItWorks";
import Departments from "./pages/public/Departments";
import Contact from "./pages/public/Contact";

// Citizen authentication
import CitizenLogin, {
  GoogleAuthCallback,
} from "./pages/auth/CitizenLogin";

import CitizenRegister from "./pages/auth/CitizenRegister";
import EmailVerification from "./pages/auth/EmailVerification";

// Citizen dashboard
import CitizenDashboard from "./pages/user/CitizenDashboard";

// Department Manager authentication
import DepartmentManagerLogin, {
  DepartmentManagerGoogleAuthCallback,
} from "./pages/auth/DepartmentManagerLogin";

import DepartmentManagerRegister from "./pages/auth/DepartmentManagerRegister";
import DepartmentManagerVerifyEmail from "./pages/auth/DepartmentManagerVerifyEmail";

// Department Manager pages
import DepartmentDashboard from "./pages/department/DepartmentDashboard";
import DepartmentComplaints from "./pages/department/DepartmentComplaints";
import DepartmentStaff from "./pages/department/DepartmentStaff";
import DepartmentReopened from "./pages/department/DepartmentReopened";
import DepartmentNotifications from "./pages/department/DepartmentNotifications";
import DepartmentMessages from "./pages/department/DepartmentMessages";
import DepartmentProfile from "./pages/department/DepartmentProfile";
import StaffWorkTracking from "./pages/department/StaffWorkTracking";

// Department Staff authentication
import StaffLogin from "./pages/staff/StaffLogin";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffAssignedComplaints from "./pages/staff/StaffAssignedComplaints";
import StaffLayout from "./pages/staff/StaffLayout";
import StaffNotifications from "./pages/staff/StaffNotifications";
import StaffMessages from "./pages/staff/StaffMessages";
import StaffProfile from "./pages/staff/StaffProfile";

// Senior Citizen Manager authentication
import SeniorCitizenManagerLogin, {
  SeniorCitizenManagerGoogleAuthCallback,
} from "./pages/seniorCitizenManager/SeniorCitizenManagerLogin";

import SeniorCitizenManagerRegister from "./pages/seniorCitizenManager/SeniorCitizenManagerRegister";

// Senior Citizen Manager pages
import SeniorCitizenManagerDashboard from "./pages/seniorCitizenManager/SeniorCitizenManagerDashboard";
import SeniorCitizenManagerRequests from "./pages/seniorCitizenManager/SeniorCitizenManagerRequests";
import SeniorCitizenManagerStaff from "./pages/seniorCitizenManager/SeniorCitizenManagerStaff";
import SeniorCitizenManagerProgress from "./pages/seniorCitizenManager/SeniorCitizenManagerProgress";
import SeniorCitizenManagerNotifications from "./pages/seniorCitizenManager/SeniorCitizenManagerNotifications";
import SeniorCitizenManagerMessagesPage from "./pages/seniorCitizenManager/SeniorCitizenManagerMessages";
import SeniorCitizenManagerWorkManagement from "./pages/seniorCitizenManager/SeniorCitizenManagerWorkManagement";

// Senior Citizen Staff pages
import SeniorCitizenStaffLogin from "./pages/seniorCitizenStaff/SeniorCitizenStaffLogin";
import SeniorCitizenStaffDashboard from "./pages/seniorCitizenStaff/SeniorCitizenStaffDashboard";
import SeniorCitizenStaffRequests from "./pages/seniorCitizenStaff/SeniorCitizenStaffRequests";
import SeniorCitizenStaffMessages from "./pages/seniorCitizenStaff/SeniorCitizenStaffMessages";
import SeniorCitizenStaffNotifications from "./pages/seniorCitizenStaff/SeniorCitizenStaffNotifications";
import SeniorCitizenStaffProfile from "./pages/seniorCitizenStaff/SeniorCitizenStaffProfile";

// Super Admin pages
import SuperAdminLogin from "./pages/admin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import DepartmentManagerManagement from "./pages/admin/DepartmentManagerManagement";
import DepartmentStaffManagement from "./pages/admin/DepartmentStaffManagement";
import CitizenManagement from "./pages/admin/CitizenManagement";


/* =========================================================
   COMING SOON COMPONENT
========================================================= */

function ComingSoon({ title }) {
  return (
    <main
      className="container"
      style={{ paddingBlock: 100 }}
    >
      <span className="eyebrow">
        CivicFix
      </span>

      <h1 style={{ fontSize: 36 }}>
        {title}
      </h1>

      <p
        style={{
          color: "#6C757D",
          maxWidth: 550,
        }}
      >
        This page has not been implemented yet.
        It will be completed in the corresponding phase.
      </p>

      <Link
        to="/"
        className="button button-primary"
      >
        Return to Home
      </Link>
    </main>
  );
}


/* =========================================================
   GOOGLE CALLBACK ROUTER

   Selects the correct callback based on the portal
   saved before starting Google authentication.
========================================================= */

function GoogleCallbackRouter() {
  const googleRole = sessionStorage.getItem(
    "civicfix_google_role"
  );

  if (googleRole === "manager") {
    return <DepartmentManagerGoogleAuthCallback />;
  }

  if (googleRole === "senior_citizen_manager") {
    return <SeniorCitizenManagerGoogleAuthCallback />;
  }

  return <GoogleAuthCallback />;
}


/* =========================================================
   MAIN APPLICATION ROUTES
========================================================= */

export default function App() {
  return (
    <Routes>

      {/* ===================================================
          PUBLIC WEBSITE
      =================================================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/about"
        element={<About />}
      />

      <Route
        path="/how-it-works"
        element={<HowItWorks />}
      />

      <Route
        path="/departments"
        element={<Departments />}
      />

      <Route
        path="/contact"
        element={<Contact />}
      />


      {/* ===================================================
          CITIZEN AUTHENTICATION
      =================================================== */}

      <Route
        path="/login"
        element={<CitizenLogin />}
      />

      <Route
        path="/register"
        element={<CitizenRegister />}
      />

      <Route
        path="/verify-email"
        element={<EmailVerification />}
      />


      {/* ===================================================
          CITIZEN DASHBOARD
      =================================================== */}

      <Route
        path="/user/*"
        element={<CitizenDashboard />}
      />


      {/* ===================================================
          DEPARTMENT MANAGER
      =================================================== */}

      <Route
        path="/department/login"
        element={<DepartmentManagerLogin />}
      />

      <Route
        path="/department/register"
        element={<DepartmentManagerRegister />}
      />

      <Route
        path="/department/verify-email"
        element={<DepartmentManagerVerifyEmail />}
      />

      <Route
        path="/department/dashboard"
        element={<DepartmentDashboard />}
      />

      <Route
        path="/department/complaints"
        element={<DepartmentComplaints />}
      />

      <Route
        path="/department/staff"
        element={<DepartmentStaff />}
      />

      <Route
        path="/department/staff-work-tracking"
        element={<StaffWorkTracking />}
      />

      <Route
        path="/department/reopened"
        element={<DepartmentReopened />}
      />

      <Route
        path="/department/notifications"
        element={<DepartmentNotifications />}
      />

      <Route
        path="/department/messages"
        element={<DepartmentMessages />}
      />

      <Route
        path="/department/profile"
        element={<DepartmentProfile />}
      />


      {/* ===================================================
          DEPARTMENT STAFF
      =================================================== */}

      <Route
        path="/staff/login"
        element={<StaffLogin />}
      />

      <Route
        path="/staff"
        element={<StaffLayout />}
      >

        <Route
          index
          element={
            <Navigate
              to="dashboard"
              replace
            />
          }
        />

        <Route
          path="dashboard"
          element={<StaffDashboard />}
        />

        <Route
          path="complaints"
          element={<StaffAssignedComplaints />}
        />

        <Route
          path="notifications"
          element={<StaffNotifications />}
        />

        <Route
          path="messages"
          element={<StaffMessages />}
        />

        <Route
          path="profile"
          element={<StaffProfile />}
        />

      </Route>


      {/* ===================================================
          SENIOR CITIZEN MANAGER
      =================================================== */}

      <Route
        path="/senior-citizen/manager/login"
        element={<SeniorCitizenManagerLogin />}
      />

      <Route
        path="/senior-citizen/manager/register"
        element={<SeniorCitizenManagerRegister />}
      />

      <Route
        path="/senior-citizen/manager/dashboard"
        element={<SeniorCitizenManagerDashboard />}
      />

      <Route
        path="/senior-citizen/manager/requests"
        element={<SeniorCitizenManagerRequests />}
      />

      <Route
        path="/senior-citizen/manager/staff"
        element={<SeniorCitizenManagerStaff />}
      />

      <Route
        path="/senior-citizen/manager/progress"
        element={<SeniorCitizenManagerProgress />}
      />

      <Route
        path="/senior-citizen/manager/notifications"
        element={<SeniorCitizenManagerNotifications />}
      />

      <Route
        path="/senior-citizen/manager/messages"
        element={<SeniorCitizenManagerMessagesPage />}
      />

      <Route
        path="/senior-citizen/manager/work-management"
        element={<SeniorCitizenManagerWorkManagement />}
      />

      <Route
        path="/senior-citizen/manager/profile"
        element={<SeniorCitizenManagerDashboard />}
      />


      {/* ===================================================
          SENIOR CITIZEN STAFF
      =================================================== */}

      <Route
        path="/senior-citizen/staff/login"
        element={<SeniorCitizenStaffLogin />}
      />

      <Route
        path="/senior-citizen/staff/dashboard"
        element={<SeniorCitizenStaffDashboard />}
      />

      <Route
        path="/senior-citizen/staff/requests"
        element={<SeniorCitizenStaffRequests />}
      />

      <Route
        path="/senior-citizen/staff/messages"
        element={<SeniorCitizenStaffMessages />}
      />

      <Route
        path="/senior-citizen/staff/notifications"
        element={<SeniorCitizenStaffNotifications />}
      />

      <Route
        path="/senior-citizen/staff/profile"
        element={<SeniorCitizenStaffProfile />}
      />


      {/* ===================================================
          SUPER ADMIN
      =================================================== */}

      <Route
        path="/admin/login"
        element={<SuperAdminLogin />}
      />

      <Route
        path="/admin"
        element={
          <Navigate
            to="/admin/dashboard"
            replace
          />
        }
      />


      {/* ===================================================
          SUPER ADMIN - USER MANAGEMENT
      =================================================== */}

      <Route
        path="/admin/users"
        element={<UserManagement />}
      />

      <Route
        path="/admin/citizens"
        element={<CitizenManagement />}
      />


      {/* ===================================================
          SUPER ADMIN - DEPARTMENT MANAGERS
      =================================================== */}

      <Route
        path="/admin/managers"
        element={<DepartmentManagerManagement />}
      />

      <Route
        path="/admin/department-managers"
        element={<DepartmentManagerManagement />}
      />


      {/* ===================================================
          SUPER ADMIN - DEPARTMENT STAFF
      =================================================== */}

      <Route
        path="/admin/staff"
        element={<DepartmentStaffManagement />}
      />

      <Route
        path="/admin/department-staff"
        element={<DepartmentStaffManagement />}
      />


      {/* ===================================================
          SUPER ADMIN - DEPARTMENT MANAGEMENT
      =================================================== */}

      <Route
        path="/admin/departments"
        element={<SuperAdminDashboard />}
      />


      {/* ===================================================
          SUPER ADMIN - CIVICFIX REQUESTS
      =================================================== */}

      <Route
        path="/admin/civicfix-requests"
        element={<SuperAdminDashboard />}
      />


      {/* ===================================================
          SUPER ADMIN - DASHBOARD AND OTHER MODULES
      =================================================== */}

      <Route
        path="/admin/*"
        element={<SuperAdminDashboard />}
      />


      {/* ===================================================
          GOOGLE AUTHENTICATION CALLBACK
      =================================================== */}

      <Route
        path="/auth/google/callback"
        element={<GoogleCallbackRouter />}
      />


      {/* ===================================================
          FALLBACK ROUTE
      =================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}