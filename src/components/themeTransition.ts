import { flushSync } from 'react-dom'
import type { Theme } from '../hooks/useTheme'

/** Grow the circle, swap the theme, then settle. */
const EXPAND_MS = 620
/**
 * Phones get a shorter wipe. Clipping a full page snapshot costs far more on a
 * small device, and the switch is locked for the whole animation, so the longer
 * duration reads as a lag on the tap rather than as motion.
 */
const EXPAND_MS_TOUCH = 380
/** Matches the `body` background transition in `index.css`. */
const SETTLE_MS = 340

let animating = false

const THEME_WIPE_STYLE_ID = 'theme-wipe-keyframes'

function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function'
  )
}

/** The CSS variables of a theme, read without touching the live document. */
function themeVars(theme: Theme): { canvas: string; accent: string; accent2: string } {
  const probe = document.createElement('div')
  // `.dark` carries the dark variables on any element, so the target theme can
  // be measured without flipping the class of the real document.
  probe.className = theme === 'dark' ? 'dark' : ''
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;'
  document.body.appendChild(probe)
  const styles = getComputedStyle(probe)
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  const vars = {
    canvas: read('--c-canvas', theme === 'dark' ? '6 9 16' : '244 247 252'),
    accent: read('--c-accent', '56 189 248'),
    accent2: read('--c-accent-2', '167 139 250'),
  }
  probe.remove()
  return vars
}

/**
 * The reveal keyframe for one click.
 *
 * Written into a stylesheet instead of a custom property, so the origin reaches
 * the view transition pseudo element itself: it starts at the theme switch, not
 * at the centre of the page.
 */
function setCircleKeyframes(x: number, y: number, radius: number, duration: number): void {
  let style = document.getElementById(THEME_WIPE_STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = THEME_WIPE_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = [
    '@keyframes theme-circle-reveal {',
    `  from { clip-path: circle(0px at ${x}px ${y}px) }`,
    `  to { clip-path: circle(${radius}px at ${x}px ${y}px) }`,
    '}',
    // The durations live here too, so the circle and the group that drops the
    // snapshots can shorten together on a touch device.
    `::view-transition-new(root) { animation-duration: ${duration}ms }`,
    `::view-transition-group(root) { animation-duration: ${duration}ms }`,
  ].join('\n')
}

/** Wipe length for the device in hand. */
function wipeDuration(): number {
  return window.matchMedia('(pointer: coarse)').matches ? EXPAND_MS_TOUCH : EXPAND_MS
}

/** Distance from the origin to the farthest corner of the viewport. */
function reachFrom(x: number, y: number): number {
  return (
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 24
  )
}

/**
 * Theme change as a circle that grows out of the switch and reveals the new
 * theme, in both directions.
 *
 * The browser's View Transitions API is used when it exists: both snapshots are
 * real renderings of the page, so the text, the cards and the constellation
 * wipe over together instead of being covered by a flat disc. Older browsers
 * fall back to a disc painted in the target theme's background, which is the
 * same wipe without the content.
 */
export function playThemeTransition(
  origin: { x: number; y: number } | null,
  next: Theme,
  apply: () => void,
): void {
  if (animating || origin === null) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply()
    return
  }

  animating = true
  const root = document.documentElement
  const reach = reachFrom(origin.x, origin.y)
  const wipeMs = wipeDuration()

  if (supportsViewTransitions()) {
    // The circle is driven by a keyframe built for this click, because the
    // view transition pseudo elements do not reliably see custom properties, so
    // a `var()` origin would fall back and grow from the middle of the page.
    setCircleKeyframes(origin.x, origin.y, reach, wipeMs)
    // Keeps the live background from animating underneath the snapshots.
    root.classList.add('theme-wipe')

    let transition: ViewTransition | null = null
    try {
      transition = document.startViewTransition(() => {
        flushSync(apply)
        // The class has to be on <html> before the new snapshot is taken, and
        // the theme effect may not have run yet. It carries `color-scheme` too,
        // so this is the only write the root needs during the capture.
        root.classList.toggle('dark', next === 'dark')
      })
    } catch {
      transition = null
    }

    if (transition) {
      // Hold the reader where they were while the snapshots play. The new
      // snapshot is taken up front, so a scroll now, such as the address bar
      // collapsing under the tap, would only surface as a jump at the end.
      const heldY = window.scrollY
      const holdScroll = () => {
        if (Math.abs(window.scrollY - heldY) > 1) window.scrollTo(0, heldY)
      }
      window.addEventListener('scroll', holdScroll, { passive: true })

      const cleanup = () => {
        animating = false
        root.classList.remove('theme-wipe')
        window.removeEventListener('scroll', holdScroll)
      }
      transition.finished.then(cleanup, cleanup)
      // A transition that never finishes (backgrounded tab) must not lock the switch.
      window.setTimeout(cleanup, wipeMs + 400)
      return
    }
  }

  /* ---- fallback: a disc in the target theme's background ---------------- */
  const { canvas, accent, accent2 } = themeVars(next)
  const circle = document.createElement('div')
  circle.setAttribute('aria-hidden', 'true')
  circle.style.cssText = [
    'position:fixed',
    `left:${origin.x}px`,
    `top:${origin.y}px`,
    `width:${reach * 2}px`,
    `height:${reach * 2}px`,
    'border-radius:50%',
    'background-color:rgb(' + canvas + ')',
    `background-image:radial-gradient(1100px 620px at 12% -10%, rgb(${accent} / 0.13), transparent 60%),radial-gradient(900px 560px at 88% 4%, rgb(${accent2} / 0.12), transparent 62%),radial-gradient(1000px 700px at 50% 108%, rgb(${accent} / 0.08), transparent 65%)`,
    `background-size:${window.innerWidth}px ${window.innerHeight}px`,
    'background-position:center',
    'background-repeat:no-repeat',
    'transform:translate(-50%,-50%) scale(0)',
    `transition:transform ${wipeMs}ms cubic-bezier(0.4,0,0.2,1)`,
    'pointer-events:none',
    'z-index:2147483000',
    'will-change:transform',
  ].join(';')
  document.body.appendChild(circle)

  let swapped = false
  const finish = () => {
    if (swapped) return
    swapped = true
    animating = false
    apply()
    window.setTimeout(() => circle.remove(), SETTLE_MS)
  }

  circle.addEventListener('transitionend', finish, { once: true })
  // Fallback for a dropped transition, e.g. a backgrounded tab.
  window.setTimeout(finish, wipeMs + 120)

  window.requestAnimationFrame(() => {
    circle.style.transform = 'translate(-50%,-50%) scale(1)'
  })
}
