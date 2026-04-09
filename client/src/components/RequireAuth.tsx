import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Navbar from "./Navbar";

// Guards every private route. Unauthed → bounce to /login. Authed → render
// the persistent Navbar above the child route's content. Because Navbar
// lives here (not in each page), every private page gets it automatically
// and the public /login and /register pages never see it.
export default function RequireAuth() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
