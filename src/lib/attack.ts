/**
 * The key-reuse (crib-dragging) demonstration.
 *
 * Because the *same* key `K` encrypts two messages:
 *
 *     C1 = M1 XOR K
 *     C2 = M2 XOR K
 *
 *     C1 XOR C2 = (M1 XOR K) XOR (M2 XOR K) = M1 XOR M2
 *
 * The key cancels out completely (`K XOR K = 0`), so XOR-ing the two ciphertexts
 * destroys the key and leaves only a property of the two plaintexts.
 * `C1 XOR C2` is therefore **never** the key.
 */
import { CryptoError } from './errors'
import { bytesToHex, bytesToHexSpaced, textToBytes, tryBytesToText } from './bytes'
import { assertEqualPair, assertSameLengthStrict, assertUsableKey } from './parse'
import { generateRandomKey } from './otp'
import {
  applyKey,
  describeKeyUsage,
  keyCancelsOut,
  smallestPeriod,
  verifyKeyReuseIdentity,
  xorBytes,
  type KeyUsage,
} from './xor'

export interface AttackRow {
  index: number
  keyHex: string
  m1Hex: string
  m2Hex: string
  c1Hex: string
  c2Hex: string
  c1XorC2Hex: string
  m1XorM2Hex: string
  match: boolean
}

export interface AttackEncryptRequest {
  message1: string
  message2: string
  /** `true` when the key is a random One-Time-Pad style key (reused on purpose). */
  otpMode: boolean
  /**
   * The key to reuse. It may be typed by the user in any length: a short key is
   * repeated and a long one is trimmed, exactly like in the XOR section. When
   * omitted a random key of the message length is generated.
   */
  key?: Uint8Array
  /** Shown instead of "Generated Key", e.g. "Your Key (reused on purpose)". */
  keyLabel?: string
}

export interface AttackEncryptResult {
  keyLabel: string
  key: Uint8Array
  keyHex: string
  keyUsage: KeyUsage
  effectiveKey: Uint8Array
  m1: Uint8Array
  m2: Uint8Array
  c1: Uint8Array
  c2: Uint8Array
  m1XorM2: Uint8Array
  c1XorC2: Uint8Array
  identityHolds: boolean
  keyMasked: boolean
  rows: AttackRow[]
}

export interface AttackDecryptRequest {
  ciphertext1: string
  ciphertext2: string
  keyHex: string
}

export interface AttackDecryptResult {
  keyLabel: string
  keyHex: string
  keyUsage: KeyUsage
  effectiveKey: Uint8Array
  c1: Uint8Array
  c2: Uint8Array
  m1: Uint8Array
  m2: Uint8Array
  /** `null` when the recovered bytes are not valid UTF-8; the UI shows hex then. */
  m1Text: string | null
  /** `null` when the recovered bytes are not valid UTF-8; the UI shows hex then. */
  m2Text: string | null
  c1XorC2: Uint8Array
  m1XorM2: Uint8Array
  identityHolds: boolean
  rows: AttackRow[]
}

/** Encrypt two messages with one shared key: the mistake being demonstrated. */
export function runKeyReuseAttack(request: AttackEncryptRequest): AttackEncryptResult {
  const m1 = textToBytes(request.message1)
  const m2 = textToBytes(request.message2)
  if (m1.length === 0 || m2.length === 0) {
    throw new CryptoError('Please enter both messages.')
  }
  assertEqualPair(m1, m2)

  const key = request.key ? request.key.slice() : generateRandomKey(m1.length)
  assertUsableKey(key)

  // The same key, applied from position 0 to both messages.
  const { bytes: effectiveKey, usage: keyUsage } = applyKey(key, m1.length)
  const c1 = xorBytes(m1, effectiveKey)
  const c2 = xorBytes(m2, effectiveKey)
  const m1XorM2 = xorBytes(m1, m2)
  const c1XorC2 = xorBytes(c1, c2)

  return {
    keyLabel:
      request.keyLabel ??
      (request.otpMode ? 'Random OTP Key (reused on purpose)' : 'Generated Key'),
    key,
    keyHex: bytesToHex(key),
    keyUsage,
    effectiveKey,
    m1,
    m2,
    c1,
    c2,
    m1XorM2,
    c1XorC2,
    identityHolds: verifyKeyReuseIdentity(m1, m2, key, c1, c2),
    keyMasked: keyCancelsOut(key),
    rows: buildRows(m1, m2, effectiveKey, c1, c2),
  }
}

