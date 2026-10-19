import { Dices, Lock, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { SectionHeader } from '../ui/SectionHeader'
import { Term } from '../ui/Term'
import { CodeBlock } from '../ui/CodeBlock'

const REQUIREMENTS = [
  {
    icon: <Dices size={18} aria-hidden="true" />,
    title: 'Truly random',
    body: 'Generated with crypto.getRandomValues(). A predictable key destroys the guarantee.',
  },
  {
    icon: <Sparkles size={18} aria-hidden="true" />,
    title: 'At least as long as the message',
    body: 'The key is random and at least as long, so it is used once and never repeats.',
  },
  {
    icon: <Lock size={18} aria-hidden="true" />,
    title: 'Kept secret',
    body: 'Anyone with the key can read the message: XOR locks and unlocks alike.',
  },
  {
    icon: <RefreshCcw size={18} aria-hidden="true" />,
    title: 'Never reused',
    body: 'Reuse cancels the key out of C1 XOR C2, as section 2 showed.',
  },
]

const COMPARISON: { label: string; xor: string; otp: string }[] = [
  {
    label: 'Operation',
    xor: 'C = M XOR K',
    otp: 'C = M XOR K  (identical)',
  },
  {
    label: 'Key source',
    xor: 'Chosen by the sender, often a word or a passphrase',
    otp: 'Uniformly random, generated per message',
  },
  {
    label: 'Key length',
    xor: 'Equal to the message, but the key is often repeated',
    otp: 'At least as long as the message, never repeated',
  },
  {
    label: 'Key reuse',
    xor: 'Common, and the cause of the attack in section 2',
    otp: 'Forbidden: one key, one message',
  },
  {
    label: 'Security',
    xor: 'Depends entirely on the key; breakable',
    otp: 'Perfect secrecy, if all four rules are respected',
  },
  {
    label: 'Practical use',
    xor: 'Teaching, toy ciphers, one-off puzzles',
    otp: 'Classroom demonstration (the real thing is impractical)',
  },
]

export function OtpRequirementsSection() {
  return (
    <section id="otp" className="scroll-mt-24 py-14 sm:py-20">
      <SectionHeader
        index="03"
        eyebrow="The same cipher, four extra rules"
        icon={<ShieldCheck size={20} aria-hidden="true" />}
        title="One-Time Pad Requirements"
        description={
          <p>
            The same XOR becomes a{' '}
            <Term definition="A cipher that leaks nothing at all about the plaintext, not even its length. Only possible with a truly random key at least as long as the message.">
              One-Time Pad
            </Term>{' '}
            once the key is random, long enough, secret, and never reused.
          </p>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        {REQUIREMENTS.map((requirement) => (
          <div
            key={requirement.title}
            className="glass card-hover rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-2/30 bg-accent-2/10 text-accent-2">
                {requirement.icon}
              </span>
              <h3 className="text-base font-bold text-ink">{requirement.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{requirement.body}</p>
          </div>
        ))}
      </div>

      {/* `min-w-0` on both cards: as grid items they would otherwise refuse to
          shrink below the 34rem table and the code block, pushing the track wider
          than the screen. The overflow would be clipped by the page and could not
          be scrolled to, on a phone or a narrow window. */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="glass min-w-0 rounded-2xl p-5">
          <h3 className="text-base font-bold text-ink">XOR Cipher vs One-Time Pad</h3>
          <div className="mt-3.5 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line/12 text-[11px] uppercase tracking-wider text-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Aspect
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    XOR Cipher
                  </th>
                  <th scope="col" className="py-2 font-semibold text-accent-2">
                    One-Time Pad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/8">
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="align-top">
                    <th scope="row" className="py-2.5 pr-3 text-left text-xs font-semibold text-muted">
                      {row.label}
                    </th>
                    <td className="py-2.5 pr-3 text-xs leading-relaxed text-ink/85">
                      {row.xor.includes('XOR') ? (
                        <span className="font-mono">{row.xor}</span>
                      ) : (
                        row.xor
                      )}
                    </td>
                    <td className="py-2.5 text-xs leading-relaxed text-ink/85">
                      {row.otp.includes('XOR') ? (
                        <span className="font-mono">{row.otp}</span>
                      ) : (
                        row.otp
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass min-w-0 rounded-2xl p-5">
          <h3 className="text-base font-bold text-ink">Why the key length matters</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A key as long as the message can represent anything, so every plaintext of that length
            gives a different ciphertext and the attacker learns nothing new.
          </p>
          <CodeBlock tone="accent" className="mt-3">{`C = M XOR K,  |K| >= |M|

|equal length|  ->  any M is possible
|shorter key| ->  the key repeats
                   and structure leaks`}</CodeBlock>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            A real One-Time Pad needs as much key material as the data it protects, so real systems
            use authenticated ciphers such as AES-GCM.
          </p>
        </div>
      </div>
    </section>
  )
}
