#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SOURCE_DIR = path.resolve(
  ROOT,
  process.env.SOURCE_DIR || 'CSE 2026 - CIVIL SERVICE EXAM REVIEWERS 2026',
);
const DATA_DIR = path.resolve(ROOT, 'data');
const PUBLIC_DATA_DIR = path.resolve(ROOT, 'public', 'data');

const AREA_ORDER = [
  'English',
  'Math',
  'Logic & Reasoning',
  'Clerical',
  'General Knowledge (GK)',
];

const TYPE_ORDER = [
  'learn',
  'reviewer',
  'reference',
  'test',
  'mock',
  'tips',
  'form',
  'answer_key',
];

const RENDERABLE = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);
const PENDING_FORMATS = new Set(['doc', 'docx', 'ppt', 'pptx', 'pps', 'ppsx', 'djvu']);
const SKIP_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);
const SKIP_EXTS = new Set(['.tmp', '.lnk', '.url', '.ini', '.db']);

const AREA_META_COLORS = {};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function round(value, digits = 1) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function naturalCompare(a, b) {
  const split = (s) =>
    s
      .split(/(\d+)/)
      .filter((x) => x.length > 0)
      .map((x) => (/^\d+$/.test(x) ? [1, Number(x)] : [0, x.toLowerCase()]));
  const A = split(a);
  const B = split(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i += 1) {
    if (A[i][0] !== B[i][0]) return A[i][0] - B[i][0];
    if (typeof A[i][1] === 'number') {
      if (A[i][1] !== B[i][1]) return A[i][1] - B[i][1];
    } else if (A[i][1] < B[i][1]) return -1;
    else if (A[i][1] > B[i][1]) return 1;
  }
  return A.length - B.length;
}

function naturalSortPaths(paths) {
  return paths.slice().sort((a, b) => naturalCompare(a, b));
}

function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function detectFormat(buffer, ext) {
  const sig = buffer.subarray(0, 12);
  const ascii = sig.toString('latin1');
  if (ascii.startsWith('%PDF-')) return 'pdf';
  if (sig[0] === 0x50 && sig[1] === 0x4b && sig[2] === 0x03 && sig[3] === 0x04) {
    if (ext === '.pptx' || ext === '.ppsx') return 'pptx';
    return 'docx';
  }
  if (sig[0] === 0xd0 && sig[1] === 0xcf && sig[2] === 0x11 && sig[3] === 0xe0) return 'doc';
  if (sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff) return 'jpg';
  if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47) return 'png';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  if (ascii.startsWith('AT&TFORM')) return 'djvu';
  return null;
}

function cleanBaseName(fileName) {
  let name = fileName;
  name = name.replace(/\.[.\s]*[a-z0-9]{1,8}$/i, '');
  name = name.replace(/\((?:by\s*)?[^)]*@[^)]*\)/gi, ' ');
  name = name.replace(/[\u0000-\u001f\uf000-\uf0ff\ufffd]+/g, ' ');
  name = name.replace(/[_]+/g, ' ');
  name = name.replace(/\s*-\s*/g, ' ');
  name = name.replace(/[.]+/g, ' ');
  name = name.replace(/\b(?:kupdf(?:\s+net)?|pdfdrive|z\s?lib|libgen|1lib|scribd|slideshare)\b/gi, ' ');
  name = name.replace(/\bby\s+[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, ' ');
  name = name.replace(/[^\p{L}\p{N}\s&'()+]/gu, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/([a-z])pdf$/i, '$1');
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/^\d{1,3}\s*[).:-]?\s*/, '');
  return name || 'Untitled resource';
}

function titleCase(text) {
  return text
    .split(' ')
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9&]{2,4}$/.test(word)) return word;
      if (/^[ivx]+$/i.test(word) && word.length <= 4) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'resource'
  );
}

function posixRel(full) {
  return path.relative(SOURCE_DIR, full).split(path.sep).join('/');
}

function slugPath(rel) {
  return rel.split('/').map(slugify).join('/');
}

function licenseFor(t) {
  if (
    /constitution|labor code|republic act|ra 6713|ra 9475|water code|code of conduct|csc form|cs form|answer sheet|scope of examination|environmental protection and management/.test(t)
  ) {
    return 'official';
  }
  if (/filipiknow|teachpinas|leonalyn|pinoy einstein/.test(t)) return 'free-published';
  if (
    /oxford|mcgraw|fowler|dummies|learningexpress|sparkcharts|collins|longman|schaum|really useful|stephen king|advanced reading power|word formation|psychometric|newton|bristoll|ace review|ace tutorial|msa training|complete idiot|^501 |^1001 |barron|kaplan|princeton|practical english grammar|english vocabulary in use|grammar in use/.test(t)
  ) {
    return 'commercial';
  }
  return 'unknown';
}

