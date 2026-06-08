/** Persisted player settings (the figma.clientStorage stand-in). */
export type Difficulty = 'ollama' | 'haiku' | 'sonnet' | 'opus';

const KEY = 'ripdesigns.difficulty';

export function getDifficulty(): Difficulty {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ollama' || v === 'haiku' || v === 'sonnet' || v === 'opus') return v;
  } catch {
    /* ignore */
  }
  return 'ollama'; // default: easy — a dumb, slow client
}

export function setDifficulty(d: Difficulty) {
  try {
    localStorage.setItem(KEY, d);
  } catch {
    /* ignore */
  }
}
