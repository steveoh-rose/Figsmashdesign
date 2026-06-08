/**
 * Character select — pick the avatar who will defend your design from the
 * Heartless Client. Hand-drawn doodle marks, matching the garden aesthetic.
 * (Difficulty now lives in Settings, not here.)
 */
import { useState } from 'react';
import { CHARACTERS } from '../../game/config';

/** A hand-drawn pointer cursor in the character's colour, plus its power emblem. */
function CursorAvatar({ color, ability }: { color: string; ability: string }) {
  const e = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M13 8 L13 33 L19 27 L23 37 L27 35 L23 25 L31 25 Z"
        fill={color}
        stroke="#14144b"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g transform="translate(32,9)">
        {ability === 'fireball' && <circle cx="4" cy="5" r="5" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />}
        {ability === 'lightning' && <path d="M6 -1 L0 7 H4 L2 13" {...e} />}
        {ability === 'fire' && <path d="M4 -1 C8 3 8 8 4 12 C0 8 0 3 4 -1 Z" {...e} fill={color} fillOpacity={0.3} />}
        {ability === 'energy' && (
          <>
            <circle cx="4" cy="5" r="5.5" {...e} />
            <circle cx="4" cy="5" r="1.6" fill={color} stroke="none" />
          </>
        )}
        {ability === 'boomerang' && <path d="M-1 0 C7 0 9 6 6 12 C4 8 1 5 -1 0 Z" {...e} fill={color} fillOpacity={0.3} />}
      </g>
    </svg>
  );
}

export function CharacterSelectRip({
  designName,
  onConfirm,
  onBack,
}: {
  designName: string;
  onConfirm: (charId: string) => void;
  onBack: () => void;
}) {
  const [charId, setCharId] = useState(CHARACTERS[0].id);

  return (
    <div className="rip-screen rip-char">
      <div className="rip-char-head">
        <button className="rip-btn ghost rip-char-back" onClick={onBack}>← Back</button>
        <div className="rip-char-title">
          <h2>Choose your defender</h2>
          <p>The Heartless Client is coming for <b>{designName}</b>. Don't let it smash your work.</p>
        </div>
      </div>

      <div className="rip-char-grid">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`rip-char-card ${c.id === charId ? 'sel' : ''}`}
            onClick={() => setCharId(c.id)}
            style={{ ['--cc' as string]: c.color }}
          >
            <CursorAvatar color={c.color} ability={c.ability} />
            <span className="rip-char-name">{c.name}</span>
            <span className="rip-char-ability">{c.desc}</span>
          </button>
        ))}
      </div>

      <button className="rip-btn prim rip-char-go" onClick={() => onConfirm(charId)}>
        Defend the design ⚔
      </button>
    </div>
  );
}
