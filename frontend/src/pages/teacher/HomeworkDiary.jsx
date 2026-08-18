import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function HomeworkDiary() {
  const [diaryList, setDiaryList] = useState([
    { id: "1", subject: "BS Radiology", date: "2026-07-20", description: "Solve textbook problems 1-10 on electrostatics.", submissions: 14 },
    { id: "2", subject: "Anatomy", date: "2026-07-19", description: "Draw diagrams of skeletal joints and label bones.", submissions: 22 }
  ]);
  
  const [homeworkForm, setHomeworkForm] = useState({
    subject: "BS Radiology",
    description: ""
  });

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("diary");
  
  const loadLeaves = async () => {
    try {
      const { data } = await api.get("/academic/leaves");
      setLeaves(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleCreateHomework = (e) => {
    e.preventDefault();
    if (!homeworkForm.description) return;
    const newHw = {
      id: String(diaryList.length + 1),
      subject: homeworkForm.subject,
      date: new Date().toISOString().slice(0, 10),
      description: homeworkForm.description,
      submissions: 0
    };
    setDiaryList([newHw, ...diaryList]);
    setHomeworkForm({ ...homeworkForm, description: "" });
  };

  const handleLeaveAction = async (id, status) => {
    try {
      await api.put(`/academic/leaves/${id}`, { status });
      loadLeaves();
    } catch (err) {
      alert("Failed to update leave status: " + err.message);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Faculty Operations</p>
          <h2 className="single-line-glow">HOMEWORK DIARY & STUDENT LEAVE MANAGEMENT</h2>
          <p>Post student tasks, track daily submissions, review star ratings, and authorize leave applications.</p>
        </div>
      </section>

      <section className="card">
        <div className="action-buttons" style={{ marginBottom: "16px" }}>
          <button
            className={activeTab === "diary" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("diary")}
          >
            📋 Homework Diary & Submissions
          </button>
          <button
            className={activeTab === "leaves" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("leaves")}
          >
            ✉ Student Leave Requests ({leaves.filter(l => l.status === "pending").length})
          </button>
        </div>

        {activeTab === "diary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
            <form onSubmit={handleCreateHomework} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3>Post Digital Homework Entry</h3>
              
              <label>
                <span>SUBJECT / DISCIPLINE</span>
                <select
                  value={homeworkForm.subject}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, subject: e.target.value })}
                >
                  <option value="BS Radiology">BS Radiology</option>
                  <option value="Medical Lab Technology">Medical Lab Technology</option>
                  <option value="BS Dental Technology">BS Dental Technology</option>
                  <option value="BS Anaesthesia Technology">BS Anaesthesia Technology</option>
                </select>
              </label>

              <label>
                <span>HOMEWORK TASK DESCRIPTION</span>
                <textarea
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                  placeholder="Type task details, reading reference, and submission deadline..."
                  style={{ minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                  required
                />
              </label>

              <button className="primary-action submit-wide" type="submit">
                POST ENTRY TO STUDENTS DIARY
              </button>
            </form>

            <div>
              <h3>Recent Homework Logs</h3>
              <div className="feature-grid">
                {diaryList.map(hw => (
                  <div key={hw.id} className="feature-item" style={{ background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9ca3af" }}>
                      <strong>{hw.subject}</strong>
                      <span>{hw.date}</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "#f3f4f6" }}>{hw.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>{hw.submissions} Submissions received</span>
                      <div style={{ display: "flex", gap: "2px", color: "#eab308", fontSize: "0.85rem" }}>
                        ★★★★☆ <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}> (4.2 Review)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "leaves" && (
          <div>
            <h3>Active Student Leave Requests</h3>
            <div className="table-wrap" style={{ marginTop: "12px" }}>
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class / Batch</th>
                    <th>Date Received</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(leave => (
                    <tr key={leave.id}>
                      <td>{leave.studentName}</td>
                      <td>{leave.class} - {leave.section}</td>
                      <td>{leave.date}</td>
                      <td>{leave.reason}</td>
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
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
                              className="mini-action"
                              style={{ backgroundColor: "rgba(16,185,129,0.3)", color: "#10b981", border: "1px solid #10b981" }}
                              onClick={() => handleLeaveAction(leave.id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              className="danger-action mini-action"
                              style={{ padding: "4px 8px" }}
                              onClick={() => handleLeaveAction(leave.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan="6">No leave applications found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
