// backend/routes/resources.js
const express = require("express");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

function mapResource(r) {
  if (!r) return null;
  return {
    _id: r.id,
    title: r.title,
    type: r.type,
    subject: r.subject,
    batch: r.batch,
    semester: r.semester,
    className: r.class_name,
    section: r.section,
    url: r.url,
    description: r.description,
    audience: r.audience,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// POST /api/resources
router.post("/", auth(["admin", "teacher"]), async (req, res) => {
  try {
    const { title, type, subject, batch, semester, className, section, url, description, audience } = req.body;

    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        title,
        type: type || 'link',
        subject: subject || null,
        batch: batch || null,
        semester: semester || null,
        class_name: className || null,
        section: section || null,
        url: url || null,
        description: description || null,
        audience: audience || 'students',
        uploaded_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(mapResource(resource));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resources
router.get("/", auth(), async (req, res) => {
  try {
    let query = supabase.from('resources').select('*');

    if (req.user.role === "student") {
      query = query.in('audience', ["all", "students"]);
    } else if (req.user.role === "teacher") {
      query = query.in('audience', ["all", "faculty"]);
    }

    const { data: list, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json((list || []).map(mapResource));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resources/:id
router.delete("/:id", auth(["admin", "teacher"]), async (req, res) => {
  try {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: "Resource deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
