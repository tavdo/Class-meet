import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '../components/AppShell'
import { ChatPanel } from '../components/ChatPanel'
import { MeetControls } from '../components/MeetControls'
import { ParticipantList } from '../components/ParticipantList'
import { VideoStage } from '../components/VideoStage'
import { useMeetingWebRtc } from '../hooks/useMeetingWebRtc'
import { API_URL, apiFetch } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp, transitions, staggerContainer } from '../animations/variants'
import { ChevronLeft, Info, Users, Shield } from 'lucide-react'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)

  const [socket, setSocket] = useState(null)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [socketReady, setSocketReady] = useState(false)
  const [banner, setBanner] = useState('')

  const loadRoom = useCallback(async () => {
    const meta = await apiFetch(`/api/meetings/${encodeURIComponent(roomId)}`)
    setMeetingTitle(meta.meeting.title || 'Meeting')
    const history = await apiFetch(
      `/api/meetings/${encodeURIComponent(roomId)}/messages?limit=80`,
      { token }
    )
    setMessages(history.messages || [])
  }, [roomId, token])

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await loadRoom()
      } catch (e) {
        if (!cancelled) {
          setBanner(e.message || 'Could not load meeting')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, navigate, loadRoom])

  useEffect(() => {
    if (!token || !roomId) return undefined

    const s = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
    })
    setSocket(s)

    function onConnectError(err) {
      setSocketReady(false)
      if (err?.message === 'AUTH_INVALID' || err?.message === 'AUTH_REQUIRED') {
        setBanner('Session expired — please sign in again.')
        logout()
        navigate('/login', { replace: true })
      } else {
        setBanner(err?.message || 'Could not connect to realtime server.')
      }
    }

    function onRoomState(payload) {
      setParticipants(payload.participants || [])
    }

    function onChatMessage(payload) {
      setMessages((prev) => [...prev, payload.message])
    }

    function onConnect() {
      setBanner('')
      s.emit('join_room', { roomId }, (res) => {
        if (!res?.ok) {
          setSocketReady(false)
          if (res?.error === 'MEETING_NOT_FOUND') {
            setBanner('This meeting no longer exists.')
          } else if (res?.error === 'ROOM_FULL') {
            setBanner('Room is full.')
          } else {
            setBanner('Could not join room.')
          }
          return
        }
        setParticipants(res.participants || [])
        setSocketReady(true)
      })
    }

    s.on('connect', onConnect)
    s.on('connect_error', onConnectError)
    s.on('room_state', onRoomState)
    s.on('chat_message', onChatMessage)

    return () => {
      s.emit('leave_room', { roomId })
      s.off('connect', onConnect)
      s.off('connect_error', onConnectError)
      s.off('room_state', onRoomState)
      s.off('chat_message', onChatMessage)
      s.disconnect()
      setSocket(null)
      setSocketReady(false)
    }
  }, [token, roomId, navigate, logout])

  const {
    localStream,
    remoteStreams,
    mediaError,
    audioOn,
    videoOn,
    screenOn,
    toggleMic,
    toggleCam,
    toggleScreenShare,
  } = useMeetingWebRtc(socket, socketReady, roomId, participants)

  function sendChat(text) {
    if (!socket || !socketReady) return
    socket.emit('chat_message', { text }, (res) => {
      if (!res?.ok && res?.error === 'NOT_IN_ROOM') {
        setBanner('Lost room sync — refresh the page.')
      }
    })
  }

  const chatStatus = socketReady ? 'Connected' : 'Connecting…'

  // Performance mode: Reduce animations if many participants or screen sharing
  const performanceMode = useMemo(() => {
    return participants.length > 4 || screenOn
  }, [participants.length, screenOn])

  return (
    <AppShell>
      <AnimatedBackground performanceMode={performanceMode} />
      
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-6">
        {/* Room Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ x: -4 }}
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </motion.button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{meetingTitle}</h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                  <Shield size={10} />
                  Encrypted
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-500">
                <Info size={12} />
                Room: <span className="text-slate-300">{roomId}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 border border-white/5">
              <Users size={16} className="text-accent-400" />
              <span>{participants.length} Active</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
            >
              Leave
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {banner && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
                {banner}
              </div>
            </motion.div>
          )}

          {mediaError && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                {mediaError} You can still use chat.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mt-8 flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch"
        >
          <motion.section 
            variants={fadeInUp}
            className="flex min-h-0 min-w-0 flex-1 flex-col lg:max-w-[min(100%,1000px)]"
          >
            <VideoStage
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              localSocketId={socket?.id}
            />
            <MeetControls
              audioOn={audioOn}
              videoOn={videoOn}
              screenOn={screenOn}
              onToggleMic={toggleMic}
              onToggleCam={toggleCam}
              onToggleScreen={toggleScreenShare}
              socketReady={socketReady}
              hasLocalMedia={Boolean(localStream)}
            />
          </motion.section>

          <motion.aside 
            variants={fadeInUp}
            className="flex w-full shrink-0 flex-col gap-6 lg:w-[380px]"
          >
            <ChatPanel
              className="min-h-[300px] flex-1 lg:min-h-0"
              messages={messages}
              onSend={sendChat}
              disabled={!socketReady}
              status={chatStatus}
            />
            <ParticipantList 
              className="max-h-[300px] lg:max-h-[35%]" 
              participants={participants} 
            />
          </motion.aside>
        </motion.div>
      </div>
    </AppShell>
  )
}
