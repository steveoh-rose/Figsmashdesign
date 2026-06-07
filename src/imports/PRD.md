# Fig Smash — Product Requirements & Build Context

*A living design + handoff doc for the current build. Pair it with the original phased
handoff in [`README.md`](./README.md) (Phases 0–4) — this document supersedes it for the
**current** feature set and the forward-looking roadmap.*

---

## 1. Executive summary

**Fig Smash** is a chaotic, physics-based browser brawler where your **mouse cursor is the
fighter**. You fling UI components, punch, use design-tool "moves," fire character specials,
and ring your opponent off the screen — Super Smash Bros.' percentage-knockback combat fused
with neal.fun *Cursor Camp*'s charm, themed around Figma and popular apps.

It's built for a **Figma Make / FigBuild-style competition**: a single playable web build that
is funny, screenshot-able, and AI-native.

### The wedge (why it's more than an LLM-skinned demo)
1. **The cursor has weight and consequence** — it's a spring body, not a pointer. One spring
   system does triple duty: cursor feel, throw windup, and knockback survival (DI).
2. **The toolbar *is* the moveset** — Move / Scale / Slice / Shape are weaponized Figma tools.
3. **AI difficulty = AI models** (Ollama → Opus 4.8) — an inside joke and a thesis statement
   for an AI-native event.
4. **Bring-your-own-stage** — a companion **Figma plugin** exports any frame; you import it and
   **smash your own design**. This is the People's-Choice / shareability engine.
5. **Signature finisher** — throw the gold Figma logo to trigger a fake macOS **Force Quit**
   dialog (never bound to ⌘Q/⌘W/⌘T — the OS would kill the tab).

---

## 2. Current state — what's built

The game is a **single self-contained file**: [`fig-smash-phase4.html`](./fig-smash-phase4.html)
(vanilla JS + Canvas2D, **zero dependencies, no build step**). Open it in a browser to play.

### 2.1 Core combat & feel
| System | Notes |
|---|---|
| Spring cursor | Mass/stiffness/damping spring follows the mouse; squash-stretch, comet trail. |
| Throw | **Flick** (inherits spring velocity) and **Lasso** (rubber-band slingshot). |
| Punch | Click empty space; jab in motion/opponent direction; cyan swipe arc. |
| Damage % + KO | 3 damage tiers; knockback scales with %; **hitstun model** → ring-out off any edge. |
| Juice | Trauma screen shake, KO slow-mo (`timeScale→0.18`), hitstop, launch streaks, synth SFX. |
| Taunts | Opponent pops `idc`/`skill issue`/etc. bubbles on hits/KOs. |

### 2.2 Tools (bottom toolbar) — the moveset
- **Move (V)** — grab + fling props, click to punch.
- **Lasso (L)** — slingshot throw.
- **Scale (K)** — drag a marquee; props inflate into heavy weapons, fighters become big targets.
- **Slice (C)** — Fruit-Ninja swipe; cuts props into shards, slashes the opponent.
- **Shape** — Figma-style **dropdown** (Rectangle / Line / Arrow / Ellipse / Polygon / Star);
  drag to draw a shape on the canvas. Drawn shapes are suspended, grabbable, destructible props.
- *Pen* — greyed (roadmap).

### 2.3 Characters & right-click specials
Roster (cursor "characters"), each with a **right-click (Mouse 2)** special:

| Character | Special | Behavior |
|---|---|---|
| **Mario** | Fireball Shot | Bouncing projectile (gravity), dissipates on hit. Fires on press. |
| **Pikachu** | Lightning Charge | Hold to aim → release: high-speed dash, **damage + stun**. |
| **Fox** | Fire Charge | Hold to aim → release: dash leaving **damaging fire zones**. |
| **Samus** | Energy Ball | Hold to charge; **full charge banks** (subtle glow) and fires on next right-click; partial release fires immediately. Size/damage scale with charge. |
| **Link** | Homing Boomerang | Flies out, curves to nearest enemy, returns. Fires on press. |

Held specials (Samus/Pikachu/Fox) **freeze the cursor and show an aim line** while held.
The **CPU spawns as a random character** and uses its own special.

### 2.4 Power-up drops ("component instances")
Violet Figma-component pickups fall from the sky (~every 12–20s); either fighter collects on contact:
- **Ray Gun** — 6 laser shots; player fires toward cursor, CPU auto-fires.
- **Invincibility Star** — ~6.5s immunity (rainbow body, sparkles) + contact damage (Mario-star style).

