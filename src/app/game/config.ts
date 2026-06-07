/**
 * Tuned constants and data-driven config. PRD §3.5 — DO NOT CHANGE these values.
 * Mutable: T (sliders write to it). Immutable: CHARACTERS, SHAPES, LEVELS, palettes.
 */

export type AbilityId = 'fireball' | 'lightning' | 'fire' | 'energy' | 'boomerang';
export type CursorShape = 'arrow' | 'triangle' | 'diamond' | 'ring' | 'plus';

export interface Character {
  id: string;
  name: string;
  shape: CursorShape;
  color: string;
  glow: string;
  rgb: string;
  ability: AbilityId;
  desc: string;
}

export interface Shape {
  id: string;
  name: string;
  key: string;
  icon: string;
}

export interface Level {
  id: string;
  short: string;
  desc: string;
  reaction: number;
  jitter: number;
  aggro: number;
  speedCap: number;
  driftOnly: boolean;
  canThrow: boolean;
  canDodge: boolean;
  canPunch: boolean;
  leadAim: boolean;
  wind: number;
}

// Mutable — sliders write through to this object.
export const T = {
  k: 220, c: 40, m: 2.2, power: 1,
  gravity: 1400, bounce: 0.45,
  punchDmg: 6, knock: 230,
  aiReaction: 0.42, aiJitter: 0.30, aiAggro: 0.30,
  scaleMax: 3.2, scaleKnock: 2.0,
};

export const LEVELS: Level[] = [
  { id: 'ollama', short: 'ollama', desc: 'just vibes toward you. harmless.',     reaction: 0.90, jitter: 0.50, aggro: 0.00, speedCap: 240, driftOnly: true,  canThrow: false, canDodge: false, canPunch: false, leadAim: false, wind: 0.50 },
  { id: 'haiku',  short: 'haiku',  desc: 'fast reflexes, shallow tactics.',       reaction: 0.42, jitter: 0.30, aggro: 0.30, speedCap: 540, driftOnly: false, canThrow: true,  canDodge: false, canPunch: true,  leadAim: false, wind: 0.42 },
  { id: 'sonnet', short: 'sonnet', desc: 'sharp all-rounder. reads your throws.', reaction: 0.26, jitter: 0.14, aggro: 0.55, speedCap: 660, driftOnly: false, canThrow: true,  canDodge: true,  canPunch: true,  leadAim: true,  wind: 0.30 },
  { id: 'opus',   short: 'opus',   desc: 'relentless, precise, leads your moves.', reaction: 0.14, jitter: 0.05, aggro: 0.85, speedCap: 780, driftOnly: false, canThrow: true,  canDodge: true,  canPunch: true,  leadAim: true,  wind: 0.22 },
];

export const CHARACTERS: Character[] = [
  { id: 'mario',   name: 'Oldschool Plumber', shape: 'arrow',    color: '#e52521', glow: 'rgba(229,37,33,.5)',  rgb: '229,37,33',  ability: 'fireball',  desc: 'Fireball Shot' },
  { id: 'pikachu', name: 'Electric Rat',      shape: 'triangle', color: '#ffcb05', glow: 'rgba(255,203,5,.5)',  rgb: '255,203,5',  ability: 'lightning', desc: 'Lightning Charge' },
  { id: 'fox',     name: 'Flame Dog',         shape: 'diamond',  color: '#f0820f', glow: 'rgba(240,130,15,.5)', rgb: '240,130,15', ability: 'fire',      desc: 'Fire Charge' },
  { id: 'samus',   name: 'Space Gurl',        shape: 'ring',     color: '#ff5a3c', glow: 'rgba(255,90,60,.5)',  rgb: '255,90,60',  ability: 'energy',    desc: 'Energy Ball (hold)' },
  { id: 'link',    name: 'Sleepy Elf',        shape: 'plus',     color: '#2fa84f', glow: 'rgba(47,168,79,.5)',  rgb: '47,168,79',  ability: 'boomerang', desc: 'Homing Boomerang' },
];

export const SHAPES: Shape[] = [
  { id: 'rectangle', name: 'Rectangle', key: 'R',  icon: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>' },
  { id: 'line',      name: 'Line',      key: 'L',  icon: '<path d="M5 19L19 5"/>' },
  { id: 'arrow',     name: 'Arrow',     key: '⇧L', icon: '<path d="M6 18L18 6"/><path d="M10 6h8v8"/>' },
  { id: 'ellipse',   name: 'Ellipse',   key: 'O',  icon: '<circle cx="12" cy="12" r="8"/>' },
  { id: 'polygon',   name: 'Polygon',   key: '',   icon: '<path d="M12 4l8 15H4z"/>' },
  { id: 'star',      name: 'Star',      key: '',   icon: '<path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.3 6.8 19l1-5.8L3.6 9.1l5.8-.8z"/>' },
];

export const SHAPE_PALETTE: [string, string][] = [
  ['#9747ff', '151,71,255'],
  ['#0d99ff', '13,153,255'],
  ['#34e0d8', '52,224,216'],
  ['#ff4d97', '255,77,151'],
  ['#1db954', '29,185,84'],
  ['#ffd23f', '255,210,63'],
];

export const TILE_COLORS: [string, string][] = [
  ['#1db954', '#0e7a38'],
  ['#9747ff', '#5b2ea6'],
  ['#0d99ff', '#0a5ea8'],
  ['#ff4d97', '#a82e63'],
  ['#ffd23f', '#c79a17'],
  ['#34e0d8', '#1f9c96'],
];

export const TAUNTS = ['idc', 'cry', 'ez', 'ship it', 'skill issue', 'git gud', 'lol', 'nice try'];

// Spring/squash visuals.
export const STRETCH_MAX = 0.32;
export const STRETCH_DIV = 3400;
export const SQUASH_MAX = 0.45;

// Combat geometry.
export const FIGHTER_R = 24;
export const PUNCH_RANGE = 60;
export const GRAB_RANGE = 40;
export const KO_MARGIN = 70;
export const HITSTUN_FRICTION = 0.8;

// Slice tool.
export const SLICE_MIN_SPEED = 620;
export const SLICE_DMG = 7;
export const SLICE_KNOCK = 200;
export const SLICE_FIGHTER_CD = 0.22;

// Drops + match flow.
export const DROP_TYPES = ['raygun', 'star'] as const;
export const DROP_R = 21;
export const RESPAWN_TIME = 2.4;
export const STOCKS_TO_WIN = 5;

// Sprite reskin seam. null = vector art.
export const SPRITES: Record<string, string | null> = {
  background: null, player: null, cpu: null, prop: null,
};
export const SPRITE_SCALE: Record<string, number> = { player: 1, cpu: 1, prop: 1 };
