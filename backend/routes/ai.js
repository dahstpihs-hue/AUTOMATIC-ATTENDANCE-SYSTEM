const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

// Mock bank for generating Chemistry/Physics/Biology board exam papers
const QUESTION_BANK = {
  chemistry: {
    objectives: [
      { q: "What is the pH of pure water at 25°C?", options: ["A) 5", "B) 7", "C) 9", "D) 14"], correct: "B" },
      { q: "Which gas is known as laughing gas?", options: ["A) NO", "B) NO2", "C) N2O", "D) N2O5"], correct: "C" },
      { q: "Which element has the highest electronegativity?", options: ["A) Oxygen", "B) Chlorine", "C) Fluorine", "D) Nitrogen"], correct: "C" },
      { q: "What is the chemical formula of bleaching powder?", options: ["A) Ca(ClO)2", "B) CaOCl2", "C) Ca(OH)2", "D) CaCl2"], correct: "B" }
    ],
    shorts: [
      "Define Le Chatelier's principle and state its applications.",
      "Differentiate between empirical and molecular formulas with examples.",
      "Why is HF a weaker acid than HCl?",
      "Explain the term hybridization with reference to sp3 orbitals."
    ],
    longs: [
      "Describe the manufacturing of Sodium Carbonate by Solvay's process in detail along with flow sheets.",
      "Explain Bohr's atomic model and derive the expression for the radius of nth orbit of hydrogen atom."
    ]
  },
  physics: {
    objectives: [
      { q: "What is the SI unit of electric potential?", options: ["A) Ampere", "B) Volt", "C) Ohm", "D) Joule"], correct: "B" },
      { q: "A body is dropped from a height. Its velocity after 2 seconds is (g = 9.8 m/s²):", options: ["A) 4.9 m/s", "B) 9.8 m/s", "C) 19.6 m/s", "D) 39.2 m/s"], correct: "C" },
      { q: "The rate of doing work is called:", options: ["A) Energy", "B) Torque", "C) Momentum", "D) Power"], correct: "D" },
      { q: "The value of escape velocity from earth's surface is approximately:", options: ["A) 11.2 km/s", "B) 9.8 km/s", "C) 8 km/s", "D) 4.2 km/s"], correct: "A" }
    ],
    shorts: [
      "State Newton's second law of motion in terms of momentum.",
      "What is the difference between transverse and longitudinal waves?",
      "Explain why spark plug is not needed in diesel engine.",
      "Define mutual induction and write its SI unit."
    ],
    longs: [
      "State and prove Bernoulli's equation for a fluid flow. Write its main applications.",
      "Explain the construction and working of a Galvanometer. How can it be converted into an Ammeter and Voltmeter?"
    ]
  }
};

const DEFAULT_QUESTIONS = {
  objectives: [
    { q: "Which of the following is a core asset of TPIHS Mardan?", options: ["A) Allied Health", "B) Metallurgy", "C) Astrology", "D) Archeology"], correct: "A" }
  ],
  shorts: [
    "Write a short note on clinical laboratory ethics.",
    "List the major functions of a healthcare coordinator."
  ],
  longs: [
    "Detail the step-by-step sterilization process in medical environments.",
  ]
};

// POST /api/ai/paper/generate
router.post("/paper/generate", auth(), (req, res) => {
  try {
    const { subject, className, board, difficulty } = req.body;
    const subjKey = String(subject || "").toLowerCase().trim();
    const bank = QUESTION_BANK[subjKey] || DEFAULT_QUESTIONS;

    const paperText = `THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES (TPIHS) MARDAN
Subject: ${subject || "General Sciences"} | Class: ${className || "BS Allied Health"} | Time Allowed: 3 Hours | Max Marks: 100
Board Standard: ${board || "FBISE"} | Difficulty: ${difficulty || "Medium"}

SECTION A: OBJECTIVE (Multiple Choice Questions) - 20 Marks
${bank.objectives.map((obj, i) => `${i + 1}. ${obj.q}\n   ${obj.options.join("   ")}`).join("\n\n")}

SECTION B: SHORT ANSWER QUESTIONS - 50 Marks
${bank.shorts.map((q, i) => `${i + 1}. ${q}`).join("\n")}

SECTION C: LONG / EXTENDED QUESTIONS - 30 Marks
${bank.longs.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`;

    res.json({ success: true, text: paperText });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/notes/generate
router.post("/notes/generate", auth(), (req, res) => {
  try {
    const { subject, topic } = req.body;
    const generatedNotes = `### Academic Lecture Notes
Subject: ${subject || "Allied Health"}
Topic: ${topic || "Clinical Introduction"}
Board Affiliation: Federal Board (FBISE) Standard
--------------------------------------------------------
1. **Core Concept Overview**:
   Understanding the basic biochemistry and biological parameters associated with ${topic || "this topic"}. 
2. **Clinical Significance**:
   - Proper diagnostics require precise values and standards.
   - Healthcare management systems prioritize patient outcomes.
3. **Key Definitive Terminologies**:
   - Primary indicators: Crucial diagnostic benchmarks.
   - Standard deviation tolerances: Permitted errors in laboratory procedures.
4. **Summary & Takeaways**:
   Always reference official textbook material for FBISE / Punjab Board curriculum standards before conducting assessments.
`;
    res.json({ success: true, text: generatedNotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/tutor/chat
router.post("/tutor/chat", auth(), (req, res) => {
  try {
    const { message } = req.body;
    const query = String(message || "").toLowerCase();
    let reply = "";

    if (query.includes("newton") || query.includes("law")) {
      reply = "According to FBISE Physics, Newton's 1st Law (Inertia) states a body remains at rest or in motion unless acted upon. The 2nd Law states F = ma. The 3rd Law states every action has an equal and opposite reaction.";
    } else if (query.includes("cell") || query.includes("mitosis")) {
      reply = "In Biology, Mitosis is a process of cell division where one cell divides into two identical daughter cells, maintaining the chromosome count. It has four phases: Prophase, Metaphase, Anaphase, and Telophase.";
    } else if (query.includes("acid") || query.includes("ph")) {
      reply = "pH represents the negative logarithm of hydrogen ion concentration. Acids have a pH less than 7, bases have a pH greater than 7, and pure water is neutral at pH 7.";
    } else {
      reply = `Thank you for asking about "${message}". As your 24/7 AI Tutor mapped to FBISE/Punjab board textbooks, I recommend looking up this topic in Chapter 3 of your board curriculum. Feel free to ask specific questions about Physics, Chemistry, Biology, or Math.`;
    }

    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/practice/generate
router.post("/practice/generate", auth(), (req, res) => {
  try {
    const { subject } = req.body;
    const subjKey = String(subject || "").toLowerCase().trim();
    const bank = QUESTION_BANK[subjKey] || DEFAULT_QUESTIONS;
    res.json({ success: true, questions: bank.objectives });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
