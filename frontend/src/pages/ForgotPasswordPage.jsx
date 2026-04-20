import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../services/api'
import { fadeInUp } from '../animations/variants'
import { MotionButton, MotionCard, MotionInput } from '../components/ui/MotionComponents'
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      })
      setSent(true)
      if (data?.devResetUrl) setDevResetUrl(data.devResetUrl)
    } catch (err) {
      setError(err.message || 'Could not send reset email')
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
            {sent ? <MailCheck size={32} /> : <KeyRound size={32} />}
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight text-white"
          >
            {sent ? 'Check your inbox' : 'Forgot your password?'}
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-2 text-slate-400">
            {sent
              ? 'If an account exists for that email, we just sent a password reset link. The link expires soon — so use it promptly.'
              : 'Enter the email tied to your ClassMeet account and we\'ll send you a link to choose a new password.'}
          </motion.p>
        </div>

        {!sent ? (
          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <MotionInput
              label="Email address"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            <MotionButton
              type="submit"
              disabled={loading || !email}
              className="w-full bg-accent-500 text-white hover:bg-accent-400 h-12"
            >
              {loading ? 'Sending…' : 'Send reset link'}
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
        ) : (
          <div className="mt-8 space-y-4 text-sm text-slate-300">
            {devResetUrl ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs">
                <p className="mb-2 font-semibold uppercase tracking-wider text-amber-300">
                  Dev mode
                </p>
                <p className="mb-3 text-amber-100/90">
                  SMTP isn't configured, so the reset link is shown here for
                  convenience. Don't ship this behaviour to production.
                </p>
                <a
                  href={devResetUrl}
                  className="block break-all rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-accent-300 hover:text-accent-200"
                >
                  {devResetUrl}
                </a>
              </div>
            ) : null}

            <p className="text-slate-400">
              Didn't get anything? Check your spam folder, or try again in a
              minute.
            </p>
            <MotionButton
              type="button"
              onClick={() => {
                setSent(false)
                setDevResetUrl('')
              }}
              className="w-full h-11 bg-white/5 hover:bg-white/10"
            >
              Use a different email
            </MotionButton>
          </div>
        )}

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
