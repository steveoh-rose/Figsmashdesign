# Figma Make Spec — Club Figma World

Paste this whole document as the first message in Figma Make (Opus 4.8), with the
pixel art assets attached to the same message.

---

## 1. GOAL

Turn this project into **Club Figma** — an explorable pixel-art world. My cursor
drives a character that walks between themed zones. The games already in this
project become arcade cabinets inside one zone. The world also connects to the
real Figma API (a token the user pastes) to show live org files and open them.

## 2. KEEP / DON'T

- **KEEP** all existing game logic in this project — re-house it, don't regenerate it.
- **DON'T** redraw or restyle my uploaded pixel art assets — place them as-is.
- **DON'T** invent API endpoints — use exactly the ones in §4 (reference code included).
- Build the overworld + navigation skeleton first; placeholder interiors are fine.

## 3. WORLD SPEC

### Core interaction
- The avatar glides toward the mouse with springy easing (lags, catches up; never teleports).
- Hovering an interactive object shows a retro hint label ("ENTER ARCADE", "RIDE THE PORTAL"); clicking triggers it.
- Each zone is one full screen, no scrolling. Camera gently pans when the avatar nears an edge.

### Screens (5)
1. **OVERWORLD (hub)** — dark isometric street. Place the three building assets:
   the "F" tower (Figma HQ), the arcade storefront, the portal machine. Each is
   an entrance; clicking transitions to its interior with a quick retro fade/wipe.
2. **ARCADE INTERIOR** — backdrop: my game-room asset (purple room, cabinets,
   couches). Existing games launch from the cabinets — one per cabinet, glowing
   marquee labels. Esc or door exits to overworld.
3. **OFFICE INTERIOR** — backdrop: my office asset (desks + monitors). Monitors
   are a gallery of Figma files (see §4.2). Clicking a monitor shows the file
   zoomed with its name, team, "what changed" note, and an OPEN IN FIGMA button.
4. **F TOWER LOBBY** — directory of the world (teleport links to each zone) +
   a wardrobe to pick your cursor character (persists across visits, see §4.4).
5. **PORTAL ROOM** — the portal machine asset. Clicking plays a charge-up
   animation, the avatar gets sucked in, then a Figma file opens in a new tab
   (org file if connected, else a random community file — see §4.3).

### Aesthetic
- Match my assets: deep purples/navy, neon cyan/orange/magenta, chunky pixel outlines.
- Press Start 2P (or similar) for labels/HUD. Retro chiptune blips on hover/click
  via Web Audio oscillators (no audio files).
- Persistent zone label or minimap in a corner.

## 4. FUNCTIONAL SPEC — port these exactly

### 4.1 Connect panel
- A "🔌 CONNECT" button in the top-right corner of every zone. When connected it shows "🟢 SYNCED".
- Opens a modal: **personal access token** (password field, placeholder `figd_…`,
  link to figma.com/developers/api#access-tokens, scope **file_read**) and
  **Team ID** (text field — the number from `figma.com/files/team/<ID>/…`).
- States: idle / loading / error ("Couldn't reach Figma with those details. Check the token scope & team ID.")
- Persist `{ token, teamId }` to localStorage. **All localStorage access must be
  wrapped in try/catch** (it throws in sandboxed iframes):

```ts
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
```

### 4.2 Org files (fills the Office gallery)
Port this reference implementation faithfully — same endpoints, same shape:

```ts
interface FigmaConfig { token: string; teamId: string; }
interface FigmaFile {
  key: string; name: string; team: string; thumbnail?: string;
  lastModified: string; url?: string; change?: string; author?: string;
}

function relTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

// Recent files across a team's projects, newest first.
async function fetchOrgFiles(cfg: FigmaConfig, limit = 12): Promise<FigmaFile[]> {
  const headers = { 'X-Figma-Token': cfg.token };
  const projRes = await fetch(`https://api.figma.com/v1/teams/${cfg.teamId}/projects`, { headers });
  if (!projRes.ok) throw new Error(`projects ${projRes.status}`);
  const projects = (await projRes.json()).projects || [];

  const all: (FigmaFile & { _ts?: number })[] = [];
  for (const proj of projects.slice(0, 8)) {        // cap fan-out
    try {
      const fRes = await fetch(`https://api.figma.com/v1/projects/${proj.id}/files`, { headers });
      if (!fRes.ok) continue;
      for (const f of ((await fRes.json()).files || [])) {
        all.push({
          key: f.key, name: f.name, team: proj.name,
          thumbnail: f.thumbnail_url,
          lastModified: relTime(f.last_modified),
          url: `https://www.figma.com/file/${f.key}`,
          ...(f.last_modified ? { _ts: new Date(f.last_modified).getTime() } : {}),
        });
      }
    } catch { /* skip project */ }
  }
  all.sort((a, b) => (b._ts || 0) - (a._ts || 0));
  const top = all.slice(0, limit);
  await Promise.all(top.map(async (f) => {
    const c = await fetchFileChange(cfg, f.key);
    if (c.change) f.change = c.change;
    if (c.author) f.author = c.author;
  }));
  return top;
}

