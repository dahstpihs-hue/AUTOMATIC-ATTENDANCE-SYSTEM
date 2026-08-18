// src/pages/student/Report.jsx
import React from "react";
import { useParams } from "react-router-dom";

export default function Report() {
  const { id } = useParams();

  const download = () => {
    const token = sessionStorage.getItem("token");
    window.open(`http://localhost:8080/api/students/${id}/report?token=${token}`);
  };

  return (
    <>
      <h2>Download Report</h2>
      <button onClick={download}>Download PDF</button>
    </>
  );
}
