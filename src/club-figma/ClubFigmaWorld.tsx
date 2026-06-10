/**
 * Club Figma World — FigConsole 67.
 *
 * Your mouse cursor IS your avatar. Move it around the canvas to explore
 * sectors. Approach zones to reveal prompts; press Space or click to interact.
 *
 * Sectors: Cursor Camp (hub) → The Office | Component Arcade | Hex Garden | Prototype Pipeline
 *
 * Real designs: when run as a Figma plugin (see clubfigma-plugin/), the plugin
 * sandbox streams thumbnails of the document's frames over postMessage. Outside
 * a plugin (e.g. the Make web preview) the Office falls back to mock files.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConsole, type CartridgeId } from './console/store';
import { FigConsole } from './console/FigConsole';
// FigSmash brawler DOM — mounted once (hidden) so FigConsole can drive it via RIPArena.
import { GameCanvas } from '../app/components/GameCanvas';
import { HudHeader } from '../app/components/HudHeader';
import { CharacterSelect } from '../app/components/screens/CharacterSelect';
import { MapSelect } from '../app/components/screens/MapSelect';
import { WinScreen } from '../app/components/screens/WinScreen';
import { PauseMenu } from '../app/components/screens/PauseMenu';
import { ForceQuitDialog } from '../app/components/ForceQuitDialog';
import { Toolbar } from '../app/components/Toolbar';
import { InspectorPanel } from '../app/components/InspectorPanel';
import { FigmaChrome } from '../app/components/FigmaChrome';
import { CharacterArtMounts } from '../app/components/CharacterArtMounts';
import { ImportDialog } from '../app/components/screens/ImportDialog';
import { mountEngine } from '../app/game/engine';
import '../styles/figsmash.css';
import './console/console.css';
import './world.css';

// ── Types ────────────────────────────────────────────────────────────────────

type RoomId = 'camp' | 'arcade' | 'office' | 'garden' | 'pipeline';
type GameId = 'fighero' | 'figcontrast' | 'figalign' | 'figsmash';

interface Zone {
  id: string;
  label: string;
  hint: string;
  x: number; y: number; w: number; h: number;
  type: 'door' | 'cabinet' | 'frame' | 'deco' | 'wardrobe' | 'wire';
  action?: () => void;
}

interface TransitState {
  progress: number;
  targetRoom: RoomId;
  p0x: number; p0y: number;
  p1x: number; p1y: number;
  p2x: number; p2y: number;
  p3x: number; p3y: number;
}

interface CursorChar { id: string; name: string; color: string; }

const CURSOR_CHARS: CursorChar[] = [
  { id: 'ink',   name: 'INK CURSOR',   color: '#2f6bff' },
  { id: 'spark', name: 'SPARK CURSOR', color: '#ffc21f' },
  { id: 'ember', name: 'EMBER CURSOR', color: '#f0820f' },
  { id: 'orbit', name: 'ORBIT CURSOR', color: '#ff5a8a' },
  { id: 'loop',  name: 'LOOP CURSOR',  color: '#1db981' },
];

const TRANSIT_DURATION = 3.2;

interface NPC {
  id: number;
  name: string; color: string;
  x: number; y: number;
  tx: number; ty: number;
  trail: Array<{ x: number; y: number }>;
  idleTimer: number;
}

interface FigmaFile {
  key: string;
  name: string;
  team: string;
  thumbnail?: string;
  lastModified?: string;
  url?: string;     // deep link to open in Figma
  change?: string;  // "what changed since the last version" (from version history)
  author?: string;  // who last edited
}

interface FigmaConfig {
  token: string;
  teamId: string;
}

// Default team id for this workspace (overridable in the Connect panel).
const DEFAULT_TEAM_ID = '976058076181350431';

// ── Explorer camera (Cursor Camp feel) ───────────────────────────────────────
// Each room is a world larger than the viewport; the camera zooms in on the
// avatar and pans as you move, like Cursor Camp / Club Penguin.
const WORLD_SCALE = 1.6;   // world is this much bigger than the screen
const ZOOM = 1.4;          // how far the camera zooms in on the cursor
const SPRING_K = 150;      // cursor follow stiffness (FigSmash-style spring)
const SPRING_DAMP = 19;    // cursor follow damping
const CAM_SPEED = 5.5;     // camera glide speed (lower = floatier pan)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function relTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

// Pull recent files across a team's projects via the Figma REST API. Only works
// inside the plugin (the manifest allows api.figma.com); sorted newest-first.
async function fetchOrgFiles(cfg: FigmaConfig, limit = 12): Promise<FigmaFile[]> {
  const headers = { 'X-Figma-Token': cfg.token };
  const projRes = await fetch(`https://api.figma.com/v1/teams/${cfg.teamId}/projects`, { headers });
  if (!projRes.ok) throw new Error(`projects ${projRes.status}`);
  const projData = await projRes.json();
  const projects: Array<{ id: string; name: string }> = projData.projects || [];

  const all: FigmaFile[] = [];
  // Cap project fan-out so a huge org doesn't hammer the API.
  for (const proj of projects.slice(0, 8)) {
    try {
      const fRes = await fetch(`https://api.figma.com/v1/projects/${proj.id}/files`, { headers });
      if (!fRes.ok) continue;
      const fData = await fRes.json();
      for (const f of (fData.files || [])) {
        all.push({
          key: f.key,
          name: f.name,
          team: proj.name,
          thumbnail: f.thumbnail_url,
          lastModified: relTime(f.last_modified),
          url: `https://www.figma.com/file/${f.key}`,
          // keep raw timestamp for sorting
          ...(f.last_modified ? { _ts: new Date(f.last_modified).getTime() } : {}),
        } as FigmaFile & { _ts?: number });
      }
    } catch { /* skip project */ }
  }
  all.sort((a, b) => ((b as any)._ts || 0) - ((a as any)._ts || 0));
  const top = all.slice(0, limit);

  // For the files we'll actually show, read their version history and summarise
  // "what changed since the last version" for the gallery item footer.
  await Promise.all(top.map(async (f) => {
    const c = await fetchFileChange(cfg, f.key);
    if (c.change) f.change = c.change;
    if (c.author) f.author = c.author;
  }));
  return top;
}

// Summarise the most recent change to a file from its version history. Prefers a
// named version's label/description; falls back to who last edited + when.
async function fetchFileChange(cfg: FigmaConfig, key: string): Promise<{ change?: string; author?: string }> {
  try {
    const r = await fetch(`https://api.figma.com/v1/files/${key}/versions`, { headers: { 'X-Figma-Token': cfg.token } });
    if (!r.ok) return {};
    const data = await r.json();
    const versions: Array<{ label?: string; description?: string; created_at?: string; user?: { handle?: string } }> = data.versions || [];
    if (!versions.length) return {};
    const named = versions.find((v) => (v.label && v.label.trim()) || (v.description && v.description.trim()));
    const v = named || versions[0];
    const who = v.user?.handle;
    const note = (v.description || v.label || '').trim().replace(/\s+/g, ' ');
    const change = note || (who ? `${who} made edits` : `edited ${relTime(v.created_at)}`);
    return { change, author: who };
  } catch {
    return {};
  }
}

// Trim canvas text to fit a pixel width, adding an ellipsis.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

// Render a crisp, full-res screenshot of a file's first frame for the expanded
// modal (the list thumbnail is fine for the wall, but small up close). Best
// effort: returns a PNG URL, or null on any hiccup (caller falls back to the
// thumbnail).
async function fetchFileScreenshot(cfg: FigmaConfig, key: string): Promise<string | null> {
  try {
    const headers = { 'X-Figma-Token': cfg.token };
    const meta = await fetch(`https://api.figma.com/v1/files/${key}?depth=2`, { headers });
    if (!meta.ok) return null;
    const doc = await meta.json();
    const pages = doc.document?.children || [];
    let nodeId: string | null = null;
    for (const pg of pages) {
      const frame = (pg.children || []).find((c: any) => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'SECTION');
      if (frame) { nodeId = frame.id; break; }
    }
    if (!nodeId) nodeId = pages[0]?.id || null;
    if (!nodeId) return null;
    const img = await fetch(`https://api.figma.com/v1/images/${key}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`, { headers });
    if (!img.ok) return null;
    const data = await img.json();
    return data.images?.[nodeId] || null;
  } catch {
    return null;
  }
}

// ── Palette ──────────────────────────────────────────────────────────────────

// Floating-island palette ported from rip-designs-catharsis-garden:
// teal sky, warm cream paper, ink line-art, soft retro accents.
const P = {
  bg:        '#1e404a',  // sky night
  sky:       '#3a7d8c',
  skyDeep:   '#2b5e6b',
  skyNight:  '#1e404a',
  floor:     '#f3edc8',  // warm cream
  floorAlt:  '#e7dcae',
  wall:      '#2b5e6b',
  wallEdge:  '#3a7d8c',
  gold:      '#e6c64a',
  purple:    '#8fcad6',  // cloud (soft accent)
  blue:      '#1abcfe',
  teal:      '#5a9b4a',
  coral:     '#d24b3e',
  green:     '#5a9b4a',
  orange:    '#e6a44a',
  ink:       '#2b2b3a',
  paper:     '#f3edc8',
  paperEdge: '#d9d09a',
  muted:     '#7c8a86',
  // Hex Garden
  gardenDeep: '#1e6b5e',
  gardenMid:  '#2e8a7a',
  gardenTop:  '#8fcad6',
  // Prototype Pipeline
  pipeSky:    '#87ceeb',
  pipeDeep:   '#2a1b7a',
  pipeWire0:  '#6644ff',
  pipeWire1:  '#8855ff',
  pipeWire2:  '#aa66ff',
};

