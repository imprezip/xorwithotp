import { Binary } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../hooks/useTheme'
import { NAV_ITEMS } from '../sections'

interface HeaderProps {
  theme: Theme
  onToggleTheme: () => void
  activeSection: string | null
}

export function Header({ theme, onToggleTheme, activeSection }: HeaderProps) {
  return (
    <header
      data-page-header
      className="sticky top-0 z-40 border-b border-line/10 bg-canvas/75 backdrop-blur-xl"
    >
      {/* Equal side tracks, so the section links stay centred in the header however
          wide the brand or the theme toggle happens to be. The nav track can shrink,
          because its list scrolls sideways, which keeps the brand and toggle intact. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <a href="#top" className="group flex min-w-0 items-center gap-2.5" aria-label="CryptoLab home">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/35 bg-accent/12 text-accent transition-shadow duration-200 group-hover:shadow-glow">
            <Binary size={18} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[15px] font-bold tracking-tight text-ink">CryptoLab</span>
            {/* Hidden on a phone, where it would squeeze the section links. */}
            <span className="mt-0.5 hidden truncate text-[10px] uppercase tracking-[0.18em] text-faint sm:block">
              XOR · OTP · Attacks
            </span>
          </span>
        </a>

        {/* The links sit in the middle of equal tracks, but the brand carries more
            visual weight than the toggle, so the group reads a touch left. Nudged
            without touching the track sizes. */}
        <nav aria-label="Sections" className="min-w-0 sm:translate-x-1.5">
          <ul className="scrollbar-none flex items-center gap-1 overflow-x-auto sm:justify-center">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? 'true' : undefined}
                    className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors duration-200 sm:px-3 ${
                      active
                        ? 'bg-accent/12 text-accent'
                        : 'text-muted hover:bg-raised/8 hover:text-ink'
                    }`}
                  >
                    {item.label}
                    {/* Inside the link box: the nav scrolls sideways, so anything drawn
                        below it would be clipped by the scroll container. */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-accent transition-opacity duration-200 ${
                        active ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}
