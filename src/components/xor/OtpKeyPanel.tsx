import { useEffect, useState } from 'react'
import { Copy, Dices, Eye, EyeOff, RefreshCcw, ShieldAlert, ShieldCheck, Timer } from 'lucide-react'
import type { OtpKeyRecord } from '../../lib/otp'
import { useCountdown } from '../../hooks/useCountdown'
import { CopyButton } from '../ui/CopyButton'

const VISIBLE_SECONDS = 10

interface OtpKeyPanelProps {
  /** Byte length of the current message. The key is generated to match it. */
  messageLength: number
  record: OtpKeyRecord | null
  onGenerate: () => void
  /** Lets the section mask every other view of the key once the countdown ends. */
  onRevealChange?: (revealed: boolean) => void
  /** `cipher` for the OTP section, `attack` for the key-reuse demonstration. */
  variant?: 'attack' | 'cipher'
  busy?: boolean
  error?: null | string
  /** Shown instead of "Enter a message first" when nothing can be generated. */
  emptyHint?: string
}

/**
 * Random key panel.
 *
 * Keys come from `crypto.getRandomValues()`, never `Math.random()`, and hide
 * again after a short countdown. There is no history: only the key in hand is
 * shown, and a spent key is refused rather than listed.
 */
export function OtpKeyPanel({
  messageLength,
  record,
  onGenerate,
  onRevealChange,
  variant = 'cipher',
  busy = false,
  error = null,
  emptyHint,
}: OtpKeyPanelProps) {
  const isAttack = variant === 'attack'

  return (
    <div
      className={`animate-slide-up rounded-2xl border p-4 sm:p-5 ${
        isAttack
          ? 'border-warn/30 bg-warn/6'
          : 'border-accent-2/30 bg-accent-2/6'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              isAttack
                ? 'border-warn/35 bg-warn/12 text-warn'
                : 'border-accent-2/35 bg-accent-2/12 text-accent-2'
            }`}
          >
            {isAttack ? (
              <RefreshCcw size={16} aria-hidden="true" />
            ) : (
              <ShieldCheck size={16} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-sm font-bold text-ink">
              {isAttack ? 'Random Key (reused on purpose)' : 'One-Time Pad Key'}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-faint">
              {isAttack ? 'Key Reuse Attack' : 'OTP Mode'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={isAttack ? 'btn btn-ghost' : 'btn btn-primary'}
          onClick={onGenerate}
          disabled={busy || messageLength === 0}
        >
          <Dices size={16} aria-hidden="true" />
          {record ? 'Generate New Key' : 'Generate Random Key'}
        </button>
      </div>

      {messageLength === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line/20 px-3.5 py-3 text-xs text-faint">
          {emptyHint ?? 'Enter a message first.'}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-danger/45 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
        >
          <span aria-hidden="true">✗</span>
          <span>{error}</span>
        </p>
      ) : null}

      {record ? (
        <OtpKeyDisplay
          key={`${record.hex}-${record.usedAt ?? 'fresh'}-${isAttack ? 'attack' : 'cipher'}`}
          record={record}
          isAttack={isAttack}
          onRevealChange={onRevealChange}
        />
      ) : null}
    </div>
  )
}

/** Split out so the countdown restarts whenever a new key is issued. */
function OtpKeyDisplay({
  record,
  isAttack,
  onRevealChange,
}: {
  record: OtpKeyRecord
  isAttack: boolean
  onRevealChange?: (revealed: boolean) => void
}) {
  const { remaining } = useCountdown(VISIBLE_SECONDS, true)
  // `null` = follow the countdown; a boolean is a deliberate manual override.
  const [override, setOverride] = useState<boolean | null>(null)
  const revealed = override ?? remaining > 0
  const used = record.usedAt !== null

  useEffect(() => {
    onRevealChange?.(revealed)
  }, [revealed, onRevealChange])

  const masked = '•'.repeat(record.length)
  const statusTone = isAttack
    ? 'border-warn/45 bg-warn/12 text-warn'
    : used
      ? 'border-warn/45 bg-warn/12 text-warn'
      : 'border-ok/40 bg-ok/10 text-ok'
  const statusText = isAttack ? 'reused on purpose' : used ? 'USED' : 'available'

  return (
    <div className="mt-3 rounded-xl border border-line/12 bg-canvas/40 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`label ${isAttack ? 'text-warn/90' : 'text-accent-2/90'}`}>
          Generated Key
        </p>
        <span className={`chip ${statusTone}`}>
          {statusText} · {record.length} bytes
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code
          className={`min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg border border-line/12 bg-raised/5 px-3 py-2.5 font-mono text-[13px] ${
            revealed ? 'text-accent-2' : 'tracking-[0.3em] text-muted'
          }`}
        >
          {revealed ? record.spaced : masked}
        </code>
        <CopyButton value={record.hex} copyKey="otp-key" label="Copy key" size="sm" />
        <button
          type="button"
          className="btn btn-ghost px-2.5 py-1.5 text-xs"
          onClick={() => setOverride(!revealed)}
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide the key' : 'Reveal the key'}
        >
          {revealed ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
          <span>{revealed ? 'Hide' : 'Reveal'}</span>
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
        {remaining > 0 && revealed ? (
          <>
            <Timer size={12} aria-hidden="true" />
            Visible for {remaining}s
          </>
        ) : (
          <>
            <Copy size={12} aria-hidden="true" />
            Hidden. Use Reveal.
          </>
        )}
      </p>

      {!isAttack && used ? (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[11.5px] text-warn">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Already used once. OTP keys are never reused.</span>
        </p>
      ) : null}

      {isAttack ? (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[11.5px] text-warn">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>This key will encrypt two messages.</span>
        </p>
      ) : null}
    </div>
  )
}
