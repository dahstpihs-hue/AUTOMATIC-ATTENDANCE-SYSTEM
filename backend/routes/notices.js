// backend/routes/notices.js
const express = require('express');
const supabase = require('../supabaseClient');
const auth = require('../middleware/auth');

const router = express.Router();

function mapNotice(n) {
  if (!n) return null;
  return {
    _id: n.id,
    title: n.title,
    message: n.message,
    audience: n.audience,
    eventDate: n.event_date,
    date: n.date,
    createdBy: n.created_by,
    createdAt: n.created_at,
    updatedAt: n.updated_at
  };
}

/* ============================
   CREATE NOTICE (Admin + Teacher)
=============================== */
router.post("/", auth(["admin", "teacher"]), async (req, res) => {
  try {
    const { title, message, audience, eventDate } = req.body;

    const { data: notice, error } = await supabase
      .from('notices')
      .insert({
        title,
        message,
        audience: audience || 'all',
        event_date: eventDate || null,
        created_by: req.user.name || req.user.email || 'Admin'
      })
      .select()
      .single();

    if (error) throw error;
    return res.json(mapNotice(notice));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================
   GET NOTICES (Role Based)
=============================== */
router.get("/", auth(), async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "admin" || role === "coordinator") {
      const { data: list, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json((list || []).map(mapNotice));
    }

    const allowedAudiences = ["all"];
    if (role === "teacher") allowedAudiences.push("teachers");
    if (role === "student") allowedAudiences.push("students");

    const { data: list, error } = await supabase
      .from('notices')
      .select('*')
      .in('audience', allowedAudiences)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((list || []).map(mapNotice));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   DELETE NOTICE (Admin + Teacher)
=============================== */
router.delete("/:id", auth(["admin", "teacher"]), async (req, res) => {
  try {
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    return res.json({ message: "Notice deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
