import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp } from '../animations/variants'
import { MotionButton, MotionCard, MotionInput } from '../components/ui/MotionComponents'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      })
      setAuth(data.token, data.user)
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (err) {
      setError(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <AnimatedBackground />

      <MotionCard className="w-full max-w-md p-8 sm:p-10">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-xl shadow-accent-500/20"
          >
            {done ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight text-white"
          >
            {done ? 'Password updated' : 'Choose a new password'}
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-2 text-slate-400">
            {done
              ? 'You\'re signed in. Redirecting to your dashboard…'
              : 'Pick something memorable with at least 8 characters.'}
          </motion.p>
        </div>

        {!done ? (
          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <MotionInput
              label="New password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              autoFocus
            />
            <MotionInput
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />

            <MotionButton
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-accent-500 text-white hover:bg-accent-400 h-12"
            >
              {loading ? 'Updating…' : 'Reset password'}
            </MotionButton>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-center text-sm font-medium text-red-400"
              >
                {error}
              </motion.p>
            )}
          </form>
        ) : null}

        <p className="mt-8 text-center text-sm text-slate-400">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-accent-400 hover:text-accent-300"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </MotionCard>
    </div>
  )
}
