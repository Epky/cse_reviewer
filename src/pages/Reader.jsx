import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { pdfjsLib } from '../lib/pdf.js'
import { useCatalog } from '../lib/catalog.jsx'
import { useLibrary } from '../lib/library.jsx'
import { areaPath, cx, fileUrl, WATERMARK } from '../lib/utils.js'

function PdfPage({ pdf, pageNumber, scale, width, height }) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const textRef = useRef(null)
  const [near, setNear] = useState(false)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const margin = typeof window !== 'undefined' && window.innerWidth <= 768 ? '600px 0px' : '1200px 0px'
    const io = new IntersectionObserver(
      (entries) => {
        const visible = Boolean(entries[0]?.isIntersecting)
        setNear(visible)
        if (!visible) setStatus('idle')
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near) {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
      textRef.current?.replaceChildren()
      return
    }
    let cancelled = false
    let renderTask = null
    let textLayer = null

    async function run() {
      setStatus('rendering')
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return

      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr))
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr))

      const ctx = canvas.getContext('2d', { alpha: false })
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()

      const options = { canvasContext: ctx, viewport, canvas }
      if (dpr !== 1) options.transform = [dpr, 0, 0, dpr, 0, 0]
      renderTask = page.render(options)
      await renderTask.promise
      if (cancelled) return

      const textDiv = textRef.current
      if (textDiv) {
        textDiv.replaceChildren()
        textDiv.style.setProperty('--total-scale-factor', String(viewport.scale))
        textDiv.style.setProperty('--scale-factor', String(viewport.scale))
        textDiv.style.setProperty('--scale-round-x', '1px')
        textDiv.style.setProperty('--scale-round-y', '1px')
        const textContent = await page.getTextContent()
        if (cancelled) return
        textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport,
        })
        await textLayer.render()
      }

      if (!cancelled) setStatus('ready')
    }

    run().catch((err) => {
      if (cancelled || err?.name === 'RenderingCancelledException') return
      console.error(`Could not render page Number ${pageNumber}`, err)
      setStatus('error')
    })

    return () => {
      cancelled = true
      try {
        renderTask?.cancel()
      } catch {
        /* ignore */
      }
      try {
        textLayer?.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [pdf, pageNumber, scale, near])

  return (
    <div
      className="pdf-page"
      ref={rootRef}
      style={{ width, height }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} />
      <div className="textLayer" ref={textRef} />
      {status !== 'ready' && (
        <div className="pdf-page-loading" style={{ position: 'absolute', inset: 0 }}>
          Page {pageNumber}
        </div>
      )}
      <span className="watermark">{WATERMARK}</span>
    </div>
  )
}

function ReaderShell({ children, title, sub, onBack }) {
  return (
    <div className="reader" onContextMenu={(e) => e.preventDefault()}>
      <div className="reader-topbar">
        <button type="button" className="reader-back" onClick={onBack} aria-label="Leave reader">
          <ArrowLeft size={18} />
        </button>
        <div className="reader-heading">
          <div className="reader-title">{title}</div>
          {sub && <div className="reader-sub">{sub}</div>}
        </div>
      </div>
      <div className="reader-scroll">
        <div className="reader-pages">{children}</div>
      </div>
    </div>
  )
}

export default function Reader() {
  const { id } = useParams()
  return <ReaderView key={id || 'unknown'} id={id} />
}

