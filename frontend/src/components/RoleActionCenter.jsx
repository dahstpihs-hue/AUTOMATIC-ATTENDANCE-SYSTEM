import React from "react";
import { Link } from "react-router-dom";

const roleLabels = {
  admin: "HOD",
  coordinator: "Coordinator",
  teacher: "Faculty",
  student: "Student",
};

const actions = [
  {
    title: "Add/Edit/Delete students, faculty",
    permissions: { admin: "Full control", coordinator: "View only", teacher: "No", student: "No" },
    links: {
      admin: [
        { label: "Add Student", to: "/admin/students/create" },
        { label: "Add Faculty", to: "/admin/teachers/create" },
        { label: "Manage Records", to: "/admin/students/list" },
      ],
      coordinator: [{ label: "View Records", to: "/admin/students/list" }],
    },
  },
  {
    title: "Upload/Edit/Delete Timetable, Datesheet, Results",
    permissions: { admin: "Full control", coordinator: "View only", teacher: "View own subjects", student: "View own" },
    buttons: {
      admin: ["Upload Timetable", "Upload Datesheet", "Publish Results"],
      coordinator: ["View Academic Files"],
      teacher: ["View Own Subjects"],
      student: ["View Own Files"],
    },
  },
  {
    title: "Approve/Validate documents",
    permissions: { admin: "Yes", coordinator: "No", teacher: "No", student: "No" },
    buttons: { admin: ["Validate Documents"] },
  },
  {
    title: "Take attendance",
    permissions: { admin: "View only", coordinator: "View only", teacher: "Full control (own classes)", student: "View own" },
    links: {
      admin: [{ label: "View Attendance", to: "/admin/operations" }],
      coordinator: [{ label: "View Attendance", to: "/admin/operations" }],
      teacher: [{ label: "Take Attendance", to: "/teacher/attendance" }],
    },
    studentSelf: true,
  },
  {
    title: "Correct attendance after submission",
    permissions: { admin: "Full override", coordinator: "No", teacher: "Own records only", student: "No" },
    links: {
      admin: [{ label: "Override Attendance", to: "/admin/operations" }],
      teacher: [{ label: "Correct Own Class", to: "/teacher/attendance" }],
    },
  },
  {
    title: "Impose fines",
    permissions: { admin: "Yes", coordinator: "Flag/recommend only", teacher: "Flag only", student: "No" },
    buttons: {
      admin: ["Impose Fine"],
      coordinator: ["Recommend Fine"],
      teacher: ["Flag Fine"],
    },
  },
  {
    title: "Generate fee installments",
    permissions: { admin: "Yes", coordinator: "View only", teacher: "No", student: "View own" },
    links: {
      admin: [{ label: "Generate Installment", to: "/admin/students/list" }],
      coordinator: [{ label: "View Fee Records", to: "/admin/students/list" }],
    },
    studentSelf: true,
  },
  {
    title: "Mark payment as cleared",
    permissions: { admin: "Yes", coordinator: "No", teacher: "No", student: "No" },
    links: { admin: [{ label: "Clear Payment", to: "/admin/students/list" }] },
  },
  {
    title: "Submit faculty evaluation",
    permissions: { admin: "No", coordinator: "No", teacher: "Receives results only", student: "Yes (end of semester)" },
    buttons: {
      teacher: ["View Received Evaluation"],
      student: ["Submit Evaluation"],
    },
  },
  {
    title: "View evaluation results",
    permissions: { admin: "Full", coordinator: "Aggregated only", teacher: "Own aggregated only (anonymous)", student: "No" },
    buttons: {
      admin: ["View All Evaluations"],
      coordinator: ["View Aggregated Results"],
      teacher: ["View Own Results"],
    },
  },
];

function stageAction(label) {
  alert(`${label} module is staged in the TPIHS role workflow. The button is wired and ready for the next implementation screen.`);
}

export default function RoleActionCenter({ studentId }) {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = user.role || "student";
  const roleLabel = roleLabels[role] || "Student";

  return (
    <section className="card">
      <p className="eyebrow">{roleLabel} Functions</p>
      <h2>Relevant Buttons & Permissions</h2>
      <div className="action-grid">
        {actions.map((action) => {
          const permission = action.permissions[role] || "No";
          const links = action.links?.[role] || [];
          const buttons = action.buttons?.[role] || [];
          const allowStudentSelf = action.studentSelf && role === "student" && studentId;
          const disabled = permission === "No" && !allowStudentSelf;

          return (
            <article className={`action-card ${disabled ? "is-disabled" : ""}`} key={action.title}>
              <span>{permission}</span>
              <strong>{action.title}</strong>
              <div className="action-buttons">
                {links.map((link) => (
                  <Link className="mini-action" to={link.to} key={link.label}>{link.label}</Link>
                ))}
                {allowStudentSelf && (
                  <Link className="mini-action" to={`/student/${studentId}/attendance`}>
                    View Own
                  </Link>
                )}
                {buttons.map((label) => (
                  <button type="button" className="mini-action" onClick={() => stageAction(label)} key={label}>
                    {label}
                  </button>
                ))}
                {disabled && <button type="button" className="mini-action" disabled>No Access</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
