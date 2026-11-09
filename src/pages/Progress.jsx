import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, CheckCircle2, CircleDot, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { useLibrary } from '../lib/library.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Progress() {
  const { byId } = useCatalog()
  const {
    progress,
    bookmarks,
    exportData,
    importData,
    resetProgress,
    clearAll,
  } = useLibrary()
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const entries = useMemo(
    () =>
      Object.entries(progress)
        .map(([id, entry]) => ({ id, entry, resource: byId.get(id) }))
        .filter((e) => e.resource)
        .sort((a, b) => (b.entry.lastOpenedAt || 0) - (a.entry.lastOpenedAt || 0)),
    [progress, byId],
  )

  const reading = entries.filter((e) => e.entry.status === 'reading')
  const done = entries.filter((e) => e.entry.status === 'done')

  function onImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importData(String(reader.result))
        setToast('Progress imported successfully')
      } catch {
        setToast('That file is not valid progress JSON')
      }
      e.target.value = ''
    }
    reader.onerror = () => {
      setToast('Could not read that file')
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  function onReset() {
    if (window.confirm('Reset reading progress? Bookmarks will be kept.')) {
      resetProgress()
      setToast('Reading progress reset')
    }
  }

  function onClearAll() {
    if (window.confirm('Delete all progress and bookmarks from this browser?')) {
      clearAll()
      setToast('All local data cleared')
    }
  }

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">My progress</h1>
          <p className="page-sub">
            Everything here is stored only in this browser. Export a JSON backup before clearing
            your browser data or switching devices.
          </p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-value">{entries.length}</div>
          <div className="stat-label">Resources opened</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{reading.length}</div>
          <div className="stat-label">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{done.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bookmarks.length}</div>
          <div className="stat-label">Bookmarks</div>
        </div>
      </div>

      <div className="filters">
        <button type="button" className="btn" onClick={exportData}>
          <Download size={15} /> Export backup
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImport}
          style={{ display: 'none' }}
        />
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={onReset} disabled={!entries.length}>
          <RotateCcw size={13} /> Reset progress
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onClearAll}
          disabled={!entries.length && !bookmarks.length}
        >
          <Trash2 size={13} /> Clear all
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Nothing tracked yet" icon={CheckCircle2}>
          Open any resource and it will appear here so you can pick up where you left off.
        </EmptyState>
      ) : (
        <>
          {reading.length > 0 && (
            <>
              <div className="group-label">
                <CircleDot size={13} /> Continue reading <span className="line" />
                <span className="n">{reading.length}</span>
              </div>
              <div className="resource-grid">
                {reading.map(({ id, resource }) => (
                  <ResourceCard key={id} resource={resource} showArea />
                ))}
              </div>
            </>
          )}

          {done.length > 0 && (
            <>
              <div className="group-label">
                <CheckCircle2 size={13} /> Completed <span className="line" />
                <span className="n">{done.length}</span>
              </div>
              <div className="resource-grid">
                {done.map(({ id, resource }) => (
                  <ResourceCard key={id} resource={resource} showArea />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {bookmarks.length > 0 && (
        <div className="section-head">
          <div className="section-sub">
            <Bookmark size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            You have {bookmarks.length} bookmarked resources.
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
