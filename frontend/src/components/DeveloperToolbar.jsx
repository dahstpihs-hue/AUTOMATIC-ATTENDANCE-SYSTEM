import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";

export default function DeveloperToolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDev, setIsDev] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const [minimized, setMinimized] = useState(false);

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  useEffect(() => {
    const checkDev = () => {
      const dev = sessionStorage.getItem("isDeveloper") === "true";
      setIsDev(dev);
      if (dev) {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        setCurrentRole(user.role || "");
      }
    };
    checkDev();

    // Listen to storage/session changes
    const interval = setInterval(checkDev, 1000);
    return () => clearInterval(interval);
  }, [location]);

  // Load students & teachers lists for quick simulations
  useEffect(() => {
    if (isDev) {
      api.get("/students").then(({ data }) => setStudents(data)).catch(console.error);
      api.get("/teachers").then(({ data }) => setTeachers(data)).catch(console.error);
    }
  }, [isDev]);

  if (!isDev) return null;

  const handleRoleChange = (role) => {
    const origUser = JSON.parse(sessionStorage.getItem("originalAdminUser") || "{}");
    let nextUser = { ...origUser, role };

    if (role === "student") {
      const target = students.find(s => s._id === selectedStudent) || students[0];
      if (target) {
        nextUser.id = target.user || target._id;
        nextUser.name = target.name;
        nextUser.studentId = target._id;
      }
    } else if (role === "teacher") {
      const target = teachers.find(t => t._id === selectedTeacher) || teachers[0];
      if (target) {
        nextUser.id = target.user || target._id;
        nextUser.name = target.name;
      }
    }

    sessionStorage.setItem("user", JSON.stringify(nextUser));
    setCurrentRole(role);

    // Route to appropriate dashboard
    if (role === "admin" || role === "coordinator") {
      navigate("/admin/dashboard");
    } else if (role === "teacher") {
      navigate("/teacher/dashboard");
    } else if (role === "student" && nextUser.studentId) {
      navigate(`/student/${nextUser.studentId}/overview`);
    } else if (role === "parent") {
      navigate("/parent");
    } else {
      navigate("/");
    }
  };

  const handleReturnToAdmin = () => {
    const origUser = sessionStorage.getItem("originalAdminUser");
    if (origUser) {
      sessionStorage.setItem("user", origUser);
      sessionStorage.removeItem("isDeveloper");
      setIsDev(false);
      navigate("/admin/role-rights");
    }
  };

  if (minimized) {
    return (
      <div 
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#0284c7",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "50%",
          boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
          cursor: "pointer",
          zIndex: 99999,
          fontWeight: "bold",
          fontSize: "1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #fff"
        }}
        title="Open Developer Preview Switcher"
      >
        💻
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "320px",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      backdropFilter: "blur(12px)",
      border: "2px solid #38bdf8",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
      zIndex: 99999,
      color: "#fff",
      fontFamily: "sans-serif"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "6px" }}>
        <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
          💻 PREVIEW SIMULATOR
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={() => setMinimized(true)}
            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.85rem" }}
          >
            ➖
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
          Active Viewport: <strong style={{ color: "#2dd4bf" }}>{currentRole.toUpperCase()}</strong>
        </div>

        {/* Dynamic target selectors */}
        {currentRole === "student" && students.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.68rem", color: "#9ca3af" }}>SELECT STUDENT RECORD</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                const nextUser = JSON.parse(sessionStorage.getItem("user") || "{}");
                const target = students.find(s => s._id === e.target.value);
                if (target) {
                  nextUser.id = target.user || target._id;
                  nextUser.name = target.name;
                  nextUser.studentId = target._id;
                  sessionStorage.setItem("user", JSON.stringify(nextUser));
                  navigate(`/student/${target._id}/overview`);
                }
              }}
              style={{ padding: "6px", borderRadius: "4px", backgroundColor: "#000", border: "1px solid #38bdf8", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="">-- Choose Student --</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>
              ))}
            </select>
          </div>
        )}

        {currentRole === "teacher" && teachers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.68rem", color: "#9ca3af" }}>SELECT FACULTY PROFILE</label>
            <select 
              value={selectedTeacher} 
              onChange={(e) => {
                setSelectedTeacher(e.target.value);
                const nextUser = JSON.parse(sessionStorage.getItem("user") || "{}");
                const target = teachers.find(t => t._id === e.target.value);
                if (target) {
                  nextUser.id = target.user || target._id;
                  nextUser.name = target.name;
                  sessionStorage.setItem("user", JSON.stringify(nextUser));
                  navigate("/teacher/dashboard");
                }
              }}
              style={{ padding: "6px", borderRadius: "4px", backgroundColor: "#000", border: "1px solid #38bdf8", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="">-- Choose Faculty --</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.subject})</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px" }}>
          {["admin", "coordinator", "teacher", "student", "parent"].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              style={{
                padding: "6px 8px",
                borderRadius: "4px",
                border: currentRole === role ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                backgroundColor: currentRole === role ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
                color: currentRole === role ? "#38bdf8" : "#fff",
                fontSize: "0.72rem",
                fontWeight: "bold",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              {role.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={handleReturnToAdmin}
          style={{
            marginTop: "10px",
            padding: "8px",
            borderRadius: "6px",
            border: "none",
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%"
          }}
        >
          ❌ EXIT SIMULATION MODE
        </button>
      </div>
    </div>
  );
}
