/**
 * One-Time Pad key material.
 *
 * A One-Time Pad is not a different algorithm: it is the very same XOR
 * operation, plus three extra rules on the key
 * (truly random, at least as long as the message, never reused).
 * This module owns the randomness and the reuse bookkeeping.
 */
import { CryptoError } from './errors'
import { bytesToHex, bytesToHexSpaced } from './bytes'

/** `crypto.getRandomValues()` refuses more than 64 KiB per call. */
const MAX_RANDOM_CHUNK = 65536

/**
 * Generate `length` cryptographically secure random bytes.
 * `Math.random()` is never used. It is not a CSPRNG and would break the
 * "truly random key" requirement of the One-Time Pad.
 */
export function generateRandomKey(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new CryptoError('Key length must be a non-negative whole number of bytes.')
  }
  const out = new Uint8Array(length)
  for (let offset = 0; offset < length; offset += MAX_RANDOM_CHUNK) {
    const chunk = out.subarray(offset, Math.min(offset + MAX_RANDOM_CHUNK, length))
    crypto.getRandomValues(chunk)
  }
  return out
}

export interface OtpKeyRecord {
  /** Canonical uppercase hexadecimal key. */
  hex: string
  /** Human friendly grouped form: `A8 31 F4 92 7C`. */
  spaced: string
  length: number
  issuedAt: number
  usedAt: number | null
  /** True when the key was created for the "reuse is forbidden" demonstration. */
  otpStyle: boolean
}

/**
 * Session-scoped registry of issued One-Time Pad keys.
 *
 * Once a key has been used for an encryption it is marked `USED`. Re-using it
 * is rejected. That is the single most important property of a One-Time Pad.
 */
export class OtpKeyVault {
  private readonly records = new Map<string, OtpKeyRecord>()

  /** Register freshly generated key material. */
  issue(bytes: Uint8Array, otpStyle = true): OtpKeyRecord {
    const hex = bytesToHex(bytes)
    const existing = this.records.get(hex)
    if (existing) {
      throw new CryptoError(
        'This OTP key has already been issued. OTP keys must never be reused.',
      )
    }
    const record: OtpKeyRecord = {
      hex,
      spaced: bytesToHexSpaced(bytes),
      length: bytes.length,
      issuedAt: Date.now(),
      usedAt: null,
      otpStyle,
    }
    this.records.set(hex, record)
    return record
  }

  get(hex: string): OtpKeyRecord | undefined {
    return this.records.get(hex.toUpperCase())
  }

  isUsed(hex: string): boolean {
    const record = this.get(hex)
    return Boolean(record?.usedAt)
  }

  /** Mark a key as consumed by an encryption. */
  markUsed(hex: string): OtpKeyRecord | undefined {
    const record = this.get(hex)
    if (!record) return undefined
    if (record.usedAt === null) {
      record.usedAt = Date.now()
    }
    return record
  }

  /** Throw if the key was already consumed by a previous encryption. */
  assertUnused(hex: string): void {
    if (this.isUsed(hex)) {
      throw new CryptoError('This OTP key has already been used. OTP keys must never be reused.')
    }
  }

  /** True when the key is known to this session (used or not). */
  isKnown(hex: string): boolean {
    return this.records.has(hex.toUpperCase())
  }

  list(): OtpKeyRecord[] {
    return [...this.records.values()].sort((a, b) => b.issuedAt - a.issuedAt)
  }

  clear(): void {
    this.records.clear()
  }
}