/** Recover both messages from the two ciphertexts using the key of this session. */
export function runKeyReuseDecrypt(request: AttackDecryptRequest): AttackDecryptResult {
  const key = hexBytes(request.keyHex, 'key')
  if (key.length === 0) {
    throw new CryptoError('No key available in this session. Run Encrypt first to generate one.')
  }
  const c1 = hexBytes(request.ciphertext1, 'ciphertext')
  const c2 = hexBytes(request.ciphertext2, 'ciphertext')
  assertEqualPair(c1, c2)

  const { bytes: effectiveKey, usage: keyUsage } = applyKey(key, c1.length)
  const m1 = xorBytes(c1, effectiveKey)
  const m2 = xorBytes(c2, effectiveKey)
  const c1XorC2 = xorBytes(c1, c2)
  const m1XorM2 = xorBytes(m1, m2)

  // Random data does not have to be text, so the bytes are always returned and
  // the caller decides whether to show text or another representation.
  const m1Text = tryBytesToText(m1)
  const m2Text = tryBytesToText(m2)

  return {
    keyLabel: 'Key of this session (reused on purpose)',
    keyHex: bytesToHex(key),
    keyUsage,
    effectiveKey,
    c1,
    c2,
    m1,
    m2,
    m1Text,
    m2Text,
    c1XorC2,
    m1XorM2,
    identityHolds: verifyKeyReuseIdentity(m1, m2, key, c1, c2),
    rows: buildRows(m1, m2, effectiveKey, c1, c2),
  }
}

function hexBytes(value: string, role: 'key' | 'ciphertext'): Uint8Array {
  const cleaned = value.replace(/[\s_]+/g, '')
  if (cleaned.length === 0) {
    throw new CryptoError(role === 'key' ? 'Please enter a key.' : 'Please enter a ciphertext.')
  }
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new CryptoError('Invalid hexadecimal format.')
  }
  if (cleaned.length % 2 !== 0) {
    throw new CryptoError('Hexadecimal input must contain complete bytes.')
  }
  return hexToBytesStrict(cleaned)
}

