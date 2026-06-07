/**
 * The original right-side tuning panel. CSS hides it (`.panel { display:none }`),
 * but the engine reads/writes these inputs by id (sliders, model select, readouts),
 * so the markup must exist. Don't remove without auditing engine.ts getElementById calls.
 */
export function InspectorPanel() {
  return (
    <div className="panel" id="panel">
      <div className="figtop">
        <div className="ava">S</div>
        <button className="present" tabIndex={-1}>▷</button>
        <button className="share" tabIndex={-1}>Share</button>
      </div>
      <div className="figtabs">
        <span className="dt on">Design</span>
        <span className="dt">Prototype</span>
        <span className="zoom">100% ▾</span>
      </div>
      <div className="sect"><span>SPRING / WEIGHT</span><span id="fps">–</span></div>
      <div className="row"><label>Stiffness (k)<span id="kVal" /></label><input type="range" id="k" min="20" max="900" step="1" /></div>
      <div className="row"><label>Damping (c)<span id="cVal" /></label><input type="range" id="cc" min="2" max="60" step="0.5" /></div>
      <div className="row"><label>Mass (m)<span id="mVal" /></label><input type="range" id="m" min="0.3" max="6" step="0.1" /></div>
      <div className="row"><label>Throw power<span id="pVal" /></label><input type="range" id="p" min="0.3" max="3" step="0.05" /></div>
      <div className="divider" />
      <div className="sect"><span>COMBAT</span></div>
      <div className="row"><label>Punch damage<span id="pdVal" /></label><input type="range" id="pd" min="2" max="16" step="0.5" /></div>
      <div className="row"><label>Knockback<span id="kbVal" /></label><input type="range" id="kb" min="80" max="520" step="10" /></div>
      <div className="divider" />
      <div className="sect"><span>SCALE TOOL</span></div>
      <div className="row"><label>Max scale<span id="smVal" /></label><input type="range" id="sm" min="1.8" max="4" step="0.1" /></div>
      <div className="row"><label>Big-hit knockback ×<span id="skVal" /></label><input type="range" id="sk" min="1.2" max="3" step="0.1" /></div>
      <div className="divider" />
      <div className="sect"><span>OPPONENT — MODEL</span></div>
      <select className="model" id="model">
        <option value="ollama">Ollama (local) — harmless</option>
        <option value="haiku">Haiku 4.5 — fast, shallow</option>
        <option value="sonnet">Sonnet 4.6 — sharp</option>
        <option value="opus">Opus 4.8 — relentless</option>
      </select>
      <div className="modeldesc" id="modeldesc" />
      <div style={{ height: 10 }} />
      <div className="row"><label>Reaction<span id="rxVal" /></label><input type="range" id="rx" min="0.08" max="1.0" step="0.01" /></div>
      <div className="row"><label>Aim jitter<span id="ajVal" /></label><input type="range" id="aj" min="0" max="0.6" step="0.01" /></div>
      <div className="row"><label>Aggression<span id="agVal" /></label><input type="range" id="ag" min="0" max="1" step="0.05" /></div>
      <div className="presets">
        <button data-preset="floaty">Floaty</button>
        <button data-preset="balanced">Balanced</button>
        <button data-preset="snappy">Snappy</button>
      </div>
      <div className="actions">
        <button id="charbtn">Cursor</button>
        <button id="reset">Reset match</button>
      </div>
      <div className="divider" />
      <div className="readout"><span>your damage</span><b className="blue" id="pdmg">0%</b></div>
      <div className="readout"><span>cpu damage</span><b id="cdmg">0%</b></div>
      <div className="readout"><span>cpu state</span><b className="cy" id="cstate">–</b></div>
    </div>
  );
}
