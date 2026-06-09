const CATEGORIES = [
  { id: 'foundation', icon: '◈', label: 'Foundation', count: 12 },
  { id: 'components', icon: '◇', label: 'Components', count: 48 },
  { id: 'patterns', icon: '◆', label: 'Patterns', count: 19 },
  { id: 'tokens', icon: '◉', label: 'Tokens', count: 234 },
  { id: 'icons', icon: '◎', label: 'Icons', count: 186 },
  { id: 'motion', icon: '▶', label: 'Motion', count: 24 },
];

const COMPONENTS = [
  { id: 1,  name: 'Button',   team: 'Core UI',    status: 'STABLE', ver: 'v4.2',      color: '#b48eff', shape: 'btn'     },
  { id: 2,  name: 'Input',    team: 'Core UI',    status: 'STABLE', ver: 'v3.1',      color: '#34e0d8', shape: 'input'   },
  { id: 3,  name: 'Card',     team: 'Layout',     status: 'STABLE', ver: 'v2.8',      color: '#f5c842', shape: 'card'    },
  { id: 4,  name: 'Modal',    team: 'Overlays',   status: 'STABLE', ver: 'v5.0',      color: '#ff6b9d', shape: 'modal'   },
  { id: 5,  name: 'Alert',    team: 'Feedback',   status: 'STABLE', ver: 'v2.3',      color: '#ff9f43', shape: 'alert'   },
  { id: 6,  name: 'Badge',    team: 'Core UI',    status: 'NEW',    ver: 'v1.0',      color: '#0acf83', shape: 'badge'   },
  { id: 7,  name: 'Tabs',     team: 'Navigation', status: 'STABLE', ver: 'v3.4',      color: '#1abcfe', shape: 'tabs'    },
  { id: 8,  name: 'Avatar',   team: 'Core UI',    status: 'STABLE', ver: 'v2.1',      color: '#a259ff', shape: 'avatar'  },
  { id: 9,  name: 'Tooltip',  team: 'Core UI',    status: 'BETA',   ver: 'v1.4',      color: '#f5c842', shape: 'tooltip' },
  { id: 10, name: 'Select',   team: 'Forms',      status: 'STABLE', ver: 'v4.0',      color: '#34e0d8', shape: 'select'  },
  { id: 11, name: 'Progress', team: 'Feedback',   status: 'STABLE', ver: 'v2.0',      color: '#0acf83', shape: 'progress'},
  { id: 12, name: 'Sidebar',  team: 'Navigation', status: 'BETA',   ver: 'v2.0-beta', color: '#b48eff', shape: 'sidebar' },
];

const DETAIL_MAP: Record<string, string> = {
  Button:   'Primary, secondary, ghost + icon variants. Full size matrix (xs → xl) with loading and disabled states.',
  Input:    'Text, number, password, search. Validation states, prefix/suffix slots, character count.',
  Card:     'Container with header / body / footer slots. Four elevation levels. Interactive variant.',
  Modal:    'Centered dialog with focus trap, animated entry, and sm / md / lg / full-screen sizes.',
  Alert:    'Inline status messaging: info, warning, error, success. Dismissible + icon variants.',
  Badge:    'Status chips, count pills, and presence dots. Auto-truncates at 99+.',
  Tabs:     'Horizontal & vertical layouts. Underline and filled variants with animated indicator.',
  Avatar:   'Image, initials, icon fallbacks. xs → xl size scale with optional presence ring.',
  Tooltip:  '12-point directional placement. Delay-on, delay-off, and no-delay modes.',
  Select:   'Dropdown, combobox, and multi-select with virtual scroll for large datasets.',
  Progress: 'Linear bar and circular ring. Determinate, indeterminate, and step modes.',
  Sidebar:  'Responsive side nav. Collapse → rail → hidden breakpoints. Nested item depth 3.',
};

const VISITORS = [
  { name: 'maya_c',   color: '#ff4d97', active: true,  loc: 'Button' },
  { name: 'devops_j', color: '#34e0d8', active: false, loc: 'entrance' },
  { name: 'rx_ux',    color: '#f5c842', active: true,  loc: 'Tabs' },
  { name: 'p.lim',    color: '#b48eff', active: true,  loc: 'Avatar' },
];

function ComponentPreview({ shape, color }: { shape: string; color: string }) {
  const s: React.CSSProperties = { '--pc': color } as React.CSSProperties;
  return <div className={`dr-preview dr-pv-${shape}`} style={s} aria-hidden />;
}

