const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function parseJson(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function apiFetch(path, { token, method = 'GET', body, headers = {} } = {}) {
  const h = {
    ...headers,
  }
  if (token) {
    h.Authorization = `Bearer ${token}`
  }
  if (body !== undefined) {
    h['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await parseJson(res)
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.details = data?.details
    throw err
  }
  return data
}

export { API_URL }
