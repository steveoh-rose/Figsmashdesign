# Project Memory

All accumulated context for this session.

---

## What this project is

**FigSmashDesign** is a Figma plugin and standalone web app built around a retro-arcade world called **Club Figma** (internally "FigConsole 67"). The player walks a pixel-art avatar through five themed sectors, each offering a different Figma-themed activity. The whole thing runs as a Vite/React/TypeScript web app; the plugin build inlines it into a single `clubfigma-plugin/ui.html` so it also runs inside the Figma desktop app.

---

## Tech stack

| Layer | Detail |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Plugin | `clubfigma-plugin/code.js` (Figma sandbox) + `clubfigma-plugin/ui.html` (built artifact) |
| Fonts | Press Start 2P + Space Grotesk via Google Fonts `@import` in `console.css` |
| Audio | Web Audio API — raw oscillator scheduling, no library |
| State (arcade) | `src/club-figma/console/store.ts` — Zustand-style custom hook, persists to localStorage via guarded try/catch |

---

## Entry points

- `src/main.tsx` → mounts `<ClubFigmaWorld />` (the whole world)
- `src/App.tsx` → thin wrapper, just imports `ClubFigmaWorld`
- `clubfigma-plugin/code.js` → plugin sandbox: sends frames via postMessage, stores token in `clientStorage`, handles `OPEN_URL` via `figma.openExternal`

---

## World structure — the 5 sectors

All live in `src/club-figma/ClubFigmaWorld.tsx` (the single large world file).

```
Cursor Camp (hub)
  ├── The Office        — Figma file gallery (org files if connected, else current file frames)
  ├── Component Arcade  — 4 arcade cabinets → FigConsole 67
  ├── Hex Garden        — chill exploration room
  └── Prototype Pipeline → 3 bezier "wire" slides that open a Figma file on landing
```

### Room IDs
`'camp' | 'arcade' | 'office' | 'garden' | 'pipeline'`

### Navigation
- Doors trigger `goTo(roomId)` instantly
- Pipeline wires trigger `startTransit(wireIdx, onComplete?)` — cubic bezier animation over `TRANSIT_DURATION = 3.2s`
- `goToRef` / `transitRef` are used to avoid stale closure issues in the rAF loop

---

## Prototype Pipeline behaviour

Riding any of the three wires calls `openPipelineFile()` when transit completes:

- **If org connected** (`figmaConfig.token` set + `figmaFiles` has items with `.url`): opens a random org file
- **If not connected**: opens a random entry from `COMMUNITY_FILES` (5 well-known Figma community design systems)
- Opening is done via `openFigmaUrl(url)`:
  1. `window.parent.postMessage({ pluginMessage: { type: 'OPEN_URL', url } }, '*')` → plugin sandbox calls `figma.openExternal(url)`
  2. `window.open(url, '_blank')` → fallback for browser

---

## Org / Figma API connection

The "🔌 CONNECT" panel in The Office stores a personal access token + team ID:
- Plugin sandbox persists to `clientStorage` (key: `clubfigma.config.v1`)
- Sandbox relays config to UI via `{ type: 'CONFIG', config }` on launch
- UI calls Figma REST API (`api.figma.com/v1/teams/:teamId/projects`) to load org files
- Without a token, The Office shows frames from the currently open Figma file (sent as `TEAM_FILES` by the sandbox)
- Mock files (`MOCK_FILES`) are shown as a placeholder while loading

---

## The Arcade — FigConsole 67

**File:** `src/club-figma/console/FigConsole.tsx`
**Cartridge store:** `src/club-figma/console/store.ts` — `CartridgeId = 'figsmash' | 'fighero' | 'figcontrast' | 'figalign'`

Note: internal IDs are kept stable so high scores persist. Display names have changed.

| Cart ID | Display name | File | Tag | Concept |
|---------|-------------|------|-----|---------|
| `figsmash` | FigSmash | `src/app/game/engine.ts` (RIPShell) | BRAWLER | Beat the Unaligned Stakeholder boss |
| `fighero` | **Shortcut Hero** | `src/club-figma/games/ShortcutHero.tsx` | SIMON | Shortcut Simon — flash a sequence of Figma tool tiles, player types the real shortcuts |
| `figcontrast` | FigContrast | `src/club-figma/games/FigContrast.tsx` | CALIBRATE | Colour memory — peek a swatch, dial it back |
| `figalign` | **Match da Shape** | `src/club-figma/games/FigAlign.tsx` | MEMORY | Shape memory — peek a uniform shape, rebuild it by drag |

### Shortcut Hero detail
- Tools: Move (V, cyan), Frame (F, orange), Pen (P, purple), Text (T, green) — all real Figma shortcuts
- Round 4+: Create Component tile added (Ctrl+Alt+K / ⌘⌥K) — modifier wave
- Round 6+: Flipped Mode — tiles scramble position, forcing muscle memory
- Fuse timer per key, shrinks each round; combo multiplier bar
- Game Over shows weakest shortcut + ↵ insert credit to replay

