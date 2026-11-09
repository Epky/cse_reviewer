import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { useLibrary } from '../lib/library.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Bookmarks() {
  const { byId, loading } = useCatalog()
  const { bookmarks } = useLibrary()
  const items = bookmarks.map((id) => byId.get(id)).filter(Boolean)

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bookmarks</h1>
          <p className="page-sub">
            Resources you saved for later. Bookmarks live in this browser and can be exported
            from the progress page.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="resource-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="resource-card" style={{ height: 100, opacity: 0.4 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No bookmarks yet" icon={Bookmark}>
          Tap the bookmark icon on any resource to save it here. <Link to="/library">Browse the
          library</Link>
        </EmptyState>
      ) : (
        <div className="resource-grid">
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} showArea />
          ))}
        </div>
      )}
    </div>
  )
}
