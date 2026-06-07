figma.showUI(__html__, { width: 380, height: 560 });

function toHex(c) {
	var h = function (v) {
		return ('0' + Math.round(v * 255).toString(16)).slice(-2);
	};
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
	while (
		'children' in c &&
		c.children.length === 1 &&
		'children' in c.children[0] &&
		c.children[0].children.length > 1
	)
		c = c.children[0];
	return c;
}
function selectFrame() {
	var sel = figma.currentPage.selection,
		i;
	for (i = 0; i < sel.length; i++) {
		var t = sel[i].type;
		if (
			t === 'FRAME' ||
			t === 'COMPONENT' ||
			t === 'COMPONENT_SET' ||
			t === 'INSTANCE' ||
			t === 'GROUP' ||
			t === 'SECTION'
		)
			return sel[i];
	}
	return sel[0] || null;
}
function collectNodes(frame) {
	var fbb = frame.absoluteBoundingBox;
	if (!fbb)
		return { error: 'That layer has no bounds — try selecting a frame.' };
	var container = pickContainer(frame);
	var kids =
		'children' in container && container.children.length
			? container.children
			: [frame];
	var nodes = [];
	for (var i = 0; i < kids.length; i++) {
		var n = kids[i];
		if (
			n.visible === false ||
			(typeof n.opacity === 'number' && n.opacity < 0.02)
		)
			continue;
		var bb = n.absoluteBoundingBox;
		if (!bb || bb.width < 1 || bb.height < 1) continue;
		nodes.push({ node: n, bb: bb });
		if (nodes.length >= 40) break;
	}
	return { nodes: nodes, fbb: fbb };
}
async function buildPayload() {
	var frame = selectFrame();
	if (!frame)
		return {
			error:
				'Select a frame (or any layer) on the canvas, then run the plugin.',
		};
	var col = collectNodes(frame);
	if (col.error) return { error: col.error };
	if (!col.nodes.length)
		return { error: 'No visible layers found inside that frame.' };
	var out = [];
	for (var i = 0; i < col.nodes.length; i++) {
		var n = col.nodes[i].node,
			bb = col.nodes[i].bb;
		var node = {
			name: n.name,
			x: Math.round(bb.x - col.fbb.x),
			y: Math.round(bb.y - col.fbb.y),
			w: Math.round(bb.width),
			h: Math.round(bb.height),
			fill: solidFill(n),
		};
		try {
			var big = Math.max(bb.width, bb.height) > 900;
			var bytes = await n.exportAsync({
				format: 'PNG',
				constraint: { type: 'SCALE', value: big ? 1 : 2 },
			});
			node.img = 'data:image/png;base64,' + figma.base64Encode(bytes);
		} catch (e) {}
		out.push(node);
	}
	return {
		payload: {
			type: 'figsmash-frame',
			version: 2,
			name: frame.name,
			width: Math.round(col.fbb.width),
			height: Math.round(col.fbb.height),
			nodes: out,
		},
	};
}
// UTF-8 encode a string to a byte array — no TextEncoder/unescape (absent in the sandbox).
function utf8Bytes(str) {
	var out = [],
		i,
		c,
		c2,
		cp;
	for (i = 0; i < str.length; i++) {
		c = str.charCodeAt(i);
		if (c < 0x80) out.push(c);
		else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
		else if (c >= 0xd800 && c <= 0xdbff) {
			c2 = str.charCodeAt(++i);
			cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
			out.push(
				0xf0 | (cp >> 18),
				0x80 | ((cp >> 12) & 0x3f),
				0x80 | ((cp >> 6) & 0x3f),
				0x80 | (cp & 0x3f),
			);
		} else
			out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
	}
	return out;
}
// Pure-JS base64 — no btoa, no figma.base64Encode dependency.
function toBase64(bytes) {
	var chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var out = '',
		i;
	for (i = 0; i < bytes.length; i += 3) {
		var b0 = bytes[i],
			b1 = i + 1 < bytes.length ? bytes[i + 1] : 0,
			b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
		out += chars[b0 >> 2];
		out += chars[((b0 & 3) << 4) | (b1 >> 4)];
		out += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
		out += i + 2 < bytes.length ? chars[b2 & 63] : '=';
	}
	return out;
}
var urlError = null;
// Encode the same full payload (with per-layer PNGs) that copy/paste uses,
// so launches have the same visual fidelity as the manual flow.
// URL-safe base64 ("+/" → "-_", no padding) survives figma.openExternal /
// browser address-bar percent-encoding intact.
function encodePayload(payload) {
	urlError = null;
	try {
		var json = JSON.stringify(payload);
		return toBase64(utf8Bytes(json))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	} catch (e) {
		urlError = (e && e.message) || String(e);
		return null;
	}
}
function diagInfo() {
	var sel = figma.currentPage.selection,
		types = [],
		i;
	for (i = 0; i < sel.length; i++) types.push(sel[i].type);
	var f = selectFrame();
	return (
		'sel ' +
		sel.length +
		' [' +
		types.join(',') +
		'] · page "' +
		figma.currentPage.name +
		'" · ' +
		(f ? 'using ' + f.type + ' "' + f.name + '"' : 'no usable frame')
	);
}
var busy = false;
async function send() {
	if (busy) return;
	busy = true;
	figma.ui.postMessage({ type: 'status', msg: 'Rendering layers…' });
	try {
		var res = await buildPayload();
		if (res.error) {
			figma.ui.postMessage({
				type: 'error',
				msg: res.error,
				debug: diagInfo(),
			});
		} else {
			var enc = encodePayload(res.payload);
			figma.ui.postMessage({
				type: 'frame',
				payload: res.payload,
				urlEncoded: enc,
				urlError: enc ? null : urlError,
				count: res.payload.nodes.length,
				debug:
					diagInfo() +
					' · enc ' +
					(enc ? enc.length + ' chars' : 'NULL (' + urlError + ')'),
			});
		}
	} catch (e) {
		figma.ui.postMessage({
			type: 'error',
			msg: 'Export failed: ' + ((e && e.message) || e),
			debug: diagInfo(),
		});
	}
	busy = false;
}
figma.ui.onmessage = function (msg) {
	if (msg && msg.type === 'refresh') send();
	if (msg && msg.type === 'close') figma.closePlugin();
	if (msg && msg.type === 'launch') figma.openExternal(msg.url);
};
send();
figma.on('selectionchange', send);