### Match da Shape detail
- Shape types: `square | circle | triangle | hexagon` — always **uniform** (single radius `r`)
- Resize = drag to set `r = distance from centre` — no non-uniform scaling possible
- Rotation scoring is symmetry-aware: square 90°, hexagon 60°, triangle 120°, circle ignored
- Handles shown at 4 cardinal points on the shape boundary

---

## Style Wardrobe

A character-picker overlay triggered from Cursor Camp's campfire zone. Stores the selected cursor ID to localStorage (guarded — see below).

---

## Critical patterns

### localStorage guard (MUST use everywhere)
Figma's plugin iframe throws `SecurityError` on any `localStorage` access. All reads/writes go through:
```ts
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
```
These are defined at the top of `ClubFigmaWorld.tsx`. The console `store.ts` has its own equivalent guards. **Never use raw `localStorage.*` in this codebase.**

### Plugin postMessage bridge
```
UI → sandbox:  window.parent.postMessage({ pluginMessage: { type, ...payload } }, '*')
Sandbox → UI:  figma.ui.postMessage({ type, ...payload })
```
Handled message types: `GET_TEAM_FILES`, `GET_CONFIG`, `SET_CONFIG`, `OPEN_URL`, `close`

---

## File map (key files only)

```
src/
  main.tsx                        — entry, mounts ClubFigmaWorld
  App.tsx                         — thin wrapper
  club-figma/
    ClubFigmaWorld.tsx            — THE world: all 5 rooms, avatar, camera, zones, wardrobe
    world.css                     — world styles
    console/
      FigConsole.tsx              — arcade OS UI + cartridge launcher
      console.css                 — all arcade + game styles
      store.ts                    — high scores, time saved, localStorage persistence
      voxel.tsx                   — voxel sprite renderer + 4 cartridge art exports
    games/
      ShortcutHero.tsx            — Shortcut Simon game (was FigHero)
      FigContrast.tsx             — colour memory game
      FigAlign.tsx                — shape memory game (display: Match da Shape)
  app/
    game/
      engine.ts                   — FigSmash brawler engine (RIPShell mode in Club Figma)
      config.ts                   — character config
      audio.ts                    — engine audio
    components/
      CharacterArtMounts.tsx      — maps character IDs to Frame2/3/4/5 PNG imports
      FigmaChrome.tsx, GameCanvas.tsx, HudHeader.tsx, etc. — FigSmash UI components
      screens/                    — CharacterSelect, MapSelect, WinScreen, etc.
  styles/
    index.css                     — imports tailwind.css + theme.css
    figsmash.css                  — FigSmash brawler styles
    tailwind.css                  — Tailwind base
    theme.css                     — design tokens
  imports/
    code.js                       — original plugin sandbox (reference)
    manifest.json                 — original plugin manifest (reference)
    ui.html                       — original minimal plugin UI (reference)
    README.md                     — plugin README
    Elfwithcap/ Frame2/ Frame3/ Frame4/ Frame5/ LightningRat/ Plumber/ Spaceboi/
                                  — character sprite frames (used by CharacterArtMounts)
clubfigma-plugin/
  code.js                         — ACTIVE plugin sandbox
  manifest.json                   — ACTIVE plugin manifest
  ui.html                         — BUILT artifact (committed after each pnpm build:plugin)
```

---

## Build commands

```bash
pnpm dev              # dev server (localhost:5173 or similar)
pnpm build            # production build → dist/
pnpm build:plugin     # vite build + inline into clubfigma-plugin/ui.html
```

**Always run `pnpm build:plugin` and commit `clubfigma-plugin/ui.html` after any source change** — the plugin won't pick up source changes otherwise.

---

## Branch & PR

- Feature branch: `claude/club-figma-design-system-room-xqmh8j`
- PR #2 on `steveoh-rose/Figsmashdesign` — merges into `main`
- PR was open and ready to merge as of the end of this session

---

## Decisions made this session

| Decision | Reason |
|----------|--------|
| Kept `CartridgeId = 'fighero'` for Shortcut Hero | Preserves saved high scores |
| Kept `CartridgeId = 'figalign'` for Match da Shape | Preserves saved high scores |
| `openFigmaUrl` posts to plugin AND calls `window.open` | Works in both plugin (postMessage only) and browser (window.open only) without knowing the context |
| Prototype Pipeline always opens a file (not navigates to a room) | Each wire = a direct portal into a Figma file; community files as fallback feel cohesive with the Figma theme |
| Match da Shape uses `r = distance from centre` for resize | Uniform shapes can't have non-uniform scaling, so drag-to-distance is the most intuitive interaction |
| Shadcn/ui `src/app/components/ui/` removed | 48 component files, 0 imports — installed as a boilerplate starter, never used |
| `src/imports/` duplicates removed | README-1/2, code-1/2, manifest-1/2, ui-1/2, PRD, pasted_text, image.png, fig-smash-phase4.html — all stale |
