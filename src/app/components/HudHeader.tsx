export function HudHeader() {
  return (
    <>
      <div className="head">
        <h1>FIG <b>SMASH</b> — Phase 4</h1>
        <p>juice, sound &amp; the Force Quit finisher</p>
      </div>
      <div className="score">
        <div className="s">
          <span className="you" id="syou">0</span> — <span className="cpu" id="scpu">0</span>
        </div>
        <div className="lbl">YOU &nbsp; KO &nbsp; CPU</div>
      </div>
    </>
  );
}
