const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const XLSX = require("xlsx");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const ImportBatch = require("../models/ImportBatch");
const auth = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/batches/:id", auth(["admin", "coordinator"]), async (req, res) => {
  try {
    const batch = await ImportBatch.findById(req.params.id).lean();
    if (!batch) return res.status(404).json({ message: "Import batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: "Failed to load import batch", error: err.message });
  }
});

router.get("/latest-sheet/:type", auth(["admin", "coordinator"]), async (req, res) => {
  try {
    const batch = await ImportBatch.findOne().sort({ createdAt: -1 }).lean();
    if (!batch) return res.status(404).json({ message: "No imported workbook found" });

    const sheet = selectStoredSheet(batch.sheets || [], req.params.type);
    if (!sheet) {
      return res.status(404).json({
        message: `No ${req.params.type} sheet found in the latest imported workbook`,
        fileName: batch.fileName,
      });
    }

    res.json({
      fileName: batch.fileName,
      importedAt: batch.createdAt,
      importBatchId: batch._id,
      sheet,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load imported sheet", error: err.message });
  }
});

router.post("/latest-sheet/:type/rows", auth(["admin"]), async (req, res) => {
  try {
    const { batch, sheetIndex } = await editableLatestSheet(req.params.type);
    const sheet = batch.sheets[sheetIndex];
    const values = normalizeSheetValues(req.body.values, sheet);
    sheet.rows.push({ values });
    rebuildStoredSheet(sheet);
    batch.markModified("sheets");
    await batch.save();
    res.json(latestSheetResponse(batch, sheet));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to add row" });
  }
});

router.put("/latest-sheet/:type/rows/:excelRow", auth(["admin"]), async (req, res) => {
  try {
    const { batch, sheetIndex } = await editableLatestSheet(req.params.type);
    const sheet = batch.sheets[sheetIndex];
    const excelRow = Number(req.params.excelRow);
    if (excelRow === sheet.headerRow) {
      return res.status(400).json({ message: "Header row cannot be edited here" });
    }

    const rowIndex = sheet.rows.findIndex((row) => row.excelRow === excelRow);
    if (rowIndex < 0) return res.status(404).json({ message: "Row not found" });

    sheet.rows[rowIndex].values = normalizeSheetValues(req.body.values, sheet);
    rebuildStoredSheet(sheet);
    batch.markModified("sheets");
    await batch.save();
    res.json(latestSheetResponse(batch, sheet));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to update row" });
  }
});

router.delete("/latest-sheet/:type/rows/:excelRow", auth(["admin"]), async (req, res) => {
  try {
    const { batch, sheetIndex } = await editableLatestSheet(req.params.type);
    const sheet = batch.sheets[sheetIndex];
    const excelRow = Number(req.params.excelRow);
    if (excelRow === sheet.headerRow) {
      return res.status(400).json({ message: "Header row cannot be deleted here" });
    }

    const nextRows = sheet.rows.filter((row) => row.excelRow !== excelRow);
    if (nextRows.length === sheet.rows.length) return res.status(404).json({ message: "Row not found" });

    sheet.rows = nextRows;
    rebuildStoredSheet(sheet);
    batch.markModified("sheets");
    await batch.save();
    res.json(latestSheetResponse(batch, sheet));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to delete row" });
  }
});

function securePassword(prefix = "TPIHS") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(100 + Math.random() * 900)}`;
}

function slug(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasData(row) {
  return Object.values(row).some((value) => String(value || "").trim() !== "");
}

function uniqueHeaders(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

const fieldAliases = {
  student: [
    "student", "student name", "roll", "roll no", "roll number", "registration", "reg no",
    "class", "program", "programme", "batch", "semester", "section", "father", "guardian"
  ],
  faculty: [
    "faculty", "teacher", "staff", "employee", "email", "subject", "course", "designation",
    "department", "phone", "contact"
  ],
  login: [
    "password", "pass", "login", "username", "user name"
  ],
};

function pick(row, keys) {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[slug(key)] = row[key];
  });

  for (const key of keys) {
    const value = normalized[slug(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function scoreCells(cells, type) {
  const aliases = fieldAliases[type] || [];
  const text = cells.map((cell) => slug(cell)).filter((cell) => cell.length >= 3);
  return aliases.reduce((score, alias) => {
    const needle = slug(alias);
    return score + (text.some((cell) =>
      cell.includes(needle) || (needle.length >= 4 && cell.length >= 4 && needle.includes(cell))
    ) ? 1 : 0);
  }, 0);
}

function nonEmptyCount(cells) {
  return cells.filter((cell) => String(cell || "").trim() !== "").length;
}

function sheetNameScore(sheetName, candidates) {
  return candidates.reduce((score, candidate) => {
    const name = slug(sheetName);
    const wanted = slug(candidate);
    if (name === wanted) return score + 8;
    if (name.includes(wanted) || wanted.includes(name)) return score + 4;
    return score;
  }, 0);
}

function analyzeSheet(workbook, sheetName, candidates, type) {
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  let bestRow = 0;
  let bestHeaderScore = 0;
  const nameScore = sheetNameScore(sheetName, candidates);
  matrix.slice(0, 30).forEach((row, index) => {
    const headerScore = scoreCells(row, type);
    const filled = nonEmptyCount(row);
    if (
      headerScore > bestHeaderScore ||
      (headerScore === bestHeaderScore && filled > nonEmptyCount(matrix[bestRow] || []))
    ) {
      bestHeaderScore = headerScore;
      bestRow = index;
    }
  });

  if (bestHeaderScore === 0) {
    bestRow = matrix
      .slice(0, 30)
      .reduce((best, row, index) => (
        nonEmptyCount(row) > nonEmptyCount(matrix[best] || []) ? index : best
      ), 0);
  }

  const rawHeaders = (matrix[bestRow] || []).map((header, index) =>
    String(header || `Column ${index + 1}`).trim() || `Column ${index + 1}`
  );
  const headers = rawHeaders.map((header, index) =>
    rawHeaders.indexOf(header) === index ? header : `${header} ${index + 1}`
  );
  const rows = matrix
    .slice(bestRow + 1)
    .map((values) =>
      headers.reduce((row, header, index) => {
        row[header] = values[index] ?? "";
        return row;
      }, {})
    )
    .filter(hasData);

  return {
    sheetName,
    rows,
    headers,
    headerRow: bestRow + 1,
    score: (bestHeaderScore * 10) + nameScore,
    preview: rows.slice(0, 3),
  };
}

function exactSheetData(workbook, sheetName) {
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const normalized = matrix.map((row) => {
    const padded = [...row];
    while (padded.length < width) padded.push("");
    return padded.map((value) => String(value ?? ""));
  });

  const headerIndex = normalized.slice(0, 30).reduce((best, row, index) => (
    nonEmptyCount(row) > nonEmptyCount(normalized[best] || []) ? index : best
  ), 0);
  const headers = headerIndex >= 0
    ? normalized[headerIndex].map((header, index) => String(header || `Column ${index + 1}`))
    : [];

  const rows = normalized.map((values, index) => ({
    excelRow: index + 1,
    values,
    cells: headers.reduce((acc, header, cellIndex) => {
      acc[header || `Column ${cellIndex + 1}`] = values[cellIndex] || "";
      return acc;
    }, {}),
  }));

  return {
    name: sheetName,
    headerRow: headerIndex >= 0 ? headerIndex + 1 : null,
    headers,
    rows,
    rowCount: rows.length,
    columnCount: width,
  };
}

function sheetPreview(sheet) {
  return {
    ...sheet,
    previewRowLimit: sheet.rows.length,
    allRowsStored: false,
  };
}

async function editableLatestSheet(type) {
  const batch = await ImportBatch.findOne().sort({ createdAt: -1 });
  if (!batch) {
    const err = new Error("No imported workbook found");
    err.status = 404;
    throw err;
  }

  const sheetIndex = selectStoredSheetIndex(batch.sheets || [], type);
  if (sheetIndex < 0) {
    const err = new Error(`No ${type} sheet found in the latest imported workbook`);
    err.status = 404;
    throw err;
  }

  return { batch, sheetIndex };
}

function latestSheetResponse(batch, sheet) {
  return {
    fileName: batch.fileName,
    importedAt: batch.createdAt,
    importBatchId: batch._id,
    sheet,
  };
}

function normalizeSheetValues(values = [], sheet) {
  const width = Math.max(sheet.columnCount || 0, sheet.headers?.length || 0, values.length || 0);
  const normalized = Array.isArray(values) ? values.map((value) => String(value ?? "")) : [];
  while (normalized.length < width) normalized.push("");
  return normalized.slice(0, width);
}

function rebuildStoredSheet(sheet) {
  const width = Math.max(sheet.columnCount || 0, sheet.headers?.length || 0);
  let serial = 1;

  sheet.rows = (sheet.rows || []).map((row, index) => {
    const values = normalizeSheetValues(row.values, { ...sheet, columnCount: width });
    if (index + 1 !== sheet.headerRow && values.length > 0) {
      values[0] = String(serial);
      serial += 1;
    }

    return {
      excelRow: index + 1,
      values,
      cells: (sheet.headers || []).reduce((acc, header, cellIndex) => {
        acc[header || `Column ${cellIndex + 1}`] = values[cellIndex] || "";
        return acc;
      }, {}),
    };
  });

  sheet.rowCount = sheet.rows.length;
  sheet.columnCount = width;
}

function selectStoredSheetIndex(sheets, type) {
  const scored = sheets.map((sheet, index) => {
    const selected = selectStoredSheet([sheet], type);
    return selected ? { index, sheet: selected } : null;
  }).filter(Boolean);

  if (scored.length === 1) return scored[0].index;

  const selected = selectStoredSheet(sheets, type);
  return sheets.findIndex((sheet) => String(sheet.name) === String(selected?.name));
}

function selectStoredSheet(sheets, type) {
  const normalizedType = slug(type);
  const isStudentSheet = ["student", "students"].includes(normalizedType);
  const isFacultySheet = ["faculty", "teacher", "teachers"].includes(normalizedType);
  if (!isStudentSheet && !isFacultySheet) return null;

  const candidates = isStudentSheet
    ? ["Students Data", "Student Data", "Students", "Student Details"]
    : ["Faculty Data", "Faculty", "Teachers", "Faculty Details"];
  const fieldType = isStudentSheet ? "student" : "faculty";

  return sheets
    .map((sheet) => {
      const name = sheet.name || "";
      const nameText = slug(name);
      const headerScore = scoreCells(sheet.headers || [], fieldType);
      const nameScore = sheetNameScore(name, candidates);
      const loginPenalty = isFacultySheet && nameText.includes("login") ? 100 : 0;
      return {
        sheet,
        score: (nameScore * 10) + headerScore - loginPenalty,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.sheet || null;
}

function uniqueFromSet(base, used, fallback) {
  const root = slug(base) || fallback;
  let candidate = root;
  let i = 1;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${root}${i}`;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function sheetToRows(workbook, candidates, type, usedSheets = new Set()) {
  const analyses = workbook.SheetNames
    .filter((sheetName) => !usedSheets.has(sheetName))
    .map((sheetName) => analyzeSheet(workbook, sheetName, candidates, type))
    .sort((a, b) => b.score - a.score);

  const best = analyses[0];
  if (!best || best.score <= 0) {
    return { sheetName: null, rows: [], headers: [], headerRow: null, score: 0, preview: [] };
  }

  usedSheets.add(best.sheetName);
  return best;
}

function normalizeLoginRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const email = pick(row, ["email", "faculty email", "login email", "email address"]);
    const name = pick(row, ["name", "faculty name", "full name", "teacher name"]);
    const password = pick(row, ["password", "login password", "faculty password", "pass"]);
    if (email) map.set(email.toLowerCase(), { password });
    if (name) map.set(name.toLowerCase(), { password });
  });
  return map;
}

