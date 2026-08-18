// backend/routes/reviews.js
const express = require("express");
const supabase = require("../supabaseClient");
const auth = require("../middleware/auth");

const router = express.Router();

function mapReview(r) {
  if (!r) return null;
  return {
    _id: r.id,
    student: r.student ? {
      _id: r.student.id,
      name: r.student.name,
    } : r.student_id,
    teacher: r.teacher_id,
    rating: Number(r.rating),
    comment: r.comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// Student can submit review
router.post("/", auth("student"), async (req, res) => {
  try {
    const { teacherId, rating, comment } = req.body;

    // Look up student_id from public.students by user_id
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (studentErr || !student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const { error } = await supabase
      .from('reviews')
      .insert({ 
        student_id: student.id, 
        teacher_id: teacherId, 
        rating: Number(rating), 
        comment 
      });

    if (error) throw error;
    res.json({ message: "Review posted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teacher reviews + average
router.get("/:teacherId", auth(["teacher","admin"]), async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, student:students(*)')
      .eq('teacher_id', req.params.teacherId);

    if (error) throw error;

    const list = (reviews || []).map(mapReview);
    const avg = list.reduce((a,b) => a + b.rating, 0) / (list.length || 1);

    res.json({ 
      average: avg.toFixed(2), 
      count: list.length, 
      reviews: list 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
