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

function relTime(ms) {
  if (!ms) return '';
  var diff = Date.now() - ms;
  var min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return min + 'm ago';
  var hr = Math.round(min / 60);
  if (hr < 24) return hr + 'h ago';
  return Math.round(hr / 24) + 'd ago';
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
          files.push({
            key: node.id,
            name: node.name,
            team: page.name,
            thumbnail: 'data:image/png;base64,' + figma.base64Encode(bytes),
            lastModified: relTime(figma.root.getPluginData ? 0 : 0) || 'now',
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

figma.ui.onmessage = function (msg) {
  if (!msg) return;
  if (msg.type === 'GET_TEAM_FILES') sendTeamFiles();
  if (msg.type === 'close') figma.closePlugin();
};

// Push an initial batch so the Expo Hall has data the moment the user walks in.
sendTeamFiles();
// Refresh whenever the canvas changes (new frames, edits, renames).
figma.on('documentchange', function () { /* debounced below */ scheduleRefresh(); });

var _refreshTimer = null;
function scheduleRefresh() {
  if (_refreshTimer) return;
  _refreshTimer = setTimeout(function () { _refreshTimer = null; sendTeamFiles(); }, 1500);
}
