/**
 * App.tsx — React Router configuration (data-router style).
 *
 * Defines the entire route tree for the application. All routes are wrapped
 * in AuthProvider at the root so every page has access to auth context.
 *
 * Route structure:
 *   PUBLIC (no login required):
 *     /                    → Landing page (homepage)
 *     /login               → Login form
 *     /register            → Registration form
 *     /verify-otp          → Email OTP verification (after register)
 *     /forgot-password     → Enter email to receive reset OTP
 *     /reset-password      → Enter reset OTP + new password
 *     /contact             → Contact Us
 *     /faq                 → FAQ
 *
 *   PRIVATE (RequireAuth → shows Navbar + guards):
 *     Learner:
 *       /dashboard, /theory, /hazard, /instructors, /progress, /bookings
 *     Instructor:
 *       /instructor/dashboard, /instructor/profile,
 *       /instructor/availability, /instructor/bookings
 *     Admin:
 *       /admin/dashboard, /admin/questions, /admin/hazard, /admin/learners
 *
 *   Catch-all → redirect to /
 */

import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";

// Learner pages
import Dashboard from "./pages/Dashboard";
import Theory from "./pages/Theory";
import Hazard from "./pages/Hazard";
import InstructorSearch from "./pages/InstructorSearch";
import Progress from "./pages/Progress";
import Bookings from "./pages/Bookings";

// Instructor pages
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorProfile from "./pages/InstructorProfile";
import InstructorAvailability from "./pages/InstructorAvailability";
import InstructorBookings from "./pages/InstructorBookings";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminQuestions from "./pages/AdminQuestions";
import AdminHazard from "./pages/AdminHazard";
import AdminLearners from "./pages/AdminLearners";

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      // Public pages — accessible without login
      { path: "/", element: <Landing /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/verify-otp", element: <VerifyOtp /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/contact", element: <Contact /> },
      { path: "/faq", element: <FAQ /> },

      // Private branch — requires authentication
      {
        element: <RequireAuth />,
        children: [
          // Learner routes
          {
            element: <RequireRole role="learner" />,
            children: [
              { path: "dashboard", element: <Dashboard /> },
              { path: "theory", element: <Theory /> },
              { path: "hazard", element: <Hazard /> },
              { path: "instructors", element: <InstructorSearch /> },
              { path: "progress", element: <Progress /> },
              { path: "bookings", element: <Bookings /> },
            ],
          },

          // Instructor routes
          {
            path: "instructor",
            element: <RequireRole role="instructor" />,
            children: [
              { path: "dashboard", element: <InstructorDashboard /> },
              { path: "profile", element: <InstructorProfile /> },
              { path: "availability", element: <InstructorAvailability /> },
              { path: "bookings", element: <InstructorBookings /> },
            ],
          },

          // Admin routes
          {
            path: "admin",
            element: <RequireRole role="admin" />,
            children: [
              { path: "dashboard", element: <AdminDashboard /> },
              { path: "questions", element: <AdminQuestions /> },
              { path: "hazard", element: <AdminHazard /> },
              { path: "learners", element: <AdminLearners /> },
            ],
          },
        ],
      },

      // Catch-all: unknown URLs go to the landing page.
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
