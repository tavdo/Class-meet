import { useCallback, useEffect, useRef, useState } from 'react'
import { getDefaultIceServers } from '../webrtc/iceServers'

function shouldInitiateOffer(mySocketId, peerSocketId) {
  return mySocketId < peerSocketId
}

function mergeRemoteStream(prev, incoming) {
  if (!prev) return incoming
  const merged = new MediaStream()
  prev.getTracks().forEach((t) => merged.addTrack(t))
  incoming.getTracks().forEach((t) => merged.addTrack(t))
  return merged
}

/**
 * Mesh WebRTC: one RTCPeerConnection per remote socket id.
 * Signaling: Socket.io relays offer / answer / ICE (see backend `webrtc_*` events).
 * Screen share: replaces the outbound video RTP sender track on every PC.
 */
export function useMeetingWebRtc(socket, inRoom, roomId, participants) {
  const peersRef = useRef(new Map())
  const pendingOffersRef = useRef(new Map())
  const cameraStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const cameraVideoTrackRef = useRef(null)
  const screenOnRef = useRef(false)
  const videoOnRef = useRef(true)

  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [mediaError, setMediaError] = useState('')
  const [audioOn, setAudioOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [screenOn, setScreenOn] = useState(false)

  const replaceScreenTrackOnAllPeers = useCallback(async (track) => {
    const tasks = []
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
      if (sender && track) tasks.push(sender.replaceTrack(track))
    })
    await Promise.all(tasks)
  }, [])

  const attachLocalTracks = useCallback((pc) => {
    const stream = cameraStreamRef.current
    if (!stream) return
    stream.getTracks().forEach((track) => {
      const exists = pc.getSenders().some((s) => s.track === track)
      if (!exists) {
        pc.addTrack(track, stream)
      }
    })
  }, [])

  const closePeer = useCallback((peerSocketId) => {
    const pc = peersRef.current.get(peerSocketId)
    if (pc) {
      pc.close()
      peersRef.current.delete(peerSocketId)
    }
    setRemoteStreams((prev) => {
      if (!prev[peerSocketId]) return prev
      const next = { ...prev }
      delete next[peerSocketId]
      return next
    })
  }, [])

  const createPeerConnection = useCallback(
    (peerSocketId) => {
      const pc = new RTCPeerConnection({ iceServers: getDefaultIceServers() })

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !socket?.connected) return
        socket.emit('webrtc_ice_candidate', {
          targetSocketId: peerSocketId,
          candidate: ev.candidate.toJSON(),
        })
      }

      pc.ontrack = (ev) => {
        const incoming = ev.streams[0] || new MediaStream([ev.track])
        setRemoteStreams((prev) => ({
          ...prev,
          [peerSocketId]: mergeRemoteStream(prev[peerSocketId], incoming),
        }))
      }

      return pc
    },
    [socket]
  )

  const ensurePeer = useCallback(
    async (peerSocketId) => {
      let pc = peersRef.current.get(peerSocketId)
      if (pc) return pc
      pc = createPeerConnection(peerSocketId)
      peersRef.current.set(peerSocketId, pc)
      attachLocalTracks(pc)
      if (screenOnRef.current && screenStreamRef.current) {
        const vt = screenStreamRef.current.getVideoTracks()[0]
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && vt) await sender.replaceTrack(vt)
      }
      return pc
    },
    [attachLocalTracks, createPeerConnection]
  )

  const emitOffer = useCallback(
    async (peerSocketId) => {
      if (!socket?.connected || !cameraStreamRef.current) return
      const myId = socket.id
      if (!shouldInitiateOffer(myId, peerSocketId)) return

      try {
        const pc = await ensurePeer(peerSocketId)
        if (pc.signalingState !== 'stable') return

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await new Promise((resolve, reject) => {
          socket.emit(
            'webrtc_offer',
            { targetSocketId: peerSocketId, sdp: pc.localDescription.toJSON() },
            (res) => {
              if (res?.ok) resolve()
              else reject(new Error(res?.error || 'OFFER_FAILED'))
            }
          )
        })
      } catch {
        /* negotiation may fail transiently while peers spin up */
      }
    },
    [ensurePeer, socket]
  )

  const handleIncomingOffer = useCallback(
    async (fromSocketId, sdp) => {
      if (!cameraStreamRef.current || !socket?.connected) return
      try {
        const pc = await ensurePeer(fromSocketId)
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await new Promise((resolve, reject) => {
          socket.emit(
            'webrtc_answer',
            { targetSocketId: fromSocketId, sdp: pc.localDescription.toJSON() },
            (res) => {
              if (res?.ok) resolve()
              else reject(new Error(res?.error || 'ANSWER_FAILED'))
            }
          )
        })
      } catch {
        /* ignore */
      }
    },
    [ensurePeer, socket]
  )

  const handleIncomingAnswer = useCallback(async (fromSocketId, sdp) => {
    const pc = peersRef.current.get(fromSocketId)
    if (!pc) return
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    } catch {
      /* ignore */
    }
  }, [])

  const handleIncomingIce = useCallback(async (fromSocketId, candidate) => {
    const pc = peersRef.current.get(fromSocketId)
    if (!pc || !candidate) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {
      /* harmless race while descriptions are exchanging */
    }
  }, [])

  /** Acquire camera + mic when room session is active */
  useEffect(() => {
    if (!inRoom) return undefined
    let cancelled = false
    setMediaError('')
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        cameraStreamRef.current = stream
        cameraVideoTrackRef.current = stream.getVideoTracks()[0] || null
        videoOnRef.current = stream.getVideoTracks()[0]?.enabled !== false
        setLocalStream(stream)
      } catch (e) {
        setMediaError(e?.message || 'Could not access camera or microphone.')
      }
    })()

    return () => {
      cancelled = true
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      screenOnRef.current = false
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
      cameraVideoTrackRef.current = null
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
      pendingOffersRef.current.clear()
      setLocalStream(null)
      setRemoteStreams({})
      setScreenOn(false)
    }
  }, [inRoom, roomId])

  /** Socket listeners for signaling + membership */
  useEffect(() => {
    if (!socket || !inRoom) return undefined

    function onOffer({ fromSocketId, sdp }) {
      if (!localStream) {
        pendingOffersRef.current.set(fromSocketId, sdp)
        return
      }
      void handleIncomingOffer(fromSocketId, sdp)
    }

    function onAnswer({ fromSocketId, sdp }) {
      void handleIncomingAnswer(fromSocketId, sdp)
    }

    function onIce({ fromSocketId, candidate }) {
      void handleIncomingIce(fromSocketId, candidate)
    }

    function onUserJoined({ participant }) {
      if (!participant?.socketId || participant.socketId === socket.id) return
      if (!socket.id || !localStream) return
      if (shouldInitiateOffer(socket.id, participant.socketId)) {
        void emitOffer(participant.socketId)
      }
    }

    function onUserLeft({ socketId }) {
      if (!socketId) return
      closePeer(socketId)
    }

    socket.on('webrtc_offer', onOffer)
    socket.on('webrtc_answer', onAnswer)
    socket.on('webrtc_ice_candidate', onIce)
    socket.on('user_joined', onUserJoined)
    socket.on('user_left', onUserLeft)

    return () => {
      socket.off('webrtc_offer', onOffer)
      socket.off('webrtc_answer', onAnswer)
      socket.off('webrtc_ice_candidate', onIce)
      socket.off('user_joined', onUserJoined)
      socket.off('user_left', onUserLeft)
    }
  }, [
    socket,
    inRoom,
    localStream,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingIce,
    emitOffer,
    closePeer,
  ])

  /** Flush offers that arrived before local media was ready */
  useEffect(() => {
    if (!localStream || !socket) return
    pendingOffersRef.current.forEach((sdp, fromId) => {
      void handleIncomingOffer(fromId, sdp)
    })
    pendingOffersRef.current.clear()
  }, [localStream, socket, handleIncomingOffer])

  /** When media + peer list ready, initiate mesh offers to stable peers */
  useEffect(() => {
    if (!socket?.connected || !localStream || !participants?.length) return
    const myId = socket.id
    if (!myId) return

    participants.forEach((p) => {
      if (!p.socketId || p.socketId === myId) return
      if (shouldInitiateOffer(myId, p.socketId)) {
        void emitOffer(p.socketId)
      }
    })
  }, [socket, localStream, participants, emitOffer])

  const toggleMic = useCallback(() => {
    setAudioOn((prev) => {
      const next = !prev
      cameraStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = next
      })
      return next
    })
  }, [])

  const toggleCam = useCallback(() => {
    setVideoOn((prev) => {
      const next = !prev
      videoOnRef.current = next
      if (!screenOnRef.current) {
        cameraStreamRef.current?.getVideoTracks().forEach((t) => {
          t.enabled = next
        })
      }
      return next
    })
  }, [])

  const stopScreenShareInternal = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    screenOnRef.current = false
    setScreenOn(false)
    const cam = cameraVideoTrackRef.current
    if (cam) {
      cam.enabled = videoOnRef.current
      await replaceScreenTrackOnAllPeers(cam)
    }
  }, [replaceScreenTrackOnAllPeers])

  const toggleScreenShare = useCallback(async () => {
    if (screenOnRef.current) {
      await stopScreenShareInternal()
      return
    }
    try {
      const sc = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      screenStreamRef.current = sc
      screenOnRef.current = true
      setScreenOn(true)

      const vt = sc.getVideoTracks()[0]
      vt.addEventListener('ended', () => {
        void stopScreenShareInternal()
      })

      cameraStreamRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = false
      })

      await replaceScreenTrackOnAllPeers(vt)
    } catch (e) {
      setMediaError(e?.message || 'Screen sharing was cancelled or denied.')
    }
  }, [replaceScreenTrackOnAllPeers, stopScreenShareInternal])

  return {
    localStream,
    remoteStreams,
    mediaError,
    audioOn,
    videoOn,
    screenOn,
    toggleMic,
    toggleCam,
    toggleScreenShare,
  }
}
