import { useEffect } from 'react'
import { SECTION_IDS } from '../sections'

/** Gap kept between the sticky header and whatever we land on. */
const GAP = 12
/** Scroll duration floor and ceiling, in milliseconds. */
const MIN_MS = 300
const MAX_MS = 780
/** Extra milliseconds per pixel travelled, so long hops are not rushed. */
const MS_PER_PIXEL = 0.14

interface SectionScrollOptions {
  reducedMotion: boolean
}

let frame = 0
/** Inline `scroll-behavior` value to put back, while a scroll is being animated. */
let lockedBehavior: string | null = null

/**
 * Landing behaviour for in-page section links.
 *
 * A plain anchor jump aligns the section's padding box at `scroll-mt-24`, which
 * leaves the section title low and the Encrypt/Decrypt row near the fold, so every
 * nav click needed a little extra scrolling. This aims at the section content
 * instead, and scrolls further only when the section's first control would still
 * be out of view, so the operation is clickable straight away.
 *
 * The travel itself is animated here rather than left to `scroll-behavior: smooth`,
 * which spends a near-fixed duration on any distance: a short hop and a jump to the
 * bottom of the page then feel equally abrupt. The curve is eased in and out, and
 * the duration grows with the distance.
 *
 * Every link keeps its `href`, so the native jump stays the fallback.
 */
export function useSectionScroll({ reducedMotion }: SectionScrollOptions): void {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const href = target.closest('a[href^="#"]')?.getAttribute('href') ?? ''
      const id = decodeURIComponent(href.slice(1))
      if (!SECTION_IDS.includes(id)) return

      const section = document.getElementById(id)
      if (!section) return

      const header = document.querySelector<HTMLElement>('[data-page-header]')
      const headerHeight = header?.getBoundingClientRect().height ?? 0
      const scrollY = window.scrollY
      const underHeader = (offsetTop: number) => offsetTop - headerHeight - GAP

      // The section content, not its padding box: that is the heading, and it is
      // what the reader asked for by picking a section. Landing anywhere lower
      // dropped the title off the top of a phone screen, because the first
      // control of a section is taller than the room left under the heading, so
      // the heading and the control cannot both fit.
      const content = section.firstElementChild ?? section
      const contentTop = scrollY + content.getBoundingClientRect().top
      const top = Math.max(0, underHeader(contentTop))

      event.preventDefault()
      animateScrollTo(top, reducedMotion)
      if (window.location.hash !== `#${id}`) {
        window.history.pushState(null, '', `#${id}`)
      }
    }

    /** Any hand-driven scrolling takes over from the animation. */
    const onUserScroll = () => cancelScroll()

    document.addEventListener('click', onClick)
    window.addEventListener('wheel', onUserScroll, { passive: true })
    window.addEventListener('touchstart', onUserScroll, { passive: true })
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchstart', onUserScroll)
      cancelScroll()
    }
  }, [reducedMotion])
}

/** Ease in and out, so the motion starts and settles instead of snapping. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function cancelScroll(): void {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  releaseScrollBehavior()
}

/**
 * Animating frame by frame means overriding the page's `scroll-behavior: smooth`,
 * otherwise the browser animates every individual step and the motion lags.
 * The two argument `scrollTo` form is used because `behavior: 'instant'` is a
 * recent addition that older engines reject.
 */
function lockScrollBehavior(): void {
  const root = document.documentElement
  if (lockedBehavior === null) lockedBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
}

function releaseScrollBehavior(): void {
  if (lockedBehavior === null) return
  document.documentElement.style.scrollBehavior = lockedBehavior
  lockedBehavior = null
}

/** Animated scroll to an absolute offset, eased in and out. */
function animateScrollTo(target: number, reducedMotion: boolean): void {
  cancelScroll()
  const start = window.scrollY
  const distance = target - start
  if (Math.abs(distance) < 1) return

  if (reducedMotion) {
    window.scrollTo({ top: target, behavior: 'auto' })
    return
  }

  const duration = Math.min(MAX_MS, Math.max(MIN_MS, MIN_MS + Math.abs(distance) * MS_PER_PIXEL))
  const startedAt = performance.now()
  lockScrollBehavior()

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    window.scrollTo(0, start + distance * easeInOutCubic(progress))
    if (progress < 1) {
      frame = requestAnimationFrame(step)
      return
    }
    frame = 0
    releaseScrollBehavior()
  }

  frame = requestAnimationFrame(step)
}
