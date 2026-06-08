/**
 * The Flora Sprite Engine — pixel-art edition.
 * Each plant is a tiny pixel grid rendered as <rect> blocks. The bloom pixels
 * inherit the destroyed design's primary HEX (and a secondary accent), so layer
 * volume still picks a richer plant for heavier design systems.
 */

export interface DoodleProps {
  stroke?: string; // primary HEX — the bloom
  fill?: string; // secondary HEX — accent
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const COLS = 11;
const ROWS = 14;

// Legend: . empty · s stem · l leaf · p bloom(primary) · c center(secondary)
//         d trunk/pot · o dark outline
const PLANTS: string[][] = [
  // 0 — sprout
  ['...........','...........','...........','...........','.....p.....','....ppp....','....ppp....','..l..s..l..','.ll..s..ll.','..l.lsl.l..','.....s.....','.....s.....','....ooo....','...........'],
  // 1 — fern
  ['...........','.....l.....','....lll....','...l.s.l...','..ll.s.ll..','...l.s.l...','..ll.s.ll..','...l.s.l...','..ll.s.ll..','....lsl....','.....s.....','.....s.....','....ooo....','...........'],
  // 2 — tulip
  ['...........','....p.p....','...ppppp...','...ppcpp...','...ppppp...','....ppp....','.....s.....','...l.s.l...','..ll.s.ll..','....lsl....','.....s.....','.....s.....','....ooo....','...........'],
  // 3 — daisy
  ['...........','....ppp....','...p.c.p...','..pp.c.pp..','...pcccp...','..pp.c.pp..','...p.c.p...','....pcp....','.....s.....','...l.s.l...','..ll.slll..','.....s.....','....ooo....','...........'],
  // 4 — mushrooms
  ['...........','...........','...ppp.....','..ppppp.pp.','.ppcppppppp','.ppppp.ccp.','..ddd..ddd.','..ddd..ddd.','..ddd..ddd.','...........','...........','...........','...........','...........'],
  // 5 — shrub
  ['...........','....lll....','..lllllll..','.lllpllll l','.llllllpll.','.lpllllllp.','..lllllll..','...lllll...','.....s.....','.....s.....','....ddd....','...d...d...','...ddddd...','...........'],
  // 6 — flowering branch
  ['...........','..p.....p..','.ppc...ppc.','..p..s..p..','.....s.....','..p..s.....','.ppc.s..p..','..p..s.ppc.','.....ss.p..','...p..s....','..ppc.s....','.....s.....','....ooo....','...........'],
  // 7 — ancient tree
  ['...ppppp...','..ppppppp..','.ppppppppp.','.ppcpppcpp.','.ppppppppp.','..pppppppp.','...pp.pp...','....ddd....','...d.dd....','....ddd....','....ddd....','...ddddd...','..dddddd d.','...........'],
];

export const DOODLE_COUNT = PLANTS.length;

function colorFor(ch: string, primary: string, secondary: string): string | null {
  switch (ch) {
    case 's': return '#3f7d3a';
    case 'l': return '#5a9b4a';
    case 'p': return primary;
    case 'c': return secondary && secondary.toLowerCase() !== primary.toLowerCase() ? secondary : '#ffd23f';
    case 'd': return '#8a5a34';
    case 'o': return '#2b2b3a';
    default: return null;
  }
}

export function PlantDoodle({
  index,
  stroke = '#5a9b4a',
  fill = '#d24b3e',
  size = 64,
  className,
  style,
}: DoodleProps & { index: number }) {
  const grid = PLANTS[Math.max(0, Math.min(index, PLANTS.length - 1))];
  const u = size / COLS; // pixel unit
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < ROWS; y++) {
    const row = grid[y] || '';
    for (let x = 0; x < COLS; x++) {
      const c = colorFor(row[x] || '.', stroke, fill);
      if (c) rects.push(<rect key={`${x},${y}`} x={x * u} y={y * u} width={u + 0.5} height={u + 0.5} fill={c} />);
    }
  }
  return (
    <svg
      className={className}
      style={{ shapeRendering: 'crispEdges', ...style }}
      width={size}
      height={size * (ROWS / COLS)}
      viewBox={`0 0 ${size} ${size * (ROWS / COLS)}`}
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}
