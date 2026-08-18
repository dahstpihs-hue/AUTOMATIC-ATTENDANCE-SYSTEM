import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import medicalBg from "../../assets/tpihs-login-medical-bg.png";

const DEPARTMENTS = [
  {
    title: "Department of Pharmaceutical Sciences",
    icon: "🧪",
    highlight: "Advanced pharmaceutical laboratory operations, chemical formulations, and compounding research. Formulating precision therapeutics for modern clinical excellence.",
    color: "linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.95))",
    borderColor: "#fbbf24"
  },
  {
    title: "Department of Nursing Sciences",
    icon: "🩺",
    highlight: "Comprehensive patient care systems, specialized clinical rotations, and emergency nursing practice. Fostering therapeutic excellence and compassion at the frontlines of clinical care.",
    color: "linear-gradient(135deg, rgba(29, 78, 216, 0.95), rgba(30, 58, 138, 0.95))",
    borderColor: "#60a5fa"
  },
  {
    title: "Department of Allied Health Sciences",
    icon: "🔬",
    highlight: "State-of-the-art training in Radiology (Medical Imaging), Medical Laboratory Technology (MLT), Dental Hygiene, and Anaesthesia Technology. Pioneering diagnostic precision and operating room support for a healthier tomorrow.",
    color: "linear-gradient(135deg, rgba(109, 40, 217, 0.95), rgba(88, 28, 135, 0.95))",
    borderColor: "#c084fc"
  }
];

