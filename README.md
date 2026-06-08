
  # FigConsole 67 — The Stakeholder Waiting Room

  The lowest-productivity hours of a designer's week are spent *waiting for
  feedback*. **FigConsole 67** is a fictional 8-bit retro arcade console you boot
  inside Figma while a stakeholder reviews your file — swap in a cartridge, rack
  up a high score, and turn dead time into "Time Saved While Waiting".

  ## The console

  A vintage "Game Creator Pro" desktop (eggplant frames, gold buttons, slate
  desktop, Press Start 2P type). Pick a cartridge and watch it slide into the
  slot, boot, and load:

  - **FigSmash** (Brawler) — KO *The Unaligned Stakeholder*. Reuses the pixel
    Smash-arena engine; a win flashes `FILE APPROVED!`.
  - **FigHero** (Rhythm) — a 4-lane shortcut drill. Figma tool icons (V/P/T/R)
    drop to an 8-bit beat; hit the matching key on the strike line. Combos
    multiply the score, misses fire a bit-crushed buzzer.
  - **FigContrast** (Calibrate) — a downscaled pixel scene is thrown out of
    whack; dial the BRIGHT / SATUR / HUE sliders to match the target. Closer +
    faster = bigger score.

  High scores and the Time Saved counter persist via `localStorage`. Source lives
  in `src/app/console/`.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  