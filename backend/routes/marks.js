// backend/routes/marks.js
const express = require("express");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

function mapMark(m) {
  if (!m) return null;
  return {
    _id: m.id,
    student: m.student_id,
    subject: m.subject,
    exam: m.exam,
    marks: Number(m.marks),
    enteredBy: m.entered_by,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  };
}

router.post("/", auth(["teacher"]), async (req, res) => {
  try {
    const { studentId, subject, exam, marks } = req.body;

    const { data: m, error } = await supabase
      .from('marks')
      .insert({
        student_id: studentId,
        subject,
        exam,
        marks: Number(marks),
        entered_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(mapMark(m));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