export default function Login() {
  const { user, signInWithGoogle } = useAuth();
  const [loginMessage, setLoginMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [animatedText, setAnimatedText] = useState("");
  
  const nav = useNavigate();
  const fullText = "THIS PORTAL IS DEVELOPED BY MUHAMMAD FAROOQ";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index <= fullText.length) {
        setAnimatedText(fullText.substring(0, index));
      } else if (index > fullText.length + 18) {
        index = 0;
        setAnimatedText("");
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Listen to AuthContext user changes and redirect accordingly
  useEffect(() => {
    if (user) {
      setLoginMessage({
        type: "success",
        text: `Welcome ${user.name || "User"}! Logging you in...`
      });
      setIsLeaving(true);

      let dest = "/";
      if (user.role === "admin" || user.role === "coordinator" || user.role === "md" || user.role === "head") {
        dest = "/admin/dashboard";
      } else if (user.role === "teacher") {
        dest = "/teacher/dashboard";
      } else if (user.role === "student" && user.studentId) {
        dest = `/student/${user.studentId}/overview`;
      } else if (user.role === "parent") {
        dest = "/parent";
      }

      setTimeout(() => {
        nav(dest);
        window.location.reload();
      }, 1200);
    }
  }, [user, nav]);

  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    setLoginMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setLoginMessage({
        type: "error",
        text: err.message || "Google Authentication failed. Please try again."
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`landing-container ${isLeaving ? "leaving-transition" : ""}`} style={styles.container}>
      
      <style>{`
        @keyframes swing {
          0% { transform: rotate(0.8deg); }
          100% { transform: rotate(-0.8deg); }
        }
        @keyframes colorCycle {
          0% { color: #2dd4bf; text-shadow: 0 0 6px #2dd4bf; }
          25% { color: #38bdf8; text-shadow: 0 0 6px #38bdf8; }
          50% { color: #a855f7; text-shadow: 0 0 6px #a855f7; }
          75% { color: #f472b6; text-shadow: 0 0 6px #f472b6; }
          100% { color: #2dd4bf; text-shadow: 0 0 6px #2dd4bf; }
        }

        .hanging-card-0 {
          animation: swing 3s ease-in-out infinite alternate;
          transform-origin: top center;
          background: rgba(15, 23, 42, 0.85) !important;
          border: 2px solid #fbbf24 !important;
          box-shadow: 0 0 10px #fbbf24, 0 0 25px rgba(245, 158, 11, 0.65), inset 0 0 12px rgba(245, 158, 11, 0.3) !important;
          backdrop-filter: blur(12px);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease !important;
        }
        .hanging-card-0 h3 {
          color: #fbbf24 !important;
          text-shadow: 0 0 8px rgba(251, 191, 36, 0.95) !important;
        }
        .hanging-card-0:hover {
          transform: translateY(-8px) scale(1.03) !important;
          box-shadow: 0 0 16px #fbbf24, 0 0 36px rgba(245, 158, 11, 0.9), inset 0 0 16px rgba(245, 158, 11, 0.5) !important;
          border-color: #ffe066 !important;
        }

        .hanging-card-1 {
          animation: swing 3.5s ease-in-out infinite alternate-reverse;
          transform-origin: top center;
          background: rgba(15, 23, 42, 0.85) !important;
          border: 2px solid #38bdf8 !important;
          box-shadow: 0 0 10px #38bdf8, 0 0 25px rgba(56, 189, 248, 0.65), inset 0 0 12px rgba(56, 189, 248, 0.3) !important;
          backdrop-filter: blur(12px);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease !important;
        }
        .hanging-card-1 h3 {
          color: #38bdf8 !important;
          text-shadow: 0 0 8px rgba(56, 189, 248, 0.95) !important;
        }
        .hanging-card-1:hover {
          transform: translateY(-8px) scale(1.03) !important;
          box-shadow: 0 0 16px #38bdf8, 0 0 36px rgba(56, 189, 248, 0.9), inset 0 0 16px rgba(56, 189, 248, 0.5) !important;
          border-color: #7dd3fc !important;
        }

        .hanging-card-2 {
          animation: swing 2.8s ease-in-out infinite alternate;
          transform-origin: top center;
          background: rgba(15, 23, 42, 0.85) !important;
          border: 2px solid #c084fc !important;
          box-shadow: 0 0 10px #c084fc, 0 0 25px rgba(168, 85, 247, 0.65), inset 0 0 12px rgba(168, 85, 247, 0.3) !important;
          backdrop-filter: blur(12px);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease !important;
        }
        .hanging-card-2 h3 {
          color: #c084fc !important;
          text-shadow: 0 0 8px rgba(192, 132, 252, 0.95) !important;
        }
        .hanging-card-2:hover {
          transform: translateY(-8px) scale(1.03) !important;
          box-shadow: 0 0 16px #c084fc, 0 0 36px rgba(168, 85, 247, 0.9), inset 0 0 16px rgba(168, 85, 247, 0.5) !important;
          border-color: #d8b4fe !important;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 20px;
          border-radius: 8px;
          border: 2px solid #38bdf8;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          color: #fff;
          font-weight: 800;
          font-size: 1.05rem;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
          transition: all 0.3s ease;
        }
        .google-btn:hover {
          background: linear-gradient(135deg, #0284c7 0%, #0d9488 50%, #6d28d9 100%);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
          transform: translateY(-2px);
        }
        .google-btn:active {
          transform: translateY(1px);
        }

        @media (max-width: 860px) {
          .responsive-row {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .hanging-card-0, .hanging-card-1, .hanging-card-2 {
            animation: none !important;
            margin-top: 4px !important;
          }
          .wire-link, .main-wire, .ind-wire {
            display: none !important;
          }
          .viewport-fit {
            height: auto !important;
            overflow-y: auto !important;
          }
          .login-card-wrapper {
            padding: 20px 24px !important;
          }
        }
      `}</style>
      
      {/* Top Main Wire decoration */}
      <div className="main-wire" style={styles.mainWire} />

      {/* DEEP DARK RED-BROWN GLOWING HEADER */}
      <header style={styles.header}>
        <div style={styles.glowingBox}>
          <h1 style={styles.headerTitle}>THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES (TPIHS) MARDAN</h1>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgePulse} />
          Official Management & AI Learning Portal
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="viewport-fit" style={styles.mainContent}>
        
        {/* RESPONSIVE HANGING DIVISION CARDS */}
        <div className="responsive-row" style={styles.cardsRow}>
          {DEPARTMENTS.map((dept, idx) => (
            <div key={idx} style={styles.deptCard} className={`hanging-card-${idx} hover-lift`}>
              {/* Individual hanger wire */}
              <div className="ind-wire" style={styles.individualWire} />
              
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{dept.icon}</span>
                <h3 style={styles.cardTitle}>{dept.title}</h3>
              </div>
              <p style={styles.cardHighlight}>{dept.highlight}</p>
            </div>
          ))}
        </div>

        {/* PORTAL ACCESS WIRE LINK */}
        <div className="wire-link" style={styles.loginWireLink} />

        {/* CENTRAL LOGIN BOX (Google OAuth Only) */}
        <div className="login-card-wrapper" style={styles.loginWrapper}>
          <div style={styles.loginHeader}>
            <h2 style={styles.loginTitle}>PORTAL ACCESS</h2>
            <p style={styles.loginSubtitle}>Sign in securely using your official Google Account</p>
          </div>

          <div style={styles.loginForm}>
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="google-btn"
              id="google-login-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              {isSubmitting ? "Redirecting to Google..." : "Continue with Gmail"}
            </button>

            {loginMessage && (
              <div style={{
                ...styles.messageBanner,
                borderColor: loginMessage.type === "success" ? "#10b981" : "#ef4444",
                color: loginMessage.type === "success" ? "#a7f3d0" : "#fca5a5",
                marginTop: "12px"
              }}>
                {loginMessage.text}
              </div>
            )}

            <div style={styles.alertBox}>
              <span style={{ fontSize: "1.1rem" }}>⚠️</span>
              <span>
                <strong>Access Note:</strong> Only registered Gmail IDs are permitted access. If your account is not linked yet, please coordinate with the Academic HOD.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <footer style={styles.footer}>
        <div className="footer-zoom" style={styles.footerGlowContainer}>
          <span style={styles.glowingText}>
            {animatedText.split("").map((char, idx) => (
              <span key={idx} className="letter-glow" style={{ animationDelay: `${idx * 0.08}s` }}>
                {char}
              </span>
            ))}
            <span className="pulsing-cursor" style={styles.cursor}>|</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: `url(${medicalBg}) no-repeat`,
    backgroundSize: "100% 100%",
    color: "#f3f4f6",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    overflow: "hidden",
    position: "relative",
    padding: "12px 24px"
  },
  mainWire: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "80%",
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6) 20%, rgba(45, 212, 191, 0.8) 50%, rgba(192, 132, 252, 0.6) 80%, transparent)",
    zIndex: 1
  },
  header: {
    textAlign: "center",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    marginTop: "8px",
    width: "100%"
  },
  glowingBox: {
    background: "#3A110E", // Fully dark red-brown colored box
    border: "2px solid #fbbf24", // Golden / Yellow border
    borderRadius: "10px",
    padding: "12px 28px",
    boxShadow: "0 6px 20px rgba(58, 17, 14, 0.8), 0 0 15px rgba(250, 204, 21, 0.5), inset 0 0 10px rgba(250, 204, 21, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "95%",
    maxWidth: "1200px",
    margin: "0 auto 4px auto",
    boxSizing: "border-box"
  },
  headerTitle: {
    fontSize: "clamp(1.2rem, 2.5vw, 2.2rem)",
    fontWeight: "900",
    letterSpacing: "1px",
    color: "#fbbf24",
    margin: 0,
    textTransform: "uppercase",
    textAlign: "center",
    textShadow: "0 0 10px rgba(250, 204, 21, 0.6)"
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.72rem",
    color: "#e5e7eb",
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    padding: "2px 8px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
  },
  badgePulse: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#2dd4bf",
    boxShadow: "0 0 8px #2dd4bf"
  },
  mainContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    gap: "4px",
    zIndex: 2
  },
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "24px",
    width: "95%",
    maxWidth: "1200px",
    position: "relative"
  },
  individualWire: {
    position: "absolute",
    top: "-24px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "2px",
    height: "24px",
    background: "rgba(255, 255, 255, 0.4)"
  },
  deptCard: {
    borderRadius: "12px",
    padding: "16px 20px",
    position: "relative",
    boxShadow: "0 12px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.25)",
    color: "#fff",
    marginTop: "20px"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px"
  },
  cardIcon: {
    fontSize: "1.6rem"
  },
  cardTitle: {
    fontSize: "1.05rem",
    fontWeight: "900",
    margin: 0,
    textShadow: "1px 1px 3px rgba(0,0,0,0.5)"
  },
  cardHighlight: {
    fontSize: "0.85rem",
    color: "#f3f4f6",
    margin: 0,
    lineHeight: "1.45",
    textShadow: "1px 1px 2px rgba(0,0,0,0.4)"
  },
  loginWireLink: {
    width: "2px",
    height: "12px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(56, 189, 248, 0.6))"
  },
  loginWrapper: {
    width: "95%",
    maxWidth: "520px",
    background: "rgba(3, 7, 18, 0.88)",
    backdropFilter: "blur(12px)",
    borderRadius: "14px",
    border: "2px solid rgba(56, 189, 248, 0.35)",
    boxShadow: "0 15px 40px rgba(0, 0, 0, 0.7)",
    padding: "32px"
  },
  loginHeader: {
    textAlign: "center",
    marginBottom: "24px"
  },
  loginTitle: {
    fontSize: "1.5rem",
    fontWeight: "900",
    margin: 0,
    color: "#fff",
    letterSpacing: "1.5px"
  },
  loginSubtitle: {
    fontSize: "0.92rem",
    color: "#9ca3af",
    margin: "8px 0 0 0",
    lineHeight: "1.4"
  },
  loginForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  alertBox: {
    display: "flex",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    fontSize: "0.82rem",
    color: "#fca5a5",
    lineHeight: "1.45",
    marginTop: "8px"
  },
  messageBanner: {
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: "1px",
    borderStyle: "solid",
    textAlign: "center"
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    height: "48px",
    marginBottom: "12px"
  },
  footerGlowContainer: {
    backgroundColor: "rgba(3, 7, 18, 0.9)",
    padding: "8px 24px",
    borderRadius: "25px",
    border: "2px solid rgba(45, 212, 191, 0.45)",
    boxShadow: "0 0 15px rgba(45, 212, 191, 0.3)"
  },
  glowingText: {
    fontSize: "1.1rem",
    fontWeight: "900",
    letterSpacing: "2px",
    color: "#2dd4bf",
    textShadow: "0 0 10px rgba(45, 212, 191, 0.8), 0 0 20px rgba(45, 212, 191, 0.4)"
  },
  cursor: {
    animation: "blink 1s step-end infinite",
    marginLeft: "2px",
    fontWeight: "900",
    fontSize: "1.1rem"
  }
};
