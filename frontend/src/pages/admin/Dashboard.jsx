import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import RoleModulePlan from "../../components/RoleModulePlan";

export default function AdminDashboard() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isHod = user.role === "admin";

  const [activeWorkspace, setActiveWorkspace] = useState("hod"); // "hod", "dev", "teacher"
  
  // Developer Workspace States
  const [stats, setStats] = useState(null);
  const [devLogs, setDevLogs] = useState([
    { id: 1, time: "20:09:20", type: "sys", msg: "Developer System Shell initialized." },
    { id: 2, time: "20:09:21", type: "sys", msg: "Connection established with MongoDB cluster (schoolerp)." },
    { id: 3, time: "20:09:22", type: "GET", msg: "/api/academic/dev/sys-stats - Session authorized." }
  ]);
  
  // Teacher Workspace States
  const [leaves, setLeaves] = useState([]);
  const [homeworkList, setHomeworkList] = useState([
    { id: "1", subject: "BS Radiology", date: "2026-07-20", description: "Read chapters 4 & 5 on Medical Physics and submit questions.", submissions: 8 },
    { id: "2", subject: "Medical Lab Technology", date: "2026-07-19", description: "Prepare a lab report on biochemistry titration experiments.", submissions: 15 }
  ]);
  const [homeworkForm, setHomeworkForm] = useState({
    subject: "BS Radiology",
    description: ""
  });

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/academic/dev/sys-stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to load developer stats", err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get("/academic/leaves");
      setLeaves(data || []);
    } catch (err) {
      console.error("Failed to load leaves", err);
    }
  };

  useEffect(() => {
    if (isHod) {
      fetchStats();
      fetchLeaves();
    }
  }, [isHod]);

  const addLog = (msg, type = "sys") => {
    const timeStr = new Date().toTimeString().split(" ")[0];
    setDevLogs(prev => [
      { id: Date.now(), time: timeStr, type, msg },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  const runSimulatorAction = (action) => {
    if (action === "backup") {
      addLog("Starting database snapshot backup...", "sys");
      setTimeout(() => {
        addLog("Database snapshot compiled: schoolerp-backup-" + Date.now() + ".tar.gz (18.4 MB)", "sys");
        addLog("Backup uploaded to secure dev storage. Status: 200 OK", "sys");
      }, 800);
    } else if (action === "cache") {
      addLog("Purging Redis and process memory caches...", "sys");
      setTimeout(() => {
        addLog("Caches cleared. 248 key-value pairs evicted. Performance optimized.", "sys");
      }, 400);
    } else if (action === "verbose") {
      addLog("Log level set to VERBOSE. Streaming active connections...", "sys");
    } else if (action === "crash") {
      addLog("ERROR: Simulated crash event triggered at root context!", "sys");
      addLog("CRITICAL: Unhandled rejection captured. Recovering socket connections...", "sys");
      setTimeout(() => {
        addLog("System self-recovery successful. Database handles re-bound.", "sys");
      }, 900);
    } else if (action === "traffic") {
      addLog("GET /api/students/list - 200 OK (Cache HIT)", "GET");
      addLog("POST /api/attendance/mark - 201 Created (14 student records)", "POST");
      addLog("GET /api/academic/leaves - 200 OK", "GET");
      addLog("PUT /api/academic/leaves/L1 - 200 OK - Approved", "PUT");
      addLog("POST /api/academic/inventory/pos - 201 Created", "POST");
    }
  };

  const handleLeaveAction = async (id, status) => {
    try {
      await api.put(`/academic/leaves/${id}`, { status });
      addLog(`PUT /api/academic/leaves/${id} - Update to status: ${status}`, "PUT");
      fetchLeaves();
    } catch (err) {
      alert("Failed to update leave status: " + err.message);
    }
  };

  const handleCreateHomework = (e) => {
    e.preventDefault();
    if (!homeworkForm.description) return;
    const newHw = {
      id: String(homeworkList.length + 1),
      subject: homeworkForm.subject,
      date: new Date().toISOString().slice(0, 10),
      description: homeworkForm.description,
      submissions: 0
    };
    setHomeworkList([newHw, ...homeworkList]);
    setHomeworkForm({ ...homeworkForm, description: "" });
    addLog(`POST /api/homework/diary - New entry created for subject: ${homeworkForm.subject}`, "POST");
  };

  const formatMemory = (bytes) => {
    if (!bytes) return "0 MB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">The Department of Allied Health Sciences</p>
          <h2>The Professional Institute of Health Sciences Mardan (TPIHS)</h2>
          <p>
            {isHod ? "HOD" : "Coordinator"} access for academic operations,
            faculty monitoring, attendance governance, fees, resources, and
            student records.
          </p>
        </div>
      </section>

      {isHod && (
        <div className="role-tabs-bar">
          <button
            type="button"
            className={`role-tab-btn ${activeWorkspace === "hod" ? "active-hod" : ""}`}
            onClick={() => {
              setActiveWorkspace("hod");
              addLog("Switched UI context to Head of Department workspace.", "sys");
            }}
          >
            🏥 Allied Health Sciences HOD
          </button>
          <button
            type="button"
            className={`role-tab-btn ${activeWorkspace === "teacher" ? "active-teacher" : ""}`}
            onClick={() => {
              setActiveWorkspace("teacher");
              addLog("Switched UI context to Subject Teacher workspace.", "sys");
            }}
          >
            📝 Subject Teacher Desk
          </button>
          <button
            type="button"
            className={`role-tab-btn ${activeWorkspace === "dev" ? "active-dev" : ""}`}
            onClick={() => {
              setActiveWorkspace("dev");
              addLog("Switched UI context to Chief Developer control panel.", "sys");
              fetchStats();
            }}
          >
            👑 Chief Developer Zone
          </button>
        </div>
      )}

      {/* 1. HOD / COORDINATOR WORKSPACE */}
      {(!isHod || activeWorkspace === "hod") && (
        <div className="workspace-panel page-stack">
          <section className="stat-grid dashboard-actions-grid">
            <Link className="stat-card stat-students" to="/admin/students/list">
              <i className="card-logo">ST</i>
              <span>Students</span>
              <strong>{isHod ? "Student Management" : "Student Records"}</strong>
              <small>{isHod ? "Add, edit, import, and manage student data" : "View student academic records"}</small>
            </Link>
            <Link className="stat-card stat-faculty" to="/admin/teachers/list">
              <i className="card-logo">FC</i>
              <span>Faculty</span>
              <strong>{isHod ? "Faculty Management" : "Faculty Directory"}</strong>
              <small>{isHod ? "Add, edit, import, and manage faculty accounts" : "View faculty directory"}</small>
            </Link>
            <Link className="stat-card stat-notices" to="/admin/notices">
              <i className="card-logo">NT</i>
              <span>Resources</span>
              <strong>Academic Notices</strong>
              <small>Department announcements and shared academic updates</small>
            </Link>
            {isHod && (
              <Link className="stat-card attendance-stat stat-attendance" to="/admin/attendance">
                <i className="card-logo">AT</i>
                <span>Attendance</span>
                <strong>HOD Teaching Mode</strong>
                <small>Mark attendance as HOD subject teacher</small>
              </Link>
            )}
            <Link className="stat-card department-status-stat stat-department" to="/admin/department-status">
              <i className="card-logo">DS</i>
              <span>Department</span>
              <strong>Department Status</strong>
              <small>Batch-wise enrollment, graduation tables, and charts</small>
            </Link>
          </section>

          {isHod && (
            <div className="card">
              <p className="eyebrow">Allied Health Sciences Department</p>
              <h2>Active Batches & Enrollment</h2>
              <div className="dept-kpi-grid" style={{ marginTop: "14px" }}>
                <div className="kpi-card">
                  <div className="kpi-icon">RD</div>
                  <div className="kpi-details">
                    <span>BS Radiology</span>
                    <strong>4 Batches</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">DT</div>
                  <div className="kpi-details">
                    <span>BS Dental</span>
                    <strong>2 Batches</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">ML</div>
                  <div className="kpi-details">
                    <span>BS Medical Lab</span>
                    <strong>3 Batches</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">AN</div>
                  <div className="kpi-details">
                    <span>BS Anaesthesia</span>
                    <strong>2 Batches</strong>
                  </div>
                </div>
              </div>
              <div className="batches-layout">
                <div className="batches-list">
                  <div className="batch-strip">
                    <div className="batch-strip-info">
                      <strong>BS Radiology - Batch 1</strong>
                      <span>Final Year • 24 Students</span>
                    </div>
                    <span className="batch-tag radiology">RADIOLOGY</span>
                  </div>
                  <div className="batch-strip">
                    <div className="batch-strip-info">
                      <strong>BS Radiology - Batch 2</strong>
                      <span>Third Year • 28 Students</span>
                    </div>
                    <span className="batch-tag radiology">RADIOLOGY</span>
                  </div>
                  <div className="batch-strip">
                    <div className="batch-strip-info">
                      <strong>BS Dental Technology - Batch 1</strong>
                      <span>Second Year • 18 Students</span>
                    </div>
                    <span className="batch-tag dental">DENTAL</span>
                  </div>
                  <div className="batch-strip">
                    <div className="batch-strip-info">
                      <strong>Medical Lab Technology - Batch 2</strong>
                      <span>Third Year • 20 Students</span>
                    </div>
                    <span className="batch-tag mlt">MLT</span>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.08)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h4>Curriculum & Batch Guidelines</h4>
                  <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.4", margin: "6px 0 12px" }}>
                    As Head of Department for Allied Health Sciences, you oversee academic progress, faculty assignments, and clinical lab inventory logs for all ongoing semesters.
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Link className="mini-action" to="/admin/academic-ops" style={{ flex: 1, textAlign: "center" }}>Curriculum</Link>
                    <Link className="mini-action" to="/admin/operations" style={{ flex: 1, textAlign: "center" }}>Live Ledger</Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isHod && (
            <section className="card login-control-card">
              <p className="eyebrow">Dashboard Login Control</p>
              <h2>Set Coordinator and Faculty Logins</h2>
              <p>Manage usernames and passwords for Coordinator and Faculty accounts directly from the HOD dashboard.</p>
              <Link className="primary-action link-action" to="/admin/login-settings">
                OPEN LOGIN SETTINGS
              </Link>
            </section>
          )}

          {isHod && (
            <section className="card role-rights-card">
              <p className="eyebrow">Role Dashboard Control</p>
              <h2>View Every Dashboard and Assign Rights</h2>
              <p>Preview HOD, Coordinator, Faculty, and Student rights directly, then assign or remove permissions without logging into those accounts.</p>
              <Link className="primary-action link-action" to="/admin/role-rights">
                OPEN ROLE RIGHTS MANAGER
              </Link>
            </section>
          )}
        </div>
      )}

      {/* 2. SUBJECT TEACHER WORKSPACE */}
      {isHod && activeWorkspace === "teacher" && (
        <div className="workspace-panel page-stack">
          <div className="teacher-desk-grid">
            <form onSubmit={handleCreateHomework} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3>Post Digital Homework Entry</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "-6px 0 6px" }}>
                Publish a direct task or assignments to your subject classes.
              </p>
              
              <label>
                <span>SUBJECT / BATCH</span>
                <select
                  value={homeworkForm.subject}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, subject: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <option value="BS Radiology">BS Radiology</option>
                  <option value="Medical Lab Technology">Medical Lab Technology</option>
                  <option value="BS Dental Technology">BS Dental Technology</option>
                  <option value="BS Anaesthesia Technology">BS Anaesthesia Technology</option>
                </select>
              </label>

              <label>
                <span>ASSIGNMENT DESCRIPTION</span>
                <textarea
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                  placeholder="Task instructions, deadlines, and readings..."
                  style={{ minHeight: "100px", padding: "10px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}
                  required
                />
              </label>

              <button className="primary-action submit-wide" type="submit" style={{ marginTop: "6px" }}>
                POST DIGITAL ENTRY
              </button>
            </form>

            <div className="card">
              <h3>Recent Homework Logs</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "-6px 0 10px" }}>
                Previously posted homework tasks for Allied Health students.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {homeworkList.map(hw => (
                  <div key={hw.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <strong style={{ color: "#38bdf8" }}>{hw.subject}</strong>
                      <span style={{ color: "var(--muted)" }}>{hw.date}</span>
                    </div>
                    <p style={{ fontSize: "13px", margin: "6px 0", color: "#e2e8f0" }}>{hw.description}</p>
                    <span style={{ fontSize: "11px", color: "#2dd4bf" }}>{hw.submissions} Submissions received</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card teacher-leaves-card">
              <div className="sub-header-row">
                <div>
                  <h3>Student Leave Authorization Center</h3>
                  <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Review, approve, or reject pending leave requests submitted by Allied Health students.
                  </p>
                </div>
                <span className="batch-tag mlt" style={{ fontSize: "12px" }}>
                  {leaves.filter(l => l.status === "pending").length} Pending
                </span>
              </div>

              <div className="table-wrap" style={{ marginTop: "12px" }}>
                <table className="permission-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Class / Batch</th>
                      <th>Reason</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(leave => (
                      <tr key={leave.id}>
                        <td><strong>{leave.studentName}</strong></td>
                        <td>{leave.class} - {leave.section}</td>
                        <td>{leave.reason}</td>
                        <td>{leave.date}</td>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            backgroundColor: leave.status === "approved" ? "rgba(16,185,129,0.2)" : leave.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)",
                            color: leave.status === "approved" ? "#10b981" : leave.status === "rejected" ? "#ef4444" : "#eab308"
                          }}>
                            {leave.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {leave.status === "pending" ? (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                className="mini-action"
                                style={{ backgroundColor: "rgba(16,185,129,0.3)", color: "#10b981", border: "1px solid #10b981" }}
                                onClick={() => handleLeaveAction(leave.id, "approved")}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="danger-action mini-action"
                                style={{ padding: "4px 8px" }}
                                onClick={() => handleLeaveAction(leave.id, "rejected")}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: "12px" }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--muted)" }}>No leave applications found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHIEF DEVELOPER WORKSPACE */}
      {isHod && activeWorkspace === "dev" && (
        <div className="workspace-panel page-stack">
          <div className="dev-metrics-grid">
            <div className="dev-stat-card">
              <span>Database Engine</span>
              <strong>{stats?.dbStatus || "Connected"}</strong>
              <small>MongoDB port 27017</small>
            </div>
            <div className="dev-stat-card">
              <span>Node Uptime</span>
              <strong>{stats ? formatUptime(stats.uptime) : "0s"}</strong>
              <small>Process heartbeat active</small>
            </div>
            <div className="dev-stat-card">
              <span>Heap Allocation</span>
              <strong>{stats ? formatMemory(stats.memory?.heapUsed) : "0 MB"}</strong>
              <small>Max: {stats ? formatMemory(stats.memory?.heapTotal) : "0 MB"}</small>
            </div>
            <div className="dev-stat-card">
              <span>Platform Host</span>
              <strong>{stats?.platform || "win32"}</strong>
              <small>Node {stats?.nodeVersion || "v18"}</small>
            </div>
          </div>

          <div className="dev-console-layout">
            <div className="dev-terminal">
              <div className="dev-terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <span>antigravity@tpihs-erp:~/console-logs</span>
                <span style={{ color: "#10b981", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span> Live
                </span>
              </div>
              <div className="dev-terminal-body">
                {devLogs.map(log => (
                  <div key={log.id} className="dev-log-line">
                    <span className="log-time">[{log.time}]</span>
                    {log.type === "sys" && <span className="log-sys">[SYSTEM]</span>}
                    {log.type === "GET" && <span className="log-method-get">[GET]</span>}
                    {log.type === "POST" && <span className="log-method-post">[POST]</span>}
                    {log.type === "PUT" && <span className="log-method-put">[PUT]</span>}
                    {log.type === "DELETE" && <span className="log-method-delete">[DELETE]</span>}
                    <span className="log-msg">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dev-controls-card">
              <h3>System Control Center</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 14px" }}>
                Developer level actions for system simulation, cache flushes, and database health inspection.
              </p>
              
              <h4>Interactive Simulator Actions</h4>
              <div className="dev-btn-grid">
                <button type="button" className="dev-action-btn" onClick={() => runSimulatorAction("backup")}>
                  🗄️ Backup Database
                </button>
                <button type="button" className="dev-action-btn" onClick={() => runSimulatorAction("cache")}>
                  ⚡ Flush Dev Cache
                </button>
                <button type="button" className="dev-action-btn" onClick={() => runSimulatorAction("verbose")}>
                  🔍 Enable Verbose
                </button>
                <button type="button" className="dev-action-btn" onClick={() => runSimulatorAction("crash")}>
                  ⚠️ Simulate Exception
                </button>
                <button type="button" className="dev-action-btn" onClick={() => runSimulatorAction("traffic")} style={{ gridColumn: "span 2", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)" }}>
                  🧬 Generate Mock API Traffic
                </button>
              </div>

              <h4 style={{ marginTop: "18px" }}>MongoDB Collection Counts</h4>
              <div className="table-wrap" style={{ marginTop: "8px" }}>
                <table className="permission-table" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Collection Name</th>
                      <th>Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>User Accounts</td>
                      <td>{stats?.counts?.users ?? "..."}</td>
                    </tr>
                    <tr>
                      <td>Student Records</td>
                      <td>{stats?.counts?.students ?? "..."}</td>
                    </tr>
                    <tr>
                      <td>Faculty Roster</td>
                      <td>{stats?.counts?.teachers ?? "..."}</td>
                    </tr>
                    <tr>
                      <td>Attendance Records</td>
                      <td>{stats?.counts?.attendance ?? "..."}</td>
                    </tr>
                    <tr>
                      <td>Fee Transactions</td>
                      <td>{stats?.counts?.fees ?? "..."}</td>
                    </tr>
                    <tr>
                      <td>Import Batches</td>
                      <td>{stats?.counts?.batches ?? "..."}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <RoleModulePlan />
    </div>
  );
}
