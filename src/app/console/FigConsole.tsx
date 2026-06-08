/**
 * FigConsole 67 — a fictional retro arcade OS you boot while a stakeholder
 * reviews your file. A vintage "Game Creator Pro" desktop holds three
 * cartridges (FigSmash / FigHero / FigContrast); each boots with a cartridge
 * slide-in and tracks a high score + the headline "Time Saved While Waiting".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClock, useConsole, type CartridgeId } from './store';
import { FigHero } from './games/FigHero';
import { FigContrast } from './games/FigContrast';
import './console.css';

type Mode = 'desktop' | 'stageselect' | 'boot' | 'game';

interface SmashStage { id: string; name: string; sub: string; accent: string; }
const SMASH_STAGES: SmashStage[] = [
  { id: 'design', name: 'REVIEW BUILD', sub: 'YOUR .FIG', accent: '#e7b53c' },
  { id: 'spotify', name: 'SPOTIFIGHT', sub: 'MUSIC APP', accent: '#1db954' },
  { id: 'slack', name: 'SMACK', sub: 'CHAT APP', accent: '#b06cd9' },
  { id: 'youtube', name: 'FIGTUBE', sub: 'VIDEO APP', accent: '#ff4d4d' },
];
const SMASH_DIFFS = [
  { id: 'ollama', name: 'INTERN' },
  { id: 'haiku', name: 'JUNIOR' },
  { id: 'sonnet', name: 'SENIOR' },
  { id: 'opus', name: 'DIRECTOR' },
];

interface Cart {
  id: CartridgeId;
  name: string;
  tag: string;
  blurb: string;
  color: string;
  art: React.ReactNode;
}

const SmashArt = () => (
  <svg viewBox="0 0 16 16" className="fc-cartpix">
    <rect width="16" height="16" fill="#2b1740" />
    <rect x="3" y="9" width="10" height="2" fill="#e7b53c" />
    <rect x="5" y="4" width="2" height="4" fill="#d24b3e" /><rect x="4" y="3" width="4" height="1" fill="#d24b3e" />
    <rect x="9" y="5" width="3" height="3" fill="#46c6d9" />
    <rect x="2" y="11" width="12" height="1" fill="#6cc36a" />
  </svg>
);
const HeroArt = () => (
  <svg viewBox="0 0 16 16" className="fc-cartpix">
    <rect width="16" height="16" fill="#16213e" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={2 + i * 3} y={2} width="2" height="12" fill={['#e7b53c', '#b06cd9', '#46c6d9', '#6cc36a'][i]} opacity="0.5" />)}
    {[[0, 4], [1, 7], [2, 5], [3, 9]].map(([l, y], i) => <rect key={i} x={2 + l * 3} y={y} width="2" height="2" fill={['#e7b53c', '#b06cd9', '#46c6d9', '#6cc36a'][l]} />)}
    <rect x="1" y="12" width="14" height="1" fill="#fff" />
  </svg>
);
const ContrastArt = () => (
  <svg viewBox="0 0 16 16" className="fc-cartpix">
    <rect width="8" height="16" fill="#3a7d8c" /><rect x="8" width="8" height="16" fill="#6e3b2a" />
    <rect x="6" y="6" width="4" height="4" fill="#e6c64a" />
    <rect x="2" y="13" width="12" height="1" fill="#f3edc8" />
  </svg>
);

const CARTS: Cart[] = [
  { id: 'figsmash', name: 'FIGSMASH', tag: 'BRAWLER', blurb: 'KO the Unaligned Stakeholder.', color: '#d24b3e', art: <SmashArt /> },
  { id: 'fighero', name: 'FIGHERO', tag: 'RHYTHM', blurb: 'Shortcut muscle-memory drill.', color: '#b06cd9', art: <HeroArt /> },
  { id: 'figcontrast', name: 'FIGCONTRAST', tag: 'CALIBRATE', blurb: 'Dial in the bit-crushed signal.', color: '#46c6d9', art: <ContrastArt /> },
];

const SMASH_DESIGN = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150'><rect width='200' height='150' fill='#f3edc8'/><rect width='200' height='26' fill='#4a2d5c'/><rect x='12' y='40' width='80' height='50' fill='#d24b3e'/><rect x='104' y='40' width='84' height='22' fill='#46c6d9'/><rect x='104' y='70' width='84' height='20' fill='#6cc36a'/><rect x='12' y='104' width='176' height='10' fill='#b06cd9'/><rect x='12' y='124' width='110' height='10' fill='#999'/></svg>`
)}`;

function fmtClock(d: Date) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${days[d.getDay()]} ${h.toString().padStart(2, '0')}:${m}${ampm}`;
}

function fmtSaved(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}H ${m % 60}M`; }
  return `${m}M ${s.toString().padStart(2, '0')}S`;
}

export function FigConsole() {
  const { state, submitScore, addTimeSaved } = useConsole();
  const clock = useClock();
  const [mode, setMode] = useState<Mode>('desktop');
  const [active, setActive] = useState<CartridgeId | null>(null);
  const [selected, setSelected] = useState<CartridgeId>('figsmash');
  const [results, setResults] = useState<{ cart: CartridgeId; score: number; isHigh: boolean; win?: boolean } | null>(null);
  const [smashStage, setSmashStage] = useState('design');
  const [smashDiff, setSmashDiff] = useState('haiku');
  const bootTimer = useRef<number | null>(null);

  const arena = () => (window as any).RIPArena;

  const startBoot = useCallback((id: CartridgeId, after?: () => void) => {
    setActive(id);
    setMode('boot');
    if (bootTimer.current) clearTimeout(bootTimer.current);
    bootTimer.current = window.setTimeout(() => { setMode('game'); after?.(); }, 2300);
  }, []);

  const launchSmash = useCallback(() => {
    startBoot('figsmash', () => {
      document.body.classList.add('rip-arena', 'fc-smash');
      const ra = arena();
      if (!ra) return;
      if (smashStage === 'design') ra.loadImageStage(SMASH_DESIGN, 'review_build_v3.fig', () => ra.startMatch({ charId: 'mario', difficulty: smashDiff }));
      else { ra.setStage(smashStage); ra.startMatch({ charId: 'mario', difficulty: smashDiff }); }
    });
  }, [startBoot, smashStage, smashDiff]);

  // FigSmash routes through stage select first; other carts boot straight in.
  const launch = useCallback((id: CartridgeId) => {
    setSelected(id);
    setResults(null);
    if (id === 'figsmash') { setActive('figsmash'); setMode('stageselect'); return; }
    startBoot(id);
  }, [startBoot]);

  const finishGame = useCallback((id: CartridgeId, score: number, secondsPlayed: number, win?: boolean) => {
    const isHigh = submitScore(id, score);
    addTimeSaved(secondsPlayed);
    document.body.classList.remove('rip-arena', 'fc-smash');
    setActive(null);
    setMode('desktop');
    setResults({ cart: id, score, isHigh, win });
  }, [submitScore, addTimeSaved]);

  const ejectSmash = useCallback(() => {
    arena()?.forfeit?.();
    finishGame('figsmash', 0, 30, false);
  }, [finishGame]);

  // FigSmash result comes from the engine's matchend event.
  useEffect(() => {
    const onEnd = (e: Event) => {
      if (active !== 'figsmash') return;
      const youWin = (e as CustomEvent).detail?.youWin;
      finishGame('figsmash', youWin ? 1200 : 200, 45, youWin);
    };
    window.addEventListener('ripdesigns:matchend', onEnd as EventListener);
    return () => window.removeEventListener('ripdesigns:matchend', onEnd as EventListener);
  }, [active, finishGame]);

  // Esc ejects any cartridge.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mode === 'game' && active === 'figsmash') ejectSmash();
      else if (mode === 'game') { document.body.classList.remove('rip-arena', 'fc-smash'); setActive(null); setMode('desktop'); }
      else if (mode === 'stageselect') { setActive(null); setMode('desktop'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, active, ejectSmash]);

  // FigSmash takes over the whole canvas; render only a thin boss banner.
  if (mode === 'game' && active === 'figsmash') {
    return (
      <div className="fc-smashbar">
        <span className="fc-blink">●</span> BOSS ENCOUNTER: <b>THE UNALIGNED STAKEHOLDER</b> — KO it 3× to ship · <button onClick={ejectSmash}>⎋ EJECT</button>
      </div>
    );
  }

  return (
    <div className="fc-root">
      <div className="fc-window">
        <div className="fc-titlebar">
          <span className="fc-title">GAME CREATOR PRO v1.67</span>
          <span className="fc-clock">{fmtClock(clock)} · 1985</span>
        </div>
        <div className="fc-menubar">
          <span className="fc-menu-exe">💾 EXECUTABLE</span>
          <button className="fc-menu-run" onClick={() => launch(selected)}>▶ RUN</button>
          <span className="fc-menu-edit">🛠 EDIT</span>
          <span className="fc-menu-spacer" />
          <span className="fc-saved">⏱ TIME SAVED <b>{fmtSaved(state.timeSavedSec)}</b></span>
        </div>

        <div className="fc-body">
          {mode === 'game' && active === 'fighero' && (
            <FigHero highScore={state.highScores.fighero} onExit={(s, t) => finishGame('fighero', s, t)} />
          )}
          {mode === 'game' && active === 'figcontrast' && (
            <FigContrast highScore={state.highScores.figcontrast} onExit={(s, t) => finishGame('figcontrast', s, t)} />
          )}

          {mode === 'desktop' && (
            <div className="fc-desktop">
              <div className="fc-carts">
                {CARTS.map((c) => (
                  <button
                    key={c.id}
                    className={`fc-cart ${selected === c.id ? 'sel' : ''}`}
                    style={{ ['--cc' as string]: c.color }}
                    onClick={() => setSelected(c.id)}
                    onDoubleClick={() => launch(c.id)}
                  >
                    <span className="fc-cart-art">{c.art}</span>
                    <span className="fc-cart-name">{c.name}</span>
                    <span className="fc-cart-tag">{c.tag}</span>
                    <span className="fc-cart-hi">HI {state.highScores[c.id].toString().padStart(5, '0')}</span>
                  </button>
                ))}
              </div>
              <div className="fc-sidebar">
                <div className="fc-drive">💾 HD</div>
                <div className="fc-drive">💾 CORE</div>
                <div className="fc-drive">🗑 BIN</div>
                <div className="fc-sidenote">
                  <div className="fc-sel-name">{CARTS.find((c) => c.id === selected)?.name}</div>
                  <div className="fc-sel-blurb">{CARTS.find((c) => c.id === selected)?.blurb}</div>
                  <button className="fc-btn fc-btn-gold fc-insert" onClick={() => launch(selected)}>INSERT ▶</button>
                </div>
              </div>
            </div>
          )}

          {mode === 'stageselect' && (
            <div className="fc-stagesel">
              <div className="fc-ss-title">▶ SELECT STAGE</div>
              <div className="fc-ss-grid">
                {SMASH_STAGES.map((s) => (
                  <button
                    key={s.id}
                    className={`fc-ss-card ${smashStage === s.id ? 'sel' : ''}`}
                    style={{ ['--cc' as string]: s.accent }}
                    onClick={() => setSmashStage(s.id)}
                    onDoubleClick={launchSmash}
                  >
                    <span className="fc-ss-prev">
                      <i className="fc-ss-bar" style={{ background: s.accent }} />
                      <i className="fc-ss-blk" style={{ background: s.accent }} />
                      <i className="fc-ss-row" /><i className="fc-ss-row short" />
                    </span>
                    <span className="fc-ss-name">{s.name}</span>
                    <span className="fc-ss-sub">{s.sub}</span>
                  </button>
                ))}
              </div>
              <div className="fc-ss-diff">
                <span className="fc-ss-difflabel">CLIENT IQ</span>
                {SMASH_DIFFS.map((d) => (
                  <button key={d.id} className={smashDiff === d.id ? 'on' : ''} onClick={() => setSmashDiff(d.id)}>{d.name}</button>
                ))}
              </div>
              <div className="fc-ss-btns">
                <button className="fc-btn" onClick={() => { setActive(null); setMode('desktop'); }}>← DESKTOP</button>
                <button className="fc-btn fc-btn-gold" onClick={launchSmash}>FIGHT! ▶</button>
              </div>
            </div>
          )}

          {mode === 'boot' && active && (
            <div className="fc-boot">
              <div className="fc-slot">
                <div className="fc-cartridge" style={{ ['--cc' as string]: CARTS.find((c) => c.id === active)?.color }}>
                  <span className="fc-cartridge-label">{CARTS.find((c) => c.id === active)?.art}</span>
                  <span className="fc-cartridge-name">{CARTS.find((c) => c.id === active)?.name}</span>
                </div>
                <div className="fc-slotmouth" />
              </div>
              <div className="fc-bootmsg">
                <span className="fc-blink">▌</span> LOADING {CARTS.find((c) => c.id === active)?.name}.ROM …
              </div>
            </div>
          )}
        </div>

        <div className="fc-statusbar">
          <span>FIGCONSOLE 67</span>
          <span>{mode === 'desktop' ? 'READY.' : mode === 'stageselect' ? 'SELECT STAGE' : mode === 'boot' ? 'BOOTING…' : 'RUNNING'}</span>
          <span className="fc-blink">_</span>
        </div>
      </div>

      {results && (
        <div className="fc-results" onClick={() => setResults(null)}>
          <div className="fc-results-box" onClick={(e) => e.stopPropagation()} style={{ ['--cc' as string]: CARTS.find((c) => c.id === results.cart)?.color }}>
            {results.cart === 'figsmash' ? (
              <div className="fc-approved">{results.win ? '★ FILE APPROVED! ★' : 'REVIEW BLOCKED'}</div>
            ) : (
              <>
                <div className="fc-results-title">{CARTS.find((c) => c.id === results.cart)?.name} · GAME OVER</div>
                <div className="fc-results-score">{results.score.toString().padStart(6, '0')}</div>
                {results.isHigh && <div className="fc-results-hi">★ NEW HIGH SCORE ★</div>}
              </>
            )}
            <div className="fc-results-btns">
              <button className="fc-btn" onClick={() => setResults(null)}>DESKTOP</button>
              <button className="fc-btn fc-btn-gold" onClick={() => launch(results.cart)}>RETRY ▶</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
