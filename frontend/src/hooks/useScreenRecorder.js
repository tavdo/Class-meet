import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Records the user's screen (with optional mic audio) to a local file.
 *
 * - Uses `getDisplayMedia` for the picture + any tab/system audio the user
 *   exposes.
 * - Optionally mixes the local microphone track in so narration is captured
 *   even when the user picks a tab with no audio share.
 * - Output is a single `.webm` blob downloaded via an anchor click. Nothing
 *   is uploaded.
 */
export function useScreenRecorder({ includeMic = true } = {}) {
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const screenStreamRef = useRef(null)
  const micStreamRef = useRef(null)
  const mixedStreamRef = useRef(null)
  const startedAtRef = useRef(0)
  const timerRef = useRef(null)

  const [isRecording, setIsRecording] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState('')

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    mixedStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    micStreamRef.current = null
    mixedStreamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  const downloadBlob = useCallback((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.download = `classmeet-recording-${ts}.webm`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  const stop = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') {
      cleanup()
      setIsRecording(false)
      setElapsedMs(0)
      return
    }
    try {
      rec.stop()
    } catch {
      cleanup()
      setIsRecording(false)
      setElapsedMs(0)
    }
  }, [cleanup])

  const start = useCallback(async () => {
    if (isRecording || isStarting) return
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen recording is not supported in this browser.')
      return
    }
    if (typeof window.MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported in this browser.')
      return
    }

    setError('')
    setIsStarting(true)
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      })
      screenStreamRef.current = screenStream

      let micStream = null
      if (includeMic) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          micStreamRef.current = micStream
        } catch {
          // User declined mic — recording continues with just the screen audio.
        }
      }

      // Mix screen + mic audio when both exist, otherwise use whatever we got.
      const combined = new MediaStream()
      screenStream.getVideoTracks().forEach((t) => combined.addTrack(t))

      const screenAudio = screenStream.getAudioTracks()
      const micAudio = micStream?.getAudioTracks() || []

      if (screenAudio.length && micAudio.length && window.AudioContext) {
        const ctx = new AudioContext()
        const dest = ctx.createMediaStreamDestination()
        ctx.createMediaStreamSource(screenStream).connect(dest)
        ctx.createMediaStreamSource(micStream).connect(dest)
        dest.stream.getAudioTracks().forEach((t) => combined.addTrack(t))
      } else {
        screenAudio.forEach((t) => combined.addTrack(t))
        micAudio.forEach((t) => combined.addTrack(t))
      }

      mixedStreamRef.current = combined

      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((m) => window.MediaRecorder.isTypeSupported?.(m)) || ''

      const rec = new MediaRecorder(
        combined,
        mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined
      )
      recorderRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        })
        cleanup()
        setIsRecording(false)
        setElapsedMs(0)
        if (blob.size > 0) downloadBlob(blob)
      }

      // Auto-stop if the user ends the screen share from the browser UI.
      screenStream.getVideoTracks().forEach((t) => {
        t.addEventListener('ended', () => stop())
      })

      rec.start(1000)
      startedAtRef.current = Date.now()
      setIsRecording(true)
      setElapsedMs(0)
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 500)
    } catch (e) {
      cleanup()
      if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
        setError(e?.message || 'Could not start recording.')
      }
    } finally {
      setIsStarting(false)
    }
  }, [cleanup, downloadBlob, includeMic, isRecording, isStarting, stop])

  const toggle = useCallback(() => {
    if (isRecording) stop()
    else start()
  }, [isRecording, start, stop])

  useEffect(() => cleanup, [cleanup])

  return { isRecording, isStarting, elapsedMs, error, start, stop, toggle }
}
