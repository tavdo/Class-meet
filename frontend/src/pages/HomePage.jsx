import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppShell } from '../components/AppShell'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp, staggerContainer } from '../animations/variants'
import { MotionButton, MotionCard } from '../components/ui/MotionComponents'
import { Plus, Video, Calendar, Users, ArrowRight, ShieldCheck } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [joinId, setJoinId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createMeeting() {
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/meetings', {
        token,
        method: 'POST',
        body: {},
      })
      navigate(`/room/${data.meeting.roomId}`)
    } catch (e) {
      setError(e.message || 'Could not create meeting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20 lg:py-24">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-16 lg:grid-cols-2 lg:items-center"
        >
          {/* Left Column: Hero Content */}
          <div className="space-y-8">
            <motion.div variants={fadeInUp} className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-400 border border-accent-500/20">
                <ShieldCheck size={14} />
                Secure & Performant
              </span>
              <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
                Meetings that feel <span className="text-accent-400">alive.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                Experience high-performance video calls with a modern, animated interface designed for the next generation of collaboration.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col gap-4 sm:flex-row">
              <MotionButton 
                onClick={createMeeting}
                disabled={loading}
                className="bg-accent-500 text-white hover:bg-accent-400 h-12 px-8 text-base shadow-lg shadow-accent-500/20"
              >
                <Plus className="mr-2" size={20} />
                {loading ? 'Creating...' : 'New Meeting'}
              </MotionButton>
              <div className="relative group flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/5 bg-white/5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-all hover:bg-white/10"
                />
                <button
                  onClick={() => joinId.trim() && navigate(`/room/${joinId.trim()}`)}
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-lg bg-surface-700 text-white hover:bg-surface-600 transition-colors flex"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>

            {error ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-red-400">
                {error}
              </motion.p>
            ) : null}

            <motion.div variants={fadeInUp} className="flex items-center gap-8 pt-4 grayscale opacity-50">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Video size={18} />
                <span>HD Video</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users size={18} />
                <span>25+ Participants</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar size={18} />
                <span>Scheduling</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Feature Cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            <MotionCard className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Video size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Crystal Clear</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Optimized WebRTC streams for minimal latency and high-definition video quality.
                </p>
              </div>
            </MotionCard>

            <MotionCard className="p-6 space-y-4 sm:translate-y-8">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">End-to-End</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Your meetings are private and secure, with industry-standard encryption protocols.
                </p>
              </div>
            </MotionCard>

            <MotionCard className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Low Latency</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Experience real-time interaction without the delay, powered by advanced networking.
                </p>
              </div>
            </MotionCard>

            <MotionCard className="p-6 space-y-4 sm:translate-y-8">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Massive Teams</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Collaborate with dozens of teammates seamlessly in a single virtual space.
                </p>
              </div>
            </MotionCard>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}
