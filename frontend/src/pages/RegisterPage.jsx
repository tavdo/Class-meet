import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp, transitions } from '../animations/variants'
import { MotionButton, MotionCard, MotionInput } from '../components/ui/MotionComponents'
import { UserPlus, Globe, Terminal } from 'lucide-react'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { email, password, displayName, role },
      })
      setAuth(data.token, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <AnimatedBackground />
      
      <MotionCard className="w-full max-w-lg p-8 sm:p-10">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-xl shadow-accent-500/20"
          >
            <UserPlus size={32} />
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-white">
            Create an account
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-2 text-slate-400">
            Join ClassMeet and start hosting your own meetings
          </motion.p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <MotionInput
              label="Display Name"
              placeholder="John Doe"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 ml-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-[46px] rounded-xl border border-white/5 bg-slate-950/50 px-4 text-sm text-white transition-all focus:border-accent-500/50 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>

          <MotionInput
            label="Email address"
            type="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <MotionInput
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <MotionInput
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <MotionButton
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 text-white hover:bg-accent-400 h-12"
          >
            {loading ? 'Creating account...' : 'Create account'}
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

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-400 hover:text-accent-300">
            Sign in
          </Link>
        </p>
      </MotionCard>
    </div>
  )
}
