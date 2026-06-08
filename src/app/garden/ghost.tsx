/**
 * Ghost Blueprint (PRD §3.3) — a low-opacity, glowing wireframe reconstruction of
 * the destroyed layout. The original frame data isn't kept in the sandbox, so we
 * deterministically regenerate a plausible layout from the design's id + layer
 * count, tinted with its ingested palette. Same id always yields the same ghost.
 */
import type { PurgedDesign } from './types';

function seededRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function GhostBlueprint({
  design,
  width = 120,
  height = 150,
  className,
  style,
}: {
  design: Pick<PurgedDesign, 'id' | 'layerCount' | 'colorPalette'>;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const rng = seededRng(hashStr(design.id));
  const palette = design.colorPalette.length ? design.colorPalette : ['#0d99ff'];
  const n = Math.max(4, Math.min(14, Math.round(Math.sqrt(design.layerCount) + 3)));
  const pad = 8;
  const rects = Array.from({ length: n }, (_, i) => {
    const w = (0.18 + rng() * 0.7) * (width - pad * 2);
    const h = (0.05 + rng() * 0.22) * (height - pad * 2);
    const x = pad + rng() * (width - pad * 2 - w);
    const y = pad + rng() * (height - pad * 2 - h);
    const c = palette[i % palette.length];
    const round = rng() > 0.5;
    return { x, y, w, h, c, round, key: i };
  });

  return (
    <svg
      className={className}
      style={style}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <rect x={2} y={2} width={width - 4} height={height - 4} rx={10} stroke={palette[0]} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3 3" />
      {rects.map((r) => (
        <rect
          key={r.key}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={r.round ? 4 : 1}
          fill={r.c}
          fillOpacity={0.14}
          stroke={r.c}
          strokeWidth={1}
          strokeOpacity={0.85}
        />
      ))}
    </svg>
  );
}
