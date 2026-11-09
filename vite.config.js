import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Dev-only file server. Mimics the Cloudflare Worker in production by
 * streaming a local file by catalog id, without exposing its path.
 */
function localFileServer() {
  const mapFile = path.resolve(process.cwd(), 'data/file-map.json')
  let map = {}
  const load = () => {
    try {
      map = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
    } catch {
      map = {}
    }
  }
  load()

  const contentType = (format) => {
    switch (format) {
      case 'pdf':
        return 'application/pdf'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      default:
        return 'application/octet-stream'
    }
  }

  return {
    name: 'cse-local-file-server',
    configureServer(server) {
      server.middlewares.use('/api/file', (req, res) => {
        load()
        const url = new URL(req.url, 'http://localhost')
        const id = decodeURIComponent(url.pathname.replace(/^\/+/, '').split('/')[0])
        const entry = map[id]

        if (!entry || !fs.existsSync(entry.sourcePath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain')
          res.end('Not found')
          return
        }

        const stat = fs.statSync(entry.sourcePath)
        res.setHeader('Content-Type', contentType(entry.format))
        res.setHeader('Content-Disposition', 'inline')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('X-Content-Type-Options', 'nosniff')

        const range = req.headers.range
        if (range) {
          const match = /bytes=(\d*)-(\d*)/.exec(range)
          const start = match && match[1] ? Number.parseInt(match[1], 10) : 0
          const end = match && match[2] ? Number.parseInt(match[2], 10) : stat.size - 1
          if (start >= stat.size || end >= stat.size || start > end) {
            res.statusCode = 416
            res.setHeader('Content-Range', `bytes */${stat.size}`)
            res.end()
            return
          }
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
          res.setHeader('Content-Length', end - start + 1)
          fs.createReadStream(entry.sourcePath, { start, end }).pipe(res)
          return
        }

        res.setHeader('Content-Length', stat.size)
        fs.createReadStream(entry.sourcePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localFileServer()],
})
