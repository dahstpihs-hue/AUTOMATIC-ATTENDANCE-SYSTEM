import React, { useEffect, useState } from "react";
import api from "../../api/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5];

export default function AcademicOperations() {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timetable");
  const [conflictWarning, setConflictWarning] = useState("");

  // AI upload and filtering states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [viewMode, setViewMode] = useState("overall");
  const [filterDiscipline, setFilterDiscipline] = useState("RADIOLOGY");
  const [filterTeacher, setFilterTeacher] = useState("");

  // Dynamic Audience Dispatch states
  const [dispatchRoles, setDispatchRoles] = useState([
    "HOD / Admin",
    "Managing Director (MD)",
    "Department Head",
    "Academic Coordinator",
    "Faculty Teachers",
    "Students",
    "Parents"
  ]);
  const [dispatchFormat, setDispatchFormat] = useState("Filter by Class / Department");
  const [showDispatcherConfig, setShowDispatcherConfig] = useState(false);
  
  // Certificate state
  const [certForm, setCertForm] = useState({
    name: "Sufyan Khan",
    rollNumber: "STD-RAD-BATCH-001",
    certType: "Bonafide",
    discipline: "RADIOLOGY"
  });
  const [generatedCert, setGeneratedCert] = useState("");

  const handleAIAnalyze = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadMessage("");
    setShowDispatcherConfig(false);
    try {
      const formData = new FormData();
      formData.append("timetableFile", selectedFile);
      const { data } = await api.post("/academic/timetable/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.success) {
        setTimetable(data.parsed || data.data || {});
        setUploadMessage("✅ AI Timetable analysis complete! Matrix populated. Configure visibility permissions below.");
        setShowDispatcherConfig(true);
      } else {
        setUploadMessage("⚠️ AI analysis failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setUploadMessage("⚠️ Error: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const loadTimetable = async () => {
    try {
      const { data } = await api.get("/academic/timetable");
      setTimetable(data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleCellChange = (day, period, field, value) => {
    const dayPeriods = timetable[day] || [];
    const index = dayPeriods.findIndex(p => p.period === period);
    
    // Check conflicts (simulated simple checker)
    if (field === "teacher" && value.trim() !== "") {
      const isBusy = Object.entries(timetable).some(([d, list]) => 
        list.some(p => p.period === period && p.teacher === value && d === day)
      );
      if (isBusy) {
        setConflictWarning(`⚠️ Conflict Alert: Teacher ${value} is already scheduled in Period ${period} on ${day}!`);
        setTimeout(() => setConflictWarning(""), 4000);
      }
    }

    const updatedPeriod = index >= 0 
      ? { ...dayPeriods[index], [field]: value } 
      : { period, subject: "", teacher: "", room: "", time: "", discipline: (viewMode === "discipline" ? filterDiscipline : ""), [field]: value };

    if (viewMode === "discipline" && !updatedPeriod.discipline) {
      updatedPeriod.discipline = filterDiscipline;
    }

    const nextDayPeriods = index >= 0 
      ? dayPeriods.map((p, i) => i === index ? updatedPeriod : p)
      : [...dayPeriods, updatedPeriod];

    const nextTimetable = { ...timetable, [day]: nextDayPeriods };
    setTimetable(nextTimetable);
  };

  const handleSaveTimetable = async () => {
    try {
      const payload = {
        ...timetable,
        visibility: {
          roles: dispatchRoles,
          format: dispatchFormat
        }
      };
      await api.post("/academic/timetable", payload);
      alert("Timetable saved and visibility adjustments pushed successfully!");
    } catch (err) {
      alert("Failed to save timetable: " + err.message);
    }
  };

  const generateCertificate = (e) => {
    e.preventDefault();
    const layout = `THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES (TPIHS) MARDAN
--------------------------------------------------------
No. TPIHS-CERT-${Math.floor(1000 + Math.random() * 9000)}                Dated: ${new Date().toLocaleDateString()}

                    ${certForm.certType.toUpperCase()} CERTIFICATE
                    
This is to certify that Mr./Ms. ${certForm.name.toUpperCase()} son/daughter of 
Mr. Muhammad Farooq having Roll No: ${certForm.rollNumber} is a regular student of 
this institution in the discipline of BS ${certForm.discipline.toUpperCase()}.
He/She bears a good moral character during his stay at this institute.

We wish him/her success in all future academic endeavors.

                                                        Principal,
                                                        TPIHS Mardan
`;
    setGeneratedCert(layout);
  };

  if (loading) return <p>Loading academic operations...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Admin Operations</p>
          <h2 className="single-line-glow">ACADEMIC TIMETABLE BUILDER & DOCUMENT CERTIFICATION</h2>
          <p>Schedule weekly periods, check conflict detections, build exam datasheets, and print character certificates.</p>
        </div>
      </section>

      {conflictWarning && (
        <div className="card status-card" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444", color: "#fca5a5" }}>
          {conflictWarning}
        </div>
      )}

      <section className="card">
        <div className="action-buttons" style={{ marginBottom: "16px" }}>
          <button
            className={activeTab === "timetable" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("timetable")}
          >
            📅 Weekly Timetable Builder
          </button>
          <button
            className={activeTab === "cert" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("cert")}
          >
            🎓 Certificate Generator
          </button>
        </div>

        {activeTab === "timetable" && (
          <div>
            {/* AI UPLOAD PANEL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "0.95rem" }}>🤖 AI Timetable Upload & Auto-Matrix Population</h4>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "-4px 0 8px 0", lineHeight: "1.4" }}>
                Upload your timetable sheet as a PNG/JPG image or a PDF document. The built-in AI will analyze the slots (subject, teacher, room, and discipline) and automatically populate the editor matrix below.
              </p>
              <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  style={{ fontSize: "0.8rem", color: "#fff", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button
                  type="button"
                  className="primary-action"
                  onClick={handleAIAnalyze}
                  disabled={uploading || !selectedFile}
                  style={{ background: "linear-gradient(135deg, #0d9488 0%, #0284c7 50%, #6d28d9 100%)", opacity: (uploading || !selectedFile) ? 0.6 : 1, padding: "8px 16px", fontSize: "0.8rem" }}
                >
                  {uploading ? "Analyzing document..." : "🔮 Run AI Analysis"}
                </button>
              </div>
              {uploadMessage && (
                <div style={{ fontSize: "0.8rem", color: uploadMessage.includes("Error") || uploadMessage.includes("failed") ? "#ef4444" : "#2dd4bf", marginTop: "4px" }}>
                  {uploadMessage}
                </div>
              )}

              {showDispatcherConfig && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "14px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h5 style={{ margin: "0 0 4px 0", color: "#38bdf8", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>👥 Visibility: Who will see it?</h5>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", background: "rgba(0,0,0,0.15)", padding: "10px", borderRadius: "6px" }}>
                    {[
                      "HOD / Admin",
                      "Managing Director (MD)",
                      "Department Head",
                      "Academic Coordinator",
                      "Faculty Teachers",
                      "Students",
                      "Parents"
                    ].map(role => (
                      <label key={role} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#e2e8f0", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={dispatchRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDispatchRoles([...dispatchRoles, role]);
                            } else {
                              setDispatchRoles(dispatchRoles.filter(r => r !== role));
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                  
                  <h5 style={{ margin: "6px 0 4px 0", color: "#38bdf8", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔍 Format: How will they see it?</h5>
                  <select
                    value={dispatchFormat}
                    onChange={(e) => setDispatchFormat(e.target.value)}
                    style={{ padding: "8px 12px", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer", outline: "none", width: "fit-content" }}
                  >
                    <option value="Filter by Class / Department">Filter by Class / Department</option>
                    <option value="Filter by Teacher Name">Filter by Teacher Name</option>
                    <option value="Show Overall (Unfiltered)">Show Overall (Unfiltered)</option>
                  </select>
                </div>
              )}
            </div>

            {/* TIMETABLE VIEW FILTER PANEL */}
            <div style={{ display: "flex", gap: "14px", alignItems: "center", background: "rgba(3, 7, 18, 0.6)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", marginBottom: "16px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#38bdf8", textShadow: "0 0 8px rgba(56,189,248,0.4)" }}>VIEW FILTER:</span>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                style={{ padding: "6px 10px", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer", outline: "none" }}
              >
                <option value="overall">Show Overall Timetable</option>
                <option value="discipline">Filter by Discipline / Dept</option>
                <option value="teacher">Filter by Teacher Name</option>
              </select>

              {viewMode === "discipline" && (
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  style={{ padding: "6px 10px", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer", outline: "none" }}
                >
                  <option value="RADIOLOGY">RADIOLOGY</option>
                  <option value="PHARMACY">PHARMACY</option>
                  <option value="NURSING">NURSING</option>
                  <option value="MLT">MEDICAL LAB (MLT)</option>
                  <option value="DENTAL">DENTAL</option>
                  <option value="ANAESTHESIA">ANAESTHESIA</option>
                </select>
              )}

              {viewMode === "teacher" && (
                <input
                  type="text"
                  placeholder="Type teacher name (e.g. Dr. Farooq)"
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  style={{ padding: "6px 10px", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "4px", fontSize: "0.8rem", outline: "none" }}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3>Drag-and-Drop Weekly Timetable Matrix</h3>
              <button className="primary-action" onClick={handleSaveTimetable}>SAVE & PUSH SCHEDULE</button>
            </div>
            
            <div className="table-wrap">
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    {PERIODS.map(p => <th key={p}>Period {p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day}>
                      <td><strong>{day}</strong></td>
                      {PERIODS.map(period => {
                        const dayPeriods = timetable[day] || [];
                        const rawItem = dayPeriods.find(p => p.period === period) || { subject: "", teacher: "", room: "", discipline: "" };
                        
                        let matches = true;
                        if (viewMode === "discipline") {
                          matches = String(rawItem.discipline || rawItem.subject || "").toUpperCase().includes(filterDiscipline.toUpperCase());
                        } else if (viewMode === "teacher") {
                          matches = String(rawItem.teacher || "").toLowerCase().includes(filterTeacher.toLowerCase()) && filterTeacher.trim() !== "";
                        }
                        
                        const item = matches ? rawItem : { subject: "", teacher: "", room: "", discipline: "" };

                        return (
                          <td key={period} style={{ minWidth: "160px", opacity: matches ? 1 : 0.35 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <input
                                placeholder="Subject"
                                value={item.subject}
                                onChange={(e) => handleCellChange(day, period, "subject", e.target.value)}
                                style={{ width: "100%", padding: "4px", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" }}
                              />
                              <input
                                placeholder="Teacher"
                                value={item.teacher}
                                onChange={(e) => handleCellChange(day, period, "teacher", e.target.value)}
                                style={{ width: "100%", padding: "4px", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" }}
                              />
                              <input
                                placeholder="Room"
                                value={item.room}
                                onChange={(e) => handleCellChange(day, period, "room", e.target.value)}
                                style={{ width: "100%", padding: "4px", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" }}
                              />
                              {viewMode === "overall" && (
                                <input
                                  placeholder="Discipline"
                                  value={item.discipline || ""}
                                  onChange={(e) => handleCellChange(day, period, "discipline", e.target.value)}
                                  style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "rgba(0,0,0,0.5)", color: "#2dd4bf", border: "1px solid rgba(255,255,255,0.06)" }}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "cert" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
            <form onSubmit={generateCertificate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3>Generate Student Certification Letter</h3>
              <label>
                <span>STUDENT FULL NAME</span>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>ROLL NUMBER</span>
                <input
                  type="text"
                  value={certForm.rollNumber}
                  onChange={(e) => setCertForm({ ...certForm, rollNumber: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>CERTIFICATE TYPE</span>
                <select
                  value={certForm.certType}
                  onChange={(e) => setCertForm({ ...certForm, certType: e.target.value })}
                >
                  <option value="Bonafide">Bonafide / Enrollment</option>
                  <option value="Leaving">College Leaving Certificate</option>
                  <option value="Character">Character Certificate</option>
                </select>
              </label>

              <label>
                <span>DISCIPLINE</span>
                <input
                  type="text"
                  value={certForm.discipline}
                  onChange={(e) => setCertForm({ ...certForm, discipline: e.target.value })}
                  required
                />
              </label>

              <button className="primary-action submit-wide" type="submit">
                GENERATE & CERTIFY DOCUMENT
              </button>
            </form>

            <div className="card" style={{ background: "rgba(0,0,0,0.3)", minHeight: "350px", overflow: "auto" }}>
              <p className="eyebrow">Printable Document Layout Preview</p>
              {generatedCert ? (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.8rem", color: "#f3f4f6", margin: 0, padding: "12px", border: "1px solid rgba(255,255,255,0.06)", background: "#000" }}>
                  {generatedCert}
                </pre>
              ) : (
                <p style={{ color: "#6b7280" }}>Document layout will be drafted here.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
