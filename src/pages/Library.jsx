import { useMemo, useState } from 'react'
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { cx, typeLabel, TYPE_ORDER } from '../lib/utils.js'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'

const typeRank = (type) => {
  const i = TYPE_ORDER.indexOf(type)
  return i === -1 ? 99 : i
}

export default function Library() {
  const { resources, areas, types, loading } = useCatalog()
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const [type, setType] = useState('all')
  const [level, setLevel] = useState('all')
  const [sort, setSort] = useState('type')
  const [view, setView] = useState('grid')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = resources.filter((r) => {
      if (area !== 'all' && r.area !== area) return false
      if (type !== 'all' && r.type !== type) return false
      if (level !== 'all' && r.level !== level) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        (r.source || '').toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.includes(q))
      )
    })

    const sorted = [...list]
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'largest') sorted.sort((a, b) => b.sizeBytes - a.sizeBytes)
    else if (sort === 'smallest') sorted.sort((a, b) => a.sizeBytes - b.sizeBytes)
    else
      sorted.sort(
        (a, b) => typeRank(a.type) - typeRank(b.type) || a.title.localeCompare(b.title),
      )
    return sorted
  }, [resources, query, area, type, level, sort])

  const activeFilters =
    (area !== 'all') + (type !== 'all') + (level !== 'all') + (query.trim() ? 1 : 0)

  function clearFilters() {
    setQuery('')
    setArea('all')
    setType('all')
    setLevel('all')
  }

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">The full library</h1>
          <p className="page-sub">
            Every converted reviewer, reference, and practice test in one place. Use filters
            to narrow down by subject, resource type, or difficulty.
          </p>
        </div>
        <div className="spacer" />
        <div className="row">
          <button
            type="button"
            className={cx('btn btn-icon', view === 'grid' && 'btn-soft')}
            onClick={() => setView('grid')}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={cx('btn btn-icon', view === 'list' && 'btn-soft')}
            onClick={() => setView('list')}
            aria-label="List view"
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
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
            placeholder="Search titles, topics, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="field"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          aria-label="Filter by area"
        >
          <option value="all">All areas</option>
          {areas.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} ({a.count})
            </option>
          ))}
        </select>

        <select
          className="field"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t.name} value={t.name}>
              {typeLabel(t.name)} ({t.count})
            </option>
          ))}
        </select>

        <select
          className="field"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          aria-label="Filter by level"
        >
          <option value="all">Any level</option>
          <option value="foundation">Foundation</option>
          <option value="standard">Standard</option>
          <option value="challenge">Challenge</option>
        </select>

        <select
          className="field"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort by"
        >
          <option value="type">Sort: Recommended</option>
          <option value="title">Sort: Title A–Z</option>
          <option value="largest">Sort: Largest first</option>
          <option value="smallest">Sort: Smallest first</option>
        </select>

        {activeFilters > 0 && (
          <button type="button" className="btn btn-sm" onClick={clearFilters}>
            <X size={13} /> Clear {activeFilters}
          </button>
        )}
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <SlidersHorizontal size={14} style={{ color: 'var(--muted)' }} />
        <span className="muted" style={{ fontSize: 12.5 }}>
          {loading ? 'Loading catalog…' : `${filtered.length} of ${resources.length} resources`}
        </span>
        {(area !== 'all' || type !== 'all' || level !== 'all') && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            · {area !== 'all' ? area : 'All areas'}
            {type !== 'all' ? ` · ${typeLabel(type)}` : ''}
            {level !== 'all' ? ` · ${level}` : ''}
          </span>
        )}
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No resources match those filters">
          Try clearing a filter or searching for a different keyword.
        </EmptyState>
      ) : (
        <div className={cx('resource-grid', view === 'list' && 'list')}>
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} showArea />
          ))}
        </div>
      )}
    </div>
  )
}
