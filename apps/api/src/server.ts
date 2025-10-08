// Minimal HTTP API that reads lessons metadata from MDX files
import { createServer } from 'http'
import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

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

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const method = req.method || 'GET'

  // Lessons
  if (method === 'GET' && url.pathname === '/lessons') {
    const track = url.searchParams.get('track') || undefined
    const items = loadLessons().filter((l) => (track ? l.track === track : true))
    return json(res, 200, { items })
  }

  if (method === 'GET' && url.pathname.startsWith('/lessons/')) {
    const slug = url.pathname.split('/')[2]
    const { meta } = loadLesson(slug)
    if (!meta) return json(res, 404, { error: 'Lesson not found' })
    const rubric = loadRubricSummary(meta.rubric)
    return json(res, 200, { ...meta, rubric })
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
