/**
 * Cartridge 3 — FigContrast: a "dial in the colour" calibration game. A target
 * colour fills one half of a swatch; dial the R / G / B sliders until your half
 * matches and the seam disappears. Closer + faster = more points. Five rounds.
 */
import { useEffect, useRef, useState } from 'react';

const ROUNDS = 5;

interface RGB { r: number; g: number; b: number; }

function rint(max: number) { return Math.floor(Math.random() * max); }
function hsl2rgb(h: number, s: number, l: number): RGB {
  h /= 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return { r: f(0), g: f(8), b: f(4) };
}
// Pleasant, mid-tone targets (random hue, decent saturation/lightness).
function newTarget(): RGB { return hsl2rgb(rint(360), 0.45 + Math.random() * 0.45, 0.36 + Math.random() * 0.34); }

const css = (c: RGB) => `rgb(${c.r},${c.g},${c.b})`;

export function FigContrast({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<RGB>(newTarget);
  const [r, setR] = useState(128);
  const [g, setG] = useState(128);
  const [b, setB] = useState(128);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<{ acc: number; pts: number } | null>(null);
  const [done, setDone] = useState(false);
  const startRef = useRef(performance.now() / 1000);
  const roundStartRef = useRef(performance.now() / 1000);
  const revealRef = useRef(false);

  const guess: RGB = { r, g, b };

  const lockIn = () => {
    if (revealRef.current) return;
    revealRef.current = true;
    const avg = (Math.abs(r - target.r) + Math.abs(g - target.g) + Math.abs(b - target.b)) / 3;
    const acc = Math.max(0, 1 - avg / 64); // within ~6/channel ≈ 90%
    const t = performance.now() / 1000 - roundStartRef.current;
    const speed = Math.max(0, Math.round(250 - t * 22));
    const pts = Math.round(acc * 1000) + speed;
    setScore((s) => s + pts);
    setReveal({ acc, pts });
    window.setTimeout(() => {
      if (round >= ROUNDS) { setDone(true); return; }
      setRound((rd) => rd + 1);
      setTarget(newTarget());
      setR(128); setG(128); setB(128);
      setReveal(null);
      revealRef.current = false;
      roundStartRef.current = performance.now() / 1000;
    }, 1500);
  };

  // Enter locks in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); lockIn(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, g, b, round]);

  useEffect(() => {
    if (!done) return;
    const secs = Math.round(performance.now() / 1000 - startRef.current);
    const id = window.setTimeout(() => onExit(score, secs), 60);
    return () => window.clearTimeout(id);
  }, [done, score, onExit]);

  const revColor = reveal ? (reveal.acc > 0.9 ? '#6cc36a' : reveal.acc > 0.7 ? '#ffce3a' : '#ef5d52') : '#fff';
  const revLabel = reveal ? (reveal.acc > 0.96 ? 'DIALED!' : reveal.acc > 0.85 ? 'SHARP' : reveal.acc > 0.6 ? 'CLOSE' : 'OFF') : '';

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>SCORE <b>{score.toString().padStart(6, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, score).toString().padStart(6, '0')}</b></span>
      </div>

      <div className="fc-ct-stage">
        <div className="fc-ct-swatch">
          <div className="fc-ct-half" style={{ background: css(target) }} />
          <div className="fc-ct-half" style={{ background: css(guess) }} />
          {reveal && (
            <div className="fc-ct-readout" style={{ color: revColor }}>{revLabel} {Math.round(reveal.acc * 100)}% &nbsp;+{reveal.pts}</div>
          )}
        </div>
        <div className="fc-ct-hint">{reveal ? 'target ◂ ▸ yours' : 'dial R / G / B until the seam disappears'}</div>
      </div>

      <div className="fc-ct-sliders">
        <label style={{ ['--chc' as string]: '#ef5d52' }}><span className="ch">R</span><input type="range" min={0} max={255} value={r} onChange={(e) => setR(+e.target.value)} /><span className="val">{r}</span></label>
        <label style={{ ['--chc' as string]: '#6cc36a' }}><span className="ch">G</span><input type="range" min={0} max={255} value={g} onChange={(e) => setG(+e.target.value)} /><span className="val">{g}</span></label>
        <label style={{ ['--chc' as string]: '#4d7cff' }}><span className="ch">B</span><input type="range" min={0} max={255} value={b} onChange={(e) => setB(+e.target.value)} /><span className="val">{b}</span></label>
      </div>

      <button className="fc-btn fc-btn-gold fc-ct-lock" onClick={lockIn} disabled={!!reveal}>LOCK IN ▶</button>
      <div className="fc-fh-foot">drag <b>R G B</b> to match · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
