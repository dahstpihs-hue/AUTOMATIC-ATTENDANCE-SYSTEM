import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function AITutor() {
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Assalam-o-Alaikum! I am your 24/7 AI Study Tutor mapped to Pakistani board textbooks. Ask me anything about Physics, Chemistry, Biology, or Mathematics!" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState("tutor");
  
  // Senior vs Junior view switcher
  const [isJuniorView, setIsJuniorView] = useState(false);

  // Practice test state
  const [subject, setSubject] = useState("Chemistry");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [testScore, setTestScore] = useState(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = { sender: "user", text: inputVal };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    try {
      const { data } = await api.post("/ai/tutor/chat", { message: inputVal });
      setChatMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "ai", text: "Error connecting to AI Tutor backbone: " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const loadPracticeTest = async () => {
    setLoading(true);
    setTestScore(null);
    setTestSubmitted(false);
    setAnswers({});
    try {
      const { data } = await api.post("/ai/practice/generate", { subject });
      setQuestions(data.questions || []);
    } catch (err) {
      alert("Failed to load practice questions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (qIndex, optionLetter) => {
    setAnswers({ ...answers, [qIndex]: optionLetter });
  };

  const submitTest = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      const chosenOption = answers[idx]; // E.g. "A" or "B"
      // option letter might be the prefix in "A) Volt"
      if (chosenOption && q.correct === chosenOption) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
  };

  return (
    <div className={`page-stack ${isJuniorView ? "junior-theme" : "senior-theme"}`} style={isJuniorView ? styles.juniorBg : {}}>
      
      {/* Visual variant switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">{isJuniorView ? "JUNIOR MODE (Nursery - Grade 8)" : "SENIOR MODE (Grades 9 - 12 / BS Level)"}</p>
          <h2 className="single-line-glow">{isJuniorView ? "✨ AI Learn & Play Zone" : "24/7 TEXTBOOK AI TUTOR & DIAGNOSTIC LAB"}</h2>
        </div>
        <button
          className="mini-action"
          style={{ background: isJuniorView ? "#eab308" : "#a855f7", color: "#fff", fontWeight: "bold" }}
          onClick={() => setIsJuniorView(!isJuniorView)}
        >
          🔄 Switch to {isJuniorView ? "Senior View" : "Junior View"}
        </button>
      </div>

      {isJuniorView ? (
        // JUNIOR MODE LAYOUT: Colorful gamification
        <div style={styles.juniorLayout}>
          <div style={styles.juniorStats}>
            <div style={styles.juniorStatCard}>
              <span style={{ fontSize: "2rem" }}>🔥</span>
              <strong>5 Day Streak!</strong>
              <small>Keep studying daily!</small>
            </div>
            <div style={styles.juniorStatCard}>
              <span style={{ fontSize: "2rem" }}>⭐</span>
              <strong>120 Coins</strong>
              <small>Spend in Canteen Canteen!</small>
            </div>
            <div style={styles.juniorStatCard}>
              <span style={{ fontSize: "2rem" }}>🏆</span>
              <strong>Science Star Badge</strong>
              <small>Chapter 3 Complete!</small>
            </div>
          </div>
          
          <div className="card" style={{ background: "rgba(251, 191, 36, 0.15)", border: "2px dashed #fbbf24" }}>
            <h3>Ask Jojo, your AI Study Buddy!</h3>
            <p>Jojo makes learning fun. Type any question below!</p>
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Why is the sky blue?"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                style={styles.juniorInput}
              />
              <button className="primary-action" style={{ background: "#fbbf24", color: "#000", fontWeight: "bold" }}>ASK JOJO!</button>
            </form>
            <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px", color: "#fff" }}>
              <strong>Jojo says:</strong>
              <p style={{ margin: "4px 0" }}>{chatMessages[chatMessages.length - 1]?.text}</p>
            </div>
          </div>
        </div>
      ) : (
        // SENIOR MODE LAYOUT: High-end clinical diagnostic UI
        <div className="card">
          <div className="action-buttons" style={{ marginBottom: "16px" }}>
            <button
              className={activeMode === "tutor" ? "primary-action" : "mini-action"}
              onClick={() => setActiveMode("tutor")}
            >
              💬 AI Retrieval Tutor Chat
            </button>
            <button
              className={activeMode === "practice" ? "primary-action" : "mini-action"}
              onClick={() => { setActiveMode("practice"); loadPracticeTest(); }}
            >
              📝 AI Diagnostic Practice Test
            </button>
          </div>

          {activeMode === "tutor" && (
            <div style={styles.chatContainer}>
              <div style={styles.chatHistory}>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.chatBubble,
                      alignSelf: msg.sender === "ai" ? "flex-start" : "flex-end",
                      backgroundColor: msg.sender === "ai" ? "rgba(255,255,255,0.04)" : "rgba(56, 189, 248, 0.15)",
                      borderColor: msg.sender === "ai" ? "rgba(255,255,255,0.08)" : "rgba(56, 189, 248, 0.3)"
                    }}
                  >
                    <strong>{msg.sender === "ai" ? "AI Tutor" : "Me"}</strong>
                    <p style={{ margin: "4px 0", fontSize: "0.85rem", lineHeight: "1.4" }}>{msg.text}</p>
                  </div>
                ))}
                {loading && <div style={{ color: "#38bdf8", fontSize: "0.8rem" }}>AI Tutor is researching textbooks...</div>}
              </div>

              <form onSubmit={sendMessage} style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <input
                  type="text"
                  placeholder="Ask a question (e.g. explain Newton's second law, what is mitosis?)"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  style={styles.chatInput}
                />
                <button className="primary-action" type="submit" disabled={loading}>ASK TUTOR</button>
              </form>
            </div>
          )}

          {activeMode === "practice" && (
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                </select>
                <button className="mini-action" onClick={loadPracticeTest}>RELOAD TEST</button>
              </div>

              {loading ? (
                <p>Generating diagnostic test sheet...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {questions.map((q, idx) => (
                    <div key={idx} className="feature-item" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <strong>Q{idx + 1}. {q.q}</strong>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                        {q.options.map(opt => {
                          const optionLetter = opt.charAt(0); // E.g. "A" or "B"
                          const isSelected = answers[idx] === optionLetter;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectAnswer(idx, optionLetter)}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                backgroundColor: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(0,0,0,0.3)",
                                borderColor: isSelected ? "#38bdf8" : "rgba(255,255,255,0.1)",
                                color: "#fff"
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {questions.length > 0 && !testSubmitted && (
                    <button className="primary-action submit-wide" onClick={submitTest}>SUBMIT PRACTICE TEST</button>
                  )}

                  {testSubmitted && (
                    <div className="card" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", marginTop: "12px" }}>
                      <h3>Test Evaluation & Diagnostics</h3>
                      <strong style={{ fontSize: "1.4rem", color: "#10b981" }}>Score: {testScore} / {questions.length}</strong>
                      <p style={{ margin: "6px 0", fontSize: "0.85rem" }}>
                        {testScore === questions.length ? "Excellent work! Full concept mastery achieved." : "Good try! We suggest reviewing structural formulas and values again with the AI Tutor."}
                      </p>
                      <button className="mini-action" onClick={loadPracticeTest} style={{ marginTop: "8px" }}>Try Again</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  juniorBg: {
    padding: "20px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, rgba(251, 191, 36, 0.05), rgba(16, 185, 129, 0.05))"
  },
  juniorLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "16px"
  },
  juniorStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px"
  },
  juniorStatCard: {
    padding: "16px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  },
  juniorInput: {
    flexGrow: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "2px solid #fbbf24",
    backgroundColor: "#000",
    color: "#fff",
    fontSize: "1rem",
    outline: "none"
  },
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "450px",
    justifyContent: "space-between"
  },
  chatHistory: {
    flexGrow: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)"
  },
  chatBubble: {
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: "12px",
    borderWidth: "1px",
    borderStyle: "solid"
  },
  chatInput: {
    flexGrow: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "rgba(3,7,18,0.75)",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none"
  }
};
