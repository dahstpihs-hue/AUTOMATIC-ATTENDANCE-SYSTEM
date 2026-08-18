const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const ImportBatch = require("../models/ImportBatch");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

const MONGO_URL = "mongodb://127.0.0.1:27017/schoolerp";

function slug(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findIndex(headers, names) {
  return headers.findIndex((header) => {
    const key = slug(header);
    return names.some((name) => key.includes(slug(name)));
  });
}

function rowValue(row, index) {
  return String(row.values?.[index] || "").trim();
}

async function main() {
  await mongoose.connect(MONGO_URL);

  const batch = await ImportBatch.findOne().sort({ createdAt: -1 }).lean();
  if (!batch) throw new Error("No imported workbook found");

  const facultySheet = (batch.sheets || []).find((sheet) => {
    const name = String(sheet.name || "").toLowerCase();
    return name.includes("faculty") && !name.includes("login");
  });
  if (!facultySheet) throw new Error("No Faculty Data sheet found");

  const headers = facultySheet.headers || [];
  const nameIndex = findIndex(headers, ["faculty name", "name"]);
  const deptIndex = findIndex(headers, ["department"]);
  const usernameIndex = findIndex(headers, ["username", "user name", "login"]);
  const passwordIndex = findIndex(headers, ["password", "pass"]);

  if (nameIndex < 0 || usernameIndex < 0 || passwordIndex < 0) {
    throw new Error(`Required columns missing. Headers: ${headers.join(", ")}`);
  }

  let synced = 0;
  for (const row of facultySheet.rows || []) {
    if (row.excelRow === facultySheet.headerRow) continue;

    const name = rowValue(row, nameIndex);
    const department = deptIndex >= 0 ? rowValue(row, deptIndex) : "";
    const username = rowValue(row, usernameIndex);
    const password = rowValue(row, passwordIndex);
    if (!name || !username || !password) continue;

    const isHod = username.toLowerCase().includes("hod");
    const role = isHod ? "admin" : "teacher";
    const hashed = await bcrypt.hash(password, 10);
    const teachers = await Teacher.find({ name });

    let user =
      await User.findOne({ loginId: username }) ||
      (teachers[0]?.user ? await User.findById(teachers[0].user) : null) ||
      (isHod ? await User.findOne({ role: "admin" }) : null);

    if (!user) {
      user = await User.create({
        name,
        loginId: username,
        password: hashed,
        role,
      });
    } else {
      user.name = name;
      user.loginId = username;
      user.password = hashed;
      user.role = role;
      await user.save();
    }

    const extraData = {
      ...(teachers[0]?.extraData || {}),
      "Faculty Name": name,
      Department: department,
      Username: username,
      Password: password,
    };

    if (teachers.length === 0) {
      await Teacher.create({
        name,
        email: username,
        subject: department,
        class: department || "Unassigned",
        extraData,
        user: user._id,
      });
    } else {
      await Teacher.updateMany(
        { name },
        {
          $set: {
            subject: department,
            class: department || "Unassigned",
            extraData,
            user: user._id,
          },
        }
      );
    }

    synced += 1;
  }

  console.log(`Synced ${synced} faculty/HOD usernames and passwords from ${batch.fileName}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
