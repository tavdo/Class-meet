import { useAuthStore } from '../store/authStore'

/** Returns the current JWT or null (Phase 1 — REST + Socket auth). */
export function useAuthToken() {
  return useAuthStore((s) => s.token)
}
