import React, { useMemo, useState, useEffect } from "react";
import api from "../../api/api";

const STORAGE_KEY = "tpihs_role_rights";

const ROLES = [
  { key: "admin", label: "HOD", color: "dept-radiology" },
  { key: "coordinator", label: "COORDINATOR", color: "dept-anaesthesia" },
  { key: "teacher", label: "FACULTY", color: "dept-dental" },
  { key: "student", label: "STUDENT", color: "dept-mlt" },
  { key: "parent", label: "PARENT", color: "dept-pharmacy" }
];

const RIGHTS = [
  {
    key: "accounts",
    title: "Add/Edit/Delete Students and Faculty",
    defaults: { admin: true, coordinator: false, teacher: false, student: false, parent: false },
  },
  {
    key: "academic_files",
    title: "Upload/Edit/Delete Timetable, Datesheet, Results",
    defaults: { admin: true, coordinator: false, teacher: true, student: true, parent: false },
  },
  {
    key: "validate_docs",
    title: "Approve/Validate Documents",
    defaults: { admin: true, coordinator: false, teacher: false, student: false, parent: false },
  },
  {
    key: "attendance_take",
    title: "Take Attendance",
    defaults: { admin: true, coordinator: false, teacher: true, student: false, parent: false },
  },
  {
    key: "attendance_correct",
    title: "Correct Attendance After Submission",
    defaults: { admin: true, coordinator: false, teacher: true, student: false, parent: false },
  },
  {
    key: "fines",
    title: "Impose / Flag Fines",
    defaults: { admin: true, coordinator: true, teacher: true, student: false, parent: false },
  },
  {
    key: "fees",
    title: "Generate Fee Installments",
    defaults: { admin: true, coordinator: false, teacher: false, student: true, parent: false },
  },
  {
    key: "payments",
    title: "Mark Payment As Cleared",
    defaults: { admin: true, coordinator: false, teacher: false, student: false, parent: false },
  },
  {
    key: "evaluation_submit",
    title: "Submit Faculty Evaluation",
    defaults: { admin: false, coordinator: false, teacher: false, student: true, parent: false },
  },
  {
    key: "evaluation_view",
    title: "View Evaluation Results",
    defaults: { admin: true, coordinator: true, teacher: true, student: false, parent: false },
  },
  {
    key: "imports",
    title: "Bulk Excel Import",
    defaults: { admin: true, coordinator: false, teacher: false, student: false, parent: false },
  },
  {
    key: "resources",
    title: "Resource Upload and Sharing",
    defaults: { admin: true, coordinator: false, teacher: true, student: true, parent: true },
  },
];

function defaultRights() {
  const data = {};
  RIGHTS.forEach((right) => {
    data[right.key] = { ...right.defaults };
  });
  return data;
}

function loadRights() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? { ...defaultRights(), ...saved } : defaultRights();
  } catch {
    return defaultRights();
  }
}

