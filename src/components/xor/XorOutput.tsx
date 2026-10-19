import { Binary, FileKey, Hash, Repeat, Scissors, Type } from 'lucide-react'
import { UNKNOWN_CHAR, bytesToBase64, bytesToBinary, bytesToHex } from '../../lib/bytes'
import { OUTPUT_FORMAT_LABEL, type XorRunResult } from '../../lib/pipeline'
import { describeKeyUsage } from '../../lib/xor'
import { CopyButton } from '../ui/CopyButton'

interface XorOutputProps {
  result: XorRunResult
}

/** Result panel: the primary output plus every other representation of the same bytes. */
export function XorOutput({ result }: XorOutputProps) {
  const isDecrypt = result.operation === 'decrypt'
  // When decrypting, the recovered text is the headline; the raw bytes are the detail.
  const primary = isDecrypt ? result.outputLooseText : result.outputText
  const isText = result.outputAsText !== null
  const primaryLabel = isDecrypt ? 'Plaintext (UTF-8 text)' : result.outputLabel
  const primaryFormat = isDecrypt ? 'text' : result.outputFormat
  const textPreview = result.outputAsText
  const printable = textPreview !== null && /^[\x20-\x7E\n\r\t]*$/.test(textPreview)
  const selected = result.outputFormat

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileKey size={16} className="text-accent" aria-hidden="true" />
          <p className="label text-accent">Output</p>
          <span className="chip border-accent/35 bg-accent/10 text-accent">
            {OUTPUT_FORMAT_LABEL[primaryFormat]}
          </span>
        </div>
        <CopyButton value={primary} copyKey="xor-output" label="Copy output" size="sm" />
      </div>

      <p
        className={`mt-2.5 min-h-[3.25rem] overflow-x-auto whitespace-pre break-words rounded-xl border border-line/12 bg-canvas/50 p-3.5 font-mono text-[13.5px] leading-relaxed ${
          isDecrypt ? 'text-ok' : 'text-accent'
        }`}
        aria-label={`${primaryLabel} output`}
      >
        {primary === '' ? <span className="text-faint">(empty)</span> : primary}
      </p>

      {isDecrypt && !isText ? (
        <p className="mt-2.5 text-[11.5px] text-faint">
          Not valid UTF-8 text. Unknown bytes are shown as{' '}
          <span className="font-mono text-ink/80">{UNKNOWN_CHAR}</span>; the exact bytes are
          listed below and in the steps.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {isDecrypt ? (
          <>
            <Rep
              icon={<Hash size={12} aria-hidden="true" />}
              label="Plaintext bytes (hex)"
              value={bytesToHex(result.outputBytes)}
              selected={selected === 'hex'}
            />
            <Rep
              icon={<Binary size={12} aria-hidden="true" />}
              label="Plaintext bytes (binary)"
              value={bytesToBinary(result.outputBytes)}
              selected={selected === 'binary'}
            />
          </>
        ) : (
          <>
            <Rep
              icon={<Type size={12} aria-hidden="true" />}
              label="Ciphertext decoded as text"
              value={printable ? (textPreview ?? '') : '(not printable UTF-8)'}
            />
            <Rep
              icon={<Binary size={12} aria-hidden="true" />}
              label="Ciphertext (binary)"
              value={bytesToBinary(result.outputBytes)}
              selected={selected === 'binary'}
            />
          </>
        )}
        <Rep
          icon={<FileKey size={12} aria-hidden="true" />}
          label={`${isDecrypt ? 'Plaintext' : 'Ciphertext'} bytes (base64)`}
          value={bytesToBase64(result.outputBytes)}
          selected={selected === 'base64'}
        />
      </div>

      {result.keyUsage.mode !== 'exact' ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3.5 py-2.5 text-[11.5px] text-accent">
          {result.keyUsage.mode === 'repeated' ? (
            <Repeat size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <Scissors size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {describeKeyUsage(result.keyUsage)}
          </span>
        </p>
      ) : null}

    </div>
  )
}

function Rep({
  icon,
  label,
  value,
  selected = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  selected?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${
        selected ? 'border-accent/45 bg-accent/8' : 'border-line/10 bg-canvas/30'
      }`}
    >
      <p className="label flex items-center gap-1.5">
        {icon}
        {label}
        {selected ? <span className="text-accent">· selected</span> : null}
      </p>
      <p className="mt-1 overflow-x-auto whitespace-pre font-mono text-[11.5px] text-ink/80">
        {value}
      </p>
    </div>
  )
}
