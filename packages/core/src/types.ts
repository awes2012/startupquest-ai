// Shared types for lessons, rubrics, events

export type Track = 'foundations' | 'ai-basics' | 'mvp' | 'growth'

export type LessonMeta = {
  slug: string
  track: Track
  order: number
  xpReward: number
  title: string
  summary?: string
  rubric: string
}

export type RubricSpec = {
  id: string
  kind: 'code' | 'business' | 'quiz'
  version?: number
  spec?: unknown
}

export type Profile = {
  streak: number
  xp: number
  badges: string[]
}

export type EventName =
  | 'lesson_view'
  | 'submission_pass'
  | 'streak_continue'
  | 'ai_chat_turn'

