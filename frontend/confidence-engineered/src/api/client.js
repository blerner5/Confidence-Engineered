export async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorMessage = payload?.error || payload?.message || `${response.status} ${response.statusText}`
    throw new Error(errorMessage)
  }

  return payload
}

export async function postForm(path, formData) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
    },
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorMessage = payload?.error || payload?.message || `${response.status} ${response.statusText}`
    throw new Error(errorMessage)
  }

  return payload
}
