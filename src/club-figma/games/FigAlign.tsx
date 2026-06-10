/**
 * Cartridge 4 — Match da Shape (formerly FigAlign).
 *
 * A target uniform shape (square / circle / triangle / hexagon) animates
 * out showing its position, size, and rotation. A timer ticks down, then
 * it hides. You rebuild it by direct manipulation:
 *   • drag inside  → move
 *   • drag on edge → resize (uniform — distance from centre sets radius)
 *   • drag outside → rotate
 * Score /100 each round, five rounds → total /500.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS  = 5;
const PEEK_MS = 2600;
const VB      = 240;        // square viewBox
const C       = VB / 2;     // centre
const MIN_R   = 12;
const MAX_R   = 95;
const RESIZE_R = 16;        // grab-edge half-width
const ROTATE_R = 30;        // ring outside the edge that starts a rotate

type ShapeType = 'square' | 'circle' | 'triangle' | 'hexagon';
interface Shape { cx: number; cy: number; r: number; rot: number; type: ShapeType; }
type Phase = 'peek' | 'dial' | 'result' | 'done';

const TYPES: ShapeType[] = ['square', 'circle', 'triangle', 'hexagon'];
function rand() { return Math.random(); }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function newTarget(): Shape {
  return {
    cx:   55 + rand() * 130,
    cy:   55 + rand() * 130,
    r:    22 + rand() * 42,
    rot:  rand() * 360,
    type: TYPES[Math.floor(rand() * TYPES.length)],
  };
}
function initGuess(t: Shape): Shape {
  return { cx: C, cy: C, r: 38, rot: 0, type: t.type };
}

// Points on a regular n-gon with circumradius r, starting at the top (−90°).
function polygonPts(n: number, r: number): string {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i * 360 / n) - 90) * Math.PI / 180;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

// 4 handle points on the shape boundary at cardinal directions.
function handlePoints(s: Shape) {
  return [0, 90, 180, 270].map(deg => {
    const a = ((deg + s.rot) * Math.PI) / 180;
    return { x: s.cx + s.r * Math.cos(a), y: s.cy + s.r * Math.sin(a) };
  });
}

function zoneAt(s: Shape, px: number, py: number): 'move' | 'resize' | 'rotate' | '' {
  const dist = Math.hypot(s.cx - px, s.cy - py);
  if (handlePoints(s).some(h => Math.hypot(h.x - px, h.y - py) <= RESIZE_R)) return 'resize';
  if (dist > s.r && dist <= s.r + ROTATE_R) return 'rotate';
  if (dist <= s.r) return 'move';
  return '';
}

function scoreOf(t: Shape, g: Shape): number {
  const posScore  = Math.max(0, 1 - Math.hypot(t.cx - g.cx, t.cy - g.cy) / 100);
  const sizeScore = Math.max(0, 1 - Math.abs(t.r - g.r) / 60);
  let rotScore = 1;
  if (t.type !== 'circle') {
    // Symmetry: square=90°, triangle=120°, hexagon=60°
    const sym = t.type === 'square' ? 90 : t.type === 'triangle' ? 120 : 60;
    let dr = (((t.rot - g.rot) % sym) + sym) % sym;
    if (dr > sym / 2) dr = sym - dr;
    rotScore = Math.max(0, 1 - dr / (sym / 2));
  }
  return Math.round(100 * Math.max(0, 0.4 * posScore + 0.3 * sizeScore + 0.3 * rotScore));
}

// ── Audio ────────────────────────────────────────────────────────────────────
let actx: AudioContext | null = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* */ } } return actx; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.16) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function click() { tone(1500, 0.018, 'square', 0.09); }
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const MEL  = [69, 74, 78, 74, 71, 76, 81, 76, 67, 72, 76, 72, 69, 65, 62, 0];
const BASS = [45, 45, 41, 41, 38, 38, 43, 43, 45, 45, 41, 41, 40, 40, 36, 36];
function startMusic() {
  const a = audio(); if (!a) return null;
  try { a.resume(); } catch { /* */ }
  const stepDur = 0.22; let step = 0, next = a.currentTime + 0.1;
  const t2 = (f: number, t: number, d: number, ty: OscillatorType, v: number) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = ty; o.frequency.value = f; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d);
  };
  const timer = window.setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const m = MEL[step % MEL.length]; if (m) t2(midi(m), next, stepDur * 0.85, 'square', 0.045);
      if (step % 2 === 0) { const b = BASS[step % BASS.length]; if (b) t2(midi(b), next, stepDur * 1.7, 'triangle', 0.07); }
      next += stepDur; step++;
    }
  }, 45);
  return { stop: () => window.clearInterval(timer) };
}

