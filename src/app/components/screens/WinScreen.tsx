export function WinScreen() {
  return (
    <div className="cs" id="winscreen">
      <div className="winbox">
        <div className="winlabel">RIP</div>
        <div className="wintitle" id="winresult">YOU WIN!</div>
        <div className="winscore" id="winscore" />
        <div className="winsub">The file is dead. Lay it to rest.</div>
        <div className="winbtns winbtns-bloom">
          <button id="wingarden" className="prim">🌱 Bury &amp; Bloom</button>
        </div>
        <div className="winbtns">
          <button id="winchar">Change character</button>
          <button id="winrematch">Rematch ▶</button>
        </div>
      </div>
    </div>
  );
}
