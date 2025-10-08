// Minimal HTTP API that reads lessons metadata from MDX files
import { createServer } from 'http'
import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { readFileSync as readFile } from 'fs'
import { pingDb, prisma } from './db'

function json(res: any, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

type LessonMeta = {
  slug: string
  track: string
  order: number
  xpReward: number
  rubric: string
  title: string
  summary?: string
}

const LESSONS_DIR = join(process.cwd(), 'packages', 'lessons', 'content')
const RUBRICS_DIR = join(process.cwd(), 'packages', 'core', 'rubrics')

function parseFrontMatter(src: string): Record<string, any> {
  const start = src.indexOf('---')
  if (start !== 0) return {}
  const end = src.indexOf('\n---', 3)
  if (end === -1) return {}
  const block = src.slice(3, end).trim()
  const obj: Record<string, any> = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let val: any = m[2]
    if (/^\d+$/.test(val)) val = Number(val)
    else if (val === 'true' || val === 'false') val = val === 'true'
    else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    obj[key] = val
  }
  return obj
}

function loadLessons(): LessonMeta[] {
  let files: string[] = []
  try {
    files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.mdx'))
  } catch {
    return []
  }
  const items: LessonMeta[] = []
  for (const file of files) {
    try {
      const src = readFileSync(join(LESSONS_DIR, file), 'utf8')
      const fm = parseFrontMatter(src)
      if (fm.slug && fm.track && fm.order != null && fm.rubric && fm.title) {
        items.push({
          slug: String(fm.slug),
          track: String(fm.track),
          order: Number(fm.order),
          xpReward: Number(fm.xpReward ?? 10),
          rubric: String(fm.rubric),
          title: String(fm.title),
          summary: fm.summary ? String(fm.summary) : undefined
        })
      }
    } catch {
      // ignore bad files
    }
  }
  return items.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

function loadLesson(slug: string): { meta?: LessonMeta; content?: string } {
  try {
    const filename = slug.endsWith('.mdx') ? slug : `${slug}.mdx`
    const full = join(LESSONS_DIR, filename)
    const src = readFileSync(full, 'utf8')
    const fm = parseFrontMatter(src)
    if (!fm.slug) return {}
    const meta: LessonMeta = {
      slug: String(fm.slug),
      track: String(fm.track),
      order: Number(fm.order),
      xpReward: Number(fm.xpReward ?? 10),
      rubric: String(fm.rubric),
      title: String(fm.title),
      summary: fm.summary ? String(fm.summary) : undefined
    }
    return { meta, content: src }
  } catch {
    return {}
  }
}

function loadRubricSummary(rubricId: string): { id: string; kind?: string; version?: number } | undefined {
  try {
    const files = readdirSync(RUBRICS_DIR)
    const match = files.find((f) => basename(f).includes(rubricId)) || files.find((f) => f.startsWith(rubricId))
    const file = match ? join(RUBRICS_DIR, match) : join(RUBRICS_DIR, `${rubricId}.json`)
    const json = JSON.parse(readFileSync(file, 'utf8'))
    return { id: json.id || rubricId, kind: json.kind, version: json.version }
  } catch {
    return { id: rubricId }
  }
}

// Admin helpers: auth, rate limiting, logging
function unauthorized(res: any) {
  res.writeHead(401, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Unauthorized' }))
}

function isAdmin(req: any): boolean {
  const hdr = (req.headers?.['x-admin-key'] || req.headers?.['X-Admin-Key']) as string | undefined
  const key = Array.isArray(hdr) ? hdr[0] : hdr
  const expected = process.env.ADMIN_KEY
  return Boolean(expected && key && key === expected)
}

type Bucket = { count: number; resetAt: number }
const RATE_WINDOW_MS = Number(process.env.ADMIN_RATE_WINDOW_MS || 60_000)
const RATE_MAX = Number(process.env.ADMIN_RATE_MAX || 20)
const buckets = new Map<string, Bucket>()

function rateLimitKey(ip: string | undefined, path: string) {
  return `${ip || 'unknown'}:${path}`
}

function isRateLimited(ip: string | undefined, path: string): boolean {
  const key = rateLimitKey(ip, path)
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS }
    buckets.set(key, b)
  }
  b.count += 1
  return b.count > RATE_MAX
}

