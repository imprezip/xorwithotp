import type { AttackRow } from '../../lib/attack'

/**
 * The heart of the demonstration, one row per byte:
 *
 *   C1 = M1 XOR K      C2 = M2 XOR K      C1 XOR C2  ==  M1 XOR M2
 */
export function AttackTable({ rows }: { rows: AttackRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/12">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="border-b border-line/12 bg-canvas/40 px-3 py-2 text-left text-[11px] uppercase tracking-wider text-faint">
          Per-byte view: the key column never changes, which is the whole problem
        </caption>
        <thead>
          <tr className="bg-canvas/50 font-mono text-[11px] uppercase tracking-wider text-faint">
            <th scope="col" className="px-2.5 py-2 font-semibold">
              #
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              M1
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              K
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              C1
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              M2
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              C2
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              C1⊕C2
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              M1⊕M2
            </th>
            <th scope="col" className="px-2.5 py-2 font-semibold">
              =
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/8 font-mono text-[12px]">
          {rows.map((row) => (
            <tr key={row.index} className="transition-colors hover:bg-accent/5">
              <td className="px-2.5 py-1.5 text-faint">{row.index}</td>
              <td className="px-2.5 py-1.5 text-ink/85">{row.m1Hex}</td>
              <td className="px-2.5 py-1.5 text-accent-2/80">{row.keyHex}</td>
              <td className="px-2.5 py-1.5 text-accent/90">{row.c1Hex}</td>
              <td className="px-2.5 py-1.5 text-ink/85">{row.m2Hex}</td>
              <td className="px-2.5 py-1.5 text-accent/90">{row.c2Hex}</td>
              <td className="px-2.5 py-1.5 text-ok">{row.c1XorC2Hex}</td>
              <td className="px-2.5 py-1.5 text-warn">{row.m1XorM2Hex}</td>
              <td className="px-2.5 py-1.5 text-center">
                {row.match ? (
                  <span className="text-ok" title="identical">
                    ✓
                  </span>
                ) : (
                  <span className="text-danger" title="different">
                    ✗
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
