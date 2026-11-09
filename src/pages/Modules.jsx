import { Link } from 'react-router-dom'
import { Folder, BookOpen, ChevronRight } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Modules() {
  const { collectionNodes, modules, loading } = useCatalog()
  const allModules = modules.modules || []

  if (loading && !collectionNodes.length) {
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

  return (
    <div className="page-enter">
      <div className="crumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <span>Collections</span>
      </div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-sub">
            Browse the source compilations exactly as organized in the reviewer folder.
          </p>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">Source compilations</div>
      </div>
      <div className="topic-grid">
        {collectionNodes.length > 0 ? (
          collectionNodes.map((collection) => (
            <Link
              key={collection.path}
              to={`/module?m=${encodeURIComponent(collection.path)}`}
              className="topic-card"
            >
              <BookOpen size={17} />
              <div>
                <div className="topic-name">{collection.name}</div>
                <div className="area-desc" style={{ marginTop: 2, fontSize: 12 }}>
                  {collection.fileCount} direct resource{collection.fileCount === 1 ? '' : 's'} ·
                  {collection.childModules.length} submodule{collection.childModules.length === 1 ? '' : 's'}
                </div>
              </div>
              <ChevronRight size={13} />
            </Link>
          ))
        ) : (
          <EmptyState title="No collections found" />
        )}
      </div>

      {allModules.filter((m) => m.parentPath).length > 0 && (
        <>
          <div className="section-head">
            <div className="section-title">All modules</div>
          </div>
          <div className="topic-grid">
            {allModules
              .filter((m) => m.parentPath)
              .map((module) => (
                <Link
                  key={module.path}
                  to={`/module?m=${encodeURIComponent(module.path)}`}
                  className="topic-card"
                >
                  <Folder size={17} />
                  <div>
                    <div className="topic-name">{module.name}</div>
                    <div className="area-desc" style={{ marginTop: 2, fontSize: 12 }}>
                      {module.fileCount} direct resource{module.fileCount === 1 ? '' : 's'} ·
                      {module.childModules.length} submodule{module.childModules.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
