import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Plus, Trash2, Timer } from "lucide-react";

type Mode = "focus" | "short-break" | "long-break";
type SessionLog = { label: string; duration: number; completedAt: string };

const MODES: Record<Mode, { label: string; seconds: number; color: string; bg: string; icon: React.ReactNode }> = {
  "focus": { label: "Deep Work", seconds: 25 * 60, color: "#7c3aed", bg: "rgba(124,58,237,0.12)", icon: <Brain size={18} /> },
  "short-break": { label: "Short Break", seconds: 5 * 60, color: "#06b6d4", bg: "rgba(6,182,212,0.12)", icon: <Coffee size={18} /> },
  "long-break": { label: "Long Break", seconds: 15 * 60, color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: <Coffee size={18} /> },
};

const QUOTES = [
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "The secret of getting ahead is getting started.",
  "Hard work beats talent when talent doesn't work hard.",
  "Do the hard things first. The rest becomes easy.",
  "One session at a time. That's all it takes.",
  "Focus is the new IQ.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every deep work session compounds. Trust the process.",
];

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function DeepWorkPage() {
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES["focus"].seconds);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [log, setLog] = useState<SessionLog[]>([]);
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [customMinutes, setCustomMinutes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSeconds = MODES[mode].seconds;
  const progress = 1 - timeLeft / totalSeconds;
  const { color, bg, label, icon } = MODES[mode];

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setTimeLeft(MODES[m].seconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const complete = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mode === "focus") {
      setSessionsToday(s => s + 1);
      setLog(l => [{
        label: `Deep Work — ${fmt(MODES[mode].seconds)}`,
        duration: MODES[mode].seconds,
        completedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }, ...l].slice(0, 10));
    }
    setTimeLeft(MODES[mode].seconds);
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { complete(); return MODES[mode].seconds; }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, complete]);

  const reset = () => { setTimeLeft(MODES[mode].seconds); setRunning(false); };

  const applyCustom = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      MODES["focus"] = { ...MODES["focus"], seconds: mins * 60, label: `Deep Work (${mins}m)` };
      switchMode("focus");
      setCustomMinutes("");
    }
  };

  const addTask = () => {
    if (!task.trim()) return;
    setTasks(t => [...t, task.trim()]);
    setTask("");
  };

  const completeTask = (t: string) => {
    setTasks(prev => prev.filter(x => x !== t));
    setCompletedTasks(prev => [...prev, t]);
  };

  const removeTask = (t: string) => setTasks(prev => prev.filter(x => x !== t));

  const circumference = 2 * Math.PI * 88;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Timer size={22} color="#7c3aed" />
              <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Deep Work Session</h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: 0 }}>{quote}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Timer Card */}
            <div style={{ background: "hsl(246 60% 10%)", borderRadius: 20, padding: 32, border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
                {(Object.keys(MODES) as Mode[]).map(m => (
                  <button key={m} onClick={() => switchMode(m)} style={{
                    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, transition: "all 0.2s",
                    background: mode === m ? color : "transparent",
                    color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                  }}>{MODES[m].label}</button>
                ))}
              </div>

              {/* Circular progress */}
              <div style={{ position: "relative", width: 210, height: 210 }}>
                <svg width={210} height={210} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={105} cy={105} r={88} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                  <circle cx={105} cy={105} r={88} fill="none" stroke={color} strokeWidth={10}
                    strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: color }}>
                    {icon}<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: "3rem", fontWeight: 800, color: "#f8fafc", fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>{fmt(timeLeft)}</span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{sessionsToday} session{sessionsToday !== 1 ? "s" : ""} today</span>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={reset} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RotateCcw size={18} />
                </button>
                <button onClick={() => setRunning(r => !r)} style={{
                  width: 64, height: 64, borderRadius: "50%", border: "none", background: color, color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${color}55`, transition: "transform 0.15s",
                }}>
                  {running ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button onClick={complete} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={18} />
                </button>
              </div>

              {/* Custom time */}
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <input value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} onKeyDown={e => e.key === "Enter" && applyCustom()}
                  placeholder="Custom min (e.g. 90)"
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }} />
                <button onClick={applyCustom} style={{ padding: "8px 14px", borderRadius: 10, background: color, border: "none", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Set</button>
              </div>

              {/* Session log */}
              {log.length > 0 && (
                <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Today's Log</p>
                  {log.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < log.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>{s.label}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>{s.completedAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Sessions Today", value: sessionsToday, color: "#7c3aed" },
                  { label: "Tasks Done", value: completedTasks.length, color: "#10b981" },
                  { label: "Focus Time", value: `${Math.round(sessionsToday * (MODES.focus.seconds / 60))}m`, color: "#f59e0b" },
                  { label: "Remaining", value: tasks.length, color: "#06b6d4" },
                ].map(s => (
                  <div key={s.label} style={{ background: "hsl(246 60% 10%)", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{s.label}</p>
                    <p style={{ color: s.color, fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Session tasks */}
              <div style={{ background: "hsl(246 60% 10%)", borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.07)", flex: 1 }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Session Tasks</p>

                {/* Add task */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input value={task} onChange={e => setTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="What will you work on?"
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none" }} />
                  <button onClick={addTask} style={{ width: 38, height: 38, borderRadius: 10, background: "#7c3aed", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={18} />
                  </button>
                </div>

                {/* Active tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {tasks.length === 0 && <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", textAlign: "center", padding: "12px 0" }}>Add tasks to work through during this session.</p>}
                  {tasks.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px" }}>
                      <button onClick={() => completeTask(t)} style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>{t}</span>
                      <button onClick={() => removeTask(t)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Completed tasks */}
                {completedTasks.length > 0 && (
                  <>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Completed</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {completedTasks.map((t, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 10 }}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", textDecoration: "line-through" }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
