/**
 * Character select — pick the avatar who will defend your design from the
 * Heartless Client, and how ruthless that client is. Doodle-themed to match the
 * garden rather than the old Smash-style screen.
 */
import { useState } from 'react';
import { CHARACTERS, LEVELS, type CursorShape } from '../../game/config';

function CursorMark({ shape, color }: { shape: CursorShape; color: string }) {
  const common = { fill: color, stroke: color, strokeWidth: 2, strokeLinejoin: 'round' as const };
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      {shape === 'arrow' && <path d="M12 8 L12 34 L19 27 L24 37 L28 35 L23 25 L32 25 Z" {...common} />}
      {shape === 'triangle' && <path d="M22 8 L34 34 L10 34 Z" {...common} fill={color} />}
      {shape === 'diamond' && <path d="M22 7 L35 22 L22 37 L9 22 Z" {...common} />}
      {shape === 'ring' && <circle cx="22" cy="22" r="13" fill="none" stroke={color} strokeWidth="5" />}
      {shape === 'plus' && <path d="M18 9 H26 V18 H35 V26 H26 V35 H18 V26 H9 V18 H18 Z" {...common} />}
    </svg>
  );
}

const DIFF_LABELS: Record<string, string> = { ollama: 'Ollama', haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' };

export function CharacterSelectRip({
  designName,
  onConfirm,
  onBack,
}: {
  designName: string;
  onConfirm: (charId: string, difficulty: string) => void;
  onBack: () => void;
}) {
  const [charId, setCharId] = useState(CHARACTERS[0].id);
  const [difficulty, setDifficulty] = useState('haiku');
  const sel = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];

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
            <CursorMark shape={c.shape} color={c.color} />
            <span className="rip-char-name">{c.name}</span>
            <span className="rip-char-ability">{c.desc}</span>
          </button>
        ))}
      </div>

      <div className="rip-char-diff">
        <span className="rip-char-difflabel">How heartless?</span>
        <div className="rip-char-diffseg">
          {LEVELS.map((L) => (
            <button
              key={L.id}
              className={difficulty === L.id ? 'on' : ''}
              onClick={() => setDifficulty(L.id)}
              title={L.desc}
            >
              {DIFF_LABELS[L.id] || L.id}
            </button>
          ))}
        </div>
      </div>

      <button className="rip-btn prim rip-char-go" onClick={() => onConfirm(sel.id, difficulty)}>
        Defend the design ⚔
      </button>
    </div>
  );
}
