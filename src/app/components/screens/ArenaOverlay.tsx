/**
 * Thin overlay shown while the Smash Arena (canvas engine) is live: an objective
 * banner + forfeit affordance, and the defeat state if the client wins.
 */
export function ArenaOverlay({
  designName,
  lost,
  onRetry,
  onGiveUp,
  onForfeit,
}: {
  designName: string;
  lost: boolean;
  onRetry: () => void;
  onGiveUp: () => void;
  onForfeit: () => void;
}) {
  return (
    <div className="rip-arena-overlay">
      <div className="rip-arena-banner">
        <span className="rip-arena-dot" />
        Defend <b>{designName}</b> — KO the Heartless Client before it smashes your design.
        <button className="rip-arena-forfeit" onClick={onForfeit} title="Give up this design">✕</button>
      </div>

      {lost && (
        <div className="rip-arena-lost">
          <div className="rip-arena-lostbox">
            <div className="rip-arena-losttitle">The client smashed your design.</div>
            <p>It got knocked out of the canvas. Want another go?</p>
            <div className="rip-arena-lostbtns">
              <button className="rip-btn ghost" onClick={onGiveUp}>Let it die</button>
              <button className="rip-btn prim" onClick={onRetry}>Rematch ⚔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
