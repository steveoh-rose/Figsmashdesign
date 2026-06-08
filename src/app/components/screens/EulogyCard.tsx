/**
 * Tombstone Eulogies & Post-Mortem Review (PRD §3.4).
 * A centered card overlay modeled on the rounded phone-mockup wrapper. Renders a
 * historical preview of the dead design with its final metrics, and a textarea to
 * anchor a post-mortem eulogy onto the plant's persistent object memory.
 */
import { useEffect, useState } from 'react';
import type { PurgedDesign } from '../../garden/types';
import { PlantDoodle } from '../../garden/doodles';
import { GhostBlueprint } from '../../garden/ghost';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function EulogyCard({
  design,
  onSave,
  onClose,
}: {
  design: PurgedDesign;
  onSave: (id: string, eulogy: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(design.eulogyComment);
  const stroke = design.colorPalette[0] || '#3b3bdd';
  const fill = design.colorPalette[1] || stroke;

  // Reset draft when switching plants.
  useEffect(() => setText(design.eulogyComment), [design.id, design.eulogyComment]);

  const commit = () => {
    onSave(design.id, text.trim());
    onClose();
  };

  return (
    <div className="rip-modal" onClick={onClose}>
      <div className="rip-phone" onClick={(e) => e.stopPropagation()}>
        <div className="rip-phone-notch" />

        <div className="rip-phone-preview">
          <GhostBlueprint design={design} width={108} height={132} className="rip-preview-ghost" />
          <PlantDoodle index={design.plantSpriteIndex} stroke={stroke} fill={fill} size={46} className="rip-preview-plant" />
        </div>

        <div className="rip-phone-name" title={design.fileName}>{design.fileName}</div>

        <div className="rip-phone-meta">
          <span>Purged {formatDate(design.timestamp)}</span>
          <span>{design.layerCount} layers destroyed</span>
        </div>

        <div className="rip-swatches">
          {design.colorPalette.map((c, i) => (
            <span key={i} className="rip-swatch" style={{ background: c }} title={c} />
          ))}
        </div>

        <label className="rip-eulogy-label" htmlFor="rip-eulogy">Write your post-mortem eulogy…</label>
        <textarea
          id="rip-eulogy"
          className="rip-eulogy-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Stakeholder changed their minds at the final hour…"
          spellCheck={false}
          autoFocus
        />

        <div className="rip-phone-btns">
          <button className="rip-btn ghost" onClick={onClose}>Close</button>
          <button className="rip-btn prim" onClick={commit}>Done</button>
        </div>
      </div>
    </div>
  );
}
