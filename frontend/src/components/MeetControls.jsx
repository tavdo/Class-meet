import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff } from 'lucide-react'
import { transitions } from '../animations/variants'

export function MeetControls({
  audioOn,
  videoOn,
  screenOn,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  socketReady,
  hasLocalMedia,
}) {
  const mediaLocked = !socketReady || !hasLocalMedia

  const ControlButton = ({ active, icon: Icon, activeIcon: ActiveIcon, onClick, disabled, variant = 'default' }) => (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      transition={transitions.spring}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors shadow-lg
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed border-white/5 bg-white/5' : 
          variant === 'danger' ? 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-red-500/40' :
          active ? 'border-accent-500/20 bg-accent-500/10 text-accent-400 hover:bg-accent-500 hover:text-white hover:shadow-accent-500/40' : 
          'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active ? 'active' : 'inactive'}
          initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2 }}
        >
          {active ? <Icon size={20} /> : (ActiveIcon ? <ActiveIcon size={20} /> : <Icon size={20} />)}
        </motion.div>
      </AnimatePresence>
      
      {/* Active Indicator Dot */}
      {active && !disabled && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500"></span>
        </span>
      )}
    </motion.button>
  )

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-white/5 pt-6"
    >
      <ControlButton
        active={audioOn}
        icon={audioOn ? Mic : MicOff}
        onClick={onToggleMic}
        disabled={mediaLocked}
        variant={!audioOn && !mediaLocked ? 'danger' : 'default'}
      />
      
      <ControlButton
        active={videoOn}
        icon={videoOn ? Video : VideoOff}
        onClick={onToggleCam}
        disabled={mediaLocked}
        variant={!videoOn && !mediaLocked ? 'danger' : 'default'}
      />
      
      <ControlButton
        active={screenOn}
        icon={MonitorUp}
        activeIcon={MonitorOff}
        onClick={onToggleScreen}
        disabled={!socketReady}
      />

      <div className="h-8 w-px bg-white/5 mx-2" />

      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 1)' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.location.href = '/'}
        className="flex h-12 items-center gap-3 rounded-2xl bg-red-500/10 px-6 font-bold text-red-500 border border-red-500/20 hover:text-white transition-all shadow-lg hover:shadow-red-500/40"
      >
        <PhoneOff size={20} />
        <span className="hidden sm:inline">Leave Room</span>
      </motion.button>
    </motion.div>
  )
}
