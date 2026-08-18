import React from "react";
import { Link } from "react-router-dom";

const roleLabels = {
  admin: "HOD",
  coordinator: "Coordinator",
  teacher: "Faculty",
  student: "Student",
  parent: "Parent",
};

const modules = [
  {
    title: "Role-based login for HOD, Coordinator, Faculty, and Student",
    scope: {
      admin: "Full account control",
      coordinator: "Coordinator access",
      teacher: "Faculty access",
      student: "Student access",
      parent: "Parent access",
    },
    actions: {
      admin: [
        { label: "Login Settings", to: "/admin/login-settings" },
        { label: "Students", to: "/admin/students/list" },
        { label: "Faculty", to: "/admin/teachers/list" },
      ],
      coordinator: [
        { label: "Students", to: "/admin/students/list" },
        { label: "Faculty", to: "/admin/teachers/list" },
      ],
      teacher: [{ label: "Profile", to: "/teacher/profile" }],
      student: [{ label: "Dashboard", self: "overview" }],
      parent: [{ label: "Switch Child Profile", self: "overview" }],
    },
  },
  {
    title: "Class attendance by subject, batch, semester, and time-slot",
    scope: {
      admin: "View and override",
      coordinator: "View only",
      teacher: "Take own class attendance",
      student: "View own attendance",
      parent: "View child attendance",
    },
    actions: {
      admin: [{ label: "Take Attendance", to: "/admin/attendance" }],
      coordinator: [{ label: "View Attendance", to: "/admin/operations" }],
      teacher: [{ label: "Take Attendance", to: "/teacher/attendance" }],
      student: [{ label: "My Attendance", self: "attendance" }],
      parent: [{ label: "View Attendance", self: "overview" }],
    },
  },
  {
    title: "Per-student attendance status: Present, Absent, Leave, Short Leave",
    scope: {
      admin: "Full review",
      coordinator: "Monitor records",
      teacher: "Mark P/A/L/SL",
      student: "View own status",
      parent: "View child status",
    },
    actions: {
      admin: [{ label: "Review Attendance", to: "/admin/operations" }],
      coordinator: [{ label: "Monitor Attendance", to: "/admin/operations" }],
      teacher: [{ label: "Mark P/A/L/SL", to: "/teacher/attendance" }],
      student: [{ label: "View Status", self: "attendance" }],
      parent: [{ label: "View Status", self: "overview" }],
    },
  },
  {
    title: "Bulk Excel/CSV import for students and faculty",
    scope: {
      admin: "Upload and manage",
      coordinator: "View imported data",
      teacher: "No access",
      student: "No access",
      parent: "No access",
    },
    actions: {
      admin: [{ label: "Open Import", to: "/admin/operations" }],
      coordinator: [
        { label: "Students", to: "/admin/students/list" },
        { label: "Faculty", to: "/admin/teachers/list" },
      ],
    },
  },
  {
    title: "Auto-generated secure passwords for new users",
    scope: {
      admin: "Generate during import/create",
      coordinator: "View only where allowed",
      teacher: "Own account only",
      student: "Own account only",
      parent: "No access",
    },
    actions: {
      admin: [
        { label: "Create Student", to: "/admin/students/create" },
        { label: "Create Faculty", to: "/admin/teachers/create" },
      ],
      teacher: [{ label: "Profile", to: "/teacher/profile" }],
      student: [{ label: "Profile", self: "overview" }],
    },
  },
  {
    title: "PDF lecture ledger export",
    scope: {
      admin: "Export ledger",
      coordinator: "View/export reports",
      teacher: "Own classes only",
      student: "Own report only",
      parent: "No access",
    },
    actions: {
      admin: [{ label: "Export Ledger", action: "ledger" }],
      coordinator: [{ label: "Open Reports", to: "/admin/operations" }],
      teacher: [{ label: "Attendance", to: "/teacher/attendance" }],
      student: [{ label: "My Report", self: "report" }],
    },
  },
  {
    title: "Live activity feed for current running classes",
    scope: {
      admin: "Full live feed",
      coordinator: "Monitor live feed",
      teacher: "Own activity",
      student: "No access",
      parent: "No access",
    },
    actions: {
      admin: [{ label: "Live Feed", to: "/admin/operations" }],
      coordinator: [{ label: "Live Feed", to: "/admin/operations" }],
      teacher: [{ label: "My Activity", to: "/teacher/attendance" }],
    },
  },
  {
    title: "75% attendance defaulter detection",
    scope: {
      admin: "Full defaulter list",
      coordinator: "Flag/report to HOD",
      teacher: "Flag own class issues",
      student: "Own attendance warning",
      parent: "Child attendance alert",
    },
    actions: {
      admin: [{ label: "Defaulter List", to: "/admin/operations" }],
      coordinator: [{ label: "Flag/Report", to: "/admin/operations" }],
      teacher: [{ label: "Class Issues", to: "/teacher/attendance" }],
      student: [{ label: "My Attendance", self: "attendance" }],
      parent: [{ label: "Check Alert", self: "overview" }],
    },
  },
  {
    title: "Faculty activity report for missed attendance submissions",
    scope: {
      admin: "Full faculty report",
      coordinator: "Monitor and report",
      teacher: "Own submission status",
      student: "No access",
      parent: "No access",
    },
    actions: {
      admin: [{ label: "Faculty Report", to: "/admin/operations" }],
      coordinator: [{ label: "Monitor Report", to: "/admin/operations" }],
      teacher: [{ label: "My Submission", to: "/teacher/attendance" }],
    },
  },
  {
    title: "Resource upload and sharing system",
    scope: {
      admin: "Upload and manage",
      coordinator: "View resources",
      teacher: "View own subjects",
      student: "View own resources",
      parent: "View child resources",
    },
    actions: {
      admin: [{ label: "Upload Resources", to: "/admin/operations" }],
      coordinator: [{ label: "View Resources", to: "/admin/operations" }],
      teacher: [{ label: "Faculty Notices", to: "/teacher/notices" }],
      student: [{ label: "Student Notices", self: "notices" }],
      parent: [{ label: "Child Notices", self: "overview" }],
    },
  },
];

