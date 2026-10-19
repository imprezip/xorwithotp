import { useMemo } from 'react'
import { ConstellationBackground } from './components/ConstellationBackground'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { AttackSection } from './components/attack/AttackSection'
import { OtpRequirementsSection } from './components/otp/OtpRequirementsSection'
import { XorCipherSection } from './components/xor/XorCipherSection'
import { useActiveSection } from './hooks/useActiveSection'
import { useSectionScroll } from './hooks/useSectionScroll'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { useTheme } from './hooks/useTheme'
import { SECTION_IDS } from './sections'

export default function App() {
  const { theme, toggle } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  // Kept referentially stable: the observer effect must not re-subscribe.
  const sectionIds = useMemo(() => SECTION_IDS, [])
  const activeSection = useActiveSection(sectionIds)
  useSectionScroll({ reducedMotion })

  return (
    <div className="relative flex min-h-screen flex-col">
      <a
        href="#xor-cipher"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-accent/50 focus:bg-canvas focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent"
      >
        Skip to the XOR Cipher
      </a>

      <ConstellationBackground theme={theme} reducedMotion={reducedMotion} />
      <Header theme={theme} onToggleTheme={toggle} activeSection={activeSection} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Hero />
          <XorCipherSection />
          <div className="hairline" />
          <AttackSection />
          <div className="hairline" />
          <OtpRequirementsSection />
        </div>
      </main>

      <Footer />
    </div>
  )
}
