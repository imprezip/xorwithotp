import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

/**
 * Whole-page smoke test.
 *
 * `react-dom/server` walks the entire component tree, so any broken import,
 * hook misuse, or crash in one of the three sections fails here. It renders
 * without effects, which is exactly what is wanted: no DOM, no canvas, no
 * timers.
 */
describe('App', () => {
  const html = renderToStaticMarkup(<App />)

  it('renders all three sections with stable anchors', () => {
    expect(html).toContain('id="xor-cipher"')
    expect(html).toContain('id="security"')
    expect(html).toContain('id="otp"')
  })

  it('renders the hero, both ciphers and the footer', () => {
    expect(html).toContain('CRYPTO LAB')
    expect(html).toContain('XOR Cipher')
    expect(html).toContain('Security Attack')
    expect(html).toContain('Key Reuse Attack')
    expect(html).toContain('One-Time Pad Requirements')
    expect(html).toContain('Interactive Cryptography Learning Tool')
  })

  it('offers the three XOR modes and the two operations', () => {
    expect(html).toContain('OTP Mode')
    expect(html).toContain('Exercise Mode')
    expect(html).toContain('Show Steps')
    expect(html).toMatch(/>Encrypt</)
    expect(html).toMatch(/>Decrypt</)
  })

  it('never claims that C1 XOR C2 is the key', () => {
    expect(html).toContain('M1 XOR M2')
    expect(html).not.toMatch(/C1\s*(?:\+|⊕|XOR|xor)\s*C2\s*=(?:\s*K|\s*Key)/)
  })
})
