import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, transitions } from '../animations/variants'
import { Send, Hash, MessageSquare } from 'lucide-react'

export function ChatPanel({ messages, onSend, disabled, status, className = '' }) {
  const bottomRef = useRef(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function onSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    onSend(text)
    setDraft('')
  }

  return (
    <div
      className={`glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-accent-400" />
          <h2 className="text-sm font-bold tracking-tight text-white">Meeting Chat</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${disabled ? 'bg-amber-500' : 'bg-accent-500 animate-pulse'}`} />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{status}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={m.id || `msg-${idx}-${m.createdAt}`}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={transitions.spring}
              className="group flex flex-col items-start gap-1"
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-tight ${m.senderRole === 'teacher' ? 'text-amber-400' : 'text-accent-400'}`}>
                  {m.senderName}
                </span>
                <span className="text-[9px] font-medium text-slate-600">
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="rounded-2xl rounded-tl-none bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors group-hover:bg-white/10">
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/5 bg-white/5 p-3">
        <div className="relative flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={disabled ? 'Connecting…' : 'Type a message...'}
            disabled={disabled}
            className="flex-1 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-accent-500/50 focus:bg-slate-950 focus:ring-4 focus:ring-accent-500/10 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-400 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
