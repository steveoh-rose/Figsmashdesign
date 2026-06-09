# Club Figma — Figma plugin

Runs the Club Figma lounge **inside Figma** so the Expo Hall can show real
thumbnails of the frames in your current document.

## How it works

The Expo Hall has two data sources:

1. **Current file** (always on) — `code.js` (the plugin sandbox) scans every page
   for top-level frames/components, exports each as a small PNG, and streams them
   to the UI as `{ type: 'TEAM_FILES', files: [...] }`. Re-runs on document changes.
2. **Recent org files** (after you connect) — the UI calls the Figma REST API to
   list the most recently edited files across your team's projects, so you can
   see what everyone's working on. This needs a personal access token + team ID.

Files involved:
- `code.js` — sandbox: current-file scan + stores your connection in
  `clientStorage` (the sandbox can't `fetch`, so the REST calls run in the UI).
- `ui.html` — the Club Figma web app, built into a single self-contained file
  (generated — see Building).
- `manifest.json` — wires `code.js` + `ui.html`, and allows the Google Fonts +
  `api.figma.com` + Figma thumbnail domains.

## Connecting your org (recent files)

1. Run the plugin, click **🔌 CONNECT** (top-right).
2. Paste a **personal access token** — Figma → Settings → Security → Personal
   access tokens, scope **file_read**.
3. Set your **Team ID** — the number in your team URL
   `figma.com/files/team/<ID>/…` (a default is pre-filled).
4. **Connect.** The Expo Hall now shows your team's most-recently-edited files.
   The token is stored only in Figma's local plugin storage and never leaves it.

## Building

```bash
pnpm build:plugin
```

This runs `vite build` and then inlines the JS/CSS into `clubfigma-plugin/ui.html`.

## Installing in Figma

1. Open the Figma **desktop** app.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Choose `clubfigma-plugin/manifest.json`.
4. Open any design file with frames, then run **Plugins → Development → Club Figma**.
5. Walk into the **Expo Hall** — the gallery fills with your real frames.

> Outside the plugin (e.g. the Figma Make web preview) there is no sandbox to
> answer `GET_TEAM_FILES`, so the Expo Hall shows placeholder mock files. That is
> expected — a browser page cannot read your Figma files without the plugin host.