export function DesignSystemRoom() {
  return (
    <div className="cs" id="designroom">
      <div className="drbox">

        {/* ── OS header bar ── */}
        <div className="dr-header">
          <span className="dr-logo">⬡ CLUB FIGMA OS v0.67</span>
          <span className="dr-room-title">▶ DESIGN SYSTEM ROOM</span>
          <span className="dr-clock" id="drclock">TUE 11:04</span>
          <button className="dr-exit" id="drexit">EXIT ROOM ⏻</button>
        </div>

        {/* ── Tab bar ── */}
        <div className="dr-tabs">
          <button className="dr-tab dr-tab-active">FOUNDATION</button>
          <button className="dr-tab">COMPONENTS</button>
          <button className="dr-tab">PATTERNS</button>
          <button className="dr-tab">TOKENS</button>
          <div className="dr-tab-spacer" />
          <span className="dr-live-badge">● LIVE</span>
          <span className="dr-live-count" id="drlivecount">4 designers here</span>
        </div>

        {/* ── Three-column body ── */}
        <div className="dr-body">

          {/* Left sidebar */}
          <aside className="dr-sidebar">
            <div className="dr-sidebar-label">CATEGORIES</div>
            <ul className="dr-catlist">
              {CATEGORIES.map((c, i) => (
                <li key={c.id} className={`dr-catitem${i === 1 ? ' dr-catitem-active' : ''}`}>
                  <span className="dr-caticon">{c.icon}</span>
                  <span className="dr-catname">{c.label}</span>
                  <span className="dr-catcount">{c.count}</span>
                </li>
              ))}
            </ul>

            <div className="dr-sidebar-label" style={{ marginTop: 20 }}>IN THIS ROOM</div>
            <ul className="dr-visitorlist">
              {VISITORS.map(v => (
                <li key={v.name} className="dr-visitor">
                  <span className="dr-visitor-dot" style={{ background: v.color }} />
                  <span className="dr-visitor-name">{v.name}</span>
                  <span className="dr-visitor-loc">{v.loc}</span>
                </li>
              ))}
            </ul>

            <div className="dr-sidebar-label" style={{ marginTop: 20 }}>LAST UPDATED</div>
            <div className="dr-last-sync">
              <span className="dr-sync-icon">↺</span>
              <span>2m ago via Figma MCP</span>
            </div>
          </aside>

          {/* Gallery wall */}
          <main className="dr-gallery">
            <div className="dr-wall-header">
              <span className="dr-wall-label">◆ COMPONENT LIBRARY</span>
              <span className="dr-wall-meta">48 published · 3 in review</span>
            </div>
            <div className="dr-grid" id="drgrid">
              {COMPONENTS.map(c => (
                <button
                  key={c.id}
                  className="dr-card"
                  data-component={c.name}
                  style={{ '--cc': c.color } as React.CSSProperties}
                  tabIndex={0}
                >
                  <div className="dr-card-preview">
                    <ComponentPreview shape={c.shape} color={c.color} />
                    <span className={`dr-status dr-status-${c.status.toLowerCase()}`}>{c.status}</span>
                  </div>
                  <div className="dr-card-name">{c.name}</div>
                  <div className="dr-card-meta">
                    <span className="dr-card-team">{c.team}</span>
                    <span className="dr-card-ver">{c.ver}</span>
                  </div>
                </button>
              ))}
            </div>
          </main>

          {/* Detail panel */}
          <aside className="dr-detail" id="drdetail">
            <div className="dr-detail-header">COMPONENT DETAIL</div>

            <div className="dr-detail-empty" id="drdetail-empty">
              <span className="dr-detail-empty-icon">◇</span>
              <span>Select a component<br />to inspect</span>
              <span className="dr-detail-hint">SPACE to expand on wall</span>
            </div>

            <div className="dr-detail-content" id="drdetail-content" style={{ display: 'none' }}>
              <div className="dr-detail-preview-large" id="drdetail-preview" />
              <div className="dr-detail-name" id="drdetail-name">Button</div>
              <div className="dr-detail-row">
                <span className="dr-detail-label">TEAM</span>
                <span className="dr-detail-val" id="drdetail-team">Core UI</span>
              </div>
              <div className="dr-detail-row">
                <span className="dr-detail-label">VERSION</span>
                <span className="dr-detail-val" id="drdetail-ver">v4.2</span>
              </div>
              <div className="dr-detail-row">
                <span className="dr-detail-label">STATUS</span>
                <span className="dr-detail-val" id="drdetail-status">STABLE</span>
              </div>
              <div className="dr-detail-desc" id="drdetail-desc" />
              <div className="dr-detail-actions">
                <button className="dr-open-btn">↗ OPEN IN FIGMA</button>
                <button className="dr-fight-btn" id="drchallengebtn">⚔ CHALLENGE</button>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Presence bar ── */}
        <div className="dr-presence">
          <span className="dr-presence-label">LIVE CURSORS</span>
          <div className="dr-cursors">
            {VISITORS.map(v => (
              <div key={v.name} className={`dr-cursor${v.active ? '' : ' dr-cursor-idle'}`} title={v.name}>
                <svg width="12" height="16" viewBox="0 0 12 16" style={{ fill: v.color }}>
                  <path d="M0 0 L0 13 L3.5 10 L6 15 L7.5 14.3 L5 9.2 L9 9.2Z" />
                </svg>
                <span className="dr-cursor-label" style={{ color: v.color }}>{v.name}</span>
              </div>
            ))}
          </div>
          <div className="dr-presence-hint">
            <kbd>SPACE</kbd> expand · <kbd>ENTER</kbd> open in Figma · <kbd>TAB</kbd> next component
          </div>
        </div>

      </div>
    </div>
  );
}
