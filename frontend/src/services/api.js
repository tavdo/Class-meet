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

/** Upload a single `File` using multipart/form-data. */
export async function apiUpload(path, { token, file, fieldName = 'file', onProgress } = {}) {
  if (!file) throw new Error('File required')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`, true)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && typeof onProgress === 'function') {
        onProgress(ev.loaded / ev.total)
      }
    }

    xhr.onload = () => {
      let data = null
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        data = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        const err = new Error(
          data?.error || data?.message || `Upload failed (${xhr.status})`
        )
        err.status = xhr.status
        reject(err)
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))

    const form = new FormData()
    form.append(fieldName, file)
    xhr.send(form)
  })
}

/** Resolve a server-relative asset URL (e.g. /uploads/...) to an absolute URL. */
export function assetUrl(urlOrPath) {
  if (!urlOrPath) return ''
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath
  return `${API_URL}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`
}

export { API_URL }