function classify(cleaned, pathText) {
  const t = `${cleaned} ${pathText}`.toLowerCase();
  let area = 'General Knowledge (GK)';
  if (/verbal|english|grammar|vocabulary|reading|analogy|spelling|comprehension|idioms|sentence|paragraph organization/.test(t)) area = 'English';
  else if (/numerical|math|number|problem solving|fundamental|algebra|geometry|percentage|ratio|average|word problem/.test(t)) area = 'Math';
  else if (/analytical|abstract|logic|reasoning|figure|number series|data interpretation/.test(t)) area = 'Logic & Reasoning';
  else if (/clerical|filing|office|alphabet|spelling|error detection|following instructions/.test(t)) area = 'Clerical';
  let topic = cleaned || 'General';
  return { area, topic };
}

function typeFor(cleaned, pathText) {
  const t = `${cleaned} ${pathText}`.toLowerCase();
  if (/answer|key|solution|answers?\b/.test(t)) return 'answer_key';
  if (/mock|practice exam|simulated/.test(t)) return 'mock';
  if (/reviewer|review/.test(t)) return 'reviewer';
  if (/test|exam|quiz|drill|question/.test(t)) return 'test';
  if (/tip|guide|how to|strategy|technique/.test(t)) return 'tips';
  if (/form|application|cs form|csc form/.test(t)) return 'form';
  if (/learn|lesson|module|primer|basic/.test(t)) return 'learn';
  return 'reference';
}

function levelFor(t) {
  if (/basic|beginner|easy|fundamental|introduction|starter/.test(t)) return 'foundation';
  if (/advanced|challenging|difficult|\bhard\b|expert/.test(t)) return 'challenge';
  return 'standard';
}

