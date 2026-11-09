import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { areaMeta, canonicalArea } from '../lib/areas.jsx'
import { areaPath, topicPath, TYPE_ORDER } from '../lib/utils.js'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'

const typeRank = (type) => {
  const i = TYPE_ORDER.indexOf(type)
  return i === -1 ? 99 : i
}

export default function Topic() {
  const { area: areaParam, topic: topicParam } = useParams()
  const { resources, areas, loading } = useCatalog()

  const canonicalName = canonicalArea(areaParam)
  const area = areas.find((a) => a.name === canonicalName || a.name === areaParam)
  const topic = area?.topics.find((t) => t.name === topicParam)
  const info = areaMeta(canonicalName)
  const Icon = info.icon

  const topicResources = useMemo(
    () => {
      const canonical = canonicalArea(areaParam)
      return resources
        .filter((r) => r.area === canonical && r.topic === topicParam)
        .sort((a, b) => typeRank(a.type) - typeRank(b.type) || a.title.localeCompare(b.title))
    },
    [resources, areaParam, topicParam],
  )

  if (loading && !area) {
    return (
      <div className="page-enter">
        <div className="area-hero" style={{ minHeight: 120, opacity: 0.5 }} />
      </div>
    )
  }

  if (!area || !topic) {
    return (
      <EmptyState title="Topic not found">
        We couldn’t find that topic. <Link to="/library">Back to the library</Link>
      </EmptyState>
    )
  }

  const siblings = area.topics.filter((t) => t.name !== topic.name).slice(0, 12)

  return (
    <div className="page-enter" style={{ '--accent': info.color }}>
      <div className="crumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <Link to={areaPath(area.name)}>{info.short}</Link>
        <ChevronRight size={13} />
        <span>{topic.name}</span>
      </div>

      <div className="area-hero">
        <span className="area-icon">
          <Icon size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h1>{topic.name}</h1>
          <p>
            {area.name} · {topic.count} {topic.count === 1 ? 'resource' : 'resources'}
          </p>
        </div>
        <div className="area-stat">
          <div>
            <div className="v">{topic.count}</div>
            <div className="l">Resources</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <div className="section-title">Resources</div>
          <div className="section-sub">
            Guides first, then practice tests and answer keys
          </div>
        </div>
      </div>

      {topicResources.length === 0 ? (
        <EmptyState title="Nothing here yet">This topic has no converted files.</EmptyState>
      ) : (
        <div className="resource-grid">
          {topicResources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {siblings.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-title">More in {info.short}</div>
            <Link to={areaPath(area.name)} className="section-link">
              View all
            </Link>
          </div>
          <div className="chips">
            {siblings.map((t) => (
              <Link key={t.name} to={topicPath(area.name, t.name)} className="chip">
                {t.name}
                <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{t.count}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