### 2.5 Stages — destructible app spoofs
Pick a stage after your character. Each is a destructible spoof; all props are suspended (float)
until grabbed/hit, then gain gravity, and are throwable + sliceable:
- **Spotifight** (Music) — album tiles, track rows, transport controls.
- **Smack** (Chat / Slack) — `#` channels, message bubbles, emoji reactions, send button.
- **Figtube** (Video / YouTube) — video thumbnails, SUBSCRIBE, like/dislike, search bar.
- **Your Frame** (Import) — *your own Figma design* (see §6).

Each map has an accent-colored backdrop + faint name watermark.

### 2.6 Screens & match flow
1. **Character select** (Smash-style): roster grid (hover previews into P1 panel), P1 + CPU panels,
   CPU **AI model** selector. → *Next.*
2. **Stage select**: 4 stage cards (incl. Import). → *Start Battle.*
3. **3 – 2 – 1 – GO!** countdown (arena visible, frozen).
4. **Battle** — first to **5 stocks**. Smash-style **respawn** (float down on a platform with
   spawn invincibility). The 5th KO is final — the loser does **not** respawn.
5. **Victory screen** — "YOU WIN! / CPU WINS" + score → Rematch / Change character.
6. **Pause menu (Esc)** — Resume / Restart match / End match / Screenshot / Share link.
   *(The old right-side tuning panel is hidden; difficulty is chosen on the character screen.)*

### 2.7 Visual chrome
The UI is themed as the **Figma editor** (light): decorative left sidebar (Pages/Layers),
canvas rulers, light floating toolbar, "?" help. The dark game arena reads as the open artboard.
A `SPRITES`/`drawCursorShape` scaffold exists for a later art reskin (e.g. Cursor Camp).

---

## 3. Architecture & how it works

### 3.1 Repo layout
```
fig-smash-phase4.html   # the entire game (markup + CSS + JS in one file)
README.md               # original phased handoff (Phases 0–4)
PRD.md                  # this document
figma-plugin/           # companion exporter plugin (manifest.json, code.js, ui.html, README.md)
.claude/launch.json     # dev: static preview server (python http.server)
.gitignore
```

### 3.2 Runtime model
- **One full-screen `<canvas id="c">`** renders the arena/fighters/props/FX. Everything else
  (menus, panels, toolbar, dialogs) is **DOM overlaid on top**.
- **Fixed-timestep sim**: `STEP = 1/120` with an accumulator; `physics(STEP)` steps the world,
  `render()` runs at display rate. `timeScale` multiplies sim dt for slow-mo.
- **Pause gates** — the loop skips `physics()` (the game freezes) when any of these is true:
  `hitstop`, `fqActive`, `charSelectOpen`, `countdown>0`, `matchOver`, `paused`.
  Input handlers guard on the same flags.

### 3.3 Key state & functions (for navigation)
- **Fighters**: `makeFighter(o)`, globals `player`, `cpu`, `fighters[]`. Per-fighter fields
  include movement (`x,y,vx,vy,tx,ty`), `dmg`, `hitTimer`, `char`, `brain` (AI), and ability/
  status (`specialCd, dash, charging, charged, stun, invinc, gun, respawn, spawnGuard, dead`).
- **Combat**: `punch()`, `applyHit(f, dx,dy, knock, dmg, hx,hy, from)` (central damage funnel —
  respects invincibility/respawn), `ko(f)`, `triggerForceQuit()`.
- **Props**: `mkProp(type,x,y,bw,bh,ex)`, `props[]`. Types: `tile/row/ctrl/play` (Spotify),
  `channel/msg/emoji/send` (Slack), `thumb/subscribe/like/searchbar` (YouTube), `shape`,
  `frameNode` (imported), `logo`. Suspended via `active:false` until grabbed/knocked.
- **Tools**: `tool`, `setTool()`; scale marquee, slice blade (`bladePts`), shape draw (`shapeBox`).
- **Specials**: `aimDir(f)`, `specialDown/specialUp(f)`, `useSpecial`, `fireEnergy`, arrays
  `specials[]` + `fireZones[]`, `updateSpecials/updateFireZones`, `drawSpecials`.
- **Drops/weapons**: `drops[]`, `bolts[]`, `spawnDrop/collectDrop/updateDrops`, `fireBolt`.
- **AI**: `aiThink(dt)` / `aiAct(dt)` (state machine: seek → arm → throw → punch → pressure →
  flee → dodge → use special), `LEVELS[]` + `applyLevel()` + `lvl`.