// ── Shape renderer ───────────────────────────────────────────────────────────
const ACCENT = '#ff9f43';
function zoneCursor(mode: string) {
  return mode === 'resize' ? 'nwse-resize' : mode === 'rotate' ? 'grab' : mode === 'move' ? 'move' : 'default';
}

function ShapeRenderer({ s, fill, dashed, handles }: { s: Shape; fill?: string; dashed?: boolean; handles?: boolean }) {
  const stroke = dashed ? '#fff' : '#1c1c1c';
  const sw     = dashed ? 2 : 3;
  const sd     = dashed ? '5 5' : undefined;
  const { r }  = s;
  return (
    <g transform={`translate(${s.cx} ${s.cy}) rotate(${s.rot})`} opacity={dashed ? 0.85 : 1}>
      {s.type === 'square'   && <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={fill || 'none'} stroke={stroke} strokeWidth={sw} strokeDasharray={sd} />}
      {s.type === 'circle'   && <circle cx={0} cy={0} r={r} fill={fill || 'none'} stroke={stroke} strokeWidth={sw} strokeDasharray={sd} />}
      {s.type === 'triangle' && <polygon points={polygonPts(3, r)} fill={fill || 'none'} stroke={stroke} strokeWidth={sw} strokeDasharray={sd} strokeLinejoin="round" />}
      {s.type === 'hexagon'  && <polygon points={polygonPts(6, r)} fill={fill || 'none'} stroke={stroke} strokeWidth={sw} strokeDasharray={sd} strokeLinejoin="round" />}
      {/* rotation nub at top, hidden for circles */}
      {!dashed && s.type !== 'circle' && <circle cx={0} cy={-r} r={3.5} fill="#1c1c1c" />}
      {/* 4 cardinal resize handles */}
      {handles && [0, 90, 180, 270].map((deg, i) => {
        const a = deg * Math.PI / 180;
        return <rect key={i} x={r * Math.cos(a) - 4} y={r * Math.sin(a) - 4} width={8} height={8} fill="#fff" stroke="#1c1c1c" strokeWidth={1.5} />;
      })}
    </g>
  );
}