function isPdfSignature(buffer) {
  return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source folder not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const policy = readJson(path.join(DATA_DIR, 'policy.json'), { mode: 'all' });
  const overrides = readJson(path.join(DATA_DIR, 'overrides.json'), {});
  const previousReport = readJson(path.join(DATA_DIR, 'pipeline-report.json'), {});
  const convertedTargets = new Set((previousReport.converted || []).map((c) => posixRel(c.target)));
  const mode = policy.mode || 'all';
  const excludedLicenses = Array.isArray(policy.excludeLicenses)
    ? policy.excludeLicenses
    : mode === 'safe-only'
      ? ['commercial', 'unknown']
      : [];

  console.log(`Scanning: ${SOURCE_DIR}`);
  let files = walk(SOURCE_DIR).filter((f) => !convertedTargets.has(posixRel(f)));
  console.log(`Found ${files.length} files`);

  const byHash = new Map();
  const allDirs = new Set();
  let totalBytes = 0;
  let totalNonIgnored = 0;
  const ignored = [];

  for (const full of files) {
    const rel = posixRel(full);
    const base = path.basename(full);
    if (SKIP_NAMES.has(base.toLowerCase())) {
      ignored.push({ file: rel, reason: 'skipped-name' });
      continue;
    }
    const ext = path.extname(base).toLowerCase();
    if (SKIP_EXTS.has(ext)) {
      ignored.push({ file: rel, reason: 'skipped-ext' });
      continue;
    }
    let buffer;
    try {
      buffer = fs.readFileSync(full);
    } catch {
      ignored.push({ file: rel, reason: 'unreadable' });
      continue;
    }
    if (buffer.length === 0) {
      ignored.push({ file: rel, reason: 'zero-byte' });
      continue;
    }
    totalBytes += buffer.length;
    totalNonIgnored += 1;
    const format = detectFormat(buffer, ext);
    if (!format) {
      ignored.push({ file: rel, reason: 'unsupported-format' });
      continue;
    }
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const segments = rel.split('/').slice(0, -1);
    for (let i = 1; i <= segments.length; i += 1) {
      allDirs.add(segments.slice(0, i).join('/'));
    }
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({
      full,
      rel,
      segments,
      modulePath: segments.join('/') || '.',
      format,
      size: buffer.length,
      hash,
      ext,
    });
  }

  const groups = [];
  for (const [hash, group] of byHash.entries()) {
    group.sort((a, b) => {
      if (a.segments.length !== b.segments.length) return a.segments.length - b.segments.length;
      if (a.rel.length !== b.rel.length) return a.rel.length - b.rel.length;
      return a.rel.localeCompare(b.rel);
    });
    const canonical = group[0];
    groups.push({ hash, group, canonical });
  }

  groups.sort((a, b) => naturalCompare(a.canonical.rel, b.canonical.rel));

  const folderFiles = new Map();
  for (const { group } of groups) {
    for (const entry of group) {
      const dir = entry.modulePath;
      if (!folderFiles.has(dir)) folderFiles.set(dir, []);
      folderFiles.get(dir).push(entry);
    }
  }
  const folderPositions = new Map();
  for (const [dir, entries] of folderFiles.entries()) {
    entries.sort((a, b) => naturalCompare(path.basename(a.full), path.basename(b.full)));
    for (let i = 0; i < entries.length; i += 1) {
      folderPositions.set(`${entries[i].hash}::${entries[i].rel}`, i + 1);
    }
  }

  const resources = [];
  const pending = [];
  const duplicateGroups = [];
  const converted = [];
  const fileMapEntries = {};
  const uniqueBytes = [...byHash.keys()]
    .map((hash) => byHash.get(hash)[0].size)
    .reduce((sum, size) => sum + size, 0);

  let occurrenceIndex = new Map();

  for (const { hash, group, canonical } of groups) {
    const fileName = path.basename(canonical.full);
    const cleaned = cleanBaseName(fileName);
    const title = titleCase(cleaned);
    const pathText = canonical.segments.slice(1).join(' ');
    const text = `${pathText} ${cleaned}`.toLowerCase();
    const { area, topic } = classify(cleaned, pathText);
    const type = typeFor(cleaned, pathText);
    const level = levelFor(text);
    const license = licenseFor(text);
    const collections = [...new Set(group.map((g) => (g.segments[0] || 'Library')))].sort();
    const isRenderable = RENDERABLE.has(canonical.format);
    const isPending = PENDING_FORMATS.has(canonical.format);
    const excluded = excludedLicenses.includes(license);

    let sidecarHash = null;
    let renderFormat = canonical.format;
    let objectKey = null;
    let renderable = isRenderable;
    let pendingItem = null;

    if (isPending) {
      const sidecarPath = canonical.full.replace(/\.[^.\\/]+$/, '.pdf');
      let sidecarBuffer;
      try {
        sidecarBuffer = fs.readFileSync(sidecarPath);
      } catch {
        sidecarBuffer = null;
      }
      const moduleDir = canonical.segments.slice(0, -1).join('/') || '.';
      if (sidecarBuffer && sidecarBuffer.length > 0 && isPdfSignature(sidecarBuffer)) {
        sidecarHash = crypto.createHash('sha256').update(sidecarBuffer).digest('hex');
        renderFormat = 'pdf';
        renderable = true;
        objectKey = `resources/${sidecarHash}.pdf`;
        converted.push({
          id: `converted-${hash.slice(0, 8)}`,
          title,
          source: canonical.full,
          target: sidecarPath,
          hash,
          sidecarHash,
          objectKey,
          entries: group.map((g) => ({
            id: `${slugify(title)}-${hash.slice(0, 8)}${group.length > 1 ? `-${group.indexOf(g) + 1}` : ''}`,
            modulePath: g.modulePath || '.',
          })),
        });
      } else {
        renderable = false;
        pendingItem = {
          id: `pending-${hash.slice(0, 8)}`,
          title,
          format: canonical.format,
          sourcePath: canonical.full,
          targetObjectKey: `resources/${slugPath(moduleDir)}/${slugify(title)}-${hash.slice(0, 8)}.pdf`,
          objectKey: null,
          entries: group.map((g) => ({
            id: `${slugify(title)}-${hash.slice(0, 8)}${group.length > 1 ? `-${group.indexOf(g) + 1}` : ''}`,
            modulePath: g.modulePath || '.',
          })),
        };
        pending.push(pendingItem);
      }
    } else if (isRenderable) {
      objectKey = `resources/${hash}.${canonical.format}`;
    }

    if (excluded) continue;

    const pairId = null;
    const hasAnswerKey = false;

    let occurrence = 0;
    for (const entry of group) {
      occurrence += 1;
      const idSuffix = group.length > 1 ? `-${occurrence}` : '';
      const id = `${slugify(title)}-${hash.slice(0, 8)}${idSuffix}`;
      const modulePath = entry.modulePath || '.';
      const moduleName = path.basename(modulePath || '.') || 'Root';
      const parentSegments = entry.segments.slice(0, -2);
      const parentModulePath = parentSegments.length > 0 ? parentSegments.join('/') : null;
      const position = folderPositions.get(`${entry.hash}::${entry.rel}`) || occurrence;
      const record = {
        id,
        title,
        area,
        topic,
        type,
        level,
        license,
        format: canonical.format,
        renderFormat,
        renderable,
        pending: !renderable,
        sourcePath: canonical.rel,
        sizeBytes: entry.size,
        sizeMB: round(entry.size / (1024 * 1024), 2),
        objectKey: renderable ? objectKey : null,
        source: entry.segments[0] || 'Library',
        collections,
        tags: [...new Set([...keywords(`${title} ${topic} ${area}`)])].slice(0, 8),
        modulePath,
        moduleName,
        parentModulePath,
        position,
        copyCount: group.length,
        duplicateOf: occurrence > 1 ? `${slugify(title)}-${hash.slice(0, 8)}` : null,
        pairId,
        hasAnswerKey,
      };
      if (overrides[id]) Object.assign(record, overrides[id]);
      fileMapEntries[id] = {
        sourcePath: (renderFormat === 'pdf' && canonical.format !== 'pdf') ? canonical.full.replace(/\.[^.\\/]+$/, '.pdf') : entry.full,
        objectKey: record.objectKey,
        format: record.format,
        renderFormat: record.renderFormat,
        modulePath: record.modulePath,
        contentHash: hash,
        sizeBytes: record.sizeBytes,
        title: record.title,
      };
      resources.push(record);
    }

    if (group.length > 1) {
      duplicateGroups.push({
        hash,
        copies: group.length,
        title,
        file: canonical.rel,
        objects: group.map((g) => g.rel),
      });
    }
  }

  resources.sort((a, b) => {
    const cmp = naturalCompare(a.modulePath, b.modulePath);
    if (cmp !== 0) return cmp;
    return naturalCompare(a.title, b.title);
  });

  pairAnswerKeys(resources);

  const byArea = {};
  const byType = {};
  const byLicense = {};
  for (const r of resources) {
    byArea[r.area] = (byArea[r.area] || 0) + 1;
    byType[r.type] = (byType[r.type] || 0) + 1;
    byLicense[r.license] = (byLicense[r.license] || 0) + 1;
  }

  const modules = buildModules(resources, allDirs);

  const generatedAt = new Date().toISOString();
  const meta = {
    generatedAt,
    sizes: {
      totalFiles: files.length,
      totalMB: round(totalBytes / (1024 * 1024), 1),
      uniqueObjects: byHash.size,
      uniqueMB: round(uniqueBytes / (1024 * 1024), 1),
      catalogued: resources.length,
      pendingConversion: pending.length,
      converted: converted.length,
      duplicatePhysicalEntries: totalNonIgnored - byHash.size,
      duplicateGroups: duplicateGroups.length,
      ignored: ignored.length,
      mode,
      excludedLicenses,
    },
    byArea,
    byType,
    byLicense,
    areas: AREA_ORDER,
    collections: [...new Set(resources.map((r) => r.source))].sort(),
    modules: modules.totalModules,
    collectionsCount: modules.collections.length,
  };

  const fileMap = fileMapEntries;

  writeJson(path.join(DATA_DIR, 'resources.json'), resources);
  const publicResources = resources.map(({ objectKey, ...rest }) => rest);
  writeJson(path.join(PUBLIC_DATA_DIR, 'resources.json'), publicResources);
  writeJson(path.join(DATA_DIR, 'meta.json'), meta);
  writeJson(path.join(PUBLIC_DATA_DIR, 'meta.json'), meta);
  writeJson(path.join(DATA_DIR, 'file-map.json'), fileMap);
  writeJson(path.join(PUBLIC_DATA_DIR, 'modules.json'), modules);
  writeJson(path.join(DATA_DIR, 'pipeline-report.json'), {
    generatedAt,
    sizes: meta.sizes,
    byArea,
    byType,
    byLicense,
    pending,
    converted,
    ignored,
    duplicateGroups: duplicateGroups.sort((a, b) => b.copies - a.copies).slice(0, 50),
    coverage: {
      totalFiles: files.length,
      catalogued: resources.length,
      pending: pending.length,
      converted: converted.length,
      ignored: ignored.length,
      uniqueObjects: byHash.size,
      duplicatePhysicalEntries: totalNonIgnored - byHash.size,
    },
  });

  console.log('');
  console.log('Catalog built');
  console.log(`  Scanned files : ${meta.sizes.totalFiles}`);
  console.log(`  Unique objects: ${meta.sizes.uniqueObjects} (${meta.sizes.uniqueMB} MB)`);
  console.log(`  Catalogued    : ${meta.sizes.catalogued} (${mode} mode)`);
  console.log(`  Pending       : ${meta.sizes.pendingConversion}`);
  console.log(`  Converted     : ${meta.sizes.converted}`);
  console.log(`  Duplicates    : ${meta.sizes.duplicatePhysicalEntries} copies saved`);
  console.log(`  Ignored       : ${meta.sizes.ignored}`);
  console.log(`  Collections   : ${meta.collectionsCount}`);
  console.log(`  Modules       : ${meta.modules}`);
  console.log('  Output: public/data/resources.json');
  console.log('  Output: public/data/modules.json');
}

function keywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function pairAnswerKeys(resources) {
  const byHash = new Map();
  for (const r of resources) {
    if (!byHash.has(r.duplicateOf ? r.duplicateOf : r.id)) {
      // placeholder
    }
  }
  const unique = new Map();
  for (const r of resources) {
    const key = r.duplicateOf || r.id;
    if (!unique.has(key)) unique.set(key, r);
  }
  const keys = [...unique.values()].filter((r) => r.type === 'answer_key' && r.renderable);
    const tests = [...unique.values()].filter((r) => r.type !== 'answer_key' && r.renderable && r.renderFormat === 'pdf');
  for (const key of keys) {
    const keyTokens = new Set(keywords(key.title));
    let best = null;
    let bestScore = 0;
    for (const test of tests) {
      if (test.area !== key.area) continue;
      if (test.pairId) continue;
      const testTokens = new Set(keywords(test.title));
      let inter = 0;
      for (const token of keyTokens) if (testTokens.has(token)) inter += 1;
      const union = keyTokens.size + testTokens.size - inter;
      const score = union === 0 ? 0 : inter / union;
      if (score > bestScore) {
        bestScore = score;
        best = test;
      }
    }
    if (best && bestScore >= 0.34) {
      key.pairId = best.id;
      best.pairId = key.id;
      best.hasAnswerKey = true;
    }
  }
  for (const r of resources) {
    const base = unique.get(r.duplicateOf || r.id);
    if (base) {
      r.pairId = base.pairId || null;
      r.hasAnswerKey = base.hasAnswerKey || false;
    }
  }
}

