/**
 * Club Figma World — a canvas-based multiplayer lounge.
 *
 * Your mouse cursor IS your avatar. Move it around the canvas to explore
 * rooms. Approach zones to reveal prompts; press Space or click to interact.
 *
 * Rooms: Lobby → Expo Hall (live Figma file gallery) | The Arcade (4 games) | Lounge
 *
 * Real designs: when run as a Figma plugin (see clubfigma-plugin/), the plugin
 * sandbox streams thumbnails of the document's frames over postMessage. Outside
 * a plugin (e.g. the Make web preview) the Expo Hall falls back to mock files.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FigHero } from './games/FigHero';
import { FigContrast } from './games/FigContrast';
import { FigAlign } from './games/FigAlign';
import { useConsole, type CartridgeId } from './console/store';
import { GameCanvas } from '../app/components/GameCanvas';
import { HudHeader } from '../app/components/HudHeader';
import { CharacterSelect } from '../app/components/screens/CharacterSelect';
import { MapSelect } from '../app/components/screens/MapSelect';
import { WinScreen } from '../app/components/screens/WinScreen';
import { PauseMenu } from '../app/components/screens/PauseMenu';
import { ForceQuitDialog } from '../app/components/ForceQuitDialog';
import { Toolbar } from '../app/components/Toolbar';
import { InspectorPanel } from '../app/components/InspectorPanel';
import { ImportDialog } from '../app/components/screens/ImportDialog';
import { mountEngine } from '../app/game/engine';
import '../styles/figsmash.css';
import './console/console.css';
import './world.css';

// ── Types ────────────────────────────────────────────────────────────────────

type RoomId = 'lobby' | 'arcade' | 'expo' | 'lounge';
type GameId = 'fighero' | 'figcontrast' | 'figalign' | 'figsmash';

interface Zone {
  id: string;
  label: string;
  hint: string;
  x: number; y: number; w: number; h: number;
  type: 'door' | 'cabinet' | 'frame' | 'deco';
  action?: () => void;
}

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
}

// ── Palette ──────────────────────────────────────────────────────────────────

const P = {
  bg:        '#0d0718',
  floor:     '#f2efe6',
  floorAlt:  '#e8e3d4',
  wall:      '#1a0a2e',
  wallEdge:  '#2d1b4e',
  gold:      '#f5c842',
  purple:    '#b48eff',
  blue:      '#1abcfe',
  teal:      '#2ec4b6',
  coral:     '#ef5d52',
  green:     '#0acf83',
  orange:    '#ff9f43',
  ink:       '#1c1c1c',
  muted:     '#8e7aa8',
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

function drawLobbyRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Ceiling strip
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, W, 58);
  // Floor
  drawCheckerFloor(ctx, 0, 58, W, H - 58);
  // Wainscoting strip
  ctx.fillStyle = P.wallEdge;
  ctx.fillRect(0, 58, W, 6);
  ctx.fillStyle = P.gold;
  ctx.fillRect(0, 60, W, 3);

  // Club Figma title
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 20px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CLUB FIGMA', W / 2, 40);
  ctx.fillStyle = P.purple;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('DESIGN LOUNGE & EXPO', W / 2, 52);

  // Figma logo mark (SVG-style, drawn with canvas)
  const lx = W / 2 - 82, ly = 14;
  ctx.fillStyle = '#1abcfe'; ctx.beginPath(); ctx.arc(lx + 6, ly + 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0acf83'; ctx.fillRect(lx, ly + 6, 6, 12); ctx.beginPath(); ctx.arc(lx + 3, ly + 18, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff7262'; ctx.fillRect(lx + 6, ly, 6, 12); ctx.beginPath(); ctx.arc(lx + 9, ly + 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f24e1e'; ctx.fillRect(lx, ly, 6, 12); ctx.beginPath(); ctx.arc(lx + 3, ly + 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a259ff'; ctx.fillRect(lx, ly + 12, 6, 0); ctx.beginPath(); ctx.arc(lx + 3, ly + 15, 3, 0, Math.PI * 2); ctx.fill();

  // Fountain (center)
  drawFountain(ctx, W / 2, H / 2 + 10, t);

  // Corner trees
  drawTree(ctx, 80, H * 0.72, 0.9);
  drawTree(ctx, W - 80, H * 0.72, 0.9);
  drawTree(ctx, 80, H * 0.35, 0.7);
  drawTree(ctx, W - 80, H * 0.35, 0.7);

  // Side benches
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(130, H * 0.56, 70, 18);
  ctx.fillRect(130, H * 0.56 - 3, 70, 5);
  ctx.fillRect(W - 200, H * 0.56, 70, 18);
  ctx.fillRect(W - 200, H * 0.56 - 3, 70, 5);

  // Zones
  for (const z of zones) {
    if (z.type !== 'door') continue;
    const hot = z.id === hoveredZoneId;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(z.x + 4, z.y + 4, z.w, z.h);
    // Door body
    ctx.fillStyle = hot ? P.gold : P.wallEdge;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    // Door frame (inset)
    ctx.strokeStyle = hot ? '#fff' : P.purple;
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
    // Glow pulse when hot
    if (hot) {
      ctx.shadowColor = P.gold;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = P.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.shadowBlur = 0;
    }
    // Label
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

function drawExpoRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number, figmaFiles: FigmaFile[], loadedImages: Map<string, HTMLImageElement>) {
  // Background
  ctx.fillStyle = '#08041a';
  ctx.fillRect(0, 0, W, H);

  // Parquet floor (lower 40%)
  const floorY = H * 0.6;
  ctx.fillStyle = '#160930';
  ctx.fillRect(0, floorY, W, H - floorY);
  for (let fx = 0; fx < W; fx += 32) {
    for (let fy = floorY; fy < H; fy += 32) {
      const even = (Math.floor(fx / 32) + Math.floor((fy - floorY) / 32)) % 2 === 0;
      ctx.fillStyle = even ? '#1c0e38' : '#13072a';
      ctx.fillRect(fx, fy, 32, 32);
    }
  }

  // Gallery wall (upper 60%)
  ctx.fillStyle = '#100628';
  ctx.fillRect(0, 55, W, H * 0.55);

  // Ceiling
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.purple;
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DESIGN EXPO HALL', W / 2, 35);
  ctx.fillStyle = P.muted;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('LIVE FROM YOUR FIGMA', W / 2, 50);

  // Molding strip
  ctx.fillStyle = P.gold;
  ctx.fillRect(0, 55, W, 4);
  ctx.fillStyle = '#3d1f5e';
  ctx.fillRect(0, 59, W, 2);

  // Baseboard
  ctx.fillStyle = P.wallEdge;
  ctx.fillRect(0, floorY - 6, W, 6);
  ctx.fillStyle = P.gold;
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

    // Outer frame (gold)
    ctx.fillStyle = hot ? '#ffd700' : '#7a6000';
    ctx.fillRect(z.x - 9, z.y - 9, z.w + 18, z.h + 18);
    // Inner matte
    ctx.fillStyle = hot ? '#2a1a00' : '#0e0618';
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

    // Hot state: expanded label panel
    if (hot) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x - 9, z.y - 9, z.w + 18, z.h + 18);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(10,4,24,0.92)';
      ctx.fillRect(z.x, z.y + z.h + 4, z.w, 44);
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((file?.name || `FIGMA FILE ${i + 1}`).slice(0, 18).toUpperCase(), z.x + z.w / 2, z.y + z.h + 18);
      ctx.fillStyle = P.purple;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(file?.team || 'FROM FIGMA', z.x + z.w / 2, z.y + z.h + 30);
      if (file?.lastModified) {
        ctx.fillStyle = P.muted;
        ctx.fillText('UPDATED ' + file.lastModified, z.x + z.w / 2, z.y + z.h + 42);
      }
    } else {
      // Quiet label
      ctx.fillStyle = P.muted;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((file?.name || `FILE_${i + 1}.FIG`).slice(0, 14).toUpperCase(), z.x + z.w / 2, z.y + z.h + 16);
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

function drawLoungeRoom(ctx: CanvasRenderingContext2D, W: number, H: number, zones: Zone[], hoveredZoneId: string | null, t: number) {
  // Warm wood floor
  ctx.fillStyle = '#c8934a';
  ctx.fillRect(0, 55, W, H);
  for (let fx = 0; fx < W; fx += 80) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(fx, 55, 2, H);
  }
  for (let fy = 55; fy < H; fy += 20) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, fy, W, 1);
  }

  // Ceiling
  ctx.fillStyle = '#3a1a0a';
  ctx.fillRect(0, 0, W, 55);
  ctx.fillStyle = P.orange;
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THE LOUNGE', W / 2, 35);
  ctx.fillStyle = '#c8884a';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('CHILL · COLLABORATE · WAIT', W / 2, 50);

  ctx.fillStyle = P.orange; ctx.fillRect(0, 55, W, 4);

  // Sofas
  const sofaColor = '#6a2a5a';
  const cushion = '#8a3a7a';
  // Left sofa
  ctx.fillStyle = sofaColor; ctx.fillRect(30, H * 0.35, 120, 60);
  ctx.fillStyle = cushion;
  ctx.fillRect(35, H * 0.35 - 15, 110, 20);
  for (let sc = 0; sc < 3; sc++) { ctx.fillRect(36 + sc * 36, H * 0.38, 32, 38); }
  // Right sofa
  ctx.fillStyle = sofaColor; ctx.fillRect(W - 150, H * 0.35, 120, 60);
  ctx.fillStyle = cushion;
  ctx.fillRect(W - 145, H * 0.35 - 15, 110, 20);
  for (let sc = 0; sc < 3; sc++) { ctx.fillRect(W - 144 + sc * 36, H * 0.38, 32, 38); }

  // Coffee table
  ctx.fillStyle = '#7a5030';
  ctx.fillRect(W / 2 - 55, H * 0.42, 110, 50);
  ctx.fillStyle = '#9a6a40';
  ctx.fillRect(W / 2 - 52, H * 0.42 + 3, 104, 44);

  // Leaderboard on wall
  const lbX = W / 2 - 100, lbY = H * 0.12;
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(lbX - 8, lbY - 8, 216, 162);
  ctx.fillStyle = P.gold;
  ctx.fillRect(lbX - 5, lbY - 5, 210, 3);
  ctx.fillRect(lbX - 5, lbY + 148, 210, 3);
  ctx.fillStyle = '#150828';
  ctx.fillRect(lbX, lbY, 200, 148);
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEADERBOARD', lbX + 100, lbY + 16);
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

  // Plants
  drawTree(ctx, W - 50, H * 0.78, 0.7);
  drawTree(ctx, 50, H * 0.78, 0.7);

  // Back door
  const back = zones.find(z => z.type === 'door');
  if (back) {
    const hot = back.id === hoveredZoneId;
    ctx.fillStyle = hot ? P.gold : '#3a1a0a';
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeStyle = hot ? '#fff' : P.orange;
    ctx.lineWidth = 2; ctx.strokeRect(back.x + 2, back.y + 2, back.w - 4, back.h - 4);
    ctx.fillStyle = hot ? P.ink : P.orange;
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
    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const tw = ctx.measureText(npc.name).width;
    ctx.fillRect(npc.x + 12, npc.y - 8, tw + 8, 14);
    ctx.fillStyle = npc.color;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(npc.name, npc.x + 16, npc.y + 2);
  });
}

// ── Zone builders ─────────────────────────────────────────────────────────────

function buildLobbyZones(W: number, H: number, goTo: (r: RoomId) => void): Zone[] {
  const dw = 80, dh = 46;
  return [
    { id: 'to-arcade', label: '▶ ARCADE', hint: 'Enter the arcade', x: W - dw - 16, y: H / 2 - dh / 2, w: dw, h: dh, type: 'door', action: () => goTo('arcade') },
    { id: 'to-expo',   label: '▲ EXPO',   hint: 'Explore Figma files', x: W / 2 - dw / 2, y: 66, w: dw, h: dh, type: 'door', action: () => goTo('expo') },
    { id: 'to-lounge', label: '◀ LOUNGE', hint: 'Chill zone', x: 16, y: H / 2 - dh / 2, w: dw, h: dh, type: 'door', action: () => goTo('lounge') },
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
    { id: 'back-to-lobby-arcade', label: '◀ LOBBY', hint: 'Return to lobby', x: W / 2 - 40, y: H - 60, w: 80, h: 40, type: 'door', action: () => goTo('lobby') },
  ];
}

function buildExpoZones(W: number, H: number, goTo: (r: RoomId) => void, viewFrame: (i: number) => void, frameCount: number): Zone[] {
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
    { id: 'back-to-lobby-expo', label: '◀ LOBBY', hint: 'Return to lobby', x: W / 2 - 40, y: H - 58, w: 80, h: 38, type: 'door', action: () => goTo('lobby') },
  ];
}

function buildLoungeZones(W: number, H: number, goTo: (r: RoomId) => void): Zone[] {
  return [
    { id: 'back-to-lobby-lounge', label: '▶ LOBBY', hint: 'Return to lobby', x: W - 96, y: H / 2 - 23, w: 80, h: 46, type: 'door', action: () => goTo('lobby') },
  ];
}

// ── Mock Figma files (shown while MCP loads) ──────────────────────────────────

const MOCK_FILES: FigmaFile[] = [
  { key: '1', name: 'Design System v4', team: 'Core UI', lastModified: '2h ago' },
  { key: '2', name: 'Mobile App Flows', team: 'Mobile', lastModified: '4h ago' },
  { key: '3', name: 'Marketing Site 2026', team: 'Growth', lastModified: 'just now' },
  { key: '4', name: 'Checkout Redesign', team: 'Commerce', lastModified: '1d ago' },
  { key: '5', name: 'Brand Tokens v2', team: 'Design Ops', lastModified: '3h ago' },
  { key: '6', name: 'Onboarding V3', team: 'Core UX', lastModified: '30m ago' },
];

// ── Main component ────────────────────────────────────────────────────────────

export function ClubFigmaWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDivRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef({ x: -200, y: -200 });
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const npcRef = useRef<NPC[]>([]);
  const tRef = useRef(0);
  const zonesRef = useRef<Zone[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const loadedImagesRef = useRef(new Map<string, HTMLImageElement>());

  const [room, setRoom] = useState<RoomId>('lobby');
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>(MOCK_FILES);
  const { state: consoleState, submitScore, addTimeSaved } = useConsole();

  const roomRef = useRef(room);
  roomRef.current = room;
  const activeGameRef = useRef(activeGame);
  activeGameRef.current = activeGame;

  // Rebuild zones when room changes
  const goTo = useCallback((r: RoomId) => {
    setRoom(r);
    setHoveredZone(null);
    hoveredRef.current = null;
  }, []);
  const playGame = useCallback((g: GameId) => setActiveGame(g), []);
  const viewFrame = useCallback((i: number) => setExpandedFrame(i), []);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const W = size.w, H = size.h;

  // Rebuild zones when room/size changes
  useEffect(() => {
    if (room === 'lobby')  zonesRef.current = buildLobbyZones(W, H, goTo);
    if (room === 'arcade') zonesRef.current = buildArcadeZones(W, H, playGame, goTo);
    if (room === 'expo')   zonesRef.current = buildExpoZones(W, H, goTo, viewFrame, figmaFiles.length);
    if (room === 'lounge') zonesRef.current = buildLoungeZones(W, H, goTo);
  }, [room, W, H, goTo, playGame, viewFrame, figmaFiles.length]);

  // Init NPCs
  useEffect(() => {
    npcRef.current = NPC_DEFS.slice(0, 4).map((d, i) => ({
      id: i, name: d.name, color: d.color,
      x: 100 + Math.random() * (W - 200), y: 100 + Math.random() * (H - 200),
      tx: 100 + Math.random() * (W - 200), ty: 100 + Math.random() * (H - 200),
      trail: [], idleTimer: 0,
    }));
  }, [room, W, H]);

  // Try Figma plugin bridge for real files + load thumbnails into canvas images
  useEffect(() => {
    if (room !== 'expo') return;
    try {
      window.parent.postMessage({ pluginMessage: { type: 'GET_TEAM_FILES' } }, '*');
    } catch { /* not in plugin context */ }
    const onMsg = (e: MessageEvent) => {
      const payload = e.data?.pluginMessage;
      if (payload?.type !== 'TEAM_FILES') return;
      const files: FigmaFile[] = payload.files;
      if (!files?.length) return;
      setFigmaFiles(files);
      // Pre-load thumbnails so the canvas can drawImage() them
      files.forEach((f, i) => {
        if (!f.thumbnail) return;
        const img = new Image();
        img.onload = () => { loadedImagesRef.current.set(`frame-${i}`, img); };
        img.src = f.thumbnail;
      });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [room]);

  // Mouse tracking — update cursor position via direct DOM mutation (no re-render)
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeGameRef.current) return;
    const x = e.clientX, y = e.clientY;
    cursorRef.current = { x, y };
    if (cursorDivRef.current) {
      cursorDivRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }, []);

  // Zone detection + interaction on click/space
  const interact = useCallback(() => {
    const zone = zonesRef.current.find(z => z.id === hoveredRef.current);
    zone?.action?.();
  }, []);

  const onMouseClick = useCallback(() => interact(), [interact]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); interact(); }
      if (e.key === 'Escape') { setActiveGame(null); setExpandedFrame(null); }
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

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame); // schedule next frame first so errors can't kill the loop
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      tRef.current += dt;
      const t = tRef.current;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, W, H);

      // Update NPC positions
      npcRef.current = npcRef.current.map(npc => {
        const dx = npc.tx - npc.x, dy = npc.ty - npc.y;
        const dist = Math.hypot(dx, dy);
        let { x, y, tx, ty, trail, idleTimer } = npc;
        idleTimer -= dt;
        if (dist < 8 || idleTimer <= 0) {
          tx = 80 + Math.random() * (W - 160);
          ty = 100 + Math.random() * (H - 160);
          idleTimer = 2 + Math.random() * 4;
        } else {
          const spd = 55;
          x += (dx / dist) * spd * dt;
          y += (dy / dist) * spd * dt;
        }
        const newTrail = [{ x, y }, ...trail.slice(0, 14)];
        return { ...npc, x, y, tx, ty, trail: newTrail, idleTimer };
      });

      // Detect hovered zone
      const cur = cursorRef.current;
      let newHover: string | null = null;
      for (const z of zonesRef.current) {
        if (z.type === 'deco') continue;
        if (cur.x >= z.x && cur.x <= z.x + z.w && cur.y >= z.y && cur.y <= z.y + z.h) {
          newHover = z.id; break;
        }
      }
      if (newHover !== hoveredRef.current) {
        hoveredRef.current = newHover;
        const zone = zonesRef.current.find(z => z.id === newHover) || null;
        setHoveredZone(zone);
      }

      // Update player cursor trail
      trailRef.current = [{ ...cur }, ...trailRef.current.slice(0, 16)];

      // Draw room
      const zones = zonesRef.current;
      const hid = hoveredRef.current;
      if (roomRef.current === 'lobby')  drawLobbyRoom(ctx, W, H, zones, hid, t);
      if (roomRef.current === 'arcade') drawArcadeRoom(ctx, W, H, zones, hid, t);
      if (roomRef.current === 'expo')   drawExpoRoom(ctx, W, H, zones, hid, t, figmaFiles, loadedImagesRef.current);
      if (roomRef.current === 'lounge') drawLoungeRoom(ctx, W, H, zones, hid, t);

      // Draw NPC cursors
      drawNPCs(ctx, npcRef.current);

      // Draw player cursor trail (behind cursor)
      trailRef.current.forEach((pt, i) => {
        const alpha = (1 - i / trailRef.current.length) * 0.45;
        const r = 4 * (1 - i / trailRef.current.length);
        ctx.fillStyle = `rgba(180,142,255,${alpha})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
      });

    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W, H, room, figmaFiles]);

  // Mount FigSmash engine when the cabinet is activated
  useEffect(() => {
    if (activeGame !== 'figsmash') return;
    // Reset the guard so the engine re-initialises if the player comes back
    (window as any).__figsmashInited = false;
    const id = window.setTimeout(() => mountEngine(), 80);
    return () => {
      window.clearTimeout(id);
      (window as any).__figsmashInited = false;
    };
  }, [activeGame]);

  // Game finish handler
  const onGameExit = useCallback((score: number, secs: number) => {
    if (activeGame && activeGame !== 'figsmash') {
      submitScore(activeGame as CartridgeId, score);
      addTimeSaved(secs);
    }
    setActiveGame(null);
  }, [activeGame, submitScore, addTimeSaved]);

  const highScores = consoleState.highScores;

  return (
    <div className="cfw-root" onMouseMove={onMouseMove} onClick={onMouseClick}>
      <canvas ref={canvasRef} className="cfw-canvas" />

      {/* Custom cursor — transform updated imperatively in onMouseMove */}
      <div className="cfw-cursor" ref={cursorDivRef}>
        <svg width="18" height="22" viewBox="0 0 18 22">
          <path d="M1 1 L1 17 L5 13 L7.5 19 L10 18 L7.5 12 L13 12 Z"
            fill="#b48eff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="cfw-cursor-name">you</span>
      </div>

      {/* Zone hover prompt */}
      {hoveredZone && !activeGame && expandedFrame === null && (
        <div className="cfw-prompt">
          <span className="cfw-prompt-hint">{hoveredZone.hint}</span>
          <span className="cfw-prompt-action">
            <kbd>CLICK</kbd> or <kbd>SPACE</kbd> to {hoveredZone.type === 'cabinet' ? 'play' : hoveredZone.type === 'frame' ? 'inspect' : 'enter'}
          </span>
          {hoveredZone.type === 'cabinet' && (
            <span className="cfw-prompt-hi">HI {highScores[hoveredZone.id.replace('cab-', '') as CartridgeId]?.toString().padStart(5, '0') || '00000'}</span>
          )}
        </div>
      )}

      {/* Room minimap / nav */}
      <div className="cfw-minimap">
        {(['lobby', 'expo', 'arcade', 'lounge'] as RoomId[]).map(r => (
          <button key={r} className={`cfw-mm-btn${room === r ? ' active' : ''}`} onClick={(e) => { e.stopPropagation(); goTo(r); }}>
            {r === 'lobby' ? '⌂' : r === 'expo' ? '🖼' : r === 'arcade' ? '🕹' : '☕'}
            <span>{r.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Presence bar */}
      <div className="cfw-presence">
        <span className="cfw-presence-label">● LIVE</span>
        {NPC_DEFS.map(n => (
          <span key={n.name} className="cfw-presence-dot" style={{ color: n.color }}>{n.name}</span>
        ))}
      </div>

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
              <canvas className="cfw-frame-canvas" id={`frame-canvas-${expandedFrame}`}
                ref={el => {
                  if (!el) return;
                  const ctx = el.getContext('2d')!;
                  el.width = 600; el.height = 420;
                  const img = loadedImagesRef.current.get(`frame-${expandedFrame}`);
                  if (img) {
                    // letterbox the real thumbnail into the preview
                    ctx.fillStyle = '#08041a'; ctx.fillRect(0, 0, 600, 420);
                    const scale = Math.min(600 / img.width, 420 / img.height);
                    const dw = img.width * scale, dh = img.height * scale;
                    ctx.drawImage(img, (600 - dw) / 2, (420 - dh) / 2, dw, dh);
                  } else {
                    drawPlaceholderFrame(ctx, 0, 0, 600, 420, expandedFrame);
                  }
                }} />
              <div className="cfw-frame-mcp-badge">live from Figma ✦</div>
            </div>
            <div className="cfw-frame-footer">
              <span>Last modified: {figmaFiles[expandedFrame]?.lastModified || 'unknown'}</span>
              <button className="cfw-frame-open">↗ Open in Figma</button>
            </div>
          </div>
        </div>
      )}

      {/* Arcade game modal */}
      {activeGame && activeGame !== 'figsmash' && (
        <div className="cfw-game-modal">
          <div className="cfw-game-header">
            <span className="cfw-game-title">
              {activeGame === 'fighero' ? 'FIGHERO' : activeGame === 'figcontrast' ? 'FIGCONTRAST' : 'FIGALIGN'}
            </span>
            <button className="cfw-game-eject" onClick={() => setActiveGame(null)}>⎋ EJECT</button>
          </div>
          <div className="cfw-game-screen">
            {activeGame === 'fighero'    && <FigHero    highScore={highScores.fighero}    onExit={onGameExit} />}
            {activeGame === 'figcontrast' && <FigContrast highScore={highScores.figcontrast} onExit={onGameExit} />}
            {activeGame === 'figalign'   && <FigAlign   highScore={highScores.figalign}   onExit={onGameExit} />}
          </div>
        </div>
      )}

      {/* FigSmash — render full game DOM, engine mounts via useEffect */}
      {activeGame === 'figsmash' && (
        <div className="cfw-figsmash-wrap">
          <div className="cfw-game-header">
            <span className="cfw-game-title">FIGSMASH</span>
            <button className="cfw-game-eject" onClick={() => setActiveGame(null)}>⎋ EXIT</button>
          </div>
          <HudHeader />
          <GameCanvas />
          <InspectorPanel />
          <CharacterSelect />
          <MapSelect />
          <WinScreen />
          <PauseMenu />
          <ForceQuitDialog />
          <ImportDialog />
          <Toolbar />
        </div>
      )}
    </div>
  );
}