export default function RoleModulePlan() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = user.role || "student";
  const roleLabel = roleLabels[role] || "Student";
  const studentId = user.studentId || user.id || user._id;

  const runAction = (action) => {
    if (action.action === "ledger") {
      const token = sessionStorage.getItem("token");
      window.open(`http://localhost:8080/api/attendance/ledger.pdf?token=${token}`, "_blank");
    }
  };

  return (
    <section className="card">
      <p className="eyebrow">{roleLabel} System Feature Plan</p>
      <h2>Core TPIHS Modules & Responsibilities</h2>
      <div className="feature-grid role-feature-grid">
        {modules.map((module) => {
          const actions = module.actions?.[role] || [];
          const permission = module.scope[role] || "No access";
          const hasAccess = permission !== "No access" && permission !== "No";

          return (
            <div className={`feature-item role-feature-item ${!hasAccess ? "is-disabled" : ""}`} key={module.title}>
              <strong>{module.title}</strong>
              <span style={{
                color: hasAccess ? "#2dd4bf" : "rgba(255,255,255,0.3)",
                fontWeight: "bold",
                fontSize: "0.8rem",
                marginTop: "4px",
                display: "block"
              }}>{permission}</span>
              <div className="action-buttons" style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {actions.map((action) => {
                  if (action.self) {
                    if (role === "parent") {
                      return (
                        <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontStyle: "italic" }} key={action.label}>
                          {action.label}
                        </span>
                      );
                    }
                    if (studentId) {
                      return (
                        <Link className="mini-action" to={`/student/${studentId}/${action.self}`} key={action.label}>
                          {action.label}
                        </Link>
                      );
                    }
                  }

                  if (action.to) {
                    return (
                      <Link className="mini-action" to={action.to} key={action.label}>
                        {action.label}
                      </Link>
                    );
                  }

                  return (
                    <button className="mini-action" type="button" onClick={() => runAction(action)} key={action.label}>
                      {action.label}
                    </button>
                  );
                })}
                {!actions.length && <button className="mini-action" type="button" disabled style={{ opacity: 0.5 }}>No Function</button>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
