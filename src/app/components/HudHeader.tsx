export function HudHeader() {
  return (
    <>
      <div className="head">
        <h1>RIP <b>DESIGNS</b></h1>
        <p>smash the dead file · grow the garden</p>
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
