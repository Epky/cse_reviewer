import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronRight, Clock, PlayCircle, Sparkles } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { useLibrary } from '../lib/library.jsx'
import { areaMeta } from '../lib/areas.jsx'
import { areaPath, topicPath } from '../lib/utils.js'
import ResourceCard from '../components/ResourceCard.jsx'

export default function Home() {
  const { resources, areas, meta, allTopics, byId, loading } = useCatalog()
  const { lastReadId, progress } = useLibrary()

  const last = lastReadId ? byId.get(lastReadId) : null
  const sizes = meta?.sizes
  const practiceCount = resources.filter((r) => r.type === 'test' || r.type === 'mock').length
  const doneCount = Object.values(progress).filter((p) => p.status === 'done').length

  const starters = resources
    .filter((r) => r.type === 'learn' || r.type === 'reviewer')
    .slice(0, 6)

  const practice = resources
    .filter((r) => r.type === 'test' || r.type === 'mock')
    .slice(0, 6)

  const topTopics = allTopics.slice(0, 10)

  return (
    <div className="page-enter">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <Sparkles size={13} /> Civil Service Exam · 2026
          </div>
          <h1>One calm place for all your reviewers.</h1>
          <p>
            {sizes?.catalogued ?? '—'} curated reviewers, practice tests, and answer keys —
            deduplicated, organized by subject, and readable on any device. No downloads, no
            clutter, just focused review.
          </p>
          <div className="hero-actions">
            <Link to="/library" className="btn">
              <BookOpen size={16} /> Browse the library
            </Link>
            {last ? (
              <Link to={`/read/${encodeURIComponent(last.id)}`} className="btn btn-ghost">
                <PlayCircle size={16} /> Continue: {last.title.slice(0, 30)}
                {last.title.length > 30 ? '…' : ''}
              </Link>
            ) : (
              <Link to="/bookmarks" className="btn btn-ghost">
                <Clock size={16} /> Your bookmarks
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{sizes?.catalogued ?? '—'}</div>
          <div className="stat-label">Study resources</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{areas.length || '—'}</div>
          <div className="stat-label">Subject areas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{practiceCount || '—'}</div>
          <div className="stat-label">Practice tests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{doneCount}</div>
          <div className="stat-label">Marked as done</div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <div className="section-title">Browse by subject</div>
          <div className="section-sub">Five areas covered in the civil service exam</div>
        </div>
      </div>

      <div className="area-grid">
        {loading && !areas.length &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="area-card" style={{ minHeight: 150, opacity: 0.5 }} />
          ))}
        {areas.map((area) => {
          const info = areaMeta(area.name)
          const Icon = info.icon
          return (
            <Link
              key={area.name}
              to={areaPath(area.name)}
              className="area-card"
              style={{ '--accent': info.color }}
            >
              <span className="area-icon">
                <Icon size={21} />
              </span>
              <span className="area-name">{area.name}</span>
              <span className="area-desc">{info.description}</span>
              <span className="area-foot">
                <span>{area.count} resources · {area.topics.length} topics</span>
                <span className="go">
                  Open <ChevronRight size={13} />
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      {topTopics.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-title">Popular topics</div>
            <Link to="/library" className="section-link">
              All resources <ArrowRight size={13} />
            </Link>
          </div>
          <div className="chips">
            {topTopics.map((t) => (
              <Link key={`${t.area}-${t.topic}`} to={topicPath(t.area, t.topic)} className="chip">
                {t.topic}
                <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{t.count}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {starters.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <div className="section-title">Start with the basics</div>
              <div className="section-sub">Guides and reviewers to build your foundation</div>
            </div>
          </div>
          <div className="resource-grid">
            {starters.map((r) => (
              <ResourceCard key={r.id} resource={r} showArea />
            ))}
          </div>
        </>
      )}

      {practice.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <div className="section-title">Test yourself</div>
              <div className="section-sub">Practice sets and mock exams with answer keys</div>
            </div>
          </div>
          <div className="resource-grid">
            {practice.map((r) => (
              <ResourceCard key={r.id} resource={r} showArea />
            ))}
          </div>
        </>
      )}

      <div className="section-head">
        <div className="section-sub">
          {sizes?.uniqueMB} MB of deduplicated material · {sizes?.duplicateCopies ?? 0} duplicate
          copies merged · {sizes?.pendingConversion ?? 0} files queued for conversion
        </div>
      </div>
    </div>
  )
}
