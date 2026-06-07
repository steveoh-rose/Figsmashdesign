export function PauseMenu() {
  return (
    <div className="cs" id="pausemenu">
      <div className="pausebox">
        <div className="pausetitle">PAUSED</div>
        <div className="pausebtns">
          <button id="pauseresume" className="prim">Resume</button>
          <button id="pauserestart">Restart match</button>
          <button id="pauseend">End match</button>
          <button id="pausecap">📸 Screenshot</button>
          <button id="pauseshare">🔗 Share link</button>
        </div>
        <div className="pausemsg" id="pausemsg" />
      </div>
    </div>
  );
}