// "What changed since the last version" — from the file's version history.
async function fetchFileChange(cfg: FigmaConfig, key: string): Promise<{ change?: string; author?: string }> {
  try {
    const r = await fetch(`https://api.figma.com/v1/files/${key}/versions`, { headers: { 'X-Figma-Token': cfg.token } });
    if (!r.ok) return {};
    const versions = (await r.json()).versions || [];
    if (!versions.length) return {};
    const named = versions.find((v: any) => (v.label && v.label.trim()) || (v.description && v.description.trim()));
    const v = named || versions[0];
    const who = v.user?.handle;
    const note = (v.description || v.label || '').trim().replace(/\s+/g, ' ');
    return { change: note || (who ? `${who} made edits` : `edited ${relTime(v.created_at)}`), author: who };
  } catch { return {}; }
}
```

When **not connected**, the Office shows 6 mock placeholder files (fake names,
teams, "what changed" notes) so the gallery is never empty.

### 4.3 Portal destinations
- **Connected:** open a random file from the fetched org files (its `url`) in a new tab.
- **Not connected:** open a random entry from this list:

```ts
const COMMUNITY_FILES = [
  { name: 'Material 3 Design Kit',   url: 'https://www.figma.com/community/file/1035203798135708372' },
  { name: 'iOS 17 UI Kit',           url: 'https://www.figma.com/community/file/1248375255495415511' },
  { name: 'Wireframe Kit',           url: 'https://www.figma.com/community/file/1005767987960215147' },
  { name: 'Ant Design 5 UI Kit',     url: 'https://www.figma.com/community/file/831698976089873405'  },
  { name: 'Figma UI2 Design System', url: 'https://www.figma.com/community/file/928108747914589129'  },
];
```

- Open via `window.open(url, '_blank', 'noopener,noreferrer')`.

### 4.4 Persistence (all via the guarded lsGet/lsSet helpers)
- `cf.config` — the `{ token, teamId }` connection
- `cf.cursor` — selected wardrobe character id
- `cf.scores` — per-game high scores, merged over defaults:
  `{ highScores: { game1: 0, game2: 0, ... }, timeSavedSec: 0 }`

## 5. ASSETS (attached)

| Asset | Use |
|---|---|
| Portal machine (round blue ring on base) | Portal Room centrepiece + overworld entrance |
| "F" tower (purple skyscraper, neon windows) | Overworld — Figma HQ entrance |
| Arcade storefront (small shop, ARCADE sign) | Overworld — arcade entrance |
| Game room interior (purple, cabinets, couches) | Arcade interior backdrop |
| Office interior (desks, monitors, shelves) | Office interior backdrop |

## 6. ACCEPTANCE CHECKLIST

- [ ] Avatar follows the cursor with spring easing in every zone
- [ ] All 5 zones reachable and exitable (click entrance / Esc / door)
- [ ] Existing games launch from arcade cabinets and return to the arcade on exit
- [ ] Connect panel stores token+teamId; SYNCED state survives reload
- [ ] Connected: Office gallery shows real org files with thumbnails + "what changed"
- [ ] Not connected: Office shows mocks; portal opens a community file
- [ ] Portal plays charge-up animation before opening the tab
- [ ] No raw `localStorage.*` calls anywhere — only the guarded helpers
- [ ] High scores and cursor choice persist across reloads
