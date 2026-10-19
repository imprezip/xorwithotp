/**
 * The XOR stream cipher itself.
 *
 * This is the *only* place where encryption and decryption are implemented:
 *
 *     C = M XOR K
 *     M = C XOR K      (XOR is its own inverse)
 *
 * Key handling, which the user controls and the app never hides:
 *  - a key shorter than the message is repeated until it covers every byte;
 *  - a key longer than the message is truncated to the message length;
 *  - inputs are never mutated, a new `Uint8Array` is always returned.
 *
 * Repeating a key is exactly what destroys the One-Time Pad guarantee, which
 * is why section 2 (key reuse) exists, but it is a legitimate thing to want
 * here, so it is done visibly: `applyKey` reports what happened.
 */
import { CryptoError } from './errors'
import { bytesEqual, bytesToHex, hexToBytes, textToBytes } from './bytes'

/** Byte-wise exclusive OR. Lengths must match exactly. */
export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new CryptoError('Key length must match the input length in bytes.')
  }
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i += 1) {
    out[i] = a[i] ^ b[i]
  }
  return out
}

/**
 * What happened to the key before it was used.
 *
 * Surfaced in the UI so repeating or truncating is never invisible.
 */
export interface KeyUsage {
  /** Bytes the user typed. */
  keyLength: number
  /** Bytes actually applied. Always the message length. */
  effectiveLength: number
  /** How many times the key had to be repeated (1 when it already fit). */
  repeats: number
  /** Bytes dropped from the end of an over-long key. */
  truncated: number
  mode: 'exact' | 'repeated' | 'truncated'
}

/**
 * Stretch or trim a key to exactly `length` bytes.
 *
 * - shorter than needed -> repeated from the start until it fits
 * - longer than needed  -> cut to the first `length` bytes
 */
export function applyKey(key: Uint8Array, length: number): { bytes: Uint8Array; usage: KeyUsage } {
  if (key.length === 0) {
    throw new CryptoError('Please enter a key.')
  }
  if (length === 0) {
    return { bytes: new Uint8Array(0), usage: usageOf(key.length, 0) }
  }

  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i += 1) {
    bytes[i] = key[i % key.length]
  }
  return { bytes, usage: usageOf(key.length, length) }
}

function usageOf(keyLength: number, effectiveLength: number): KeyUsage {
  const truncated = Math.max(0, keyLength - effectiveLength)
  const repeats = effectiveLength === 0 ? 1 : Math.ceil(effectiveLength / Math.max(1, keyLength))
  return {
    keyLength,
    effectiveLength,
    repeats,
    truncated,
    mode: truncated > 0 ? 'truncated' : repeats > 1 ? 'repeated' : 'exact',
  }
}

