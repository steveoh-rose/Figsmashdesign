// Fig Smash Exporter — renders each top-level layer of the selected frame to a
// PNG and serialises it (with frame-relative position) into a "figsmash-frame"
// payload that Fig Smash imports as a destructible stage.
figma.showUI(__html__, { width: 380, height: 520 });

function toHex(c) {
  var h = function (v) { return ('0' + Math.round(v * 255).toString(16)).slice(-2); };
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

// First visible solid fill as hex (fallback colour if the image export fails).
function solidFill(node) {
  var fills = node.fills;
  if (!fills || fills === figma.mixed || !fills.length) return null;
  for (var i = 0; i < fills.length; i++) {
    var f = fills[i];
    if (f.visible !== false && f.type === 'SOLID') return toHex(f.color);
  }
  return null;
}

// If a frame just wraps everything in one group, descend so the pieces are the
// meaningful layers (the "most logical groups") rather than one giant blob.
function pickContainer(frame) {
  var c = frame;
  while (('children' in c) && c.children.length === 1 &&
         ('children' in c.children[0]) && c.children[0].children.length > 1) {
    c = c.children[0];
  }
  return c;
}

async function buildPayload() {
  var sel = figma.currentPage.selection, frame = null, i;
  for (i = 0; i < sel.length; i++) {
    var t = sel[i].type;
    if (t === 'FRAME' || t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'INSTANCE' || t === 'GROUP' || t === 'SECTION') { frame = sel[i]; break; }
  }
  if (!frame) frame = sel[0];
  if (!frame) return { error: 'Select a frame (or any layer) on the canvas, then run the plugin.' };

  var fbb = frame.absoluteBoundingBox;
  if (!fbb) return { error: 'That layer has no bounds — try selecting a frame.' };

  var container = pickContainer(frame);
  var kids = (('children' in container) && container.children.length) ? container.children : [frame];

  var nodes = [];
  for (i = 0; i < kids.length; i++) {
    var n = kids[i];
    if (n.visible === false || (typeof n.opacity === 'number' && n.opacity < 0.02)) continue;
    var bb = n.absoluteBoundingBox;
    if (!bb || bb.width < 1 || bb.height < 1) continue;

    var node = {
      name: n.name,
      x: Math.round(bb.x - fbb.x),
      y: Math.round(bb.y - fbb.y),
      w: Math.round(bb.width),
      h: Math.round(bb.height),
      fill: solidFill(n)
    };
    try {
      var big = Math.max(bb.width, bb.height) > 900;   // keep huge layers from bloating the payload
      var bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: big ? 1 : 2 } });
      node.img = 'data:image/png;base64,' + figma.base64Encode(bytes);
    } catch (e) { /* fall back to the solid-fill colour */ }
    nodes.push(node);
    if (nodes.length >= 40) break;
  }

  if (!nodes.length) return { error: 'No visible layers found inside that frame.' };

  return {
    payload: {
      type: 'figsmash-frame', version: 2,
      name: frame.name,
      width: Math.round(fbb.width), height: Math.round(fbb.height),
      nodes: nodes
    }
  };
}

var busy = false;
async function send() {
  if (busy) return;
  busy = true;
  figma.ui.postMessage({ type: 'status', msg: 'Rendering layers…' });
  try {
    var res = await buildPayload();
    if (res.error) figma.ui.postMessage({ type: 'error', msg: res.error });
    else figma.ui.postMessage({ type: 'frame', payload: res.payload });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', msg: 'Export failed: ' + ((e && e.message) || e) });
  }
  busy = false;
}

figma.ui.onmessage = function (msg) {
  if (msg && msg.type === 'refresh') send();
  if (msg && msg.type === 'close') figma.closePlugin();
};

send();
figma.on('selectionchange', send);
