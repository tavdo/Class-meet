import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, transitions } from '../animations/variants'
import { Users, GraduationCap, User } from 'lucide-react'

export function ParticipantList({ participants, className = '' }) {
  return (
    <div
      className={`glass flex h-full flex-col overflow-hidden rounded-2xl shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-accent-400" />
          <h2 className="text-sm font-bold tracking-tight text-white">Participants</h2>
        </div>
        <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-400 border border-accent-400/20">
          {participants.length}
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        <AnimatePresence>
          {participants.length === 0 ? (
            <motion.li 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-8 text-center"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-600">
                <Users size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">Wait for others to join...</p>
            </motion.li>
          ) : (
            participants.map((p, idx) => (
              <motion.li
                key={p.socketId || idx}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ ...transitions.smooth, delay: idx * 0.05 }}
                className="group mb-1 flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-slate-900 group-hover:scale-110 transition-transform ${p.role === 'teacher' ? 'text-amber-400' : 'text-accent-400'}`}>
                    {p.role === 'teacher' ? <GraduationCap size={16} /> : <User size={16} />}
                  </div>
                  <span className="truncate text-sm font-medium text-slate-200">{p.displayName}</span>
                </div>
                
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  p.role === 'teacher' 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                    : 'bg-slate-800 text-slate-400 border-white/5'
                }`}>
                  {p.role}
                </span>
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ul>
    </div>
  )
}
