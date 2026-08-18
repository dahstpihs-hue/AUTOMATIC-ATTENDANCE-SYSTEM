// backend/routes/fees.js
const express = require('express');
const supabase = require('../supabaseClient');
const auth = require('../middleware/auth');

const router = express.Router();

function mapFee(f) {
  if (!f) return null;
  return {
    _id: f.id,
    student: f.student ? {
      _id: f.student.id,
      name: f.student.name,
      class: f.student.class,
      section: f.student.section,
      rollNumber: f.student.roll_number,
    } : f.student_id,
    amount: Number(f.amount),
    dueDate: f.due_date,
    paid: f.paid,
    paidOn: f.paid_on,
    paymentMode: f.payment_mode,
    discount: Number(f.discount || 0),
    fine: Number(f.fine || 0),
    note: f.note,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  };
}

// Generate fee installments: HOD only
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { student, amount, dueDate, paid, paidOn, paymentMode, discount, fine, note } = req.body;
    
    // Map frontend key 'student' (which holds student ID) to 'student_id'
    const { data: fee, error } = await supabase
      .from('fees')
      .insert({
        student_id: student,
        amount: Number(amount),
        due_date: dueDate,
        paid: paid || false,
        paid_on: paidOn || null,
        payment_mode: paymentMode || 'cash',
        discount: Number(discount || 0),
        fine: Number(fine || 0),
        note: note || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json(mapFee(fee));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// View fee records: HOD full control, Coordinator view only
router.get('/', auth(['admin', 'coordinator']), async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('fees')
      .select('*, student:students(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((list || []).map(mapFee));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Mark payment as cleared: HOD only
router.put('/:id/pay', auth(['admin']), async (req, res) => {
  try {
    const { data: paidFee, error } = await supabase
      .from('fees')
      .update({ 
        paid: true, 
        paid_on: new Date().toISOString() 
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapFee(paidFee));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Generate Fee Invoice PDF
router.get('/:id/invoice', async (req, res) => {
  try {
    const { data: fee, error } = await supabase
      .from('fees')
      .select('*, student:students(*)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !fee) return res.status(404).json({ message: "Fee record not found" });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${fee.student?.name || 'student'}.pdf`
    );
    doc.pipe(res);

    doc.fontSize(20).text("School Fee Invoice", { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Student Name: ${fee.student?.name || 'N/A'}`);
    doc.text(`Class & Section: ${fee.student?.class || 'N/A'} - ${fee.student?.section || 'N/A'}`);
    doc.text(`Amount: PKR ${fee.amount}`);
    doc.text(`Due Date: ${new Date(fee.due_date).toDateString()}`);
    doc.text(`Status: ${fee.paid ? 'Paid' : 'Pending'}`);
    if (fee.paid && fee.paid_on) {
      doc.text(`Paid On: ${new Date(fee.paid_on).toDateString()}`);
    }

    doc.moveDown();
    doc.text("Thank you", { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
