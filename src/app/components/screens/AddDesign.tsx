/**
 * "Plant a memory" — the add-new-design screen. Upload a killed design as an
 * image (or pull a stub "preloaded from the plugin"), which becomes the stage
 * you defend in the arena and, once buried, the artifact stored in your garden.
 */
import { useRef, useState } from 'react';
import type { PurgedDesign } from '../../garden/types';
import { PlantDoodle } from '../../garden/doodles';
import { fileToDownscaledDataUrl, pluginStubDesign } from '../../garden/image';
import { BottomNav, type NavTab } from './BottomNav';

export function AddDesign({
  designs,
  onChosen,
  onNavigate,
}: {
  designs: PurgedDesign[];
  onChosen: (design: { image: string; name: string }) => void;
  onNavigate: (t: NavTab) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const recent = designs.slice(-3).reverse();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const image = await fileToDownscaledDataUrl(file);
      onChosen({ image, name: file.name.replace(/\.(png|jpe?g|webp|gif)$/i, '') + '.fig' });
    } catch (e: any) {
      setErr(e?.message || 'Could not load that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rip-screen rip-add">
      <div className="rip-add-head">
        <h1 className="rip-add-title">Defend a design</h1>
        <p className="rip-add-sub">Drop in a killed file and fight to save it from the Heartless Client.</p>
      </div>

      <div className="rip-add-center">
        <button className="rip-add-plus" onClick={() => fileRef.current?.click()} disabled={busy}>
          <span>{busy ? '…' : '+'}</span>
        </button>
        <div className="rip-add-label">{busy ? 'Loading…' : 'Upload a design'}</div>
        <button className="rip-add-plugin" onClick={() => onChosen(pluginStubDesign())} disabled={busy}>
          ⤓ Use a design from the plugin
        </button>
        {err && <div className="rip-add-err">{err}</div>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {recent.length > 0 && (
        <button className="rip-add-gardenpeek" onClick={() => onNavigate('garden')}>
          <span className="rip-add-gardenplants">
            {recent.map((d) => (
              <PlantDoodle
                key={d.id}
                index={d.plantSpriteIndex}
                stroke={d.colorPalette[0] || '#3b3bdd'}
                fill={d.colorPalette[1] || '#3b3bdd'}
                size={26}
              />
            ))}
          </span>
          {designs.length} buried in your garden →
        </button>
      )}

      <BottomNav active="add" onNavigate={onNavigate} />
    </div>
  );
}
