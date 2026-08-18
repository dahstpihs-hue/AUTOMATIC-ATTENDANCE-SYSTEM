// .env file ke variables load karne ke liye
require('dotenv').config();

// Express backend server banane ke liye
const express = require('express');

// Backend API ko frontend se connect karne ke liye (Cross-Origin)
const cors = require('cors');

// Sabhi routes import kar rahe hain
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const feeRoutes = require('./routes/fees');
const noticeRoutes = require('./routes/notices');

const app = express();

// CORS enable (taaki frontend backend se communicate kar sake)
app.use(cors());

// Backend ko JSON data receive karne ke layak bana rahe hain
app.use(express.json());

// Root path handler
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "College ERP System Backend API is running successfully!",
    documentation: "Access the React frontend at http://localhost:5173"
  });
});

// API routes register kar rahe hain (prefix /api rakha gaya)
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/notices', noticeRoutes);
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/imports", require("./routes/imports"));
app.use("/api/resources", require("./routes/resources"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/academic", require("./routes/academic"));


console.log("Connected to Supabase Database Layer ✔️");

// Export app for serverless execution
module.exports = app;

// Express server ko port 8080 par run kar rahe hain
if (process.env.NODE_ENV !== "production") {
  app.listen(8080, () => {
    console.log("Server is listening at http://localhost:8080");
  });
}
