/**
 * Cartridge 2 — Shortcut Hero ("Shortcut Simon", Figma edition).
 *
 * The console flashes a sequence of Figma tools; the player repeats it back by
 * pressing the real keyboard shortcuts (V / F / P / T, and ⌘⌥K / Ctrl+Alt+K for
 * Create Component once the modifier waves kick in). Every cleared round grows
 * the sequence, speeds the flashes up and shortens the input fuse. From round 6
 * the grid tiles scramble ("Flipped Mode") so muscle memory — not aiming —
 * carries you. Miss a key or let the fuse burn out and a Game Over screen drops
 * with a breakdown of the shortcut that tripped you.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface Tool { key: string; label: string; name: string; color: string; freq: number; modifier?: boolean; }

// Index 0–3 are the always-available tools; index 4 (Create Component) unlocks
// in the modifier waves and needs ⌘⌥K / Ctrl+Alt+K.
const TOOLS: Tool[] = [
  { key: 'v', label: 'V',  name: 'Move',      color: '#1ABCFE', freq: 523.25 },
  { key: 'f', label: 'F',  name: 'Frame',     color: '#FF7262', freq: 659.25 },
  { key: 'p', label: 'P',  name: 'Pen',       color: '#A259FF', freq: 783.99 },
  { key: 't', label: 'T',  name: 'Text',      color: '#0ACF83', freq: 987.77 },
  { key: 'k', label: '⌘⌥K', name: 'Component', color: '#FFC700', freq: 1174.7, modifier: true },
];
const COMPONENT = 4;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
const COMPONENT_LABEL = IS_MAC ? '⌘⌥K' : 'Ctrl+Alt+K';

// ── Difficulty curve (round 1 = sequence of 1) ───────────────────────────────
const unlockedCount = (round: number) => (round >= 4 ? 5 : 4);
const flashOnMs = (round: number) => Math.max(165, 500 - (round - 1) * 18);
const flashGapMs = (round: number) => Math.max(85, flashOnMs(round) * 0.5);
const fuseSecs = (round: number) => Math.max(0.7, 2.4 - (round - 1) * 0.1);

function genStep(round: number): number {
  const n = unlockedCount(round);
  if (n === 5 && Math.random() < 0.28) return COMPONENT;   // modifier wave
  return Math.floor(Math.random() * 4);
}

function layoutFor(round: number): number[] {
  const base = unlockedCount(round) === 5 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];
  if (round >= 6) {                                        // Flipped Mode — scramble tiles
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
  }
  return base;
}

// ── Audio (tiny chiptune blips) ──────────────────────────────────────────────
let actx: AudioContext | null = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* */ } }
  return actx;
}
function tone(freq: number, dur = 0.16, type: OscillatorType = 'square', vol = 0.16) {
  const a = audio(); if (!a) return;
  try { a.resume(); } catch { /* */ }
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.13), i * 70));
}
function buzzer() {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(160, a.currentTime); o.frequency.linearRampToValueAtTime(60, a.currentTime + 0.32);
  o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.18, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.34);
  o.start(); o.stop(a.currentTime + 0.34);
}

// ── Pixel tool icons ─────────────────────────────────────────────────────────
function ToolIcon({ tool, color }: { tool: number; color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" style={{ imageRendering: 'pixelated' }} aria-hidden="true">
      {tool === 0 && <path d="M5 3 L5 17.5 L9 13.5 L11.6 19 L13.7 18 L11.1 12.6 L16 12.6 Z" fill={color} stroke={color} strokeWidth="0.6" strokeLinejoin="round" />}
      {tool === 1 && <path d="M8 3 V21 M16 3 V21 M3 8 H21 M3 16 H21" stroke={color} strokeWidth="2.2" strokeLinecap="square" fill="none" />}
      {tool === 2 && <><path d="M6.5 18 L14.5 5.5 L18 7.8 L10 20.3 Z" fill={color} /><path d="M6.5 18 L10 20.3 L5.6 21 Z" fill={color} /></>}
      {tool === 3 && <path d="M5 5 H19 M12 5 V19 M9 19 H15" stroke={color} strokeWidth="2.4" strokeLinecap="square" fill="none" />}
      {tool === 4 && <>
        {/* Upper-left & lower-right: dim facets */}
        <path d="M12 3 L3 12 L12 12 Z"  fill={color} fillOpacity="0.42" />
        <path d="M21 12 L12 21 L12 12 Z" fill={color} fillOpacity="0.42" />
        {/* Upper-right & lower-left: bright facets */}
        <path d="M12 3 L12 12 L21 12 Z"  fill={color} />
        <path d="M3 12 L12 21 L12 12 Z"  fill={color} />
        {/* Outer diamond edge */}
        <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="miter" />
      </>}
    </svg>
  );
}

type Phase = 'count' | 'show' | 'input' | 'over';

