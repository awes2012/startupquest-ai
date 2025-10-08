export type EventName =
  | 'lesson_view'
  | 'submission_pass'
  | 'streak_continue'
  | 'ai_chat_turn'

export type Event<T extends EventName = EventName> = {
  name: T
  userId?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export function track<T extends EventName>(name: T, meta: Record<string, unknown> = {}) {
  const evt: Event<T> = { name, meta, createdAt: new Date().toISOString() }
  // eslint-disable-next-line no-console
  console.log('[analytics]', evt)
  return evt
}

