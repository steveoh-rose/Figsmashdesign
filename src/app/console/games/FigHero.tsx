/**
 * Cartridge 2 — FigHero: a 4-lane shortcut rhythm game. Figma tool icons drop
 * down lanes V / P / T / R; hit the matching key as they cross the strike line.
 * Combos multiply the score; misses fire a bit-crushed buzzer.
 */
import { useEffect, useRef, useState } from 'react';

interface Note { id: number; lane: number; t: number; hit: boolean; missed: boolean; }

const LANES = [
  { key: 'v', label: 'V', name: 'Move', color: '#e7b53c' },
  { key: 'p', label: 'P', name: 'Pen', color: '#b06cd9' },
  { key: 't', label: 'T', name: 'Text', color: '#46c6d9' },
  { key: 'r', label: 'R', name: 'Rect', color: '#6cc36a' },
];

const TRAVEL = 1.7;      // seconds from spawn to strike line
const STRIKE = 0.84;     // strike line position (fraction of track height)
const PERFECT = 0.045;   // |progress-STRIKE| windows
const GOOD = 0.10;
const CHART_END = 42;    // seconds of notes

// Deterministic chart: one note per beat, lane chosen by a tiny LCG.
function buildChart(): Note[] {
  const notes: Note[] = [];
  let seed = 1337, id = 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let t = 2.4;
  while (t < CHART_END) {
    notes.push({ id: id++, lane: Math.floor(rnd() * 4), t, hit: false, missed: false });
    // occasional double note once the player is warmed up
    if (t > 14 && rnd() > 0.8) {
      let l2 = Math.floor(rnd() * 4);
      if (l2 === notes[notes.length - 1].lane) l2 = (l2 + 1) % 4;
      notes.push({ id: id++, lane: l2, t, hit: false, missed: false });
    }
    t += t > 26 ? 0.42 : t > 12 ? 0.52 : 0.66; // ramps up
  }
  return notes;
}

// Tiny bit-crushed audio.
let actx: AudioContext | null = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* */ } }
  return actx;
}
function blip(freq: number, dur = 0.08, type: OscillatorType = 'square', vol = 0.18) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function buzzer() {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(150, a.currentTime); o.frequency.linearRampToValueAtTime(70, a.currentTime + 0.18);
  o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.16, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.2);
  o.start(); o.stop(a.currentTime + 0.2);
}

export function FigHero({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const notesRef = useRef<Note[]>([]);
  const startRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const flashRef = useRef<Record<number, number>>({}); // lane -> until time
  const [, force] = useState(0);
  const [judge, setJudge] = useState<{ txt: string; col: string } | null>(null);
  const [phase, setPhase] = useState<'count' | 'play' | 'done'>('count');
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // boot the chart + loop
  useEffect(() => {
    notesRef.current = buildChart();
    startRef.current = performance.now() / 1000 + 2.2; // 2.2s lead-in countdown
    let raf = 0;
    const loop = () => {
      const now = performance.now() / 1000;
      const el = now - startRef.current;
      setElapsed(el);
      if (el < 0) setPhase('count'); else if (phaseRef.current === 'count') setPhase('play');
      // auto-miss notes that slid past the window
      if (el >= 0) {
        for (const n of notesRef.current) {
          if (n.hit || n.missed) continue;
          const prog = STRIKE + (el - n.t) / TRAVEL;
          if (prog > STRIKE + GOOD + 0.04) { n.missed = true; comboRef.current = 0; buzzer(); setJudge({ txt: 'MISS', col: '#d94f3d' }); }
        }
      }
      if (el > CHART_END + 1.4 && phaseRef.current !== 'done') {
        setPhase('done');
        onExit(scoreRef.current, Math.max(0, Math.round(el)));
        return; // stop loop; parent unmounts
      }
      force((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = LANES.findIndex((l) => l.key === e.key.toLowerCase());
      if (lane < 0) return;
      e.preventDefault();
      const el = performance.now() / 1000 - startRef.current;
      flashRef.current[lane] = el + 0.12;
      // nearest unhit note in this lane
      let best: Note | null = null, bestD = 1e9;
      for (const n of notesRef.current) {
        if (n.lane !== lane || n.hit || n.missed) continue;
        const prog = STRIKE + (el - n.t) / TRAVEL;
        const d = Math.abs(prog - STRIKE);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best && bestD <= GOOD) {
        best.hit = true;
        const perfect = bestD <= PERFECT;
        comboRef.current += 1;
        maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
        const mult = 1 + Math.floor(comboRef.current / 8);
        scoreRef.current += (perfect ? 100 : 50) * mult;
        blip(perfect ? 1180 : 760, 0.07, 'square', 0.16);
        setJudge({ txt: perfect ? 'PERFECT' : 'GOOD', col: perfect ? '#e7b53c' : '#6cc36a' });
      } else {
        comboRef.current = 0;
        buzzer();
        setJudge({ txt: 'MISS', col: '#d94f3d' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const el = elapsed;
  const countNum = Math.max(0, Math.ceil(-el));

  return (
    <div className="fc-fighero">
      <div className="fc-fh-hud">
        <span>SCORE <b>{scoreRef.current.toString().padStart(6, '0')}</b></span>
        <span className="fc-fh-combo">{comboRef.current > 1 ? `${comboRef.current} COMBO ×${1 + Math.floor(comboRef.current / 8)}` : ''}</span>
        <span>HI <b>{Math.max(highScore, scoreRef.current).toString().padStart(6, '0')}</b></span>
      </div>

      <div className="fc-fh-track">
        {LANES.map((l, li) => (
          <div className="fc-fh-lane" key={l.key} style={{ ['--lc' as string]: l.color }}>
            <div className="fc-fh-laneglow" style={{ opacity: (flashRef.current[li] || 0) > el ? 1 : 0 }} />
            {notesRef.current.map((n) => {
              if (n.lane !== li || n.hit) return null;
              const prog = STRIKE + (el - n.t) / TRAVEL;
              if (prog < -0.05 || prog > 1.08) return null;
              return (
                <div
                  key={n.id}
                  className={`fc-fh-note ${n.missed ? 'miss' : ''}`}
                  style={{ top: `${prog * 100}%`, background: l.color }}
                >
                  {l.label}
                </div>
              );
            })}
            <div className="fc-fh-key">{l.label}</div>
          </div>
        ))}
        <div className="fc-fh-strike" style={{ top: `${STRIKE * 100}%` }} />
        {judge && <div className="fc-fh-judge" style={{ color: judge.col }} key={judge.txt + Math.floor(el * 30)}>{judge.txt}</div>}
        {countNum > 0 && el < 0 && <div className="fc-fh-count">{countNum}</div>}
      </div>

      <div className="fc-fh-foot">▲ tap <b>V P T R</b> as the tools hit the line · ⎋ eject</div>
    </div>
  );
}
