const express = require("express");
// mongoose dependency removed
const auth = require("../middleware/auth");
const Student = require("../models/Student");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Attendance = require("../models/Attendance");
const Fee = require("../models/Fee");
const Notice = require("../models/Notice");
const Resource = require("../models/Resource");
const ImportBatch = require("../models/ImportBatch");
const Timetable = require("../models/Timetable");
const multer = require("multer");
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Persistent timetable data is managed via the Timetable collection in MongoDB
let LEAVE_APPLICATIONS = [
  { id: "L1", studentId: "S1", studentName: "Sufyan Khan", class: "RADIOLOGY", section: "BATCH 1", reason: "Medical leave for flu", status: "pending", date: "2026-07-20" }
];

let INVENTORY_DATA = {
  books: [
    { id: "B1", title: "Textbook of Medical Radiology", author: "Glazer", stock: 15, location: "Shelf 4A" },
    { id: "B2", title: "Modern Pharmaceutics", author: "Banker", stock: 8, location: "Shelf 2B" }
  ],
  uniforms: [
    { id: "U1", item: "TPIHS White Coat (Medium)", stock: 45, price: 1200 },
    { id: "U2", item: "TPIHS Insignia Badge", stock: 120, price: 150 }
  ],
  canteen: [
    { id: "C1", item: "Tea & Samosa Combo", price: 100, stock: 50 },
    { id: "C2", item: "Mineral Water (Small)", price: 50, stock: 200 }
  ]
};

let WALLET_TRANSACTIONS = [
  { studentRoll: "STD-RAD-BATCH-001", amount: 150, item: "Tea & Samosa Combo", date: "2026-07-20T12:00:00Z" }
];

const { makeModel } = require("../models/dbAdapter");
const TimetableMetadata = makeModel("timetable_metadata");

