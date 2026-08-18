// backend/routes/auth.js
const express = require('express');
const supabase = require('../supabaseClient');
const auth = require('../middleware/auth');

const router = express.Router();

function valueFromRow(row = {}, keys = []) {
  const normalized = {};
  Object.keys(row || {}).forEach((key) => {
    normalized[String(key).toLowerCase().replace(/[^a-z0-9]+/g, "")] = row[key];
  });

  for (const key of keys) {
    const value = normalized[String(key).toLowerCase().replace(/[^a-z0-9]+/g, "")];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function cleanLoginId(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, ".");
}

function securePassword(prefix = "TPIHS") {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  const digits = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${part}-${digits}`;
}

async function ensureUniqueEmail(email, ignoreUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (data && data.id !== ignoreUserId) {
    const err = new Error("Email already exists");
    err.status = 400;
    throw err;
  }
}

// GET /api/auth/accounts/logins
router.get('/accounts/logins', auth(["admin"]), async (req, res) => {
  try {
    // Get coordinator user
    const { data: coordinator } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'coordinator')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Get teachers and their linked user records
    const { data: teachers, error: teachersErr } = await supabase
      .from('teachers')
      .select('*, user:users(id, name, email, role)')
      .order('name', { ascending: true });

    if (teachersErr) throw teachersErr;

    res.json({
      coordinator: coordinator ? {
        id: coordinator.id,
        name: coordinator.name,
        username: coordinator.email,
      } : null,
      faculty: (teachers || []).map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        department: valueFromRow(teacher.extra_data, ["department"]) || teacher.subject || teacher.class || "",
        username: teacher.user?.email || teacher.email || "",
        userId: teacher.user?.id || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load login accounts", error: err.message });
  }
});

// PUT /api/auth/accounts/coordinator
router.put('/accounts/coordinator', auth(["admin"]), async (req, res) => {
  try {
    const name = String(req.body.name || "Coordinator").trim();
    const loginId = cleanLoginId(req.body.username || req.body.loginId || "coordinator");
    const email = loginId.includes('@') ? loginId : `${loginId}@tpihs.edu.pk`;
    const password = req.body.password || securePassword("COORD");

    // Check if coordinator user profile already exists
    const { data: coordinator } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'coordinator')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    await ensureUniqueEmail(email, coordinator?.id);

    let authUser;
    if (coordinator?.id) {
      // Update existing user
      const { data, error } = await supabase.auth.admin.updateUserById(coordinator.id, {
        email,
        password,
        user_metadata: { full_name: name }
      });
      if (error) throw error;
      authUser = data.user;
    } else {
      // Create new coordinator user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });
      if (error) throw error;
      authUser = data.user;
    }

    // Force updates in public users table just in case trigger didn't update it
    const { data: updatedProfile, error: profileErr } = await supabase
      .from('users')
      .update({ name, email, role: 'coordinator' })
      .eq('id', authUser.id)
      .select()
      .single();

    if (profileErr) throw profileErr;

    res.json({
      message: "Coordinator login updated successfully",
      account: {
        id: authUser.id,
        name: updatedProfile.name,
        username: email,
        password,
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to update coordinator login" });
  }
});

// PUT /api/auth/accounts/faculty/:teacherId
router.put('/accounts/faculty/:teacherId', auth(["admin"]), async (req, res) => {
  try {
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', req.params.teacherId)
      .maybeSingle();

    if (teacherErr || !teacher) return res.status(404).json({ message: "Faculty not found" });

    const loginId = cleanLoginId(req.body.username || req.body.loginId || teacher.email || teacher.name);
    const email = loginId.includes('@') ? loginId : `${loginId}@tpihs.edu.pk`;
    const password = req.body.password || securePassword("FAC");
    await ensureUniqueEmail(email, teacher.user_id);

    let authUser;
    if (teacher.user_id) {
      // Update existing auth account
      const { data, error } = await supabase.auth.admin.updateUserById(teacher.user_id, {
        email,
        password,
        user_metadata: { full_name: teacher.name }
      });
      if (error) throw error;
      authUser = data.user;
    } else {
      // Create new auth account
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: teacher.name }
      });
      if (error) throw error;
      authUser = data.user;
    }

    // Force public user updates and link teacher
    await supabase.from('users').update({ name: teacher.name, email, role: 'teacher' }).eq('id', authUser.id);
    
    // Update teacher record with the user_id link
    const updatedExtra = {
      ...(teacher.extra_data || {}),
      Username: email,
      Password: password,
    };
    
    await supabase
      .from('teachers')
      .update({ user_id: authUser.id, email, extra_data: updatedExtra })
      .eq('id', teacher.id);

    res.json({
      message: "Faculty login updated successfully",
      account: {
        id: teacher.id,
        name: teacher.name,
        username: email,
        password,
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to update faculty login" });
  }
});

// GET /api/auth/faculty-options
router.get('/faculty-options', async (req, res) => {
  try {
    const { data: latestImport } = await supabase
      .from('import_batches')
      .select('sheets')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sheets = latestImport?.sheets || [];
    const facultySheet = sheets.find((sheet) => (
      String(sheet.name || "").toLowerCase().includes("faculty") &&
      !String(sheet.name || "").toLowerCase().includes("login")
    ));
    const nameColumnIndex = (facultySheet?.headers || []).findIndex((header) => (
      String(header || "").toLowerCase().includes("faculty") ||
      String(header || "").toLowerCase().includes("name")
    ));
    const latestFacultyNames = new Set(
      (facultySheet?.rows || [])
        .filter((row) => row.excelRow !== facultySheet.headerRow)
        .map((row) => String(row.values?.[nameColumnIndex >= 0 ? nameColumnIndex : 1] || "").trim().toLowerCase())
        .filter(Boolean)
    );

    let { data: teachers, error: teachersErr } = await supabase
      .from('teachers')
      .select('*, user:users(id, name, email, role)')
      .order('name', { ascending: true });

    if (teachersErr) throw teachersErr;

    if (latestFacultyNames.size) {
      teachers = (teachers || []).filter((teacher) => latestFacultyNames.has(String(teacher.name || "").trim().toLowerCase()));
    }
    
    teachers = Array.from(
      new Map((teachers || []).map((teacher) => [String(teacher.name || "").trim().toLowerCase(), teacher])).values()
    );

    res.json(teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      username: teacher.user?.email || valueFromRow(teacher.extra_data, ["username", "user name", "login", "login id"]) || teacher.email,
      department:
        valueFromRow(teacher.extra_data, ["department", "dept", "program", "programme"]) ||
        teacher.subject ||
        teacher.class ||
        "Department N/A",
    })));
  } catch (err) {
    res.status(500).json({ message: "Failed to load faculty list", error: err.message });
  }
});

// POST /api/auth/login (Supabase adaptation)
router.post('/login', async (req, res) => {
  try {
    const { loginId, rollNumber, email, password } = req.body;
    let resolvedEmail = email;

    // Resolve email from username/loginId
    if (!resolvedEmail && loginId) {
      const cleanId = cleanLoginId(loginId);
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('email', cleanId.includes('@') ? cleanId : `${cleanId}@tpihs.edu.pk`)
        .maybeSingle();

      if (user) {
        resolvedEmail = user.email;
      } else {
        // Check teacher email directly
        const { data: teacher } = await supabase
          .from('teachers')
          .select('email')
          .eq('email', cleanId.includes('@') ? cleanId : `${cleanId}@tpihs.edu.pk`)
          .maybeSingle();
        if (teacher) resolvedEmail = teacher.email;
      }
    }

    // Resolve email from student roll number
    if (!resolvedEmail && rollNumber) {
      const { data: student } = await supabase
        .from('students')
        .select('email')
        .eq('roll_number', rollNumber)
        .maybeSingle();
      if (student) resolvedEmail = student.email;
    }

    if (!resolvedEmail) {
      return res.status(400).json({ message: "Invalid login details - Email could not be resolved" });
    }

    // Sign in using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: password
    });

    if (authError || !authData.session) {
      return res.status(400).json({ message: authError?.message || "Invalid credentials" });
    }

    // Fetch user profile details
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userErr || !user) {
      return res.status(400).json({ message: "User profile not found in public database" });
    }

    let studentId = null;
    if (user.role === "student") {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (student) studentId = student.id;
    }

    return res.json({
      token: authData.session.access_token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        loginId: user.email,
        rollNumber: rollNumber || null,
        studentId,
      }
    });

  } catch (err) {
    console.error("Error in /auth/login:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', auth(['admin']), async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((list || []).map(u => ({
      _id: u.id,
      name: u.name,
      loginId: u.email,
      email: u.email,
      role: u.role,
      createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users/create
router.post('/users/create', auth(['admin']), async (req, res) => {
  try {
    const { name, loginId, password, role } = req.body;
    if (!name || !loginId || !password || !role) {
      return res.status(400).json({ message: "Name, username, password, and role are required." });
    }
    const cleanId = cleanLoginId(loginId);
    const email = cleanId.includes('@') ? cleanId : `${cleanId}@tpihs.edu.pk`;

    // Create user in Supabase Auth (trigger handles public.users creation)
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authErr) {
      return res.status(400).json({ message: authErr.message });
    }

    // Force set the correct role
    const { data: newUser, error: updateErr } = await supabase
      .from('users')
      .update({ role })
      .eq('id', authUser.user.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ message: "User account created successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create user account" });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', auth(['admin']), async (req, res) => {
  try {
    const { name, loginId, password, role } = req.body;

    const updateParams = {};
    if (password) updateParams.password = password;
    if (loginId) {
      const cleanId = cleanLoginId(loginId);
      const email = cleanId.includes('@') ? cleanId : `${cleanId}@tpihs.edu.pk`;
      updateParams.email = email;
    }
    if (name) updateParams.user_metadata = { full_name: name };

    if (Object.keys(updateParams).length > 0) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(
        req.params.id,
        updateParams
      );
      if (authErr) return res.status(400).json({ message: authErr.message });
    }

    const userUpdate = {};
    if (name) userUpdate.name = name;
    if (role) userUpdate.role = role;
    if (loginId) {
      const cleanId = cleanLoginId(loginId);
      userUpdate.email = cleanId.includes('@') ? cleanId : `${cleanId}@tpihs.edu.pk`;
    }

    if (Object.keys(userUpdate).length > 0) {
      const { data: user, error: userErr } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', req.params.id)
        .select()
        .single();
      if (userErr) return res.status(400).json({ message: userErr.message });
      res.json({ message: "User account updated successfully", user });
    } else {
      res.json({ message: "Nothing to update" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update user" });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', auth(['admin']), async (req, res) => {
  try {
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.params.id)
      .maybeSingle();

    if (userErr || !user) return res.status(404).json({ message: "User not found" });

    if (user.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (count && count <= 1) {
        return res.status(400).json({ message: "Cannot delete the last remaining Administrator account." });
      }
    }

    // Delete student and teacher links manually if necessary (triggers will clean up public.users but let's be safe)
    if (user.role === 'teacher') {
      await supabase.from('teachers').delete().eq('user_id', req.params.id);
    } else if (user.role === 'student') {
      await supabase.from('students').delete().eq('user_id', req.params.id);
    }

    // Delete user from Supabase Auth (cascades to public.users via ON DELETE CASCADE)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(req.params.id);
    if (deleteErr) return res.status(400).json({ message: deleteErr.message });

    res.json({ message: "User account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me (Get profile of currently logged in Google user)
router.get('/me', auth(), async (req, res) => {
  try {
    let studentId = null;
    if (req.user.role === "student") {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (student) studentId = student.id;
    }

    res.json({
      user: {
        id: req.user.id,
        role: req.user.role,
        name: req.user.name,
        email: req.user.email,
        studentId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
