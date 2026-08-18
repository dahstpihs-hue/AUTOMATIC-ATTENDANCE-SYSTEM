import React, { useEffect, useState } from "react";
import api from "../../api/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5];

export default function TeacherTimetable() {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const loadTimetable = async () => {
    try {
      const { data } = await api.get("/academic/timetable");
      setTimetable(data || {});
    } catch (err) {
      console.error("Error loading teacher timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const hasAnySlots = Object.values(timetable).some(list => list && list.length > 0);

  if (loading) return <p style={{ padding: "20px", color: "var(--muted)" }}>Loading timetable...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Assigned Schedule</p>
          <h2 className="single-line-glow">MY WEEKLY TIMETABLE</h2>
          <p>View your assigned classrooms, subjects, and period timings below.</p>
        </div>
      </section>

      <section className="card">
        <h3>Class Schedule Matrix</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "-6px 0 20px 0" }}>
          This schedule displays only the periods where you are assigned as the course instructor.
        </p>

        {!hasAnySlots ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px" }}>
            <span style={{ fontSize: "2rem" }}>📅</span>
            <h4 style={{ margin: "10px 0 4px 0", color: "#e2e8f0" }}>No Assigned Slots</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>You are not scheduled for any classes in the current timetable batch.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="permission-table">
              <thead>
                <tr>
                  <th>Day</th>
                  {PERIODS.map(p => <th key={p}>Period {p}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const dayPeriods = timetable[day] || [];
                  return (
                    <tr key={day}>
                      <td><strong>{day}</strong></td>
                      {PERIODS.map(period => {
                        const item = dayPeriods.find(p => p.period === period);
                        return (
                          <td key={period} style={{ minWidth: "150px" }}>
                            {item ? (
                              <div style={{ padding: "6px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px" }}>
                                <strong style={{ display: "block", fontSize: "0.8rem", color: "#38bdf8" }}>{item.subject}</strong>
                                <span style={{ display: "block", fontSize: "0.7rem", color: "var(--muted)", marginTop: "2px" }}>📍 {item.room || "No Room"}</span>
                                {item.discipline && (
                                  <span style={{ display: "inline-block", fontSize: "0.6rem", background: "rgba(45, 212, 191, 0.15)", color: "#2dd4bf", padding: "1px 4px", borderRadius: "4px", marginTop: "4px" }}>
                                    {item.discipline}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontStyle: "italic" }}>Free Slot</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
