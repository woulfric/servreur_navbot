import { useState, useEffect, useRef } from "react";

const GRID_COLS = 28;
const GRID_ROWS = 18;

function MapGrid() {
  const [cells, setCells] = useState(() =>
    Array.from({ length: GRID_COLS * GRID_ROWS }, () => ({
      active: Math.random() < 0.18,
      brightness: Math.random(),
    }))
  );
  const [robotPos, setRobotPos] = useState({ x: 4, y: 4 });
  const [trail, setTrail] = useState([]);
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCells((prev) =>
        prev.map((c) => ({
          ...c,
          brightness: Math.random() < 0.05 ? Math.random() : c.brightness * 0.98 + Math.random() * 0.02,
        }))
      );
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const move = setInterval(() => {
      setRobotPos((prev) => {
        const nx = Math.max(1, Math.min(GRID_COLS - 2, prev.x + (Math.random() > 0.5 ? 1 : -1)));
        const ny = Math.max(1, Math.min(GRID_ROWS - 2, prev.y + (Math.random() > 0.5 ? 1 : -1)));
        setTrail((t) => [...t.slice(-14), { x: prev.x, y: prev.y }]);
        return { x: nx, y: ny };
      });
    }, 420);
    return () => clearInterval(move);
  }, []);

  useEffect(() => {
    const scan = setInterval(() => {
      setScanLine((s) => (s + 1) % GRID_ROWS);
    }, 60);
    return () => clearInterval(scan);
  }, []);

  const cellW = 100 / GRID_COLS;
  const cellH = 100 / GRID_ROWS;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {Array.from({ length: GRID_ROWS }, (_, row) =>
        Array.from({ length: GRID_COLS }, (_, col) => {
          const idx = row * GRID_COLS + col;
          const cell = cells[idx];
          const isRobot = robotPos.x === col && robotPos.y === row;
          const trailIdx = trail.findIndex((t) => t.x === col && t.y === row);
          const isTrail = trailIdx !== -1;
          const isScan = row === scanLine;
          let bg = "transparent";
          if (isRobot) bg = "rgba(8,31,92,0.9)";
          else if (isTrail) bg = `rgba(84,111,168,${0.15 + (trailIdx / trail.length) * 0.25})`;
          else if (cell.active) bg = `rgba(36,56,110,${0.12 + cell.brightness * 0.2})`;
          else if (isScan) bg = "rgba(212,235,255,0.04)";
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${col * cellW}%`,
                top: `${row * cellH}%`,
                width: `${cellW}%`,
                height: `${cellH}%`,
                background: bg,
                border: isRobot ? "1px solid rgba(84,111,168,0.8)" : isTrail ? "1px solid rgba(84,111,168,0.2)" : "none",
                borderRadius: isRobot ? "3px" : "0",
                transition: isRobot ? "none" : "background 0.3s",
                zIndex: isRobot ? 3 : isTrail ? 2 : 1,
              }}
            >
              {isRobot && (
                <div style={{
                  position: "absolute", inset: "20%",
                  background: "rgba(212,235,255,0.9)",
                  borderRadius: "50%",
                  boxShadow: "0 0 6px rgba(212,235,255,0.6)",
                }} />
              )}
            </div>
          );
        })
      )}
      {/* Grid lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}>
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <line key={`v${i}`} x1={`${(i / GRID_COLS) * 100}%`} y1="0" x2={`${(i / GRID_COLS) * 100}%`} y2="100%" stroke="#546FA8" strokeWidth="0.5" />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={`${(i / GRID_ROWS) * 100}%`} x2="100%" y2={`${(i / GRID_ROWS) * 100}%`} stroke="#546FA8" strokeWidth="0.5" />
        ))}
      </svg>
    </div>
  );
}

function NavBotLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#081F5C" />
          <stop offset="100%" stopColor="#546FA8" />
        </linearGradient>
      </defs>
      <path d="M10 10 L10 42 L18 42 L18 26 L34 42 L42 42 L42 10 L34 10 L34 26 L18 10 Z" fill="url(#lg)" />
      <rect x="30" y="4" width="14" height="10" rx="5" fill="url(#lg)" />
      <circle cx="34" cy="9" r="2" fill="white" opacity="0.9" />
      <circle cx="40" cy="9" r="2" fill="white" opacity="0.9" />
    </svg>
  );
}

export default function NavBotLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState(null);
  const [dots, setDots] = useState("");

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(i);
  }, [loading]);

  const handleSubmit = () => {
    if (!email || !password) return;
    setLoading(true);
    setStatus(null);
    setTimeout(() => {
      setLoading(false);
      setStatus("success");
    }, 2200);
  };

  const inputStyle = (field) => ({
    width: "100%",
    background: focused === field ? "rgba(212,235,255,0.08)" : "rgba(8,31,92,0.3)",
    border: `1px solid ${focused === field ? "rgba(84,111,168,0.7)" : "rgba(84,111,168,0.2)"}`,
    borderRadius: "10px",
    padding: "14px 16px",
    color: "#FCFDFF",
    fontSize: "14px",
    fontFamily: "'DM Sans', 'Nunito', sans-serif",
    outline: "none",
    transition: "all 0.25s",
    boxSizing: "border-box",
    boxShadow: focused === field ? "0 0 0 3px rgba(84,111,168,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020818",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Nunito', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated map background */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
        <MapGrid />
      </div>

      {/* Radial glow center */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(36,56,110,0.35) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Corner accent top-left */}
      <div style={{
        position: "absolute", top: 24, left: 24,
        display: "flex", alignItems: "center", gap: 10,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateX(-16px)",
        transition: "all 0.7s cubic-bezier(.4,0,.2,1)",
      }}>
        <NavBotLogo />
        <div>
          <div style={{ color: "#FCFDFF", fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>NAVBOT</div>
          <div style={{ color: "#546FA8", fontSize: 11, letterSpacing: 1.5 }}>NAVIGATION AUTONOME</div>
        </div>
      </div>

      {/* Status indicator top-right */}
      <div style={{
        position: "absolute", top: 30, right: 28,
        display: "flex", alignItems: "center", gap: 7,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.7s 0.3s",
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#22C55E",
          boxShadow: "0 0 8px #22C55E",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <span style={{ color: "#546FA8", fontSize: 11, letterSpacing: 1.5 }}>SYSTÈME EN LIGNE</span>
      </div>

      {/* Main card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 420,
        margin: "0 16px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(28px)",
        transition: "all 0.8s cubic-bezier(.4,0,.2,1) 0.15s",
      }}>
        {/* Card glass */}
        <div style={{
          background: "rgba(6,14,40,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(84,111,168,0.25)",
          borderRadius: 20,
          padding: "40px 36px 36px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(84,111,168,0.08) inset, 0 1px 0 rgba(212,235,255,0.06) inset",
        }}>
          {/* Top tag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(84,111,168,0.12)",
            border: "1px solid rgba(84,111,168,0.25)",
            borderRadius: 20, padding: "4px 12px",
            marginBottom: 24,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4EBFF", opacity: 0.8 }} />
            <span style={{ color: "#D4EBFF", fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>INTERFACE DE CONTRÔLE</span>
          </div>

          <h1 style={{
            color: "#FCFDFF", fontSize: 28, fontWeight: 800,
            margin: "0 0 6px", lineHeight: 1.2,
            letterSpacing: -0.5,
          }}>
            Connexion
          </h1>
          <p style={{ color: "#546FA8", fontSize: 14, margin: "0 0 32px", lineHeight: 1.5 }}>
            Accédez à votre espace de supervision NavBot
          </p>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: "block", color: "#D4EBFF", fontSize: 12, fontWeight: 600, marginBottom: 7, letterSpacing: 1 }}>
                IDENTIFIANT
              </label>
              <input
                type="email"
                placeholder="operateur@navbot.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                style={inputStyle("email")}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", color: "#D4EBFF", fontSize: 12, fontWeight: 600, marginBottom: 7, letterSpacing: 1 }}>
                MOT DE PASSE
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  style={{ ...inputStyle("pass"), paddingRight: 48 }}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: "#546FA8", cursor: "pointer", padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: "1px solid rgba(84,111,168,0.4)",
                  background: "rgba(84,111,168,0.1)",
                }} />
                <span style={{ color: "#546FA8", fontSize: 13 }}>Rester connecté</span>
              </label>
              <span style={{ color: "#546FA8", fontSize: 13, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(84,111,168,0.3)" }}>
                Mot de passe oublié ?
              </span>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              style={{
                width: "100%", padding: "15px",
                background: loading || !email || !password
                  ? "rgba(36,56,110,0.4)"
                  : "linear-gradient(135deg, #081F5C 0%, #24386E 50%, #546FA8 100%)",
                border: "1px solid rgba(84,111,168,0.4)",
                borderRadius: 10,
                color: loading || !email || !password ? "#546FA8" : "#FCFDFF",
                fontSize: 14, fontWeight: 700,
                letterSpacing: 2,
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                transition: "all 0.25s",
                marginTop: 4,
                position: "relative",
                overflow: "hidden",
                fontFamily: "'DM Sans', 'Nunito', sans-serif",
              }}
            >
              {status === "success" ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  ACCÈS AUTORISÉ
                </span>
              ) : loading ? (
                `AUTHENTIFICATION${dots}`
              ) : (
                "ACCÉDER AU SYSTÈME"
              )}
            </button>

            {/* Status success */}
            {status === "success" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 10, padding: "12px 16px",
                animation: "fadeIn 0.4s ease",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E", flexShrink: 0 }} />
                <span style={{ color: "#22C55E", fontSize: 13 }}>Connexion réussie — Redirection vers le dashboard…</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 24px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(84,111,168,0.15)" }} />
            <span style={{ color: "#546FA8", fontSize: 12, whiteSpace: "nowrap" }}>ACCÈS SÉCURISÉ</span>
            <div style={{ flex: 1, height: 1, background: "rgba(84,111,168,0.15)" }} />
          </div>

          {/* Security badges */}
          {/* <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
            {[
              { icon: "🔒", label: "TLS 1.3" },
              { icon: "🛡", label: "ROS 2" },
              { icon: "📡", label: "Temps réel" },
            ].map((b) => (
              <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 18 }}>{b.icon}</span>
                <span style={{ color: "#546FA8", fontSize: 10, letterSpacing: 1 }}>{b.label}</span>
              </div>
            ))}
          </div> */}
        </div>

        {/* Bottom info */}
        <p style={{ textAlign: "center", color: "rgba(84,111,168,0.5)", fontSize: 12, marginTop: 20, letterSpacing: 0.5 }}>
          NavBot v2.4.1 · Projet Navigation Autonome
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: rgba(84,111,168,0.5); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #060e28 inset !important;
          -webkit-text-fill-color: #FCFDFF !important;
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
