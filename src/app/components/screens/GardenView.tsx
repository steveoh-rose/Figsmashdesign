/**
 * The Persistent Graveyard Grid (PRD §3.3).
 * An eggshell-white canvas with a persistent dotted graph matrix. Every purged
 * design occupies a coordinate; hovering reveals a glowing ghost blueprint of the
 * destroyed layout and its original file name; clicking opens the eulogy card.
 */
import { useState } from 'react';
import type { PurgedDesign } from '../../garden/types';
import { GRID_COLS, GRID_ROWS } from '../../garden/storage';
import { PlantDoodle } from '../../garden/doodles';
import { GhostBlueprint } from '../../garden/ghost';

export function GardenView({
  designs,
  open,
  onSelect,
  onClose,
  onReturnToArena,
}: {
  designs: PurgedDesign[];
  open: boolean;
  onSelect: (d: PurgedDesign) => void;
  onClose: () => void;
  onReturnToArena: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byCoord = new Map<string, PurgedDesign>();
  for (const d of designs) byCoord.set(`${d.gardenCoordinates.x},${d.gardenCoordinates.y}`, d);

  const totalLayers = designs.reduce((sum, d) => sum + d.layerCount, 0);

  return (
    <div className={`rip-garden ${open ? 'show' : ''}`}>
      <div className="rip-garden-paper">
        <header className="rip-garden-head">
          <h1>RIP Designs</h1>
          <p>The Catharsis Garden — one buried file, one bloom.</p>
        </header>

        <div className="rip-grid" style={{ ['--cols' as string]: GRID_COLS, ['--rows' as string]: GRID_ROWS }}>
          {Array.from({ length: GRID_ROWS }).map((_, y) =>
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
                      aria-label={`Eulogy for ${d.fileName}`}
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
                        size={48}
                      />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="rip-garden-foot">
          <div className="rip-garden-stats">
            <b>{designs.length}</b> buried · <b>{totalLayers}</b> layers laid to rest
          </div>
          <div className="rip-garden-actions">
            <button className="rip-btn ghost" onClick={onClose}>Close</button>
            <button className="rip-btn prim" onClick={onReturnToArena}>Back to the Arena ⚔</button>
          </div>
        </footer>

        {designs.length === 0 && (
          <div className="rip-garden-empty">
            Your garden is bare. Defeat the Heartless Client in the Arena to bury your first design.
          </div>
        )}
      </div>
    </div>
  );
}
