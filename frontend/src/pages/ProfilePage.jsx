import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppShell } from '../components/AppShell'
import { MotionButton, MotionCard, MotionInput } from '../components/ui/MotionComponents'
import { apiFetch, apiUpload, assetUrl } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { fadeInUp, staggerContainer } from '../animations/variants'
import {
  Camera,
  ChevronLeft,
  Lock,
  Mail,
  Trash2,
  User as UserIcon,
  UserCircle2,
} from 'lucide-react'

export default function ProfilePage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState({ type: '', text: '' })
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  const avatarSrc = user?.avatarUrl ? assetUrl(user.avatarUrl) : ''

  async function onSave(e) {
    e.preventDefault()
    setBanner({ type: '', text: '' })
    setSaving(true)
    try {
      const body = {}
      if (displayName.trim() && displayName !== user.displayName) {
        body.displayName = displayName.trim()
      }
      if (email && email !== user.email) body.email = email
      if (bio !== (user.bio || '')) body.bio = bio
      if (newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }

      if (Object.keys(body).length === 0) {
        setBanner({ type: 'info', text: 'Nothing to update.' })
        setSaving(false)
        return
      }

      const data = await apiFetch('/api/auth/me', {
        token,
        method: 'PUT',
        body,
      })
      setAuth(data.token, data.user)
      setCurrentPassword('')
      setNewPassword('')
      setBanner({ type: 'success', text: 'Profile updated.' })
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Update failed' })
    } finally {
      setSaving(false)
    }
  }

  async function onPickAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarUploading(true)
    setBanner({ type: '', text: '' })
    try {
      const data = await apiUpload('/api/auth/avatar', {
        token,
        file,
        fieldName: 'avatar',
      })
      setAuth(token, data.user)
      setBanner({ type: 'success', text: 'Avatar updated.' })
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Upload failed' })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function onRemoveAvatar() {
    if (!user?.avatarUrl) return
    setAvatarUploading(true)
    try {
      const data = await apiFetch('/api/auth/avatar', {
        token,
        method: 'DELETE',
      })
      setAuth(token, data.user)
      setBanner({ type: 'success', text: 'Avatar removed.' })
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Could not remove avatar' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const bannerColor =
    banner.type === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : banner.type === 'error'
        ? 'border-red-500/20 bg-red-500/10 text-red-200'
        : 'border-white/10 bg-white/5 text-slate-200'

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
        >
          <ChevronLeft size={16} />
          Back
        </motion.button>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          <motion.div variants={fadeInUp}>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Your profile
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Update how you appear to other participants in meetings.
            </p>
          </motion.div>

          {banner.text ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${bannerColor}`}
            >
              {banner.text}
            </motion.div>
          ) : null}

          <MotionCard className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user?.displayName || 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                      <UserCircle2 size={56} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-white shadow-lg shadow-accent-500/30 transition-transform hover:scale-110 disabled:opacity-60"
                  aria-label="Upload avatar"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="text-lg font-semibold text-white">
                  {user?.displayName || '—'}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {user?.role}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <MotionButton
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarUploading}
                    className="h-9 bg-white/5 px-3 text-xs"
                  >
                    <Camera size={14} className="mr-1.5" />
                    {avatarUploading ? 'Uploading…' : avatarSrc ? 'Change photo' : 'Upload photo'}
                  </MotionButton>
                  {avatarSrc ? (
                    <MotionButton
                      type="button"
                      onClick={onRemoveAvatar}
                      disabled={avatarUploading}
                      className="h-9 bg-red-500/10 px-3 text-xs text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 size={14} className="mr-1.5" />
                      Remove
                    </MotionButton>
                  ) : null}
                </div>
              </div>
            </div>
          </MotionCard>

          <form onSubmit={onSave} className="space-y-6">
            <MotionCard className="p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <UserIcon size={18} className="text-accent-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Identity
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MotionInput
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  required
                />
                <MotionInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-400 ml-1">
                  Bio <span className="text-slate-600">(optional, {280 - bio.length} left)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                  rows={3}
                  placeholder="A short intro your classmates will see."
                  className="mt-1.5 w-full rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-accent-500/50 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
                />
              </div>
            </MotionCard>

            <MotionCard className="p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <Lock size={18} className="text-accent-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Change password
                </h2>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Leave blank to keep your current password.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <MotionInput
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <MotionInput
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </MotionCard>

            <div className="flex items-center justify-end gap-3">
              <MotionButton
                type="button"
                onClick={() => navigate('/')}
                className="h-11 bg-white/5 px-5"
              >
                Cancel
              </MotionButton>
              <MotionButton
                type="submit"
                disabled={saving}
                className="h-11 bg-accent-500 px-6 text-white shadow-lg shadow-accent-500/20 hover:bg-accent-400"
              >
                <Mail size={16} className="mr-2" />
                {saving ? 'Saving…' : 'Save changes'}
              </MotionButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AppShell>
  )
}
