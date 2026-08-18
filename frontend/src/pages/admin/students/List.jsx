import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";
import { programRowClass } from "../../../utils/programRows";

function exactColumnHeaders(sheet) {
  const width = sheet?.columnCount || sheet?.headers?.length || 0;
  return Array.from({ length: width }, (_, index) => sheet?.headers?.[index] || `Column ${index + 1}`);
}

function collectHeaders(rows) {
  const headers = [];
  rows.forEach((row) => {
    Object.keys(row.extraData || {}).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });
  return headers;
}

function departmentSerialMap(rows, getValues) {
  const counts = {};
  const serials = new Map();
  rows.forEach((row) => {
    const key = programRowClass(getValues(row)) || "program-row--default";
    counts[key] = (counts[key] || 0) + 1;
    serials.set(row.excelRow || row._id, counts[key]);
  });
  return serials;
}

export default function StudentList() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isHod = user.role === "admin";
  const [students, setStudents] = useState([]);
  const [exactImport, setExactImport] = useState(null);
  const [search, setSearch] = useState("");
  const [editingRows, setEditingRows] = useState({});
  const [newValues, setNewValues] = useState([]);
  const [tableMessage, setTableMessage] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const [studentsResult, importResult] = await Promise.allSettled([
        api.get("/students"),
        api.get("/imports/latest-sheet/students"),
      ]);

      setStudents(studentsResult.status === "fulfilled" ? studentsResult.value.data || [] : []);
      setExactImport(importResult.status === "fulfilled" ? importResult.value.data : null);
    } catch (err) {
      console.error("Failed to load students", err);
      setStudents([]);
      setExactImport(null);
    }
  };

  const filtered = students.filter((student) => {
    const q = search.toLowerCase();
    const text = [
      student.name,
      student.rollNumber,
      student.class,
      student.section,
      ...Object.values(student.extraData || {}),
    ].join(" ").toLowerCase();
    return text.includes(q);
  });

  const excelHeaders = useMemo(() => collectHeaders(filtered), [filtered]);
  const exactSheet = exactImport?.sheet;
  const exactHeaders = useMemo(() => exactColumnHeaders(exactSheet), [exactSheet]);
  const exactRows = useMemo(() => {
    const q = search.toLowerCase();
    return (exactSheet?.rows || [])
      .filter((row) => row.excelRow !== exactSheet?.headerRow)
      .filter((row) => (
        !q || [row.excelRow, ...(row.values || [])].join(" ").toLowerCase().includes(q)
      ));
  }, [exactSheet, search]);
  const exactDepartmentSerials = useMemo(
    () => departmentSerialMap(exactRows, (row) => row.values || []),
    [exactRows]
  );
  const databaseDepartmentSerials = useMemo(
    () => departmentSerialMap(filtered, (student) => [
      student.class,
      student.section,
      ...(Object.values(student.extraData || {})),
    ]),
    [filtered]
  );

  const setImportedSheet = (data) => {
    setExactImport(data);
    setTableMessage("Table updated successfully.");
  };

  const changeEditValue = (excelRow, index, value) => {
    setEditingRows((current) => ({
      ...current,
      [excelRow]: current[excelRow].map((cell, cellIndex) => (cellIndex === index ? value : cell)),
    }));
  };

  const startEdit = (row) => {
    setEditingRows((current) => ({
      ...current,
      [row.excelRow]: exactHeaders.map((_, index) => row.values?.[index] || ""),
    }));
  };

  const cancelEdit = (excelRow) => {
    setEditingRows((current) => {
      const next = { ...current };
      delete next[excelRow];
      return next;
    });
  };

  const saveRow = async (excelRow) => {
    const { data } = await api.put(`/imports/latest-sheet/students/rows/${excelRow}`, {
      values: editingRows[excelRow],
    });
    cancelEdit(excelRow);
    setImportedSheet(data);
  };

  const deleteRow = async (excelRow) => {
    if (!window.confirm("Delete this student row? Serial numbers will be reset automatically.")) return;
    const { data } = await api.delete(`/imports/latest-sheet/students/rows/${excelRow}`);
    setImportedSheet(data);
  };

  const addRow = async () => {
    const values = exactHeaders.map((_, index) => (index === 0 ? "" : newValues[index] || ""));
    const { data } = await api.post("/imports/latest-sheet/students/rows", { values });
    setNewValues([]);
    setImportedSheet(data);
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Students Tab</p>
          <h2>Uploaded Students Data</h2>
          <p>All imported student records appear here with their original Excel columns.</p>
        </div>
        <button onClick={loadStudents}>Refresh</button>
      </section>

      <input
        placeholder="Search students, roll no, class, or any uploaded Excel value"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className="card">
        <p className="eyebrow">{exactSheet ? `Exact Excel Tab: ${exactSheet.name}` : "Database Records"}</p>
        <h2>{exactSheet ? `${exactRows.length} Student Data Rows` : `${filtered.length} Students`}</h2>
        {exactSheet && (
          <p>
            Source: {exactImport.fileName} | Header row: {exactSheet.headerRow || "-"} |
            Columns: {exactSheet.columnCount} | Stored rows: {exactSheet.rowCount}
          </p>
        )}
        {tableMessage && <div className="feature-item success-message">{tableMessage}</div>}
        {exactSheet ? (
          <>
            {isHod && (
              <div className="inline-editor">
                <strong>Add Student Row</strong>
                <div className="inline-editor-grid">
                  {exactHeaders.map((header, index) => (
                    <input
                      disabled={index === 0}
                      key={`new-student-${header}-${index}`}
                      onChange={(e) => setNewValues((current) => {
                        const next = [...current];
                        next[index] = e.target.value;
                        return next;
                      })}
                      placeholder={index === 0 ? "Auto serial" : header}
                      value={index === 0 ? "Auto" : newValues[index] || ""}
                    />
                  ))}
                </div>
                <button className="primary-action" onClick={addRow} type="button">Add Row</button>
              </div>
            )}
            <div className="table-wrap">
              <table className="permission-table excel-table editable-table">
              <thead>
                <tr>
                  <th>Overall S.No</th>
                  <th>Department S.No</th>
                  <th>Excel Row</th>
                  {exactHeaders.map((header, index) => (
                    <th key={`${exactSheet.name}-student-head-${index}`}>{header}</th>
                  ))}
                  {isHod && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {exactRows.map((row, index) => (
                  <tr className={programRowClass(row.values)} key={`${exactSheet.name}-${row.excelRow}`}>
                    <td>{index + 1}</td>
                    <td>{exactDepartmentSerials.get(row.excelRow)}</td>
                    <td>{row.excelRow}</td>
                    {exactHeaders.map((_, index) => (
                      <td key={`${exactSheet.name}-${row.excelRow}-${index}`}>
                        {editingRows[row.excelRow] ? (
                          <input
                            className="table-input"
                            disabled={index === 0}
                            onChange={(e) => changeEditValue(row.excelRow, index, e.target.value)}
                            value={editingRows[row.excelRow][index] || ""}
                          />
                        ) : row.values?.[index] || ""}
                      </td>
                    ))}
                    {isHod && (
                      <td className="row-actions">
                        {editingRows[row.excelRow] ? (
                          <>
                            <button type="button" onClick={() => saveRow(row.excelRow)}>Save</button>
                            <button type="button" onClick={() => cancelEdit(row.excelRow)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(row)}>Edit</button>
                            <button type="button" className="danger-action" onClick={() => deleteRow(row.excelRow)}>Delete</button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        ) : filtered.length === 0 ? (
          <p>No students found</p>
        ) : (
          <div className="table-wrap">
            <table className="permission-table">
              <thead>
                <tr>
                  <th>Overall S.No</th>
                  <th>Department S.No</th>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Section</th>
                  {excelHeaders.map((header) => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, index) => (
                  <tr key={student._id}>
                    <td>{index + 1}</td>
                    <td>{databaseDepartmentSerials.get(student._id)}</td>
                    <td><Link className="mini-action" to={`/admin/students/${student._id}`}>Open</Link></td>
                    <td>{student.name}</td>
                    <td>{student.rollNumber}</td>
                    <td>{student.class}</td>
                    <td>{student.section}</td>
                    {excelHeaders.map((header) => (
                      <td key={`${student._id}-${header}`}>{student.extraData?.[header] || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
