"use client"

import { useState } from 'react'

export default function AdminPage() {
  const [key, setKey] = useState('')
  const [msg, setMsg] = useState('')

  async function call(path: string) {
    setMsg('Working...')
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })
      const data = await res.json()
      setMsg(`${res.status}: ${JSON.stringify(data)}`)
    } catch (e) {
      setMsg('Request failed')
    }
  }

  return (
    <div>
      <h1>Admin</h1>
      <p>Use your admin key to run sync tasks.</p>
      <input
        type="password"
        placeholder="Admin key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        style={{ padding: 8, width: 320, marginRight: 8 }}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => call('/api/admin/rubrics/publish')}>Publish Rubrics → DB</button>
        <button onClick={() => call('/api/admin/lessons/sync')}>Sync Lessons → DB</button>
      </div>
      <pre style={{ marginTop: 16 }}>{msg}</pre>
    </div>
  )
}