// ── Main component (exported as FigAlign so the console wiring stays the same) ──
export function FigAlign({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const firstTarget = useRef(newTarget()).current;
  const [round,     setRound]     = useState(1);
  const [target,    setTarget]    = useState<Shape>(firstTarget);
  const [guess,     setGuess]     = useState<Shape>(() => initGuess(firstTarget));
  const [phase,     setPhase]     = useState<Phase>('peek');
  const [ms,        setMs]        = useState(PEEK_MS);
  const [grow,      setGrow]      = useState(0);
  const [scores,    setScores]    = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [hoverMode, setHoverMode] = useState<string>('');
  const [dragMode,  setDragMode]  = useState<string>('');

  const svgRef   = useRef<SVGSVGElement>(null);
  const guessRef = useRef(guess); guessRef.current = guess;
  const refs     = useRef({ phase, target, round }); refs.current = { phase, target, round };
  const dragRef  = useRef<any>(null);
  const startRef = useRef(performance.now() / 1000);

  useEffect(() => { const m = startMusic(); return () => m?.stop(); }, []);

  useEffect(() => {
    if (phase !== 'peek') return;
    let raf = 0; const t0 = performance.now(); let lastClick = -1; click();
    const tick = () => {
      const el = performance.now() - t0; const left = PEEK_MS - el;
      setMs(Math.max(0, Math.round(left)));
      setGrow(Math.min(1, el / 450));
      const ci = Math.floor(el / 110); if (ci !== lastClick) { lastClick = ci; if (left > 0) click(); }
      if (left <= 0) { setPhase('dial'); tone(760, 0.16, 'square', 0.16); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, round]);

  const toVB = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * VB, y: ((clientY - rect.top) / rect.height) * VB };
  };

  const onMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current; if (!drag) return;
    const p = toVB(ev.clientX, ev.clientY);
    const sh = { ...guessRef.current };
    if (drag.mode === 'move') {
      sh.cx = clamp(p.x - drag.offx, 8, VB - 8);
      sh.cy = clamp(p.y - drag.offy, 8, VB - 8);
    } else if (drag.mode === 'rotate') {
      const ang = Math.atan2(p.y - sh.cy, p.x - sh.cx) * 180 / Math.PI;
      sh.rot = drag.startRot + (ang - drag.startAng);
    } else if (drag.mode === 'resize') {
      // Uniform scale: distance from centre sets the new radius.
      sh.r = clamp(Math.hypot(p.x - sh.cx, p.y - sh.cy), MIN_R, MAX_R);
    }
    setGuess(sh);
  }, []);

  const onHover = (e: React.PointerEvent) => {
    if (refs.current.phase !== 'dial' || dragRef.current) return;
    const p = toVB(e.clientX, e.clientY);
    setHoverMode(zoneAt(guessRef.current, p.x, p.y));
  };

  const onDown = (e: React.PointerEvent) => {
    if (refs.current.phase !== 'dial') return;
    e.preventDefault();
    const p  = toVB(e.clientX, e.clientY);
    const sh = guessRef.current;
    const mode = zoneAt(sh, p.x, p.y);
    let drag: any = null;
    if (mode === 'resize') {
      drag = { mode: 'resize' };
    } else if (mode === 'rotate') {
      drag = { mode: 'rotate', startRot: sh.rot, startAng: Math.atan2(p.y - sh.cy, p.x - sh.cx) * 180 / Math.PI };
    } else if (mode === 'move') {
      drag = { mode: 'move', offx: p.x - sh.cx, offy: p.y - sh.cy };
    }
    if (!drag) return;
    dragRef.current = drag; setDragMode(drag.mode);
    const up = () => { dragRef.current = null; setDragMode(''); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', up);
  };

  const submit = useCallback(() => {
    const r = refs.current;
    if (r.phase !== 'dial') return;
    const sc = scoreOf(r.target, guessRef.current);
    setLastScore(sc); setScores((arr) => [...arr, sc]); setPhase('result');
    tone(sc >= 80 ? 1100 : sc >= 50 ? 760 : 480, 0.16, 'square', 0.16);
    window.setTimeout(() => {
      if (r.round >= ROUNDS) { setPhase('done'); return; }
      const next = newTarget();
      setRound((x) => x + 1);
      setTarget(next);
      setGuess(initGuess(next));
      setGrow(0); setPhase('peek');
    }, 1700);
  }, []);
  const submitRef = useRef(submit); submitRef.current = submit;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const total = scores.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (phase !== 'done') return;
    const secs = Math.round(performance.now() / 1000 - startRef.current);
    const id = window.setTimeout(() => onExit(total, secs), 1800);
    return () => window.clearTimeout(id);
  }, [phase, total, onExit]);

  const scoreCol = (n: number) => (n >= 80 ? '#6cc36a' : n >= 50 ? '#ffce3a' : '#ef5d52');

  if (phase === 'done') {
    return (
      <div className="fc-contrast fc-ct-done">
        <div className="fc-ct-donetitle">DA SHAPES MATCHED</div>
        <div className="fc-ct-dotrow">{scores.map((n, i) => <span key={i} className="fc-ct-dot" style={{ color: scoreCol(n) }}>{n}</span>)}</div>
        <div className="fc-ct-total" style={{ color: scoreCol(total / ROUNDS) }}>{total}<small> / {ROUNDS * 100}</small></div>
        {total > highScore && <div className="fc-ct-best">★ NEW BEST ★</div>}
      </div>
    );
  }

  // Scale the target outward from centre during peek.
  const grown: Shape = {
    ...target,
    cx: C + (target.cx - C) * grow,
    cy: C + (target.cy - C) * grow,
    r:  target.r * grow,
  };

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>TOTAL <b>{total.toString().padStart(3, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, total).toString().padStart(3, '0')}</b></span>
      </div>

      <div className="fc-align-stage">
        <div className="fc-align-canvas">
          <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} onPointerDown={onDown} onPointerMove={onHover} onPointerLeave={() => setHoverMode('')}
            style={{ touchAction: 'none', cursor: zoneCursor(dragMode || hoverMode) }}>
            {phase === 'peek'   && <ShapeRenderer s={grown} fill={ACCENT} />}
            {phase !== 'peek'   && <ShapeRenderer s={guess} fill={ACCENT} handles={phase === 'dial' && !!(dragMode || hoverMode)} />}
            {phase === 'result' && <ShapeRenderer s={target} dashed />}
          </svg>
          {phase === 'peek'   && <div className="fc-ct-ms fc-align-ms">{Math.max(0, ms)}<small>ms</small></div>}
          {phase === 'result' && <div className="fc-ct-roundscore fc-align-score" style={{ color: scoreCol(lastScore) }}>{lastScore}<small>/100</small></div>}
        </div>
      </div>

      <div className="fc-ct-bottom">
        <span className="fc-ct-instr">{phase === 'peek' ? 'MEMORISE DA SHAPE…' : 'drag · edge = resize · outside = rotate'}</span>
        <button className="fc-ct-submit" onClick={() => submitRef.current()} disabled={phase !== 'dial'} title="Lock in (Enter)">◎</button>
      </div>
      <div className="fc-fh-foot">memorise, then match da shape · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
