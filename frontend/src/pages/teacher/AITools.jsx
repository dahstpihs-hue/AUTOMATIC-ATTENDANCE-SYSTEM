import React, { useState } from "react";
import api from "../../api/api";

const SUBJECTS = ["Chemistry", "Physics", "Biology", "English", "Math"];
const BOARDS = ["FBISE", "Punjab Board", "Sindh Board", "KPK Board", "Balochistan Board"];

export default function AITools() {
  const [activeTab, setActiveTab] = useState("paper");
  const [paperForm, setPaperForm] = useState({
    subject: "Chemistry",
    className: "BS Allied Health Science",
    board: "FBISE",
    difficulty: "Medium",
    marks: "100",
    timeAllowed: "3 Hours"
  });
  const [notesForm, setNotesForm] = useState({
    subject: "Chemistry",
    topic: "Chemical Equilibrium and Le Chatelier's Principle"
  });
  
  const [loading, setLoading] = useState(false);
  const [paperResult, setPaperResult] = useState("");
  const [notesResult, setNotesResult] = useState("");

  const handleGeneratePaper = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/ai/paper/generate", paperForm);
      setPaperResult(data.text || "");
    } catch (err) {
      alert("Failed to generate exam paper: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotes = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/ai/notes/generate", notesForm);
      setNotesResult(data.text || "");
    } catch (err) {
      alert("Failed to generate notes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Faculty Dashboard</p>
          <h2 className="single-line-glow">AI-POWERED CLASSROOM TEACHING TOOLS</h2>
          <p>Instantly generate board-standard question papers and lecture notes compliant with FBISE regulations.</p>
        </div>
      </section>

      <section className="card">
        <div className="action-buttons" style={{ marginBottom: "16px" }}>
          <button
            className={activeTab === "paper" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("paper")}
          >
            📝 AI Exam Paper Generator
          </button>
          <button
            className={activeTab === "notes" ? "primary-action" : "mini-action"}
            onClick={() => setActiveTab("notes")}
          >
            📚 AI Notes Generator
          </button>
        </div>

        {activeTab === "paper" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
            <form onSubmit={handleGeneratePaper} className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label>
                <span>SUBJECT</span>
                <select
                  value={paperForm.subject}
                  onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                <span>TARGET CLASS</span>
                <input
                  type="text"
                  value={paperForm.className}
                  onChange={(e) => setPaperForm({ ...paperForm, className: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>NATIONAL/PROVINCIAL BOARD</span>
                <select
                  value={paperForm.board}
                  onChange={(e) => setPaperForm({ ...paperForm, board: e.target.value })}
                >
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>

              <label>
                <span>DIFFICULTY BLUEPRINT</span>
                <select
                  value={paperForm.difficulty}
                  onChange={(e) => setPaperForm({ ...paperForm, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy (Conceptual)</option>
                  <option value="Medium">Medium (Balanced)</option>
                  <option value="Hard">Hard (Analytical)</option>
                </select>
              </label>

              <label>
                <span>MAX MARKS</span>
                <input
                  type="number"
                  value={paperForm.marks}
                  onChange={(e) => setPaperForm({ ...paperForm, marks: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>TIME ALLOWED</span>
                <input
                  type="text"
                  value={paperForm.timeAllowed}
                  onChange={(e) => setPaperForm({ ...paperForm, timeAllowed: e.target.value })}
                  required
                />
              </label>

              <button className="primary-action submit-wide" type="submit" disabled={loading}>
                {loading ? "GENERATING PAPER..." : "GENERATE BOARD EXAM PAPER"}
              </button>
            </form>

            <div className="card" style={{ background: "rgba(0,0,0,0.25)", minHeight: "350px", overflow: "auto" }}>
              <p className="eyebrow">Interactive Printable Output</p>
              {paperResult ? (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.8rem", color: "#f3f4f6", margin: 0 }}>
                  {paperResult}
                </pre>
              ) : (
                <p style={{ color: "#6b7280" }}>Generate a paper to see the board layout template here.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
            <form onSubmit={handleGenerateNotes} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label>
                <span>SUBJECT</span>
                <select
                  value={notesForm.subject}
                  onChange={(e) => setNotesForm({ ...notesForm, subject: e.target.value })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                <span>TOPIC / TEXTBOOK SECTION</span>
                <textarea
                  value={notesForm.topic}
                  onChange={(e) => setNotesForm({ ...notesForm, topic: e.target.value })}
                  placeholder="Enter specific topic or chapter name..."
                  style={{ minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                  required
                />
              </label>

              <button className="primary-action submit-wide" type="submit" disabled={loading}>
                {loading ? "COMPILING NOTES..." : "GENERATE SYLLABUS NOTES"}
              </button>
            </form>

            <div className="card" style={{ background: "rgba(0,0,0,0.25)", minHeight: "350px", overflow: "auto" }}>
              <p className="eyebrow">Generated Lecture Outline</p>
              {notesResult ? (
                <div style={{ whiteSpace: "pre-wrap", color: "#e5e7eb", fontSize: "0.85rem", lineHeight: "1.5" }}>
                  {notesResult}
                </div>
              ) : (
                <p style={{ color: "#6b7280" }}>Lecture notes will be parsed and outline topics displayed here.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
