import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("attendance");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveMessage, setLeaveMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [chatLogs, setChatLogs] = useState([
    { sender: "teacher", text: "Assalam-o-Alaikum, this is your child's class teacher. Sufyan is performing exceptionally well in laboratory diagnostics." }
  ]);

  const loadChildren = async () => {
    try {
      const { data } = await api.get("/academic/parent/children");
      setChildren(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  const handleSelectChild = (e) => {
    setSelectedChildIndex(Number(e.target.value));
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;
    const activeChild = children[selectedChildIndex];
    try {
      await api.post("/academic/leaves", {
        studentId: activeChild._id,
        studentName: activeChild.name,
        className: activeChild.class,
        section: activeChild.section,
        reason: leaveReason
      });
      setLeaveMessage("Leave application submitted successfully!");
      setLeaveReason("");
    } catch (err) {
      alert("Failed to submit leave application: " + err.message);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    setChatLogs([...chatLogs, { sender: "parent", text: chatText }]);
    setChatText("");
  };

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const activeChild = children[selectedChildIndex];

  return (
    <div className="erp-shell role-parent">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">P</span>
          <div>
            <strong>Parent Hub</strong>
            <small>TPIHS Pakistan</small>
          </div>
        </div>

        <nav className="side-nav">
          <button className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}>📅 Attendance Log</button>
          <button className={activeTab === "vouchers" ? "active" : ""} onClick={() => setActiveTab("vouchers")}>💳 Fee Challans</button>
          <button className={activeTab === "operations" ? "active" : ""} onClick={() => setActiveTab("operations")}>🚌 Transport & Hostel</button>
          <button className={activeTab === "canteen" ? "active" : ""} onClick={() => setActiveTab("canteen")}>🍔 Canteen & Library</button>
          <button className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}>💬 Teacher Chat</button>
          <button className={activeTab === "leave" ? "active" : ""} onClick={() => setActiveTab("leave")}>✉ Apply for Leave</button>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div>
              <p className="eyebrow">Guardian Control Dashboard</p>
              <h1>Parent Switcher Console</h1>
            </div>

            {/* Child Selector Dropdown */}
            {children.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>SELECT CHILD:</span>
                <select value={selectedChildIndex} onChange={handleSelectChild} style={{ background: "#000", border: "none", color: "#fff", fontWeight: "bold", outline: "none", cursor: "pointer" }}>
                  {children.map((child, idx) => (
                    <option key={child._id} value={idx}>{child.name} ({child.rollNumber})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="user-chip">
            <span>Parent Account</span>
            <button onClick={logout}>Logout</button>
          </div>
        </header>

        {activeChild ? (
          <div className="page-stack">
            
            {/* CHILD META STATS */}
            <section className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <div className="stat-card">
                <span>Active Student</span>
                <strong>{activeChild.name}</strong>
                <small>Roll: {activeChild.rollNumber}</small>
              </div>
              <div className="stat-card">
                <span>Discipline</span>
                <strong>{activeChild.class}</strong>
                <small>Session: {activeChild.section}</small>
              </div>
              <div className="stat-card">
                <span>Semester / Term</span>
                <strong>{activeChild.extraData?.SEMESTER || "Semester 1"}</strong>
                <small>TPIHS Academic Track</small>
              </div>
              <div className="stat-card">
                <span>Father Name</span>
                <strong>{activeChild.parentName || "N/A"}</strong>
                <small>Emergency Contact: {activeChild.parentPhone || "N/A"}</small>
              </div>
            </section>

            {/* TAB CONTENTS */}
            
            {activeTab === "attendance" && (
              <section className="card">
                <h2>Child Attendance Calendar Visualization</h2>
                <p>Detailed daily records with status indicators (Present, Absent, Leave, Short Leave).</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginTop: "16px", maxWidth: "450px" }}>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const status = i % 15 === 0 ? "Absent" : i % 22 === 0 ? "Leave" : i % 28 === 0 ? "Short Leave" : "Present";
                    const color = status === "Present" ? "#10b981" : status === "Absent" ? "#ef4444" : status === "Leave" ? "#eab308" : "#a855f7";
                    return (
                      <div key={i} style={{ padding: "8px", background: "rgba(0,0,0,0.3)", border: `1px solid ${color}`, borderRadius: "6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>July {i + 1}</span>
                        <div style={{ fontSize: "0.68rem", fontWeight: "bold", color }}>{status}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === "vouchers" && (
              <section className="card">
                <h2>Child Fee Challans & Online Checkout</h2>
                <p>Track bills, installment adjustments, and clear balances via JazzCash or direct bank transfer.</p>
                <div className="table-wrap" style={{ marginTop: "12px" }}>
                  <table className="permission-table">
                    <thead>
                      <tr>
                        <th>Bill Term</th>
                        <th>Amount</th>
                        <th>Late Fine</th>
                        <th>Concession Concession</th>
                        <th>Status</th>
                        <th>Payment Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Term 1 Voucher</td>
                        <td>Rs. 25,000</td>
                        <td>Rs. 0</td>
                        <td>Rs. 2,000 (Sibling)</td>
                        <td><span style={{ padding: "2px 8px", background: "rgba(16,185,129,0.2)", color: "#10b981", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "bold" }}>PAID</span></td>
                        <td><button className="mini-action" onClick={() => alert("Downloading payment challan voucher receipt...")}>Download Voucher</button></td>
                      </tr>
                      <tr>
                        <td>Term 2 Voucher</td>
                        <td>Rs. 25,000</td>
                        <td>Rs. 500</td>
                        <td>Rs. 0</td>
                        <td><span style={{ padding: "2px 8px", background: "rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "bold" }}>PENDING</span></td>
                        <td><span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>JazzCash Till ID: 67290</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "operations" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <section className="card">
                  <h2>Transport & Route Tracking</h2>
                  <p>Keep monitor of vehicles, schedules, and locations.</p>
                  <div className="feature-grid" style={{ marginTop: "12px" }}>
                    <div className="feature-item">
                      <strong>Vehicle Model:</strong> Toyota HiAce Coaster
                    </div>
                    <div className="feature-item">
                      <strong>Registration Plate:</strong> Peshawar PK-7819
                    </div>
                    <div className="feature-item">
                      <strong>Driver Details:</strong> Muhammad Asghar (0300-1234567)
                    </div>
                    <div className="feature-item">
                      <strong>Route Status:</strong> Mardan Outer Ring Road Route (Active)
                    </div>
                  </div>
                </section>

                <section className="card">
                  <h2>Hostel Mess & Room Placement</h2>
                  <p>Details of student placement inside campus residency.</p>
                  <div className="feature-grid" style={{ marginTop: "12px" }}>
                    <div className="feature-item">
                      <strong>Residence Block:</strong> Avicenna Residency Block B
                    </div>
                    <div className="feature-item">
                      <strong>Room Assignment:</strong> Suite 304 (First Floor)
                    </div>
                    <div className="feature-item">
                      <strong>Mess Card Balance:</strong> Rs. 4,500
                    </div>
                    <div className="feature-item">
                      <strong>Mess Meal Pass:</strong> Lunch and Dinner Included
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "canteen" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <section className="card">
                  <h2>Canteen Wallet & POS History</h2>
                  <p>Smart wallet ledgers for student food expenses.</p>
                  <div className="feature-grid" style={{ marginTop: "12px" }}>
                    <div className="feature-item" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Current Wallet Balance:</span>
                      <strong style={{ color: "#2dd4bf" }}>Rs. 1,850</strong>
                    </div>
                    <div className="feature-item">
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "0.8rem" }}>Recent POS Bills:</p>
                      <ul style={{ margin: "6px 0 0 16px", padding: 0, fontSize: "0.75rem", color: "#9ca3af" }}>
                        <li>2026-07-20: Tea & Samosa Combo - Rs. 100</li>
                        <li>2026-07-18: Special Chicken Biryani - Rs. 200</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="card">
                  <h2>Library Book Ledger Index</h2>
                  <p>Catalog of issued academic reference materials.</p>
                  <div className="feature-grid" style={{ marginTop: "12px" }}>
                    <div className="feature-item">
                      <strong>Current Checked-out Book:</strong> Textbook of Medical Radiation Technology (Glazer)
                    </div>
                    <div className="feature-item">
                      <strong>Date of Issuance:</strong> 2026-07-10
                    </div>
                    <div className="feature-item">
                      <strong>Due Return Date:</strong> 2026-07-25
                    </div>
                    <div className="feature-item" style={{ color: "#eab308" }}>
                      <strong>Fines Accumulated:</strong> Rs. 0 (Good Standing)
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "chat" && (
              <section className="card">
                <h2>Direct Teacher Messaging Logs</h2>
                <div style={{ border: "1px solid rgba(255,255,255,0.06)", height: "200px", overflowY: "auto", padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {chatLogs.map((log, i) => (
                    <div key={i} style={{ alignSelf: log.sender === "teacher" ? "flex-start" : "flex-end", maxWidth: "80%", padding: "8px 12px", borderRadius: "10px", background: log.sender === "teacher" ? "rgba(255,255,255,0.03)" : "rgba(6,182,212,0.15)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <strong style={{ fontSize: "0.75rem", color: log.sender === "teacher" ? "#38bdf8" : "#2dd4bf" }}>{log.sender === "teacher" ? "Class Faculty" : "Parent"}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#e5e7eb" }}>{log.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <input
                    type="text"
                    placeholder="Enter message to class teacher..."
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    style={{ flexGrow: 1, padding: "8px 12px", borderRadius: "6px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  />
                  <button className="primary-action" type="submit">SEND MESSAGE</button>
                </form>
              </section>
            )}

            {activeTab === "leave" && (
              <section className="card">
                <h2>Submit Student Leave Application</h2>
                <p>Direct digital submissions to the Academic Coordinator dashboard.</p>
                <form onSubmit={handleApplyLeave} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                  <label>
                    <span>LEAVE REASON DESCRIPTION</span>
                    <textarea
                      placeholder="State leave duration, emergency details, and expected date of return..."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      style={{ minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", outline: "none" }}
                      required
                    />
                  </label>
                  <button className="primary-action" type="submit">SUBMIT APPLICATION</button>
                  {leaveMessage && <p style={{ color: "#10b981", fontSize: "0.85rem", margin: 0 }}>{leaveMessage}</p>}
                </form>
              </section>
            )}

          </div>
        ) : (
          <p>Loading children profiles...</p>
        )}
      </main>
    </div>
  );
}
