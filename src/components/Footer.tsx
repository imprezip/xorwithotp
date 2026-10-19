import { Binary } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line/10 bg-canvas/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/35 bg-accent/12 text-accent">
                <Binary size={18} aria-hidden="true" />
              </span>
              <p className="text-lg font-bold tracking-tight text-ink">CryptoLab</p>
            </div>
            <p className="mt-3 text-sm text-muted">Interactive Cryptography Learning Tool</p>
          </div>

          <nav aria-label="Footer" className="shrink-0">
            <p className="label">Sections</p>
            <ul className="mt-2.5 space-y-1.5 text-sm">
              {[
                { href: '#xor-cipher', label: '1. XOR Cipher' },
                { href: '#security', label: '2. Security / Key Reuse Attack' },
                { href: '#otp', label: '3. OTP Requirements' },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-muted transition-colors hover:text-accent">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
