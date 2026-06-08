/**
 * Orchestrates the catharsis garden experience that sits on top of the Smash
 * Arena: the Rebirth Bloom transition, the persistent graveyard grid, and the
 * eulogy cards. Bridges from the vanilla game engine via the #wingarden button
 * (and a `ripdesigns:bloom` CustomEvent) which hand off the defeated design's DNA.
 */
import { useEffect, useState } from 'react';
import type { BattleDNA } from '../garden/types';
import { useGarden } from '../garden/storage';
import { RebirthBloom } from './screens/RebirthBloom';
import { GardenView } from './screens/GardenView';
import { EulogyCard } from './screens/EulogyCard';

const FALLBACK_DNA: BattleDNA = {
  fileName: 'Untitled_v1_client_edits.fig',
  layerCount: 24,
  colorPalette: ['#0052CC', '#FF5630', '#F4F5F7'],
};

function readDna(): BattleDNA {
  const d = (window as any).__ripBattleDNA;
  if (d && Array.isArray(d.colorPalette) && d.colorPalette.length) return d as BattleDNA;
  return FALLBACK_DNA;
}

export function GardenLayer() {
  const garden = useGarden();
  const [bloomDna, setBloomDna] = useState<BattleDNA | null>(null);
  const [gardenOpen, setGardenOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Bridge: the win screen's "Bury & Bloom" button + an engine CustomEvent.
  useEffect(() => {
    const openBloom = () => {
      document.getElementById('winscreen')?.classList.remove('show');
      setGardenOpen(false);
      setBloomDna(readDna());
    };
    const btn = document.getElementById('wingarden');
    btn?.addEventListener('click', openBloom);
    window.addEventListener('ripdesigns:bloom', openBloom as EventListener);
    return () => {
      btn?.removeEventListener('click', openBloom);
      window.removeEventListener('ripdesigns:bloom', openBloom as EventListener);
    };
  }, []);

  const selected = selectedId ? garden.designs.find((d) => d.id === selectedId) ?? null : null;

  const handlePlant = (dna: BattleDNA, eulogy: string) => {
    garden.plant(dna, eulogy);
    setBloomDna(null);
    setGardenOpen(true);
  };

  const returnToArena = () => {
    setGardenOpen(false);
    document.getElementById('winrematch')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  return (
    <>
      <button className="rip-open-garden" onClick={() => setGardenOpen(true)} title="Open the Catharsis Garden">
        🪦 Garden
        {garden.designs.length > 0 && <span className="rip-open-count">{garden.designs.length}</span>}
      </button>

      {bloomDna && (
        <RebirthBloom dna={bloomDna} onPlant={handlePlant} onSkip={() => setBloomDna(null)} />
      )}

      <GardenView
        designs={garden.designs}
        open={gardenOpen}
        onSelect={(d) => setSelectedId(d.id)}
        onClose={() => setGardenOpen(false)}
        onReturnToArena={returnToArena}
      />

      {selected && (
        <EulogyCard design={selected} onSave={garden.writeEulogy} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
