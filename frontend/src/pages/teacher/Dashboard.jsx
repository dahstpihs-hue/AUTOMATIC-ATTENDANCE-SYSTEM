import React from "react";
import { Link } from "react-router-dom";
import RoleModulePlan from "../../components/RoleModulePlan";

export default function TeacherDashboard() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>{user.name || "Faculty"}, your classroom tools are ready.</h2>
          <p>
            Mark attendance, review student information, and stay connected
            with college notices.
          </p>
        </div>
        <Link className="primary-action link-action" to="/teacher/attendance">
          Mark Attendance
        </Link>
      </section>

      <section className="stat-grid">
        <Link className="stat-card" to="/teacher/profile">
          <span>Profile</span>
          <strong>My Details</strong>
          <small>Teaching and assigned class information</small>
        </Link>
        <Link className="stat-card" to="/teacher/attendance">
          <span>Attendance</span>
          <strong>Daily Marking</strong>
          <small>Present and absent records</small>
        </Link>
        <Link className="stat-card" to="/teacher/notices">
          <span>Notices</span>
          <strong>Updates</strong>
          <small>Announcements and event dates</small>
        </Link>
      </section>

      <RoleModulePlan />
    </div>
  );
}
