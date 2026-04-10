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

// Route tree (react-router-dom v7 data-router style).
//
// Layout shape:
//   <AuthProvider>                      ← root, gives auth context to all routes
//     <Outlet />                        ← renders the matched child
//   </AuthProvider>
//     ├── / (Landing page)              ← public homepage (always shown first)
//     ├── /login, /register             ← public auth pages
//     ├── /contact, /faq               ← public info pages
//     └── /dashboard + RequireAuth      ← guards everything below, renders <Navbar /><Outlet />
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
//                 ├── /admin/hazard
//                 └── /admin/learners
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
