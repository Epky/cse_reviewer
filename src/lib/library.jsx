/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'cse-library-v1'

const EMPTY = {
  version: 1,
  progress: {},
  bookmarks: [],
  lastReadId: null,
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      ...EMPTY,
      ...parsed,
      progress: parsed.progress || {},
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    }
  } catch {
    return EMPTY
  }
}

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full or unavailable */
    }
  }, [state])

  const markOpened = useCallback((id) => {
    setState((prev) => {
      const existing = prev.progress[id] || {}
      return {
        ...prev,
        lastReadId: id,
        progress: {
          ...prev.progress,
          [id]: {
            ...existing,
            status: existing.status === 'done' ? 'done' : 'reading',
            opens: (existing.opens || 0) + 1,
            lastOpenedAt: Date.now(),
          },
        },
      }
    })
  }, [])

  const setStatus = useCallback((id, status) => {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [id]: { ...(prev.progress[id] || {}), status, updatedAt: Date.now() },
      },
    }))
  }, [])

  const setLastPage = useCallback((id, page) => {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [id]: { ...(prev.progress[id] || {}), lastPage: page },
      },
    }))
  }, [])

  const toggleBookmark = useCallback((id) => {
    setState((prev) => {
      const has = prev.bookmarks.includes(id)
      return {
        ...prev,
        bookmarks: has ? prev.bookmarks.filter((x) => x !== id) : [id, ...prev.bookmarks],
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setState((prev) => ({ ...prev, progress: {}, lastReadId: null }))
  }, [])

  const clearAll = useCallback(() => {
    setState(EMPTY)
  }, [])

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cse-reviewer-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [state])

  const importData = useCallback((text) => {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file')
    setState((prev) => ({
      ...prev,
      progress: { ...prev.progress, ...(parsed.progress || {}) },
      bookmarks: [...new Set([...(prev.bookmarks || []), ...(parsed.bookmarks || [])])],
      lastReadId: prev.lastReadId || parsed.lastReadId || null,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      markOpened,
      setStatus,
      setLastPage,
      toggleBookmark,
      resetProgress,
      clearAll,
      exportData,
      importData,
      bookmarkSet: new Set(state.bookmarks),
    }),
    [state, markOpened, setStatus, setLastPage, toggleBookmark, resetProgress, clearAll, exportData, importData],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider')
  return ctx
}