/** One-line human summary of {@link KeyUsage}, e.g. "key repeated 3x to cover 15 bytes". */
export function describeKeyUsage(usage: KeyUsage): string {
  if (usage.mode === 'exact') {
    return `Key is exactly ${usage.effectiveLength} ${plural(usage.effectiveLength, 'byte')}.`
  }
  if (usage.mode === 'repeated') {
    return `Key is ${usage.keyLength} ${plural(usage.keyLength, 'byte')} and is repeated ${usage.repeats}x to cover ${usage.effectiveLength} ${plural(usage.effectiveLength, 'byte')}.`
  }
  return `Key is ${usage.keyLength} ${plural(usage.keyLength, 'byte')} and is truncated to the first ${usage.effectiveLength} ${plural(usage.effectiveLength, 'byte')}.`
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`
}

/** Encrypt bytes: `C = M XOR K`, with the key repeated or trimmed to fit. */
export function xorEncrypt(message: Uint8Array, key: Uint8Array): Uint8Array {
  return xorBytes(message, applyKey(key, message.length).bytes)
}

/** Decrypt bytes: `M = C XOR K`. Identical operation: XOR is self-inverse. */
export function xorDecrypt(ciphertext: Uint8Array, key: Uint8Array): Uint8Array {
  return xorBytes(ciphertext, applyKey(key, ciphertext.length).bytes)
}

/** Convenience helper used by the attack section: XOR two hexadecimal strings. */
export function xorHex(a: string, b: string): string {
  return bytesToHex(xorBytes(hexToBytes(a), hexToBytes(b)))
}

/** Round-trip self check, used in tests and by the "sanity" hint in the UI. */
export function roundTripIsLossless(message: Uint8Array, key: Uint8Array): boolean {
  return bytesEqual(xorDecrypt(xorEncrypt(message, key), key), message)
}

/** A single XOR row, rendered by the step views. */
export interface XorRow {
  index: number
  messageByte: number
  keyByte: number
  resultByte: number
  messageHex: string
  keyHex: string
  resultHex: string
  messageBin: string
  keyBin: string
  resultBin: string
  /** Right column set bits of `messageByte XOR keyByte`, for a bit-level highlight. */
  setBits: number[]
}

/** Build the per-byte table that powers the "Show Steps" visualisation. */
export function buildXorRows(message: Uint8Array, key: Uint8Array): XorRow[] {
  const effective = applyKey(key, message.length).bytes
  const result = xorBytes(message, effective)
  const rows: XorRow[] = []
  for (let i = 0; i < result.length; i += 1) {
    rows.push({
      index: i,
      messageByte: message[i],
      keyByte: effective[i],
      resultByte: result[i],
      messageHex: toHexPair(message[i]),
      keyHex: toHexPair(effective[i]),
      resultHex: toHexPair(result[i]),
      messageBin: toBin8(message[i]),
      keyBin: toBin8(effective[i]),
      resultBin: toBin8(result[i]),
      setBits: bitsSetIn(result[i]),
    })
  }
  return rows
}

/** Byte-level identity check: `C1 XOR C2 === M1 XOR M2`. */
export function verifyKeyReuseIdentity(
  message1: Uint8Array,
  message2: Uint8Array,
  key: Uint8Array,
  ciphertext1: Uint8Array,
  ciphertext2: Uint8Array,
): boolean {
  if (message1.length !== message2.length) return false
  if (ciphertext1.length !== ciphertext2.length) return false
  if (key.length === 0) return false
  const fromCiphertexts = xorBytes(ciphertext1, ciphertext2)
  const fromMessages = xorBytes(message1, message2)
  return bytesEqual(fromCiphertexts, fromMessages)
}

/** The key is perfectly masked out of `C1 XOR C2` because `K XOR K = 0`. */
export function keyCancelsOut(key: Uint8Array): boolean {
  if (key.length === 0) return false
  return xorBytes(key, key).every((byte) => byte === 0)
}

/**
 * Shortest prefix of `stream` that repeats to produce the whole stream, or the
 * stream itself when it has no period. Used to explain a recovered keystream
 * that came from a short repeating key.
 */
export function smallestPeriod(stream: Uint8Array): number {
  for (let period = 1; period <= Math.floor(stream.length / 2); period += 1) {
    let matches = true
    for (let i = period; i < stream.length; i += 1) {
      if (stream[i] !== stream[i % period]) {
        matches = false
        break
      }
    }
    if (matches) return period
  }
  return stream.length
}

function toHexPair(byte: number): string {
  return byte.toString(16).padStart(2, '0').toUpperCase()
}

function toBin8(byte: number): string {
  return byte.toString(2).padStart(8, '0')
}

function bitsSetIn(byte: number): number[] {
  const bits: number[] = []
  for (let bit = 7; bit >= 0; bit -= 1) {
    if ((byte >> bit) & 1) bits.push(bit)
  }
  return bits
}

/** Text helper used by the OTP/attack sections: XOR two equal-length strings. */
export function xorText(textA: string, textB: string): string {
  return bytesToHex(xorBytes(textToBytes(textA), textToBytes(textB)))
}
