import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8080/api"
      : (window.location.hostname.includes("vercel.app") 
          ? "/api" 
          : `${window.location.protocol}//${window.location.hostname}:8080/api`)
  ),
});

// Automatically add token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
