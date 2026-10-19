import type { XorRow } from '../../lib/xor'

interface ByteTableProps {
  rows: XorRow[]
  /** Column titles. */
  headings?: [string, string, string]
  caption?: string
  /** OTP Mode: replace the key column with dots once the key is hidden. */
  redactKey?: boolean
}

/**
 * Per-byte XOR table with a bit-level highlight of the result.
 *
 * `01001000 XOR 01000001 = 00001001`. The set bits of the result are tinted so
 * students can see *why* a byte comes out the way it does.
 */
export function ByteTable({
  rows,
  headings = ['Input', 'Key', 'Result'],
  caption,
  redactKey = false,
}: ByteTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/12">
      <table className="w-full min-w-[22rem] border-collapse text-left">
        {caption ? (
          <caption className="border-b border-line/12 bg-canvas/40 px-3 py-2 text-left text-[11px] uppercase tracking-wider text-faint">
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr className="bg-canvas/50 text-[11px] uppercase tracking-wider text-faint">
            <th scope="col" className="px-3 py-2 font-semibold">
              #
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headings[0]}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {redactKey ? 'Key (hidden)' : headings[1]}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headings[2]}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/8 font-mono text-[12.5px]">
          {rows.map((row) => (
            <tr key={row.index} className="transition-colors hover:bg-accent/5">
              <td className="px-3 py-1.5 text-faint">{row.index}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-ink/85">
                <span className="text-accent/70">{row.messageHex}</span>{' '}
                <span className="text-faint">{row.messageBin}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-ink/85">
                {redactKey ? (
                  <span className="tracking-[0.25em] text-faint">
                    {'\u2022'.repeat(10)}
                  </span>
                ) : (
                  <>
                    <span className="text-accent-2/80">{row.keyHex}</span>{' '}
                    <span className="text-faint">{row.keyBin}</span>
                  </>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">
                <span className="text-accent">{row.resultHex}</span>{' '}
                <span className="text-ink/70">
                  {row.resultBin.split('').map((bit, position) => (
                    <span
                      key={position}
                      className={row.setBits.includes(7 - position) ? 'text-ok' : 'text-faint/60'}
                    >
                      {bit}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
