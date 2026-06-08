/**
 * Cartridge 3 — FigContrast: bit-crushed calibration. A pixel scene is thrown
 * out of whack (brightness / saturation / hue). Dial the sliders to neutralise
 * it. Closer + faster = bigger score. Five rounds.
 */
import { useEffect, useRef, useState } from 'react';

const ROUNDS = 5;

// A small colourful pixel scene as a crisp dataURL.
const SCENE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='12' shape-rendering='crispEdges'>
    <rect width='16' height='12' fill='#3a7d8c'/>
    <rect y='8' width='16' height='4' fill='#5a9b4a'/>
    <rect x='2' y='4' width='3' height='4' fill='#d24b3e'/>
    <rect x='2' y='3' width='3' height='1' fill='#e6c64a'/>
    <rect x='10' y='5' width='4' height='3' fill='#b06cd9'/>
    <circle cx='13' cy='2' r='1.5' fill='#e6c64a'/>
    <rect x='6' y='6' width='2' height='2' fill='#f3edc8'/>
  </svg>`
)}`;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

interface Distort { b: number; s: number; h: number; }
function newDistort(): Distort {
  return { b: rand(0.55, 1.7), s: rand(0.2, 2.0), h: rand(-70, 70) };
}

export function FigContrast({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [distort, setDistort] = useState<Distort>(newDistort);
  const [sb, setSb] = useState(1); // brightness slider
  const [ss, setSs] = useState(1); // saturation slider
  const [sh, setSh] = useState(0); // hue slider
  const [score, setScore] = useState(0);
  const [last, setLast] = useState<{ acc: number; pts: number } | null>(null);
  const [done, setDone] = useState(false);
  const startRef = useRef(performance.now() / 1000);
  const roundStartRef = useRef(performance.now() / 1000);

  const netB = distort.b * sb;
  const netS = distort.s * ss;
  const netH = distort.h + sh;
  const filter = `brightness(${netB}) saturate(${netS}) hue-rotate(${netH}deg)`;

  const lockIn = () => {
    const bErr = Math.abs(netB - 1), sErr = Math.abs(netS - 1), hErr = Math.abs(netH) / 180;
    const err = (bErr + sErr + hErr) / 3;
    const acc = Math.max(0, 1 - err * 1.5);
    const t = performance.now() / 1000 - roundStartRef.current;
    const speed = Math.max(0, Math.round(280 - t * 28));
    const pts = Math.round(acc * 1000) + speed;
    setScore((s) => s + pts);
    setLast({ acc, pts });
    if (round >= ROUNDS) {
      setDone(true);
    } else {
      setTimeout(() => {
        setRound((r) => r + 1);
        setDistort(newDistort());
        setSb(1); setSs(1); setSh(0); setLast(null);
        roundStartRef.current = performance.now() / 1000;
      }, 1100);
    }
  };

  useEffect(() => {
    if (!done) return;
    const secs = Math.round(performance.now() / 1000 - startRef.current);
    const id = setTimeout(() => onExit(score, secs), 50);
    return () => clearTimeout(id);
  }, [done, score, onExit]);

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>SCORE <b>{score.toString().padStart(6, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, score).toString().padStart(6, '0')}</b></span>
      </div>

      <div className="fc-ct-stage">
        <div className="fc-ct-pair">
          <div className="fc-ct-cell">
            <img src={SCENE} alt="target" className="fc-ct-img" />
            <span>TARGET</span>
          </div>
          <div className="fc-ct-cell">
            <img src={SCENE} alt="yours" className="fc-ct-img" style={{ filter }} />
            <span>SIGNAL</span>
          </div>
        </div>
        {last && (
          <div className="fc-ct-result" style={{ color: last.acc > 0.85 ? '#6cc36a' : last.acc > 0.6 ? '#e7b53c' : '#d94f3d' }}>
            {last.acc > 0.92 ? 'CALIBRATED!' : last.acc > 0.7 ? 'CLOSE' : 'OFF'} +{last.pts}
          </div>
        )}
      </div>

      <div className="fc-ct-sliders">
        <label>BRIGHT<input type="range" min={0.4} max={2.2} step={0.01} value={sb} onChange={(e) => setSb(+e.target.value)} /></label>
        <label>SATUR<input type="range" min={0.1} max={2.4} step={0.01} value={ss} onChange={(e) => setSs(+e.target.value)} /></label>
        <label>HUE<input type="range" min={-90} max={90} step={1} value={sh} onChange={(e) => setSh(+e.target.value)} /></label>
      </div>

      <button className="fc-btn fc-btn-gold fc-ct-lock" onClick={lockIn} disabled={!!last && !done}>LOCK IN ▶</button>
      <div className="fc-fh-foot">drag the sliders until SIGNAL matches TARGET · ⎋ eject</div>
    </div>
  );
}
