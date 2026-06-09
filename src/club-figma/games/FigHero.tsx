/**
 * Cartridge 2 — FigHero: a 4-lane shortcut rhythm game.
 * Ported from rip-designs-catharsis-garden branch.
 */
import { useEffect, useRef, useState } from 'react';

interface Note { id: number; lane: number; t: number; hit: boolean; missed: boolean; }

const LANES = [
  { key: 'v', label: 'V', name: 'Move', color: '#e7b53c' },
  { key: 'p', label: 'P', name: 'Pen', color: '#b06cd9' },
  { key: 't', label: 'T', name: 'Text', color: '#46c6d9' },
  { key: 'r', label: 'R', name: 'Rect', color: '#6cc36a' },
];

const TRAVEL = 1.7;
const STRIKE = 0.84;
const PERFECT = 0.045;
const GOOD = 0.10;
const CHART_END = 42;

function buildChart(): Note[] {
  const notes: Note[] = [];
  let seed = 1337, id = 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let t = 2.4;
  while (t < CHART_END) {
    notes.push({ id: id++, lane: Math.floor(rnd() * 4), t, hit: false, missed: false });
    if (t > 14 && rnd() > 0.8) {
      let l2 = Math.floor(rnd() * 4);
      if (l2 === notes[notes.length - 1].lane) l2 = (l2 + 1) % 4;
      notes.push({ id: id++, lane: l2, t, hit: false, missed: false });
    }
    t += t > 26 ? 0.42 : t > 12 ? 0.52 : 0.66;
  }
  return notes;
}

let actx: AudioContext | null = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /**/ } }
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

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const MELODY = [69, 76, 72, 76, 74, 77, 81, 77, 67, 74, 71, 74, 76, 72, 69, 0];
const BASS = [45, 45, 41, 41, 36, 36, 43, 43, 45, 45, 41, 41, 40, 40, 43, 43];
function startMusic() {
  const a = audio(); if (!a) return null;
  try { a.resume(); } catch { /**/ }
  const stepDur = 0.21;
  let step = 0, next = a.currentTime + 0.12;
  const tone = (freq: number, t: number, dur: number, type: OscillatorType, vol: number) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  };
  const timer = window.setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const m = MELODY[step % MELODY.length];
      if (m) tone(midi(m), next, stepDur * 0.85, 'square', 0.06);
      if (step % 2 === 0) { const b = BASS[step % BASS.length]; if (b) tone(midi(b), next, stepDur * 1.7, 'triangle', 0.09); }
      next += stepDur; step++;
    }
  }, 45);
  return { stop: () => window.clearInterval(timer) };
}

function ToolIcon({ lane }: { lane: number }) {
  const c = '#14142a';
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" style={{ imageRendering: 'pixelated' }} aria-hidden="true">
      {lane === 0 && <path d="M5 3 L5 17.5 L9 13.5 L11.6 19 L13.7 18 L11.1 12.6 L16 12.6 Z" fill={c} stroke={c} strokeWidth="0.6" strokeLinejoin="round" />}
      {lane === 1 && <><path d="M6.5 18 L14.5 5.5 L18 7.8 L10 20.3 Z" fill={c} /><path d="M6.5 18 L10 20.3 L5.6 21 Z" fill={c} /></>}
      {lane === 2 && <path d="M5 5 H19 M12 5 V19 M9 19 H15" stroke={c} strokeWidth="2.4" strokeLinecap="square" fill="none" />}
      {lane === 3 && <rect x="5" y="7" width="14" height="10" rx="1" fill="none" stroke={c} strokeWidth="2.4" />}
    </svg>
  );
}

export function FigHero({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const notesRef = useRef<Note[]>([]);
  const startRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const flashRef = useRef<Record<number, number>>({});
  const [, force] = useState(0);
  const [judge, setJudge] = useState<{ txt: string; col: string } | null>(null);
  const [phase, setPhase] = useState<'count' | 'play' | 'done'>('count');
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    notesRef.current = buildChart();
    startRef.current = performance.now() / 1000 + 2.2;
    const music = startMusic();
    let raf = 0;
    const loop = () => {
      const now = performance.now() / 1000;
      const el = now - startRef.current;
      setElapsed(el);
      if (el < 0) setPhase('count'); else if (phaseRef.current === 'count') setPhase('play');
      if (el >= 0) {
        for (const n of notesRef.current) {
          if (n.hit || n.missed) continue;
          const prog = STRIKE + (el - n.t) / TRAVEL;
          if (prog > STRIKE + GOOD + 0.04) { n.missed = true; comboRef.current = 0; buzzer(); setJudge({ txt: 'MISS', col: '#d94f3d' }); }
        }
      }
      if (el > CHART_END + 1.4 && phaseRef.current !== 'done') {
        setPhase('done'); music?.stop(); onExit(scoreRef.current, Math.max(0, Math.round(el))); return;
      }
      force((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); music?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = LANES.findIndex((l) => l.key === e.key.toLowerCase());
      if (lane < 0) return;
      e.preventDefault();
      const el = performance.now() / 1000 - startRef.current;
      flashRef.current[lane] = el + 0.12;
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
        comboRef.current = 0; buzzer(); setJudge({ txt: 'MISS', col: '#d94f3d' });
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
                <div key={n.id} className={`fc-fh-note ${n.missed ? 'miss' : ''}`} style={{ top: `${prog * 100}%`, background: l.color }}>
                  <ToolIcon lane={li} />
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
