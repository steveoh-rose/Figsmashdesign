export function WinScreen() {
  return (
    <div className="cs" id="winscreen">
      <div className="winbox">
        <div className="winlabel">GAME!</div>
        <div className="wintitle" id="winresult">YOU WIN!</div>
        <div className="winscore" id="winscore" />
        <div className="winsub">First to 5 stocks</div>
        <div className="winbtns">
          <button id="winchar">Change character</button>
          <button id="winrematch" className="prim">Rematch ▶</button>
        </div>
      </div>
    </div>
  );
}
