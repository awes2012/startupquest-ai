async function fetchLessons() {
  try {
    const res = await fetch('http://localhost:4000/lessons', { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items as any[]) || []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const lessons = await fetchLessons()
  return (
    <div>
      <h1>Dashboard</h1>
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
