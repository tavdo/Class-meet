import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, transitions } from '../animations/variants'
import {
  Download,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from 'lucide-react'
import { apiUpload, assetUrl } from '../services/api'

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function AttachmentPreview({ attachment }) {
  if (!attachment) return null
  const isImage = attachment.mime?.startsWith('image/')
  const href = assetUrl(attachment.url)

  if (isImage) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group mt-1 block overflow-hidden rounded-xl border border-white/5 bg-slate-950/40"
      >
        <img
          src={href}
          alt={attachment.name}
          className="max-h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-400">
          <span className="truncate">{attachment.name}</span>
          <span>{formatBytes(attachment.size)}</span>
        </div>
      </a>
    )
  }

  const Icon = attachment.mime?.startsWith('video/')
    ? ImageIcon
    : attachment.mime === 'application/pdf'
      ? FileText
      : FileIcon

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className="mt-1 flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-400">
        <Icon size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{attachment.name}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {attachment.mime?.split('/')[1] || 'file'} · {formatBytes(attachment.size)}
        </span>
      </span>
      <Download size={16} className="shrink-0 text-slate-400" />
    </a>
  )
}

export function ChatPanel({
  messages,
  onSend,
  disabled,
  status,
  className = '',
  roomId,
  token,
}) {
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(null) // { file, progress }
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleFile(file) {
    if (!file || !roomId || !token) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError('File exceeds 25 MB limit.')
      return
    }
    setUploadError('')
    setPending({ file, progress: 0, attachment: null })
    try {
      const data = await apiUpload(
        `/api/meetings/${encodeURIComponent(roomId)}/attachments`,
        {
          token,
          file,
          fieldName: 'file',
          onProgress: (p) =>
            setPending((prev) => (prev ? { ...prev, progress: p } : prev)),
        }
      )
      setPending((prev) =>
        prev ? { ...prev, progress: 1, attachment: data.attachment } : prev
      )
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
      setPending(null)
    }
  }

  function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleFile(file)
  }

  function cancelPending() {
    setPending(null)
    setUploadError('')
  }

  function onSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    const attachment = pending?.attachment || null
    if (!text && !attachment) return
    if (disabled) return
    onSend(text, attachment)
    setDraft('')
    setPending(null)
  }

  const sendDisabled =
    disabled || (!draft.trim() && !pending?.attachment) || (pending && !pending.attachment)

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
              {m.body ? (
                <div className="rounded-2xl rounded-tl-none bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors group-hover:bg-white/10">
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              ) : null}
              {m.attachment ? (
                <div className="w-full max-w-sm">
                  <AttachmentPreview attachment={m.attachment} />
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="space-y-2 border-t border-white/5 bg-white/5 p-3">
        {pending ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
            {pending.attachment ? (
              <Paperclip size={14} className="text-accent-400" />
            ) : (
              <Loader2 size={14} className="animate-spin text-accent-400" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-slate-200">
                {pending.file.name}
              </span>
              <span className="text-[10px] text-slate-500">
                {pending.attachment
                  ? `${formatBytes(pending.file.size)} · ready`
                  : `${Math.round((pending.progress || 0) * 100)}% · ${formatBytes(pending.file.size)}`}
              </span>
              {!pending.attachment ? (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all"
                    style={{ width: `${Math.round((pending.progress || 0) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={cancelPending}
              className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {uploadError ? (
          <p className="text-xs font-medium text-red-400">{uploadError}</p>
        ) : null}

        <div className="relative flex gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onPick}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || Boolean(pending && !pending.attachment)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-slate-950/50 text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={disabled ? 'Connecting…' : 'Type a message...'}
            disabled={disabled}
            className="flex-1 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-accent-500/50 focus:bg-slate-950 focus:ring-4 focus:ring-accent-500/10 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sendDisabled}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-400 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
