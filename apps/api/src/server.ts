// Minimal Express-like API using built-in http to avoid deps during scaffold
import { createServer } from 'http'

function json(res: any, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const method = req.method || 'GET'

  // Lessons
  if (method === 'GET' && url.pathname === '/lessons') {
    return json(res, 200, { items: [
      { slug: 'foundations-intro', track: 'foundations', title: 'Foundations Intro', state: 'not_started', xpReward: 10 },
      { slug: 'ai-basics-101', track: 'ai-basics', title: 'AI Basics 101', state: 'not_started', xpReward: 10 }
    ]})
  }

  if (method === 'GET' && url.pathname.startsWith('/lessons/')) {
    const slug = url.pathname.split('/')[2]
    return json(res, 200, { slug, title: `Lesson: ${slug}`, rubric: { id: 'sample', kind: 'quiz' }, starter: {} })
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

