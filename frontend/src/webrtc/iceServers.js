/**
 * STUN is required for NAT traversal in mesh WebRTC.
 * TURN can be added later via VITE_TURN_URLS as JSON for restrictive networks.
 */
function parseJsonArray(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

/** @returns {RTCIceServer[]} */
export function getDefaultIceServers() {
  const extra = parseJsonArray(import.meta.env.VITE_EXTRA_ICE_SERVERS)
  const defaults = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
  return extra && extra.length ? [...defaults, ...extra] : defaults
}
