import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { useParams } from "react-router-dom";
import RoleModulePlan from "../../components/RoleModulePlan";

export default function Overview() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await api.get(`/students/${id}/profile`);
    setStudent(data.student);
  };

  if (!student) return <p>Loading...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Student Overview</p>
          <h2>{student.name}</h2>
          <p>
            Class {student.class}-{student.section} academic profile and
            personal record.
          </p>
        </div>
      </section>

      <section className="details-grid">
        <div className="detail-card"><span>Name</span><strong>{student.name}</strong></div>
        <div className="detail-card"><span>Class</span><strong>{student.class}-{student.section}</strong></div>
        <div className="detail-card"><span>Roll Number</span><strong>{student.rollNumber}</strong></div>
        <div className="detail-card"><span>Date of Birth</span><strong>{student.dob?.slice(0, 10) || "N/A"}</strong></div>
        <div className="detail-card wide"><span>Address</span><strong>{student.address || "N/A"}</strong></div>
      </section>

      <RoleModulePlan />
    </div>
  );
}
