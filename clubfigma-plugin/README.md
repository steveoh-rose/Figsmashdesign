# Club Figma — Figma plugin

Runs the Club Figma lounge **inside Figma** so the Expo Hall can show real
thumbnails of the frames in your current document.

## How it works

- `code.js` — the plugin sandbox (main thread). Scans every page for top-level
  frames/components, exports each as a small PNG, and streams them to the UI as
  `{ type: 'TEAM_FILES', files: [...] }`. Re-runs on document changes.
- `ui.html` — the Club Figma web app, built into a single self-contained file.
  The Expo Hall asks for files with `{ type: 'GET_TEAM_FILES' }` and renders the
  thumbnails it gets back. (This file is generated — see Building.)
- `manifest.json` — wires `code.js` + `ui.html` together and allows the Google
  Fonts domains used by the pixel UI.

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
