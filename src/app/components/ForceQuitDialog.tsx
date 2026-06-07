/** macOS-style fake force-quit triggered by throwing the gold Figma logo. Never bind to ⌘Q/⌘W/⌘T. */
export function ForceQuitDialog() {
  return (
    <div className="fq" id="fq">
      <div className="fqbox">
        <div className="fqtitle">Force Quit Applications</div>
        <div className="fqbody">
          "<span id="fqapp">opponent</span>" is not responding.<br />
          <span className="sub">You may force the application to quit.</span>
        </div>
        <div className="fqlist">
          <span className="dot" /><span id="fqapp2">opponent</span><em>not responding</em>
        </div>
        <div className="fqbtns">
          <button>Cancel</button>
          <button className="quit">Force Quit</button>
        </div>
      </div>
    </div>
  );
}