- **Screens**: DOM overlays `#charselect`, `#mapselect`, `#importdlg`, `#winscreen`, `#pausemenu`;
  flow fns `openCharSelect → goToMapSelect → startBattle`, plus `rematch`, `winToCharSelect`,
  `openPause/resumeGame`, `countdown` + `drawCount()`.

### 3.4 Data-driven config (extension points)
| Array/obj | Drives | Add by |
|---|---|---|
| `CHARACTERS` | roster (shape, color, ability) | one entry + an `ability` branch in `useSpecial` + a shape in `drawCursorShape` |
| `MAPS` | stages | one entry + a `spawn<Name>()` builder + a preview in `mapCardHTML` |
| `SHAPES` | shape-tool dropdown | one entry (icon + draw branch in `drawShapeKind`) |
| `LEVELS` | AI difficulty tiers | one entry (reaction/aggro/capabilities) |
| `T` | tuning constants | edit values |
| `SPRITES` | art reskin | set image URLs (physics unaffected) |

### 3.5 Tuned constants (don't lose these)
```
Spring (Balanced default):  k 220, c 40, m 2.2, throwPower 1.0
Combat:                     punchDmg 6, knock 230; hitstun = clamp(impulse/780, 0.25, 1.8)
Scale tool:                 scaleMax 3.2, scaleKnock 2.0
Respawn:                    RESPAWN_TIME 2.4s (+~1s post-spawn invincibility)
Match:                      STOCKS_TO_WIN 5
Constants:                  FIGHTER_R 24, PUNCH_RANGE 60, GRAB_RANGE 40, KO_MARGIN 70
AI tiers (reaction/jitter/aggro/speed): Ollama .90/.50/0/240 (drift, harmless) ·
   Haiku .42/.30/.30/540 · Sonnet .26/.14/.55/660 (leads, dodges) · Opus .14/.05/.85/780
```

---

## 4. Functional & non-functional requirements

### 4.1 Functional (current contract)
- The cursor is a spring body; left-click punches/grabs; right-click triggers the character special.
- A match is **first to 5 stocks**; ring-outs award stocks; KO'd fighters respawn on a platform
  with brief invincibility **except** the match-deciding KO.
- Player chooses a character then a stage (incl. an imported Figma frame) before each match.
- A 3-2-1-GO countdown gates the start of play; Esc pauses with a full menu.
- The Force Quit logo finisher is **never** bound to OS-reserved shortcuts.
- All stage props are destructible (grabbable, throwable, sliceable) and start suspended.

### 4.2 Non-functional
- **Self-contained**: single HTML file, no build, no network needed to play (Google Fonts +
  Web Audio degrade gracefully offline / before first click).
- **60 fps** target via fixed-timestep sim decoupled from render.
- **No backend** required; imports use clipboard/file/localStorage.
- **Accessible entry**: playable within ~10 seconds, Cursor-Camp-style (the bar for onboarding).

---

## 5. Known limitations / tech debt
- **One 5k+-line HTML file**, global state, no modules, no tests. Hard to scale or collaborate.
- **The old tuning panel is hidden, not removed** (its inputs still exist in the DOM so the
  script's `getElementById` wiring doesn't null-crash). The CPU model `<select>` lives there and
  is cloned into the start-screen selector.
- **Imported frames are simplified** — top-level layers only, rendered to PNGs; nested layers /
  vectors / effects collapse to a box; large image-heavy frames make big JSON (may exceed the
  ~5 MB `localStorage` quota — falls back to in-session only).
- **Single-player only**; CPU specials are simple (occasional, fixed cadence).
- **No persistence** beyond the imported frame; no settings, no profiles, no analytics.
- **Aiming nuance**: held specials freeze the cursor to aim; press-fire specials (Mario/Link/
  ray gun) aim toward the cursor and rely on cursor-lag for direction.

---

## 6. The Figma frame import + plugin (the wedge)

End-to-end "bring your own design and smash it":
1. **Figma plugin** (`figma-plugin/`): select a frame → the plugin renders each **top-level
   layer to a PNG** (`exportAsync`), records its **position relative to the frame**
   (`absoluteBoundingBox`), and emits a `figsmash-frame` JSON. Copy or download it.
2. **Game**: *Choose your stage → ⬆ Import Figma frame* → paste / file / clipboard. Each layer
   becomes a destructible `frameNode` prop drawn from its image. Persists in `localStorage`.

