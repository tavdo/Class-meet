import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { AnimatedBackground } from './ui/AnimatedBackground'
import { fadeInUp, transitions } from '../animations/variants'
import { LogOut, User } from 'lucide-react'

export function AppShell({ children }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="relative flex min-h-full flex-col">
      <AnimatedBackground />
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={transitions.smooth}
        className="glass-dark sticky top-0 z-50 border-b border-white/5"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="group flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-white shadow-lg shadow-accent-500/20 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-5 w-5">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span>ClassMeet</span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm">
            {user ? (
              <div className="hidden items-center gap-2 text-slate-300 sm:flex">
                <User size={14} className="text-accent-400" />
                <span className="font-medium">{user.displayName}</span>
                <span className="rounded-md bg-surface-700/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                  {user.role}
                </span>
              </div>
            ) : null}
            
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-1.5 font-medium text-slate-200 backdrop-blur-md transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </motion.header>

      <motion.main 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="relative z-10 flex-1"
      >
        {children}
      </motion.main>
    </div>
  )
}
