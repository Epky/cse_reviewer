export const FILE_BASE = (import.meta.env.VITE_FILE_BASE || '/api/file').replace(/\/$/, '')
export const WATERMARK = import.meta.env.VITE_WATERMARK || 'Reviewer Vault'

export function fileUrl(id) {
  return `${FILE_BASE}/${encodeURIComponent(id)}`
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function timeAgo(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function areaPath(area) {
  return `/area/${encodeURIComponent(area)}`
}

export function topicPath(area, topic) {
  return `/area/${encodeURIComponent(area)}/${encodeURIComponent(topic)}`
}

export const TYPE_META = {
  learn: { label: 'Learn', tone: 'indigo', weight: 0 },
  reviewer: { label: 'Reviewer', tone: 'blue', weight: 1 },
  reference: { label: 'Reference', tone: 'violet', weight: 2 },
  test: { label: 'Practice Test', tone: 'amber', weight: 3 },
  mock: { label: 'Mock Exam', tone: 'red', weight: 4 },
  tips: { label: 'Tips & Guide', tone: 'green', weight: 5 },
  form: { label: 'Form', tone: 'slate', weight: 6 },
  answer_key: { label: 'Answer Key', tone: 'rose', weight: 7 },
}

export const TYPE_ORDER = Object.entries(TYPE_META)
  .sort((a, b) => a[1].weight - b[1].weight)
  .map(([key]) => key)

export const LEVEL_META = {
  foundation: { label: 'Foundation', tone: 'green' },
  standard: { label: 'Standard', tone: 'blue' },
  challenge: { label: 'Challenge', tone: 'red' },
}

export const AREA_ORDER = [
  'English',
  'Math',
  'Logic & Reasoning',
  'Clerical',
  'General Knowledge (GK)',
]

export function typeLabel(type) {
  return TYPE_META[type]?.label || 'Resource'
}
