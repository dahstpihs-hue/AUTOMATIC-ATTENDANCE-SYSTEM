// backend/routes/attendance.js
const express = require("express");
const PDFDocument = require("pdfkit");
const jwt = require("jsonwebtoken");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

function authFromHeaderOrQuery(req, res, next) {
  let token = null;
  if (req.headers.authorization) token = req.headers.authorization.split(" ")[1];
  if (!token && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || "tpihs-local-secure-jwt-secret-2026";
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function normalizeStatus(status) {
  const map = {
    P: "present",
    A: "absent",
    L: "leave",
    SL: "shortLeave",
    present: "present",
    absent: "absent",
    late: "late",
    leave: "leave",
    shortLeave: "shortLeave",
    sickLeave: "sickLeave",
  };
  return map[status] || "present";
}

function dateRange(dateValue) {
  const start = dateValue ? new Date(dateValue) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function mapAttendance(a) {
  if (!a) return null;
  return {
    _id: a.id,
    student: a.student ? {
      _id: a.student.id,
      name: a.student.name,
      rollNumber: a.student.roll_number,
      class: a.student.class,
      section: a.student.section,
    } : a.student_id,
    date: a.date,
    status: a.status,
    subject: a.subject,
    batch: a.batch,
    semester: a.semester,
    timeSlot: a.time_slot,
    className: a.class_name,
    section: a.section,
    markedBy: a.markedBy ? {
      _id: a.markedBy.id,
      name: a.markedBy.name,
      email: a.markedBy.email,
      role: a.markedBy.role
    } : a.marked_by,
    note: a.note,
    startTime: a.start_time,
    endTime: a.end_time,
    duration: a.duration,
    topic: a.topic,
    createdAt: a.created_at,
    updatedAt: a.updated_at
  };
}

// POST /api/attendance/mark
router.post("/mark", auth(["teacher", "admin"]), async (req, res) => {
  try {
    const {
      studentId,
      status,
      date,
      subject,
      batch,
      semester,
      timeSlot,
      className,
      section,
      note,
      startTime,
      endTime,
      duration,
      topic,
    } = req.body;

    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) return res.status(404).json({ message: "Student not found" });

    const { start } = dateRange(date);
    const dateStr = start.toISOString().split('T')[0];

    // Find if record already exists for the student, date, subject, and time slot
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', dateStr)
      .eq('subject', subject)
      .eq('time_slot', timeSlot)
      .maybeSingle();

    const recordData = {
      student_id: studentId,
      date: dateStr,
      status: normalizeStatus(status),
      subject,
      batch,
      semester,
      time_slot: timeSlot,
      class_name: className || student.class,
      section: section || student.section,
      marked_by: req.user.id,
      note,
      start_time: startTime,
      end_time: endTime,
      duration: duration || null,
      topic,
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('attendance')
        .update(recordData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .insert(recordData)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json(mapAttendance(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/bulk
router.post("/bulk", auth(["teacher", "admin"]), async (req, res) => {
  try {
    const {
      records = [],
      date,
      subject,
      batch,
      semester,
      timeSlot,
      className,
      section,
      startTime,
      endTime,
      duration,
      topic,
    } = req.body;
    const { start } = dateRange(date);
    const dateStr = start.toISOString().split('T')[0];
    const saved = [];

    for (const row of records) {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', row.studentId)
        .maybeSingle();

      if (!student) continue;

      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', row.studentId)
        .eq('date', dateStr)
        .eq('subject', subject)
        .eq('time_slot', timeSlot)
        .maybeSingle();

      const recordData = {
        student_id: row.studentId,
        date: dateStr,
        status: normalizeStatus(row.status),
        subject,
        batch,
        semester,
        time_slot: timeSlot,
        class_name: className || student.class,
        section: section || student.section,
        marked_by: req.user.id,
        note: row.note || null,
        start_time: startTime,
        end_time: endTime,
        duration: duration || null,
        topic,
      };

      let record;
      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update(recordData)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        record = data;
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert(recordData)
          .select()
          .single();
        if (error) throw error;
        record = data;
      }
      saved.push(mapAttendance(record));
    }

    res.json({ saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/lectures (RPC aggregation call)
router.get("/lectures", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    const params = {};

    if (req.user.role === "teacher") {
      params.p_marked_by = req.user.id;
    } else {
      if (req.query.teacherId) {
        params.p_marked_by = req.query.teacherId;
      }
    }

    if (req.query.batch) params.p_batch = req.query.batch;
    if (req.query.semester) params.p_semester = req.query.semester;
    if (req.query.className) params.p_class_name = req.query.className;
    if (req.query.section) params.p_section = req.query.section;
    if (req.query.subject) params.p_subject = req.query.subject;
    if (req.query.date) {
      const { start } = dateRange(req.query.date);
      params.p_date = start.toISOString().split('T')[0];
    }

    const { data: lectures, error } = await supabase.rpc('get_lectures', params);
    if (error) throw error;

    res.json(lectures || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance
router.get("/", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    let query = supabase
      .from('attendance')
      .select('*, student:students(*), markedBy:users(id, name, email, role)');

    if (req.query.student) query = query.eq('student_id', req.query.student);
    if (req.query.subject) query = query.eq('subject', req.query.subject);
    if (req.query.className) query = query.eq('class_name', req.query.className);
    if (req.query.semester) query = query.eq('semester', req.query.semester);
    if (req.query.date) {
      const { start } = dateRange(req.query.date);
      query = query.eq('date', start.toISOString().split('T')[0]);
    }

    const { data: list, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((list || []).map(mapAttendance));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/activity
router.get("/activity", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    const { start } = dateRange(req.query.date);
    const dateStr = start.toISOString().split('T')[0];

    const { data: rows, error } = await supabase
      .from('attendance')
      .select('*, markedBy:users(id, name, role)')
      .eq('date', dateStr)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const grouped = {};
    (rows || []).forEach((row) => {
      const key = [
        row.class_name,
        row.section,
        row.subject,
        row.semester,
        row.batch,
        row.time_slot,
        row.marked_by,
      ].join("|");

      if (!grouped[key]) {
        grouped[key] = {
          className: row.class_name,
          section: row.section,
          subject: row.subject,
          semester: row.semester,
          batch: row.batch,
          timeSlot: row.time_slot,
          faculty: row.markedBy?.name || "Faculty",
          updatedAt: row.updated_at,
          count: 0,
        };
      }
      grouped[key].count += 1;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/defaulters (RPC call)
router.get("/defaulters", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    const threshold = Number(req.query.threshold || 75);

    const { data: result, error } = await supabase.rpc('get_defaulters', { p_threshold: threshold });
    if (error) throw error;

    res.json(result || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/faculty-missed
router.get("/faculty-missed", auth(["admin", "coordinator"]), async (req, res) => {
  try {
    const { start } = dateRange(req.query.date);
    const dateStr = start.toISOString().split('T')[0];

    const { data: teachers, error: teachersErr } = await supabase
      .from('teachers')
      .select('*, user:users(id, name, email, role)');

    if (teachersErr) throw teachersErr;
    const report = [];

    for (const teacher of (teachers || [])) {
      const { count, error: countErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('marked_by', teacher.user_id)
        .eq('date', dateStr);

      if (countErr) throw countErr;

      if (!count || count === 0) {
        report.push({
          teacher: {
            _id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            user: teacher.user ? {
              _id: teacher.user.id,
              name: teacher.user.name,
              email: teacher.user.email,
              role: teacher.user.role
            } : null
          },
          message: "No attendance submitted for selected date",
        });
      }
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/ledger.pdf
router.get("/ledger.pdf", authFromHeaderOrQuery, async (req, res) => {
  try {
    // Verify token payload role
    const { data: userProfile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.sub)
      .single();

    if (profileErr || !userProfile || !["admin", "coordinator", "teacher"].includes(userProfile.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = supabase
      .from('attendance')
      .select('*, student:students(*), markedBy:users(id, name)');

    if (req.query.subject) query = query.eq('subject', req.query.subject);
    if (req.query.className) query = query.eq('class_name', req.query.className);
    if (req.query.date) {
      const { start } = dateRange(req.query.date);
      query = query.eq('date', start.toISOString().split('T')[0]);
    }

    const { data: rows, error: queryErr } = await query
      .order('date', { ascending: false })
      .order('class_name', { ascending: true })
      .order('section', { ascending: true });

    if (queryErr) throw queryErr;

    const doc = new PDFDocument({ margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=tpihs-lecture-ledger.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("TPIHS Lecture Attendance Ledger", { align: "center" });
    doc.moveDown();

    (rows || []).forEach((row, index) => {
      doc.fontSize(10).text(
        `${index + 1}. ${row.student?.roll_number || "-"} | ${row.student?.name || "Student"} | Class ${row.class_name || "-"} ${row.section || ""} | ${row.subject || "-"} | ${row.time_slot || "-"} | ${row.status} | Faculty: ${row.markedBy?.name || "-"}`
      );
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
