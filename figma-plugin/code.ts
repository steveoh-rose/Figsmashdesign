figma.showUI(__html__, { width: 380, height: 560 });

function toHex(c) {
	var h = function (v) { return ('0' + Math.round(v * 255).toString(16)).slice(-2); };
	return '#' + h(c.r) + h(c.g) + h(c.b);
}
function solidFill(node) {
	var fills = node.fills;
	if (!fills || fills === figma.mixed || !fills.length) return null;
	for (var i = 0; i < fills.length; i++) {
		var f = fills[i];
		if (f.visible !== false && f.type === 'SOLID') return toHex(f.color);
	}
	return null;
}
function pickContainer(frame) {
	var c = frame;
	while ('children' in c && c.children.length === 1 && 'children' in c.children[0] && c.children[0].children.length > 1) c = c.children[0];
	return c;
}
function selectFrame() {
	var sel = figma.currentPage.selection, i;
	for (i = 0; i < sel.length; i++) {
		var t = sel[i].type;
		if (t === 'FRAME' || t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'INSTANCE' || t === 'GROUP' || t === 'SECTION') return sel[i];
	}
	return sel[0] || null;
}
function collectNodes(frame) {
	var fbb = frame.absoluteBoundingBox;
	if (!fbb) return { error: 'That layer has no bounds — try selecting a frame.' };
	var container = pickContainer(frame);
	var kids = 'children' in container && container.children.length ? container.children : [frame];
	var nodes = [];
	for (var i = 0; i < kids.length; i++) {
		var n = kids[i];
		if (n.visible === false || (typeof n.opacity === 'number' && n.opacity < 0.02)) continue;
		var bb = n.absoluteBoundingBox;
		if (!bb || bb.width < 1 || bb.height < 1) continue;
		nodes.push({ node: n, bb: bb });
		if (nodes.length >= 40) break;
	}
	return { nodes: nodes, fbb: fbb };
}
// Two payloads: `full` keeps PNG (lossless) for copy/paste; `lean` uses JPEG@scale1
// for the URL launch path so the gzipped+base64 URL stays under browser limits.
async function buildPayloads() {
	var frame = selectFrame();
	if (!frame) return { error: 'Select a frame (or any layer) on the canvas, then run the plugin.' };
	var col = collectNodes(frame);
	if (col.error) return { error: col.error };
	if (!col.nodes.length) return { error: 'No visible layers found inside that frame.' };
	var fullNodes = [], leanNodes = [];
	for (var i = 0; i < col.nodes.length; i++) {
		var n = col.nodes[i].node, bb = col.nodes[i].bb;
		var base = {
			name: n.name,
			x: Math.round(bb.x - col.fbb.x), y: Math.round(bb.y - col.fbb.y),
			w: Math.round(bb.width), h: Math.round(bb.height),
			fill: solidFill(n),
		};
		var full = Object.assign({}, base), lean = Object.assign({}, base);
		// Lossless PNG for the manual copy/paste flow.
		try {
			var pngBytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: Math.max(bb.width, bb.height) > 900 ? 1 : 2 } });
			full.img = 'data:image/png;base64,' + figma.base64Encode(pngBytes);
		} catch (e) {}
		// Lossy JPG@1× for the URL — far smaller, perfectly fine for a game stage.
		try {
			var jpgBytes = await n.exportAsync({ format: 'JPG', constraint: { type: 'SCALE', value: 1 } });
			lean.img = 'data:image/jpeg;base64,' + figma.base64Encode(jpgBytes);
		} catch (e) {}
		fullNodes.push(full);
		leanNodes.push(lean);
	}
	var meta = { type: 'figsmash-frame', version: 2, name: frame.name, width: Math.round(col.fbb.width), height: Math.round(col.fbb.height) };
	return {
		full: Object.assign({}, meta, { nodes: fullNodes }),
		lean: Object.assign({}, meta, { nodes: leanNodes }),
	};
}
function diagInfo() {
	var sel = figma.currentPage.selection, types = [], i;
	for (i = 0; i < sel.length; i++) types.push(sel[i].type);
	var f = selectFrame();
	return 'sel ' + sel.length + ' [' + types.join(',') + '] · page "' + figma.currentPage.name + '" · ' + (f ? 'using ' + f.type + ' "' + f.name + '"' : 'no usable frame');
}
var busy = false;
async function send() {
	if (busy) return;
	busy = true;
	figma.ui.postMessage({ type: 'status', msg: 'Rendering layers…' });
	try {
		var res = await buildPayloads();
		if (res.error) {
			figma.ui.postMessage({ type: 'error', msg: res.error, debug: diagInfo() });
		} else {
			// UI thread does gzip + URL-safe base64 via CompressionStream.
			figma.ui.postMessage({ type: 'frame', full: res.full, lean: res.lean, count: res.full.nodes.length, debug: diagInfo() });
		}
	} catch (e) {
		figma.ui.postMessage({ type: 'error', msg: 'Export failed: ' + ((e && e.message) || e), debug: diagInfo() });
	}
	busy = false;
}
figma.ui.onmessage = function (msg) {
	if (msg && msg.type === 'refresh') send();
	if (msg && msg.type === 'close') figma.closePlugin();
	if (msg && msg.type === 'launch') {
		var urlLen = (msg.url || '').length;
		try {
			figma.openExternal(msg.url);
			figma.notify('Opening Fig Smash… (URL ' + urlLen + ' chars)');
		} catch (e) {
			figma.notify('openExternal failed (' + urlLen + ' chars): ' + ((e && e.message) || e), { error: true });
		}
	}
};
send();
figma.on('selectionchange', send);
