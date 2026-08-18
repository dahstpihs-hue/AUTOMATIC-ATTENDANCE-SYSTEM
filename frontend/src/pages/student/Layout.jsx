import React from "react";
import { Outlet, NavLink, useParams } from "react-router-dom";

export default function Layout() {
  const { id } = useParams();
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
    <div className="erp-shell role-student">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">S</span>
          <div>
            <strong>Student Portal</strong>
            <small>Academic view</small>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to={`/student/${id}/overview`}>Overview</NavLink>
          <NavLink to={`/student/${id}/timetable`}>Class Timetable</NavLink>
          <NavLink to={`/student/${id}/attendance`}>Attendance</NavLink>
          <NavLink to={`/student/${id}/fees`}>Fees</NavLink>
          <NavLink to={`/student/${id}/notices`}>Notices</NavLink>
          <NavLink to={`/student/${id}/report`}>Report</NavLink>
          <NavLink to={`/student/${id}/ai-tutor`}>AI Tutor & Tests</NavLink>
          <NavLink to={`/student/${id}/hub`}>Academic Hub</NavLink>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Student View</p>
            <h1>Academic Dashboard</h1>
          </div>
          <div className="user-chip">
            <span>{user.name || "User"}</span>
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
