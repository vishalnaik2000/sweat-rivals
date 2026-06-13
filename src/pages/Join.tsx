import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getChallengePreview, joinByCode, type ChallengePreview } from '../lib/challenges'
import { prettyDate } from '../lib/date'

export default function Join() {
  const { code } = useParams<{ code: string }>()
  const { session } = useAuth()
  const userId = session!.user.id
  const navigate = useNavigate()

  const [preview, setPreview] = useState<ChallengePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    getChallengePreview(code)
      .then(setPreview)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [code])

  async function join() {
    if (!code) return
    setJoining(true)
    setError(null)
    try {
      const id = await joinByCode(userId, code)
      navigate(`/challenges/${id}`)
    } catch (e) {
      const msg = (e as Error).message
      setError(
        msg.includes('challenge_full')
          ? 'This challenge is already full.'
          : msg.includes('not_found')
            ? 'This challenge link is invalid.'
            : msg,
      )
      setJoining(false)
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>

  if (!preview) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
        {error ?? 'This challenge link is invalid or has expired.'}
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">You&apos;ve been invited to</p>
        <h1 className="mt-1 text-2xl font-bold">{preview.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {prettyDate(preview.start_date)} – {prettyDate(preview.end_date)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {preview.participants} {preview.participants === 1 ? 'participant' : 'participants'} ·{' '}
          {preview.metrics} {preview.metrics === 1 ? 'metric' : 'metrics'}
        </p>

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <button
          onClick={join}
          disabled={joining}
          className="mt-5 w-full rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join challenge'}
        </button>
        <button
          onClick={() => navigate('/challenges')}
          className="mt-2 w-full text-sm text-muted hover:text-fg"
        >
          Not now
        </button>
      </div>
    </section>
  )
}