function logAdmin(event: string, info: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log('[admin]', new Date().toISOString(), event, info)
}

async function syncRubricsFromFiles() {
  const files = readdirSync(RUBRICS_DIR).filter((f) => f.endsWith('.json'))
  for (const f of files) {
    try {
      const json = JSON.parse(readFile(join(RUBRICS_DIR, f), 'utf8'))
      await prisma.rubric.upsert({
        where: { id: String(json.id || f) },
        update: {
          name: String(json.id || f),
          version: Number(json.version ?? 1),
          kind: String(json.kind || 'quiz'),
          spec: json
        },
        create: {
          id: String(json.id || f),
          name: String(json.id || f),
          version: Number(json.version ?? 1),
          kind: String(json.kind || 'quiz'),
          spec: json
        }
      })
    } catch {
      // skip bad file
    }
  }
}

async function syncLessonsFromFiles() {
  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.mdx'))
  for (const f of files) {
    try {
      const src = readFile(join(LESSONS_DIR, f), 'utf8')
      const fm = parseFrontMatter(src)
      if (!fm.slug) continue
      await prisma.lesson.upsert({
        where: { slug: String(fm.slug) },
        update: {
          track: String(fm.track || ''),
          title: String(fm.title || fm.slug),
          summary: fm.summary ? String(fm.summary) : '',
          contentUrl: `packages/lessons/content/${f}`,
          rubricId: String(fm.rubric || ''),
          order: Number(fm.order ?? 0),
          xpReward: Number(fm.xpReward ?? 10),
          badges: []
        },
        create: {
          slug: String(fm.slug),
          track: String(fm.track || ''),
          title: String(fm.title || fm.slug),
          summary: fm.summary ? String(fm.summary) : '',
          contentUrl: `packages/lessons/content/${f}`,
          rubricId: String(fm.rubric || ''),
          order: Number(fm.order ?? 0),
          xpReward: Number(fm.xpReward ?? 10),
          badges: []
        }
      })
    } catch {
      // skip bad file
    }
  }
}

async function dbLoadLessons(track?: string): Promise<LessonMeta[]> {
  try {
    const where = track ? { track } : {}
    const rows = await prisma.lesson.findMany({
      where,
      orderBy: [{ order: 'asc' }, { slug: 'asc' }]
    })
    return rows.map((r) => ({
      slug: r.slug,
      track: r.track,
      order: r.order,
      xpReward: r.xpReward,
      rubric: r.rubricId,
      title: r.title,
      summary: r.summary || undefined
    }))
  } catch {
    return []
  }
}

async function dbLoadLesson(slug: string): Promise<{ meta?: LessonMeta }> {
  try {
    const r = await prisma.lesson.findUnique({ where: { slug } })
    if (!r) return {}
    return {
      meta: {
        slug: r.slug,
        track: r.track,
        order: r.order,
        xpReward: r.xpReward,
        rubric: r.rubricId,
        title: r.title,
        summary: r.summary || undefined
      }
    }
  } catch {
    return {}
  }
}

