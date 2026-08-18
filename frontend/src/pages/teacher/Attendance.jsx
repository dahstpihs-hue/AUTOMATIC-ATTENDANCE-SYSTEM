import React, { useEffect, useState } from "react";
import api from "../../api/api";

const SLOTS = ["1st Slot", "2nd Slot", "3rd Slot", "4th Slot", "5th Slot"];
const PROGRAMS = ["ALLIED HEALTH SCIENCES", "NURSING", "PHARMACY"];
const DISCIPLINES = ["RADIOLOGY", "MLT", "DENTAL", "ANAESTHESIA"];
const BATCHES = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH"];
const SEMESTERS = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH", "8TH"];

const SUBJECTS_MAP = {
  "ALLIED HEALTH SCIENCES": {
    "RADIOLOGY": {
      "1ST": ["Anatomy I", "Physiology I", "Radiation Physics", "English I"],
      "2ND": ["Anatomy II", "Physiology II", "General Pathology", "Computer Skills"],
      "3RD": ["Imaging Anatomy", "Radiographic Techniques I", "Radiation Protection", "Biostatistics"],
      "4TH": ["Radiographic Techniques II", "Contrast Media", "Clinical Medicine", "Pharmacology"],
      "5TH": ["CT Scan Imaging", "Mammography", "Special Radiographic Techniques", "English III"],
      "6TH": ["MRI Imaging", "Ultrasound I", "Nuclear Medicine", "Research Methodology"],
      "7TH": ["Ultrasound II", "Interventional Radiology", "Biophysics", "Academic Writing"],
      "8TH": ["Clinical Internship", "Research Project", "Radiological Seminar", "Health Care Management"]
    },
    "MLT": {
      "1ST": ["Basic Hematology", "Inorganic Chemistry", "Human Anatomy", "Cell Biology"],
      "2ND": ["Clinical Biochemistry I", "General Microbiology", "Human Physiology", "English II"],
      "3RD": ["Systemic Bacteriology", "Hematology II", "Histopathology I", "Islamic Studies"],
      "4TH": ["Clinical Biochemistry II", "Medical Parasitology", "Clinical Pathology", "Biostatistics"],
      "5TH": ["Medical Virology", "Immunology & Serology", "Histopathology II", "Molecular Biology"],
      "6TH": ["Blood Banking & Transfusion", "Clinical Endocrinology", "Analytical Chemistry", "Research Methods"],
      "7TH": ["Medical Mycology", "Cytopathology", "Advanced Hematology", "Seminar"],
      "8TH": ["Clinical Internship", "Research Thesis", "Laboratory Management", "Professional Ethics"]
    },
    "DENTAL": {
      "1ST": ["Oral Anatomy", "Dental Materials I", "General Physiology", "Islamic Studies"],
      "2ND": ["Oral Physiology", "Dental Materials II", "General Pathology", "English II"],
      "3RD": ["Oral Pathology I", "Pre-Clinical Operative Dentistry", "General Medicine", "Pharmacology"],
      "4TH": ["Oral Pathology II", "Pre-Clinical Prosthodontics", "General Surgery", "Community Dentistry"],
      "5TH": ["Oral Medicine I", "Orthodontics I", "Operative Dentistry I", "Periodontology I"],
      "6TH": ["Oral Surgery I", "Prosthodontics I", "Paedodontics I", "Biostatistics"],
      "7TH": ["Oral Surgery II", "Prosthodontics II", "Operative Dentistry II", "Orthodontics II"],
      "8TH": ["Clinical Dental Internship", "Dental Practice Management", "Research Project", "Dental Ethics"]
    },
    "ANAESTHESIA": {
      "1ST": ["Anatomy of Airway", "Basic Physics of Anaesthesia", "Physiology of Ventilation", "English I"],
      "2ND": ["Pharmacology of Anaesthetic Agents", "Anaesthesia Equipment I", "Pathology of Shock", "Computer Applications"],
      "3RD": ["Anaesthesia Equipment II", "Clinical Monitoring", "Basic Life Support", "Biostatistics"],
      "4TH": ["General Anaesthesia Techniques", "Regional Anaesthesia", "Post-Operative Care", "Emergency Medicine"],
      "5TH": ["Paediatric Anaesthesia", "Obstetric Anaesthesia", "Cardiac Anaesthesia", "Research Methodology"],
      "6TH": ["Critical Care Medicine", "Pain Management", "Neuro-Anaesthesia", "Seminar"],
      "7TH": ["Advanced Airway Management", "Anaesthesia for Day Care Surgery", "Health Administration", "Technical Writing"],
      "8TH": ["Clinical Internship", "Research Thesis", "Anaesthesia Seminar", "Medical Ethics"]
    }
  },
  "NURSING": {
    "1ST": ["Fundamentals of Nursing I", "Microbiology", "Anatomy & Physiology I", "English I"],
    "2ND": ["Fundamentals of Nursing II", "Nutrition", "Anatomy & Physiology II", "Community Health Nursing I"],
    "3RD": ["Adult Health Nursing I", "Pathophysiology", "Pharmacology", "Islamic Studies"],
    "4TH": ["Adult Health Nursing II", "Developmental Psychology", "Nursing Ethics", "English II"],
    "5TH": ["Pediatrics Nursing", "Community Health Nursing II", "Teaching & Learning in Nursing", "Biostatistics"],
    "6TH": ["Mental Health Nursing", "Critical Care Nursing", "Research Methodology", "English III"],
    "7TH": ["Maternity & Gynecological Nursing", "Nursing Leadership & Management", "Nursing Seminar", "Culture & Health"],
    "8TH": ["Senior Elective Clinical", "Nursing Research Project", "Community Nursing Project", "Professional Integration"]
  },
  "PHARMACY": {
    "1ST": ["Pharmaceutics I (Physical)", "Pharmaceutical Chemistry I (Organic)", "Physiology I", "English I"],
    "2ND": ["Pharmaceutics II (Dispensing)", "Pharmaceutical Chemistry II (Inorganic)", "Physiology II", "Anatomy"],
    "3RD": ["Pharmacognosy I", "Pharmaceutical Microbiology", "Biochemistry I", "Islamic Studies"],
    "4TH": ["Pharmacology & Therapeutics I", "Pharmaceutics III (Industrial)", "Biochemistry II", "English II"],
    "5TH": ["Pharmacology & Therapeutics II", "Pharmaceutical Chemistry III (Analysis)", "Pathology", "Biostatistics"],
    "6TH": ["Clinical Pharmacy I", "Biopharmaceutics & Pharmacokinetics", "Pharmacognosy II", "Research Methods"],
    "7TH": ["Clinical Pharmacy II", "Pharmaceutical Biotechnology", "Forensic Pharmacy", "English III"],
    "8TH": ["Pharmacy Practice & Clerkship", "Pharmaceutical Quality Management", "Research Project", "Marketing & Business Management"]
  }
};