export default function RoleRightsManager() {
  const [rights, setRights] = useState(loadRights);
  const [activeRole, setActiveRole] = useState("admin");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("rights"); // 'rights' or 'users'

  // Users database management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    loginId: "",
    password: "",
    role: "teacher"
  });
  
  // Edit mode details
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    loginId: "",
    password: "",
    role: "teacher"
  });

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load users list from database.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const save = (next) => {
    setRights(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleRight = (rightKey, roleKey) => {
    if (roleKey === "admin") return;
    const next = {
      ...rights,
      [rightKey]: {
        ...rights[rightKey],
        [roleKey]: !rights[rightKey]?.[roleKey],
      },
    };
    save(next);
    setMessage("ROLE RIGHTS UPDATED SUCCESSFULLY");
    setTimeout(() => setMessage(""), 3000);
  };

  const resetDefaults = () => {
    const next = defaultRights();
    save(next);
    setMessage("ROLE RIGHTS RESET TO DEFAULT");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.loginId || !userForm.password) {
      setMessage("Please fill all user details.");
      return;
    }
    try {
      await api.post("/auth/users/create", userForm);
      setMessage("✔ USER ACCOUNT CREATED SUCCESSFULLY!");
      setUserForm({ name: "", loginId: "", password: "", role: "teacher" });
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error creating user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateUser = async (userId) => {
    try {
      await api.put(`/auth/users/${userId}`, editForm);
      setMessage("✔ USER ACCOUNT UPDATED SUCCESSFULLY!");
      setEditingUserId(null);
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error updating user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setMessage("✔ USER ACCOUNT DELETED SUCCESSFULLY!");
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error deleting user: " + (err.response?.data?.message || err.message));
    }
  };

  // Impersonation activator
  const handleActivateDevMode = () => {
    const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    sessionStorage.setItem("originalAdminUser", JSON.stringify(currentUser));
    sessionStorage.setItem("isDeveloper", "true");
    setMessage("⚡ DEVELOPER SIMULATOR ACTIVATED! USE THE FLOATING PREVIEW CONTROLLER AT THE BOTTOM RIGHT.");
    setTimeout(() => setMessage(""), 6000);
  };

  const roleStats = useMemo(() => ROLES.map((role) => {
    const allowed = RIGHTS.filter((right) => rights[right.key]?.[role.key]).length;
    return { ...role, allowed };
  }), [rights]);

  const activeStats = roleStats.find((role) => role.key === activeRole) || roleStats[0];
  const visibleRights = RIGHTS.filter((right) => rights[right.key]?.[activeRole]);

  return (
    <div className="page-stack">
      <section className="hero-panel role-rights-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <p className="eyebrow">DEVELOPER & ROLE CONTROL CENTER</p>
          <h2>VIEW, ASSIGN, AND REMOVE DASHBOARD RIGHTS</h2>
          <p>Configure role-based rights, manage users credentials, and launch dashboard device simulators instantly.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button 
            className="primary-action" 
            type="button" 
            onClick={handleActivateDevMode}
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)", boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)" }}
          >
            💻 LAUNCH PORTAL SIMULATOR
          </button>
          <button className="danger-action" type="button" onClick={resetDefaults}>RESET RIGHTS</button>
        </div>
      </section>

      {/* Tab Selectors */}
      <div className="att-tabs-container" style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button 
          className={`att-tab-btn ${activeTab === "rights" ? "active" : "inactive"}`} 
          onClick={() => setActiveTab("rights")}
          style={{ flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          🔐 Edit Access & Rights Matrix
        </button>
        <button 
          className={`att-tab-btn ${activeTab === "users" ? "active" : "inactive"}`} 
          onClick={() => setActiveTab("users")}
          style={{ flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          👥 Add & Manage User Accounts
        </button>
      </div>

      {message && (
        <div style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "1px solid #10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          color: "#a7f3d0",
          marginBottom: "20px",
          fontSize: "0.85rem",
          fontWeight: "bold"
        }}>
          {message}
        </div>
      )}

      {/* TAB 1: RIGHTS MATRIX */}
      {activeTab === "rights" && (
        <>
          <section className="stat-grid role-preview-grid">
            {roleStats.map((role) => (
              <button
                className={`stat-card role-preview-card ${activeRole === role.key ? "is-active" : ""}`}
                key={role.key}
                type="button"
                onClick={() => setActiveRole(role.key)}
              >
                <i className={`card-logo ${role.color}`}>{role.label.slice(0, 2)}</i>
                <span>{role.label}</span>
                <strong>{role.allowed} Rights Active</strong>
                <small>Click to preview this role dashboard rights</small>
              </button>
            ))}
          </section>

          <section className="card">
            <p className="eyebrow">{activeStats.label} Preview</p>
            <h2>{activeStats.label} Dashboard Rights</h2>
            <div className="feature-grid">
              {visibleRights.length ? visibleRights.map((right) => (
                <div className="feature-item role-feature-item" key={right.key}>
                  <strong>{right.title}</strong>
                  <span>Allowed</span>
                </div>
              )) : <p>No active rights assigned.</p>}
            </div>
          </section>

          <section className="card">
            <p className="eyebrow">Permission Matrix</p>
            <h2>Assign / Eliminate Role Rights</h2>
            <div className="table-wrap">
              <table className="permission-table role-rights-table">
                <thead>
                  <tr>
                    <th>Right / Function</th>
                    {ROLES.map((role) => <th key={role.key}>{role.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {RIGHTS.map((right) => (
                    <tr key={right.key}>
                      <td>{right.title}</td>
                      {ROLES.map((role) => {
                        const checked = Boolean(rights[right.key]?.[role.key]);
                        return (
                          <td key={`${right.key}-${role.key}`}>
                            <button
                              className={`rights-toggle ${checked ? "is-on" : "is-off"}`}
                              disabled={role.key === "admin"}
                              type="button"
                              onClick={() => toggleRight(right.key, role.key)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                fontWeight: "bold",
                                fontSize: "0.75rem",
                                cursor: role.key === "admin" ? "not-allowed" : "pointer",
                                backgroundColor: checked ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                color: checked ? "#10b981" : "#ef4444"
                              }}
                            >
                              {checked ? "ALLOWED" : "REMOVED"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 2: MANAGE USER ACCOUNTS */}
      {activeTab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          
          {/* Create User Form */}
          <section className="card">
            <p className="eyebrow">User Directory Control</p>
            <h2>Create New Login Account</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>
              Register a student, parent, faculty, coordinator, or HOD user account and assign active login credentials.
            </p>

            <form onSubmit={handleCreateUser} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255,255,255,0.6)" }}>FULL NAME</span>
                <input 
                  type="text" 
                  placeholder="e.g. Dr. Imran Khan" 
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255,255,255,0.6)" }}>USERNAME (LOGIN ID)</span>
                <input 
                  type="text" 
                  placeholder="e.g. imran.khan" 
                  value={userForm.loginId}
                  onChange={(e) => setUserForm({ ...userForm, loginId: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255,255,255,0.6)" }}>PASSWORD</span>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255,255,255,0.6)" }}>SYSTEM ROLE</span>
                <select 
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none", cursor: "pointer" }}
                >
                  <option value="admin">HOD (Admin)</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="teacher">Faculty (Teacher)</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <button className="primary-action" type="submit" style={{ padding: "12px", border: "none", borderRadius: "6px" }}>
                ➕ CREATE USER
              </button>
            </form>
          </section>

          {/* Users List Panel */}
          <section className="card">
            <h2>Registered ERP Users Directory</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
              Review list of active users, change their roles, adjust credentials, and grant dashboard rights.
            </p>

            {usersLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.5)" }}>Loading active users catalog...</div>
            ) : (
              <div className="table-wrap">
                <table className="permission-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>System Role</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => {
                      const isEditing = editingUserId === item._id;
                      return (
                        <tr key={item._id}>
                          <td>
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                style={{ padding: "4px 8px", backgroundColor: "#000", border: "1px solid #38bdf8", color: "#fff", borderRadius: "4px" }}
                              />
                            ) : (
                              <strong>{item.name}</strong>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editForm.loginId}
                                onChange={(e) => setEditForm({ ...editForm, loginId: e.target.value })}
                                style={{ padding: "4px 8px", backgroundColor: "#000", border: "1px solid #38bdf8", color: "#fff", borderRadius: "4px" }}
                              />
                            ) : (
                              <code>{item.loginId || item.email}</code>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                value={editForm.role}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                style={{ padding: "4px", backgroundColor: "#000", border: "1px solid #38bdf8", color: "#fff", borderRadius: "4px" }}
                              >
                                <option value="admin">HOD (Admin)</option>
                                <option value="coordinator">Coordinator</option>
                                <option value="teacher">Faculty (Teacher)</option>
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                              </select>
                            ) : (
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                                backgroundColor: item.role === "admin" ? "rgba(251,191,36,0.2)" : item.role === "coordinator" ? "rgba(16,185,129,0.2)" : item.role === "teacher" ? "rgba(56,189,248,0.2)" : "rgba(107,114,128,0.2)",
                                color: item.role === "admin" ? "#fbbf24" : item.role === "coordinator" ? "#10b981" : item.role === "teacher" ? "#38bdf8" : "#9ca3af"
                              }}>
                                {item.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="mini-action"
                                  onClick={() => handleUpdateUser(item._id)}
                                  style={{ backgroundColor: "rgba(16,185,129,0.3)", color: "#10b981", border: "1px solid #10b981" }}
                                >
                                  Save
                                </button>
                                <button
                                  className="mini-action"
                                  onClick={() => setEditingUserId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="mini-action"
                                  onClick={() => {
                                    setEditingUserId(item._id);
                                    setEditForm({
                                      name: item.name,
                                      loginId: item.loginId || item.email || "",
                                      password: "",
                                      role: item.role
                                    });
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="danger-action mini-action"
                                  onClick={() => handleDeleteUser(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
