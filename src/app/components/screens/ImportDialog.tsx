export function ImportDialog() {
  return (
    <div className="cs" id="importdlg">
      <div className="impbox">
        <div className="imptitle">Import a Figma frame</div>
        <div className="impsub">
          In Figma, select a frame and run the <b>Fig Smash Exporter</b> plugin, then <b>Copy</b> its data and paste below — or pick the downloaded <b>.json</b>. Your design becomes a stage you can smash.
        </div>
        <textarea id="impjson" className="imparea" placeholder="Paste your frame JSON here…" spellCheck={false} />
        <div className="imperr" id="imperr" />
        <div className="impbtns">
          <button id="impfile">Choose .json…</button>
          <button id="impclip">Paste from clipboard</button>
          <span style={{ flex: 1 }} />
          <button id="impcancel">Cancel</button>
          <button id="impok" className="prim">Import &amp; select</button>
        </div>
        <input type="file" id="impfileinput" accept=".json,application/json" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
