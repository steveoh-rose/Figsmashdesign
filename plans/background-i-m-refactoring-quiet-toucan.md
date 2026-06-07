# Plan: "Launch in Fig Smash" — Seamless Plugin-to-Game Flow

## Context

The current flow is copy-paste-heavy: user runs the plugin → copies or downloads JSON → switches to the browser → opens import dialog → pastes → plays. The goal is a single click in the Figma plugin that opens Fig Smash in the browser with the selected frame already loaded, skipping every manual step.

## Approach: URL-hash deep link

Figma plugins can call `figma.openExternal(url)` to open any URL in the user's default browser. We encode the frame payload as a base64 URL-safe string in the hash (`#figsmash=…`), and the React app decodes it on mount.

- **No server needed** — pure client-side, no relay, no clipboard gymnastics.
- **URL size**: shape/fill/text-only payload for 40 nodes ≈ 4 KB JSON → ~5.5 KB base64 — well within browser URL limits.
- **Images**: strip inline `img` fields from the URL payload (they can be MB each). The game renders colored boxes with fills when no image is present — already the fallback behavior. Full-image export still available via Copy/Download.

---

## Part 1 — Figma Plugin (`src/imports/`)

### `code.js` changes
1. Add `buildUrlPayload()` — same as `buildPayload()` but skips the `exportAsync` call (no images). Produces a lean shape/fill/text-only payload.
2. After the payload is built, serialize to JSON, base64-encode with `btoa(unescape(encodeURIComponent(json)))`, and set on the UI via a new `postMessage` type `'url-payload'`.
3. Keep the existing full-image `buildPayload()` path untouched for Copy/Download.
4. Update `figma.ui.onmessage` to handle a new `'launch'` message: call `figma.openExternal(url)` with the encoded hash URL.

### `manifest.json` changes
- `figma.openExternal` does **not** require `networkAccess` changes. No edits needed unless we want to allow fetching the current app URL dynamically.

### `ui.html` changes
1. Add a **"Launch in Fig Smash ↗"** primary button above the existing row.
2. When the plugin sends `'url-payload'`, store the encoded string.
3. On "Launch" click: post `{ type: 'launch', url: 'https://<figsmash-origin>/#figsmash=' + encoded }` to the plugin — plugin calls `figma.openExternal`.
4. Make the Fig Smash origin configurable via a small editable URL field (defaulting to `localhost:5173` for dev, with an easy override for production). Store preference in `localStorage` within the plugin iframe.
5. Update status text: `"Ready — Launch or Copy"`.

### UX improvements (bundled into same change)
- Show **node count + frame name** in status as soon as selection resolves (already mostly done, polish wording).
- Add a **layer-count warning** when nodes ≥ 35: `"Heads up: only 40 layers exported"`.
- Keep the existing textarea + Copy + Download for full-image export (power users, offline use).

---

## Part 2 — React App (`src/app/`)

### `App.tsx` (or a `useDeepLink` hook, called from App)
1. On mount, read `window.location.hash`.
2. If it starts with `#figsmash=`: decode base64 → parse JSON → validate (same checks as `importFrame()`).
3. Call `importFrame(data)` directly to store in `customFrame` + `localStorage`.
4. Clear the hash from the URL (`history.replaceState(null, '', location.pathname + location.search)`) so refresh doesn't re-import.
5. Set initial screen to `'mapselect'` (or optionally `'game'` with `pendingMap = custom` if we want zero-click-to-play).
6. Show a brief **"Frame imported from Figma!"** toast/banner for 3 seconds.

### Where the hook lives
- Create `src/app/hooks/useDeepLink.ts` — keeps `App.tsx` clean.
- Export one function `useDeepLink(importFrame: (data) => void, setScreen: (s) => void)`.
- Called once at the top of the `App` component.

### Toast/banner
- A simple absolutely-positioned div that fades out — no new dependency needed.
- Can reuse existing CSS classes from `figsmash.css` if a suitable style already exists, otherwise add minimal inline styles.

---

## Files to modify

| File | Change |
|------|--------|
| `src/imports/code.js` | Add `buildUrlPayload()`, `'launch'` message handler |
| `src/imports/ui.html` | Add "Launch" button, URL field, `'url-payload'` handler |
| `src/app/App.tsx` | Call `useDeepLink` hook on mount |
| `src/app/game/engine.ts` | Export `importFrame` so the hook can call it (or expose via a ref/callback already passed to App) |

**New file:**
- `src/app/hooks/useDeepLink.ts`

---

## Improvements beyond just "launch"

| Idea | Value | Effort |
|------|-------|--------|
| Configurable target URL in plugin UI | Dev vs prod without re-building plugin | Low |
| Layer count warning (≥35) in plugin | Prevents silent truncation surprise | Low |
| Auto-select "Your Frame" stage + go straight to battle | True zero-step flow | Medium |
| Thumbnail preview in plugin (draw nodes to a small canvas) | Confidence before launching | Medium |
| JPEG + aggressive scale for URL-embedded images | Keeps images while fitting URL limits | High |

For this plan we implement: Launch button, configurable URL, layer warning, and the deep-link handler with toast. The "straight to battle" shortcut is left as a toggleable option (checkbox in plugin UI: "Auto-start battle").

---

## Verification

1. Load the plugin in Figma desktop (development mode via manifest).
2. Select a frame with ≤40 layers.
3. Plugin status shows node count; click **"Launch in Fig Smash ↗"**.
4. Browser opens Fig Smash at `localhost:5173/#figsmash=…`.
5. App mounts → hash detected → frame imported → toast shown → map select screen opens with "Your Frame" card pre-populated.
6. Select "Your Frame" → Start Battle → stage spawns with correct layout.
7. Refresh the page → hash is gone → frame persists via `localStorage` → no double-import.
8. Test error path: malformed hash → app shows error toast, lands on normal start screen.
