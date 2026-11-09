import { Link } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'

export default function NotFound() {
  return (
    <div className="page-enter">
      <EmptyState title="Page not found" icon={CircleHelp}>
        The page you’re looking for doesn’t exist. <Link to="/">Go back home</Link>
      </EmptyState>
    </div>
  )
}