function ReaderView({ id }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { byId, loading } = useCatalog()
  const {
    markOpened,
    setLastPage,
    toggleBookmark,
    bookmarkSet,
    progress,
    setStatus,
  } = useLibrary()

  const resource = id ? byId.get(id) : null
  const resourceId = resource?.id
  const viewFormat = resource?.renderFormat || resource?.format || 'pdf'

  const scrollRef = useRef(null)
  const pagesWrapRef = useRef(null)
  const currentPageRef = useRef(1)
  const restoredRef = useRef(false)
  const initialPageRef = useRef(progress[id]?.lastPage || 1)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)

  const [pdfDoc, setPdfDoc] = useState(null)
  const [pages, setPages] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFull, setIsFull] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (!id) return
    markOpened(id)
  }, [id, markOpened])

  useEffect(() => {
    if (!id) return
    const timer = setTimeout(() => setLastPage(id, currentPageRef.current), 700)
    return () => clearTimeout(timer)
  }, [id, currentPage, setLastPage])

  useEffect(() => {
    return () => {
      if (id) setLastPage(id, currentPageRef.current)
    }
  }, [id, setLastPage])

  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()

    if (!resource || viewFormat !== 'pdf') return
    let cancelled = false
    const task = pdfjsLib.getDocument({
      url: fileUrl(resource.id),
      isEvalSupported: false,
    })

    ;(async () => {
      try {
        const doc = await task.promise
        if (cancelled) {
          doc.destroy()
          return
        }
        setPdfDoc(doc)
        const sizes = []
        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n)
          const viewport = page.getViewport({ scale: 1 })
          sizes.push({ width: viewport.width, height: viewport.height })
          if (cancelled) return
        }
        if (!cancelled) setPages(sizes)
      } catch (err) {
        if (!cancelled) {
          console.error('Could not load document', err)
          setLoadError(err)
        }
      }
    })()

    return () => {
      cancelled = true
      task.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, viewFormat])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const wrap = pagesWrapRef.current
        if (!wrap) return
        const anchor = el.getBoundingClientRect().top + 96
        const kids = wrap.children
        let index = 0
        for (let i = 0; i < kids.length; i += 1) {
          if (kids[i].getBoundingClientRect().top <= anchor) index = i
          else break
        }
        const page = Math.min(kids.length || 1, index + 1)
        if (page !== currentPageRef.current) {
          currentPageRef.current = page
          setCurrentPage(page)
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [pages.length])

  const goToPage = useCallback((target, behavior = 'smooth') => {
    const el = scrollRef.current
    const wrap = pagesWrapRef.current
    if (!el || !wrap) return
    const count = wrap.children.length || 1
    const page = Math.max(1, Math.min(count, target))
    const child = wrap.children[page - 1]
    if (!child) return
    const delta = child.getBoundingClientRect().top - el.getBoundingClientRect().top
    el.scrollTo({ top: el.scrollTop + delta - 8, behavior })
  }, [])

  useEffect(() => {
    if (restoredRef.current || !pages.length) return
    restoredRef.current = true
    const target = Math.min(Math.max(1, initialPageRef.current), pages.length)
    if (target > 1) {
      requestAnimationFrame(() => goToPage(target, 'auto'))
    }
  }, [pages.length, goToPage])

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const target = e.target
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (typing) return

      const key = e.key
      const lower = key.toLowerCase()

      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(lower)) {
        e.preventDefault()
        return
      }

      if (key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else navigate(-1)
        return
      }

      if (key === '+' || key === '=') {
        e.preventDefault()
        setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))
        return
      }

      if (key === '-' || key === '_') {
        e.preventDefault()
        setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))
        return
      }

      if (key === '0') {
        e.preventDefault()
        setZoom(1)
        return
      }

      if (pages.length) {
        if (key === 'ArrowRight' || key === 'PageDown' || key === ' ') {
          e.preventDefault()
          goToPage(currentPageRef.current + 1)
        } else if (key === 'ArrowLeft' || key === 'PageUp') {
          e.preventDefault()
          goToPage(currentPageRef.current - 1)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, goToPage, pages.length])

  const maxPageWidth = useMemo(
    () => pages.reduce((max, p) => Math.max(max, p.width), 0),
    [pages],
  )

  const fitScale =
    containerWidth > 0 && maxPageWidth > 0
      ? Math.min(1.5, Math.max(0.15, (containerWidth - 32) / maxPageWidth))
      : 1

  const scale = fitScale * zoom

  const bookmarked = Boolean(id && bookmarkSet.has(id))
  const done = progress[id]?.status === 'done'
  const returnPath = location.state?.from || (resource ? areaPath(resource.area) : '/library')

  function leave() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    if (window.history.length > 1) navigate(-1)
    else navigate(returnPath)
  }

  const canFullscreen =
    typeof document !== 'undefined' &&
    Boolean(
      document.fullscreenEnabled ||
      document.documentElement?.requestFullscreen ||
      document.documentElement?.webkitRequestFullscreen
    )

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen()
    }
  }

  const onTouchStart = (e) => {
    if (e.touches?.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const onTouchEnd = (e) => {
    if (!touchStartXRef.current || e.changedTouches?.length !== 1) return
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current
    touchStartXRef.current = 0
    touchStartYRef.current = 0

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && pages.length) {
        goToPage(currentPageRef.current + 1)
      } else if (diffX > 0 && pages.length) {
        goToPage(currentPageRef.current - 1)
      }
    }
  }

  if (loading && !resource) {
    return (
      <div className="reader">
        <div className="reader-scroll" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="reader-skeleton" />
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <ReaderShell title="Resource not found" onBack={() => navigate('/library')} sub="Reviewer Vault">
        <div className="reader-error">
          <h2>We couldn’t open that file</h2>
          <p>It may have been removed from the catalog.</p>
          <Link to="/library" className="btn btn-primary">
            Back to the library
          </Link>
        </div>
      </ReaderShell>
    )
  }

  const pageLabel =
    viewFormat === 'pdf' && pages.length
      ? `${currentPage} / ${pages.length}`
      : viewFormat === 'image'
        ? 'Image'
        : 'Loading…'

  return (
    <div className="reader" onContextMenu={(e) => e.preventDefault()}>
      <div className="reader-topbar">
        <button type="button" className="reader-back" onClick={leave} aria-label="Leave reader">
          <ArrowLeft size={18} />
        </button>

        <div className="reader-heading">
          <div className="reader-title">{resource.title}</div>
          <div className="reader-sub">
            <span>{resource.area}</span>
            <span>·</span>
            <span>{resource.topic}</span>
            {viewFormat === 'pdf' && pages.length > 0 && (
              <>
                <span>·</span>
                <span>{pages.length} pages</span>
              </>
            )}
          </div>
        </div>

        <div className="reader-controls">
          {viewFormat === 'pdf' && pages.length > 0 && (
            <>
              <button
                type="button"
                className="reader-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="reader-page-chip">{pageLabel}</span>
              <button
                type="button"
                className="reader-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pages.length}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>

              <button
                type="button"
                className="reader-btn reader-only-wide"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                aria-label="Zoom out"
              >
                <ZoomOut size={17} />
              </button>
              <span className="reader-zoom reader-only-wide">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="reader-btn reader-only-wide"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                aria-label="Zoom in"
              >
                <ZoomIn size={17} />
              </button>
            </>
          )}

          {viewFormat === 'image' && (
            <>
              <button
                type="button"
                className="reader-btn reader-only-wide"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                aria-label="Zoom out"
              >
                <ZoomOut size={17} />
              </button>
              <span className="reader-zoom reader-only-wide">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="reader-btn reader-only-wide"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                aria-label="Zoom in"
              >
                <ZoomIn size={17} />
              </button>
              <span className="reader-page-chip">{pageLabel}</span>
            </>
          )}

          <button
            type="button"
            className={cx('reader-btn', bookmarked && 'on')}
            onClick={() => toggleBookmark(resource.id)}
            style={bookmarked ? { color: '#f59e0b' } : undefined}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            className="reader-btn"
            onClick={() => setStatus(resource.id, done ? 'reading' : 'done')}
            style={done ? { color: '#16a34a' } : undefined}
            aria-label={done ? 'Mark as not done' : 'Mark as done'}
            title={done ? 'Mark as not done' : 'Mark as done'}
          >
            <CheckCircle2 size={17} />
          </button>

          {canFullscreen && (
            <button
              type="button"
              className="reader-btn"
              onClick={toggleFullscreen}
              aria-label={isFull ? 'Exit full screen' : 'Enter full screen'}
              title={isFull ? 'Exit full screen' : 'Full screen'}
            >
              {isFull ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          )}
        </div>
      </div>

      <div
        className="reader-scroll"
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loadError && (
          <div className="reader-pages">
            <div className="reader-error">
              <FileWarning size={28} style={{ color: '#ef4444', marginBottom: 10 }} />
              <h2>This file could not be displayed</h2>
              <p>
                It may still be processing or the file is temporarily unavailable. Try again in a
                moment.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button type="button" className="btn" onClick={() => window.location.reload()}>
                  Retry
                </button>
                <Link to="/library" className="btn btn-primary">
                  Back to library
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loadError && viewFormat === 'pdf' && pages.length === 0 && (
          <div className="reader-pages">
            <div className="reader-skeleton" />
          </div>
        )}

        {!loadError && viewFormat === 'pdf' && pages.length > 0 && (
          <div className="reader-pages" ref={pagesWrapRef}>
            {pages.map((page, index) => (
              <PdfPage
                key={`${resource.id}:${index + 1}`}
                pdf={pdfDoc}
                pageNumber={index + 1}
                scale={scale}
                width={Math.ceil(page.width * scale)}
                height={Math.ceil(page.height * scale)}
              />
            ))}
          </div>
        )}

        {!loadError && viewFormat === 'image' && (
          <div className="reader-pages" ref={pagesWrapRef}>
            <div
              className="reader-image-wrap"
              style={{ width: `${Math.round(zoom * 100)}%` }}
            >
              {!imageLoaded && (
                <div
                  className="reader-skeleton"
                  style={{ width: '100%', aspectRatio: 'auto', height: '70vh' }}
                />
              )}
              <img
                src={fileUrl(resource.id)}
                alt={resource.title}
                draggable={false}
                onLoad={() => setImageLoaded(true)}
                onError={() => setLoadError(new Error('image failed'))}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
              <span className="watermark">{WATERMARK}</span>
            </div>
          </div>
        )}

        {!loadError && viewFormat !== 'pdf' && viewFormat !== 'image' && (
          <div className="reader-pages">
            <div className="reader-error">
              <h2>Preview not available</h2>
              <p>This file type is not supported by the reader yet.</p>
              <Link to="/library" className="btn btn-primary">
                Back to library
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="reader-hint">
        ← → to turn pages · + / − to zoom · Esc to exit · Your place saves automatically
      </div>
    </div>
  )
}