function buildModules(resources, allDirs) {
  const dirs = new Map();
  const resourceByModule = new Map();
  const usedIds = new Set();
  for (const modulePath of [...allDirs].sort((a, b) => naturalCompare(a, b))) {
    const segments = modulePath.split('/');
    let id = slugify(modulePath || 'root');
    let n = 1;
    while (usedIds.has(id)) {
      id = `${slugify(modulePath || 'root')}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    dirs.set(modulePath, {
      id,
      name: segments.length === 0 ? 'Root' : segments[segments.length - 1],
      path: modulePath,
      parentPath: segments.length <= 1 ? null : segments.slice(0, -1).join('/'),
      resources: [],
      childModules: [],
      fileCount: 0,
    });
  }
  for (const r of resources) {
    const modulePath = r.modulePath || '.';
    if (!resourceByModule.has(modulePath)) resourceByModule.set(modulePath, []);
    resourceByModule.get(modulePath).push(r);
  }

  for (const [modulePath, node] of dirs.entries()) {
    const list = resourceByModule.get(modulePath) || [];
    list.sort((a, b) => a.position - b.position || naturalCompare(a.title, b.title));
    node.resources = list.map((r) => r.id);
    node.fileCount = list.length;
    const segments = modulePath === '.' ? [] : modulePath.split('/');
    if (segments.length > 0) {
      const parentPath = segments.slice(0, -1).join('/');
      if (parentPath && dirs.has(parentPath)) {
        if (!dirs.get(parentPath).childModules.includes(modulePath)) {
          dirs.get(parentPath).childModules.push(modulePath);
        }
      }
    }
  }

  const allModules = [...dirs.values()].sort((a, b) => naturalCompare(a.path, b.path));
  const collections = allModules.filter((m) => !m.parentPath);
  for (const node of allModules) {
    node.childModules.sort((a, b) => {
      const na = dirs.get(a);
      const nb = dirs.get(b);
      return naturalCompare(na.name, nb.name);
    });
  }

  return {
    collections,
    modules: allModules,
    totalModules: allModules.length,
    totalCollections: collections.length,
  };
}

main();
