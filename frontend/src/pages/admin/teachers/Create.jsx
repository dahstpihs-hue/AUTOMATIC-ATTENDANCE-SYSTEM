import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

const DEPARTMENTS = [
  { value: "RADIOLOGY", label: "RADIOLOGY", className: "dept-radiology" },
  { value: "MLT", label: "MLT", className: "dept-mlt" },
  { value: "DENTAL", label: "DENTAL", className: "dept-dental" },
  { value: "ANAESTHESIA", label: "ANAESTHESIA", className: "dept-anaesthesia" },
];
const SEMESTERS = ["SEMESTER 1", "SEMESTER 2", "SEMESTER 3", "SEMESTER 4", "SEMESTER 5", "SEMESTER 6", "SEMESTER 7", "SEMESTER 8"];

function selectedDepartment(value) {
  return DEPARTMENTS.find((department) => department.value === value) || DEPARTMENTS[0];
}

export default function AddFaculty() {
  const [form, setForm] = useState({
    name: "",
    overallSerial: "",
    departmentSerial: "",
    semester: "",
    department: "RADIOLOGY",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lastCreds, setLastCreds] = useState(null);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { data } = await api.post("/teachers", form);
      setLastCreds(data.credentials || null);
      setMessage(data.message || "FACULTY ADDED SUCCESSFULLY");
      setForm({
        name: "",
        overallSerial: "",
        departmentSerial: "",
        semester: "",
        department: "RADIOLOGY",
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "FAILED TO ADD FACULTY");
    } finally {
      setSaving(false);
    }
  };

  const department = selectedDepartment(form.department);

  return (
    <div className="container entry-page">
      <div className="entry-header">
        <div>
          <p className="eyebrow">TPIHS FACULTY ENTRY</p>
          <h2>ADD FACULTY</h2>
        </div>
        <Link className="link-action primary-action" to="/admin/teachers/list">
          VIEW FACULTY
        </Link>
      </div>

      <form onSubmit={submit} className="card entry-card">
        <div className={`entry-strip ${department.className}`}>
          {department.label} FACULTY RECORD
        </div>

        <div className="form-grid faculty-entry-grid">
          <label>
            <span>OVERALL SERIAL NO</span>
            <input
              min="1"
              placeholder="FIRST TO LAST SERIAL"
              type="number"
              value={form.overallSerial}
              onChange={(event) => update("overallSerial", event.target.value)}
              required
            />
          </label>

          <label>
            <span>DEPARTMENT SERIAL NO</span>
            <input
              min="1"
              placeholder="DEPARTMENT-WISE SERIAL"
              type="number"
              value={form.departmentSerial}
              onChange={(event) => update("departmentSerial", event.target.value)}
              required
            />
          </label>

          <label>
            <span>FACULTY NAME</span>
            <input
              placeholder="ENTER FACULTY NAME"
              value={form.name}
              onChange={(event) => update("name", event.target.value.toUpperCase())}
              required
            />
          </label>

          <label>
            <span>SEMESTER / ASSIGNMENT</span>
            <select
              value={form.semester}
              onChange={(event) => update("semester", event.target.value)}
              required
            >
              <option value="">SELECT SEMESTER</option>
              {SEMESTERS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>DEPARTMENT</span>
            <select
              className={`program-select ${department.className}`}
              value={form.department}
              onChange={(event) => update("department", event.target.value)}
              required
            >
              {DEPARTMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="primary-action submit-wide" type="submit" disabled={saving}>
          {saving ? "ADDING FACULTY..." : "ADD FACULTY AND GENERATE LOGIN"}
        </button>
      </form>

      {message && <div className="card status-card">{message.toUpperCase()}</div>}

      {lastCreds && (
        <div className="credentials-grid">
          <div className="credential-card">
            <span>USERNAME</span>
            <strong>{lastCreds.username || lastCreds.email}</strong>
          </div>
          <div className="credential-card">
            <span>PASSWORD</span>
            <strong>{lastCreds.password}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