function hexToBytesStrict(cleaned: string): Uint8Array {
  const out = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function buildRows(
  m1: Uint8Array,
  m2: Uint8Array,
  key: Uint8Array,
  c1: Uint8Array,
  c2: Uint8Array,
): AttackRow[] {
  const c1XorC2 = xorBytes(c1, c2)
  const m1XorM2 = xorBytes(m1, m2)
  const rows: AttackRow[] = []
  for (let i = 0; i < c1.length; i += 1) {
    rows.push({
      index: i,
      keyHex: pair(key[i]),
      m1Hex: pair(m1[i]),
      m2Hex: pair(m2[i]),
      c1Hex: pair(c1[i]),
      c2Hex: pair(c2[i]),
      c1XorC2Hex: pair(c1XorC2[i]),
      m1XorM2Hex: pair(m1XorM2[i]),
      match: c1XorC2[i] === m1XorM2[i],
    })
  }
  return rows
}

function pair(byte: number): string {
  return byte.toString(16).padStart(2, '0').toUpperCase()
}

/* -------------------------------------------------------------------------- */
/* Known-plaintext recovery                                                    */
/* -------------------------------------------------------------------------- */

export interface KnownPlaintextResult {
  /** `C1 XOR M1`: the keystream applied to both messages. */
  recoveredKey: Uint8Array
  recoveredKeyHex: string
  /**
   * Shortest prefix of the recovered keystream that repeats to build all of it.
   * Equal to the keystream length when the key was not repeated.
   */
  repeatingKey: Uint8Array
  repeatingKeyHex: string
  repeats: number
  recoveredMessage2: Uint8Array
  recoveredMessage2Text: string | null
  checksOut: boolean
}

/**
 * Known-plaintext attack: if one message is known, the key falls out immediately
 * (`K = M1 XOR C1`) and every other ciphertext encrypted with it collapses.
 */
export function recoverKeyFromKnownPlaintext(
  knownMessage: string,
  ciphertext1: string,
  ciphertext2: string,
): KnownPlaintextResult {
  const m1 = textToBytes(knownMessage)
  if (m1.length === 0) throw new CryptoError('Please enter a known plaintext.')
  const c1 = hexBytes(ciphertext1, 'ciphertext')
  const c2 = hexBytes(ciphertext2, 'ciphertext')
  assertSameLengthStrict(
    m1,
    c1,
    'The known plaintext must be the same length in bytes as the ciphertext.',
  )
  assertEqualPair(c1, c2)

  // Position by position this is the keystream, whether or not the key was
  // repeated, so it decrypts the second ciphertext exactly.
  const recoveredKey = xorBytes(m1, c1)
  const recoveredMessage2 = xorBytes(c2, recoveredKey)
  const recoveredText = tryBytesToText(recoveredMessage2)

  const period = smallestPeriod(recoveredKey)
  const repeatingKey = recoveredKey.slice(0, period)

  return {
    recoveredKey,
    recoveredKeyHex: bytesToHex(recoveredKey),
    repeatingKey,
    repeatingKeyHex: bytesToHex(repeatingKey),
    repeats: period === 0 ? 1 : Math.ceil(recoveredKey.length / period),
    recoveredMessage2,
    recoveredMessage2Text: recoveredText,
    checksOut: verifyKeyReuseIdentity(m1, recoveredMessage2, repeatingKey, c1, c2),
  }
}

/* -------------------------------------------------------------------------- */
/* Step visualisation                                                          */
/* -------------------------------------------------------------------------- */

export interface AttackStep {
  id: number
  title: string
  caption: string
  blocks: {
    label?: string
    value: string
    tone?: 'default' | 'accent' | 'muted'
    note?: string
  }[]
  formula?: string[]
}

/**
 * Build the attack explanation from a computed result.
 *
 * `redactKey` masks every view of the key, used by OTP Mode once the
 * demonstration countdown has ended.
 */
export function buildAttackSteps(
  result: AttackEncryptResult | AttackDecryptResult,
  options: { redactKey?: boolean } = {},
): AttackStep[] {
  const isEncrypt = !('m1Text' in result)
  const redactKey = options.redactKey === true
  const keyHex = redactKey ? '•'.repeat(result.keyHex.length) : result.keyHex
  // The key that was actually applied to every byte, after repeating/trimming.
  const appliedKeyHex = redactKey
    ? '•'.repeat(result.effectiveKey.length * 2)
    : bytesToHex(result.effectiveKey)
  const usageNote = redactKey ? 'hidden' : describeKeyUsage(result.keyUsage)
  const steps: AttackStep[] = []

  steps.push({
    id: 1,
    title: 'Message 1',
    caption: 'The first message goes through the key.',
    blocks: [
      {
        label: isEncrypt ? 'Message 1' : 'Ciphertext 1',
        value: isEncrypt ? (tryBytesToText(result.m1) ?? '') : bytesToHexSpaced(result.c1),
      },
      { label: result.keyLabel, value: keyHex, note: usageNote },
      {
        label: 'Key applied to every byte',
        value: redactKey
          ? '•'.repeat(result.effectiveKey.length * 3)
          : bytesToHexSpaced(result.effectiveKey),
      },
      { label: 'XOR', value: '', tone: 'muted' },
      {
        label: isEncrypt ? 'Ciphertext 1' : 'Message 1',
        value: bytesToHexSpaced(result.c1),
        tone: 'accent',
      },
    ],
    formula: isEncrypt ? ['C1 = M1 XOR K'] : ['M1 = C1 XOR K'],
  })

  steps.push({
    id: 2,
    title: 'Message 2, same key',
    caption: 'The same key is used again. That is the mistake.',
    blocks: [
      {
        label: isEncrypt ? 'Message 2' : 'Ciphertext 2',
        value: isEncrypt ? (tryBytesToText(result.m2) ?? '') : bytesToHexSpaced(result.c2),
      },
      { label: 'SAME Key', value: keyHex, note: usageNote },
      { label: 'XOR', value: '', tone: 'muted' },
      {
        label: isEncrypt ? 'Ciphertext 2' : 'Message 2',
        value: bytesToHexSpaced(result.c2),
        tone: 'accent',
      },
    ],
    formula: isEncrypt ? ['C2 = M2 XOR K'] : ['M2 = C2 XOR K'],
  })

  steps.push({
    id: 3,
    title: 'Cancel the key out',
    caption: 'XOR the two ciphertexts and the key vanishes, because K XOR K = 0.',
    blocks: [
      {
        label: 'K XOR K',
        value: `${appliedKeyHex}  XOR  ${appliedKeyHex}  =  ${'00'.repeat(appliedKeyHex.length / 2)}`,
      },
      { label: 'C1 XOR C2', value: bytesToHexSpaced(result.c1XorC2) },
      { label: 'M1 XOR M2', value: bytesToHexSpaced(result.m1XorM2), tone: 'accent' },
      {
        label: 'Verdict',
        value: result.identityHolds
          ? 'C1 XOR C2 = M1 XOR M2  (the key is gone)'
          : 'Identity failed, which should never happen.',
        tone: result.identityHolds ? 'accent' : 'muted',
      },
      { label: 'Not the key', value: 'C1 XOR C2 is NOT the key.', tone: 'muted' },
    ],
    formula: [
      'C1 = M1 XOR K',
      'C2 = M2 XOR K',
      '',
      'C1 XOR C2',
      '= (M1 XOR K) XOR (M2 XOR K)',
      '= M1 XOR M2   because   K XOR K = 0',
    ],
  })

  return steps
}
