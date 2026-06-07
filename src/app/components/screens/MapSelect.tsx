export function MapSelect() {
  return (
    <div className="cs" id="mapselect">
      <div className="ssbox">
        <div className="sshead"><span>CHOOSE YOUR STAGE</span></div>
        <div className="ssgridwrap"><div className="mapgrid" id="mapgrid" /></div>
        <div className="mapfoot">
          <button className="ssback" id="ssimport">⬆ Import Figma frame</button>
          <div className="mapcaption" id="mapcaption">
            Each stage is a destructible app you can rip apart.
          </div>
        </div>
        <button className="ssstart" id="ssstart2">Next <span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}
