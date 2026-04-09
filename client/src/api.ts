import axios from "axios";

// Singleton Axios client. The ONLY place in the frontend that imports axios
// directly — every component/page must import this default export instead.
// See CLAUDE.md "Frontend conventions".
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5001",
});

// Request interceptor — attach the JWT from localStorage to every outgoing
// request. The token is set by AuthContext on login and cleared on logout.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401 (expired/invalid token), wipe local auth
// state and hard-redirect to /login. Hard navigation is intentional: this
// interceptor lives outside the React tree and has no router access.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Avoid redirect loop if the 401 came from /login itself.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
