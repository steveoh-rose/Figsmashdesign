
  # RIP Designs — The Catharsis Garden

  Design burnout, turned into a ritual. **RIP Designs** (formerly FigSmash) lets
  designers violently purge a killed Figma file in a Super Smash–style combat
  sequence against "The Heartless Client," then watch the structural debris bloom
  into a hand-drawn Zen garden they can archive and eulogize.

  ## The loop

  1. **The Smash Arena** — the imported frame's layers become the combat stage.
     Defeat the AI client and the layer integrity hits 0%.
  2. **The Rebirth Bloom** — the destroyed frame's data signature (colour palette +
     layer volume) grows a custom botanical doodle. Name it, eulogize it, plant it.
  3. **The Persistent Graveyard Grid** — every purged design occupies a coordinate on
     a dotted matrix. Hover a plant for a glowing ghost blueprint of the dead layout.
  4. **Tombstone Eulogies** — click a plant to open its post-mortem card and read or
     edit why the file was killed.

  Garden state persists via `localStorage` (the sandbox stand-in for Figma's
  `figma.clientStorage`) using the schema in [the PRD](plans/) — see
  `src/app/garden/`.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  