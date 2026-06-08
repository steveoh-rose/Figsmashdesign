/**
 * The Flora Sprite Engine (PRD §2 / §3.2).
 * Single-weight line-art botanical doodles. Each sprite inherits the destroyed
 * design's primary HEX as its stroke and secondary HEX as its petal/canopy fill —
 * "Color Ingestion". Authored in ascending order of complexity so that layer
 * volume can pick a richer plant for heavier design systems ("Scale Translation").
 */

export interface DoodleProps {
  /** Primary HEX — the line work. */
  stroke?: string;
  /** Secondary HEX — petal / leaf / canopy fills. */
  fill?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

type Render = (stroke: string, fill: string) => React.ReactNode;

/** 0 — Sprout: the smallest components. */
const sprout: Render = (s, f) => (
  <>
    <path d="M32 84 C32 72 31 60 32 50" stroke={s} />
    <path d="M32 62 C22 60 16 52 15 43 C25 44 32 52 32 62 Z" stroke={s} fill={f} />
    <path d="M32 56 C42 53 49 46 51 37 C41 37 33 45 32 56 Z" stroke={s} fill={f} />
  </>
);

/** 1 — Fern. */
const fern: Render = (s, f) => (
  <>
    <path d="M32 84 C32 62 31 42 32 22" stroke={s} />
    {[58, 50, 42, 34].map((y, i) => (
      <g key={i}>
        <path d={`M32 ${y} C24 ${y - 3} 18 ${y - 6} 14 ${y - 11}`} stroke={s} />
        <path d={`M32 ${y} C40 ${y - 3} 46 ${y - 6} 50 ${y - 11}`} stroke={s} />
      </g>
    ))}
    <path d="M32 24 C28 20 28 16 32 12 C36 16 36 20 32 24 Z" stroke={s} fill={f} />
  </>
);

/** 2 — Tulip. */
const tulip: Render = (s, f) => (
  <>
    <path d="M32 84 C32 66 31 50 32 40" stroke={s} />
    <path d="M32 56 C24 54 19 47 19 40 C27 41 32 47 32 56 Z" stroke={s} fill={f} />
    <path
      d="M22 38 C20 28 24 20 32 16 C40 20 44 28 42 38 C38 34 36 33 32 33 C28 33 26 34 22 38 Z"
      stroke={s}
      fill={f}
    />
    <path d="M32 16 L32 33 M26 36 L26 22 M38 36 L38 22" stroke={s} />
  </>
);

/** 3 — Daisy. */
const daisy: Render = (s, f) => {
  const petals = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const cx = 32 + Math.cos(a) * 13;
    const cy = 26 + Math.sin(a) * 13;
    return <ellipse key={i} cx={cx} cy={cy} rx="5.5" ry="3" stroke={s} fill={f} transform={`rotate(${(a * 180) / Math.PI} ${cx} ${cy})`} />;
  });
  return (
    <>
      <path d="M32 84 C32 66 31 48 32 38" stroke={s} />
      <path d="M32 60 C24 58 20 52 20 46 C28 47 32 52 32 60 Z" stroke={s} fill={f} />
      {petals}
      <circle cx="32" cy="26" r="6.5" stroke={s} fill={s} fillOpacity={0.18} />
    </>
  );
};

/** 4 — Mushroom cluster. */
const mushrooms: Render = (s, f) => (
  <>
    <path d="M26 84 C25 72 25 64 26 58" stroke={s} />
    <path d="M44 84 C45 74 45 68 44 62" stroke={s} />
    <path d="M14 58 C14 48 20 42 26 42 C32 42 38 48 38 58 C30 54 22 54 14 58 Z" stroke={s} fill={f} />
    <path d="M34 62 C34 54 39 49 44 49 C49 49 54 54 54 62 C47 59 41 59 34 62 Z" stroke={s} fill={f} />
    <circle cx="22" cy="51" r="1.6" stroke={s} fill={s} />
    <circle cx="30" cy="49" r="1.4" stroke={s} fill={s} />
    <circle cx="45" cy="56" r="1.4" stroke={s} fill={s} />
  </>
);

/** 5 — Potted shrub. */
const shrub: Render = (s, f) => (
  <>
    <path d="M22 84 L20 70 L44 70 L42 84 Z" stroke={s} />
    <path d="M18 70 L46 70" stroke={s} />
    <path d="M32 70 C32 60 31 52 32 46" stroke={s} />
    <path d="M32 56 C24 54 20 50 22 44 C28 46 32 50 32 56 Z" stroke={s} fill={f} />
    <path d="M32 50 C40 48 44 44 42 38 C36 40 32 44 32 50 Z" stroke={s} fill={f} />
    <path
      d="M32 46 C22 46 16 38 18 30 C24 26 30 28 32 34 C34 28 40 26 46 30 C48 38 42 46 32 46 Z"
      stroke={s}
      fill={f}
    />
  </>
);

/** 6 — Flowering branch. */
const branch: Render = (s, f) => (
  <>
    <path d="M32 84 C32 64 30 44 34 22" stroke={s} />
    <path d="M33 60 C24 56 18 56 12 60" stroke={s} />
    <path d="M32 46 C40 42 46 42 52 46" stroke={s} />
    <path d="M33 34 C26 30 22 30 17 33" stroke={s} />
    {[
      [12, 60],
      [52, 46],
      [17, 33],
      [34, 18],
    ].map(([cx, cy], i) => (
      <g key={i}>
        {Array.from({ length: 5 }, (_, p) => {
          const a = (p / 5) * Math.PI * 2;
          return (
            <ellipse
              key={p}
              cx={cx + Math.cos(a) * 5}
              cy={cy + Math.sin(a) * 5}
              rx="3.2"
              ry="2"
              stroke={s}
              fill={f}
              transform={`rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * 5} ${cy + Math.sin(a) * 5})`}
            />
          );
        })}
        <circle cx={cx} cy={cy} r="2.4" stroke={s} fill={s} fillOpacity={0.2} />
      </g>
    ))}
  </>
);

/** 7 — Ancient tree: the heaviest, multi-page design systems. */
const tree: Render = (s, f) => (
  <>
    <path d="M26 84 C27 70 27 58 28 50 M38 84 C37 70 37 58 36 50" stroke={s} />
    <path d="M28 64 C22 62 18 58 16 52 M36 58 C42 56 46 52 48 46 M32 56 C32 48 32 42 32 36" stroke={s} />
    <path
      d="M32 14 C20 14 12 22 12 32 C12 36 14 40 17 42 C14 46 14 52 18 55 C24 60 32 58 32 52 C32 58 40 60 46 55 C50 52 50 46 47 42 C50 40 52 36 52 32 C52 22 44 14 32 14 Z"
      stroke={s}
      fill={f}
    />
    <path d="M24 30 C26 34 30 36 32 36 M40 28 C38 33 34 35 32 36" stroke={s} strokeOpacity={0.6} />
  </>
);

const RENDERERS: Render[] = [sprout, fern, tulip, daisy, mushrooms, shrub, branch, tree];

export const DOODLE_COUNT = RENDERERS.length;

/** Render the doodle at a given complexity index. */
export function PlantDoodle({
  index,
  stroke = '#3b3bdd',
  fill = '#3b3bdd',
  size = 64,
  className,
  style,
}: DoodleProps & { index: number }) {
  const render = RENDERERS[Math.max(0, Math.min(index, RENDERERS.length - 1))];
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size * 1.34}
      viewBox="0 0 64 88"
      fill="none"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {render(stroke, fill)}
    </svg>
  );
}
