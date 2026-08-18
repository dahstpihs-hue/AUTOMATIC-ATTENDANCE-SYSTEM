import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";

export default function Hub() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for boards documents & datesheets
  const datesheet = [
    { date: "2026-07-25", time: "09:00 AM", subject: "BS Radiology (Physics of MIT)", code: "RAD-101" },
    { date: "2026-07-28", time: "09:00 AM", subject: "Clinical Anatomy", code: "ANA-103" }
  ];

  const homework = [
    { date: "2026-07-20", subject: "Anatomy", task: "Review cranial nerves chart and write a 2-page summary.", rating: "★★★★★" },
    { date: "2026-07-19", subject: "Radiology", task: "Complete MCQ test sheet on X-ray production mechanics.", rating: "★★★★☆" }
  ];

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get(`/students/${id}/profile`);
      setStudent(data.student);
      setFees(data.fees || []);
    } catch (err) {
      console.error("Failed to load student hub profiles", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSlip = () => {
    alert("Downloading official board Roll No. Slip (PDF)... 📄");
  };

  const handleDownloadReport = () => {
    window.open(`http://localhost:8080/api/students/${id}/report`, "_blank");
  };

  if (loading || !student) return <p>Loading academic hub details...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Academic Hub</p>
          <h2 className="single-line-glow">STUDENT RECORDS & BOARD DOCUMENTATION</h2>
          <p>Verify homework diaries, download board roll number slips, download report cards, and check fee challans.</p>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
        
        {/* LEFT COLUMN: REGULATORY REPOSITORIES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SECURE DOWNLOAD CABINET */}
          <section className="card">
            <p className="eyebrow">Digital Cabinet</p>
            <h3>Printable Board Documents</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <button className="primary-action" onClick={handleDownloadSlip}>
                ⬇ DOWNLOAD ROLL NO SLIP (PDF)
              </button>
              <button className="primary-action" onClick={handleDownloadReport} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                ⬇ DOWNLOAD ACADEMIC REPORT (PDF)
              </button>
            </div>
          </section>

          {/* EXAMINATIONS DATESHEET */}
          <section className="card">
            <p className="eyebrow">Board Examination</p>
            <h3>Datesheet & Room Layout</h3>
            <div className="feature-grid" style={{ marginTop: "12px" }}>
              {datesheet.map(item => (
                <div key={item.code} className="feature-item" style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{item.subject}</strong>
                    <div style={{ color: "#9ca3af", marginTop: "2px" }}>{item.date} | {item.time}</div>
                  </div>
                  <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{item.code}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: FEE VOUCHERS & DIARY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* DIGITAL DIARY */}
          <section className="card">
            <p className="eyebrow">Daily Journal</p>
            <h3>Homework Diary Feed</h3>
            <div className="feature-grid" style={{ marginTop: "12px" }}>
              {homework.map((hw, idx) => (
                <div key={idx} className="feature-item" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#6b7280" }}>
                    <strong>{hw.subject}</strong>
                    <span>{hw.date}</span>
                  </div>
                  <p style={{ margin: "6px 0 2px 0", fontSize: "0.85rem", color: "#fff" }}>{hw.task}</p>
                  <div style={{ display: "flex", gap: "6px", color: "#eab308", fontSize: "0.8rem", marginTop: "4px" }}>
                    {hw.rating} <span style={{ color: "#9ca3af" }}> (Teacher Review)</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ACCOUNTING LEDGER & FEE CHALLANS */}
          <section className="card">
            <p className="eyebrow">Financial Account</p>
            <h3>Fee Vouchers & Challans</h3>
            <div className="table-wrap" style={{ marginTop: "12px" }}>
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>Due Date</th>
                    <th>Gross Fee</th>
                    <th>Scholarship Concession</th>
                    <th>Late Fine</th>
                    <th>Status</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(fee => (
                    <tr key={fee._id}>
                      <td>{new Date(fee.dueDate).toLocaleDateString()}</td>
                      <td>Rs. {fee.amount}</td>
                      <td>Rs. {fee.discount || 0}</td>
                      <td>Rs. {fee.fine || 0}</td>
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          backgroundColor: fee.paid ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                          color: fee.paid ? "#10b981" : "#ef4444"
                        }}>
                          {fee.paid ? "PAID" : "PENDING"}
                        </span>
                      </td>
                      <td>
                        {fee.paid ? (
                          <span style={{ color: "#6b7280" }}>{fee.paymentMode?.toUpperCase()}</span>
                        ) : (
                          <div style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
                            JazzCash Till: <b>67290</b>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {fees.length === 0 && (
                    <tr>
                      <td colSpan="6">No generated fee vouchers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
