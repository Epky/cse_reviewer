import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { AwsClient } from 'aws4fetch'

const ROOT = process.cwd()
const MAP_PATH = path.join(ROOT, 'data', 'file-map.json')
const INDEX_KEY = '_meta/index.json'

async function loadEnvFile() {
  const envPath = path.join(ROOT, '.env.r2')
  let text
  try {
    text = await fs.readFile(envPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    const [, key, raw] = match
    if (!process.env[key]) process.env[key] = raw.replace(/^['"]|['"]$/g, '')
  }
  console.log(`Loaded credentials from ${envPath}`)
}

await loadEnvFile()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((value) => value.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const concurrency = Math.max(1, Number(process.env.R2_CONCURRENCY || 4))

const bucket = process.env.R2_BUCKET || 'reviewer-vault-files'
const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const endpointBase =
  process.env.R2_ENDPOINT_BASE ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com/${bucket}` : '')

const MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
}

function contentType(format, filePath) {
  if (MIME[format]) return MIME[format]
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return MIME[ext] || 'application/octet-stream'
}

function encodeKey(key) {
  return key.split('/').map(encodeURIComponent).join('/')
}

async function runPool(items, size, worker) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index], index)
    }
  })
  await Promise.all(workers)
}

async function main() {
  if (!dryRun && (!endpointBase || !accessKeyId || !secretAccessKey)) {
    console.error(
      [
        'Missing R2 credentials. Set:',
        '  R2_ACCOUNT_ID (or R2_ENDPOINT_BASE)',
        '  R2_ACCESS_KEY_ID',
        '  R2_SECRET_ACCESS_KEY',
        '  R2_BUCKET (optional, default: reviewer-vault-files)',
      ].join('\n'),
    )
    process.exit(1)
  }

  let map
  try {
    map = JSON.parse(await fs.readFile(MAP_PATH, 'utf8'))
  } catch {
    console.error('data/file-map.json not found. Run `node tools/build-catalog.mjs` first.')
    process.exit(1)
  }

  let entries = Object.entries(map)
    .filter(([, entry]) => entry.objectKey)
    .slice(0, limit)
  if (!entries.length) {
    console.error('No files to upload.')
    process.exit(0)
  }

  const byKey = new Map()
  for (const [id, entry] of entries) {
    if (!byKey.has(entry.objectKey)) byKey.set(entry.objectKey, [])
    byKey.get(entry.objectKey).push({ id, entry })
  }
  const uploads = [...byKey.values()].map((group) => ({ id: group[0].id, entry: group[0].entry, group }))

  const client = new AwsClient({
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
    service: 's3',
    region: 'auto',
  })

  const files = {}
  let done = 0
  let bytes = 0

  console.log(
    `${dryRun ? 'Dry run: ' : ''}Uploading ${uploads.length} unique objects (${entries.length} entries) to ${bucket}${
      dryRun ? '' : ` via ${endpointBase}`
    }`,
  )

  await runPool(uploads, concurrency, async ({ id, entry, group }) => {
    const data = await fs.readFile(entry.sourcePath)
    const type = contentType(entry.renderFormat || entry.format, entry.sourcePath)

    if (!dryRun) {
      const url = `${endpointBase}/${encodeKey(entry.objectKey)}`
      const response = await client.fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': type,
          'Cache-Control': 'private, max-age=31536000, immutable',
        },
        body: data,
      })
      if (!response.ok) {
        throw new Error(
          `Upload failed for ${id}: ${response.status} ${await response.text()}`,
        )
      }
    }

    for (const { id: oid, entry: oentry } of group) {
      files[oid] = {
        key: entry.objectKey,
        size: data.length,
        type,
        title: oentry.title,
        format: oentry.renderFormat || oentry.format,
      }
    }
    done += 1
    bytes += data.length

    if (done % 10 === 0 || done === uploads.length) {
      console.log(
        `  ${done}/${uploads.length} · ${(bytes / 1048576).toFixed(1)} MB`,
      )
    }
  })

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    files,
  }
  const indexBody = JSON.stringify(index)

  if (dryRun) {
    console.log(`Dry run complete. Index would contain ${Object.keys(files).length} entries.`)
    return
  }

  const indexUrl = `${endpointBase}/${encodeKey(INDEX_KEY)}`
  const indexResponse = await client.fetch(indexUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: indexBody,
  })
  if (!indexResponse.ok) {
    throw new Error(
      `Could not upload index: ${indexResponse.status} ${await indexResponse.text()}`,
    )
  }

  await fs.writeFile(path.join(ROOT, 'data', 'r2-index.json'), `${JSON.stringify(index, null, 2)}\n`)
  console.log(`Done. Uploaded ${Object.keys(files).length} files and ${INDEX_KEY}.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