**Payload schema (`figsmash-frame`, v2):**
```json
{ "type":"figsmash-frame", "version":2, "name":"My Frame", "width":1200, "height":800,
  "nodes":[ { "name":"Button","x":100,"y":200,"w":160,"h":48,
              "fill":"#0d99ff","img":"data:image/png;base64,…" } ] }
```
The game accepts this JSON directly (also a `fill`-only fallback if `img` is absent).

---

## 7. Future improvements

### 7.1 Gameplay & content
- **More specials / a real arsenal**: Pen ramps, Paint-Bucket slows, Shape shields, component-army
  slingshot, prototype-noodle ziplines (the greyed toolbar slots are placeholders).
- **CPU mastery per character** — make each AI tier actually pilot its character's special well
  (aim leads, charge timing, dodge specials). Currently generic.
- **Items beyond ray gun/star** — bombs, shields, speed boosts (the `drops` system is extensible).
- **Stage hazards / interactivity** — e.g., the player bar conveys, channels collapse.
- **Match options** — stock count, time mode, item frequency, friendly fire, stage hazards on/off.
- **More app-spoof stages** + community-imported stage gallery.

### 7.2 Polish & retention
- **Cursor Camp reskin** via the `SPRITES` slots (hand-drawn, warm) — keep motion/juice.
- **Auto-capture the KO/Force-Quit moment** as a shareable GIF/clip (People's-Choice engine).
- **Start/onboarding screen** + a 10-second wordless tutorial.
- **Results screen stats** (KOs, damage dealt, longest combo), unlockables, simple progression.
- **Mobile/touch** support and responsive layout (currently desktop/mouse-first).
- **Accessibility**: colorblind-safe fighter colors, remappable keys, reduced-motion mode.

### 7.3 Quality
- Automated checks: a headless smoke test (load → no console errors → step physics → render),
  schema validation for imports, and visual regression on the screens.

---

## 8. Making it more scalable

The single-file approach was right for "feel-first" prototyping; growth needs structure.

### 8.1 Modularize (first refactor)
Move to **Vite + ES modules** with hot reload, splitting by system (per `README.md §4`):
```
src/ main.js · config.js · spring.js · fighter.js · ai.js · props.js · tools.js
     combat.js · specials.js · drops.js · maps.js · import.js · fx.js · audio.js
     render.js · ui/ (screens as components)
```
Zero behavior change first; the tuned constants in §3.5 are the answer key.

### 8.2 Decouple state
- Introduce a single **world/game-state object** (fighters, props, projectiles, match) instead of
  module-globals — this is also the prerequisite for save/replay/netcode.
- A small **event bus** (hit, KO, drop-collected, match-won) to decouple FX/audio/UI from sim.
- A **scene/state machine** for screens (CharSelect → StageSelect → Countdown → Battle → Results)
  replacing the ad-hoc `*Open`/`matchOver`/`paused` flags.

### 8.3 Data & content pipeline
- Promote `CHARACTERS / MAPS / SHAPES / LEVELS` to **JSON/TS data files**; load stages/characters
  as data so non-engineers (or an importer) can add content.
- An **asset pipeline** for the sprite reskin (sprite atlas, per-character/state art) behind the
  existing `SPRITES` seam.
- A versioned, validated **import schema** (zod/JSON-Schema) shared by the game and the plugin.

### 8.4 Deploy & share
- Publish as a static site (the Figma Make deliverable). Add a tiny optional backend or
  serverless KV **only** to enable share-by-link of imported stages (store frame JSON, share a
  short URL) — keeps the no-backend default while unlocking real "Share link".
- Telemetry (privacy-respecting) to learn what's fun for tuning.

### 8.5 Performance headroom
- Spatial partitioning for prop/projectile collisions if prop counts grow (currently O(n²) but n
  is small). Object pooling for sparks/debris/bolts. Offscreen culling already implicit via canvas.

---

## 9. Multiplayer (detailed plan)

Today the loop is **single-player vs AI**. The architecture is already favorable: deterministic-ish
fixed timestep, one canvas, and the AI plugs into the same `fighter` interface as the player.
Multiplayer is the highest-impact future feature; here's a staged path.

### 9.1 Prerequisites (do these regardless of mode)
1. **Lift global state into a `world` object** (§8.2) so a frame can be (de)serialized.
2. **Separate input from identity**: today `player` reads the mouse directly. Introduce an
   **input layer** — each fighter is driven by an `input` struct
   `{ aimX, aimY, punch, grab, special, tool }`. Local mouse fills P1's input; a remote peer or AI
   fills others'. `aimDir`, `punch`, `specialDown/Up`, tool actions all read from the fighter's
   input, not globals.
3. **Make the sim deterministic**: replace `Math.random()` in sim code with a **seeded PRNG**
   advanced in lockstep; quantize where needed. (Cosmetic-only randomness — sparks, taunts — can
   stay non-deterministic if it never affects gameplay.) This is required for rollback/lockstep.
4. **Fixed-step already exists** (`STEP 1/120`) — keep all gameplay in fixed steps; never advance
   sim in `render()`.

### 9.2 Mode A — Local / same-screen (fastest win)
- Add **P2 input from keyboard/gamepad** (or a second mouse via Pointer Events / WebHID).
- Reuse everything; just give P2 a `fighter` + an input source. No netcode.
- Great for couch play and demos; validates the input-layer refactor.

### 9.3 Mode B — Online, 1v1 (the real feature)
Two viable netcode models:

**B1. Deterministic lockstep + rollback (recommended for a 2-player fighter).**
- Transport: **WebRTC DataChannel** (P2P, low latency) with a tiny signaling server
  (WebSocket) for handshake; or a relay if P2P fails.
- Each client sends **inputs** (not state) per tick, tagged with the frame number.
- Simulate locally with predicted remote input; on receiving the true input, **rollback** to the
  last confirmed frame and re-simulate. Requires: deterministic sim (§9.1), cheap
  **state snapshot/restore** of the `world`, and input delay/prediction tuning.
- Pros: minimal bandwidth, crisp feel. Cons: needs determinism + snapshotting discipline.

**B2. Client-authoritative-host / state sync (simpler, more forgiving).**
- One peer is the **host** (authoritative sim); the other sends inputs and renders interpolated
  snapshots the host broadcasts (~20–30 Hz) with local prediction + reconciliation for the
  remote player's own cursor.
- Pros: no strict determinism needed. Cons: host advantage, more bandwidth, interpolation latency.

For a casual web brawler, **B2 is the pragmatic v1**; **B1** if competitive feel matters.

### 9.4 What changes in the codebase
- `fighter.js`: drive from `fighter.input`; remove direct `mx/my`/event reads from sim.
- `world`: `serialize()` / `deserialize()` for snapshots (B1) or periodic sync (B2).
- New `net.js`: transport, room/lobby, frame-synced input exchange, clock sync, rollback or
  interpolation.
- `main.js` loop: in netplay, advance the sim only when inputs for the tick are available (lockstep)
  or run prediction + reconcile (B2).
- UI: a **lobby/room** screen (create/join code), connection status, latency display; the existing
  character/stage select becomes a **shared, synchronized** pre-game (both players ready up).
- Determinism audit: seed PRNG; ensure `dt` is always the fixed step in sim; avoid float drift in
  shared code paths.

### 9.5 Scope guardrails
- Start with **1v1 only**, same character/stage rules as single-player, no spectators.
- Keep single-player vs AI as the default offline mode (it's the demo).
- Defer 3–4 player, ranked/matchmaking, and authoritative dedicated servers until 1v1 is solid.

---

## 10. Suggested roadmap (order of work)
1. **Refactor to Vite modules** (zero behavior change) + add a headless smoke test.
2. **Input layer + `world` state object** (unlocks local MP, replays, and netcode).
3. **Local 2-player** (couch) to validate the input refactor.
4. **Cursor Camp reskin** via `SPRITES` + the **share-the-moment clip** capture.
5. **Online 1v1** (start with B2 state-sync; consider B1 rollback if feel demands it).
6. **Content scale**: more specials/items/stages as data; community stage gallery + share-by-link.

---

## 11. Gotchas to respect (carried forward)
- **Force Quit must never bind to ⌘Q/⌘W/⌘T** — the OS/browser would kill the player's tab.
- **The KO model is hitstun, not spring-return** — never re-add a movement speed cap that clamps
  knockback (that once made KOs impossible).
- **The spring cursor is the soul** — the §3.5 constants are tuned; don't reset them casually.
- **Script runs before some markup historically caused a blank-screen crash** — keep
  `getElementById` targets present before the `<script>`, or guard. (All current ids must persist.)
- **Figma Make ≠ Figma plugins** — the in-game cursors are the game's own; you can't drive native
  Figma multiplayer cursors from a Make app. The companion plugin is a separate Plugin-API surface
  used only to *export a frame*, not to run the game.
