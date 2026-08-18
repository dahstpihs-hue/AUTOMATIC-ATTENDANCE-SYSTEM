const mongoose = require("mongoose");
const MONGO_URL = "mongodb://127.0.0.1:27017/schoolerp";

async function check() {
  await mongoose.connect(MONGO_URL);
  const StudentSchema = new mongoose.Schema({}, { strict: false });
  const Student = mongoose.model("Student", StudentSchema, "students");
  
  const list = await Student.find({}).limit(5).lean();
  console.log("TOTAL STUDENTS:", list.length);
  list.forEach(s => {
    console.log(`- Name: ${s.name} | Roll: ${s.rollNumber} | Class: ${s.class} | Section: ${s.section} | Extra:`, JSON.stringify(s.extraData));
  });
  
  process.exit(0);
}

check().catch(console.error);
