/** Decorative Figma-editor chrome: left sidebar, top/left rulers, help button. */
export function FigmaChrome() {
  return (
    <>
      <div className="fig-side">
        <div className="top">
          <svg width="15" height="22" viewBox="0 0 38 57" aria-hidden="true">
            <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
            <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
            <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
            <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
            <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="1.6">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </div>
        <div className="file">
          <b>
            RIP Designs{' '}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2.4">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </b>
          <span>Drafts</span>
        </div>
        <div className="tabs">
          <span className="t on">File</span>
          <span className="t">Assets</span>
          <span className="sp">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-3.5-3.5" />
            </svg>
          </span>
        </div>
        <div className="sec">Pages <span className="pl">+</span></div>
        <div className="page">Page 1</div>
        <div className="sec" style={{ marginTop: 6 }}>Layers</div>
      </div>
      <div className="fig-rul-top" />
      <div className="fig-rul-left" />
      <div className="fig-help">?</div>
    </>
  );
}
