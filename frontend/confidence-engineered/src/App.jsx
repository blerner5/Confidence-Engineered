import { useState } from 'react'
import './App.css'

const pretty = (obj) => JSON.stringify(obj, null, 2)

function App() {
  const [jobDescription, setJobDescription] = useState('Software Engineer role focused on backend APIs and collaboration.')
  const [background, setBackground] = useState('I have 3 years of backend development experience with Python and SQL.')
  const [topicsInput, setTopicsInput] = useState('teamwork, leadership, conflict resolution')
  const [sessionId, setSessionId] = useState('')
  const [responseText, setResponseText] = useState('I led a migration and coordinated with product and QA to ship safely.')
  const [debug, setDebug] = useState(true)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const apiPost = async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug': debug ? '1' : '0',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${pretty(data)}`)
    }
    return data
  }

  const startSession = async () => {
    setError('')
    try {
      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const data = await apiPost('/api/session/start', {
        job_description: jobDescription,
        background,
        topics,
      })
      setSessionId(data.session_id || '')
      setResult(pretty(data))
    } catch (err) {
      setError(String(err))
    }
  }

  const respondSession = async () => {
    setError('')
    try {
      const data = await apiPost('/api/session/respond', {
        session_id: sessionId,
        response: responseText,
      })
      setResult(pretty(data))
    } catch (err) {
      setError(String(err))
    }
  }

  const endSession = async () => {
    setError('')
    try {
      const data = await apiPost('/api/session/end', {
        session_id: sessionId,
      })
      setResult(pretty(data))
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Confidence Engineered API Tester</h1>

      <label>Job Description</label>
      <textarea rows={3} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />

      <label>Background</label>
      <textarea rows={3} value={background} onChange={(e) => setBackground(e.target.value)} />

      <label>Topics (comma-separated)</label>
      <input value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)} />

      <label>Session ID</label>
      <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} />

      <label>Your Response</label>
      <textarea rows={3} value={responseText} onChange={(e) => setResponseText(e.target.value)} />

      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
        Enable Debug
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={startSession}>POST /api/session/start</button>
        <button onClick={respondSession} disabled={!sessionId}>POST /api/session/respond</button>
        <button onClick={endSession} disabled={!sessionId}>POST /api/session/end</button>
      </div>

      {error ? (
        <pre style={{ color: 'crimson', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{error}</pre>
      ) : null}
      <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{result}</pre>
    </main>
  )
}

export default App
