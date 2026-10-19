import { useState } from 'react'
import { Crosshair, KeyRound, RotateCcw } from 'lucide-react'
import { toMessage } from '../../lib/errors'
import { recoverKeyFromKnownPlaintext, type KnownPlaintextResult } from '../../lib/attack'
import { Alert } from '../ui/Alert'
import { CopyButton } from '../ui/CopyButton'
import { TextField } from '../ui/TextField'

interface KnownPlaintextCardProps {
  /**
   * Fields are pre-filled from the live demonstration. The parent remounts this
   * card (React `key`) whenever a new identity is produced, so no state syncing
   * effect is needed here.
   */
  message1?: string
  ciphertext1?: string
  ciphertext2?: string
}

/**
 * Optional (but very convincing) extension of the attack: if even a single
 * plaintext is known, the key falls out immediately and every other ciphertext
 * encrypted with it collapses.
 */
export function KnownPlaintextCard({
  message1: initialMessage1 = '',
  ciphertext1: initialCiphertext1 = '',
  ciphertext2: initialCiphertext2 = '',
}: KnownPlaintextCardProps) {
  const [known, setKnown] = useState(initialMessage1)
  const [c1, setC1] = useState(initialCiphertext1)
  const [c2, setC2] = useState(initialCiphertext2)
  const [result, setResult] = useState<KnownPlaintextResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    setError(null)
    setResult(null)
    try {
      setResult(recoverKeyFromKnownPlaintext(known, c1, c2))
    } catch (recoveryError) {
      setError(toMessage(recoveryError, 'The attack could not be completed.'))
    }
  }

  const disabled =
    known.trim().length === 0 || c1.trim().length === 0 || c2.trim().length === 0

  return (
    <div className="rounded-2xl border border-line/12 bg-canvas/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-warn/35 bg-warn/12 text-warn">
            <Crosshair size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Known Plaintext Demonstration</p>
            <p className="text-[11px] uppercase tracking-wider text-faint">Optional extension</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setKnown('')
              setC1('')
              setC2('')
              setResult(null)
              setError(null)
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={run} disabled={disabled}>
            <KeyRound size={15} aria-hidden="true" />
            Recover Key
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        <code className="font-mono text-accent">K = M1 XOR C1</code>. That key decrypts everything
        else protected with it.
      </p>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-3">
        <TextField
          label="Known Message 1"
          value={known}
          onChange={setKnown}
          placeholder="ATTACK AT DAWN"
        />
        <TextField
          label="Ciphertext 1"
          value={c1}
          onChange={setC1}
          placeholder="1B3B24C0D1E8948482C7BC48F6FC"
          hint="Hexadecimal"
        />
        <TextField
          label="Ciphertext 2"
          value={c2}
          onChange={setC2}
          placeholder="1E2A36C4DCE7949297ABB45A8093"
          hint="Hexadecimal"
        />
      </div>

      {error ? (
        <div className="mt-4">
          <Alert tone="danger" title="✗ Error" role="alert">
            <p>{error}</p>
          </Alert>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 animate-pop-in space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-accent/30 bg-accent/8 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="label text-accent">Recovered Key</p>
                <CopyButton
                  value={result.recoveredKeyHex}
                  copyKey="known-plaintext-key"
                  label="Copy key"
                  size="sm"
                />
              </div>
              <code className="mt-1.5 block overflow-x-auto whitespace-pre font-mono text-[12.5px] text-accent">
                {result.recoveredKeyHex}
              </code>
            </div>
            <div className="rounded-xl border border-ok/30 bg-ok/8 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="label text-ok">Recovered Message 2</p>
                {result.recoveredMessage2Text ? (
                  <CopyButton
                    value={result.recoveredMessage2Text}
                    copyKey="known-plaintext-message"
                    label="Copy"
                    size="sm"
                  />
                ) : null}
              </div>
              <code className="mt-1.5 block overflow-x-auto whitespace-pre font-mono text-[12.5px] text-ok">
                {result.recoveredMessage2Text ?? '(not valid UTF-8 text)'}
              </code>
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed text-faint">
            <span className="text-accent-2">C1 XOR C2</span> only links two plaintexts. A known
            plaintext hands over the key.
          </p>
        </div>
      ) : null}
    </div>
  )
}
