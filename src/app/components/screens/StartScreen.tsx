/** Login / start screen — the first thing you see, before your garden. */
export function StartScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="rip-screen rip-start">
      <div className="rip-start-doodles" aria-hidden="true" />
      <div className="rip-start-inner">
        <svg className="rip-start-mark" width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M10 44 V24 a14 14 0 0 1 28 0 V44 Z" fill="#fff" fillOpacity="0.12" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M24 16 V30 M18 22 H30" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M6 44 H42" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <h1 className="rip-start-title">RIP Designs</h1>
        <p className="rip-start-sub">
          Every killed file deserves a burial. Smash it, bury it, watch it bloom.
        </p>
        <button className="rip-btn prim rip-start-btn" onClick={onEnter}>
          Enter your garden →
        </button>
        <p className="rip-start-foot">The Catharsis Garden · Config Makeathon 2026</p>
      </div>
    </div>
  );
}
