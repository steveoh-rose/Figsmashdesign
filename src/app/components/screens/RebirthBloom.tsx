/**
 * The Rebirth Bloom (PRD §3.2).
 * Triggered when the Heartless Client is defeated. The combat fades out and a
 * serene atmosphere fades in. The destroyed frame's data signature is read to
 * grow a custom botanical sprite (Color Ingestion + Scale Translation), which the
 * designer names, eulogizes, and plants in the garden.
 */
import { useState } from 'react';
import type { BattleDNA } from '../../garden/types';
import { spriteIndexForLayers } from '../../garden/storage';
import { PlantDoodle } from '../../garden/doodles';

export function RebirthBloom({
  dna,
  onPlant,
  onSkip,
}: {
  dna: BattleDNA;
  /** Returns the eulogy + (possibly edited) file name to bury. */
  onPlant: (finalDna: BattleDNA, eulogy: string) => void;
  onSkip: () => void;
}) {
  const [fileName, setFileName] = useState(dna.fileName);
  const [eulogy, setEulogy] = useState('');
  const spriteIndex = spriteIndexForLayers(dna.layerCount);
  const stroke = dna.colorPalette[0] || '#3b3bdd';
  const fill = dna.colorPalette[1] || stroke;

  const commit = () => onPlant({ ...dna, fileName: fileName.trim() || dna.fileName }, eulogy.trim());

  return (
    <div className="rip-bloom show">
      <div className="rip-bloom-sky" />
      <div className="rip-bloom-inner">
        <div className="rip-bloom-kicker">layer integrity 0% — the client is defeated</div>
        <h1 className="rip-bloom-title">The Rebirth Bloom</h1>

        <div className="rip-bloom-stage">
          {dna.image && <img src={dna.image} alt="" className="rip-bloom-relic" />}
          <div className="rip-bloom-soil" />
          <div className="rip-bloom-grow" key={dna.fileName}>
            <PlantDoodle index={spriteIndex} stroke={stroke} fill={fill} size={120} />
          </div>
        </div>

        <div className="rip-bloom-dna">
          <span>Color ingested</span>
          <div className="rip-swatches">
            {dna.colorPalette.map((c, i) => (
              <span key={i} className="rip-swatch" style={{ background: c }} title={c} />
            ))}
          </div>
          <span className="rip-bloom-scale">{dna.layerCount} layers → {plantName(spriteIndex)}</span>
        </div>

        <input
          className="rip-bloom-fname"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          spellCheck={false}
          aria-label="File name"
        />

        <textarea
          className="rip-eulogy-input on-dark"
          value={eulogy}
          onChange={(e) => setEulogy(e.target.value)}
          placeholder="Write your post-mortem eulogy… (why was this file killed?)"
          spellCheck={false}
        />

        <div className="rip-bloom-btns">
          <button className="rip-btn ghost on-dark" onClick={onSkip}>Not now</button>
          <button className="rip-btn prim" onClick={commit}>Plant in Garden 🌱</button>
        </div>
      </div>
    </div>
  );
}

function plantName(index: number): string {
  return ['a sprout', 'a fern', 'a tulip', 'a daisy', 'a mushroom cluster', 'a shrub', 'a flowering branch', 'an ancient tree'][
    Math.min(index, 7)
  ];
}
