import { Lock, Swords, Zap } from 'lucide-react'

const FLOW = [
  { label: 'MESSAGE', value: 'HELLO', mono: '48 45 4C 4C 4F' },
  { label: 'KEY', value: 'ABCDE', mono: '41 42 43 44 45' },
]

export function Hero() {
  return (
    <section id="top" className="relative scroll-mt-24 pt-12 pb-6 sm:pt-16 sm:pb-10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="animate-fade-in">
          <span className="chip border-accent/30 bg-accent/10 text-accent">
            <Zap size={11} aria-hidden="true" />
            Interactive cryptography lab
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            <span className="block">CRYPTO LAB</span>
            <span className="mt-2 block bg-gradient-to-r from-accent via-accent-2 to-accent bg-clip-text text-transparent">
              Interactive XOR Stream Cipher
              <br className="hidden sm:block" /> &amp; One-Time Pad
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Watch every byte travel from text to bytes to binary to ciphertext, then see what
            reusing one key gives away.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#xor-cipher" className="btn btn-primary w-full sm:w-auto">
              <Lock size={16} aria-hidden="true" />
              XOR Cipher
            </a>
            <a href="#security" className="btn btn-ghost w-full sm:w-auto">
              <Swords size={16} aria-hidden="true" />
              Key Reuse Attack
            </a>
          </div>
        </div>

        <FlowDiagram />
      </div>
    </section>
  )
}

function FlowDiagram() {
  return (
    <div
      className="glass animate-fade-in relative overflow-hidden rounded-3xl p-5 sm:p-6"
      aria-label="Message and key combined with XOR to produce ciphertext"
      role="img"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--c-accent)/0.16),transparent_60%)]"
      />

      <p className="label text-center text-accent/80">How a byte becomes ciphertext</p>

      <div className="relative mt-4 space-y-3">
        {FLOW.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-line/12 bg-canvas/45 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="label">{item.label}</p>
              <p className="truncate font-mono text-[13px] text-ink">{item.value}</p>
            </div>
            <p className="hidden shrink-0 font-mono text-[11px] text-faint sm:block">
              {item.mono}
            </p>
          </div>
        ))}

        <div className="flex items-center justify-center gap-2 text-accent" aria-hidden="true">
          <Connector />
          <span className="rounded-lg border border-accent/40 bg-accent/12 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
            +
          </span>
          <Connector />
        </div>

        <div className="relative flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-xl border border-accent/45 bg-accent/12 px-5 py-3 shadow-glow">
            <span className="font-mono text-lg font-black text-accent">XOR</span>
          </div>
          <svg
            className="absolute inset-x-0 top-full h-9 w-full"
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="30"
              stroke="rgb(var(--c-accent))"
              strokeWidth="0.7"
              strokeDasharray="4 4"
              className="animate-dash"
            />
          </svg>
        </div>

        <div className="h-6" aria-hidden="true" />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-ok/35 bg-ok/8 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="label text-ok/80">CIPHERTEXT</p>
            <p className="truncate font-mono text-[13px] text-ok">09070F080A</p>
          </div>
          <p className="hidden shrink-0 font-mono text-[11px] text-faint sm:block">
            09 07 0F 08 0A
          </p>
        </div>
      </div>
    </div>
  )
}

function Connector() {
  return (
    <span
      aria-hidden="true"
      className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-accent/40"
    />
  )
}
