import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { useParams } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5];

export default function StudentTimetable() {
  const { id } = useParams();
  const [timetable, setTimetable] = useState({});
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const studentRes = await api.get(`/students/${id}/profile`);
      setStudent(studentRes.data.student);
      
      const timetableRes = await api.get("/academic/timetable");
      setTimetable(timetableRes.data || {});
    } catch (err) {
      console.error("Error loading student timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const hasAnySlots = Object.values(timetable).some(list => list && list.length > 0);

  if (loading) return <p style={{ padding: "20px", color: "var(--muted)" }}>Loading timetable...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Class Schedule</p>
          <h2 className="single-line-glow">WEEKLY TIMETABLE</h2>
          <p>
            Timetable schedule for <strong>BS {student?.class || "Allied Health"}</strong> (Batch: {student?.section || "N/A"}).
          </p>
        </div>
      </section>

      <section className="card">
        <h3>Class Schedule Matrix</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "-6px 0 20px 0" }}>
          View your daily lectures, rooms, and instructor names below.
        </p>

        {!hasAnySlots ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px" }}>
            <span style={{ fontSize: "2rem" }}>📅</span>
            <h4 style={{ margin: "10px 0 4px 0", color: "#e2e8f0" }}>No Classes Found</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>There are no scheduled lectures uploaded for your department at this time.</p>
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
                              <div style={{ padding: "6px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px" }}>
                                <strong style={{ display: "block", fontSize: "0.8rem", color: "#10b981" }}>{item.subject}</strong>
                                <span style={{ display: "block", fontSize: "0.75rem", color: "#e5e7eb", marginTop: "2px" }}>👨‍🏫 {item.teacher || "Instructor"}</span>
                                <span style={{ display: "block", fontSize: "0.7rem", color: "var(--muted)", marginTop: "2px" }}>📍 Room {item.room || "N/A"}</span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontStyle: "italic" }}>No Lecture</span>
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
