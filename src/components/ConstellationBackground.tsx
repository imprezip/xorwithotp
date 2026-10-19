import { useEffect, useRef } from 'react'
import type { Theme } from '../hooks/useTheme'

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  depth: number
  phase: number
  pull: number
  pullX: number
  pullY: number
}

interface Props {
  theme: Theme
  reducedMotion: boolean
}

const MAX_STARS = 116
const LINK_DISTANCE = 132
const CURSOR_RADIUS = 190
const CURSOR_PULL = 0.055

/**
 * Interactive constellation background.
 *
 * Purely decorative: it never takes part in the cryptography. Design notes:
 *  - one `requestAnimationFrame` loop, no per-star timers;
 *  - the particle count scales with the viewport but is hard-capped;
 *  - O(n²) link search is fine at <= 116 stars (~6.7k distance checks);
 *  - the loop is paused while the tab is hidden;
 *  - `prefers-reduced-motion` renders a single static frame;
 *  - colours come from the CSS variables, so the effect follows the theme.
 */
export function ConstellationBackground({ theme, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // The effect re-runs whenever the theme or the motion preference changes, so
  // both values are read straight from the closure, so no ref bookkeeping.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let stars: Star[] = []
    let width = 0
    let height = 0
    let ratio = 1
    let frame = 0
    let running = true

    const pointer = { x: -9999, y: -9999, active: false }
    const hasPointer = window.matchMedia('(pointer: fine)').matches

    const readColors = () => {
      const styles = getComputedStyle(document.documentElement)
      const star = styles.getPropertyValue('--star').trim() || '190 214 255'
      const line = styles.getPropertyValue('--line-rgb').trim() || '148 197 255'
      return {
        star: `rgb(${star})`,
        link: `rgb(${line})`,
      }
    }

    let colors = readColors()

    const spawn = (existing: Star[] = []): Star[] => {
      const area = width * height
      const count = Math.max(28, Math.min(MAX_STARS, Math.round(area / 15500)))
      const next: Star[] = []
      for (let i = 0; i < count; i += 1) {
        const depth = 0.35 + Math.random() * 0.65
        next.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.16 * depth,
          vy: (Math.random() - 0.5) * 0.16 * depth,
          radius: 0.5 + depth * 1.5,
          depth,
          phase: Math.random() * Math.PI * 2,
          pull: 0,
          pullX: 0,
          pullY: 0,
        })
      }
      // Preserve existing positions so a resize does not restart the animation.
      existing.forEach((star, index) => {
        if (next[index]) {
          next[index].x = star.x
          next[index].y = star.y
          next[index].vx = star.vx
          next[index].vy = star.vy
        }
      })
      return next
    }

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      stars = spawn(stars)
      colors = readColors()
    }

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }

    const onPointerLeave = () => {
      pointer.active = false
    }

    const step = () => {
      for (const star of stars) {
        star.x += star.vx
        star.y += star.vy
        star.phase += 0.006 + star.depth * 0.004

        // Gentle drift so the field never looks frozen.
        star.vx += Math.cos(star.phase) * 0.0016
        star.vy += Math.sin(star.phase * 0.8) * 0.0016
        star.vx *= 0.994
        star.vy *= 0.994

        // Cursor interaction: nearby stars lean towards the pointer.
        if (pointer.active && hasPointer) {
          const dx = pointer.x - star.x
          const dy = pointer.y - star.y
          const distance = Math.hypot(dx, dy)
          if (distance < CURSOR_RADIUS) {
            const strength = 1 - distance / CURSOR_RADIUS
            star.pull = strength * strength
            star.pullX = (dx / (distance || 1)) * strength * 1.5
            star.pullY = (dy / (distance || 1)) * strength * 1.5
          }
        }
        star.pull *= 0.86
        if (star.pull < 0.01) {
          star.pull = 0
          star.pullX = 0
          star.pullY = 0
        }

        star.x += star.pullX * CURSOR_PULL
        star.y += star.pullY * CURSOR_PULL

        if (star.x < -20) star.x = width + 20
        if (star.x > width + 20) star.x = -20
        if (star.y < -20) star.y = height + 20
        if (star.y > height + 20) star.y = -20
      }
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)

      // Links first so the stars sit on top of them.
      context.lineWidth = 1
      for (let i = 0; i < stars.length; i += 1) {
        const a = stars[i]
        for (let j = i + 1; j < stars.length; j += 1) {
          const b = stars[j]
          const dx = a.x - b.x
          if (dx > LINK_DISTANCE || dx < -LINK_DISTANCE) continue
          const dy = a.y - b.y
          if (dy > LINK_DISTANCE || dy < -LINK_DISTANCE) continue
          const distance = Math.hypot(dx, dy)
          if (distance > LINK_DISTANCE) continue
          const strength = 1 - distance / LINK_DISTANCE
          context.strokeStyle = withAlpha(colors.link, 0.06 + strength * 0.3)
          context.beginPath()
          context.moveTo(a.x, a.y)
          context.lineTo(b.x, b.y)
          context.stroke()
        }
      }

      for (const star of stars) {
        const twinkle = 0.55 + Math.sin(star.phase * 1.7) * 0.18 + star.pull * 0.5
        context.fillStyle = withAlpha(colors.star, Math.min(0.85, twinkle * (0.4 + star.depth * 0.6)))
        context.beginPath()
        context.arc(star.x, star.y, star.radius + star.pull * 1.1, 0, Math.PI * 2)
        context.fill()
      }
    }

    const loop = () => {
      if (!running) return
      step()
      draw()
      frame = window.requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        window.cancelAnimationFrame(frame)
      } else if (!reducedMotion) {
        running = true
        frame = window.requestAnimationFrame(loop)
      }
    }

    // The theme class on <html> carries the colours, so they are re-read when it
    // changes. Without this the field keeps painting the old theme's colours,
    // because this effect runs before the class is actually toggled.
    const themeObserver = new MutationObserver(() => {
      colors = readColors()
      draw()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    resize()
    draw()
    if (!reducedMotion) {
      frame = window.requestAnimationFrame(loop)
    } else {
      running = false
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      themeObserver.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reducedMotion, theme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}

/** `rgb(r g b)` + alpha -> `rgba(r, g, b, a)`; Safari-safe fallback included. */
function withAlpha(color: string, alpha: number): string {
  const match = color.match(/-?\d+(\.\d+)?/g)
  if (!match || match.length < 3) return color
  const [r, g, b] = match
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
