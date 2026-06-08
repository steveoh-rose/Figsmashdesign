/**
 * Character select — pick the avatar who will defend your design from the
 * Heartless Client. Hand-drawn doodle marks, matching the garden aesthetic.
 * (Difficulty now lives in Settings, not here.)
 */
import { useState } from 'react';
import { CHARACTERS } from '../../game/config';

/** A small single-weight line-art doodle per character, drawn in its colour. */
function CharAvatar({ id, color }: { id: string; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true">
      {id === 'mario' && (
        <>
          <path d="M12 26 C12 16 18 11 24 11 C30 11 36 16 36 26 Z" {...p} fill={color} fillOpacity={0.12} />
          <path d="M12 26 H36" {...p} />
          <circle cx="24" cy="33" r="6" {...p} />
          <path d="M21 33 h6 M24 30 v6" {...p} />
        </>
      )}
      {id === 'pikachu' && (
        <>
          <path d="M26 7 L15 27 H24 L21 41 L34 21 H25 Z" {...p} fill={color} fillOpacity={0.14} />
        </>
      )}
      {id === 'fox' && (
        <>
          <path d="M24 41 C15 41 12 33 16 27 C17 31 19 32 20 32 C18 25 22 19 26 16 C25 22 30 23 31 28 C34 26 34 22 33 20 C38 25 37 35 30 39 C28 40 26 41 24 41 Z" {...p} fill={color} fillOpacity={0.14} />
        </>
      )}
      {id === 'samus' && (
        <>
          <path d="M24 7 C29 13 31 20 31 27 C31 33 28 38 24 41 C20 38 17 33 17 27 C17 20 19 13 24 7 Z" {...p} fill={color} fillOpacity={0.12} />
          <circle cx="24" cy="22" r="4" {...p} />
          <path d="M17 30 L12 40 M31 30 L36 40" {...p} />
        </>
      )}
      {id === 'link' && (
        <>
          <path d="M24 40 C16 40 11 33 13 24 C20 24 25 29 24 40 Z" {...p} fill={color} fillOpacity={0.14} />
          <path d="M24 40 C32 40 37 31 35 21 C28 22 23 29 24 40 Z" {...p} fill={color} fillOpacity={0.14} />
          <path d="M24 40 V20" {...p} />
        </>
      )}
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
            <CharAvatar id={c.id} color={c.color} />
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
