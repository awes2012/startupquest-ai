interface Props { params: { slug: string } }

async function fetchLesson(slug: string) {
  try {
    const res = await fetch(`http://localhost:4000/lessons/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function LessonPage({ params }: Props) {
  const lesson = await fetchLesson(params.slug)
  if (!lesson) return <div>Lesson not found. Ensure API is running.</div>
  return (
    <div>
      <h1>{lesson.title}</h1>
      <p>{lesson.summary}</p>
      <p>
        Track: {lesson.track} · XP: +{lesson.xpReward} · Rubric: {lesson.rubric?.id || lesson.rubric}
      </p>
      <section>
        <h2>TutorChat</h2>
        <p>(stream placeholder)</p>
      </section>
      <section>
        <h2>Submission</h2>
        <p>Upload or submit code/answers (stub)</p>
      </section>
    </div>
  )
}
