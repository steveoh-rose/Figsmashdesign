/**
 * The Garden home — the start screen after login and the heart of the app.
 * A light, dotted-matrix canvas where every buried design has bloomed into a
 * doodle plant. Modeled on the bullet-journal "year garden" reference.
 */
import { useState } from 'react';
import type { PurgedDesign } from '../../garden/types';
import { GRID_COLS, GRID_ROWS } from '../../garden/storage';
import { PlantDoodle } from '../../garden/doodles';
import { GhostBlueprint } from '../../garden/ghost';
import { BottomNav } from './BottomNav';

export function GardenHome({
  designs,
  onSelect,
  onAdd,
}: {
  designs: PurgedDesign[];
  onSelect: (d: PurgedDesign) => void;
  onAdd: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const year = new Date().getFullYear();

  const byCoord = new Map<string, PurgedDesign>();
  for (const d of designs) byCoord.set(`${d.gardenCoordinates.x},${d.gardenCoordinates.y}`, d);
  const totalLayers = designs.reduce((s, d) => s + d.layerCount, 0);
  const rows = Math.max(GRID_ROWS, Math.ceil((designs.length + 1) / GRID_COLS) + 1);

  return (
    <div className="rip-screen rip-home">
      <div className="rip-home-top">
        <button className="rip-year" onClick={onAdd} title="Plant a new memory">{year}</button>
      </div>

      <div className="rip-home-scroll">
        <div className="rip-grid rip-grid-home" style={{ ['--cols' as string]: GRID_COLS, ['--rows' as string]: rows }}>
          {Array.from({ length: rows }).map((_, y) =>
            Array.from({ length: GRID_COLS }).map((__, x) => {
              const d = byCoord.get(`${x},${y}`);
              const isHover = d && hovered === d.id;
              return (
                <div className="rip-plot" key={`${x},${y}`}>
                  <span className="rip-dot" />
                  {d && (
                    <button
                      className="rip-plant"
                      onMouseEnter={() => setHovered(d.id)}
                      onMouseLeave={() => setHovered((h) => (h === d.id ? null : h))}
                      onClick={() => onSelect(d)}
                      aria-label={`Open ${d.fileName}`}
                    >
                      {isHover && (
                        <span className="rip-ghost-pop">
                          <GhostBlueprint design={d} width={84} height={104} />
                          <em>{d.fileName}</em>
                        </span>
                      )}
                      <PlantDoodle
                        index={d.plantSpriteIndex}
                        stroke={d.colorPalette[0] || '#3b3bdd'}
                        fill={d.colorPalette[1] || d.colorPalette[0] || '#3b3bdd'}
                        size={46}
                      />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {designs.length === 0 ? (
        <p className="rip-home-empty">
          Your garden is bare.<br />Tap <b>{year}</b> or the gear below to bury your first design.
        </p>
      ) : (
        <p className="rip-home-stats">
          <b>{designs.length}</b> buried · <b>{totalLayers}</b> layers laid to rest
        </p>
      )}

      <BottomNav active="garden" onNavigate={(t) => t === 'add' && onAdd()} />
    </div>
  );
}
