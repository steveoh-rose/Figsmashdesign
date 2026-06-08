/**
 * RIP Designs — The Catharsis Garden state schema.
 * Mirrors the production Figma Client Storage Matrix (figma.clientStorage) shape
 * defined in the PRD §4 so the sandbox prototype ports cleanly.
 */

/** One destroyed design, reborn as a plant on the graveyard grid. */
export interface PurgedDesign {
  /** Stable id, e.g. "rip_design_1717869162". */
  id: string;
  /** Original Figma file/frame name, e.g. "Dashboard_v4_FINAL_client_edits.fig". */
  fileName: string;
  /** ISO-8601 purge timestamp. */
  timestamp: string;
  /** Total layers destroyed in the Smash Arena. */
  layerCount: number;
  /** Primary + secondary HEX codes ingested from the original design system. */
  colorPalette: string[];
  /** The designer's post-mortem eulogy. Empty until written. */
  eulogyComment: string;
  /** Coordinate on the dotted graveyard matrix. */
  gardenCoordinates: { x: number; y: number };
  /** Which botanical sprite sprouted (derived from layer volume). */
  plantSpriteIndex: number;
}

/** The signature the Smash Arena hands off when the Heartless Client is defeated. */
export interface BattleDNA {
  fileName: string;
  layerCount: number;
  colorPalette: string[];
}
