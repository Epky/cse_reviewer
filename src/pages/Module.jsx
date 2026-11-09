import { Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Folder } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { areaMeta } from '../lib/areas.jsx'

export default function Module() {
  const [searchParams] = useSearchParams()
  const { moduleNode, byModule, modules, loading } = useCatalog()
  const path = searchParams.get('m') || ''
  const node = moduleNode(path)
  const resources = byModule(path)

  let accentColor = 'var(--brand)'
  if (resources.length > 0) {
    const areaCounts = new Map()
    for (const r of resources) {
      areaCounts.set(r.area, (areaCounts.get(r.area) || 0) + 1)
    }
    let topArea = ''
    let topCount = 0
    for (const [area, count] of areaCounts) {
      if (count > topCount) {
        topCount = count
        topArea = area
      }
    }
    const info = areaMeta(topArea)
    if (info) accentColor = info.color
  }

  if (loading && !node) {
    return (
      <div className="page-enter">
        <div className="page-head" style={{ opacity: 0.5 }}>
          <div>
            <div className="crumbs" style={{ opacity: 0 }} />
            <h1 className="page-title" style={{ minHeight: '28px' }} />
            <p className="page-sub" style={{ minHeight: '20px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="page-enter">
        <div className="page-head" style={{ opacity: 0.5 }}>
          <div>
            <div className="crumbs" style={{ opacity: 0 }} />
            <h1 className="page-title" style={{ minHeight: '28px' }} />
            <p className="page-sub" style={{ minHeight: '20px' }} />
          </div>
        </div>
        <EmptyState title="Module not found" />
      </div>
    )
  }

  const segments = path ? path.split('/') : []
  const crumbs = segments.map((_, i) => ({
    name: segments[i],
    link: `/module?m=${encodeURIComponent(segments.slice(0, i + 1).join('/'))}`,
  }))

  return (
    <div className="page-enter" style={{ '--accent': accentColor }}>
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={13} />
            <Link to="/modules">Collections</Link>
            {segments.length > 0 && <ChevronRight size={13} />}
                  {crumbs.map((crumb, i) => (
                    <Fragment key={crumb.link}>
                      {i > 0 && segments.length > 0 ? <ChevronRight size={13} /> : null}
                      {i === segments.length - 1 ? (
                        <span>{crumb.name}</span>
                      ) : (
                        <Link to={crumb.link}>{crumb.name}</Link>
                      )}
                    </Fragment>
                  ))}
          </div>
          <h1 className="page-title">{node.name}</h1>
          <p className="page-sub">
            {resources.length} resource{resources.length === 1 ? '' : 's'} ·{' '}
            {node.childModules.length} submodule{node.childModules.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="module-body">
        {node.childModules.length > 0 && (
          <div>
            <div className="section-head">
              <div className="section-title">Submodules</div>
            </div>
            <div className="topic-grid">
              {node.childModules.map((childPath) => {
                const child = modules.modules.find((m) => m.path === childPath)
                if (!child) return null
                return (
                  <Link
                    key={childPath}
                    to={`/module?m=${encodeURIComponent(childPath)}`}
                    className="topic-card"
                  >
                    <Folder size={17} />
                    <div>
                      <div className="topic-name">{child.name}</div>
                      <div className="area-desc" style={{ marginTop: 2, fontSize: 12 }}>
                        {child.fileCount} resource{child.fileCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="section-head">
          <div className="section-title">Resources</div>
        </div>
        {resources.length === 0 && !node.childModules.length ? (
          <EmptyState title="No resources in this module" />
        ) : (
          <div className="resource-grid">
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} showArea />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
