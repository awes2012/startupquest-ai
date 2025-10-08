type LessonsResponse = { items: any[]; source?: 'db' | 'files' | 'unknown' }

async function fetchLessons(): Promise<LessonsResponse> {
  try {
    const res = await fetch('http://localhost:4000/lessons', { cache: 'no-store' })
    if (!res.ok) return { items: [], source: 'unknown' }
    const data = await res.json()
    return { items: (data.items as any[]) || [], source: (data.source as any) || 'unknown' }
  } catch {
    return { items: [], source: 'unknown' }
  }
}

async function fetchStatus() {
  try {
    const [healthRes, verRes, dbRes] = await Promise.all([
      fetch('http://localhost:4000/health', { cache: 'no-store' }),
      fetch('http://localhost:4000/version', { cache: 'no-store' }),
      fetch('http://localhost:4000/health/db', { cache: 'no-store' })
    ])
    const health = healthRes.ok ? await healthRes.json() : { ok: false }
    const version = verRes.ok ? await verRes.json() : { version: '0.0.0' }
    const db = dbRes.ok ? await dbRes.json() : { ok: false }
    return { health, version, db }
  } catch {
    return { health: { ok: false }, version: { version: '0.0.0' }, db: { ok: false } }
  }
}

export default async function DashboardPage() {
  const [lessonData, status] = await Promise.all([fetchLessons(), fetchStatus()])
  const lessons = lessonData.items
  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        API: {status.health.ok ? 'OK' : 'DOWN'} · DB: {status.db.ok ? 'OK' : 'DOWN'} · Version: {status.version.version}
      </p>
      <p>
        Lessons Source: <span style={{
          padding: '2px 6px', borderRadius: 6,
          background: lessonData.source === 'db' ? '#DCFCE7' : '#E0E7FF',
          color: '#111827', border: '1px solid #CBD5E1'
        }}>{lessonData.source === 'db' ? 'DB-backed' : lessonData.source === 'files' ? 'File-backed' : 'Unknown'}</span>
      </p>
      <ul>
        <li>Streak: 0</li>
        <li>XP: 0</li>
      </ul>
      <h2>Lessons</h2>
      <ul>
        {lessons.map((l) => (
          <li key={l.slug}>
            <a href={`/lessons/${l.slug}`}>{l.title}</a> — {l.track} · +{l.xpReward} XP
          </li>
        ))}
        {lessons.length === 0 && <li>No lessons found (start API on 4000).</li>}
      </ul>
    </div>
  )
}
