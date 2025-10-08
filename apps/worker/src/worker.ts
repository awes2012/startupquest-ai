// Minimal worker stub (no external deps in scaffold)
type Job = { id: string; type: string; payload: any }

function processJob(job: Job) {
  switch (job.type) {
    case 'queue:grade:submit':
      return { status: 'passed', score: 1.0 }
    case 'queue:badges:award':
      return { awarded: [] }
    case 'queue:email:notify':
      return { sent: true }
    default:
      return { ok: true }
  }
}

// Simulate polling loop
setInterval(() => {
  const job: Job = { id: String(Date.now()), type: 'noop', payload: {} }
  const result = processJob(job)
  // eslint-disable-next-line no-console
  console.log('[worker] processed', job.type, result)
}, 5000)

