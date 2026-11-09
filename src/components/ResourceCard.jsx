import { Link, useLocation } from 'react-router-dom'
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  GraduationCap,
  ImageIcon,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { areaMeta } from '../lib/areas.jsx'
import { useLibrary } from '../lib/library.jsx'
import { cx, TYPE_META, LEVEL_META, typeLabel } from '../lib/utils.js'

function getFileIcon(type, format) {
  if (format === 'image') return <ImageIcon size={20} strokeWidth={2.2} />
  switch (type) {
    case 'answer_key':
      return <KeyRound size={20} strokeWidth={2.2} />
    case 'test':
    case 'mock':
      return <CheckSquare size={20} strokeWidth={2.2} />
    case 'tips':
      return <Sparkles size={20} strokeWidth={2.2} />
    case 'learn':
      return <GraduationCap size={20} strokeWidth={2.2} />
    case 'reviewer':
      return <BookOpen size={20} strokeWidth={2.2} />
    default:
      return <FileText size={20} strokeWidth={2.2} />
  }
}

function getFormatLabel(format, type) {
  if (type === 'answer_key') return 'KEY'
  if (format === 'image') return 'IMG'
  return 'PDF'
}

export default function ResourceCard({ resource, showArea = false }) {
  const { bookmarkSet, toggleBookmark, progress } = useLibrary()
  const location = useLocation()
  const bookmarked = bookmarkSet.has(resource.id)
  const entry = progress[resource.id]
  const type = TYPE_META[resource.type] || { tone: 'slate' }
  const level = LEVEL_META[resource.level]
  const area = areaMeta(resource.area)
  const readUrl = `/read/${encodeURIComponent(resource.id)}`
  const formatLabel = getFormatLabel(resource.format, resource.type)
  const isReading = entry?.status === 'reading'
  const isDone = entry?.status === 'done'

  return (
    <article
      className={cx('resource-card', isReading && 'is-reading', isDone && 'is-done')}
      style={{ '--card-accent': area.color }}
    >
      <div className="resource-file-icon" aria-hidden="true">
        <span className="resource-file-symbol">{getFileIcon(resource.type, resource.format)}</span>
        <span className="resource-file-fmt">{formatLabel}</span>
      </div>

      <div className="resource-body">
        <div className="resource-meta">
          {showArea && (
            <span
              className="resource-area-tag"
              style={{
                color: area.color,
                background: `color-mix(in srgb, ${area.color} 12%, transparent)`,
                borderColor: `color-mix(in srgb, ${area.color} 25%, transparent)`,
              }}
            >
              <span className="dot" style={{ background: area.color }} />
              {area.short}
            </span>
          )}
          <span className={cx('badge', `tone-${type.tone}`)}>{typeLabel(resource.type)}</span>
          {level && <span className={cx('badge', `tone-${level.tone}`)}>{level.label}</span>}
          {resource.hasAnswerKey && (
            <span className="badge badge-has-key">
              <KeyRound size={10.5} strokeWidth={2.4} /> Answer key
            </span>
          )}
          {isDone && (
            <span className="badge badge-done">
              <CheckCircle2 size={11} strokeWidth={2.4} /> Done
            </span>
          )}
          {isReading && (
            <span className="badge badge-reading">
              <Clock size={11} strokeWidth={2.4} />
              {entry.lastPage ? `p. ${entry.lastPage}` : 'Reading'}
            </span>
          )}
        </div>

        <Link
          to={readUrl}
          className="resource-title"
          title={resource.title}
          state={{ from: location.pathname + location.search }}
        >
          {resource.title}
        </Link>

        <div className="resource-sub">
          <span className="resource-topic" title={resource.topic}>
            {resource.topic}
          </span>
          <span className="dot" />
          <span className="resource-size-badge">{resource.sizeMB} MB</span>
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
          <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
        <Link
          to={readUrl}
          className="resource-open"
          state={{ from: location.pathname + location.search }}
          title={`Open ${resource.title}`}
        >
          <span>Open</span>
          <ArrowUpRight size={13} className="resource-open-icon" />
        </Link>
      </div>

      {isReading && (
        <div className="resource-card-progress" aria-hidden="true">
          <div className="resource-card-progress-bar" />
        </div>
      )}
    </article>
  )
}
