import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { transitions, scaleUp } from '../animations/variants'
import { User, MicOff } from 'lucide-react'

function VideoTile({ stream, label, muted, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !stream) return
    el.srcObject = stream
    const p = el.play?.()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {})
    }
    return () => {
      el.srcObject = null
    }
  }, [stream])

  return (
    <motion.div
      layout
      variants={scaleUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.spring}
      className={`glass group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40 shadow-xl ${className || ''}`}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Overlay controls/info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg">
              <User size={12} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {label}
            </span>
          </div>
          {muted && <MicOff size={14} className="text-red-400" />}
        </div>
      </div>

      {/* Small label for when overlay is hidden */}
      <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md transition-opacity duration-300 group-hover:opacity-0">
        {label}
      </div>
    </motion.div>
  )
}

export function VideoStage({ localStream, remoteStreams, participants, localSocketId }) {
  const remoteEntries = useMemo(() => {
    const list = Object.entries(remoteStreams || {})
    return list.sort(([a], [b]) => a.localeCompare(b))
  }, [remoteStreams])

  const labelFor = useMemo(() => {
    const map = new Map()
    ;(participants || []).forEach((p) => {
      if (p.socketId) map.set(p.socketId, p.displayName || 'Guest')
    })
    return map
  }, [participants])

  const tiles = []

  tiles.push({
    key: `local-${localSocketId || 'me'}`,
    stream: localStream,
    label: 'You',
    muted: true,
  })

  remoteEntries.forEach(([socketId, stream]) => {
    tiles.push({
      key: socketId,
      stream,
      label: labelFor.get(socketId) || 'Participant',
      muted: false,
    })
  })

  const gridClass =
    tiles.length <= 2
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
      : tiles.length <= 4
        ? 'grid grid-cols-2 gap-3'
        : 'grid grid-cols-2 gap-3 lg:grid-cols-3'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`min-h-[220px] flex-1 ${gridClass} content-start`}>
        <AnimatePresence mode="popLayout">
          {tiles.map((t) => (
            <VideoTile
              key={t.key}
              stream={t.stream}
              label={t.label}
              muted={t.muted}
              className="aspect-video min-h-[140px]"
            />
          ))}
        </AnimatePresence>
      </div>
      {!localStream ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <div className="flex space-x-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-accent-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-accent-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-accent-500"></div>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Requesting camera access… please allow the prompt.
          </p>
        </motion.div>
      ) : null}
    </div>
  )
}
