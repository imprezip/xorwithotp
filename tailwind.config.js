/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Fine-grained opacity steps so thin glassmorphism borders stay subtle.
      opacity: {
        2: '0.02',
        3: '0.03',
        4: '0.04',
        6: '0.06',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        28: '0.28',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        canvas2: 'rgb(var(--c-canvas-2) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        lineStrong: 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        // Quoted so the utility is written `text-accent-2`, not `text-accent2`.
        'accent-2': 'rgb(var(--c-accent-2) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 20px 45px -25px rgb(0 0 0 / 0.6)',
        // Named `glow-*` rather than `shadow-<color>`: box-shadow theme values
        // are plain strings, so they cannot take an `/opacity` modifier.
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.25), 0 0 26px -6px rgb(var(--c-accent) / 0.45)',
        'glow-accent-2':
          '0 0 0 1px rgb(var(--c-accent-2) / 0.25), 0 0 26px -6px rgb(var(--c-accent-2) / 0.45)',
        'glow-warn':
          '0 0 0 1px rgb(var(--c-warn) / 0.25), 0 0 26px -6px rgb(var(--c-warn) / 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-warn': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--c-warn) / 0.0)' },
          '50%': { boxShadow: '0 0 0 6px rgb(var(--c-warn) / 0.18)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        dash: {
          to: { strokeDashoffset: '-40' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
        'slide-up': 'slide-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-warn': 'pulse-warn 1.6s ease-in-out 2',
        shimmer: 'shimmer 6s linear infinite',
        float: 'float 6s ease-in-out infinite',
        dash: 'dash 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