// GET /api/academic/timetable
router.get("/timetable", auth(), async (req, res) => {
  try {
    const { role, id } = req.user;
    let discipline = req.query.discipline || "";
    let teacherName = req.query.teacher || "";

    if (role === "student") {
      const student = await Student.findOne({ user: id });
      discipline = student?.class || "";
    } else if (role === "parent") {
      const parentUser = await User.findById(id);
      const parentPhone = parentUser?.parentPhone || parentUser?.loginId || "";
      let children = await Student.find({
        $or: [
          { parentPhone: parentPhone },
          { "extraData.parentPhone": parentPhone }
        ]
      });
      if (children.length === 0) {
        children = await Student.find().limit(2);
      }
      discipline = children[0]?.class || "";
    } else if (role === "teacher") {
      const teacherProfile = await Teacher.findOne({ user: id });
      teacherName = teacherProfile ? teacherProfile.name : req.user.name;
    }

    // Check Dispatch Visibility
    let metadata = await TimetableMetadata.findOne();
    if (!metadata) {
      metadata = {
        roles: ["HOD / Admin", "Managing Director (MD)", "Department Head", "Academic Coordinator", "Faculty Teachers", "Students", "Parents"],
        format: "discipline"
      };
    }
    
    const roleLabels = {
      admin: "HOD / Admin",
      md: "Managing Director (MD)",
      head: "Department Head",
      coordinator: "Academic Coordinator",
      teacher: "Faculty Teachers",
      student: "Students",
      parent: "Parents"
    };
    const userRoleLabel = roleLabels[role] || "Students";
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    if (!metadata.roles.includes(userRoleLabel)) {
      const empty = {};
      days.forEach(d => empty[d] = []);
      return res.json(empty);
    }

    const rawSlots = await Timetable.find();
    
    const timetable = {};
    days.forEach(d => timetable[d] = []);

    rawSlots.forEach(slot => {
      const day = slot.day;
      if (!timetable[day]) timetable[day] = [];
      
      let matches = false;
      if (role === "teacher") {
        const tVal = (slot.teacher || "").toLowerCase().trim();
        const uVal = (teacherName || "").toLowerCase().trim();
        if (tVal && uVal && (tVal.includes(uVal) || uVal.includes(tVal))) {
          matches = true;
        }
      } else if (role === "student" || role === "parent") {
        const dVal = (slot.discipline || "").toUpperCase().trim() || (slot.subject || "").toUpperCase().trim();
        const fVal = (discipline || "").toUpperCase().trim();
        if (dVal && fVal && (dVal.includes(fVal) || fVal.includes(dVal))) {
          matches = true;
        }
      } else {
        matches = true;
        if (req.query.discipline) {
          const dVal = (slot.discipline || "").toUpperCase().trim() || (slot.subject || "").toUpperCase().trim();
          const fVal = req.query.discipline.toUpperCase().trim();
          if (!dVal.includes(fVal) && !fVal.includes(dVal)) matches = false;
        }
        if (req.query.teacher) {
          const tVal = (slot.teacher || "").toLowerCase().trim();
          const fVal = req.query.teacher.toLowerCase().trim();
          if (!tVal.includes(fVal) && !fVal.includes(tVal)) matches = false;
        }
      }

      if (matches) {
        timetable[day].push({
          period: slot.period,
          time: slot.time,
          discipline: slot.discipline,
          subject: slot.subject,
          teacher: slot.teacher,
          room: slot.room
        });
      }
    });

    res.json(timetable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/timetable
router.post("/timetable", auth(["admin", "coordinator", "head", "md"]), async (req, res) => {
  try {
    const data = req.body;
    
    const visibility = data.visibility || {
      roles: ["HOD / Admin", "Managing Director (MD)", "Department Head", "Academic Coordinator", "Faculty Teachers", "Students", "Parents"],
      format: "discipline"
    };
    await TimetableMetadata.deleteMany();
    await TimetableMetadata.create(visibility);

    await Timetable.deleteMany();

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const insertData = [];

    days.forEach(day => {
      const periods = data[day] || [];
      if (Array.isArray(periods)) {
        periods.forEach(p => {
          if (p.subject || p.teacher || p.room) {
            insertData.push({
              day,
              period: Number(p.period || 1),
              time: p.time || "09:00 - 09:45",
              discipline: String(p.discipline || "").trim().toUpperCase() || String(p.subject || "").trim().toUpperCase(),
              subject: p.subject,
              teacher: p.teacher,
              room: p.room
            });
          }
        });
      }
    });

    if (insertData.length > 0) {
      await Timetable.insertMany(insertData);
    }

    res.json({ success: true, message: "Timetable saved and visibility adjustments pushed successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/timetable/upload
router.post("/timetable/upload", auth(["admin", "coordinator", "head", "md"]), upload.single("timetableFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Timetable file is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const simulated = getSimulatedTimetable(req.file.originalname);
      return res.json({ success: true, parsed: simulated, message: "Simulation Mode: API Key missing." });
    }

    const base64Data = req.file.buffer.toString("base64");
    const prompt = `Analyze the uploaded timetable document (image or PDF).
Identify and extract all weekly class schedule periods.
For each period, extract:
- Day: Monday, Tuesday, Wednesday, Thursday, Friday.
- Period Number: integer (e.g. 1, 2, 3, 4, 5).
- Time Slot: e.g. "09:00 - 09:45".
- Subject: e.g. "BS Radiology", "Anatomy", "Pharmacology".
- Teacher Name: e.g. "Dr. Farooq", "Dr. Naveed".
- Room Number/Lab: e.g. "Room 101", "Lab A".
- Discipline/Department: e.g. "RADIOLOGY", "PHARMACY", "NURSING" (infer from subject/class if not explicitly mentioned).

You MUST return the extracted data strictly in a valid JSON format with the following structure:
{
  "Monday": [
    { "period": 1, "time": "09:00 - 09:45", "discipline": "RADIOLOGY", "subject": "BS Radiology", "teacher": "Dr. Farooq", "room": "Room 101" }
  ],
  "Tuesday": [],
  "Wednesday": [],
  "Thursday": [],
  "Friday": []
}

Do not include any Markdown tags or extra explanation outside the JSON object. Output ONLY the JSON block.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const resBody = await fetchRes.json();
    const text = resBody.candidates[0].content.parts[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    
    res.json({ success: true, parsed, message: "Successfully analyzed via Gemini AI." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getSimulatedTimetable(filename) {
  const isPharmacy = filename.toLowerCase().includes("pharmacy");
  const isNursing = filename.toLowerCase().includes("nursing");
  const disciplineName = isPharmacy ? "PHARMACY" : (isNursing ? "NURSING" : "RADIOLOGY");
  const teacherName = isPharmacy ? "Dr. Naveed" : (isNursing ? "Prof. Asif" : "Dr. Farooq");
  const subjectName = isPharmacy ? "Pharmacology" : (isNursing ? "Fundamentals of Nursing" : "BS Radiology & Imaging");

  return {
    Monday: [
      { period: 1, time: "09:00 - 09:45", discipline: disciplineName, subject: subjectName, teacher: teacherName, room: "Room 101" },
      { period: 2, time: "09:45 - 10:30", discipline: disciplineName, subject: "Anatomy", teacher: "Dr. Naveed", room: "Room 102" }
    ],
    Tuesday: [
      { period: 1, time: "09:00 - 09:45", discipline: disciplineName, subject: "Biochemistry", teacher: "Prof. Asif", room: "Lab A" }
    ],
    Wednesday: [],
    Thursday: [],
    Friday: []
  };
}

// GET /api/academic/leaves
router.get("/leaves", auth(["admin", "coordinator", "teacher"]), (req, res) => {
  res.json(LEAVE_APPLICATIONS);
});

// POST /api/academic/leaves
router.post("/leaves", auth(), async (req, res) => {
  try {
    const { studentId, studentName, className, section, reason } = req.body;
    const newLeave = {
      id: "L" + (LEAVE_APPLICATIONS.length + 1),
      studentId: studentId || req.user.id,
      studentName: studentName || req.user.name,
      class: className || "RADIOLOGY",
      section: section || "BATCH 1",
      reason: reason || "Urgent piece of work",
      status: "pending",
      date: new Date().toISOString().slice(0, 10)
    };
    LEAVE_APPLICATIONS.push(newLeave);
    res.json({ success: true, message: "Leave application submitted", leave: newLeave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic/leaves/:id
router.put("/leaves/:id", auth(["admin", "coordinator", "teacher"]), (req, res) => {
  try {
    const { status } = req.body;
    const leave = LEAVE_APPLICATIONS.find(l => l.id === req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave application not found" });
    leave.status = status || "approved";
    res.json({ success: true, message: `Leave application status updated to ${leave.status}`, leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/parent/children
router.get("/parent/children", auth(["parent", "admin"]), async (req, res) => {
  try {
    // Return students linked to the parent.
    // For demo/simulating multi-child switcher, return 2 students from different classes.
    const list = await Student.find().limit(2);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/inventory
router.get("/inventory", auth(), (req, res) => {
  res.json({
    books: INVENTORY_DATA.books,
    uniforms: INVENTORY_DATA.uniforms,
    canteen: INVENTORY_DATA.canteen,
    transactions: WALLET_TRANSACTIONS
  });
});

// POST /api/academic/inventory/pos
router.post("/inventory/pos", auth(["admin"]), (req, res) => {
  try {
    const { rollNumber, item, amount } = req.body;
    if (!rollNumber || !item || !amount) {
      return res.status(400).json({ message: "Roll number, item name, and amount are required" });
    }
    const newTx = {
      studentRoll: rollNumber,
      amount: Number(amount),
      item: item,
      date: new Date().toISOString()
    };
    WALLET_TRANSACTIONS.push(newTx);
    res.json({ success: true, message: "POS transaction processed successfully", transaction: newTx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/dev/sys-stats
router.get("/dev/sys-stats", auth(["admin"]), async (req, res) => {
  try {
    const userCount = await User.countDocuments().catch(() => 0);
    const studentCount = await Student.countDocuments().catch(() => 0);
    const teacherCount = await Teacher.countDocuments().catch(() => 0);
    const attendanceCount = await Attendance.countDocuments().catch(() => 0);
    const feeCount = await Fee.countDocuments().catch(() => 0);
    const noticeCount = await Notice.countDocuments().catch(() => 0);
    const resourceCount = await Resource.countDocuments().catch(() => 0);
    const batchCount = await ImportBatch.countDocuments().catch(() => 0);

    res.json({
      dbStatus: "Connected",
      counts: {
        users: userCount,
        students: studentCount,
        teachers: teacherCount,
        attendance: attendanceCount,
        fees: feeCount,
        notices: noticeCount,
        resources: resourceCount,
        batches: batchCount,
        leaves: LEAVE_APPLICATIONS.length,
        walletTx: WALLET_TRANSACTIONS.length
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      env: {
        NODE_ENV: process.env.NODE_ENV || "development",
        PORT: process.env.PORT || 8080
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