const generateTimeOptions = () => {
  const options = [];
  let hour = 8;
  let minute = 15;
  while (hour < 14 || (hour === 14 && minute <= 30)) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour;
    const formattedHour = String(displayHour).padStart(2, "0");
    const formattedMinute = String(minute).padStart(2, "0");
    options.push(`${formattedHour}:${formattedMinute} ${period}`);
    
    minute += 15;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }
  return options;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState("take"); // 'take' or 'logs'
  const [slot, setSlot] = useState("1st Slot");
  const [program, setProgram] = useState("ALLIED HEALTH SCIENCES");
  const [discipline, setDiscipline] = useState("RADIOLOGY");
  const [batch, setBatch] = useState("3RD");
  const [semester, setSemester] = useState("7TH");
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("08:15 AM");
  const [endTime, setEndTime] = useState("09:30 AM");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [loading, setLoading] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const [message, setMessage] = useState(null);

  // Lecture history logs state
  const [lectureLogs, setLectureLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState("");

  const timeOptions = generateTimeOptions();
  const duration = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
  const isTimeInvalid = duration <= 0;

  // Contextual subjects resolver
  const getSubjects = () => {
    if (program === "ALLIED HEALTH SCIENCES") {
      return SUBJECTS_MAP[program]?.[discipline]?.[semester] || [];
    }
    return SUBJECTS_MAP[program]?.[semester] || [];
  };

  const subjectsList = getSubjects();

  // Keep subject in sync with selected category
  useEffect(() => {
    setSubject(subjectsList[0] || "");
  }, [program, discipline, semester]);

  // Auto-select semester based on batch selection from database
  useEffect(() => {
    const autoSelectSemester = async () => {
      try {
        const { data } = await api.get("/students", { params: { batch } });
        if (data && data.length > 0) {
          const semesterCounts = {};
          data.forEach(student => {
            const sem = student.extraData?.SEMESTER || student.extraData?.semester || "";
            if (sem) {
              const upperSem = String(sem).trim().toUpperCase();
              semesterCounts[upperSem] = (semesterCounts[upperSem] || 0) + 1;
            }
          });
          
          let bestSem = "";
          let maxCount = 0;
          Object.keys(semesterCounts).forEach(sem => {
            if (semesterCounts[sem] > maxCount) {
              maxCount = semesterCounts[sem];
              bestSem = sem;
            }
          });
          
          if (bestSem && SEMESTERS.includes(bestSem)) {
            setSemester(bestSem);
          }
        }
      } catch (err) {
        console.error("Failed to auto-select semester:", err);
      }
    };
    autoSelectSemester();
  }, [batch]);

  // Fetch Lecture logs from backend
  const fetchLectureLogs = async () => {
    setLogsLoading(true);
    setMessage(null);
    try {
      const { data } = await api.get("/attendance/lectures");
      setLectureLogs(data);
    } catch (err) {
      console.error("Failed to fetch lecture logs:", err);
      setMessage({ type: "error", text: "Failed to load lecture logs. Please refresh page." });
    } finally {
      setLogsLoading(false);
    }
  };

  // Automatically fetch logs when logs tab is active
  useEffect(() => {
    if (activeTab === "logs") {
      fetchLectureLogs();
    }
  }, [activeTab]);

  const loadAttendanceSheet = async () => {
    if (isTimeInvalid) return;
    setLoading(true);
    setMessage(null);
    setSheetLoaded(false);

    try {
      const activeDiscipline = program === "ALLIED HEALTH SCIENCES" ? discipline : program;
      const { data } = await api.get("/students", {
        params: {
          discipline: activeDiscipline,
          batch,
          semester
        }
      });

      setStudents(data);
      const initialStates = {};
      data.forEach((student) => {
        initialStates[student._id] = { status: "present", note: "" };
      });
      setAttendanceState(initialStates);
      setSheetLoaded(true);
    } catch (err) {
      console.error("Failed to load students:", err);
      setMessage({ type: "error", text: "Failed to load students. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const updateNote = (studentId, note) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note }
    }));
  };

  const markAll = (status) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const submitAttendance = async () => {
    if (!topic.trim()) {
      setMessage({ type: "error", text: "Please enter the topic discussed in today's class." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const records = students.map((s) => ({
      studentId: s._id,
      status: attendanceState[s._id].status,
      note: attendanceState[s._id].note
    }));

    try {
      const activeDiscipline = program === "ALLIED HEALTH SCIENCES" ? discipline : "";
      await api.post("/attendance/bulk", {
        records,
        date,
        subject,
        batch,
        semester,
        timeSlot: slot,
        className: program,
        section: activeDiscipline,
        startTime,
        endTime,
        duration,
        topic
      });

      setMessage({ type: "success", text: `✔ Lecture Attendance Sheet Submitted Successfully! Marked ${students.length} students.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Reset sheet
      setStudents([]);
      setSheetLoaded(false);
      setTopic("");
    } catch (err) {
      console.error("Failed to save attendance:", err);
      setMessage({ type: "error", text: "Failed to submit attendance sheet. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Helper to color code row based on discipline
  const getDisciplineClass = (d) => {
    const cleanD = String(d || "").trim().toUpperCase();
    if (cleanD.includes("RADIOLOGY") || cleanD.includes("RADIO")) return "dept-radiology";
    if (cleanD.includes("MLT") || cleanD.includes("LAB") || cleanD.includes("LABORATORY")) return "dept-mlt";
    if (cleanD.includes("DENTAL") || cleanD.includes("DENT")) return "dept-dental";
    if (cleanD.includes("ANAESTHESIA") || cleanD.includes("ANESTHESIA")) return "dept-anaesthesia";
    if (cleanD.includes("PHARMACY") || cleanD.includes("PHARMA")) return "dept-pharmacy";
    return "dept-default";
  };

  // Filter lecture logs based on search string
  const filteredLogs = lectureLogs.filter((log) => {
    const searchString = logsSearch.toLowerCase();
    return (
      (log.subject || "").toLowerCase().includes(searchString) ||
      (log.topic || "").toLowerCase().includes(searchString) ||
      (log.faculty || "").toLowerCase().includes(searchString) ||
      (log.className || "").toLowerCase().includes(searchString) ||
      (log.section || "").toLowerCase().includes(searchString)
    );
  });

  return (
    <div className="container page-stack">
      <style>{`
        /* Tab switcher buttons */
        .att-tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .att-tab-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.25s ease;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          text-align: center;
        }
        .att-tab-btn.active {
          background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%);
          border: none;
          color: #fff;
          box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
        }
        .att-tab-btn.inactive {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
        }
        .att-tab-btn.inactive:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .att-glass-panel {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          margin-bottom: 24px;
        }
        .att-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .att-grid {
            grid-template-columns: 1fr;
          }
        }
        .att-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .att-input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .att-select, .att-text-input {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .att-select:focus, .att-text-input:focus {
          border-color: #38bdf8;
        }
        .att-duration-badge {
          display: inline-block;
          margin-top: 4px;
          font-size: 0.75rem;
          color: #38bdf8;
          font-weight: 700;
        }
        .time-warning {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fca5a5;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          margin-top: 8px;
        }
        .att-load-btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%);
          border: none;
          color: #fff;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .att-load-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(2, 132, 199, 0.4);
        }
        .att-load-btn:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
        }
        .bulk-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .bulk-btn {
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          cursor: pointer;
        }
        .bulk-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .student-row-layout {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .table-wrap {
          width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          margin-bottom: 20px !important;
          border-radius: 8px !important;
        }
        @media (max-width: 600px) {
          .student-row-layout {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .att-glass-panel {
            padding: 16px !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
          }
          .att-tabs-container {
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .att-tab-btn {
            padding: 10px 12px !important;
            font-size: 0.78rem !important;
          }
          .att-grid {
            gap: 12px !important;
          }
          .att-input-group {
            margin-bottom: 12px !important;
          }
          .permission-table th, .permission-table td {
            padding: 8px 6px !important;
            font-size: 0.75rem !important;
            white-space: nowrap !important;
          }
          .status-btn {
            width: 28px !important;
            height: 28px !important;
            font-size: 0.75rem !important;
          }
          .status-button-group {
            gap: 4px !important;
          }
          .note-input {
            width: 100px !important;
            font-size: 0.72rem !important;
            padding: 4px 6px !important;
          }
          .att-load-btn {
            padding: 10px !important;
            font-size: 0.82rem !important;
          }
          .hero-panel {
            padding: 24px 16px !important;
          }
          .hero-panel h2 {
            font-size: 1.4rem !important;
          }
        }
        .status-button-group {
          display: flex;
          gap: 6px;
        }

        /* High contrast status buttons design */
        .status-button-group {
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;
        }
        .status-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-weight: 900;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(0, 0, 0, 0.08) !important;
          border: 2px solid rgba(0, 0, 0, 0.25) !important;
          color: rgba(0, 0, 0, 0.6) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .status-btn:hover {
          transform: scale(1.15);
          border-color: rgba(0, 0, 0, 0.5) !important;
          color: #000 !important;
        }
        .status-btn:active {
          transform: scale(0.9);
        }
        
        /* Row-dependent inactive status button adjustments */
        tr.dept-mlt .status-btn,
        tr.dept-dental .status-btn,
        tr.dept-anaesthesia .status-btn,
        tr.dept-pharmacy .status-btn,
        tr.dept-default .status-btn {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 2px solid rgba(255, 255, 255, 0.25) !important;
          color: rgba(255, 255, 255, 0.7) !important;
        }
        tr.dept-mlt .status-btn:hover,
        tr.dept-dental .status-btn:hover,
        tr.dept-anaesthesia .status-btn:hover,
        tr.dept-pharmacy .status-btn:hover,
        tr.dept-default .status-btn:hover {
          border-color: rgba(255, 255, 255, 0.5) !important;
          color: #fff !important;
        }

        /* Active Glowing Selection States */
        .status-btn.btn-p.active {
          background: #10b981 !important;
          border-color: #10b981 !important;
          color: #ffffff !important;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.75) !important;
        }
        .status-btn.btn-a.active {
          background: #ef4444 !important;
          border-color: #ef4444 !important;
          color: #ffffff !important;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.75) !important;
        }
        .status-btn.btn-l.active {
          background: #f59e0b !important;
          border-color: #f59e0b !important;
          color: #ffffff !important;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.75) !important;
        }
        .status-btn.btn-sl.active {
          background: #6366f1 !important;
          border-color: #6366f1 !important;
          color: #ffffff !important;
          box-shadow: 0 0 14px rgba(99, 102, 241, 0.75) !important;
        }

        .note-input {
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px;
          padding: 6px 10px;
          color: inherit !important;
          font-size: 0.8rem;
          width: 150px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .note-input::placeholder {
          color: inherit !important;
          opacity: 0.6 !important;
        }
        .note-input:focus {
          border-color: rgba(255, 255, 255, 0.5) !important;
          background: rgba(255, 255, 255, 0.2) !important;
        }
        tr.dept-radiology .note-input {
          background: rgba(0, 0, 0, 0.05) !important;
          border: 1px solid rgba(0, 0, 0, 0.2) !important;
        }
        tr.dept-radiology .note-input:focus {
          background: rgba(0, 0, 0, 0.1) !important;
          border-color: rgba(0, 0, 0, 0.4) !important;
        }

        /* Grid lines & borders layout */
        .permission-table {
          border-collapse: collapse !important;
          width: 100% !important;
          border: 2px solid rgba(255, 255, 255, 0.25) !important;
          background: transparent !important;
        }
        .permission-table th {
          background-color: rgba(0, 0, 0, 0.85) !important;
          color: #fff !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          padding: 12px 10px !important;
          text-align: center !important;
        }
        .permission-table td {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          padding: 12px 10px !important;
          text-align: center !important;
        }         /* Dynamic table header styling */
        .permission-table.dept-radiology th { background-color: #ffd21f !important; color: #211800 !important; border: 1px solid rgba(33, 24, 0, 0.25) !important; }
        .permission-table.dept-mlt th { background-color: #650000 !important; color: #fff2f2 !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table.dept-dental th { background-color: #08206f !important; color: #f1f5ff !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table.dept-anaesthesia th { background-color: #064e3b !important; color: #ecfdf5 !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table.dept-pharmacy th { background-color: #7c3f12 !important; color: #fff7ed !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table.dept-default th { background-color: #0f766e !important; color: #ecfeff !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }

        /* Full Row Discipline Color Coding - targets th & td explicitly for all columns */
        .permission-table tr.dept-radiology td { background-color: #ffd21f !important; border: 1px solid rgba(33, 24, 0, 0.25) !important; }
        .permission-table tr.dept-radiology td,
        .permission-table tr.dept-radiology td *:not(.status-btn) {
          color: #211800 !important;
        }

        .permission-table tr.dept-mlt td { background-color: #650000 !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table tr.dept-mlt td,
        .permission-table tr.dept-mlt td *:not(.status-btn) {
          color: #fff2f2 !important;
        }

        .permission-table tr.dept-dental td { background-color: #08206f !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table tr.dept-dental td,
        .permission-table tr.dept-dental td *:not(.status-btn) {
          color: #f1f5ff !important;
        }

        .permission-table tr.dept-anaesthesia td { background-color: #064e3b !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table tr.dept-anaesthesia td,
        .permission-table tr.dept-anaesthesia td *:not(.status-btn) {
          color: #ecfdf5 !important;
        }

        .permission-table tr.dept-pharmacy td { background-color: #7c3f12 !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table tr.dept-pharmacy td,
        .permission-table tr.dept-pharmacy td *:not(.status-btn) {
          color: #fff7ed !important;
        }

        .permission-table tr.dept-default td { background-color: #0f766e !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
        .permission-table tr.dept-default td,
        .permission-table tr.dept-default td *:not(.status-btn) {
          color: #ecfeff !important;
        }
      `}</style>

      <section className="hero-panel attendance-hero">
        <div>
          <p className="eyebrow">TPIHS ERP SYSTEMS</p>
          <h2>LECTURE ATTENDANCE DESK</h2>
          <p>Configure the lecture parameters, load the class directory, and mark the daily student log.</p>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className="att-tabs-container">
        <button 
          className={`att-tab-btn ${activeTab === "take" ? "active" : "inactive"}`} 
          onClick={() => setActiveTab("take")}
        >
          Take Attendance
        </button>
        <button 
          className={`att-tab-btn ${activeTab === "logs" ? "active" : "inactive"}`} 
          onClick={() => setActiveTab("logs")}
        >
          Lecture History Logs
        </button>
      </div>

      {message && (
        <div style={{
          padding: "12px 18px",
          borderRadius: "8px",
          border: "1px solid",
          backgroundColor: "rgba(0,0,0,0.5)",
          marginBottom: "20px",
          fontSize: "0.85rem",
          borderColor: message.type === "success" ? "#10b981" : message.type === "warning" ? "#f59e0b" : "#ef4444",
          color: message.type === "success" ? "#a7f3d0" : message.type === "warning" ? "#fde68a" : "#fca5a5"
        }}>
          {message.text}
        </div>
      )}

      {/* TAB 1: TAKE ATTENDANCE */}
      {activeTab === "take" && (
        <>
          {/* LECTURE SETTINGS BOX (The "Best Box with Boxes") */}
          <section className="att-glass-panel">
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: "16px", letterSpacing: "0.5px" }}>LECTURE PROFILE</h3>
            
            <div className="att-grid">
              <div>
                <div className="att-input-group">
                  <label>Class Slot</label>
                  <select className="att-select" value={slot} onChange={(e) => setSlot(e.target.value)}>
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="att-input-group">
                  <label>Program</label>
                  <select className="att-select" value={program} onChange={(e) => setProgram(e.target.value)}>
                    {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {program === "ALLIED HEALTH SCIENCES" && (
                  <div className="att-input-group">
                    <label>Discipline</label>
                    <select className="att-select" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                      {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <div className="att-input-group">
                  <label>Batch</label>
                  <select className="att-select" value={batch} onChange={(e) => setBatch(e.target.value)}>
                    {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="att-input-group">
                  <label>Semester</label>
                  <select className="att-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
                    {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="att-input-group">
                  <label>Date</label>
                  <input type="date" className="att-select" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="att-input-group">
                  <label>Subject</label>
                  <select className="att-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {subjectsList.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>

                <div className="att-input-group">
                  <label>Class Start Time</label>
                  <select className="att-select" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                    {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="att-input-group">
                  <label>Class End Time</label>
                  <select className="att-select" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                    {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {!isTimeInvalid ? (
                    <span className="att-duration-badge">Calculated Duration: {duration} minutes</span>
                  ) : (
                    <div className="time-warning">
                      ⚠️ Ending time must be later than starting time.
                    </div>
                  )}
                </div>

                <div className="att-input-group">
                  <label>Class Topic / Agenda</label>
                  <input 
                    type="text" 
                    className="att-text-input" 
                    placeholder="What will be discussed today?" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              className="att-load-btn" 
              onClick={loadAttendanceSheet} 
              disabled={loading || isTimeInvalid}
              style={{ marginTop: "12px" }}
            >
              {loading ? "SEARCHING REGISTRY..." : "LETS LOAD THE ATTENDANCE SHEET"}
            </button>
          </section>

          {/* DYNAMIC ATTENDANCE MARKING SHEET */}
          {sheetLoaded && students.length > 0 && (
            <section className="att-glass-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: 0 }}>ATTENDANCE SHEET</h3>
                
                <div className="bulk-actions">
                  <button className="bulk-btn" onClick={() => markAll("present")}>Mark All Present</button>
                  <button className="bulk-btn" onClick={() => markAll("absent")}>Mark All Absent</button>
                </div>
              </div>

              <div className="table-wrap">
                <table className={`permission-table attendance-table ${getDisciplineClass(program === "ALLIED HEALTH SCIENCES" ? discipline : program)}`}>
                  <thead>
                    <tr>
                      <th>SERIAL NO.</th>
                      <th>DISCIPLINE S.NO.</th>
                      <th>STUDENT NAME</th>
                      <th>FATHER NAME</th>
                      <th>ATTENDANCE STATUS</th>
                      <th>PERCENTAGE</th>
                      <th>OPTIONAL NOTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeDiscipline = program === "ALLIED HEALTH SCIENCES" ? discipline : program;
                      const tableClass = getDisciplineClass(activeDiscipline);
                      return students.map((student, index) => {
                        const state = attendanceState[student._id] || { status: "present", note: "" };

                        return (
                          <tr key={student._id} className={tableClass}>
                            <td>{index + 1}</td>
                            <td>
                              <span style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                                {activeDiscipline} #{index + 1}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }}>{student.name}</span>
                            </td>
                            <td>
                              <span>{student.parentName || student.extraData?.["FATHER NAME"] || "N/A"}</span>
                            </td>
                            <td>
                              <div className="status-button-group">
                                <button 
                                  className={`status-btn btn-p ${state.status === "present" ? "active" : ""}`}
                                  title="Present"
                                  onClick={() => updateStatus(student._id, "present")}
                                >
                                  P
                                </button>
                                <button 
                                  className={`status-btn btn-a ${state.status === "absent" ? "active" : ""}`}
                                  title="Absent"
                                  onClick={() => updateStatus(student._id, "absent")}
                                >
                                  A
                                </button>
                                <button 
                                  className={`status-btn btn-l ${state.status === "leave" ? "active" : ""}`}
                                  title="On Leave"
                                  onClick={() => updateStatus(student._id, "leave")}
                                >
                                  L
                                </button>
                                <button 
                                  className={`status-btn btn-sl ${state.status === "shortLeave" ? "active" : ""}`}
                                  title="Short Leave"
                                  onClick={() => updateStatus(student._id, "shortLeave")}
                                >
                                  SL
                                </button>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }}>{student.attendancePercentage ?? 100}%</span>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                placeholder="e.g. Leave reason" 
                                className="note-input"
                                value={state.note}
                                onChange={(e) => updateNote(student._id, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button 
                  className="att-load-btn" 
                  onClick={submitAttendance} 
                  disabled={loading}
                  style={{ maxWidth: "320px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                >
                  {loading ? "SUBMITTING SHEET..." : "SUBMIT ATTENDANCE SHEET"}
                </button>
              </div>
            </section>
          )}

          {/* BIGGER WARNING BOX FOR ZERO SEARCH MATCHES */}
          {sheetLoaded && students.length === 0 && (
            <section className="att-glass-panel" style={{
              border: "2px solid #ef4444",
              background: "rgba(239, 68, 68, 0.08)",
              textAlign: "center",
              padding: "48px 24px",
              boxShadow: "0 10px 40px rgba(239, 68, 68, 0.15)"
            }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>⚠️</div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fca5a5", marginBottom: "12px", letterSpacing: "1px" }}>
                NO STUDENTS REGISTERED IN COHORT
              </h2>
              <p style={{ color: "#fff", fontSize: "0.95rem", opacity: 0.9, maxWidth: "600px", margin: "0 auto 24px", lineHeight: "1.5" }}>
                We could not find any active student matching the selected configuration in the college registry. Please verify the following selection parameters:
              </p>

              <div style={{
                display: "inline-grid",
                gridTemplateColumns: "auto auto",
                gap: "12px 24px",
                textAlign: "left",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "20px 28px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "0.88rem",
                color: "rgba(255, 255, 255, 0.8)",
                marginBottom: "28px"
              }}>
                <div><strong>Program:</strong></div>
                <div style={{ color: "#fff", fontWeight: 700 }}>{program}</div>

                {program === "ALLIED HEALTH SCIENCES" && (
                  <>
                    <div><strong>Discipline:</strong></div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{discipline}</div>
                  </>
                )}

                <div><strong>Batch:</strong></div>
                <div style={{ color: "#fff", fontWeight: 700 }}>{batch} Batch</div>

                <div><strong>Semester:</strong></div>
                <div style={{ color: "#fff", fontWeight: 700 }}>{semester} Semester</div>
              </div>

              <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.82rem", margin: 0 }}>
                HOD / Coordinators can verify active registrations in the <a href="/admin/students/list" style={{ color: "#38bdf8", textDecoration: "underline" }}>Student List</a>.
              </p>
            </section>
          )}
        </>
      )}

      {/* TAB 2: LECTURE HISTORY LOGS */}
      {activeTab === "logs" && (
        <section className="att-glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: 0 }}>LECTURE LOG SHEET</h3>
            
            <input 
              type="text" 
              className="att-text-input" 
              placeholder="🔍 Search subject, faculty, or topic..." 
              value={logsSearch} 
              onChange={(e) => setLogsSearch(e.target.value)} 
              style={{ width: "260px" }}
            />
          </div>

          {logsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.6)" }}>
              <span>LOADING SECURE LECTURE LEDGERS...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.4)" }}>
              <span>No lecture logs found matching filters.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="permission-table attendance-table">
                <thead>
                  <tr>
                    <th>S.NO.</th>
                    <th>DATE</th>
                    <th>FACULTY</th>
                    <th>CLASS SLOT</th>
                    <th>PROGRAM / DISCIPLINE</th>
                    <th>BATCH / SEMESTER</th>
                    <th>SUBJECT</th>
                    <th>TIMINGS (DURATION)</th>
                    <th>TOPIC / AGENDA</th>
                    <th>STRENGTH (P / TOTAL)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => {
                    const disp = log.section || log.className || "General";
                    const disciplineClass = getDisciplineClass(disp);
                    const percent = log.totalStudents > 0 ? Math.round((log.presentCount / log.totalStudents) * 100) : 0;

                    return (
                      <tr key={index} className={disciplineClass}>
                        <td>{index + 1}</td>
                        <td>{new Date(log.date).toLocaleDateString()}</td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{log.faculty || "Faculty"}</span>
                        </td>
                        <td>{log.timeSlot || "N/A"}</td>
                        <td>
                          <span style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                            {log.className} {log.section ? `(${log.section})` : ""}
                          </span>
                        </td>
                        <td>
                          <span>Batch {log.batch} / Sem {log.semester}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{log.subject}</span>
                        </td>
                        <td>
                          {log.startTime} - {log.endTime} ({log.duration} min)
                        </td>
                        <td>
                          <span>{log.topic || "N/A"}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: "bold" }}>
                            {log.presentCount} / {log.totalStudents} ({percent}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
