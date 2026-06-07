# Fig Smash Exporter — Figma plugin

Export any Figma frame into a **destructible stage** for [Fig Smash](../fig-smash-phase4.html).
Your design's layers become grabbable, throwable, sliceable props you can smash.

## Install (development)
1. In the **Figma desktop app**: `Plugins → Development → Import plugin from manifest…`
2. Choose `figma-plugin/manifest.json` from this repo.

## Use it
1. Select a **frame** (or component / group / section) on the canvas.
2. Run `Plugins → Development → Fig Smash Exporter`.
3. Click **Copy** (or **Download .json**).
4. In Fig Smash: pick your character → **Choose your stage** → **⬆ Import Figma frame** →
   paste the data (or choose the downloaded file) → **Import & select** → **START BATTLE**.

The imported frame appears as the **"Your Frame"** stage and is remembered between sessions.

## What gets exported
- The selected frame's **top-level (direct) children**, up to **60** layers, positioned relative to the frame.
- Each layer's size, first **solid fill** (as a hex color), corner radius, and shape
  (`rect` / `ellipse` / `text`). `TEXT` layers also carry their characters (first 40 chars).
- Nested children, images, gradients, effects, and vectors are simplified to a colored box —
  this is a game stage, not a pixel-perfect render.

## Payload format
The plugin emits this JSON (the game also accepts it directly):

```json
{
  "type": "figsmash-frame",
  "version": 1,
  "name": "My Frame",
  "width": 1200,
  "height": 800,
  "nodes": [
    { "name": "Button", "x": 100, "y": 200, "w": 160, "h": 48,
      "fill": "#0d99ff", "shape": "rect", "radius": 8,
      "text": "Click me", "textColor": "#ffffff" }
  ]
}
```

No network access is used — the data goes Figma → clipboard/file → game.
