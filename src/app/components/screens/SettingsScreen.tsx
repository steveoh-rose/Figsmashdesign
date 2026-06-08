/**
 * Settings — where the AI difficulty lives now (no longer chosen before each
 * arena run). Lower = a dumber, slower Heartless Client that's easy to KO.
 */
import { useState } from 'react';
import { LEVELS } from '../../game/config';
import { getDifficulty, setDifficulty, type Difficulty } from '../../garden/settings';
import { BottomNav } from './BottomNav';

const LABELS: Record<string, string> = { ollama: 'Ollama', haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' };

export function SettingsScreen({ onNavigate }: { onNavigate: (t: 'garden' | 'add' | 'settings') => void }) {
  const [difficulty, setDiff] = useState<Difficulty>(getDifficulty());

  const choose = (d: Difficulty) => {
    setDiff(d);
    setDifficulty(d);
  };

  return (
    <div className="rip-screen rip-settings">
      <div className="rip-settings-inner">
        <h2 className="rip-settings-title">Settings</h2>
        <p className="rip-settings-sub">How heartless is the client trying to smash your designs?</p>

        <div className="rip-settings-list">
          {LEVELS.map((L) => (
            <button
              key={L.id}
              className={`rip-settings-opt ${difficulty === L.id ? 'on' : ''}`}
              onClick={() => choose(L.id as Difficulty)}
            >
              <span className="rip-settings-optname">{LABELS[L.id] || L.id}</span>
              <span className="rip-settings-optdesc">{L.desc}</span>
              {difficulty === L.id && <span className="rip-settings-check">✓</span>}
            </button>
          ))}
        </div>

        <p className="rip-settings-note">Lower settings make the client slower, clumsier, and easier to knock out.</p>
      </div>

      <BottomNav active="settings" onNavigate={onNavigate} />
    </div>
  );
}
