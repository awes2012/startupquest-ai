export async function POST(request: Request) {
  try {
    const { key } = await request.json()
    const res = await fetch('http://localhost:4000/admin/rubrics/publish', {
      method: 'POST',
      headers: { 'x-admin-key': key || '' }
    })
    const data = await res.json().catch(() => ({}))
    return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

