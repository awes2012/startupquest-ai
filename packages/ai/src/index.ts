export type TutorTool =
  | { name: 'fetchLesson'; args: { slug: string } }
  | { name: 'explainConcept'; args: { concept: string; level: 'beginner' | 'intermediate' } }
  | { name: 'suggestProject'; args: { interests: string[] } }

export type TutorCtx = {
  fetchLesson: (slug: string) => Promise<{ slug: string; title: string }>
}

export async function tutorChat(userMsg: string, ctx: TutorCtx) {
  const msg = userMsg.toLowerCase()
  if (msg.includes('explain')) {
    const concept = userMsg.replace(/.*explain\s+/i, '').trim() || 'a core concept'
    return `Here’s a beginner-friendly explanation of ${concept}. (stub)`
  }
  if (msg.includes('project')) {
    return 'Project ideas: 1) Landing page MVP, 2) File renamer CLI, 3) Dataset cleaner.'
  }
  return 'How can I help with AI + entrepreneurship today?'
}

