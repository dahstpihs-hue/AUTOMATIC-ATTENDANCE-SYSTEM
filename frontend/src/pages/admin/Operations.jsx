import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";

export default function Operations() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isHod = user.role === "admin";
  const [masterFile, setMasterFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [activeExcelTab, setActiveExcelTab] = useState("");
  const [activity, setActivity] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [missed, setMissed] = useState([]);
  const [resources, setResources] = useState([]);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    type: "link",
    subject: "",
    semester: "",
    className: "",
    section: "",
    url: "",
    description: "",
    audience: "students",
  });

  useEffect(() => {
    loadReports();
    loadResources();
  }, []);

  const loadReports = async () => {
    const [activityRes, defaultersRes, missedRes] = await Promise.all([
      api.get("/attendance/activity"),
      api.get("/attendance/defaulters"),
      api.get("/attendance/faculty-missed"),
    ]);
    setActivity(activityRes.data);
    setDefaulters(defaultersRes.data);
    setMissed(missedRes.data);
  };

  const loadResources = async () => {
    const { data } = await api.get("/resources");
    setResources(data);
  };

  const importMasterExcel = async (e) => {
    e.preventDefault();
    setImportError("");
    setImportStatus("");
    setImportResult(null);

    if (!masterFile) {
      setImportError("Please select the TPIHS master Excel file first.");
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus(`Uploading ${masterFile.name}...`);
      const formData = new FormData();
      formData.append("file", masterFile);

      const { data } = await api.post("/imports/master-excel", formData);
      setImportResult(data);
      setActiveExcelTab(data.exactSheets?.[0]?.name || "");
      setImportStatus(data.message || "Import completed successfully.");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Import failed. Please try again.";
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const addResource = async (e) => {
    e.preventDefault();
    await api.post("/resources", resourceForm);
    setResourceForm({
      title: "",
      type: "link",
      subject: "",
      semester: "",
      className: "",
      section: "",
      url: "",
      description: "",
      audience: "students",
    });
    loadResources();
  };

  const openLedger = () => {
    const token = sessionStorage.getItem("token");
    window.open(`http://localhost:8080/api/attendance/ledger.pdf?token=${token}`, "_blank");
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">TPIHS Operations</p>
          <h2 className="single-line-glow">ATTENDANCE, IMPORTS, REPORTS, AND SHARED RESOURCES</h2>
          <p>Operational tools for the HOD and Coordinator role model.</p>
        </div>
        <button className="primary-action" onClick={openLedger}>PDF Ledger</button>
      </section>

      {isHod && (
        <section className="page-stack">
          <form className="card" onSubmit={importMasterExcel}>
            <p className="eyebrow">Master Excel Import</p>
            <h2>Upload One TPIHS Workbook</h2>
            <p>
              Required tabs: <b>Faculty Data</b>, <b>Students Data</b>, and
              <b> Faculty Login Data</b>.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
            />
            {masterFile && (
              <div className="feature-item" style={{ marginTop: 10 }}>
                Selected file: {masterFile.name} | Size: {Math.round(masterFile.size / 1024)} KB
              </div>
            )}
            <button className="primary-action" disabled={isImporting}>
              {isImporting ? "Uploading..." : "Import Master Sheet"}
            </button>
            {importStatus && (
              <div className="feature-item success-message" style={{ marginTop: 12 }}>
                {importStatus}
              </div>
            )}
            {importError && (
              <div className="feature-item error-message" style={{ marginTop: 12 }}>
                {importError}
              </div>
            )}
            {importResult && (
              <div className="import-report">
                <div className="feature-item">
                  {importResult.message || `Students: ${importResult.studentCount ?? importResult.students.length} | Faculty: ${importResult.facultyCount ?? importResult.faculty.length} | Skipped: ${importResult.skipped.length}`}
                </div>
                <div className="action-buttons" style={{ marginTop: 12 }}>
                  <Link className="mini-action" to="/admin/students/list">Open Students Tab</Link>
                  <Link className="mini-action" to="/admin/teachers/list">Open Faculty Tab</Link>
                </div>
                <div className="feature-item" style={{ marginTop: 12 }}>
                  Database Import Batch ID: {importResult.importBatchId || "-"}
                </div>
                <div className="details-grid" style={{ marginTop: 12 }}>
                  <div className="detail-card">
                    <span>Students Sheet</span>
                    <strong>{importResult.detected?.students?.sheetName || "Not detected"}</strong>
                    <small>Header row: {importResult.detected?.students?.headerRow || "-"} | {(importResult.detected?.students?.headers || []).join(", ") || "No headings found"}</small>
                  </div>
                  <div className="detail-card">
                    <span>Faculty Sheet</span>
                    <strong>{importResult.detected?.faculty?.sheetName || "Not detected"}</strong>
                    <small>Header row: {importResult.detected?.faculty?.headerRow || "-"} | {(importResult.detected?.faculty?.headers || []).join(", ") || "No headings found"}</small>
                  </div>
                  <div className="detail-card">
                    <span>Faculty Login Sheet</span>
                    <strong>{importResult.detected?.facultyLogin?.sheetName || "Not detected"}</strong>
                    <small>Header row: {importResult.detected?.facultyLogin?.headerRow || "-"} | {(importResult.detected?.facultyLogin?.headers || []).join(", ") || "No headings found"}</small>
                  </div>
                </div>
                <div className="card" style={{ marginTop: 12 }}>
                  <p className="eyebrow">Exact Excel Data</p>
                  <h2>Tabs, Headings, Rows & Columns</h2>
                  <div className="action-buttons">
                    {(importResult.exactSheets || []).map((sheet) => (
                      <button
                        type="button"
                        className={activeExcelTab === sheet.name ? "mini-action" : ""}
                        onClick={() => setActiveExcelTab(sheet.name)}
                        key={sheet.name}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>

                  {(importResult.exactSheets || [])
                    .filter((sheet) => sheet.name === activeExcelTab)
                    .map((sheet) => (
                      <div className="excel-sheet" key={sheet.name}>
                        <div className="feature-item" style={{ marginTop: 12 }}>
                          <b>Tab:</b> {sheet.name} | <b>Header Row:</b> {sheet.headerRow || "-"} | <b>Rows:</b> {sheet.rowCount} | <b>Columns:</b> {sheet.columnCount}
                        </div>
                        <div className="table-wrap" style={{ marginTop: 10 }}>
                          <table className="permission-table excel-table">
                            <thead>
                              <tr>
                                <th>Excel Row</th>
                                {(sheet.headers || []).map((header, index) => (
                                  <th key={`${sheet.name}-head-${index}`}>{header || `Column ${index + 1}`}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(sheet.rows || []).map((row) => (
                                <tr key={`${sheet.name}-${row.excelRow}`}>
                                  <td>{row.excelRow}</td>
                                  {(row.values || []).map((value, index) => (
                                    <td key={`${sheet.name}-${row.excelRow}-${index}`}>{value}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
                {importResult.skipped.length > 0 && (
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table className="permission-table">
                      <thead>
                        <tr><th>Type</th><th>Reason</th><th>Expected</th></tr>
                      </thead>
                      <tbody>
                        {importResult.skipped.map((row, index) => (
                          <tr key={`${row.reason}-${index}`}>
                            <td>{row.type || "-"}</td>
                            <td>{row.reason || "-"}</td>
                            <td>{row.expected || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="permission-table">
                    <thead>
                      <tr><th>Imported Section</th><th>Name</th><th>Login</th><th>Relevant Data</th></tr>
                    </thead>
                    <tbody>
                      {importResult.students.map((row) => (
                        <tr key={row.student._id}>
                          <td>Student</td>
                          <td>{row.student.name}</td>
                          <td>{row.credentials.loginId}</td>
                          <td>Class {row.student.class} | Section {row.student.section} | Roll {row.student.rollNumber}</td>
                        </tr>
                      ))}
                      {importResult.faculty.map((row) => (
                        <tr key={row.teacher._id}>
                          <td>Faculty</td>
                          <td>{row.teacher.name}</td>
                          <td>{row.credentials.email}</td>
                          <td>{row.teacher.subject || "Subject N/A"} | {row.teacher.class || "Class N/A"} | {row.teacher.section || "Section N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        </section>
      )}

      <section className="card">
        <p className="eyebrow">Live Activity Feed</p>
        <h2>Current Running Classes</h2>
        {activity.length === 0 ? <p>No class attendance submitted today.</p> : activity.map((item) => (
          <div className="feature-item" key={`${item.className}-${item.subject}-${item.timeSlot}`}>
            Class {item.className || "-"} {item.section || ""} | {item.subject || "Subject"} | {item.timeSlot || "Time"} | {item.count} marked | {item.faculty}
          </div>
        ))}
      </section>

      <section className="details-grid">
        <div className="card">
          <p className="eyebrow">75% Rule</p>
          <h2>Attendance Defaulters</h2>
          {defaulters.length === 0 ? <p>No defaulters detected.</p> : defaulters.map((row) => (
            <p key={row.student._id}><b>{row.student.name}</b> - {row.percentage}%</p>
          ))}
        </div>

        <div className="card">
          <p className="eyebrow">Faculty Activity</p>
          <h2>Missed Submissions</h2>
          {missed.length === 0 ? <p>No missed submissions detected.</p> : missed.map((row) => (
            <p key={row.teacher._id}><b>{row.teacher.name}</b> - {row.message}</p>
          ))}
        </div>
      </section>

      {isHod && (
        <form className="card" onSubmit={addResource}>
          <p className="eyebrow">Resources</p>
          <h2>Upload / Share Resource</h2>
          <input placeholder="Title" value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} required />
          <input placeholder="Subject" value={resourceForm.subject} onChange={(e) => setResourceForm({ ...resourceForm, subject: e.target.value })} />
          <input placeholder="Class" value={resourceForm.className} onChange={(e) => setResourceForm({ ...resourceForm, className: e.target.value })} />
          <input placeholder="Semester" value={resourceForm.semester} onChange={(e) => setResourceForm({ ...resourceForm, semester: e.target.value })} />
          <input placeholder="URL / Drive Link" value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} />
          <textarea placeholder="Description" value={resourceForm.description} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} />
          <select value={resourceForm.audience} onChange={(e) => setResourceForm({ ...resourceForm, audience: e.target.value })}>
            <option value="students">Students</option>
            <option value="faculty">Faculty</option>
            <option value="all">All</option>
          </select>
          <button className="primary-action">Share Resource</button>
        </form>
      )}

      <section className="card">
        <p className="eyebrow">Shared Resources</p>
        <h2>Resource Library</h2>
        {resources.length === 0 ? <p>No resources uploaded.</p> : resources.map((resource) => (
          <div className="feature-item" key={resource._id}>
            <b>{resource.title}</b> | {resource.subject || "General"} | {resource.audience}
            {resource.url && <p><a href={resource.url} target="_blank" rel="noreferrer">{resource.url}</a></p>}
          </div>
        ))}
      </section>
    </div>
  );
}
