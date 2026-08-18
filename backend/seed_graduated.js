const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const MONGO_URL = "mongodb://127.0.0.1:27017/schoolerp";

// Load models
const User = require("./models/User");
const Student = require("./models/Student");

async function seed() {
  await mongoose.connect(MONGO_URL);
  
  const passwordHash = await bcrypt.hash("student123", 10);
  
  // 1st Batch Students (2 Graduated, 1 Demoted)
  // Sufyan Khan already exists, we will update him or keep him as batch 1
  const b1Students = [
    {
      name: "Sufyan Khan",
      rollNumber: "STD-RAD-BATCH-001",
      parentName: "Muhammad Farooq",
      status: "Graduated",
      batch: "1ST"
    },
    {
      name: "Maria Farooq",
      rollNumber: "STD-RAD-BATCH-002",
      parentName: "Muhammad Farooq",
      status: "Graduated",
      batch: "1ST"
    },
    {
      name: "Zainab Bibi",
      rollNumber: "STD-RAD-BATCH-003",
      parentName: "Akbar Ali",
      status: "Demoted",
      batch: "1ST"
    }
  ];

  // 2nd Batch Students (13 Graduated)
  const b2Students = [
    { name: "Adnan Ahmed", rollNumber: "STD-RAD-BATCH-004", parentName: "Ahmed Khan", status: "Graduated", batch: "2ND" },
    { name: "Bilal Shah", rollNumber: "STD-RAD-BATCH-005", parentName: "Shah Faisal", status: "Graduated", batch: "2ND" },
    { name: "Hina Gul", rollNumber: "STD-RAD-BATCH-006", parentName: "Gul Rahman", status: "Graduated", batch: "2ND" },
    { name: "Kamran Khan", rollNumber: "STD-RAD-BATCH-007", parentName: "Khan Muhammad", status: "Graduated", batch: "2ND" },
    { name: "Laiba Noor", rollNumber: "STD-RAD-BATCH-008", parentName: "Noor Habib", status: "Graduated", batch: "2ND" },
    { name: "Muhammad Ali", rollNumber: "STD-RAD-BATCH-009", parentName: "Ali Muhammad", status: "Graduated", batch: "2ND" },
    { name: "Nadia Khan", rollNumber: "STD-RAD-BATCH-010", parentName: "Khan Wali", status: "Graduated", batch: "2ND" },
    { name: "Osama Jan", rollNumber: "STD-RAD-BATCH-011", parentName: "Jan Muhammad", status: "Graduated", batch: "2ND" },
    { name: "Palwasha Bibi", rollNumber: "STD-RAD-BATCH-012", parentName: "Bibi Gul", status: "Graduated", batch: "2ND" },
    { name: "Qasim Shah", rollNumber: "STD-RAD-BATCH-013", parentName: "Shah Wali", status: "Graduated", batch: "2ND" },
    { name: "Riaz Ahmed", rollNumber: "STD-RAD-BATCH-014", parentName: "Ahmed Jan", status: "Graduated", batch: "2ND" },
    { name: "Sana Khan", rollNumber: "STD-RAD-BATCH-015", parentName: "Khan Bahadur", status: "Graduated", batch: "2ND" },
    { name: "Tariq Ali", rollNumber: "STD-RAD-BATCH-016", parentName: "Ali Khan", status: "Graduated", batch: "2ND" }
  ];

  const allToSeed = [...b1Students, ...b2Students];

  console.log("Seeding started...");

  for (const s of allToSeed) {
    const loginId = `std.radiology.${s.name.toLowerCase().replace(/\s+/g, ".")}`;
    
    // Check if user exists
    let user = await User.findOne({ loginId });
    if (!user) {
      user = await User.create({
        name: s.name,
        loginId,
        password: passwordHash,
        role: "student"
      });
    }

    // Check if student profile exists
    let student = await Student.findOne({ rollNumber: s.rollNumber });
    const studentData = {
      name: s.name,
      class: "RADIOLOGY",
      section: `BATCH ${s.batch[0]}`,
      rollNumber: s.rollNumber,
      parentName: s.parentName,
      parentPhone: "0300-0000000",
      user: user._id,
      extraData: {
        "SR NO#": s.rollNumber.split("-").pop(),
        "STUDENT NAME": s.name,
        "FATHER NAME": s.parentName,
        DISCIPLINE: "RADIOLOGY",
        BATCH: `${s.batch} BATCH`,
        SEMESTER: s.status === "Graduated" ? "GRADUATED" : "DEMOTED",
        STATUS: s.status
      }
    };

    if (!student) {
      await Student.create(studentData);
      console.log(`Created student: ${s.name}`);
    } else {
      await Student.findByIdAndUpdate(student._id, studentData);
      console.log(`Updated student: ${s.name}`);
    }
  }

  console.log("Seeding completed successfully!");
  process.exit(0);
}

seed().catch(console.error);