async function dbRubricSummary(rubricId: string): Promise<{ id: string; kind?: string; version?: number } | undefined> {
  try {
    const r = await prisma.rubric.findUnique({ where: { id: rubricId } })
    if (!r) return undefined
    return { id: r.id, kind: r.kind as any, version: r.version }
  } catch {
    return undefined
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const method = req.method || 'GET'

  // Service health
  if (method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'api',
      time: new Date().toISOString()
    })
  }

  if (method === 'GET' && url.pathname === '/version') {
    try {
      const pkg = JSON.parse(readFile(join(process.cwd(), 'package.json'), 'utf8'))
      return json(res, 200, { name: pkg.name, version: pkg.version })
    } catch {
      return json(res, 200, { version: '0.0.0' })
    }
  }

  // Lessons
  if (method === 'GET' && url.pathname === '/lessons') {
    const track = url.searchParams.get('track') || undefined
    // Try DB first
    let items = await dbLoadLessons(track || undefined)
    let source: 'db' | 'files' = 'db'
    if (!items || items.length === 0) {
      // Fallback to files
      items = loadLessons().filter((l) => (track ? l.track === track : true))
      source = 'files'
    }
    return json(res, 200, { items, source })
  }

  if (method === 'GET' && url.pathname.startsWith('/lessons/')) {
    const slug = url.pathname.split('/')[2]
    // Try DB first
    let meta = (await dbLoadLesson(slug)).meta
    let source: 'db' | 'files' = 'db'
    if (!meta) {
      // Fallback to files
      meta = loadLesson(slug).meta
      source = 'files'
    }
    if (!meta) return json(res, 404, { error: 'Lesson not found' })
    const rubric = (await dbRubricSummary(meta.rubric)) || loadRubricSummary(meta.rubric)
    return json(res, 200, { ...meta, rubric, source })
  }

  // Admin sync endpoints (dev only)
  if (method === 'POST' && url.pathname === '/admin/rubrics/publish') {
    const ip = (req.socket && (req.socket as any).remoteAddress) || 'unknown'
    if (isRateLimited(ip, url.pathname)) {
      logAdmin('rate_limited', { ip, path: url.pathname })
      res.writeHead(429, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Too Many Requests' }))
    }
    if (!isAdmin(req)) {
      logAdmin('unauthorized', { ip, path: url.pathname })
      return unauthorized(res)
    }
    await syncRubricsFromFiles()
    logAdmin('rubrics_published', { ip })
    return json(res, 200, { ok: true })
  }
  if (method === 'POST' && url.pathname === '/admin/lessons/sync') {
    const ip = (req.socket && (req.socket as any).remoteAddress) || 'unknown'
    if (isRateLimited(ip, url.pathname)) {
      logAdmin('rate_limited', { ip, path: url.pathname })
      res.writeHead(429, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Too Many Requests' }))
    }
    if (!isAdmin(req)) {
      logAdmin('unauthorized', { ip, path: url.pathname })
      return unauthorized(res)
    }
    await syncLessonsFromFiles()
    logAdmin('lessons_synced', { ip })
    return json(res, 200, { ok: true })
  }

  // DB health
  if (method === 'GET' && url.pathname === '/health/db') {
    pingDb()
      .then((ok) => json(res, ok ? 200 : 503, { ok }))
      .catch(() => json(res, 503, { ok: false }))
    return
  }

  // Submissions
  if (method === 'POST' && url.pathname.startsWith('/lessons/') && url.pathname.endsWith('/submit')) {
    return json(res, 202, { submissionId: 'sub_' + Date.now() })
  }

  if (method === 'GET' && url.pathname.startsWith('/submissions/')) {
    const id = url.pathname.split('/')[2]
    return json(res, 200, { id, status: 'queued', score: null, feedback: [] })
  }

  // Progress
  if (method === 'POST' && url.pathname.startsWith('/progress/') && url.pathname.endsWith('/start')) {
    return json(res, 200, { ok: true })
  }
  if (method === 'POST' && url.pathname.startsWith('/progress/') && url.pathname.endsWith('/claim')) {
    return json(res, 200, { awarded: { xp: 10, gems: 0 } })
  }

  // Profile & leaderboard
  if (method === 'GET' && url.pathname === '/me/profile') {
    return json(res, 200, { streak: 0, xp: 0, badges: [] })
  }
  if (method === 'GET' && url.pathname === '/leaderboard') {
    return json(res, 200, { period: 'weekly', top: [] })
  }

  // AI tutor stubs
  if (method === 'POST' && url.pathname === '/ai/tutor/chat') {
    return json(res, 200, { message: 'Hello! What concept should we explore today?' })
  }

  // default
  return json(res, 404, { error: 'Not found' })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${PORT}`)
})
