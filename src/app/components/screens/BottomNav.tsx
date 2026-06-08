/** Persistent bottom navigation for the garden / add / settings screens. */
export type NavTab = 'garden' | 'add' | 'settings';

const LeafIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21 V12" />
    <path d="M12 13 C7 13 5 9 5 5 C10 5 12 8 12 12 Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 11 C12 7 14 4 19 4 C19 8 17 11 12 11 Z" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8 V16 M8 12 H16" />
  </svg>
);

const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5 V5 M12 19 V21.5 M21.5 12 H19 M5 12 H2.5 M18.7 5.3 L17 7 M7 17 L5.3 18.7 M18.7 18.7 L17 17 M7 7 L5.3 5.3" />
  </svg>
);

export function BottomNav({ active, onNavigate }: { active: NavTab; onNavigate: (t: NavTab) => void }) {
  const tabs: { id: NavTab; icon: JSX.Element; label: string }[] = [
    { id: 'garden', icon: <LeafIcon />, label: 'Garden' },
    { id: 'add', icon: <PlusIcon />, label: 'Plant a memory' },
    { id: 'settings', icon: <GearIcon />, label: 'Settings' },
  ];
  return (
    <nav className="rip-bottomnav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`rip-navbtn ${active === t.id ? 'on' : ''}`}
          onClick={() => onNavigate(t.id)}
          aria-label={t.label}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
    </nav>
  );
}
