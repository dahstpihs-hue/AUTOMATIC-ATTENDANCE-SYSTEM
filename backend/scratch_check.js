const mongoose = require("mongoose");
const MONGO_URL = "mongodb://127.0.0.1:27017/schoolerp";

async function check() {
  await mongoose.connect(MONGO_URL);
  
  const ImportBatchSchema = new mongoose.Schema({}, { strict: false });
  const ImportBatch = mongoose.model("ImportBatch", ImportBatchSchema, "importbatches");
  
  const latest = await ImportBatch.findOne().sort({ createdAt: -1 }).lean();
  const sheet = latest.sheets.find(s => s.name === "STUDENTS DATA");
  
  const radiologyRows = sheet.rows.filter(row => {
    const discipline = String(row.values[3] || "").trim().toUpperCase();
    return discipline === "RADIOLOGY";
  });
  
  const uniqueBatches = new Set();
  radiologyRows.forEach(row => {
    uniqueBatches.add(row.values[4]);
  });
  
  console.log("UNIQUE BATCH VALUES FOR RADIOLOGY:", Array.from(uniqueBatches));
  
  // Print count per batch
  const counts = {};
  radiologyRows.forEach(row => {
    const b = row.values[4];
    counts[b] = (counts[b] || 0) + 1;
  });
  console.log("COUNTS PER BATCH:", counts);
  
  process.exit(0);
}

check().catch(console.error);
