import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { ArrowUpRight, FileText, ImageIcon, Search } from 'lucide-react'
import { useCatalog } from '../lib/catalog.jsx'
import { areaMeta } from '../lib/areas.jsx'
import { typeLabel } from '../lib/utils.js'

function isTyping(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export default function SearchBar() {
  const { resources } = useCatalog()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: [
          { name: 'title', weight: 0.55 },
          { name: 'topic', weight: 0.2 },
          { name: 'area', weight: 0.12 },
          { name: 'tags', weight: 0.13 },
          { name: 'source', weight: 0.05 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [resources],
  )

  const trimmed = query.trim()

  const results = useMemo(() => {
    if (trimmed.length < 2) return []
    return fuse.search(trimmed, { limit: 8 }).map((r) => r.item)
  }, [fuse, trimmed])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(item) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(`/read/${encodeURIComponent(item.id)}`)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[active]) {
        e.preventDefault()
        go(results[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="search" ref={wrapRef}>
      <Search size={16} className="search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder="Search reviewers, topics, answer keys…"
        value={query}
        onChange={(e) => {
          const value = e.target.value
          setQuery(value)
          setActive(0)
          setOpen(value.trim().length >= 2)
        }}
        onFocus={() => trimmed.length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Search the library"
        autoComplete="off"
      />
      <span className="search-kbd" aria-hidden="true">/</span>

      {open && (
        <div className="search-pop" role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className="search-empty">No matches for “{trimmed}”</div>
          ) : (
            <>
              <div className="search-pop-head">Top matches</div>
              {results.map((item, i) => {
                const meta = areaMeta(item.area)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`search-result${i === active ? ' active' : ''}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    {item.format === 'image' ? (
                      <ImageIcon size={17} style={{ color: meta.color, flex: 'none' }} />
                    ) : (
                      <FileText size={17} style={{ color: meta.color, flex: 'none' }} />
                    )}
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="search-result-title" style={{ display: 'block' }}>
                        {item.title}
                      </span>
                      <span className="search-result-sub" style={{ display: 'block' }}>
                        {item.area} · {item.topic} · {typeLabel(item.type)}
                      </span>
                    </span>
                    <ArrowUpRight size={14} style={{ color: 'var(--muted)', flex: 'none' }} />
                  </button>
                )
              })}
              <div className="search-pop-head" style={{ borderTop: '1px solid var(--border)' }}>
                <a
                  href="/library"
                  onClick={(e) => {
                    e.preventDefault()
                    setOpen(false)
                    setQuery('')
                    navigate('/library')
                  }}
                  style={{ color: 'var(--brand)', textDecoration: 'none' }}
                >
                  Browse the full library →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
