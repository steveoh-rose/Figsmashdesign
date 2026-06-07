export function Toolbar() {
  return (
    <>
      <div className="tip" id="tip">
        <b>Click</b>: punch / grab · <b>Right-click</b>: your character's special · <b>Scale</b> / <b>Slice</b> / <b>Shape</b> tools below
      </div>
      <div className="toolbar" id="toolbar">
        <button className="tool on" data-tool="move" title="Move — grab, fling, punch">
          <svg viewBox="0 0 24 24"><path d="M5 3l5 16 2.5-6.5L19 10z" /></svg>
          <span className="kbd">V</span>
        </button>
        <button className="tool" data-tool="lasso" title="Lasso — slingshot throw">
          <svg viewBox="0 0 24 24">
            <path d="M12 4c4.4 0 8 2.5 8 5.5S16.4 15 12 15 4 12.5 4 9.5 7.6 4 12 4z" />
            <path d="M8 14.5c0 3 1 5 3 5" />
          </svg>
          <span className="kbd">L</span>
        </button>
        <button className="tool" data-tool="scale" title="Scale — drag a box to scale things up">
          <svg viewBox="0 0 24 24">
            <path d="M14 4h6v6" /><path d="M20 4l-7 7" /><path d="M10 20H4v-6" /><path d="M4 20l7-7" />
          </svg>
          <span className="kbd">K</span>
        </button>
        <button className="tool" data-tool="slice" title="Slice — swipe to cut things in half">
          <svg viewBox="0 0 24 24">
            <path d="M5 19L19 5" /><path d="M9 5H5v4" />
          </svg>
          <span className="kbd">C</span>
        </button>
        <div className="shapewrap">
          <button className="tool" data-tool="shape" id="shapebtn" title="Shape — draw shapes on the canvas (the enemy can grab them)">
            <svg viewBox="0 0 24 24" id="shapeicon"><rect x="4" y="6" width="16" height="12" rx="1.5" /></svg>
          </button>
          <button className="caret" id="shapecaret" title="Pick a shape">▾</button>
          <div className="shapemenu" id="shapemenu" />
        </div>
        <div className="tsep" />
        <button className="tool dim" title="Pen — coming soon">
          <svg viewBox="0 0 24 24"><path d="M4 20l4-1 9-9-3-3-9 9z" /><path d="M14 7l3 3" /></svg>
        </button>
      </div>
      <button className="mute" id="mute" title="Mute / unmute">🔊</button>
    </>
  );
}
