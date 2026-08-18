import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function TeacherLayout() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  });

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="erp-shell role-teacher">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">T</span>
          <div>
            <strong>Faculty Portal</strong>
            <small>Classroom workspace</small>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/teacher/dashboard">Dashboard</NavLink>
          <NavLink to="/teacher/timetable">My Timetable</NavLink>
          <NavLink to="/teacher/attendance">Attendance</NavLink>
          <NavLink to="/teacher/notices">Notices</NavLink>
          <NavLink to="/teacher/profile">Profile</NavLink>
          <NavLink to="/teacher/ai-tools">AI Tools</NavLink>
          <NavLink to="/teacher/homework-leaves">Homework & Leaves</NavLink>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Faculty Panel</p>
            <h1>Classroom Dashboard</h1>
          </div>
          <div className="user-chip">
            <span>{user.name || "Faculty"}</span>
            <button 
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                localStorage.setItem("theme", next);
                document.documentElement.setAttribute("data-theme", next);
              }}
              style={{
                background: theme === "dark" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "linear-gradient(135deg, #1e1b4b, #312e81)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "800",
                cursor: "pointer",
                marginRight: "4px"
              }}
            >
              {theme === "dark" ? "☀️ Day" : "🌙 Night"}
            </button>
            <button onClick={logout}>Logout</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
