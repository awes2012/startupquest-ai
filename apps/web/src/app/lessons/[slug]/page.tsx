interface Props { params: { slug: string } }

export default function LessonPage({ params }: Props) {
  return (
    <div>
      <h1>Lesson: {params.slug}</h1>
      <p>Lesson content will render here (MDX).</p>
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

