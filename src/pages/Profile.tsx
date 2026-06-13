import { useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { profile, session, signOut, refreshProfile } = useAuth()
  const userId = session!.user.id
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/avatar.${ext}`
      const up = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (up.error) throw up.error

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}` // cache-bust so the new image shows
      const updated = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (updated.error) throw updated.error

      await refreshProfile()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const initial = (profile?.name || profile?.username || '?').charAt(0).toUpperCase()

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full"
            aria-label="Change avatar"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-accent text-2xl font-bold text-accent-fg">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 group-hover:opacity-100">
              {uploading ? '…' : 'Edit'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />

          <div>
            <div className="font-semibold">{profile?.name || profile?.username}</div>
            <div className="text-sm text-muted">@{profile?.username}</div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <dl className="mt-5 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd>{session?.user.email}</dd>
          </div>
        </dl>
      </div>

      <button
        onClick={signOut}
        className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-bad hover:bg-bg"
      >
        Sign out
      </button>
    </section>
  )
}
