/**
 * Fig Smash Exporter v2 — Figma plugin main code (TypeScript source)
 *
 * Changes from v1:
 * - Adds buildUrlPayload(): lean export (no images) encoded as base64 for the URL hash deep-link.
 * - Plugin sends urlEncoded alongside the full payload so the UI can enable "Launch in Fig Smash".
 * - Handles 'launch' message by calling figma.openExternal(url).
 *
 * To deploy: compile to code.js (or paste the JS equivalent into src/imports/code.js).
 */

figma.showUI(__html__, { width: 380, height: 560 });

function toHex(c: RGB): string {
  const h = (v: number) => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

function solidFill(node: SceneNode): string | null {
  const fills = (node as GeometryMixin).fills;
  if (!fills || fills === figma.mixed || !fills.length) return null;
  for (const f of fills as Paint[]) {
    if (f.visible !== false && f.type === 'SOLID') return toHex((f as SolidPaint).color);
  }
  return null;
}

function pickContainer(frame: SceneNode): SceneNode {
  let c: SceneNode = frame;
  while (
    'children' in c && c.children.length === 1 &&
    'children' in c.children[0] && c.children[0].children.length > 1
  ) {
    c = c.children[0];
  }
  return c;
}

function selectFrame(): SceneNode | null {
  const sel = figma.currentPage.selection;
  const TYPES = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'GROUP', 'SECTION'];
  for (const n of sel) {
    if (TYPES.includes(n.type)) return n;
  }
  return sel[0] ?? null;
}

interface CollectedNode { node: SceneNode; bb: Rect; }
interface CollectResult { nodes: CollectedNode[]; fbb: Rect; error?: never; }
interface CollectError { error: string; nodes?: never; fbb?: never; }

function collectNodes(frame: SceneNode): CollectResult | CollectError {
  const fbb = (frame as LayoutMixin).absoluteBoundingBox;
  if (!fbb) return { error: 'That layer has no bounds — try selecting a frame.' };
  const container = pickContainer(frame);
  const kids = ('children' in container && container.children.length)
    ? container.children : [frame];
  const nodes: CollectedNode[] = [];
  for (const n of kids) {
    if ((n as SceneNode & { visible: boolean }).visible === false) continue;
    if (typeof (n as any).opacity === 'number' && (n as any).opacity < 0.02) continue;
    const bb = (n as LayoutMixin).absoluteBoundingBox;
    if (!bb || bb.width < 1 || bb.height < 1) continue;
    nodes.push({ node: n as SceneNode, bb });
    if (nodes.length >= 40) break;
  }
  return { nodes, fbb };
}

// Full export with PNG images — for Copy / Download.
async function buildPayload() {
  const frame = selectFrame();
  if (!frame) return { error: 'Select a frame (or any layer) on the canvas, then run the plugin.' };
  const col = collectNodes(frame);
  if (col.error) return { error: col.error };
  if (!col.nodes!.length) return { error: 'No visible layers found inside that frame.' };

  const { nodes, fbb } = col as CollectResult;
  const out = [];
  for (const { node: n, bb } of nodes) {
    const node: Record<string, unknown> = {
      name: n.name,
      x: Math.round(bb.x - fbb.x), y: Math.round(bb.y - fbb.y),
      w: Math.round(bb.width), h: Math.round(bb.height),
      fill: solidFill(n),
    };
    try {
      const big = Math.max(bb.width, bb.height) > 900;
      const bytes = await (n as ExportMixin).exportAsync({
        format: 'PNG', constraint: { type: 'SCALE', value: big ? 1 : 2 }
      });
      node.img = 'data:image/png;base64,' + figma.base64Encode(bytes);
    } catch { /* fall back to solid fill */ }
    out.push(node);
  }

  return {
    payload: {
      type: 'figsmash-frame', version: 2,
      name: frame.name,
      width: Math.round(fbb.width), height: Math.round(fbb.height),
      nodes: out,
    }
  };
}

// Lean export without images — shape/fill/text only.
// Encoded as base64 so it survives a URL hash intact.
function buildUrlPayload(): string | null {
  const frame = selectFrame();
  if (!frame) return null;
  const col = collectNodes(frame);
  if (col.error || !col.nodes!.length) return null;

  const { nodes, fbb } = col as CollectResult;
  const out = nodes.map(({ node: n, bb }) => ({
    name: n.name,
    x: Math.round(bb.x - fbb.x), y: Math.round(bb.y - fbb.y),
    w: Math.round(bb.width), h: Math.round(bb.height),
    fill: solidFill(n),
  }));

  try {
    const json = JSON.stringify({
      type: 'figsmash-frame', version: 2,
      name: frame.name,
      width: Math.round(fbb.width), height: Math.round(fbb.height),
      nodes: out,
    });
    // URL-safe base64 (RFC 4648 §5): "+/" → "-_", strip "=" padding,
    // so the hash survives openExternal / address-bar percent-encoding intact.
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return null;
  }
}

let busy = false;
async function send() {
  if (busy) return;
  busy = true;
  figma.ui.postMessage({ type: 'status', msg: 'Rendering layers…' });
  try {
    const res = await buildPayload();
    if ('error' in res) {
      figma.ui.postMessage({ type: 'error', msg: res.error });
    } else {
      figma.ui.postMessage({
        type: 'frame',
        payload: res.payload,
        urlEncoded: buildUrlPayload(),
        count: res.payload.nodes.length,
      });
    }
  } catch (e: any) {
    figma.ui.postMessage({ type: 'error', msg: 'Export failed: ' + (e?.message ?? e) });
  }
  busy = false;
}

figma.ui.onmessage = (msg: any) => {
  if (msg?.type === 'refresh') send();
  if (msg?.type === 'close') figma.closePlugin();
  if (msg?.type === 'launch') figma.openExternal(msg.url);
};

send();
figma.on('selectionchange', send);
