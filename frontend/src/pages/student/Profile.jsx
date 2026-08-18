id you// src/pages/student/Profile.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import { useParams, useNavigate } from "react-router-dom";

/*
  StudentProfile:
  - If route has :id (useParams().id) -> load that student's profile
  - If no :id (path /student/profile) -> use logged-in user's linked studentId (from sessionStorage.user)
  - Shows Loading..., handles errors, and allows admin actions (edit/delete) only when backend allows.
*/

export default function StudentProfile() {
  const params = useParams();
  const nav = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  // Determine which student id to load:
  // priority: URL param -> logged-in user's linked studentId
  const studentIdFromUrl = params?.id;
  const studentIdFromUser = user?.studentId; // login returns studentId when linked
  const idToLoad = studentIdFromUrl || studentIdFromUser;

  const [data, setData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Load profile safely, wrapped in useCallback to be a stable dependency
  const load = useCallback(async () => {
    try {
      const res = await api.get(`/students/${idToLoad}/profile`);
      setData(res.data);
      setEditForm({
        name: res.data.student.name || "",
        class: res.data.student.class || "",
        section: res.data.student.section || "",
        address: res.data.student.address || "",
        dob: res.data.student.dob ? res.data.student.dob.slice(0, 10) : "",
        rollNumber: res.data.student.rollNumber || ""
      });
    } catch (err) {
      console.error("Failed to load student profile:", err);
      // Using alert is not ideal. Consider a notification component.
      alert(err.response?.data?.message || "Failed to load student profile");
      // If unauthorized or not found, send back to dashboard
      nav("/");
    }
  }, [idToLoad, nav]);

  useEffect(() => {
    if (!idToLoad) {
      // No id known -> redirect to dashboard with message
      // Using alert is not ideal. Consider a notification component.
      alert("No student selected or linked. Contact admin.");
      nav("/");
      return;
    }
    load();
  }, [idToLoad, load, nav]);

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${idToLoad}`, editForm);
      setIsEditing(false);
      await load();
      // Using alert is not ideal. Consider a notification component.
      alert("Student updated");
    } catch (err) {
      console.error("Update failed:", err);
      // Using alert is not ideal. Consider a notification component.
      alert(err.response?.data?.message || "Update failed");
    }
  };

  const deleteStudent = async () => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/students/${idToLoad}`);
      // Using alert is not ideal. Consider a notification component.
      alert("Deleted");
      nav("/admin/students");
    } catch (err) {
      console.error("Delete failed:", err);
      // Using alert is not ideal. Consider a notification component.
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const downloadReport = () => {
    const token = sessionStorage.getItem("token");
    // pass token in query string so PDF endpoint can accept it
    window.open(`${import.meta.env.VITE_API_BASE || "http://localhost:8080"}/api/students/${idToLoad}/report?token=${token}`, "_blank");
  };

  if (!data) return <p>Loading...</p>;

  const totalDays = data.attendance.length;
  const presentDays = data.attendance.filter(a => a.status === "present").length;
  const attendancePercent = totalDays ? Math.round((presentDays * 100) / totalDays) : 0;

  return (
    <div className="container">
      <h2>Student Profile</h2>
      <h3>{data.student.rollNumber} — {data.student.name}</h3>

      {/* Admin-only actions */}
      {user.role === "admin" && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setIsEditing(!isEditing)}>{isEditing ? "Cancel" : "Edit"}</button>
          <button onClick={deleteStudent} style={{ marginLeft: 8 }}>Delete</button>
          <button onClick={downloadReport} style={{ marginLeft: 8 }}>Download PDF</button>
        </div>
      )}

      {/* Edit form */}
      {isEditing && user.role === "admin" && (
        <form onSubmit={saveEdit} className="card" style={{ marginBottom: 16 }}>
          {/* Using a grid for layout is better for alignment. Assuming 'form-grid' class exists. */}
          <div className="form-grid">
            <label>Name: <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></label>
            <label>Class: <input value={editForm.class} onChange={e => setEditForm({ ...editForm, class: e.target.value })} /></label>
            <label>Section: <input value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} /></label>
            <label>Roll Number: <input value={editForm.rollNumber} onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })} /></label>
            <label>Date of Birth: <input type="date" value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} /></label>
            <label>Address: <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></label>
          </div>
          <button type="submit">Save</button>
        </form>
      )}

      {/* Attendance summary */}
      <hr />
      <h3>Attendance Summary</h3>
      <p>Total Days: {totalDays}</p>
      <p>Present: {presentDays}</p>
      <p>Attendance %: {attendancePercent}%</p>

      <div style={{ border: "1px solid #ddd", width: "100%", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: `${attendancePercent}%`, height: "100%", background: "#4caf50" }} />
      </div>

      {/* Attendance list */}
      <h3>Attendance Records</h3>
      {data.attendance.length === 0 ? <p>No attendance</p> : (
        <ul>{data.attendance.map(a => <li key={a._id}>{new Date(a.date).toDateString()} — {a.status}</li>)}</ul>
      )}

      <hr />
      <h3>Fees</h3>
      {data.fees.length === 0 ? <p>No fees</p> : (
        <ul>{data.fees.map(f => <li key={f._id}>₹{f.amount} — {f.paid ? "Paid" : "Pending"}</li>)}</ul>
      )}

      <hr />
      <h3>Notices</h3>
      {data.notices.length === 0 ? <p>No notices</p> : (
        <ul>{data.notices.map(n => <li key={n._id} className="card" style={{ marginBottom: 10 }}><strong>{n.title}</strong><p>{n.message}</p></li>)}</ul>
      )}
    </div>
  );
}
