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
import Login from "./pages/Login";
import Register from "./pages/Register";

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

// Route tree (react-router-dom v7 data-router style).
//
// Layout shape:
//   <AuthProvider>                      ← root, gives auth context to all routes
//     <Outlet />                        ← renders the matched child
//   </AuthProvider>
//     ├── /login, /register             ← public
//     └── RequireAuth                   ← guards everything below, renders <Navbar /><Outlet />
//           ├── RequireRole "learner"
//           │     ├── /dashboard
//           │     ├── /theory
//           │     ├── /hazard
//           │     ├── /instructors
//           │     ├── /progress
//           │     └── /bookings
//           ├── /instructor + RequireRole "instructor"
//           │     ├── /instructor/dashboard
//           │     ├── /instructor/profile
//           │     ├── /instructor/availability
//           │     └── /instructor/bookings
//           └── /admin + RequireRole "admin"
//                 ├── /admin/dashboard
//                 ├── /admin/questions
//                 └── /admin/hazard
//
// Unknown URL handling:
//   - Unauthed → RequireAuth bounces to /login.
//   - Authed but wrong role → RequireRole bounces to THEIR role's dashboard
//     (see dashboardPathForRole). This prevents an infinite loop where an
//     instructor is sent to /dashboard, which is itself guarded by
//     RequireRole "learner", which would bounce them again.
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      // Public branch
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },

      // Private branch
      {
        path: "/",
        element: <RequireAuth />,
        children: [
          // `/` → /dashboard, and the learner RequireRole below will bounce
          // non-learners to their own home via the smart fallback.
          { index: true, element: <Navigate to="/dashboard" replace /> },

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
            ],
          },
        ],
      },

      // Catch-all for any unknown URL. Sends the user through /dashboard,
      // which (via RequireAuth + RequireRole) ultimately lands them either
      // on /login (unauthed) or their role-specific home.
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
