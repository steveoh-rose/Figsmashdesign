/**
 * React Local Storage Hooks — the sandbox stand-in for the production
 * Figma Client Storage Matrix (figma.clientStorage). Persists the array of
 * PurgedDesign records the whole garden is built from.
 */
import { useCallback, useEffect, useState } from 'react';
import type { BattleDNA, PurgedDesign } from './types';
import { DOODLE_COUNT } from './doodles';

const STORAGE_KEY = 'ripdesigns.garden.v1';

/** Graveyard matrix dimensions — plants populate left-to-right, top-to-bottom. */
export const GRID_COLS = 6;
export const GRID_ROWS = 5;

function load(): PurgedDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: PurgedDesign[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full / blocked — garden lives only for this session */
  }
}

/** Next free coordinate on the matrix, filling row by row. */
function nextCoordinate(count: number) {
  return { x: count % GRID_COLS, y: Math.floor(count / GRID_COLS) % GRID_ROWS };
}

/**
 * Scale Translation (PRD §3.2): layer volume dictates botanical complexity.
 * Small components → minor ferns/sprouts; massive design systems → ancient trees.
 */
export function spriteIndexForLayers(layerCount: number): number {
  const tiers = DOODLE_COUNT; // doodles are authored in ascending complexity
  const buckets = [4, 12, 30, 60, 120, 240, 480]; // layer thresholds
  let idx = 0;
  for (const b of buckets) {
    if (layerCount >= b) idx++;
  }
  return Math.min(idx, tiers - 1);
}

export interface GardenApi {
  designs: PurgedDesign[];
  /** Bury a freshly defeated design and return the new plant record. */
  plant: (dna: BattleDNA, eulogy?: string) => PurgedDesign;
  /** Anchor / overwrite an eulogy onto an existing plant's object memory. */
  writeEulogy: (id: string, eulogy: string) => void;
  /** Remove a plant (e.g. exhume a mistake). */
  remove: (id: string) => void;
}

export function useGarden(): GardenApi {
  const [designs, setDesigns] = useState<PurgedDesign[]>(() => load());

  // Keep tabs/instances in sync — mirrors how clientStorage notifies on change.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDesigns(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const plant = useCallback<GardenApi['plant']>((dna, eulogy = '') => {
    let created: PurgedDesign;
    setDesigns((prev) => {
      created = {
        id: `rip_design_${Math.floor(Date.now() / 1000)}`,
        fileName: dna.fileName,
        timestamp: new Date().toISOString(),
        layerCount: dna.layerCount,
        colorPalette: dna.colorPalette.slice(0, 4),
        eulogyComment: eulogy,
        gardenCoordinates: nextCoordinate(prev.length),
        plantSpriteIndex: spriteIndexForLayers(dna.layerCount),
        image: dna.image,
        defendedBy: dna.defendedBy,
      };
      const next = [...prev, created];
      save(next);
      return next;
    });
    // created is assigned synchronously inside the updater above.
    return created!;
  }, []);

  const writeEulogy = useCallback<GardenApi['writeEulogy']>((id, eulogy) => {
    setDesigns((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, eulogyComment: eulogy } : d));
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback<GardenApi['remove']>((id) => {
    setDesigns((prev) => {
      const next = prev.filter((d) => d.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { designs, plant, writeEulogy, remove };
}