// ── NPC data ─────────────────────────────────────────────────────────────────

const NPC_DEFS = [
  { name: 'maya_c',   color: '#ff4d97' },
  { name: 'devops_j', color: '#34e0d8' },
  { name: 'rx_ux',    color: '#f5c842' },
  { name: 'p.lim',    color: '#b48eff' },
  { name: 'alex_d',   color: '#1abcfe' },
];

// ── Room background drawing ───────────────────────────────────────────────────

function drawCheckerFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tileSize = 44) {
  for (let tx = x; tx < x + w; tx += tileSize) {
    for (let ty = y; ty < y + h; ty += tileSize) {
      const even = (Math.floor((tx - x) / tileSize) + Math.floor((ty - y) / tileSize)) % 2 === 0;
      ctx.fillStyle = even ? P.floor : P.floorAlt;
      ctx.fillRect(tx, ty, tileSize, tileSize);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(cx - 7 * scale, cy - 6 * scale, 14 * scale, 22 * scale);
  ctx.fillStyle = '#2d6e2d';
  ctx.beginPath(); ctx.arc(cx, cy - 18 * scale, 26 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a8a3a';
  ctx.beginPath(); ctx.arc(cx - 10 * scale, cy - 26 * scale, 18 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10 * scale, cy - 22 * scale, 16 * scale, 0, Math.PI * 2); ctx.fill();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawHexFire(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  // Stone ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sx = cx + Math.cos(a) * 28;
    const sy = cy + 8 + Math.sin(a) * 16;
    ctx.fillStyle = i % 2 === 0 ? '#7a7060' : '#5a5048';
    ctx.beginPath(); ctx.ellipse(sx, sy, 7, 5, a, 0, Math.PI * 2); ctx.fill();
  }
  // Logs
  ctx.fillStyle = '#5a3010';
  ctx.beginPath(); ctx.ellipse(cx - 18, cy + 8, 18, 9, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 18, cy + 8, 18, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  // Ember glow
  const grd = ctx.createRadialGradient(cx, cy - 4, 0, cx, cy - 4, 52);
  grd.addColorStop(0, 'rgba(255,160,20,0.52)');
  grd.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy - 4, 52, 0, Math.PI * 2); ctx.fill();
  // Flame tongues
  const flames = [{ ox: -9, h: 38, w: 1.4 }, { ox: 0, h: 52, w: 1.0 }, { ox: 9, h: 32, w: 1.7 }];
  for (const f of flames) {
    const flicker = Math.sin(t * 3.5 + f.w * 2) * 5;
    const fx = cx + f.ox;
    const fy = cy + 12;
    ctx.fillStyle = `rgba(255,${100 + Math.floor(Math.sin(t * 2 + f.w) * 50)},0,0.85)`;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx - 14 + flicker, fy - f.h * 0.5, fx + flicker, fy - f.h);
    ctx.quadraticCurveTo(fx + 14 + flicker, fy - f.h * 0.5, fx, fy);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${0.6 + 0.2 * Math.sin(t * 4 + f.w)})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx - 5 + flicker, fy - f.h * 0.4, fx + flicker, fy - f.h * 0.7);
    ctx.quadraticCurveTo(fx + 5 + flicker, fy - f.h * 0.4, fx, fy);
    ctx.fill();
  }
  // Sparks
  for (let i = 0; i < 5; i++) {
    const phase = (t * 1.2 + i * 1.3) % 2;
    const sx = cx + Math.sin(i * 2.1) * 14 + Math.sin(t * 2 + i) * 6;
    const sy = cy - phase * 32;
    if (phase < 1.8) {
      ctx.fillStyle = `rgba(255,${180 + i * 12},50,${1 - phase / 1.8})`;
      ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFountain(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  // Basin
  ctx.fillStyle = '#3a7aa8';
  ctx.beginPath(); ctx.ellipse(cx, cy, 56, 36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a5a80'; ctx.lineWidth = 3; ctx.stroke();
  // Water shimmer
  ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.15 * Math.sin(t * 2)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, 32, 20, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, 18, 11, 0, 0, Math.PI * 2); ctx.stroke();
  // Spout
  ctx.fillStyle = '#7aadd0';
  ctx.beginPath(); ctx.ellipse(cx, cy - 6, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Water arcs
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t;
    const x2 = cx + Math.cos(angle) * 30;
    const y2 = cy + Math.sin(angle) * 18 - 12;
    ctx.strokeStyle = 'rgba(100,180,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.quadraticCurveTo(cx + Math.cos(angle) * 20, cy - 28, x2, y2);
    ctx.stroke();
  }
}

function drawCampRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Ceiling strip
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, W, 58);
  // Floor
  drawCheckerFloor(ctx, 0, 58, W, H - 58);
  // Wainscoting
  ctx.fillStyle = P.wallEdge;
  ctx.fillRect(0, 58, W, 6);
  ctx.fillStyle = P.gold;
  ctx.fillRect(0, 60, W, 3);

  // Title
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CURSOR CAMP', W / 2, 38);
  ctx.fillStyle = P.purple;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('THE HUB · YOUR CURSOR\'S HOME BASE', W / 2, 52);

  // Figma logo mark
  const lx = W / 2 - 82, ly = 14;
  ctx.fillStyle = '#1abcfe'; ctx.beginPath(); ctx.arc(lx + 6, ly + 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0acf83'; ctx.fillRect(lx, ly + 6, 6, 12); ctx.beginPath(); ctx.arc(lx + 3, ly + 18, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff7262'; ctx.fillRect(lx + 6, ly, 6, 12); ctx.beginPath(); ctx.arc(lx + 9, ly + 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f24e1e'; ctx.fillRect(lx, ly, 6, 12); ctx.beginPath(); ctx.arc(lx + 3, ly + 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a259ff'; ctx.beginPath(); ctx.arc(lx + 3, ly + 15, 3, 0, Math.PI * 2); ctx.fill();

  // Hex campfire (center)
  drawHexFire(ctx, W / 2, H / 2 + 20, t);

  // Sitting logs around the fire
  ctx.fillStyle = '#7a4820';
  ctx.fillRect(W / 2 - 90, H / 2 + 34, 58, 12);
  ctx.fillRect(W / 2 + 32, H / 2 + 34, 58, 12);
  ctx.fillRect(W / 2 - 24, H / 2 + 68, 48, 10);

  // Corner trees (3 of 4 — bottom-right replaced by wardrobe)
  drawTree(ctx, 80, H * 0.72, 0.9);
  drawTree(ctx, 80, H * 0.35, 0.7);
  drawTree(ctx, W - 80, H * 0.35, 0.7);

  // Style Wardrobe cabinet (bottom-right)
  const wz = zones.find(z => z.type === 'wardrobe');
  if (wz) {
    const hot = wz.id === hoveredZoneId;
    ctx.fillStyle = hot ? '#8a6040' : '#6a4828';
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.strokeStyle = hot ? P.gold : '#c8a878';
    ctx.lineWidth = 2;
    ctx.strokeRect(wz.x, wz.y, wz.w, wz.h);
    const mid = wz.x + wz.w / 2;
    ctx.strokeStyle = hot ? P.gold : '#9a7848';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wz.x + 4, wz.y + 4, wz.w / 2 - 6, wz.h - 8);
    ctx.strokeRect(mid + 2, wz.y + 4, wz.w / 2 - 6, wz.h - 8);
    ctx.fillStyle = hot ? P.gold : '#c8a878';
    ctx.beginPath(); ctx.arc(mid - 4, wz.y + wz.h / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mid + 4, wz.y + wz.h / 2, 3, 0, Math.PI * 2); ctx.fill();
    // Color swatches
    CURSOR_CHARS.forEach((c, i) => {
      ctx.fillStyle = c.color;
      ctx.fillRect(wz.x + 5 + i * (wz.w - 10) / 5, wz.y + wz.h - 14, (wz.w - 10) / 5 - 1, 10);
    });
    ctx.fillStyle = hot ? P.gold : P.paper;
    ctx.font = 'bold 5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WARDROBE', wz.x + wz.w / 2, wz.y - 6);
  }

  // Side benches
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(130, H * 0.56, 70, 18);
  ctx.fillRect(130, H * 0.56 - 3, 70, 5);
  ctx.fillRect(W - 200, H * 0.56, 70, 18);
  ctx.fillRect(W - 200, H * 0.56 - 3, 70, 5);

  // Doors
  for (const z of zones) {
    if (z.type !== 'door') continue;
    const hot = z.id === hoveredZoneId;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(z.x + 4, z.y + 4, z.w, z.h);
    ctx.fillStyle = hot ? P.gold : P.wallEdge;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = hot ? '#fff' : P.purple;
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
    if (hot) {
      ctx.shadowColor = P.gold;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = P.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = hot ? P.ink : P.gold;
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2 + 3);
  }
}

function drawArcadeRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Dark floor with neon grid
  ctx.fillStyle = '#07030f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(100,60,180,0.18)';
  ctx.lineWidth = 1;
  const g = 36;
  for (let x = 0; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Ceiling
  ctx.fillStyle = '#0e0520';
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THE ARCADE', W / 2, 36);
  ctx.fillStyle = P.purple;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('PLAY WHILE YOU WAIT FOR REVIEW', W / 2, 50);

  // Neon ceiling lights
  const neonCols = ['#ff4d97', '#f5c842', '#1abcfe', '#0acf83'];
  const cabZones = zones.filter(z => z.type === 'cabinet');
  cabZones.forEach((z, i) => {
    const cx = z.x + z.w / 2;
    ctx.fillStyle = neonCols[i % neonCols.length];
    ctx.fillRect(cx - 22, 0, 44, 6);
    const grd = ctx.createLinearGradient(cx, 0, cx, 55);
    grd.addColorStop(0, neonCols[i % neonCols.length] + '55');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(cx - 40, 0, 80, 55);
  });

  // Cabinet colors per game
  const cabColors: Record<string, string> = {
    figsmash: '#ef5d52', fighero: '#4d7cff', figcontrast: '#2ec4b6', figalign: '#ff9f43',
  };
  const cabNames: Record<string, string> = {
    figsmash: 'FIGSMASH', fighero: 'FIGHERO', figcontrast: 'FIG\nCONTRAST', figalign: 'FIGALIGN',
  };
  const cabTags: Record<string, string> = {
    figsmash: 'BRAWLER', fighero: 'RHYTHM', figcontrast: 'CALIBRATE', figalign: 'SHAPE',
  };

  cabZones.forEach((z) => {
    const hot = z.id === hoveredZoneId;
    const col = cabColors[z.id.replace('cab-', '')] || '#888';
    const name = cabNames[z.id.replace('cab-', '')] || '?';
    const tag = cabTags[z.id.replace('cab-', '')] || '';

    // Cabinet shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(z.x + 6, z.y + 6, z.w, z.h);

    // Cabinet body
    ctx.fillStyle = hot ? col + 'cc' : '#12062a';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    // Border
    ctx.strokeStyle = hot ? '#fff' : col;
    ctx.lineWidth = hot ? 3 : 2;
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    // Screen bezel
    ctx.fillStyle = '#000';
    ctx.fillRect(z.x + 9, z.y + 13, z.w - 18, 52);
    // Screen glow
    const sg = ctx.createRadialGradient(z.x + z.w / 2, z.y + 39, 0, z.x + z.w / 2, z.y + 39, 30);
    sg.addColorStop(0, (hot ? col : '#222222') + 'ee');
    sg.addColorStop(1, '#060606');
    ctx.fillStyle = sg;
    ctx.fillRect(z.x + 11, z.y + 15, z.w - 22, 48);

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let sy = z.y + 15; sy < z.y + 63; sy += 3) {
      ctx.fillRect(z.x + 11, sy, z.w - 22, 1);
    }

    // Play icon when hot
    if (hot) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶', z.x + z.w / 2, z.y + 42);
    } else {
      // Pixel art decorations
      ctx.fillStyle = col + '66';
      for (let pi = 0; pi < 3; pi++) {
        ctx.fillRect(z.x + 16 + pi * 14, z.y + 26, 10, 8);
        ctx.fillRect(z.x + 16 + pi * 14, z.y + 38, 10, 8);
      }
    }

    // Control row
    ctx.fillStyle = '#1a0a30';
    ctx.fillRect(z.x + 6, z.y + 74, z.w - 12, 22);
    // Joystick
    ctx.fillStyle = '#3a2060'; ctx.beginPath(); ctx.arc(z.x + 22, z.y + 85, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(z.x + 22, z.y + 85, 5, 0, Math.PI * 2); ctx.fill();
    // Buttons
    const btnColors = [col, '#ff4455', '#44ff88'];
    btnColors.forEach((bc, bi) => {
      ctx.fillStyle = bc;
      ctx.beginPath(); ctx.arc(z.x + z.w - 24 + bi * 10, z.y + 85, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Cabinet base
    ctx.fillStyle = '#0a0318';
    ctx.fillRect(z.x - 3, z.y + z.h - 10, z.w + 6, 12);

    // Name
    ctx.fillStyle = hot ? '#fff' : P.purple;
    ctx.font = `bold 7px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    const lines = name.split('\n');
    lines.forEach((line, li) => {
      ctx.fillText(line, z.x + z.w / 2, z.y + z.h - 22 + li * 10);
    });
    ctx.fillStyle = col;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText(tag, z.x + z.w / 2, z.y + z.h - 5);

    // Active glow
    if (hot) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.shadowBlur = 0;
    }
  });

  // Back door
  const back = zones.find(z => z.type === 'door');
  if (back) {
    const hot = back.id === hoveredZoneId;
    ctx.fillStyle = hot ? P.gold : P.wallEdge;
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeStyle = hot ? '#fff' : P.purple;
    ctx.lineWidth = 2; ctx.strokeRect(back.x + 2, back.y + 2, back.w - 4, back.h - 4);
    ctx.fillStyle = hot ? P.ink : P.gold;
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(back.label, back.x + back.w / 2, back.y + back.h / 2 + 3);
  }
}

// Cubic bezier helper (1D)
function cbez(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function drawPipelineRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Sky gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#4a9cc8');
  bg.addColorStop(0.5, P.pipeSky);
  bg.addColorStop(1, '#c8e8f8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Clouds
  const clouds = [[W * 0.12, H * 0.14, 55, 22], [W * 0.48, H * 0.09, 85, 28], [W * 0.78, H * 0.16, 62, 22]];
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  for (const [cx, cy, cw, ch] of clouds) {
    ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 22, cy - 10, cw * 0.65, ch * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 18, cy - 6, cw * 0.55, ch * 0.65, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Ceiling band
  ctx.fillStyle = P.pipeDeep;
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 15px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PROTOTYPE PIPELINE', W / 2, 34);
  ctx.fillStyle = P.pipeWire1;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('RIDE THE INTERACTION WIRES', W / 2, 50);

  // 3 bezier wire "slides" (world-fraction coordinates)
  const wireDefs = [
    { fy0: 0.25, fy1: 0.10, fy2: 0.40, fy3: 0.25, col: P.pipeWire0, label: 'HOVER STATE' },
    { fy0: 0.50, fy1: 0.22, fy2: 0.65, fy3: 0.50, col: P.pipeWire1, label: 'ON CLICK' },
    { fy0: 0.72, fy1: 0.56, fy2: 0.86, fy3: 0.72, col: P.pipeWire2, label: 'AFTER DELAY' },
  ];
  const wireXFracs = [0, 0.28, 0.72, 1.0]; // x control point fractions

  wireDefs.forEach((wd, wi) => {
    const ax = 0,        ay = wd.fy0 * H;
    const bx = wireXFracs[1] * W, by = wd.fy1 * H;
    const cx2 = wireXFracs[2] * W, cy2 = wd.fy2 * H;
    const dx = W,        dy = wd.fy3 * H;

    // Glow pass
    ctx.shadowColor = wd.col;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = wd.col + '55';
    ctx.lineWidth = 30;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(bx, by, cx2, cy2, dx, dy); ctx.stroke();
    ctx.shadowBlur = 0;

    // Core tube
    ctx.strokeStyle = wd.col;
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(bx, by, cx2, cy2, dx, dy); ctx.stroke();

    // Inner highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(bx, by, cx2, cy2, dx, dy); ctx.stroke();

    // Animated dots flowing along wire
    for (let di = 0; di < 4; di++) {
      const tp = ((t * 0.38 + di * 0.25 + wi * 0.17) % 1);
      const dotX = cbez(tp, ax, bx, cx2, dx);
      const dotY = cbez(tp, ay, by, cy2, dy);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = wd.col;
      ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Entry node (left endpoint)
    ctx.shadowColor = wd.col; ctx.shadowBlur = 14;
    ctx.fillStyle = wd.col;
    ctx.beginPath(); ctx.arc(ax, ay, 20, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶', ax + 1, ay + 4);

    // Label above entry
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(wd.label, ax + 36, ay - 28);

    // Splash pad
    ctx.fillStyle = 'rgba(80,120,255,0.28)';
    ctx.fillRect(ax, ay + 22, 60, 12);
  });

  // Hovered wire zone highlight
  for (const z of zones) {
    if (z.type !== 'wire') continue;
    if (z.id !== hoveredZoneId) continue;
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 3;
    ctx.shadowColor = P.gold; ctx.shadowBlur = 14;
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.shadowBlur = 0;
  }

  // Back door
  const back = zones.find(z => z.type === 'door');
  if (back) {
    const hot = back.id === hoveredZoneId;
    ctx.fillStyle = hot ? P.gold : P.pipeDeep;
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeStyle = hot ? '#fff' : P.pipeWire0;
    ctx.lineWidth = 2;
    ctx.strokeRect(back.x + 2, back.y + 2, back.w - 4, back.h - 4);
    ctx.fillStyle = hot ? P.ink : '#fff';
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(back.label, back.x + back.w / 2, back.y + back.h / 2 + 3);
  }
}

function drawPlaceholderFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, idx: number) {
  const pals = [
    ['#1abcfe', '#ff7262', '#a259ff', '#0acf83'],
    ['#f5c842', '#ff4d97', '#34e0d8', '#1abcfe'],
    ['#ef5d52', '#b48eff', '#0acf83', '#ff9f43'],
    ['#4d7cff', '#2ec4b6', '#f5c842', '#ff7262'],
    ['#0acf83', '#a259ff', '#1abcfe', '#ef5d52'],
    ['#ff9f43', '#34e0d8', '#b48eff', '#4d7cff'],
  ];
  const pal = pals[idx % pals.length];

  ctx.fillStyle = '#12082a';
  ctx.fillRect(x, y, w, h);

  // Simulated header bar
  ctx.fillStyle = pal[0];
  ctx.fillRect(x + 4, y + 4, w - 8, 18);

  // Simulated content blocks
  ctx.fillStyle = pal[1] + '99';
  ctx.fillRect(x + 4, y + 30, (w - 12) * 0.45, h * 0.28);
  ctx.fillStyle = pal[2] + '99';
  ctx.fillRect(x + 4 + (w - 12) * 0.5, y + 30, (w - 12) * 0.45, h * 0.28);

  ctx.fillStyle = pal[3] + '66';
  ctx.fillRect(x + 4, y + 30 + h * 0.28 + 6, w - 8, h * 0.12);
  ctx.fillRect(x + 4, y + 30 + h * 0.28 + 6 + h * 0.12 + 4, w - 8, h * 0.10);

  // Figma logo dot
  ctx.fillStyle = pal[0];
  ctx.beginPath(); ctx.arc(x + w - 10, y + 10, 4, 0, Math.PI * 2); ctx.fill();

  // Pixel noise
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = pal[i % 4] + '44';
    ctx.fillRect(x + 4 + i * (w / 8), y + h - 14, w / 10, 8);
  }
}

function drawOfficeRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number, figmaFiles: FigmaFile[], loadedImages: Map<string, HTMLImageElement>) {
  // Gallery wall (upper) — soft sky gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  wallGrad.addColorStop(0, P.skyDeep);
  wallGrad.addColorStop(1, P.sky);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, H);

  // Dotted graph-paper matrix on the wall (bullet-journal feel)
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let gx = 16; gx < W; gx += 30) {
    for (let gy = 70; gy < H * 0.6; gy += 30) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Parquet floor (lower 40%) — warm cream boards
  const floorY = H * 0.6;
  for (let fx = 0; fx < W; fx += 32) {
    for (let fy = floorY; fy < H; fy += 32) {
      const even = (Math.floor(fx / 32) + Math.floor((fy - floorY) / 32)) % 2 === 0;
      ctx.fillStyle = even ? P.floor : P.floorAlt;
      ctx.fillRect(fx, fy, 32, 32);
    }
  }

  // Ceiling band (cream paper)
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.ink;
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THE OFFICE', W / 2, 32);
  ctx.fillStyle = P.skyDeep;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('ORG ARCHIVE · LIVE FROM YOUR FIGMA', W / 2, 47);
  ctx.fillStyle = P.paperEdge;
  ctx.fillRect(0, 55, W, 2);

  // Baseboard
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, floorY - 6, W, 6);
  ctx.fillStyle = P.paperEdge;
  ctx.fillRect(0, floorY - 8, W, 2);

  // Gallery frames
  const frameZones = zones.filter(z => z.type === 'frame');
  frameZones.forEach((z, i) => {
    const hot = z.id === hoveredZoneId;
    const file = figmaFiles[i];

    // Spotlight beam from ceiling
    const sg = ctx.createLinearGradient(z.x + z.w / 2, 55, z.x + z.w / 2, z.y);
    sg.addColorStop(0, 'rgba(255,240,180,0.18)');
    sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(z.x - 20, 55, z.w + 40, z.y - 55);

    // Outer frame (cream paper mount)
    ctx.fillStyle = hot ? P.paper : P.paperEdge;
    ctx.fillRect(z.x - 9, z.y - 9, z.w + 18, z.h + 18);
    // Inner matte
    ctx.fillStyle = hot ? P.ink : P.skyNight;
    ctx.fillRect(z.x - 5, z.y - 5, z.w + 10, z.h + 10);

    // Frame content
    const img = loadedImages.get(z.id);
    if (img) {
      ctx.drawImage(img, z.x, z.y, z.w, z.h);
    } else {
      drawPlaceholderFrame(ctx, z.x, z.y, z.w, z.h, i);
    }

    // MCP loading indicator
    if (!file && !img) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(z.x, z.y + z.h - 18, z.w, 18);
      ctx.fillStyle = P.teal;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(t * 2) % 4);
      ctx.fillText(`FETCHING${dots}`, z.x + z.w / 2, z.y + z.h - 6);
    }

    // Changelog footer — "what changed since the last version"
    const changeLine = file?.change
      ? (file.author ? `${file.author}: ${file.change}` : file.change)
      : (file?.lastModified ? `updated ${file.lastModified}` : '');

    // Hot state: expanded label panel
    if (hot) {
      ctx.shadowColor = 'rgba(20,20,60,0.5)';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = P.paper;
      ctx.lineWidth = 3;
      ctx.strokeRect(z.x - 9, z.y - 9, z.w + 18, z.h + 18);
      ctx.shadowBlur = 0;

      // cream paper label card
      ctx.fillStyle = P.paper;
      ctx.fillRect(z.x, z.y + z.h + 6, z.w, 58);
      ctx.fillStyle = P.ink;
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((file?.name || `FIGMA FILE ${i + 1}`).slice(0, 18).toUpperCase(), z.x + z.w / 2, z.y + z.h + 22);
      ctx.fillStyle = P.skyDeep;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText((file?.team || 'FROM FIGMA').slice(0, 18), z.x + z.w / 2, z.y + z.h + 34);
      if (file?.lastModified) {
        ctx.fillStyle = P.muted;
        ctx.fillText('UPDATED ' + file.lastModified, z.x + z.w / 2, z.y + z.h + 45);
      }
      // change blurb (sans-serif for readability)
      if (changeLine) {
        ctx.fillStyle = P.coral;
        ctx.font = '600 11px "Pixelify Sans", monospace';
        ctx.fillText('✎ ' + fitText(ctx, changeLine, z.w - 8), z.x + z.w / 2, z.y + z.h + 58);
      }
    } else {
      // Quiet label + change footer
      ctx.fillStyle = P.paper;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((file?.name || `FILE_${i + 1}.FIG`).slice(0, 14).toUpperCase(), z.x + z.w / 2, z.y + z.h + 16);
      if (changeLine) {
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = '600 11px "Pixelify Sans", monospace';
        ctx.fillText('✎ ' + fitText(ctx, changeLine, z.w + 24), z.x + z.w / 2, z.y + z.h + 32);
      }
    }
  });

  // CRT monitor desk (bottom-right corner — org archive PC)
  const deskX = W - 130, deskY = H * 0.65;
  ctx.fillStyle = '#8a6040';
  ctx.fillRect(deskX, deskY + 38, 100, 20);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(deskX + 10, deskY, 80, 46);
  // Screen
  const scr = ctx.createRadialGradient(deskX + 50, deskY + 23, 0, deskX + 50, deskY + 23, 34);
  scr.addColorStop(0, '#00aa44'); scr.addColorStop(1, '#001a0a');
  ctx.fillStyle = scr;
  ctx.fillRect(deskX + 14, deskY + 4, 72, 38);
  ctx.fillStyle = '#00ff66';
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('> FIGMA API', deskX + 16, deskY + 16);
  ctx.fillText('> LOADING...', deskX + 16, deskY + 26);
  ctx.fillStyle = '#00aa44';
  ctx.fillText(`> ${Math.floor(t * 2) % 2 === 0 ? '■' : '□'}`, deskX + 16, deskY + 36);
  // Stand + keyboard
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(deskX + 45, deskY + 46, 10, 8);
  ctx.fillRect(deskX + 35, deskY + 54, 30, 5);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(deskX + 8, deskY + 42, 84, 14);

  // Back door
  const back = zones.find(z => z.type === 'door');
  if (back) {
    const hot = back.id === hoveredZoneId;
    ctx.fillStyle = hot ? P.gold : P.wallEdge;
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeStyle = hot ? '#fff' : P.purple;
    ctx.lineWidth = 2; ctx.strokeRect(back.x + 2, back.y + 2, back.w - 4, back.h - 4);
    ctx.fillStyle = hot ? P.ink : P.gold;
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(back.label, back.x + back.w / 2, back.y + back.h / 2 + 3);
  }
}

// Seed-based petal positions so they're deterministic each frame (only t changes).
const PETAL_SEEDS = Array.from({ length: 14 }, (_, i) => ({
  x: 0.05 + (i * 0.068 % 0.90),
  speed: 0.28 + (i * 0.11 % 0.38),
  phase: i * 0.51,
  size: 4 + (i * 3 % 6),
  wobble: i * 0.73,
}));

function drawGardenRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Background gradient (deep teal → sky)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, P.gardenDeep);
  bg.addColorStop(0.55, P.gardenMid);
  bg.addColorStop(1, P.gardenTop);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Hex floor grid (lower 45%)
  const floorY = H * 0.55;
  const hexSize = 26;
  const hexW = hexSize * 2;
  const hexH = hexSize * Math.sqrt(3);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (let row = 0; row * hexH * 0.5 < (H - floorY) + hexH; row++) {
    for (let col = 0; col * hexW * 0.75 < W + hexW; col++) {
      const hx = col * hexW * 0.75;
      const hy = floorY + row * hexH * 0.5 + (col % 2 ? hexH * 0.25 : 0);
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const angle = v * Math.PI / 3 - Math.PI / 6;
        const px = hx + hexSize * Math.cos(angle);
        const py = hy + hexSize * Math.sin(angle);
        if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
  // Floor tint
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
  floorGrad.addColorStop(0, 'rgba(30,107,94,0.35)');
  floorGrad.addColorStop(1, 'rgba(30,107,94,0.55)');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, W, H - floorY);

  // Ceiling band
  ctx.fillStyle = P.gardenDeep;
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THE HEX GARDEN', W / 2, 34);
  ctx.fillStyle = P.gardenTop;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('ZEN ZONE · RECOVER FROM CONFLICTING FEEDBACK', W / 2, 50);
  ctx.fillStyle = 'rgba(143,202,214,0.4)';
  ctx.fillRect(0, 55, W, 3);

  // Torii gate on back wall
  const tgX = W / 2, tgY = H * 0.22;
  const tgW = 180, tgH = 120;
  ctx.fillStyle = '#c0392b';
  // Posts
  ctx.fillRect(tgX - tgW / 2, tgY, 14, tgH);
  ctx.fillRect(tgX + tgW / 2 - 14, tgY, 14, tgH);
  // Upper curved beam
  ctx.beginPath();
  ctx.moveTo(tgX - tgW / 2 - 12, tgY + 22);
  ctx.quadraticCurveTo(tgX, tgY - 12, tgX + tgW / 2 + 12, tgY + 22);
  ctx.lineTo(tgX + tgW / 2 + 12, tgY + 40);
  ctx.quadraticCurveTo(tgX, tgY + 6, tgX - tgW / 2 - 12, tgY + 40);
  ctx.closePath();
  ctx.fill();
  // Lower horizontal beam
  ctx.fillRect(tgX - tgW / 2 - 4, tgY + 58, tgW + 8, 16);

  // Zen boulders
  const boulderPos = [[W * 0.14, H * 0.62], [W * 0.82, H * 0.64], [W * 0.26, H * 0.78], [W * 0.68, H * 0.72]];
  for (const [bx, by] of boulderPos) {
    ctx.fillStyle = '#4a5048';
    ctx.beginPath(); ctx.ellipse(bx, by, 30, 20, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a6058';
    ctx.beginPath(); ctx.ellipse(bx - 5, by - 4, 22, 14, -0.2, 0, Math.PI); ctx.fill();
  }

  // Small zen plants
  drawTree(ctx, W * 0.06, H * 0.75, 0.55);
  drawTree(ctx, W * 0.94, H * 0.75, 0.55);

  // Floating petals (drifting upward)
  for (const p of PETAL_SEEDS) {
    const progress = (p.phase + t * p.speed) % 1.0;
    const py = H * (1 - progress);
    const px = p.x * W + Math.sin(t * 0.6 + p.wobble * 2.4) * 22;
    const alpha = 0.55 - Math.abs(progress - 0.5) * 0.9;
    if (alpha > 0) {
      ctx.fillStyle = `rgba(255, 200, 220, ${alpha})`;
      ctx.beginPath(); ctx.ellipse(px, py, p.size, p.size * 0.65, t * 0.4 + p.wobble, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Leaderboard as bamboo placard
  const lbX = W / 2 - 100, lbY = H * 0.12;
  ctx.fillStyle = '#3a5a28';
  ctx.fillRect(lbX - 8, lbY - 8, 216, 162);
  ctx.fillStyle = '#4a7a38';
  ctx.fillRect(lbX, lbY, 200, 148);
  ctx.strokeStyle = '#2a4a18'; ctx.lineWidth = 2;
  ctx.strokeRect(lbX, lbY, 200, 148);
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ZEN SCORES', lbX + 100, lbY + 16);
  const lbEntries = [
    { name: 'maya_c', score: '14,200', col: '#ff4d97' },
    { name: 'rx_ux', score: '11,840', col: '#f5c842' },
    { name: 'p.lim', score: '9,500', col: '#b48eff' },
    { name: 'devops_j', score: '7,210', col: '#34e0d8' },
    { name: 'alex_d', score: '5,900', col: '#1abcfe' },
  ];
  lbEntries.forEach((e, i) => {
    ctx.fillStyle = e.col;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${e.name}`, lbX + 10, lbY + 38 + i * 20);
    ctx.textAlign = 'right';
    ctx.fillText(e.score, lbX + 188, lbY + 38 + i * 20);
  });

  // Back door
  const back = zones.find(z => z.type === 'door');
  if (back) {
    const hot = back.id === hoveredZoneId;
    ctx.fillStyle = hot ? P.gold : P.gardenDeep;
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeStyle = hot ? '#fff' : P.gardenTop;
    ctx.lineWidth = 2; ctx.strokeRect(back.x + 2, back.y + 2, back.w - 4, back.h - 4);
    ctx.fillStyle = hot ? P.ink : P.gardenTop;
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(back.label, back.x + back.w / 2, back.y + back.h / 2 + 3);
  }
}

// ── NPC cursor renderer ───────────────────────────────────────────────────────

function drawNPCs(ctx: CanvasRenderingContext2D, npcs: NPC[]) {
  npcs.forEach(npc => {
    // Trail
    npc.trail.forEach((pt, i) => {
      const alpha = (i / npc.trail.length) * 0.35;
      ctx.fillStyle = npc.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      const r = 3 * (i / npc.trail.length);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
    });
    // Cursor shape
    ctx.fillStyle = npc.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(npc.x, npc.y);
    ctx.lineTo(npc.x, npc.y + 14);
    ctx.lineTo(npc.x + 3.5, npc.y + 10);
    ctx.lineTo(npc.x + 6, npc.y + 15);
    ctx.lineTo(npc.x + 7.5, npc.y + 14.3);
    ctx.lineTo(npc.x + 5, npc.y + 9.2);
    ctx.lineTo(npc.x + 9, npc.y + 9.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Name tag (cream pill)
    ctx.font = '9px "Press Start 2P", monospace';
    const tw = ctx.measureText(npc.name).width;
    ctx.fillStyle = '#f3edc8';
    roundRect(ctx, npc.x + 12, npc.y - 6, tw + 12, 16, 8); ctx.fill();
    ctx.fillStyle = '#2b2b3a';
    ctx.textAlign = 'left';
    ctx.fillText(npc.name, npc.x + 18, npc.y + 6);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The player avatar — drawn in world space with a colour-coded trail.
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, trail: Array<{ x: number; y: number }>, color = '#8fcad6') {
  trail.forEach((pt, i) => {
    const f = 1 - i / trail.length;
    ctx.fillStyle = hexToRgba(color, f * 0.4);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 * f, 0, Math.PI * 2); ctx.fill();
  });
  // drop shadow
  ctx.fillStyle = 'rgba(20,20,60,0.25)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 18, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  // cursor shape
  ctx.fillStyle = color;
  ctx.strokeStyle = '#2b2b3a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 16);
  ctx.lineTo(x + 4, y + 11.5);
  ctx.lineTo(x + 6.8, y + 17);
  ctx.lineTo(x + 8.6, y + 16.1);
  ctx.lineTo(x + 5.7, y + 10.6);
  ctx.lineTo(x + 10.3, y + 10.6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // "you" pill
  ctx.font = '9px "Press Start 2P", monospace';
  const tw = ctx.measureText('you').width;
  ctx.fillStyle = '#2b2b3a';
  roundRect(ctx, x + 13, y + 6, tw + 12, 16, 8); ctx.fill();
  ctx.fillStyle = '#f3edc8';
  ctx.textAlign = 'left';
  ctx.fillText('you', x + 19, y + 18);
}

// ── Zone builders ─────────────────────────────────────────────────────────────

function buildCampZones(W: number, H: number, goTo: (r: RoomId) => void, openWardrobe: () => void): Zone[] {
  const dw = 80, dh = 46;
  const wdw = 64, wdh = 84;
  return [
    { id: 'to-arcade',   label: '▶ ARCADE',   hint: 'Enter Component Arcade', x: W - dw - 16, y: H / 2 - dh / 2, w: dw, h: dh, type: 'door', action: () => goTo('arcade') },
    { id: 'to-office',   label: '▲ OFFICE',   hint: 'Enter The Office',        x: W / 2 - dw / 2, y: 66, w: dw, h: dh, type: 'door', action: () => goTo('office') },
    { id: 'to-garden',   label: '◀ GARDEN',   hint: 'Enter Hex Garden',        x: 16, y: H / 2 - dh / 2, w: dw, h: dh, type: 'door', action: () => goTo('garden') },
    { id: 'to-pipeline', label: '▼ PIPELINE', hint: 'Enter Prototype Pipeline', x: W / 2 - dw / 2, y: H - dh - 16, w: dw, h: dh, type: 'door', action: () => goTo('pipeline') },
    { id: 'wardrobe', label: 'WARDROBE', hint: 'Style Wardrobe — change your cursor', x: W - wdw - 50, y: H * 0.6, w: wdw, h: wdh, type: 'wardrobe', action: openWardrobe },
  ];
}

function buildArcadeZones(W: number, H: number, playGame: (g: GameId) => void, goTo: (r: RoomId) => void): Zone[] {
  const cw = 108, ch = 148;
  const games: GameId[] = ['figsmash', 'fighero', 'figcontrast', 'figalign'];
  const labels: Record<GameId, string> = { figsmash: 'FigSmash', fighero: 'FigHero', figcontrast: 'FigContrast', figalign: 'FigAlign' };
  const step = (W - 80) / 4;
  return [
    ...games.map((g, i) => ({
      id: `cab-${g}`, label: labels[g], hint: `Play ${labels[g]}`,
      x: 40 + i * step + (step - cw) / 2, y: H * 0.2,
      w: cw, h: ch, type: 'cabinet' as const, action: () => playGame(g),
    })),
    { id: 'back-to-camp-arcade', label: '◀ CAMP', hint: 'Return to Cursor Camp', x: W / 2 - 40, y: H - 60, w: 80, h: 40, type: 'door', action: () => goTo('camp') },
  ];
}

function buildOfficeZones(W: number, H: number, goTo: (r: RoomId) => void, viewFrame: (i: number) => void, frameCount: number): Zone[] {
  const fw = 180, fh = 130;
  const frames = Math.max(1, frameCount);
  const perRow = 3;
  const rowH = fh + 80;
  const xStep = (W - 60) / perRow;
  return [
    ...Array.from({ length: frames }, (_, i) => {
      const col = i % perRow, row = Math.floor(i / perRow);
      return {
        id: `frame-${i}`, label: `File ${i + 1}`, hint: 'View design file',
        x: 30 + col * xStep + (xStep - fw) / 2,
        y: 75 + row * rowH,
        w: fw, h: fh, type: 'frame' as const,
        action: () => viewFrame(i),
      };
    }),
    { id: 'back-to-camp-office', label: '◀ CAMP', hint: 'Return to Cursor Camp', x: W / 2 - 40, y: H - 58, w: 80, h: 38, type: 'door', action: () => goTo('camp') },
  ];
}

function buildGardenZones(W: number, H: number, goTo: (r: RoomId) => void): Zone[] {
  return [
    { id: 'back-to-camp-garden', label: '▶ CAMP', hint: 'Return to Cursor Camp', x: W - 96, y: H / 2 - 23, w: 80, h: 46, type: 'door', action: () => goTo('camp') },
  ];
}

function buildPipelineZones(W: number, H: number, goTo: (r: RoomId) => void, startTransit: (wireIdx: number) => void): Zone[] {
  const zw = 60, zh = 60;
  return [
    { id: 'wire-0', label: 'SLIDE', hint: 'Ride the Hover State wire → The Office', x: 10, y: H * 0.25 - zh / 2, w: zw, h: zh, type: 'wire', action: () => startTransit(0) },
    { id: 'wire-1', label: 'SLIDE', hint: 'Ride the On Click wire → The Office',    x: 10, y: H * 0.50 - zh / 2, w: zw, h: zh, type: 'wire', action: () => startTransit(1) },
    { id: 'wire-2', label: 'SLIDE', hint: 'Ride the After Delay wire → The Office', x: 10, y: H * 0.72 - zh / 2, w: zw, h: zh, type: 'wire', action: () => startTransit(2) },
    { id: 'back-to-camp-pipeline', label: '▼ CAMP', hint: 'Return to Cursor Camp', x: W / 2 - 40, y: H - 58, w: 80, h: 40, type: 'door', action: () => goTo('camp') },
  ];
}

// ── Mock Figma files (shown while MCP loads) ──────────────────────────────────

const MOCK_FILES: FigmaFile[] = [
  { key: '1', name: 'Design System v4',   team: 'Core UI',    lastModified: '2h ago',   author: 'maya_c',   change: 'Reworked button + input tokens' },
  { key: '2', name: 'Mobile App Flows',   team: 'Mobile',     lastModified: '4h ago',   author: 'rx_ux',    change: 'Added dark-mode onboarding' },
  { key: '3', name: 'Marketing Site 2026',team: 'Growth',     lastModified: 'just now', author: 'p.lim',    change: 'New hero + pricing section' },
  { key: '4', name: 'Checkout Redesign',  team: 'Commerce',   lastModified: '1d ago',   author: 'devops_j', change: 'Split payment step into 2' },
  { key: '5', name: 'Brand Tokens v2',    team: 'Design Ops', lastModified: '3h ago',   author: 'alex_d',   change: 'Renamed colour ramps' },
  { key: '6', name: 'Onboarding V3',      team: 'Core UX',    lastModified: '30m ago',  author: 'maya_c',   change: 'Trimmed to 3 steps' },
];

// ── Connect-your-org panel ────────────────────────────────────────────────────

function ConnectPanel({ config, status, onSave, onClose }: {
  config: FigmaConfig | null;
  status: 'idle' | 'loading' | 'error';
  onSave: (token: string, teamId: string) => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState(config?.token || '');
  const [teamId, setTeamId] = useState(config?.teamId || DEFAULT_TEAM_ID);
  return (
    <div className="cfw-connect-modal" onClick={onClose}>
      <div className="cfw-connect-inner" onClick={e => e.stopPropagation()}>
        <div className="cfw-connect-head">
          <span>CONNECT YOUR FIGMA</span>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="cfw-connect-desc">
          Pull the most recently edited files from across your team into the Expo
          Hall — so you can see what everyone's working on. Runs only inside the
          Figma plugin; your token is stored locally in Figma and never leaves it.
        </p>
        <label className="cfw-connect-label">Personal access token</label>
        <input
          className="cfw-connect-input" type="password" value={token} placeholder="figd_…"
          onChange={e => setToken(e.target.value)} autoFocus
        />
        <a className="cfw-connect-hint" href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noreferrer">
          ↗ create a token (Settings → Security → Personal access tokens, scope: file_read)
        </a>
        <label className="cfw-connect-label">Team ID</label>
        <input
          className="cfw-connect-input" type="text" value={teamId} placeholder="team id from your team URL"
          onChange={e => setTeamId(e.target.value)}
        />
        <span className="cfw-connect-hint">
          figma.com/files/team/<b>&lt;ID&gt;</b>/… — copy the number from your team URL.
        </span>
        {status === 'error' && (
          <div className="cfw-connect-error">Couldn't reach Figma with those details. Check the token scope &amp; team ID.</div>
        )}
        <div className="cfw-connect-actions">
          {config && <button className="cfw-connect-clear" onClick={() => onSave('', '')}>Disconnect</button>}
          <span style={{ flex: 1 }} />
          <button className="cfw-connect-cancel" onClick={onClose}>Cancel</button>
          <button className="cfw-connect-save" onClick={() => onSave(token, teamId)}>
            {status === 'loading' ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClubFigmaWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });                  // screen-space mouse
  const avatarRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });           // world-space avatar (springs to mouse)
  const camRef = useRef({ x: 0, y: 0 });                            // world-space camera top-left
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const npcRef = useRef<NPC[]>([]);
  const tRef = useRef(0);
  const zonesRef = useRef<Zone[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const loadedImagesRef = useRef(new Map<string, HTMLImageElement>());

  const transitRef = useRef<TransitState | null>(null);
  const selectedCursorRef = useRef<string>(localStorage.getItem('cf.cursor') || 'ink');
  const worldRef = useRef({ W: 0, H: 0 });
  const goToRef = useRef<(r: RoomId) => void>(() => {});

  const [room, setRoom] = useState<RoomId>('camp');
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>(MOCK_FILES);
  const [figmaConfig, setFigmaConfig] = useState<FigmaConfig | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [expoStatus, setExpoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [selectedCursorId, setSelectedCursorId] = useState(() => localStorage.getItem('cf.cursor') || 'ink');
  const { state: consoleState } = useConsole();

  const figmaConfigRef = useRef(figmaConfig);
  figmaConfigRef.current = figmaConfig;

  const openWardrobe = useCallback(() => setShowWardrobe(true), []);
  const selectCursor = useCallback((charId: string) => {
    selectedCursorRef.current = charId;
    setSelectedCursorId(charId);
    localStorage.setItem('cf.cursor', charId);
    setShowWardrobe(false);
  }, []);

  const startTransit = useCallback((wireIdx: number) => {
    const { W: wW, H: wH } = worldRef.current;
    const wires = [
      { p0x: 0, p0y: wH * 0.25, p1x: wW * 0.28, p1y: wH * 0.10, p2x: wW * 0.72, p2y: wH * 0.40, p3x: wW, p3y: wH * 0.25 },
      { p0x: 0, p0y: wH * 0.50, p1x: wW * 0.28, p1y: wH * 0.22, p2x: wW * 0.72, p2y: wH * 0.65, p3x: wW, p3y: wH * 0.50 },
      { p0x: 0, p0y: wH * 0.72, p1x: wW * 0.28, p1y: wH * 0.56, p2x: wW * 0.72, p2y: wH * 0.86, p3x: wW, p3y: wH * 0.72 },
    ];
    const w = wires[wireIdx];
    transitRef.current = { progress: 0, targetRoom: 'office', ...w };
  }, []);

  // Set files + preload their thumbnails into the canvas image cache.
  const loadFiles = useCallback((files: FigmaFile[]) => {
    if (!files?.length) return;
    setFigmaFiles(files);
    loadedImagesRef.current.clear();
    files.forEach((f, i) => {
      if (!f.thumbnail) return;
      const img = new Image();
      img.onload = () => { loadedImagesRef.current.set(`frame-${i}`, img); };
      img.src = f.thumbnail; // cross-origin ok: we only drawImage, never read back
    });
  }, []);

  // Refresh the Expo Hall: org-wide recent files if connected, else current file.
  const refreshExpo = useCallback(async () => {
    const cfg = figmaConfigRef.current;
    if (cfg?.token && cfg?.teamId) {
      setExpoStatus('loading');
      try {
        const files = await fetchOrgFiles(cfg);
        if (files.length) { loadFiles(files); setExpoStatus('idle'); }
        else setExpoStatus('error');
      } catch { setExpoStatus('error'); }
      return;
    }
    // No connection — ask the plugin sandbox for the current file's frames.
    try { window.parent.postMessage({ pluginMessage: { type: 'GET_TEAM_FILES' } }, '*'); } catch { /* not in plugin */ }
  }, [loadFiles]);

  const roomRef = useRef(room);
  roomRef.current = room;

  const goTo = useCallback((r: RoomId) => {
    transitRef.current = null;
    setRoom(r);
    setHoveredZone(null);
    hoveredRef.current = null;
  }, []);
  goToRef.current = goTo;
  const viewFrame = useCallback((i: number) => setExpandedFrame(i), []);

  // Mount the FigSmash brawler engine once, in "RipShell" mode so it stays idle
  // until FigConsole drives a match through window.RIPArena. Its DOM is rendered
  // (hidden) below and the engine sizes its canvas from window.innerWidth.
  useEffect(() => {
    (window as any).__figsmashRipShell = true;
    mountEngine();
  }, []);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const W = size.w, H = size.h;
  // The explorable world is larger than the viewport.
  const worldW = Math.round(W * WORLD_SCALE), worldH = Math.round(H * WORLD_SCALE);

  // Keep worldRef in sync for startTransit (world dimensions without deps)
  worldRef.current = { W: worldW, H: worldH };

  // Rebuild zones when room/size changes (laid out in world space)
  useEffect(() => {
    if (room === 'camp')     zonesRef.current = buildCampZones(worldW, worldH, goTo, openWardrobe);
    if (room === 'arcade')   zonesRef.current = [];  // FigConsole overlay owns the arcade
    if (room === 'office')   zonesRef.current = buildOfficeZones(worldW, worldH, goTo, viewFrame, figmaFiles.length);
    if (room === 'garden')   zonesRef.current = buildGardenZones(worldW, worldH, goTo);
    if (room === 'pipeline') zonesRef.current = buildPipelineZones(worldW, worldH, goTo, startTransit);
  }, [room, worldW, worldH, goTo, viewFrame, figmaFiles.length, openWardrobe, startTransit]);

  // Init NPCs + recentre the avatar/camera when the room (or size) changes.
  useEffect(() => {
    npcRef.current = NPC_DEFS.slice(0, 4).map((d, i) => ({
      id: i, name: d.name, color: d.color,
      x: 120 + Math.random() * (worldW - 240), y: 140 + Math.random() * (worldH - 280),
      tx: 120 + Math.random() * (worldW - 240), ty: 140 + Math.random() * (worldH - 280),
      trail: [], idleTimer: 0,
    }));
    // Start facing the room's focal point — The Office gallery sits up top.
    const startX = worldW / 2;
    const startY = room === 'office' ? worldH * 0.3 : worldH / 2;
    avatarRef.current = { x: startX, y: startY, vx: 0, vy: 0 };
    camRef.current = { x: clamp(startX - W / ZOOM / 2, 0, Math.max(0, worldW - W / ZOOM)),
                       y: clamp(startY - H / ZOOM / 2, 0, Math.max(0, worldH - H / ZOOM)) };
    trailRef.current = [];
  }, [room, worldW, worldH, W, H]);

  // Plugin bridge: receive stored connection config + current-file frames.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const payload = e.data?.pluginMessage;
      if (!payload) return;
      if (payload.type === 'CONFIG') {
        setFigmaConfig(payload.config && payload.config.token ? payload.config : null);
      }
      if (payload.type === 'TEAM_FILES') {
        // Only use the current-file fallback when not connected to the org.
        if (!figmaConfigRef.current?.token) loadFiles(payload.files);
      }
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ pluginMessage: { type: 'GET_CONFIG' } }, '*'); } catch { /* not in plugin */ }
    return () => window.removeEventListener('message', onMsg);
  }, [loadFiles]);

  // Preload the Expo Hall gallery up front (on mount, and whenever the
  // connection changes) so the frames are already loaded before you walk in.
  useEffect(() => {
    refreshExpo();
  }, [figmaConfig, refreshExpo]);

  // Persist a connection (token + team id) via the plugin sandbox.
  const saveConfig = useCallback((token: string, teamId: string) => {
    const cfg = token.trim() ? { token: token.trim(), teamId: teamId.trim() || DEFAULT_TEAM_ID } : null;
    setFigmaConfig(cfg);
    try { window.parent.postMessage({ pluginMessage: { type: 'SET_CONFIG', config: cfg } }, '*'); } catch { /* not in plugin */ }
    setShowConnect(false);
  }, []);

  // Open a file in Figma — via the sandbox (figma.openExternal) inside the
  // plugin, or a plain new tab otherwise.
  const openInFigma = useCallback((url?: string) => {
    if (!url) return;
    try { window.parent.postMessage({ pluginMessage: { type: 'OPEN_URL', url } }, '*'); } catch { /* not in plugin */ }
    try { window.open(url, '_blank', 'noopener'); } catch { /* sandbox-only */ }
  }, []);

  // Lazy hi-res screenshot for the expanded modal (connected org files only).
  const [modalShot, setModalShot] = useState<string | null>(null);
  useEffect(() => {
    setModalShot(null);
    if (expandedFrame === null) return;
    const file = figmaFiles[expandedFrame];
    const cfg = figmaConfigRef.current;
    if (!file?.key || !cfg?.token || !file.url) return; // only real org files
    let cancelled = false;
    fetchFileScreenshot(cfg, file.key).then(url => { if (!cancelled) setModalShot(url); });
    return () => { cancelled = true; };
  }, [expandedFrame, figmaFiles]);

  // Mouse tracking — the mouse steers the avatar (which springs toward it in
  // world space). The Arcade is a normal-pointer desktop, so skip it there.
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (roomRef.current === 'arcade') return;
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Zone detection + interaction on click/space
  const interact = useCallback(() => {
    if (transitRef.current) return;
    const zone = zonesRef.current.find(z => z.id === hoveredRef.current);
    zone?.action?.();
  }, []);

  const onMouseClick = useCallback(() => interact(), [interact]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack Space/Esc while the arcade desktop or a game owns input.
      if (roomRef.current === 'arcade') return;
      if (e.key === ' ') { e.preventDefault(); interact(); }
      if (e.key === 'Escape') { setExpandedFrame(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interact]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W; canvas.height = H;
    let raf = 0;
    let lastT = performance.now();

    const viewW = W / ZOOM, viewH = H / ZOOM;   // visible world region

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame); // schedule next frame first so errors can't kill the loop
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      tRef.current += dt;
      const t = tRef.current;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, W, H);

      // Update NPC positions (world space)
      npcRef.current = npcRef.current.map(npc => {
        const dx = npc.tx - npc.x, dy = npc.ty - npc.y;
        const dist = Math.hypot(dx, dy);
        let { x, y, tx, ty, trail, idleTimer } = npc;
        idleTimer -= dt;
        if (dist < 8 || idleTimer <= 0) {
          tx = 80 + Math.random() * (worldW - 160);
          ty = 120 + Math.random() * (worldH - 200);
          idleTimer = 2 + Math.random() * 4;
        } else {
          const spd = 55;
          x += (dx / dist) * spd * dt;
          y += (dy / dist) * spd * dt;
        }
        const newTrail = [{ x, y }, ...trail.slice(0, 14)];
        return { ...npc, x, y, tx, ty, trail: newTrail, idleTimer };
      });

      const cam = camRef.current;
      const a = avatarRef.current;
      const m = mouseRef.current;

      // Pipeline transit: auto-glide avatar along the bezier wire
      const tr = transitRef.current;
      if (tr) {
        tr.progress = Math.min(1, tr.progress + dt / TRANSIT_DURATION);
        const tp = tr.progress;
        a.x = cbez(tp, tr.p0x, tr.p1x, tr.p2x, tr.p3x);
        a.y = cbez(tp, tr.p0y, tr.p1y, tr.p2y, tr.p3y);
        a.vx = 0; a.vy = 0;
        if (tp >= 1) {
          transitRef.current = null;
          goToRef.current(tr.targetRoom);
        }
      } else if (m.x > -9000) {
        // The mouse points to a world location through the current camera;
        // the avatar springs toward it (FigSmash-style weighted follow).
        const tx = cam.x + m.x / ZOOM;
        const ty = cam.y + m.y / ZOOM;
        const ax = (tx - a.x) * SPRING_K - a.vx * SPRING_DAMP;
        const ay = (ty - a.y) * SPRING_K - a.vy * SPRING_DAMP;
        a.vx += ax * dt; a.vy += ay * dt;
        a.x += a.vx * dt; a.y += a.vy * dt;
      }
      a.x = clamp(a.x, 8, worldW - 8);
      a.y = clamp(a.y, 8, worldH - 8);

      // Camera edge-scroll with easing: find where the camera *wants* to be to
      // keep the avatar inside a margin, then glide toward it so panning drifts
      // instead of tracking 1:1.
      const margin = Math.min(viewW, viewH) * 0.3;
      let camTX = cam.x, camTY = cam.y;
      if (a.x - camTX < margin) camTX = a.x - margin;
      else if (a.x - camTX > viewW - margin) camTX = a.x - (viewW - margin);
      if (a.y - camTY < margin) camTY = a.y - margin;
      else if (a.y - camTY > viewH - margin) camTY = a.y - (viewH - margin);
      camTX = clamp(camTX, 0, Math.max(0, worldW - viewW));
      camTY = clamp(camTY, 0, Math.max(0, worldH - viewH));
      const camEase = 1 - Math.exp(-dt * CAM_SPEED); // frame-rate independent
      cam.x += (camTX - cam.x) * camEase;
      cam.y += (camTY - cam.y) * camEase;

      // Detect hovered zone (avatar vs world-space zone rects)
      let newHover: string | null = null;
      for (const z of zonesRef.current) {
        if (z.type === 'deco') continue;
        if (a.x >= z.x && a.x <= z.x + z.w && a.y >= z.y && a.y <= z.y + z.h) { newHover = z.id; break; }
      }
      if (newHover !== hoveredRef.current) {
        hoveredRef.current = newHover;
        setHoveredZone(zonesRef.current.find(z => z.id === newHover) || null);
      }

      // Player trail (world space)
      trailRef.current = [{ x: a.x, y: a.y }, ...trailRef.current.slice(0, 16)];

      // Draw the world through the camera (zoom + pan)
      ctx.save();
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-cam.x, -cam.y);

      const zones = zonesRef.current;
      const hid = hoveredRef.current;
      if (roomRef.current === 'camp')     drawCampRoom(ctx, worldW, worldH, zones, hid, t);
      if (roomRef.current === 'arcade')   drawArcadeRoom(ctx, worldW, worldH, zones, hid, t);
      if (roomRef.current === 'office')   drawOfficeRoom(ctx, worldW, worldH, zones, hid, t, figmaFiles, loadedImagesRef.current);
      if (roomRef.current === 'garden')   drawGardenRoom(ctx, worldW, worldH, zones, hid, t);
      if (roomRef.current === 'pipeline') drawPipelineRoom(ctx, worldW, worldH, zones, hid, t);

      drawNPCs(ctx, npcRef.current);
      if (roomRef.current !== 'arcade') {
        const cc = CURSOR_CHARS.find(c => c.id === selectedCursorRef.current);
        drawPlayer(ctx, a.x, a.y, trailRef.current, cc?.color || '#8fcad6');
      }

      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W, H, worldW, worldH, room, figmaFiles]);

  const highScores = consoleState.highScores;

  return (
    <div className="cfw-root" onMouseMove={onMouseMove} onClick={onMouseClick}>
      <canvas ref={canvasRef} className="cfw-canvas" />

      {/* The player avatar is drawn on the canvas (drawPlayer) so the camera can
          zoom + pan it like Cursor Camp. The OS cursor stays hidden via CSS. */}

      {/* The FigSmash brawler DOM — mounted once, hidden until FigConsole starts
          a match (body.fc-smash reveals it). Keeps the engine's refs stable. */}
      <div className="cf-figsmash-host">
        <GameCanvas />
        <HudHeader />
        <InspectorPanel />
        <Toolbar />
        <ForceQuitDialog />
        <CharacterSelect />
        <MapSelect />
        <ImportDialog />
        <WinScreen />
        <PauseMenu />
        <FigmaChrome />
        <CharacterArtMounts />
      </div>

      {/* The Arcade is the FigConsole "Game Creator Pro" desktop. It runs the
          games itself (FigSmash via the engine above; the rest inline). */}
      {room === 'arcade' && (
        <div onClick={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()}>
          <FigConsole onExit={() => goTo('camp')} />
        </div>
      )}

      {/* Zone hover prompt — hide during transit */}
      {hoveredZone && expandedFrame === null && !transitRef.current && (
        <div className="cfw-prompt">
          <span className="cfw-prompt-hint">{hoveredZone.hint}</span>
          <span className="cfw-prompt-action">
            <kbd>CLICK</kbd> or <kbd>SPACE</kbd> to {
              hoveredZone.type === 'cabinet' ? 'play' :
              hoveredZone.type === 'frame' ? 'inspect' :
              hoveredZone.type === 'wardrobe' ? 'open' :
              hoveredZone.type === 'wire' ? 'ride' : 'enter'
            }
          </span>
          {hoveredZone.type === 'cabinet' && (
            <span className="cfw-prompt-hi">HI {highScores[hoveredZone.id.replace('cab-', '') as CartridgeId]?.toString().padStart(5, '0') || '00000'}</span>
          )}
        </div>
      )}

      {/* Room minimap / nav */}
      <div className="cfw-minimap">
        {([
          { id: 'camp', emoji: '⛺', label: 'CAMP' },
          { id: 'office', emoji: '🏢', label: 'OFFICE' },
          { id: 'arcade', emoji: '🕹', label: 'ARCADE' },
          { id: 'garden', emoji: '🌸', label: 'GARDEN' },
          { id: 'pipeline', emoji: '🌊', label: 'PIPELINE' },
        ] as { id: RoomId; emoji: string; label: string }[]).map(r => (
          <button key={r.id} className={`cfw-mm-btn${room === r.id ? ' active' : ''}`} onClick={(e) => { e.stopPropagation(); goTo(r.id); }}>
            {r.emoji}<span>{r.label}</span>
          </button>
        ))}
        <button
          className={`cfw-mm-btn cfw-mm-connect${figmaConfig ? ' connected' : ''}`}
          title={figmaConfig ? 'Connected — manage Figma org sync' : 'Connect your Figma org'}
          onClick={(e) => { e.stopPropagation(); setShowConnect(true); }}
        >
          {figmaConfig ? '🟢' : '🔌'}<span>{figmaConfig ? 'SYNCED' : 'CONNECT'}</span>
        </button>
      </div>

      {/* Connect-your-org panel */}
      {showConnect && (
        <ConnectPanel
          config={figmaConfig}
          status={expoStatus}
          onSave={saveConfig}
          onClose={() => setShowConnect(false)}
        />
      )}

      {/* Presence bar */}
      <div className="cfw-presence">
        <span className="cfw-presence-label">● LIVE</span>
        {NPC_DEFS.map(n => (
          <span key={n.name} className="cfw-presence-dot" style={{ color: n.color }}>{n.name}</span>
        ))}
      </div>

      {/* Style Wardrobe overlay */}
      {showWardrobe && (
        <div className="cfw-wardrobe-modal" onClick={() => setShowWardrobe(false)}>
          <div className="cfw-wardrobe-inner" onClick={e => e.stopPropagation()}>
            <div className="cfw-wardrobe-head">
              <span>STYLE WARDROBE</span>
              <button onClick={() => setShowWardrobe(false)}>✕</button>
            </div>
            <p className="cfw-wardrobe-desc">Pick your cursor style. Your trail colour updates instantly.</p>
            <div className="cfw-wardrobe-grid">
              {CURSOR_CHARS.map(c => (
                <button
                  key={c.id}
                  className={`cfw-wardrobe-char${selectedCursorId === c.id ? ' active' : ''}`}
                  style={{ '--char-color': c.color } as React.CSSProperties}
                  onClick={() => selectCursor(c.id)}
                >
                  <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                    <path d="M2 2 L2 26 L8 20 L11 28 L14 27 L11 19 L18 19 Z"
                          fill={c.color} stroke="#2b2b3a" strokeWidth="1.4" />
                  </svg>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Figma frame view */}
      {expandedFrame !== null && (
        <div className="cfw-frame-modal" onClick={() => setExpandedFrame(null)}>
          <div className="cfw-frame-modal-inner" onClick={e => e.stopPropagation()}>
            <div className="cfw-frame-header">
              <span>{figmaFiles[expandedFrame]?.name || `FILE ${expandedFrame + 1}.FIG`}</span>
              <span className="cfw-frame-team">{figmaFiles[expandedFrame]?.team || 'FIGMA'}</span>
              <button onClick={() => setExpandedFrame(null)}>✕</button>
            </div>
            <div className="cfw-frame-preview">
              {modalShot ? (
                // crisp full-res render fetched from the Figma images API
                <img className="cfw-frame-img" src={modalShot} alt={figmaFiles[expandedFrame]?.name || 'design'} />
              ) : (
                <canvas className="cfw-frame-canvas" id={`frame-canvas-${expandedFrame}`}
                  ref={el => {
                    if (!el) return;
                    const ctx = el.getContext('2d')!;
                    el.width = 600; el.height = 420;
                    const img = loadedImagesRef.current.get(`frame-${expandedFrame}`);
                    if (img) {
                      // letterbox the list thumbnail while the hi-res render loads
                      ctx.fillStyle = '#1e404a'; ctx.fillRect(0, 0, 600, 420);
                      const scale = Math.min(600 / img.width, 420 / img.height);
                      const dw = img.width * scale, dh = img.height * scale;
                      ctx.drawImage(img, (600 - dw) / 2, (420 - dh) / 2, dw, dh);
                    } else {
                      drawPlaceholderFrame(ctx, 0, 0, 600, 420, expandedFrame);
                    }
                  }} />
              )}
              <div className="cfw-frame-mcp-badge">live from Figma ✦</div>
            </div>
            {(figmaFiles[expandedFrame]?.change) && (
              <div className="cfw-frame-change">
                <span className="cfw-frame-change-label">✎ WHAT CHANGED</span>
                <span className="cfw-frame-change-text">
                  {figmaFiles[expandedFrame]?.author ? `${figmaFiles[expandedFrame]?.author} — ` : ''}
                  {figmaFiles[expandedFrame]?.change}
                </span>
              </div>
            )}
            <div className="cfw-frame-footer">
              <span>Last modified: {figmaFiles[expandedFrame]?.lastModified || 'unknown'}</span>
              <button
                className="cfw-frame-open"
                disabled={!figmaFiles[expandedFrame]?.url}
                onClick={() => openInFigma(figmaFiles[expandedFrame]?.url)}
              >↗ Open in Figma</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
