import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Pending user registration check
  if (user.role === "pending") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>⏳</span>
          </div>
          
          <h2 style={styles.title}>ACCOUNT PENDING</h2>
          
          <p style={styles.subtitle}>
            Your Google Account has been registered successfully!
          </p>
          
          <div style={styles.messageBox}>
            <p style={styles.messageText}>
              <strong>Email:</strong> {user.email}
            </p>
            <p style={styles.messageText}>
              Your account is currently pending role assignment. Please contact the 
              <strong> Academic HOD / Coordinator</strong> to verify your email and assign your dashboard privileges (Admin, Teacher, Student, etc.).
            </p>
          </div>

          <button onClick={logout} style={styles.btn} className="shining-btn">
            Sign Out / Switch Account
          </button>
        </div>
      </div>
    );
  }

  // Role-based redirects
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "coordinator") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "md") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "head") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === "student" && user.studentId) return <Navigate to={`/student/${user.studentId}/overview`} replace />;
  if (user.role === "parent") return <Navigate to="/parent" replace />;

  return <Navigate to="/login" replace />;
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100vh",
    background: "radial-gradient(circle at center, #111827 0%, #030712 100%)",
    color: "#f3f4f6",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    padding: "20px",
    boxSizing: "border-box"
  },
  card: {
    width: "95%",
    maxWidth: "520px",
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(16px)",
    border: "2px solid rgba(251, 191, 36, 0.35)",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 15px rgba(251, 191, 36, 0.15)",
    padding: "36px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  iconContainer: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "rgba(251, 191, 36, 0.1)",
    border: "2px solid #fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    boxShadow: "0 0 20px rgba(251, 191, 36, 0.25)"
  },
  icon: {
    fontSize: "2.2rem"
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "900",
    color: "#fbbf24",
    letterSpacing: "2px",
    margin: "0 0 10px 0",
    textShadow: "0 0 10px rgba(251, 191, 36, 0.3)"
  },
  subtitle: {
    fontSize: "1.05rem",
    color: "#e5e7eb",
    margin: "0 0 24px 0",
    lineHeight: "1.4"
  },
  messageBox: {
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    padding: "16px 20px",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
    marginBottom: "28px"
  },
  messageText: {
    fontSize: "0.88rem",
    color: "#d1d5db",
    margin: "0 0 10px 0",
    lineHeight: "1.5",
    "&:last-child": {
      margin: 0
    }
  },
  btn: {
    width: "100%",
    padding: "14px 24px",
    borderRadius: "8px",
    border: "2px solid #38bdf8",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    color: "#fff",
    fontWeight: "800",
    fontSize: "0.95rem",
    letterSpacing: "1px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(56, 189, 248, 0.2)",
    transition: "all 0.3s ease"
  }
};
