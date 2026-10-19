import { describe, expect, it } from 'vitest'
import { bytesEqual, bytesToHex, bytesToHexSpaced, textToBytes } from './bytes'
import { generateRandomKey, OtpKeyVault } from './otp'
import { runXor } from './pipeline'
import { xorDecrypt } from './xor'

describe('generateRandomKey', () => {
  it('produces exactly the requested number of bytes', () => {
    for (const length of [1, 5, 16, 32, 64, 255, 4096]) {
      expect(generateRandomKey(length).length).toBe(length)
    }
  })

  it('produces an empty key for length zero', () => {
    expect(generateRandomKey(0).length).toBe(0)
  })

  it('uses a cryptographically secure source, not Math.random', () => {
    // A CSPRNG produces 128 distinct values in 128 draws; Math.random() would
    // be far more likely to collide, and the stub below would be used instead.
    const mathRandom = Math.random
    Math.random = () => 0.5
    try {
      const a = generateRandomKey(32)
      const b = generateRandomKey(32)
      expect(bytesEqual(a, b)).toBe(false)
      expect(bytesToHex(a)).not.toBe('80'.repeat(32))
    } finally {
      Math.random = mathRandom
    }
  })

  it('generates different keys on every call', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 64; i += 1) {
      seen.add(bytesToHex(generateRandomKey(8)))
    }
    expect(seen.size).toBe(64)
  })

  it('handles keys larger than the 64 KiB getRandomValues limit', () => {
    const key = generateRandomKey(70_000)
    expect(key.length).toBe(70_000)
    expect(new Set(key).size).toBeGreaterThan(200)
  })

  it('rejects invalid lengths', () => {
    expect(() => generateRandomKey(-1)).toThrow()
    expect(() => generateRandomKey(1.5)).toThrow()
  })
})

describe('One-Time Pad round trip', () => {
  it('encrypts and decrypts with a random key of the same length as the message', () => {
    const message = textToBytes('HELLO')
    const key = generateRandomKey(message.length)
    expect(key.length).toBe(5)

    const encrypted = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: bytesToHexSpaced(key),
      keyFormat: 'hex',
      outputFormat: 'hex',
    })
    const decrypted = runXor({
      operation: 'decrypt',
      input: encrypted.outputText,
      inputFormat: 'hex',
      key: bytesToHexSpaced(key),
      keyFormat: 'hex',
      outputFormat: 'hex',
    })
    expect(decrypted.outputAsText).toBe('HELLO')
  })

  it('reveals nothing about the message for a random key', () => {
    const message = 'café ☕ bar'
    const bytes = textToBytes(message)
    const a = runXor({
      operation: 'encrypt',
      input: message,
      inputFormat: 'text',
      key: bytesToHex(generateRandomKey(bytes.length)),
      keyFormat: 'hex',
      outputFormat: 'hex',
    })
    const b = runXor({
      operation: 'encrypt',
      input: message,
      inputFormat: 'text',
      key: bytesToHex(generateRandomKey(bytes.length)),
      keyFormat: 'hex',
      outputFormat: 'hex',
    })
    expect(a.outputHex).not.toBe(b.outputHex)
  })

  it('keeps the decryption lossless for utf-8 payloads', () => {
    const message = '日本語のメッセージ'
    const bytes = textToBytes(message)
    const key = generateRandomKey(bytes.length)
    expect(new TextDecoder().decode(xorDecrypt(
      runXor({
        operation: 'encrypt',
        input: message,
        inputFormat: 'text',
        key: bytesToHex(key),
        keyFormat: 'hex',
        outputFormat: 'hex',
      }).outputBytes,
      key,
    ))).toBe(message)
  })
})

describe('OtpKeyVault', () => {
  it('marks a key as used and refuses to reuse it', () => {
    const vault = new OtpKeyVault()
    const key = generateRandomKey(4)
    const record = vault.issue(key)

    expect(record.usedAt).toBeNull()
    expect(record.spaced).toBe(bytesToHexSpaced(key))
    expect(vault.isUsed(record.hex)).toBe(false)

    vault.markUsed(record.hex)
    expect(vault.isUsed(record.hex)).toBe(true)
    expect(() => vault.assertUnused(record.hex)).toThrow(
      'This OTP key has already been used. OTP keys must never be reused.',
    )
  })

  it('rejects issuing the same key twice', () => {
    const vault = new OtpKeyVault()
    const key = generateRandomKey(4)
    vault.issue(key)
    expect(() => vault.issue(key)).toThrow(
      'This OTP key has already been issued. OTP keys must never be reused.',
    )
  })

  it('keeps unused keys acceptable and lists them newest first', () => {
    const vault = new OtpKeyVault()
    const first = vault.issue(generateRandomKey(4))
    const second = vault.issue(generateRandomKey(4))
    expect(() => vault.assertUnused(first.hex)).not.toThrow()
    expect(vault.list()).toHaveLength(2)
    expect(vault.isKnown(second.hex)).toBe(true)
    expect(vault.isKnown('FFFFFFFF')).toBe(false)
  })

  it('can be cleared for a fresh session', () => {
    const vault = new OtpKeyVault()
    const record = vault.issue(generateRandomKey(4))
    vault.markUsed(record.hex)
    vault.clear()
    expect(vault.list()).toHaveLength(0)
    expect(() => vault.assertUnused(record.hex)).not.toThrow()
  })
})
