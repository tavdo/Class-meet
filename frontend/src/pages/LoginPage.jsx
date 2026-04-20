import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp, transitions } from '../animations/variants'
import { MotionButton, MotionCard, MotionInput } from '../components/ui/MotionComponents'
import { LogIn, UserPlus, Globe, Terminal } from 'lucide-react'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      setAuth(data.token, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
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
            <LogIn size={32} />
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-white">
            Welcome back
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-2 text-slate-400">
            Enter your credentials to access your meetings
          </motion.p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <MotionInput
              label="Email address"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div>
              <div className="flex items-center justify-between">
                <span className="ml-1 text-xs font-medium text-slate-400">Password</span>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-accent-400 hover:text-accent-300"
                >
                  Forgot password?
                </Link>
              </div>
              <MotionInput
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <MotionButton
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 text-white hover:bg-accent-400 h-12"
          >
            {loading ? 'Signing in...' : 'Sign in'}
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

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0b0e14] px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <MotionButton className="bg-white/5 hover:bg-white/10" type="button">
              <Globe size={18} className="mr-2" />
              Google
            </MotionButton>
            <MotionButton className="bg-white/5 hover:bg-white/10" type="button">
              <Terminal size={18} className="mr-2" />
              Github
            </MotionButton>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-accent-400 hover:text-accent-300">
            Sign up
          </Link>
        </p>
      </MotionCard>
    </div>
  )
}
