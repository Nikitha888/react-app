import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TOTAL_LEVELS = 3;
const ATTEMPTS_PER_LEVEL = 10;
const TIMER_PER_LEVEL = 40; // seconds

const LEVEL_CONFIG = [
  { speed: 2800, label: "Easy 🌸",   color: "#a8d8ea" },
  { speed: 2000, label: "Medium 🌼", color: "#f9e4b7" },
  { speed: 1300, label: "Hard 🌻",   color: "#f4a7b9" },
];

const CAT_EMOJIS = ["🐱", "😺", "🐈", "😸"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

// ─── STAR COMPONENT ──────────────────────────────────────────────────────────
function Star({ delay = 0, size = 80 }) {
  return (
    <span style={{
      fontSize: size,
      display: "inline-block",
      animation: `starPop 0.6s ${delay}s cubic-bezier(.36,1.6,.6,1) both`,
    }}>⭐</span>
  );
}

// ─── SCREEN TIME GRAPH ───────────────────────────────────────────────────────
function ScreenTimeGraph({ sessions }) {
  if (!sessions.length) return (
    <div style={{ textAlign: "center", color: "#888", padding: "20px 0", fontSize: 15 }}>
      No sessions recorded yet. Play some rounds!
    </div>
  );

  const maxTime = Math.max(...sessions.map(s => s.duration), 60);
  const barW = Math.min(60, Math.floor(560 / sessions.length) - 8);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <svg width={Math.max(580, sessions.length * (barW + 8) + 60)} height={200} style={{ display: "block", margin: "0 auto" }}>
        {/* Y-axis label */}
        <text x={10} y={20} fontSize={11} fill="#aaa">sec</text>
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={40} x2="98%" y1={160 - f * 140} y2={160 - f * 140}
            stroke="#e0d6f5" strokeWidth={1} strokeDasharray="4 3" />
        ))}
        {/* Bars */}
        {sessions.map((s, i) => {
          const h = Math.max(6, (s.duration / maxTime) * 140);
          const x = 40 + i * (barW + 8);
          const color = s.result === "win" ? "#84c9a0" : s.result === "lose" ? "#f4a7b9" : "#a8d8ea";
          return (
            <g key={i}>
              <rect x={x} y={160 - h} width={barW} height={h}
                rx={6} fill={color} opacity={0.85} />
              <text x={x + barW / 2} y={175} textAnchor="middle"
                fontSize={10} fill="#666">{`S${i + 1}`}</text>
              <text x={x + barW / 2} y={160 - h - 5} textAnchor="middle"
                fontSize={10} fill="#555">{s.duration}s</text>
            </g>
          );
        })}
        {/* X axis */}
        <line x1={40} y1={160} x2="98%" y2={160} stroke="#ccc" strokeWidth={1.5} />
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6, fontSize: 12 }}>
        {[["#84c9a0", "Win"], ["#f4a7b9", "Lose"], ["#a8d8ea", "Quit"]].map(([c, l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // screens: "home" | "playing" | "levelWin" | "gameOver" | "finalWin" | "stats"
  const [screen, setScreen] = useState("home");
  const [level, setLevel]   = useState(0);        // 0-indexed
  const [catches, setCatches]   = useState(0);    // catches this level
  const [misses, setMisses]     = useState(0);    // misses = timed-out
  const [timeLeft, setTimeLeft] = useState(TIMER_PER_LEVEL);
  const [catPos,   setCatPos]   = useState({ x: 50, y: 50 });
  const [catEmoji, setCatEmoji] = useState("🐱");
  const [score, setScore]       = useState(0);    // total catches across all levels
  const [sessions, setSessions] = useState([]);   // screen-time log
  const [sessionStart, setSessionStart] = useState(null);
  const [showGraph, setShowGraph] = useState(false);

  const areaRef   = useRef(null);
  const timerRef  = useRef(null);
  const catMoveRef = useRef(null);
  const sessionStartRef = useRef(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  // ── Place cat randomly ──
  const placeCat = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const W = area.clientWidth  - 72;
    const H = area.clientHeight - 72;
    setCatPos({ x: rand(8, W), y: rand(8, H) });
    setCatEmoji(CAT_EMOJIS[rand(0, CAT_EMOJIS.length)]);
  }, []);

  // ── Start level ──
  const startLevel = useCallback((lvl) => {
    setLevel(lvl);
    setCatches(0);
    setMisses(0);
    setTimeLeft(TIMER_PER_LEVEL);
    setScreen("playing");
    setTimeout(placeCat, 100);
  }, [placeCat]);

  // ── Start game ──
  const startGame = () => {
    setScore(0);
    scoreRef.current = 0;
    sessionStartRef.current = Date.now();
    setSessionStart(Date.now());
    startLevel(0);
  };

  // ── Cat movement timer ──
  useEffect(() => {
    if (screen !== "playing") return;
    clearInterval(catMoveRef.current);
    const speed = LEVEL_CONFIG[level].speed;
    catMoveRef.current = setInterval(placeCat, speed);
    return () => clearInterval(catMoveRef.current);
  }, [screen, level, placeCat]);

  // ── Countdown timer ──
  useEffect(() => {
    if (screen !== "playing") return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // time ran out → lose
          recordSession("lose");
          setScreen("gameOver");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, level]);

  // ── Catch handler ──
  const handleCatch = () => {
    const newCatches = catches + 1;
    const newScore   = scoreRef.current + 1;
    setScore(newScore);
    scoreRef.current = newScore;
    setCatches(newCatches);
    placeCat();

    if (newCatches >= ATTEMPTS_PER_LEVEL) {
      clearInterval(timerRef.current);
      clearInterval(catMoveRef.current);
      if (level + 1 >= TOTAL_LEVELS) {
        recordSession("win");
        setScreen("finalWin");
      } else {
        setScreen("levelWin");
      }
    }
  };

  // ── Miss (click on area but not cat) ──
  const handleAreaClick = (e) => {
    if (e.target.id === "cat") return;
    setMisses(m => m + 1);
  };

  const recordSession = (result) => {
    const duration = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000);
    setSessions(prev => [...prev, { duration, result, level: level + 1 }]);
  };

  const nextLevel = () => startLevel(level + 1);

  const goHome = () => {
    clearInterval(timerRef.current);
    clearInterval(catMoveRef.current);
    setScreen("home");
  };

  // ── Accuracy % ──
  const accuracy = catches + misses > 0
    ? Math.round((catches / (catches + misses)) * 100)
    : 0;

  // ── Total session time ──
  const totalTime = sessions.reduce((a, s) => a + s.duration, 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Baloo+2:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Nunito', sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #e8f4fd 0%, #d4eaf7 30%, #ede7f6 70%, #fce4ec 100%);
          overflow-x: hidden;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 40px;
          position: relative;
        }

        /* Soft floating bubbles in bg */
        .bubble {
          position: fixed;
          border-radius: 50%;
          opacity: 0.18;
          animation: floatBubble linear infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes floatBubble {
          0%   { transform: translateY(110vh) scale(0.8); }
          100% { transform: translateY(-20vh) scale(1.1); }
        }

        /* ── TITLE ── */
        .title {
          font-family: 'Baloo 2', cursive;
          font-size: clamp(36px, 8vw, 64px);
          font-weight: 800;
          background: linear-gradient(135deg, #6ec6f5, #a78bfa, #f9a8d4, #fbbf24);
          background-size: 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: titleShine 4s linear infinite;
          letter-spacing: 2px;
          position: relative;
          z-index: 1;
          margin-bottom: 4px;
        }
        @keyframes titleShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        .subtitle {
          color: #888;
          font-size: 15px;
          margin-bottom: 24px;
          letter-spacing: 1px;
          z-index: 1;
          position: relative;
        }

        /* ── CARD ── */
        .card {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(18px);
          border-radius: 28px;
          padding: 28px 28px;
          box-shadow: 0 8px 40px rgba(100,120,180,0.12);
          border: 1.5px solid rgba(255,255,255,0.9);
          width: 100%;
          max-width: 660px;
          position: relative;
          z-index: 1;
        }

        /* ── HUD ── */
        .hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .hud-pill {
          background: rgba(255,255,255,0.85);
          border-radius: 50px;
          padding: 7px 18px;
          font-size: 15px;
          font-weight: 700;
          color: #555;
          border: 1.5px solid rgba(200,200,220,0.5);
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }
        .hud-pill span { font-size: 18px; }

        /* ── LEVEL BADGE ── */
        .level-badge {
          text-align: center;
          font-family: 'Baloo 2', cursive;
          font-size: 22px;
          font-weight: 800;
          color: #6c63ff;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }

        /* ── PROGRESS BAR ── */
        .prog-wrap {
          background: #ede9fe;
          border-radius: 20px;
          height: 18px;
          margin-bottom: 14px;
          overflow: hidden;
        }
        .prog-fill {
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(90deg, #a78bfa, #60a5fa);
          transition: width 0.3s ease;
        }

        /* ── GAME AREA ── */
        .game-area {
          width: 100%;
          height: 300px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(232,244,253,0.9), rgba(237,231,246,0.9));
          border: 2.5px dashed rgba(167,139,250,0.4);
          position: relative;
          overflow: hidden;
          cursor: crosshair;
          box-shadow: inset 0 4px 20px rgba(167,139,250,0.1);
        }

        /* ── CAT ── */
        .cat-btn {
          position: absolute;
          font-size: 60px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: left 0.25s ease-out, top 0.25s ease-out;
          animation: catWiggle 0.5s ease;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
          z-index: 5;
        }
        .cat-btn:hover { transform: scale(1.15); }
        .cat-btn:active { transform: scale(0.9); }
        @keyframes catWiggle {
          0%   { transform: scale(0) rotate(-10deg); }
          60%  { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }

        /* ── TIMER COLOR ── */
        .time-danger { color: #ef4444 !important; animation: pulse 0.6s infinite alternate; }
        @keyframes pulse { to { opacity: 0.5; } }

        /* ── BUTTONS ── */
        .btn {
          font-family: 'Baloo 2', cursive;
          font-size: 18px;
          font-weight: 700;
          padding: 13px 32px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.5px;
        }
        .btn:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .btn:active { transform: translateY(0); }

        .btn-primary   { background: linear-gradient(135deg, #a78bfa, #60a5fa); color: white; }
        .btn-success   { background: linear-gradient(135deg, #6ee7b7, #34d399); color: white; }
        .btn-secondary { background: rgba(200,200,220,0.4); color: #555; }
        .btn-danger    { background: linear-gradient(135deg, #fca5a5, #f87171); color: white; }

        /* ── OVERLAY SCREEN ── */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(240,235,255,0.96);
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          gap: 20px;
          text-align: center;
          padding: 24px;
          animation: fadeIn 0.35s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } }

        .overlay h1 {
          font-family: 'Baloo 2', cursive;
          font-size: clamp(28px, 6vw, 52px);
          font-weight: 800;
        }
        .overlay p { font-size: 18px; color: #666; }

        /* ── STARS ── */
        @keyframes starPop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          70%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        /* ── STATS ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin: 16px 0;
        }
        .stat-box {
          background: rgba(255,255,255,0.8);
          border-radius: 16px;
          padding: 14px 10px;
          text-align: center;
          border: 1.5px solid rgba(200,200,220,0.4);
        }
        .stat-box .val {
          font-family: 'Baloo 2', cursive;
          font-size: 28px;
          font-weight: 800;
          color: #6c63ff;
        }
        .stat-box .lbl { font-size: 12px; color: #999; margin-top: 2px; }

        /* ── HOME SCREEN ── */
        .home-cats {
          font-size: 48px;
          letter-spacing: 12px;
          animation: bounce 1.5s ease-in-out infinite alternate;
          margin: 10px 0 24px;
        }
        @keyframes bounce {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-12px); }
        }

        .level-cards {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 16px 0;
          flex-wrap: wrap;
        }
        .level-card {
          background: rgba(255,255,255,0.7);
          border-radius: 16px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          color: #666;
          border: 1.5px solid rgba(200,200,220,0.5);
          text-align: center;
        }
        .level-card .lc-title { font-size: 17px; color: #6c63ff; font-family: 'Baloo 2', cursive; }

        /* ── ACCESSIBILITY ── */
        .access-note {
          background: rgba(232,244,253,0.8);
          border-radius: 16px;
          padding: 12px 18px;
          font-size: 13px;
          color: #5599bb;
          margin-top: 14px;
          line-height: 1.7;
          border-left: 4px solid #a8d8ea;
        }

        .screen-time-banner {
          text-align: center;
          font-size: 13px;
          color: #aaa;
          margin-top: 10px;
        }

        @media (max-width: 480px) {
          .game-area { height: 240px; }
          .cat-btn   { font-size: 48px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* ── Background bubbles ── */}
      {[
        { size: 120, left: "5%",  dur: 18, delay: 0,  color: "#a8d8ea" },
        { size: 80,  left: "20%", dur: 14, delay: 3,  color: "#c3aef0" },
        { size: 160, left: "55%", dur: 22, delay: 1,  color: "#f9c8d9" },
        { size: 60,  left: "75%", dur: 12, delay: 5,  color: "#b5e8c8" },
        { size: 100, left: "88%", dur: 17, delay: 2,  color: "#fce4b8" },
        { size: 50,  left: "40%", dur: 10, delay: 7,  color: "#a8d8ea" },
      ].map((b, i) => (
        <div key={i} className="bubble" style={{
          width: b.size, height: b.size,
          left: b.left, bottom: "-20%",
          background: b.color,
          animationDuration: `${b.dur}s`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}

      <div className="app">
        {/* ══════════ HOME SCREEN ══════════ */}
        {screen === "home" && (
          <>
            <h1 className="title">🐱 Catch The Cat! 🎮</h1>
            <p className="subtitle">A fun eye-hand coordination game</p>

            <div className="card">
              <div className="home-cats">🐱 😺 🐈</div>

              <div className="level-cards">
                {LEVEL_CONFIG.map((lc, i) => (
                  <div className="level-card" key={i}>
                    <div className="lc-title">Level {i + 1}</div>
                    <div>{lc.label}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>10 catches</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", marginTop: 20 }}>
                <button className="btn btn-primary" onClick={startGame} style={{ width: 220 }}>
                  🚀 Start Game
                </button>
                {sessions.length > 0 && (
                  <button className="btn btn-secondary" onClick={() => setScreen("stats")} style={{ width: 220 }}>
                    📊 My Progress
                  </button>
                )}
              </div>

              <div className="access-note">
                🌟 <b>Tap the cat</b> each time it appears! <br />
                🎯 Catch <b>10 cats</b> in each level to move forward. <br />
                ⏱ You have <b>40 seconds</b> per level. Take your time!
              </div>
            </div>
          </>
        )}

        {/* ══════════ PLAYING SCREEN ══════════ */}
        {screen === "playing" && (
          <>
            <h1 className="title">🐱 Catch The Cat!</h1>

            <div className="card">
              {/* HUD */}
              <div className="hud">
                <div className="hud-pill">
                  <span>🎯</span> {catches} / {ATTEMPTS_PER_LEVEL}
                </div>
                <div className="level-badge">
                  Level {level + 1} — {LEVEL_CONFIG[level].label}
                </div>
                <div className={`hud-pill ${timeLeft <= 10 ? "time-danger" : ""}`}>
                  <span>⏱</span> {timeLeft}s
                </div>
              </div>

              {/* Progress bar */}
              <div className="prog-wrap">
                <div className="prog-fill" style={{ width: `${(catches / ATTEMPTS_PER_LEVEL) * 100}%` }} />
              </div>

              {/* Score pill */}
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <span className="hud-pill" style={{ fontSize: 13 }}>
                  🏆 Total Score: {score}
                </span>
              </div>

              {/* Game Area */}
              <div className="game-area" ref={areaRef} onClick={handleAreaClick}>
                <button
                  id="cat"
                  className="cat-btn"
                  onClick={handleCatch}
                  style={{ left: catPos.x, top: catPos.y }}
                  aria-label="Catch the cat!"
                >
                  {catEmoji}
                </button>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => { recordSession("quit"); goHome(); }}>
                  🏠 Home
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════ LEVEL WIN SCREEN ══════════ */}
        {screen === "levelWin" && (
          <div className="overlay">
            <div style={{ fontSize: 80 }}>🎉</div>
            <h1 style={{ color: "#6c63ff" }}>Level {level + 1} Complete!</h1>
            <p>Amazing work! You caught all 10 cats! 🐱</p>
            <p style={{ fontSize: 15 }}>Score so far: <b>{score}</b></p>
            <button className="btn btn-success" onClick={nextLevel}>
              ➡️ Level {level + 2} — {LEVEL_CONFIG[level + 1]?.label}
            </button>
            <button className="btn btn-secondary" onClick={goHome}>🏠 Home</button>
          </div>
        )}

        {/* ══════════ FINAL WIN SCREEN ══════════ */}
        {screen === "finalWin" && (
          <div className="overlay">
            <div style={{ display: "flex", gap: 8 }}>
              <Star delay={0.0} size={70} />
              <Star delay={0.2} size={90} />
              <Star delay={0.4} size={70} />
            </div>
            <h1 style={{ background: "linear-gradient(135deg,#f59e0b,#a78bfa,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              You're a Cat Master! 🏆
            </h1>
            <p>You finished <b>all 3 levels</b>! Incredible! 🎊</p>

            <div className="stats-grid" style={{ maxWidth: 420 }}>
              <div className="stat-box">
                <div className="val">{score}</div>
                <div className="lbl">Total Catches</div>
              </div>
              <div className="stat-box">
                <div className="val">{TOTAL_LEVELS}</div>
                <div className="lbl">Levels Done</div>
              </div>
              <div className="stat-box">
                <div className="val">🌟🌟🌟</div>
                <div className="lbl">Stars Earned</div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => { startGame(); }}>
              🔄 Play Again
            </button>
            <button className="btn btn-secondary" onClick={() => setScreen("stats")}>
              📊 View Progress
            </button>
            <button className="btn btn-secondary" onClick={goHome}>🏠 Home</button>
          </div>
        )}

        {/* ══════════ GAME OVER SCREEN ══════════ */}
        {screen === "gameOver" && (
          <div className="overlay">
            <div style={{ fontSize: 80 }}>😿</div>
            <h1 style={{ color: "#f87171" }}>Time's Up!</h1>
            <p>Don't worry — you can try again! 💪</p>
            <p style={{ fontSize: 15 }}>You caught <b>{score}</b> cats in total.</p>
            <button className="btn btn-primary" onClick={startGame}>🔄 Try Again</button>
            <button className="btn btn-secondary" onClick={() => setScreen("stats")}>📊 View Progress</button>
            <button className="btn btn-secondary" onClick={goHome}>🏠 Home</button>
          </div>
        )}

        {/* ══════════ STATS SCREEN ══════════ */}
        {screen === "stats" && (
          <>
            <h1 className="title">📊 My Progress</h1>
            <p className="subtitle">Screen time & performance tracker</p>

            <div className="card">
              {/* Summary */}
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="val">{sessions.length}</div>
                  <div className="lbl">Sessions</div>
                </div>
                <div className="stat-box">
                  <div className="val">{totalTime}s</div>
                  <div className="lbl">Total Time</div>
                </div>
                <div className="stat-box">
                  <div className="val">
                    {sessions.filter(s => s.result === "win").length}
                  </div>
                  <div className="lbl">Wins 🏆</div>
                </div>
              </div>

              {/* Graph */}
              <h3 style={{ textAlign: "center", color: "#6c63ff", marginBottom: 12, fontFamily: "'Baloo 2', cursive" }}>
                Session Duration (seconds)
              </h3>
              <ScreenTimeGraph sessions={sessions} />

              <div className="screen-time-banner">
                🌟 Recommended screen time for children: <b>20–30 min/day</b>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={startGame}>🚀 Play Again</button>
                <button className="btn btn-secondary" onClick={goHome}>🏠 Home</button>
                {sessions.length > 0 && (
                  <button className="btn btn-danger"
                    onClick={() => { setSessions([]); }}>
                    🗑 Clear Data
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
