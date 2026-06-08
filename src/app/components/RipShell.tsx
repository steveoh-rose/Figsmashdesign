/**
 * RIP Designs app shell. The garden is no longer a modal bolted onto the game —
 * it IS the app. This drives the whole seamless flow:
 *
 *   start (login) → garden (home) → add (plant memory) → character select
 *     → arena (defend the design from the Heartless Client) → bloom (plant it)
 *
 * The vanilla canvas engine is used only for the arena, driven through
 * window.RIPArena and the `ripdesigns:matchend` event.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BattleDNA } from '../garden/types';
import { useGarden } from '../garden/storage';
import { getDifficulty } from '../garden/settings';
import { StartScreen } from './screens/StartScreen';
import { GardenHome } from './screens/GardenHome';
import { AddDesign } from './screens/AddDesign';
import { SettingsScreen } from './screens/SettingsScreen';
import { CharacterSelectRip } from './screens/CharacterSelectRip';
import { ArenaOverlay } from './screens/ArenaOverlay';
import { RebirthBloom } from './screens/RebirthBloom';
import { EulogyCard } from './screens/EulogyCard';

type Phase = 'start' | 'garden' | 'add' | 'settings' | 'character' | 'arena' | 'bloom';
type NavTab = 'garden' | 'add' | 'settings';

interface RIPArena {
  loadImageStage: (dataUrl: string, name: string, cb?: (info: { palette: string[] }) => void) => void;
  startMatch: (opts: { charId: string; difficulty: string }) => void;
  forfeit: () => void;
}

export function RipShell() {
  const garden = useGarden();
  const [phase, setPhase] = useState<Phase>('start');
  const [pending, setPending] = useState<{ image: string; name: string } | null>(null);
  const [bloomDna, setBloomDna] = useState<BattleDNA | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lost, setLost] = useState(false);
  const lastMatch = useRef<{ charId: string; difficulty: string } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const arena = () => (window as any).RIPArena as RIPArena | undefined;

  // Toggle a body class so CSS can declutter the engine chrome during combat.
  useEffect(() => {
    document.body.classList.toggle('rip-arena', phase === 'arena');
  }, [phase]);

  // The arena hands back the result when the match ends.
  useEffect(() => {
    const onEnd = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.youWin) {
        const dna: BattleDNA = {
          fileName: detail.dna?.fileName || pendingRef.current?.name || 'Untitled.fig',
          layerCount: detail.dna?.layerCount ?? 12,
          colorPalette: detail.dna?.colorPalette || ['#0052CC', '#FF5630', '#F4F5F7'],
          image: detail.dna?.image || pendingRef.current?.image,
          defendedBy: detail.dna?.defendedBy,
        };
        setLost(false);
        setBloomDna(dna);
        setPhase('bloom');
      } else {
        setLost(true);
      }
    };
    window.addEventListener('ripdesigns:matchend', onEnd);
    return () => window.removeEventListener('ripdesigns:matchend', onEnd);
  }, []);

  const enterArena = useCallback((charId: string) => {
    const difficulty = getDifficulty();
    lastMatch.current = { charId, difficulty };
    const ra = arena();
    setLost(false);
    setPhase('arena');
    if (ra && pendingRef.current) {
      ra.loadImageStage(pendingRef.current.image, pendingRef.current.name, () => {
        ra.startMatch({ charId, difficulty });
      });
    } else if (ra) {
      ra.startMatch({ charId, difficulty });
    }
  }, []);

  // Bottom-nav routing shared by garden / add / settings screens.
  const navigate = useCallback((t: NavTab) => setPhase(t), []);
  // Empty garden? Send the player straight to uploading their first design.
  const enterFromStart = useCallback(() => {
    setPhase(garden.designs.length === 0 ? 'add' : 'garden');
  }, [garden.designs.length]);

  const retry = useCallback(() => {
    setLost(false);
    if (lastMatch.current) arena()?.startMatch(lastMatch.current);
  }, []);

  const leaveArena = useCallback(() => {
    arena()?.forfeit();
    setLost(false);
    setPending(null);
    setPhase('garden');
  }, []);

  const handlePlant = (dna: BattleDNA, eulogy: string) => {
    garden.plant(dna, eulogy);
    setBloomDna(null);
    setPending(null);
    setPhase('garden');
  };

  const skipBloom = () => {
    setBloomDna(null);
    setPending(null);
    setPhase('garden');
  };

  const selected = selectedId ? garden.designs.find((d) => d.id === selectedId) ?? null : null;

  return (
    <div className="rip-shell">
      {phase === 'start' && <StartScreen onEnter={enterFromStart} />}

      {phase === 'garden' && (
        <GardenHome
          designs={garden.designs}
          onSelect={(d) => setSelectedId(d.id)}
          onAdd={() => setPhase('add')}
          onNavigate={navigate}
        />
      )}

      {phase === 'add' && (
        <AddDesign
          designs={garden.designs}
          onChosen={(d) => {
            setPending(d);
            setPhase('character');
          }}
          onNavigate={navigate}
        />
      )}

      {phase === 'settings' && <SettingsScreen onNavigate={navigate} />}

      {phase === 'character' && (
        <CharacterSelectRip
          designName={pending?.name || 'your design'}
          onConfirm={enterArena}
          onBack={() => setPhase('add')}
        />
      )}

      {phase === 'arena' && (
        <ArenaOverlay
          designName={pending?.name || 'your design'}
          lost={lost}
          onRetry={retry}
          onGiveUp={leaveArena}
          onForfeit={leaveArena}
        />
      )}

      {bloomDna && (
        <RebirthBloom dna={bloomDna} onPlant={handlePlant} onSkip={skipBloom} />
      )}

      {selected && (
        <EulogyCard design={selected} onSave={garden.writeEulogy} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
