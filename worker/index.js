const INDEX_KEY = '_meta/index.json'
const CACHE_TTL = 5 * 60 * 1000
const RATE_WINDOW = 60 * 1000
const RATE_MAX = 150

let indexCache = null
let indexCachedAt = 0
const hits = new Map()

function configuredOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function allowedOrigin(request, env) {
  const list = configuredOrigins(env)
  if (!list.length) return null

  const origin = request.headers.get('Origin')
  if (origin) {
    return list.includes('*') || list.includes(origin) ? origin : null
  }

  const referer = request.headers.get('Referer')
  if (referer) {
    try {
      const { origin: refOrigin } = new URL(referer)
      if (list.includes('*') || list.includes(refOrigin)) return refOrigin
    } catch {
      /* malformed referer */
    }
  }

  return null
}

function baseHeaders(cors) {
  const headers = {
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, If-Range',
    'Access-Control-Expose-Headers':
      'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  }
  if (cors) headers['Access-Control-Allow-Origin'] = cors
  return headers
}

function json(body, extra) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  })
}

function text(body, status, extra) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...extra },
  })
}

function rateLimited(ip) {
  if (!ip) return false
  const now = Date.now()
  let entry = hits.get(ip)

  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 }
    hits.set(ip, entry)
  }

  entry.count += 1

  if (hits.size > 5000) {
    for (const [key, value] of hits) {
      if (now - value.start > RATE_WINDOW) hits.delete(key)
    }
  }

  return entry.count > RATE_MAX
}

async function loadIndex(env) {
  if (indexCache && Date.now() - indexCachedAt < CACHE_TTL) return indexCache
  const object = await env.BUCKET.get(INDEX_KEY)
  if (!object) return {}
  const data = await object.json()
  indexCache = data.files || {}
  indexCachedAt = Date.now()
  return indexCache
}

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

function sameString(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyToken(env, id, token) {
  if (!env.FILE_TOKEN_SECRET || !token) return false
  const [expiry, signature] = token.split('.')
  if (!expiry || !signature) return false
  if (Number(expiry) < Math.floor(Date.now() / 1000)) return false
  const expected = await sign(env.FILE_TOKEN_SECRET, `${id}.${expiry}`)
  return sameString(expected, signature)
}

async function tokenFor(env, id) {
  if (!env.FILE_TOKEN_SECRET) return null
  const expiry = Math.floor(Date.now() / 1000) + 300
  const signature = await sign(env.FILE_TOKEN_SECRET, `${id}.${expiry}`)
  return { token: `${expiry}.${signature}`, exp: expiry }
}

function inlineFilename(entry) {
  const base = (entry?.key || 'resource').split('/').pop() || 'resource'
  const title = entry?.title || base.replace(/\.[^/.]+$/, '') || 'resource'
  const ext = entry?.format && !base.toLowerCase().endsWith(`.${entry.format}`) ? `.${entry.format}` : ''
  return `${title}${ext}`.replace(/["\\\r\n]/g, '')
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = allowedOrigin(request, env)
    const headers = baseHeaders(cors)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: cors ? 204 : 403, headers })
    }

    if (url.pathname === '/health') {
      return json({ ok: true }, headers)
    }

    if (!cors) {
      return text('Forbidden: origin not allowed', 403, headers)
    }

    const ip = request.headers.get('CF-Connecting-IP') || ''
    if (rateLimited(ip)) {
      return text('Too many requests', 429, { ...headers, 'Retry-After': '60' })
    }

    const fileMatch = url.pathname.match(/^\/file\/([^/]+)$/)
    const tokenMatch = url.pathname.match(/^\/token\/([^/]+)$/)
    if (!fileMatch && !tokenMatch) {
      return text('Not found', 404, headers)
    }

    let id
    try {
      id = decodeURIComponent((fileMatch || tokenMatch)[1])
    } catch {
      return text('Bad request', 400, headers)
    }

    const index = await loadIndex(env)
    const entry = index[id]
    if (!entry) return text('Not found', 404, headers)

    if (tokenMatch) {
      const token = await tokenFor(env, id)
      if (!token) return text('Token endpoint disabled', 503, headers)
      return json(token, headers)
    }

    if (env.REQUIRE_TOKEN === '1') {
      const token = url.searchParams.get('t')
      const valid = await verifyToken(env, id, token)
      if (!valid) {
        return text('Invalid or expired token', 401, {
          ...headers,
          'Cache-Control': 'no-store',
        })
      }
    }

    const key = entry.key
    const size = Number(entry.size) || 0
    const type = entry.type || 'application/octet-stream'

    if (request.method === 'HEAD') {
      const head = await env.BUCKET.head(key)
      if (!head) return text('Not found', 404, headers)
      return new Response(null, {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': type,
          'Content-Length': String(size),
          'Content-Disposition': `inline; filename="${inlineFilename(entry)}"`,
          'Cache-Control': 'private, no-store',
          'Accept-Ranges': 'bytes',
        },
      })
    }

    if (request.method !== 'GET') {
      return text('Method not allowed', 405, { ...headers, Allow: 'GET, HEAD, OPTIONS' })
    }

    const responseHeaders = {
      ...headers,
      'Content-Type': type,
      'Content-Disposition': `inline; filename="${inlineFilename(entry)}"`,
      'Cache-Control': 'private, no-store',
      'Accept-Ranges': 'bytes',
    }

    const rangeHeader = request.headers.get('Range')
    let object
    let status = 200

    if (rangeHeader && size > 0) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
      if (!match) {
        return text('Invalid range', 416, {
          ...headers,
          'Content-Range': `bytes */${size}`,
        })
      }

      let start
      let end

      if (!match[1] && match[2]) {
        const suffix = Number(match[2])
        start = Math.max(0, size - suffix)
        end = size - 1
      } else {
        start = match[1] ? Number(match[1]) : 0
        end = match[2] ? Number(match[2]) : size - 1
      }

      end = Math.min(end, size - 1)

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        return text('Range not satisfiable', 416, {
          ...headers,
          'Content-Range': `bytes */${size}`,
        })
      }

      const length = end - start + 1
      object = await env.BUCKET.get(key, { range: { offset: start, length } })
      if (!object) return text('Not found', 404, headers)
      status = 206
      responseHeaders['Content-Range'] = `bytes ${start}-${end}/${size}`
      responseHeaders['Content-Length'] = String(length)
    } else {
      object = await env.BUCKET.get(key)
      if (!object) return text('Not found', 404, headers)
      responseHeaders['Content-Length'] = String(size || object.size)
    }

    return new Response(object.body, { status, headers: responseHeaders })
  },
}
