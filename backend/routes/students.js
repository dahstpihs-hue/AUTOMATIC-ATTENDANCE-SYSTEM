// backend/routes/students.js
const express = require("express");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

const PROGRAM_PREFIX = {
  RADIOLOGY: "rad",
  MLT: "mlt",
  DENTAL: "den",
  ANAESTHESIA: "ana",
  ANESTHESIA: "ana",
};

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 28);
}

function randomPassword(prefix) {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  const digits = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${chunk}-${digits}`;
}

async function uniqueEmail(base) {
  let candidate = base.includes('@') ? base : `${base}@tpihs.edu.pk`;
  let counter = 1;
  while (true) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', candidate)
      .maybeSingle();
    if (!data) break;
    counter += 1;
    candidate = `${base}${counter}@tpihs.edu.pk`;
  }
  return candidate;
}

async function nextRollNumber(discipline, batch) {
  const prefix = `${(PROGRAM_PREFIX[String(discipline || "").toUpperCase()] || slug(discipline) || "std").toUpperCase()}-${slug(batch).replace(/\./g, "").toUpperCase() || "BATCH"}`;
  
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('class', discipline)
    .eq('section', batch);

  const num = count ? count + 1 : 1;
  return `${prefix}-${String(num).padStart(3, "0")}`;
}

function mapStudent(s) {
  if (!s) return null;
  return {
    _id: s.id,
    name: s.name,
    email: s.email,
    dob: s.dob,
    gender: s.gender,
    class: s.class,
    section: s.section,
    rollNumber: s.roll_number,
    parentName: s.parent_name,
    parentPhone: s.parent_phone,
    address: s.address,
    extraData: s.extra_data || {},
    user: s.user_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// POST /api/students
router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const {
      name,
      dob,
      gender,
      class: className,
      section,
      discipline,
      batch,
      semester,
      overallSerial,
      departmentSerial,
      fatherName,
      address,
      rollNumber,
      loginId,
      studentPassword,
      parentName,
      parentPhone,
      email,
    } = req.body;

    const finalDiscipline = (discipline || className || "").trim().toUpperCase();
    const finalBatch = (batch || section || "").trim().toUpperCase();
    const finalFatherName = fatherName || parentName || "";
    const finalPassword = studentPassword || randomPassword("STD");
    const loginBase = loginId || `std.${slug(finalDiscipline)}.${slug(name)}`;
    
    const finalEmail = await uniqueEmail(loginBase);
    const finalRollNumber = rollNumber || await nextRollNumber(finalDiscipline, finalBatch);
    const studentEmail = email || finalEmail;

    if (!name || !finalFatherName || !finalDiscipline || !finalBatch) {
      return res.status(400).json({ message: "Student name, father name, batch, and discipline are required" });
    }

    // Create user in Supabase Auth (trigger handles public.users table)
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authErr) {
      return res.status(400).json({ message: authErr.message });
    }

    // Force public users role
    await supabase.from('users').update({ name, role: 'student' }).eq('id', authUser.user.id);

    // Create student record
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .insert({
        name,
        email: studentEmail,
        dob: dob || null,
        gender: gender || null,
        class: finalDiscipline,
        section: finalBatch,
        address: address || null,
        roll_number: finalRollNumber,
        parent_name: finalFatherName,
        parent_phone: parentPhone || null,
        user_id: authUser.user.id,
        extra_data: {
          "STUDENT NAME": name,
          "FATHER NAME": finalFatherName,
          DISCIPLINE: finalDiscipline,
          BATCH: finalBatch,
          SEMESTER: semester || "",
          "OVERALL SERIAL NO": overallSerial || "",
          "DEPARTMENT SERIAL NO": departmentSerial || "",
          "ROLL NUMBER": finalRollNumber,
          USERNAME: studentEmail,
          PASSWORD: finalPassword,
        }
      })
      .select()
      .single();

    if (studentErr) throw studentErr;

    res.json({
      message: "Student added successfully",
      student: mapStudent(student),
      credentials: { loginId: studentEmail, studentPassword: finalPassword },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add student", error: err.message });
  }
});

// GET /api/students
router.get("/", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    let query = supabase.from('students').select('*');

    if (req.query.discipline) {
      query = query.ilike('class', req.query.discipline);
    }
    if (req.query.batch) {
      query = query.ilike('section', req.query.batch);
    }

    const { data: list, error: listErr } = await query.order('class', { ascending: true }).order('section', { ascending: true }).order('roll_number', { ascending: true });
    if (listErr) throw listErr;

    // Filter by semester if needed (since semester is in extra_data)
    let filteredList = list || [];
    if (req.query.semester) {
      const semVal = String(req.query.semester).trim().toLowerCase();
      filteredList = filteredList.filter(s => {
        const sem = String(s.extra_data?.SEMESTER || "").trim().toLowerCase();
        return sem === semVal;
      });
    }

    const mappedList = filteredList.map(mapStudent);

    // Calculate and attach attendance percentage
    const studentIds = mappedList.map((s) => s._id);
    if (studentIds.length > 0) {
      const { data: allAttendance, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds);

      if (!attErr && allAttendance) {
        const attendanceByStudent = {};
        allAttendance.forEach((a) => {
          const sid = String(a.student_id);
          if (!attendanceByStudent[sid]) {
            attendanceByStudent[sid] = [];
          }
          attendanceByStudent[sid].push(a);
        });

        mappedList.forEach((student) => {
          const atts = attendanceByStudent[String(student._id)] || [];
          const total = atts.length;
          const present = atts.filter((a) => ["present", "late"].includes(a.status)).length;
          student.attendancePercentage = total ? Math.round((present * 100) / total) : 100;
        });
      }
    }

    res.json(mappedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/class/:className
router.get("/class/:className", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('students')
      .select('*')
      .eq('class', req.params.className)
      .order('roll_number', { ascending: true });

    if (error) throw error;
    res.json((list || []).map(mapStudent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id
router.get("/:id", auth(["admin", "coordinator", "teacher"]), async (req, res) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    res.json(mapStudent(student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id/profile
router.get("/:id/profile", auth(), async (req, res) => {
  try {
    const user = req.user;
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (studentErr || !student) return res.status(404).json({ message: "Student not found" });
    
    if (user.role === "student" && student.user_id !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .order('date', { ascending: false });

    const { data: fees } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    const { data: notices } = await supabase
      .from('notices')
      .select('*')
      .in('audience', ['all', 'students'])
      .order('created_at', { ascending: false });

    res.json({
      student: mapStudent(student),
      attendance: (attendance || []).map(a => ({ ...a, _id: a.id, student: a.student_id })),
      fees: (fees || []).map(f => ({ ...f, _id: f.id, student: f.student_id, dueDate: f.due_date, paidOn: f.paid_on, paymentMode: f.payment_mode })),
      notices: (notices || []).map(n => ({ ...n, _id: n.id, eventDate: n.event_date, createdBy: n.created_by }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id
router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    // Map request body fields to snake_case if necessary
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.dob !== undefined) updates.dob = req.body.dob;
    if (req.body.gender !== undefined) updates.gender = req.body.gender;
    if (req.body.class !== undefined) updates.class = req.body.class;
    if (req.body.section !== undefined) updates.section = req.body.section;
    if (req.body.rollNumber !== undefined) updates.roll_number = req.body.rollNumber;
    if (req.body.parentName !== undefined) updates.parent_name = req.body.parentName;
    if (req.body.parentPhone !== undefined) updates.parent_phone = req.body.parentPhone;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.extraData !== undefined) updates.extra_data = req.body.extraData;

    const { data: student, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapStudent(student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id
router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    // Get student record first to find the user link
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    // Delete student record (cascades or drops reference)
    const { error: studentErr } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);

    if (studentErr) throw studentErr;

    // Delete the auth user if linked
    if (student?.user_id) {
      await supabase.auth.admin.deleteUser(student.user_id);
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Auth middleware
function authPDF(req, res, next) {
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

// GET /api/students/:id/report
router.get("/:id/report", authPDF, async (req, res) => {
  try {
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (studentErr || !student) return res.status(404).json({ message: "Student not found" });

    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id);

    const { data: fees } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', student.id);

    const totalDays = attendance ? attendance.length : 0;
    const presentDays = attendance ? attendance.filter((a) => ["present", "late"].includes(a.status)).length : 0;
    const absentDays = attendance ? attendance.filter((a) => a.status === "absent").length : 0;
    const attendancePercent = totalDays ? Math.round((presentDays * 100) / totalDays) : 0;
    
    const totalFee = fees ? fees.reduce((sum, f) => sum + Number(f.amount), 0) : 0;
    const paidFee = fees ? fees.filter((f) => f.paid).reduce((sum, f) => sum + Number(f.amount), 0) : 0;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${student.roll_number || "student"}_report.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("TPIHS Student Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Name: ${student.name}`);
    doc.text(`Class: ${student.class} - Section: ${student.section}`);
    doc.text(`Roll No: ${student.roll_number}`);
    doc.moveDown();
    doc.fontSize(14).text("Attendance Summary");
    doc.fontSize(12).text(`Total Days: ${totalDays}`);
    doc.text(`Present/Late: ${presentDays}`);
    doc.text(`Absent: ${absentDays}`);
    doc.text(`Attendance %: ${attendancePercent}%`);
    doc.moveDown();
    doc.fontSize(14).text("Fee Summary");
    doc.fontSize(12).text(`Total Fee: ${totalFee}`);
    doc.text(`Paid: ${paidFee}`);
    doc.text(`Pending: ${totalFee - paidFee}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
