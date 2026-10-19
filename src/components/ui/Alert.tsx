import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export type AlertTone = 'info' | 'ok' | 'warn' | 'danger'

interface AlertProps {
  tone?: AlertTone
  title: string
  children?: ReactNode
  icon?: ReactNode
  /** Extra emphasis: adds a pulsing ring (used for the key-reuse warning). */
  pulse?: boolean
  actions?: ReactNode
  role?: 'status' | 'alert'
}

const TONE: Record<AlertTone, { wrapper: string; icon: string }> = {
  info: {
    wrapper: 'border-accent/30 bg-accent/8',
    icon: 'text-accent',
  },
  ok: {
    wrapper: 'border-ok/35 bg-ok/10',
    icon: 'text-ok',
  },
  warn: {
    wrapper: 'border-warn/45 bg-warn/10',
    icon: 'text-warn',
  },
  danger: {
    wrapper: 'border-danger/45 bg-danger/10',
    icon: 'text-danger',
  },
}

/**
 * Status message. Feedback never relies on colour alone: every tone ships an
 * icon *and* a text label.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  icon,
  pulse = false,
  actions,
  role = 'status',
}: AlertProps) {
  const defaultIcon =
    tone === 'ok' ? (
      <CircleCheck size={18} aria-hidden="true" />
    ) : tone === 'danger' ? (
      <CircleX size={18} aria-hidden="true" />
    ) : tone === 'warn' ? (
      <TriangleAlert size={18} aria-hidden="true" />
    ) : (
      <Info size={18} aria-hidden="true" />
    )

  return (
    <div
      role={role}
      className={`flex flex-col gap-2.5 rounded-xl border px-4 py-3.5 ${TONE[tone].wrapper} ${
        pulse ? 'animate-pulse-warn' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 shrink-0 ${TONE[tone].icon}`}>{icon ?? defaultIcon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${TONE[tone].icon}`}>{title}</p>
          {children ? (
            <div className="mt-1 space-y-1 text-xs leading-relaxed text-muted">{children}</div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 pl-[1.6rem]">{actions}</div> : null}
    </div>
  )
}
