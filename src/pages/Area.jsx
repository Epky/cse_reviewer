import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { areaMeta, canonicalArea } from '../lib/areas.jsx'
import { cx, topicPath, TYPE_META, TYPE_ORDER } from '../lib/utils.js'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'

const typeRank = (type) => {
  const i = TYPE_ORDER.indexOf(type)
  return i === -1 ? 99 : i
}

export default function Area() {
  const { area: areaParam } = useParams()
  const { resources, areas, loading } = useCatalog()
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')

  const canonicalName = canonicalArea(areaParam)
  const area = areas.find((a) => a.name === canonicalName || a.name === areaParam)
  const info = areaMeta(canonicalName)
  const Icon = info.icon

  const areaResources = useMemo(
    () => {
      const canonical = canonicalArea(areaParam)
      return resources
        .filter((r) => r.area === canonical)
        .sort((a, b) => typeRank(a.type) - typeRank(b.type) || a.title.localeCompare(b.title))
    },
    [resources, areaParam],
  )

  const typeCounts = useMemo(() => {
    const map = new Map()
    for (const r of areaResources) map.set(r.type, (map.get(r.type) || 0) + 1)
    return map
  }, [areaResources])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return areaResources.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.includes(q))
      )
    })
  }, [areaResources, type, query])

  if (loading && !area) {
    return (
      <div className="page-enter">
        <div className="area-hero" style={{ minHeight: 130, opacity: 0.5 }} />
      </div>
    )
  }

  if (!area) {
    return (
      <EmptyState title="Area not found">
        That subject doesn’t exist in the catalog. <Link to="/library">Back to the library</Link>
      </EmptyState>
    )
  }

  return (
    <div className="page-enter" style={{ '--accent': info.color }}>
      <div className="crumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <span>{area.name}</span>
      </div>

      <div className="area-hero">
        <span className="area-icon">
          <Icon size={26} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h1>{area.name}</h1>
          <p>{info.description}</p>
        </div>
        <div className="area-stat">
          <div>
            <div className="v">{area.count}</div>
            <div className="l">Resources</div>
          </div>
          <div>
            <div className="v">{area.topics.length}</div>
            <div className="l">Topics</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">Topics</div>
        <div className="section-sub">Jump to a specific subtopic</div>
      </div>

      <div className="topic-grid">
        {area.topics.map((topic) => (
          <Link
            key={topic.name}
            to={topicPath(area.name, topic.name)}
            className="topic-card"
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: info.color,
                flex: 'none',
              }}
            />
            <span className="topic-name">{topic.name}</span>
            <span className="count">{topic.count}</span>
          </Link>
        ))}
      </div>

      <div className="section-head">
        <div>
          <div className="section-title">All resources</div>
          <div className="section-sub">
            {filtered.length} of {areaResources.length} shown
          </div>
        </div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            className="field"
            style={{ width: '100%', paddingLeft: 33 }}
            placeholder={`Search in ${info.short}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={cx('chip', type === 'all' && 'active')}
          onClick={() => setType('all')}
        >
          All <span style={{ opacity: 0.7 }}>{areaResources.length}</span>
        </button>
        {TYPE_ORDER.filter((t) => typeCounts.get(t)).map((t) => (
          <button
            key={t}
            type="button"
            className={cx('chip', type === t && 'active')}
            onClick={() => setType(t)}
          >
            {TYPE_META[t].label} <span style={{ opacity: 0.7 }}>{typeCounts.get(t)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matching resources">
          Try a different keyword or clear the filters.
        </EmptyState>
      ) : (
        <div className="resource-grid">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  )
}
