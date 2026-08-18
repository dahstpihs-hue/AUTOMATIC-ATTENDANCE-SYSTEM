// frontend/src/pages/TeacherProfile.jsx

import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function TeacherProfile() {
  // teacher profile data
  const [teacher, setTeacher] = useState(null);
  // error text
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  // Backend se current logged-in teacher ki profile laate hain
  const load = async () => {
  try {
    const { data } = await api.get("/teachers/me/profile");
    setTeacher(data);
  } catch (err) {
    console.log("Teacher profile error:", err.response?.data || err);
setError(err.response?.data?.message || "Failed to load teacher profile");
  }
};


  if (error) return <p>{error}</p>;
  if (!teacher) return <p>Loading...</p>;

  return (
    <div className="container">
      <h2>Faculty Profile</h2>
      <p><b>Name:</b> {teacher.name}</p>
      <p><b>Email:</b> {teacher.email}</p>
      <p><b>Phone:</b> {teacher.phone}</p>
      <p><b>Subject:</b> {teacher.subject}</p>
      <p><b>Class:</b> {teacher.class} {teacher.section}</p>
      {/* Yaha par teacher ke liye future me attendance, homework etc. add kar sakte ho */}
    </div>
  );
}
