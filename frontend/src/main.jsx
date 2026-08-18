import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // agar App.jsx hai
import { AuthProvider } from "./context/AuthContext";
import "./styles.css";
import "./login-final.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
