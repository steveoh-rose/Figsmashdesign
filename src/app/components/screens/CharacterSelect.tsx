export function CharacterSelect() {
  return (
    <div className="cs" id="charselect">
      <div className="ssbox">
        <header className="csv-head">
          <span className="csv-title">Choose your character</span>
        </header>
        <div className="csv-roster">
          <div className="csgrid" id="csgrid" />
        </div>
        <footer className="csv-bar">
          <div className="csv-pick">
            <div className="csv-portrait-wrap">
              <canvas className="csv-portrait" id="p1portrait" width={150} height={150} />
              <div className="charart charart-p1" id="p1art" />
            </div>
            <div className="csv-pick-text">
              <div className="csv-pick-name" id="p1charname">Mario</div>
              <div className="csv-pick-ability" id="p1ability">Fireball Shot</div>
            </div>
          </div>
          <div className="csv-diff">
            <span className="csv-diff-label">CPU level</span>
            <div className="seg" id="diffseg" role="group" aria-label="CPU difficulty" />
          </div>
          <button className="ssback" id="ssback">◀ Back</button>
          <button className="csv-start" id="ssstart">
            START BATTLE <span aria-hidden="true">▶</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
