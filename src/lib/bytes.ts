/**
 * Byte oriented encoding utilities.
 *
 * CryptoLab never operates on characters: everything is converted to UTF-8
 * bytes first, XORed byte by byte, and only then rendered back into a
 * representation (text / hex / binary / base64) for humans.
 */
import { CryptoError } from './errors'

const textEncoder = new TextEncoder()
/** `fatal: true` makes the decoder throw on malformed UTF-8 instead of inserting U+FFFD. */
const strictTextDecoder = new TextDecoder('utf-8', { fatal: true })
/** Lenient decoder: malformed bytes become the replacement character. */
const looseTextDecoder = new TextDecoder('utf-8')

/** The character standing in for a byte that is not valid UTF-8. */
export const UNKNOWN_CHAR = '\uFFFD'

const HEX_CHARS = /^[0-9a-fA-F]*$/
const BINARY_CHARS = /^[01]*$/
const WHITESPACE = /[\s_]+/g
const BASE64_CHARS = /^[A-Za-z0-9+/]*={0,2}$/

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

/** UTF-8 encode a string (no ASCII-only assumption). */
export function textToBytes(text: string): Uint8Array {
  return textEncoder.encode(text)
}

/**
 * Decode bytes as UTF-8 and never fail: anything that is not valid UTF-8 comes
 * back as the replacement character, so a wrong key shows unknown characters
 * instead of an error.
 */
export function bytesToLooseText(bytes: Uint8Array): string {
  return looseTextDecoder.decode(bytes)
}

/** Non-throwing variant, used to decide whether to render a result as text. */
export function tryBytesToText(bytes: Uint8Array): string | null {
  try {
    return strictTextDecoder.decode(bytes)
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Hexadecimal                                                                 */
/* -------------------------------------------------------------------------- */

/** `Uint8Array` -> `09070F080A` (uppercase, no separators). */
export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0').toUpperCase()
  }
  return out
}

/** `Uint8Array` -> `09 07 0F 08 0A` (uppercase, byte separated). Used by the step views. */
export function bytesToHexSpaced(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    parts.push(bytes[i].toString(16).padStart(2, '0').toUpperCase())
  }
  return parts.join(' ')
}

/** Accepts spaces and an optional `0x` prefix; validates characters and byte alignment. */
export function hexToBytes(hex: string): Uint8Array {
  const cleaned = stripDecorations(hex).toUpperCase()
  if (!HEX_CHARS.test(cleaned)) {
    throw new CryptoError('Invalid hexadecimal format.')
  }
  if (cleaned.length % 2 !== 0) {
    throw new CryptoError('Hexadecimal input must contain complete bytes.')
  }
  const out = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** True when the string is a syntactically valid, whole-byte hexadecimal value. */
export function isValidHex(value: string): boolean {
  try {
    hexToBytes(value)
    return true
  } catch {
    return false
  }
}

/* -------------------------------------------------------------------------- */
/* Binary                                                                      */
/* -------------------------------------------------------------------------- */

/** `Uint8Array` -> `01001000 01000101` (MSB first, byte separated). */
export function bytesToBinary(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    parts.push(bytes[i].toString(2).padStart(8, '0'))
  }
  return parts.join(' ')
}

/** Accepts spaces; requires groups of exactly 8 bits. */
export function binaryToBytes(binary: string): Uint8Array {
  const cleaned = stripDecorations(binary)
  if (!BINARY_CHARS.test(cleaned)) {
    throw new CryptoError('Binary input may contain only 0 and 1.')
  }
  if (cleaned.length % 8 !== 0) {
    throw new CryptoError('Binary input must contain complete bytes (a multiple of 8 bits).')
  }
  const out = new Uint8Array(cleaned.length / 8)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(i * 8, i * 8 + 8), 2)
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Base64                                                                      */
/* -------------------------------------------------------------------------- */

/** `Uint8Array` -> standard, padded Base64. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Base64 -> `Uint8Array`, with a friendly error for malformed input. */
export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = stripDecorations(base64)
  if (!BASE64_CHARS.test(cleaned) || cleaned.length % 4 !== 0) {
    throw new CryptoError('Invalid Base64 format.')
  }
  try {
    const binary = atob(cleaned)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  } catch {
    throw new CryptoError('Invalid Base64 format.')
  }
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

function stripDecorations(value: string): string {
  return value.replace(WHITESPACE, '').replace(/^0[xX]/, '')
}

/** Pretty byte count, e.g. `5 bytes` / `1 byte`. */
export function describeLength(bytes: Uint8Array): string {
  return `${bytes.length} ${bytes.length === 1 ? 'byte' : 'bytes'}`
}

/** Concatenate byte arrays (used to build multi-line step tables). */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

/** `Uint8Array` equality, used heavily in tests and self-checks. */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/** Format bytes using one of the three supported ciphertext representations. */
export function formatBytes(bytes: Uint8Array, format: 'hex' | 'binary' | 'base64'): string {
  switch (format) {
    case 'hex':
      return bytesToHex(bytes)
    case 'binary':
      return bytesToBinary(bytes)
    case 'base64':
      return bytesToBase64(bytes)
    default:
      throw new CryptoError(`Unsupported output format: ${String(format)}`)
  }
}
