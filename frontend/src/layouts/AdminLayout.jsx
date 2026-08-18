import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function AdminLayout() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  });

  const getRoleTitle = () => {
    if (user.role === "admin") return "HOD Workspace";
    if (user.role === "md") return "MD Workspace";
    if (user.role === "head") return "Head Workspace";
    return "Coordinator View";
  };

  const getDashboardTitle = () => {
    if (user.role === "admin") return "HOD Dashboard";
    if (user.role === "md") return "MD Dashboard";
    if (user.role === "head") return "Head Dashboard";
    return "Coordinator Dashboard";
  };

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="erp-shell role-admin">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">T</span>
          <div>
            <strong>TPIHS</strong>
            <small>{getRoleTitle()}</small>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/students/list">Students</NavLink>
          <NavLink to="/admin/teachers/list">Faculty</NavLink>
          {(user.role === "admin" || user.role === "coordinator" || user.role === "head" || user.role === "md") && <NavLink to="/admin/attendance">Take Attendance</NavLink>}
          <NavLink to="/admin/notices">Notices</NavLink>
          <NavLink to="/admin/operations">TPIHS Operations</NavLink>
          <NavLink to="/admin/academic-ops">Academic Ops</NavLink>
          <NavLink to="/admin/financials-inventory">Financials & Inventory</NavLink>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">The Department of Allied Health Sciences</p>
            <h1>{getDashboardTitle()}</h1>
          </div>
          <div className="user-chip">
            <span>{user.name || String(user.role).toUpperCase()}</span>
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
