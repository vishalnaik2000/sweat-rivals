import type { ReactNode } from 'react'

export const inputClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-fg outline-none focus:border-accent'

export const btnClass =
  'w-full rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50'

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-tight">
            Sweat<span className="text-accent">Rivals</span>
          </div>
          <h1 className="mt-4 text-lg font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">{children}</div>
      </div>
    </div>
  )
}
