import type { ReactNode } from 'react'

export default function Placeholder({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h1 className="mb-1 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-sm text-muted">Scaffold — design coming as we build.</p>
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
        {children}
      </div>
    </section>
  )
}
