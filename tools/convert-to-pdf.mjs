import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SOURCE = path.join(ROOT, 'CSE 2026 - CIVIL SERVICE EXAM REVIEWERS 2026')
const REPORT = path.join(ROOT, 'data', 'pipeline-report.json')
const TMP = path.join(ROOT, 'data', 'converted', '_tmp')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((value) => value.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity

function commandExists(command) {
  try {
    execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function findSoffice() {
  if (process.env.SOFFICE && fs.existsSync(process.env.SOFFICE)) return process.env.SOFFICE
  const windows = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ]
  for (const candidate of windows) {
    if (fs.existsSync(candidate)) return candidate
  }
  if (commandExists('soffice')) return 'soffice'
  if (commandExists('libreoffice')) return 'libreoffice'
  return null
}

function findDjvu() {
  if (commandExists('ddjvu')) return { type: 'ddjvu', command: 'ddjvu' }
  if (commandExists('magick')) return { type: 'magick', command: 'magick' }
  if (commandExists('convert')) return { type: 'magick', command: 'convert' }
  return null
}

function run(command, argsList) {
  execFileSync(command, argsList, { stdio: 'inherit' })
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error('data/pipeline-report.json not found. Run `node tools/build-catalog.mjs` first.')
    process.exit(1)
  }

  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'))
  const pending = (report.pending || []).slice(0, limit)

  if (!pending.length) {
    console.log('Nothing pending. Every supported file is already a PDF.')
    return
  }

  const soffice = findSoffice()
  const djvu = findDjvu()
  const needed = new Set(pending.map((item) => item.format))
  const usesOffice = [...needed].some((format) => ['doc', 'docx', 'ppt', 'pptx', 'pps', 'ppsx'].includes(format))
  const usesDjvu = needed.has('djvu')

  if (usesOffice && !soffice) {
    console.error(
      [
        'LibreOffice is required to convert Word/PowerPoint files.',
        'Install it from https://www.libreoffice.org/download/ or set the SOFFICE env var.',
      ].join('\n'),
    )
    process.exit(1)
  }

  if (usesDjvu && !djvu) {
    console.error(
      [
        'DJVU conversion needs DjVuLibre (ddjvu) or ImageMagick.',
        'Install DjVuLibre from http://djvu.sourceforge.net/ or ImageMagick from https://imagemagick.org/.',
      ].join('\n'),
    )
    process.exit(1)
  }

  fs.mkdirSync(TMP, { recursive: true })

  console.log(
    `${dryRun ? 'Dry run: ' : ''}Converting ${pending.length} pending files${
      soffice ? ` · LibreOffice: ${soffice}` : ''
    }${djvu ? ` · DJVU: ${djvu.command}` : ''}`,
  )

  let converted = 0
  let skipped = 0
  const failures = []

  for (const item of pending) {
    const sourcePath = item.sourcePath
    const targetPath = sourcePath.replace(/\.[^.\\/]+$/, '.pdf')

    if (!fs.existsSync(sourcePath)) {
      skipped += 1
      console.warn(`  MISSING SOURCE: ${item.file}`)
      continue
    }

    if (fs.existsSync(targetPath)) {
      skipped += 1
      console.log(`  SKIP already converted: ${path.basename(targetPath)}`)
      continue
    }

    if (dryRun) {
      console.log(`  ${item.file}  ->  ${path.basename(targetPath)}`)
      converted += 1
      continue
    }

    try {
      if (['doc', 'docx', 'ppt', 'pptx', 'pps', 'ppsx'].includes(item.format)) {
        run(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', TMP, sourcePath])
        const produced = path.join(TMP, `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`)
        if (!fs.existsSync(produced)) throw new Error('LibreOffice produced no PDF')
        fs.copyFileSync(produced, targetPath)
        fs.rmSync(produced, { force: true })
      } else if (item.format === 'djvu') {
        if (djvu.type === 'ddjvu') {
          run(djvu.command, ['-format=pdf', sourcePath, targetPath])
        } else {
          run(djvu.command, [sourcePath, targetPath])
        }
      } else {
        skipped += 1
        console.warn(`  UNSUPPORTED FORMAT: ${item.format}`)
        continue
      }

      converted += 1
      console.log(`  DONE ${path.basename(targetPath)}`)
    } catch (error) {
      failures.push({ file: item.file, message: error.message })
      console.warn(`  FAIL ${item.file}: ${error.message}`)
    }
  }

  fs.rmSync(TMP, { recursive: true, force: true })

  console.log(
    `\nConverted ${converted}, skipped ${skipped}, failed ${failures.length}.`,
  )

  if (converted > 0 && !dryRun) {
    console.log('Now run `node tools/build-catalog.mjs` to rebuild the catalog and file map.')
  }
}

main()
