import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

const PROGRAMS = [
  { value: "RADIOLOGY", label: "RADIOLOGY", className: "dept-radiology" },
  { value: "MLT", label: "MLT", className: "dept-mlt" },
  { value: "DENTAL", label: "DENTAL", className: "dept-dental" },
  { value: "ANAESTHESIA", label: "ANAESTHESIA", className: "dept-anaesthesia" },
];

const BATCHES = ["BATCH 1", "BATCH 2", "BATCH 3", "BATCH 4", "BATCH 5"];
const SEMESTERS = ["SEMESTER 1", "SEMESTER 2", "SEMESTER 3", "SEMESTER 4", "SEMESTER 5", "SEMESTER 6", "SEMESTER 7", "SEMESTER 8"];

function selectedProgram(value) {
  return PROGRAMS.find((program) => program.value === value) || PROGRAMS[0];
}

export default function AddStudent() {
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    overallSerial: "",
    departmentSerial: "",
    batch: "",
    semester: "",
    discipline: "RADIOLOGY",
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
      const { data } = await api.post("/students", form);
      setLastCreds(data.credentials || null);
      setMessage(data.message || "STUDENT ADDED SUCCESSFULLY");
      setForm({
        name: "",
        fatherName: "",
        overallSerial: "",
        departmentSerial: "",
        batch: "",
        semester: "",
        discipline: "RADIOLOGY",
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "FAILED TO ADD STUDENT");
    } finally {
      setSaving(false);
    }
  };

  const program = selectedProgram(form.discipline);

  return (
    <div className="container entry-page">
      <div className="entry-header">
        <div>
          <p className="eyebrow">TPIHS STUDENT ENTRY</p>
          <h2>ADD STUDENT</h2>
        </div>
        <Link className="link-action primary-action" to="/admin/students/list">
          VIEW STUDENTS
        </Link>
      </div>

      <form onSubmit={submit} className="card entry-card">
        <div className={`entry-strip ${program.className}`}>
          {program.label} STUDENT RECORD
        </div>

        <div className="form-grid">
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
            <span>STUDENT NAME</span>
            <input
              placeholder="ENTER STUDENT NAME"
              value={form.name}
              onChange={(event) => update("name", event.target.value.toUpperCase())}
              required
            />
          </label>

          <label>
            <span>FATHER NAME</span>
            <input
              placeholder="ENTER FATHER NAME"
              value={form.fatherName}
              onChange={(event) => update("fatherName", event.target.value.toUpperCase())}
              required
            />
          </label>

          <label>
            <span>BATCH</span>
            <select
              value={form.batch}
              onChange={(event) => update("batch", event.target.value)}
              required
            >
              <option value="">SELECT BATCH</option>
              {BATCHES.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>SEMESTER</span>
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
            <span>DISCIPLINE</span>
            <select
              className={`program-select ${program.className}`}
              value={form.discipline}
              onChange={(event) => update("discipline", event.target.value)}
              required
            >
              {PROGRAMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="primary-action submit-wide" type="submit" disabled={saving}>
          {saving ? "ADDING STUDENT..." : "ADD STUDENT AND GENERATE LOGIN"}
        </button>
      </form>

      {message && <div className="card status-card">{message.toUpperCase()}</div>}

      {lastCreds && (
        <div className="credentials-grid">
          <div className="credential-card">
            <span>USERNAME</span>
            <strong>{lastCreds.loginId}</strong>
          </div>
          <div className="credential-card">
            <span>PASSWORD</span>
            <strong>{lastCreds.studentPassword}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
