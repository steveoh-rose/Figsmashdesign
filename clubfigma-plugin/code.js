/**
 * Club Figma — plugin sandbox (main) code.
 *
 * Runs in the Figma plugin sandbox with access to the `figma.*` API. Its only
 * job is to host the Club Figma web app as the plugin UI and feed it real
 * design thumbnails from the current document over postMessage.
 *
 * Bridge protocol (matches src/club-figma/ClubFigmaWorld.tsx):
 *   UI  → main:  { type: 'GET_TEAM_FILES' }
 *   main → UI:   { type: 'TEAM_FILES', files: [{ key, name, team, thumbnail, lastModified }] }
 */

// Big window — Club Figma is a full-canvas explorable world.
figma.showUI(__html__, { width: 1280, height: 800, themeColors: true });

var MAX_FILES = 12;       // cap thumbnails so export stays snappy
var THUMB_WIDTH = 220;    // px — small enough to stream, large enough to read

function isFrameLike(node) {
  var t = node.type;
  return t === 'FRAME' || t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'SECTION';
}

// Walk every page, collect the top-level frames/components, export a thumbnail
// for each, and stream the set back to the UI.
async function sendTeamFiles() {
  var files = [];
  try {
    var pages = figma.root.children;
    for (var pi = 0; pi < pages.length && files.length < MAX_FILES; pi++) {
      var page = pages[pi];
      // Pages must be loaded before their children are readable (dynamic-page docs).
      try { if (page.loadAsync) await page.loadAsync(); } catch (e) {}
      var children = page.children || [];
      for (var fi = 0; fi < children.length && files.length < MAX_FILES; fi++) {
        var node = children[fi];
        if (!isFrameLike(node) || node.visible === false) continue;
        var bb = node.absoluteBoundingBox;
        if (!bb || bb.width < 4 || bb.height < 4) continue;
        try {
          var bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: THUMB_WIDTH } });
          // Deep link straight to this frame when the file is saved (has a key).
          var url = figma.fileKey
            ? 'https://www.figma.com/file/' + figma.fileKey + '?node-id=' + encodeURIComponent(node.id)
            : undefined;
          files.push({
            key: node.id,
            name: node.name,
            team: page.name,
            thumbnail: 'data:image/png;base64,' + figma.base64Encode(bytes),
            lastModified: 'now',
            url: url,
          });
        } catch (e) { /* skip nodes that refuse to export */ }
      }
    }
  } catch (e) {
    figma.notify('Club Figma: could not read this document — ' + ((e && e.message) || e));
  }
  figma.ui.postMessage({ type: 'TEAM_FILES', files: files });
  if (!files.length) {
    figma.notify('Club Figma: no top-level frames found in this file. Open a design file with frames to fill the Expo Hall.');
  }
}

// ── Connection config (Figma REST token + team id) ───────────────────────────
// Persisted in clientStorage so the user pastes their token only once. The
// actual REST calls happen in the UI iframe (the sandbox has no fetch); the
// sandbox just stores and relays the config.
var CONFIG_KEY = 'clubfigma.config.v1';

async function sendConfig() {
  var config = null;
  try { config = await figma.clientStorage.getAsync(CONFIG_KEY); } catch (e) {}
  figma.ui.postMessage({ type: 'CONFIG', config: config || null });
}
async function setConfig(config) {
  try { await figma.clientStorage.setAsync(CONFIG_KEY, config || null); } catch (e) {}
  figma.ui.postMessage({ type: 'CONFIG', config: config || null });
  if (config) figma.notify('Club Figma: connected to your Figma org.');
}

figma.ui.onmessage = function (msg) {
  if (!msg) return;
  if (msg.type === 'GET_TEAM_FILES') sendTeamFiles();        // current-file fallback
  if (msg.type === 'GET_CONFIG') sendConfig();
  if (msg.type === 'SET_CONFIG') setConfig(msg.config);
  if (msg.type === 'OPEN_URL' && msg.url) {
    try { figma.openExternal(msg.url); } catch (e) { figma.notify('Could not open: ' + ((e && e.message) || e)); }
  }
  if (msg.type === 'close') figma.closePlugin();
};

// On launch: hand over any stored connection, and push the current file's frames
// as an immediate fallback so the Expo Hall is never empty.
sendConfig();
sendTeamFiles();
// Refresh whenever the canvas changes (new frames, edits, renames).
figma.on('documentchange', function () { /* debounced below */ scheduleRefresh(); });

var _refreshTimer = null;
function scheduleRefresh() {
  if (_refreshTimer) return;
  _refreshTimer = setTimeout(function () { _refreshTimer = null; sendTeamFiles(); }, 1500);
}
