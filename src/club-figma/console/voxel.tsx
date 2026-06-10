/**
 * Chunky "extruded pixel" voxel art for the cartridges. A flat pixel sprite is
 * pushed back-and-down at 45°, drawing darker right/bottom faces only on the
 * silhouette — giving the 3D voxel look from the reference shots.
 */

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function VoxelSprite({ grid, palette, size = 76 }: { grid: string[]; palette: Record<string, string>; size?: number }) {
  const H = grid.length, W = grid[0].length;
  const px = 8, depth = 6;
  const totalW = W * px + depth, totalH = H * px + depth;
  const filled = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && grid[y][x] !== '.' && grid[y][x] !== ' ';
  const sides: React.ReactNode[] = [];
  const fronts: React.ReactNode[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch] || '#999';
      const X = x * px, Y = y * px;
      if (!filled(x + 1, y)) sides.push(<polygon key={`r${x}-${y}`} points={`${X + px},${Y} ${X + px + depth},${Y + depth} ${X + px + depth},${Y + px + depth} ${X + px},${Y + px}`} fill={shade(col, 0.62)} />);
      if (!filled(x, y + 1)) sides.push(<polygon key={`b${x}-${y}`} points={`${X},${Y + px} ${X + px},${Y + px} ${X + px + depth},${Y + px + depth} ${X + depth},${Y + px + depth}`} fill={shade(col, 0.46)} />);
      fronts.push(<rect key={`f${x}-${y}`} x={X} y={Y} width={px + 0.6} height={px + 0.6} fill={col} />);
    }
  }
  return (
    <svg width={size} height={size * (totalH / totalW)} viewBox={`0 0 ${totalW} ${totalH}`} style={{ imageRendering: 'pixelated', overflow: 'visible' }} aria-hidden="true">
      {sides}
      {fronts}
    </svg>
  );
}

const C = { coral: '#ef5d52', blue: '#4d7cff', teal: '#2ec4b6', white: '#ffffff', ink: '#1c1c1c' };

// FigSmash — the Unaligned Stakeholder as a voxel ghost.
const GHOST = ['..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', 'rwwrrwwrr', 'rwkrrwkrr', 'rrrrrrrrr', 'rrrrrrrrr', 'rrrrrrrrr', 'r.rr.rr.r'];
export const VoxelGhost = ({ size }: { size?: number }) => (
  <VoxelSprite grid={GHOST} palette={{ r: C.coral, w: C.white, k: C.ink }} size={size} />
);

// Shortcut Hero — a chipper voxel smiley.
const SMILEY = ['..bbbbb..', '.bbbbbbb.', 'bbbbbbbbb', 'bbwbbbwbb', 'bbbbbbbbb', 'bwbbbbbwb', 'bbwwwwwbb', '.bbbbbbb.', '..bbbbb..'];
export const VoxelSmiley = ({ size }: { size?: number }) => (
  <VoxelSprite grid={SMILEY} palette={{ b: C.blue, w: C.white }} size={size} />
);

// FigContrast — a voxel eye (the design eye).
const EYE = ['.........', '..ttttt..', '.ttttttt.', 'ttwwwwwtt', 'twwkkkwwt', 'ttwwwwwtt', '.ttttttt.', '..ttttt..', '.........'];
export const VoxelEye = ({ size }: { size?: number }) => (
  <VoxelSprite grid={EYE} palette={{ t: C.teal, w: C.white, k: C.ink }} size={size} />
);

// Match da Shape — a voxel triangle.
const TRI = ['....o....', '....o....', '...ooo...', '...ooo...', '..ooooo..', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo'];
export const VoxelTriangle = ({ size }: { size?: number }) => (
  <VoxelSprite grid={TRI} palette={{ o: '#ff9f43' }} size={size} />
);
