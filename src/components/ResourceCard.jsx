import { Link, useLocation } from 'react-router-dom'
import { Bookmark, CheckCircle2, CircleDot, FileText, ImageIcon } from 'lucide-react'
import { areaMeta } from '../lib/areas.jsx'
import { useLibrary } from '../lib/library.jsx'
import { cx, TYPE_META, LEVEL_META, typeLabel } from '../lib/utils.js'

export default function ResourceCard({ resource, showArea = false }) {
  const { bookmarkSet, toggleBookmark, progress } = useLibrary()
  const location = useLocation()
  const bookmarked = bookmarkSet.has(resource.id)
  const entry = progress[resource.id]
  const type = TYPE_META[resource.type] || { tone: 'slate' }
  const level = LEVEL_META[resource.level]
  const area = areaMeta(resource.area)
  const readUrl = `/read/${encodeURIComponent(resource.id)}`

  return (
    <article className="resource-card">
      <div
        className="resource-file-icon"
        style={{
          color: area.color,
          background: `color-mix(in srgb, ${area.color} 14%, transparent)`,
        }}
        aria-hidden="true"
      >
        {resource.format === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
      </div>

      <div className="resource-body">
        <Link
          to={readUrl}
          className="resource-title"
          title={resource.title}
          state={{ from: location.pathname + location.search }}
        >
          {resource.title}
        </Link>

        <div className="resource-meta">
          <span className={cx('badge', `tone-${type.tone}`)}>{typeLabel(resource.type)}</span>
          {level && <span className={cx('badge', `tone-${level.tone}`)}>{level.label}</span>}
          {resource.hasAnswerKey && <span className="badge tone-rose">Answer key</span>}
          {entry?.status === 'done' && (
            <span className="badge tone-green">
              <CheckCircle2 size={11} /> Done
            </span>
          )}
          {entry?.status === 'reading' && (
            <span className="badge tone-blue">
              <CircleDot size={11} /> In progress
            </span>
          )}
        </div>

        <div className="resource-sub">
          {showArea && (
            <>
              <span>{area.short}</span>
              <span className="dot" style={{ display: 'inline-block', margin: '0 6px' }} />
            </>
          )}
          <span>{resource.topic}</span>
          <span className="dot" style={{ display: 'inline-block', margin: '0 6px' }} />
          <span>{resource.sizeMB} MB</span>
        </div>
      </div>

      <div className="resource-actions">
        <button
          type="button"
          className={cx('bookmark-btn', bookmarked && 'on')}
          onClick={() => toggleBookmark(resource.id)}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this resource'}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
        <Link
          to={readUrl}
          className="resource-open"
          state={{ from: location.pathname + location.search }}
        >
          Open
        </Link>
      </div>
    </article>
  )
}