async function uniqueLoginId(base) {
  let candidate = slug(base) || `student${Date.now()}`;
  let i = 1;
  while (await User.findOne({ loginId: candidate })) {
    candidate = `${slug(base)}${i}`;
    i += 1;
  }
  return candidate;
}

async function uniqueEmail(baseName, rowNumber) {
  const base = slug(baseName) || `faculty${rowNumber}`;
  let candidate = `${base}@tpihs.local`;
  let i = 1;
  while (await User.findOne({ email: candidate })) {
    candidate = `${base}${i}@tpihs.local`;
    i += 1;
  }
  return candidate;
}

router.post("/master-excel", auth(["admin"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Excel file is required" });
    console.log(`Master Excel import started: ${req.file.originalname} (${req.file.size} bytes)`);

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const exactSheets = workbook.SheetNames.map((sheetName) => exactSheetData(workbook, sheetName));
    const usedSheets = new Set();
    const facultySheet = sheetToRows(workbook, ["Faculty Data", "Faculty", "Teachers", "Faculty Details"], "faculty", usedSheets);
    const studentSheet = sheetToRows(workbook, ["Students Data", "Student Data", "Students", "Student Details"], "student", usedSheets);
    const facultyLoginSheet = sheetToRows(workbook, ["Faculty Login Data", "Faculty Login", "Login Data", "Faculty Passwords"], "login", usedSheets);
    const loginMap = normalizeLoginRows(facultyLoginSheet.rows);

    const result = {
      success: false,
      message: "",
      students: [],
      faculty: [],
      studentCount: 0,
      facultyCount: 0,
      skipped: [],
      sheets: workbook.SheetNames,
      exactSheets: exactSheets.map((sheet) => sheetPreview(sheet)),
      detected: {
        students: { sheetName: studentSheet.sheetName, headers: studentSheet.headers, headerRow: studentSheet.headerRow, score: studentSheet.score, preview: studentSheet.preview },
        faculty: { sheetName: facultySheet.sheetName, headers: facultySheet.headers, headerRow: facultySheet.headerRow, score: facultySheet.score, preview: facultySheet.preview },
        facultyLogin: { sheetName: facultyLoginSheet.sheetName, headers: facultyLoginSheet.headers, headerRow: facultyLoginSheet.headerRow, score: facultyLoginSheet.score, preview: facultyLoginSheet.preview },
      },
    };

    const existingUsers = await User.find({}, { loginId: 1, email: 1 }).lean();
    const usedLoginIds = new Set(existingUsers.map((user) => String(user.loginId || "").toLowerCase()).filter(Boolean));
    const usedEmails = new Set(existingUsers.map((user) => String(user.email || "").toLowerCase()).filter(Boolean));

    const studentInputs = [];
    for (const [index, row] of studentSheet.rows.entries()) {
      const rowNo = index + 2;
      const name = pick(row, ["name", "student name", "full name", "student", "candidate name"]) || `Student Row ${rowNo}`;
      const rollNumber =
        pick(row, ["rollnumber", "roll number", "roll no", "roll no.", "registration no", "reg no", "id", "student id"]) ||
        `ROW-${rowNo}`;
      const className =
        pick(row, ["class", "class name", "program", "programme", "degree", "batch", "department"]) ||
        "Unassigned";
      const section = pick(row, ["section", "group", "shift"]) || "A";
      const requestedLogin = pick(row, ["loginid", "login id", "student login id", "username", "user name"]);
      const loginId = requestedLogin
        ? uniqueFromSet(requestedLogin, usedLoginIds, `student${rowNo}`)
        : uniqueFromSet(`${name}${rollNumber}`, usedLoginIds, `student${rowNo}`);
      const password = pick(row, ["password", "student password", "login password", "pass"]) || securePassword("STD");

      studentInputs.push({
        rowNo,
        row,
        name,
        loginId,
        password,
        rollNumber,
        className,
        section,
      });
    }

    const existingStudents = await Student.find({
      rollNumber: { $in: studentInputs.map((item) => item.rollNumber) },
    }).lean();
    const existingStudentsByRoll = new Map(existingStudents.map((student) => [String(student.rollNumber), student]));
    const newStudentInputs = studentInputs.filter((item) => !existingStudentsByRoll.has(String(item.rollNumber)));
    const existingStudentInputs = studentInputs.filter((item) => existingStudentsByRoll.has(String(item.rollNumber)));

    const studentData = (item, userId) => ({
      name: item.name,
      dob: pick(item.row, ["dob", "date of birth", "birth date"]) || undefined,
      gender: pick(item.row, ["gender", "sex"]),
      class: item.className,
      section: item.section,
      rollNumber: item.rollNumber,
      parentName: pick(item.row, ["guardian name", "guardianname", "father name", "father", "parent name"]),
      parentPhone: pick(item.row, ["guardian phone", "guardianphone", "phone", "contact", "mobile", "contact no"]),
      address: pick(item.row, ["address", "home address"]),
      extraData: item.row,
      ...(userId ? { user: userId } : {}),
    });

    const studentUserDocs = await Promise.all(newStudentInputs.map(async (item) => ({
      name: item.name,
      loginId: item.loginId,
      password: await bcrypt.hash(item.password, 8),
      role: "student",
    })));
    const insertedStudentUsers = studentUserDocs.length ? await User.insertMany(studentUserDocs) : [];
    const studentDocs = newStudentInputs.map((item, index) => studentData(item, insertedStudentUsers[index]._id));
    const insertedStudents = studentDocs.length ? await Student.insertMany(studentDocs) : [];
    const updatedStudents = await Promise.all(existingStudentInputs.map((item) => (
      Student.findByIdAndUpdate(
        existingStudentsByRoll.get(String(item.rollNumber))._id,
        studentData(item),
        { new: true }
      )
    )));
    const studentResultsByRoll = new Map([
      ...updatedStudents.map((student) => [String(student.rollNumber), { student, existing: true }]),
      ...insertedStudents.map((student, index) => [String(student.rollNumber), { student, input: newStudentInputs[index] }]),
    ]);
    result.studentCount = studentInputs.length;
    result.students = studentInputs.map((item) => {
      const saved = studentResultsByRoll.get(String(item.rollNumber));
      return {
        rowNo: item.rowNo,
        student: saved?.student,
        credentials: saved?.existing
          ? { loginId: "Existing account", password: "unchanged" }
          : { loginId: item.loginId, password: item.password },
        original: item.row,
      };
    }).filter((row) => row.student);

    const facultyInputs = [];
    for (const [index, row] of facultySheet.rows.entries()) {
      const rowNo = index + 2;
      const name = pick(row, ["name", "faculty name", "full name", "teacher name", "staff name"]) || `Faculty Row ${rowNo}`;
      const username = pick(row, ["username", "user name", "login", "login id", "faculty username"]) || uniqueFromSet(slug(name), usedLoginIds, `faculty${rowNo}`);
      const rowEmail = pick(row, ["email", "faculty email", "login email", "email address"]);
      const email = rowEmail || username;
      const login = loginMap.get(email.toLowerCase()) || loginMap.get(username.toLowerCase()) || loginMap.get(name.toLowerCase()) || {};
      const password = login.password || pick(row, ["password", "faculty password", "login password", "pass"]) || securePassword("FAC");

      facultyInputs.push({ rowNo, row, name, username, email, password });
    }

    const existingFaculty = await Teacher.find({
      email: { $in: facultyInputs.map((item) => item.email) },
    }).lean();
    const existingFacultyByEmail = new Map(existingFaculty.map((teacher) => [String(teacher.email).toLowerCase(), teacher]));
    const newFacultyInputs = facultyInputs
      .filter((item) => !existingFacultyByEmail.has(String(item.email).toLowerCase()))
      .map((item) => ({
        ...item,
        email: uniqueFromSet(item.email, usedEmails, `faculty${item.rowNo}@tpihs.local`),
      }));
    const existingFacultyInputs = facultyInputs.filter((item) => existingFacultyByEmail.has(String(item.email).toLowerCase()));

    const facultyData = (item, userId) => ({
      name: item.name,
      email: item.email,
      phone: pick(item.row, ["phone", "contact", "mobile", "contact no"]),
      subject: pick(item.row, ["subject", "subjects", "course", "course title"]),
      class: pick(item.row, ["class", "class name", "program", "batch", "semester"]) || "Unassigned",
      section: pick(item.row, ["section", "group", "shift"]),
      extraData: item.row,
      ...(userId ? { user: userId } : {}),
    });

    const facultyUserDocs = await Promise.all(newFacultyInputs.map(async (item) => ({
      name: item.name,
      email: item.email,
      loginId: item.username,
      password: await bcrypt.hash(item.password, 8),
      role: "teacher",
    })));
    const insertedFacultyUsers = facultyUserDocs.length ? await User.insertMany(facultyUserDocs) : [];
    const facultyDocs = newFacultyInputs.map((item, index) => facultyData(item, insertedFacultyUsers[index]._id));
    const insertedFaculty = facultyDocs.length ? await Teacher.insertMany(facultyDocs) : [];
    const updatedFaculty = await Promise.all(existingFacultyInputs.map(async (item) => {
      const existingTeacher = existingFacultyByEmail.get(String(item.email).toLowerCase());
      if (existingTeacher?.user) {
        await User.findByIdAndUpdate(existingTeacher.user, {
          name: item.name,
          email: item.email,
          loginId: item.username,
          password: await bcrypt.hash(item.password, 8),
          role: "teacher",
        });
      }

      return Teacher.findByIdAndUpdate(
        existingTeacher._id,
        facultyData(item),
        { new: true }
      );
    }));
    const facultyResultsByRow = new Map([
      ...updatedFaculty.map((teacher, index) => [existingFacultyInputs[index].rowNo, { teacher, existing: true }]),
      ...insertedFaculty.map((teacher, index) => [newFacultyInputs[index].rowNo, { teacher, input: newFacultyInputs[index] }]),
    ]);
    result.facultyCount = facultyInputs.length;
    result.faculty = facultyInputs.map((item) => {
      const saved = facultyResultsByRow.get(item.rowNo);
      return {
        rowNo: item.rowNo,
        teacher: saved?.teacher,
        credentials: saved?.existing
          ? { email: item.email, password: "unchanged" }
          : { email: saved?.input?.email || item.email, password: item.password },
        original: item.row,
      };
    }).filter((row) => row.teacher);

    if (!studentSheet.sheetName) {
      result.skipped.push({ type: "sheet", reason: "Students sheet not detected", expected: "Students Data" });
    }
    if (!facultySheet.sheetName) {
      result.skipped.push({ type: "sheet", reason: "Faculty sheet not detected", expected: "Faculty Data" });
    }

    const importBatch = await ImportBatch.create({
      fileName: req.file.originalname,
      uploadedBy: req.user.id,
      sheets: exactSheets,
      importedStudents: result.studentCount,
      importedFaculty: result.facultyCount,
      skipped: result.skipped,
    });

    result.importBatchId = importBatch._id;
    result.success = true;
    result.message = `Successfully imported ${result.studentCount} students and ${result.facultyCount} faculty records from ${workbook.SheetNames.length} Excel tabs.`;
    console.log(result.message);

    res.json(result);
  } catch (err) {
    console.error("Master Excel import failed:", err);
    res.status(500).json({ message: "Master Excel import failed", error: err.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.code === "LIMIT_FILE_SIZE"
        ? "Excel file is too large. Maximum allowed size is 25MB."
        : err.message,
    });
  }
  next(err);
});

module.exports = router;
