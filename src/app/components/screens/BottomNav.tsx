/** Persistent bottom navigation for the garden + add-design screens. */
export type NavTab = 'garden' | 'add';

export function BottomNav({ active, onNavigate }: { active: NavTab; onNavigate: (t: NavTab) => void }) {
  return (
    <nav className="rip-bottomnav">
      <button
        className={`rip-navbtn ${active === 'garden' ? 'on' : ''}`}
        onClick={() => onNavigate('garden')}
        aria-label="Garden"
        title="Garden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21 V12" />
          <path d="M12 13 C7 13 5 9 5 5 C10 5 12 8 12 12 Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 11 C12 7 14 4 19 4 C19 8 17 11 12 11 Z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      </button>
      <button
        className={`rip-navbtn ${active === 'add' ? 'on' : ''}`}
        onClick={() => onNavigate('add')}
        aria-label="Plant a memory"
        title="Plant a memory"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8 V16 M8 12 H16" />
        </svg>
      </button>
    </nav>
  );
}
