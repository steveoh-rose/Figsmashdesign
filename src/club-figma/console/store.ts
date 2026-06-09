import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'figconsole67.v1';

export type CartridgeId = 'figsmash' | 'fighero' | 'figcontrast' | 'figalign';

export interface ConsoleState {
  timeSavedSec: number;
  highScores: Record<CartridgeId, number>;
}

const DEFAULT: ConsoleState = {
  timeSavedSec: 0,
  highScores: { figsmash: 0, fighero: 0, figcontrast: 0, figalign: 0 },
};

function load(): ConsoleState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...DEFAULT, ...p, highScores: { ...DEFAULT.highScores, ...(p.highScores || {}) } };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT, highScores: { ...DEFAULT.highScores } };
}

function save(s: ConsoleState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export interface ConsoleApi {
  state: ConsoleState;
  submitScore: (id: CartridgeId, score: number) => boolean;
  addTimeSaved: (sec: number) => void;
}

export function useConsole(): ConsoleApi {
  const [state, setState] = useState<ConsoleState>(() => load());
  const ref = useRef(state);
  ref.current = state;

  const submitScore = useCallback<ConsoleApi['submitScore']>((id, score) => {
    let isHigh = false;
    setState((prev) => {
      if (score <= (prev.highScores[id] || 0)) return prev;
      isHigh = true;
      const next = { ...prev, highScores: { ...prev.highScores, [id]: score } };
      save(next);
      return next;
    });
    return isHigh;
  }, []);

  const addTimeSaved = useCallback<ConsoleApi['addTimeSaved']>((sec) => {
    setState((prev) => {
      const next = { ...prev, timeSavedSec: prev.timeSavedSec + Math.max(0, Math.round(sec)) };
      save(next);
      return next;
    });
  }, []);

  return { state, submitScore, addTimeSaved };
}

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return now;
}
