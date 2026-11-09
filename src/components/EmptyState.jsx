import { SearchX } from 'lucide-react'

export default function EmptyState({ title, children, icon: Icon = SearchX }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}
