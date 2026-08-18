// backend/routes/teachers.js
const express = require("express");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

const DEPARTMENT_PREFIX = {
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
  while (true) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', candidate)
      .maybeSingle();
    if (!data) break;
    candidate = `${base}${Math.floor(Math.random() * 100)}@tpihs.edu.pk`;
  }
  return candidate;
}

function mapTeacher(t) {
  if (!t) return null;
  return {
    _id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    subject: t.subject,
    class: t.class,
    section: t.section,
    extraData: t.extra_data || {},
    user: t.user_id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

/**
 * CREATE TEACHER (Admin Only)
 */
router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, phone, subject, department, class: className, section, semester, overallSerial, departmentSerial, password, loginId } = req.body;
    const finalDepartment = (department || subject || className || "").trim().toUpperCase();
    const prefix = DEPARTMENT_PREFIX[finalDepartment] || slug(finalDepartment) || "fac";
    const finalPassword = password || randomPassword("FAC");
    const loginBase = loginId || `${slug(name)}.${prefix}`;
    const finalEmail = email || await uniqueEmail(loginBase);

    if (!name || !finalDepartment) {
      return res.status(400).json({ message: "Faculty name and department are required" });
    }

    // 1. Create Auth User
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authErr) {
      return res.status(400).json({ message: authErr.message });
    }

    // Force public users role to teacher
    await supabase.from('users').update({ name, role: 'teacher' }).eq('id', authUser.user.id);

    // 2. Create Teacher Profile
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .insert({
        name,
        email: finalEmail,
        phone: phone || null,
        subject: finalDepartment,
        class: finalDepartment,
        section: section || "",
        user_id: authUser.user.id,
        extra_data: {
          "Overall Serial No": overallSerial || "",
          "Department Serial No": departmentSerial || "",
          "Faculty Name": name,
          Department: finalDepartment,
          Semester: semester || "",
          Username: finalEmail,
          Password: finalPassword,
        }
      })
      .select()
      .single();

    if (teacherErr) throw teacherErr;

    return res.json({
      message: "Teacher created successfully",
      teacher: mapTeacher(teacher),
      credentials: { username: finalEmail, email: finalEmail, password: finalPassword },
    });

  } catch (err) {
    console.error("Error in POST /teachers:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET ALL TEACHERS (HOD + Coordinator)
 */
router.get("/", auth(["admin", "coordinator"]), async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((list || []).map(mapTeacher));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET LOGGED-IN TEACHER PROFILE
 */
router.get("/me/profile", auth(["teacher"]), async (req, res) => {
  try {
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error || !teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    res.json(mapTeacher(teacher));
  } catch (err) {
    console.error("Error loading teacher profile:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const { name, department, subject, class: className, phone, section } = req.body;
    const finalDepartment = (department || subject || className || "").trim().toUpperCase();

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (section !== undefined) updates.section = section;
    if (finalDepartment) {
      updates.subject = finalDepartment;
      updates.class = finalDepartment;
    }

    const { data: teacher, error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !teacher) return res.status(404).json({ message: "Faculty not found" });

    // Update public user name if user link is present
    if (name && teacher.user_id) {
      await supabase.from('users').update({ name }).eq('id', teacher.user_id);
    }

    res.json({ message: "Faculty updated successfully", teacher: mapTeacher(teacher) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    // Delete linked auth user
    if (teacher?.user_id) {
      await supabase.auth.admin.deleteUser(teacher.user_id);
    }

    res.json({ message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