export function ShortcutHero({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [phase, setPhase] = useState<Phase>('count');
  const [sequence, setSequence] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [layout, setLayout] = useState<number[]>([0, 1, 2, 3]);
  const [inputIdx, setInputIdx] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);   // tool index lit right now
  const [wrong, setWrong] = useState<number | null>(null);   // tool flashed red on a miss
  const [count, setCount] = useState(3);
  const [fuse, setFuse] = useState(1);                       // 0..1 remaining
  const [overReason, setOverReason] = useState<'wrong' | 'time'>('wrong');
  const [, force] = useState(0);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const missesRef = useRef<Record<number, number>>({});
  const failToolRef = useRef<number | null>(null);
  const playStartRef = useRef(performance.now() / 1000);
  const inputIdxRef = useRef(0);
  inputIdxRef.current = inputIdx;
  const sequenceRef = useRef<number[]>([]);
  sequenceRef.current = sequence;

  // Begin a fresh game (also used by the retry credit).
  const startGame = useCallback(() => {
    scoreRef.current = 0; streakRef.current = 0; bestStreakRef.current = 0;
    missesRef.current = {}; failToolRef.current = null;
    playStartRef.current = performance.now() / 1000;
    setSequence([genStep(1)]);
    setRound(1); setLayout(layoutFor(1));
    setInputIdx(0); setFlash(null); setWrong(null);
    setPhase('show');
  }, []);

  // 3·2·1 countdown, then the first round.
  useEffect(() => {
    if (phase !== 'count') return;
    let n = 3; setCount(3);
    const iv = window.setInterval(() => {
      n -= 1;
      if (n <= 0) { window.clearInterval(iv); startGame(); }
      else { setCount(n); tone(440, 0.08, 'square', 0.1); }
    }, 700);
    return () => window.clearInterval(iv);
  }, [phase, startGame]);

  // SHOW: flash the sequence one tool at a time, then hand control to the player.
  useEffect(() => {
    if (phase !== 'show' || !sequence.length) return;
    let cancelled = false;
    const timers: number[] = [];
    const on = flashOnMs(round), gap = flashGapMs(round);
    let t = 420;
    sequence.forEach((tool) => {
      timers.push(window.setTimeout(() => { if (!cancelled) { setFlash(tool); tone(TOOLS[tool].freq); } }, t));
      timers.push(window.setTimeout(() => { if (!cancelled) setFlash(null); }, t + on));
      t += on + gap;
    });
    timers.push(window.setTimeout(() => { if (!cancelled) { setInputIdx(0); setPhase('input'); } }, t + 220));
    return () => { cancelled = true; timers.forEach(window.clearTimeout); setFlash(null); };
  }, [phase, round, sequence]);

  const gameOver = useCallback((reason: 'wrong' | 'time') => {
    buzzer();
    bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
    setOverReason(reason);
    setPhase('over');
  }, []);

  // INPUT fuse — burns down per key, faster each round; reset on every correct key.
  useEffect(() => {
    if (phase !== 'input') return;
    const span = fuseSecs(round);
    const deadline = performance.now() / 1000 + span;
    let raf = 0;
    const loop = () => {
      const left = deadline - performance.now() / 1000;
      setFuse(Math.max(0, left / span));
      if (left <= 0) {
        failToolRef.current = sequenceRef.current[inputIdxRef.current] ?? null;
        if (failToolRef.current != null) missesRef.current[failToolRef.current] = (missesRef.current[failToolRef.current] || 0) + 1;
        setWrong(failToolRef.current);
        gameOver('time');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, round, inputIdx, gameOver]);

  // Map a keypress to a tool index (or -1). Component needs the modifier combo.
  const keyToTool = (e: KeyboardEvent): number => {
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'k') return COMPONENT;
    if (e.ctrlKey || e.metaKey || e.altKey) return -1;      // a bare letter only
    const k = e.key.toLowerCase();
    const i = TOOLS.findIndex((t, idx) => idx < 4 && t.key === k);
    return i;
  };

  // INPUT: judge each key against the expected step.
  useEffect(() => {
    if (phase !== 'input') return;
    const onKey = (e: KeyboardEvent) => {
      const tool = keyToTool(e);
      if (tool < 0) return;
      e.preventDefault();
      const idx = inputIdxRef.current;
      const expected = sequenceRef.current[idx];
      if (tool === expected) {
        tone(TOOLS[tool].freq);
        setFlash(tool); window.setTimeout(() => setFlash(null), 110);
        streakRef.current += 1;
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        const mult = 1 + Math.floor(streakRef.current / 5);
        scoreRef.current += (TOOLS[tool].modifier ? 120 : 60) * mult;
        const next = idx + 1;
        if (next >= sequenceRef.current.length) {
          // Round cleared — bonus, grow the sequence, replay it.
          scoreRef.current += 100 * round;
          fanfare();
          setSequence((prev) => [...prev, genStep(prev.length + 1)]);
          setRound((r) => { setLayout(layoutFor(r + 1)); return r + 1; });
          setInputIdx(0);
          setPhase('show');
        } else {
          setInputIdx(next);                                // resets the fuse
        }
        force((f) => f + 1);
      } else {
        failToolRef.current = expected;
        missesRef.current[expected] = (missesRef.current[expected] || 0) + 1;
        setWrong(expected);
        gameOver('wrong');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, round, gameOver]);

  // GAME OVER: linger on the breakdown, then return the score to the console.
  // Enter inserts a credit and replays right here; ⎋ (handled by the console) ejects.
  useEffect(() => {
    if (phase !== 'over') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); setPhase('count'); }
    };
    window.addEventListener('keydown', onKey);
    const secs = Math.max(1, Math.round(performance.now() / 1000 - playStartRef.current));
    const id = window.setTimeout(() => onExit(scoreRef.current, secs), 7000);
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(id); };
  }, [phase, onExit]);

  const mult = 1 + Math.floor(streakRef.current / 5);
  const hi = Math.max(highScore, scoreRef.current);

  // Weakest shortcut = the tool that ended the run (or most-missed).
  const weakest = (() => {
    const entries = Object.entries(missesRef.current);
    if (!entries.length) return failToolRef.current != null ? TOOLS[failToolRef.current] : null;
    const [idx] = entries.sort((a, b) => b[1] - a[1])[0];
    return TOOLS[Number(idx)];
  })();

  return (
    <div className="fc-shortcut">
      <div className="fc-sh-hud">
        <span>SCORE <b>{scoreRef.current.toString().padStart(6, '0')}</b></span>
        <span className="fc-sh-streak">{streakRef.current > 0 ? `STREAK ${streakRef.current} ×${mult}` : 'STREAK 0'}</span>
        <span>HI <b>{hi.toString().padStart(6, '0')}</b></span>
      </div>

      {/* Combo multiplier bar */}
      <div className="fc-sh-combobar">
        <i style={{ width: `${Math.min(100, (streakRef.current % 5) * 20 + (streakRef.current > 0 ? 4 : 0))}%` }} />
      </div>

      {/* Timer fuse */}
      <div className={`fc-sh-fuse ${phase === 'input' ? 'live' : ''}`}>
        <i style={{ width: `${fuse * 100}%`, background: fuse < 0.34 ? '#ff4d4d' : fuse < 0.6 ? '#ffb02e' : '#0acf83' }} />
      </div>

      <div className="fc-sh-stage">
        <div className={`fc-sh-grid ${round >= 6 && phase !== 'over' ? 'flipped' : ''}`}>
          {layout.map((tool) => {
            const t = TOOLS[tool];
            const lit = flash === tool;
            const bad = wrong === tool;
            return (
              <div
                key={tool}
                className={`fc-sh-tile ${lit ? 'lit' : ''} ${bad ? 'bad' : ''} ${t.modifier ? 'mod' : ''}`}
                style={{ ['--tc' as string]: t.color }}
              >
                <ToolIcon tool={tool} color={lit ? '#101014' : t.color} />
                <span className="fc-sh-key">{t.modifier ? COMPONENT_LABEL : t.label}</span>
                <span className="fc-sh-name">{t.name}</span>
              </div>
            );
          })}
        </div>

        {/* Round / progress dots */}
        {phase !== 'over' && (
          <div className="fc-sh-progress">
            <span className="fc-sh-round">ROUND {round}</span>
            <div className="fc-sh-dots">
              {sequence.map((_, i) => (
                <i key={i} className={phase === 'input' && i < inputIdx ? 'on' : ''} />
              ))}
            </div>
            <span className="fc-sh-prompt">
              {phase === 'count' ? '' : phase === 'show' ? 'WATCH…' : 'YOUR TURN — TYPE IT'}
            </span>
          </div>
        )}

        {phase === 'count' && <div className="fc-sh-count">{count}</div>}

        {phase === 'over' && (
          <div className="fc-sh-over">
            <div className="fc-sh-over-title">GAME OVER</div>
            <div className="fc-sh-over-reason">{overReason === 'time' ? '⏱ FUSE BURNED OUT' : '✗ WRONG SHORTCUT'}</div>
            <div className="fc-sh-over-stats">
              <div><span>SCORE</span><b>{scoreRef.current.toString().padStart(6, '0')}</b></div>
              <div><span>ROUND</span><b>{round}</b></div>
              <div><span>BEST STREAK</span><b>{bestStreakRef.current}</b></div>
            </div>
            {weakest && (
              <div className="fc-sh-weak">You kept missing the <b style={{ color: weakest.color }}>{weakest.name} Tool</b> ({weakest.modifier ? COMPONENT_LABEL : weakest.label})</div>
            )}
            <div className="fc-sh-credit">↵ INSERT CREDIT — PLAY AGAIN&nbsp;&nbsp;·&nbsp;&nbsp;⎋ EJECT</div>
          </div>
        )}
      </div>

      <div className="fc-sh-foot">▲ watch the flash, then type <b>V F P T</b>{round >= 4 ? <> · <b>{COMPONENT_LABEL}</b> for components</> : null} · ⎋ eject</div>
    </div>
  );
}
