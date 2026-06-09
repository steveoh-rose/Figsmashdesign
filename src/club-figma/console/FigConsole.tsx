/**
 * FigConsole 67 — the "Game Creator Pro" retro desktop that fronts the Arcade.
 * Ported from rip-designs-catharsis-garden and adapted for Club Figma: it is a
 * pure cartridge selector that hands the chosen game back to ClubFigmaWorld
 * (which owns the actual game overlays), rather than running the games itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClock, useConsole, type CartridgeId } from './store';
import { VoxelGhost, VoxelSmiley, VoxelEye, VoxelTriangle } from './voxel';
import './console.css';

type Mode = 'desktop' | 'boot';

interface Cart {
  id: CartridgeId;
  name: string;
  tag: string;
  blurb: string;
  color: string;
  art: React.ReactNode;
}

const CARTS: Cart[] = [
  { id: 'figsmash',    name: 'FigSmash',    tag: 'BRAWLER',   blurb: 'KO the Unaligned Stakeholder.', color: '#ef5d52', art: <VoxelGhost /> },
  { id: 'fighero',     name: 'FigHero',     tag: 'RHYTHM',    blurb: 'Shortcut muscle-memory drill.', color: '#4d7cff', art: <VoxelSmiley /> },
  { id: 'figcontrast', name: 'FigContrast', tag: 'CALIBRATE', blurb: 'Memorise + rebuild the colour.', color: '#2ec4b6', art: <VoxelEye /> },
  { id: 'figalign',    name: 'FigAlign',    tag: 'SHAPE',     blurb: 'Memorise + rebuild the shape.',  color: '#ff9f43', art: <VoxelTriangle /> },
];

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

export function FigConsole({ onLaunch, onExit }: { onLaunch: (id: CartridgeId) => void; onExit: () => void }) {
  const { state } = useConsole();
  const clock = useClock();
  const [mode, setMode] = useState<Mode>('desktop');
  const [active, setActive] = useState<CartridgeId | null>(null);
  const [selected, setSelected] = useState<CartridgeId>('figsmash');
  const bootTimer = useRef<number | null>(null);

  // Slot the cartridge in (visual boot) then hand off to the parent's game system.
  const launch = useCallback((id: CartridgeId) => {
    setSelected(id);
    setActive(id);
    setMode('boot');
    if (bootTimer.current) clearTimeout(bootTimer.current);
    bootTimer.current = window.setTimeout(() => onLaunch(id), 1300);
  }, [onLaunch]);

  useEffect(() => () => { if (bootTimer.current) clearTimeout(bootTimer.current); }, []);

  const sel = CARTS.find((c) => c.id === selected)!;
  const booting = mode === 'boot' && active ? CARTS.find((c) => c.id === active)! : null;

  return (
    <div className="fc-root">
      <div className="fc-window">
        <div className="fc-titlebar">
          <button className="fc-close" aria-label="Close to lobby" onClick={onExit}><i /></button>
          <span className="fc-title">GAME CREATOR PRO v1.67</span>
          <span className="fc-clock">{fmtClock(clock)}</span>
        </div>
        <div className="fc-menubar">
          <span className="fc-menu-exe">💾 EXECUTABLE</span>
          <button className="fc-menu-run" onClick={() => launch(selected)}>▶ RUN</button>
          <span className="fc-menu-edit">🛠 EDIT</span>
          <span className="fc-menu-spacer" />
          <span className="fc-saved">⏱ TIME SAVED <b>{fmtSaved(state.timeSavedSec)}</b></span>
        </div>

        <div className="fc-body">
          {!booting && (
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
                  <div className="fc-sel-name">{sel.name}</div>
                  <div className="fc-sel-blurb">{sel.blurb}</div>
                  <button className="fc-btn fc-btn-gold fc-insert" onClick={() => launch(selected)}>INSERT ▶</button>
                </div>
              </div>
            </div>
          )}

          {booting && (
            <div className="fc-boot">
              <div className="fc-slot">
                <div className="fc-cartridge" style={{ ['--cc' as string]: booting.color }}>
                  <span className="fc-cartridge-label">{booting.art}</span>
                  <span className="fc-cartridge-name">{booting.name}</span>
                </div>
                <div className="fc-slotmouth" />
              </div>
              <div className="fc-bootmsg">
                <span className="fc-blink">▌</span> LOADING {booting.name}.ROM …
              </div>
            </div>
          )}
        </div>

        <div className="fc-statusbar">
          <span>FIGCONSOLE 67</span>
          <span>{booting ? 'BOOTING…' : 'READY.'}</span>
          <span className="fc-blink">_</span>
        </div>
      </div>
    </div>
  );
}
