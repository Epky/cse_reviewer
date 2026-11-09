import { Link } from 'react-router-dom'
import { BookOpen, ShieldCheck } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'

const shortcuts = [
  ['/', 'Focus the search box'],
  ['â† / â†’', 'Previous / next page in the reader'],
  ['+ / âˆ’', 'Zoom in / out'],
  ['0', 'Reset zoom to fit width'],
  ['Esc', 'Close search or leave the reader'],
]

export default function About() {
  const { meta } = useCatalog()
  const sizes = meta?.sizes

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">How this library works</h1>
          <p className="page-sub">
            A single, organized space for civil service exam review materials â€” built to be calm,
            fast, and readable on any screen.
          </p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 8 }}>
        <div className="stat-card">
          <div className="stat-value">{sizes?.catalogued ?? 'â€”'}</div>
          <div className="stat-label">Converted resources</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sizes?.uniqueMB ?? 'â€”'} MB</div>
          <div className="stat-label">Deduplicated size</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sizes?.duplicateCopies ?? 'â€”'}</div>
          <div className="stat-label">Duplicate copies merged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sizes?.pendingConversion ?? 'â€”'}</div>
          <div className="stat-label">Queued for conversion</div>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">Whatâ€™s inside</div>
      </div>
      <div className="area-grid">
        <div className="topic-card" style={{ alignItems: 'flex-start', padding: 18 }}>
          <BookOpen size={18} style={{ color: 'var(--brand)', flex: 'none', marginTop: 2 }} />
          <div>
            <div className="topic-name">Organized by subject</div>
            <div className="area-desc" style={{ marginTop: 4 }}>
              English, Math, Logic & Reasoning, Clerical, and General Knowledge (GK) — each broken into
              topics, with guides ordered before practice tests and answer keys.
            </div>
          </div>
        </div>
        <div className="topic-card" style={{ alignItems: 'flex-start', padding: 18 }}>
          <ShieldCheck size={18} style={{ color: '#059669', flex: 'none', marginTop: 2 }} />
          <div>
            <div className="topic-name">Protected reader</div>
            <div className="area-desc" style={{ marginTop: 4 }}>
              Pages are rendered as images with a text layer for accessibility. Hidden file links,
              disabled download and print, and a subtle watermark discourage copying.
            </div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">How to use it</div>
      </div>
      <div className="topic-card" style={{ display: 'block', padding: 20 }}>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 13 }}>
          <li>Start from a subject on the home page.</li>
          <li>Open a topic to see its reviewers, tests, and answer keys.</li>
          <li>Tap <strong>Open</strong> to read in the full-screen reader â€” it remembers your page.</li>
          <li>Bookmark resources you want to revisit; mark them done when finished.</li>
          <li>
            Export a backup from <Link to="/progress" style={{ color: 'var(--brand)' }}>My progress</Link>{' '}
            before clearing browser data.
          </li>
        </ol>
      </div>

      <div className="section-head">
        <div className="section-title">Keyboard shortcuts</div>
      </div>
      <div className="topic-grid">
        {shortcuts.map(([key, desc]) => (
          <div key={key} className="topic-card" style={{ gap: 12 }}>
            <kbd
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11.5,
                fontWeight: 700,
                background: 'var(--chip)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                padding: '2px 8px',
                flex: 'none',
              }}
            >
              {key}
            </kbd>
            <span className="area-desc">{desc}</span>
          </div>
        ))}
      </div>

      <div className="section-head">
        <div className="section-title">Privacy & attribution</div>
      </div>
      <div className="topic-card" style={{ display: 'block', padding: 20, lineHeight: 1.8, fontSize: 13 }}>
        <p style={{ marginBottom: 10 }}>
          <strong>Unofficial and independent.</strong> Reviewer Vault is not affiliated with,
          endorsed by, or sponsored by the Civil Service Commission (CSC) or any review center.
        </p>
        <p style={{ marginBottom: 10 }}>
          No account, no email, no analytics. Reading progress and bookmarks are kept in your
          browserâ€™s local storage and never sent to a server.
        </p>
        <p style={{ marginBottom: 10 }}>
          All reviewers, tests, and answer keys remain the property of their respective authors
          and publishers. They are provided here for personal review only. If you own the rights
          to any material and want it removed, contact the site owner and it will be removed
          promptly.
        </p>
        <p style={{ marginBottom: 10 }}>
          The catalog runs in safe-only mode: files tagged commercial or unknown-license are
          excluded. This is a risk-reduction heuristic based on file metadata, not legal
          clearance. For official guidance, use CSC announcements and properly licensed materials.
        </p>
        <p>
          Some documents (about {sizes?.pendingConversion ?? 0} files) are still being converted
          from Word, PowerPoint, or DJVU and will appear automatically once processed.
        </p>
      </div>
    </div>
  )
}

