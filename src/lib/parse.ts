/**
 * Input parsing + validation.
 *
 * Every user supplied string is validated here before it reaches the cipher, so
 * the UI can always show a precise, human readable inline error instead of
 * failing somewhere deeper in the pipeline.
 */
import { CryptoError } from './errors'
import { base64ToBytes, binaryToBytes, hexToBytes, textToBytes } from './bytes'
import type { FieldRole, InputFormat } from './types'

const EMPTY_MESSAGE: Record<FieldRole, string> = {
  plaintext: 'Please enter a plaintext.',
  ciphertext: 'Please enter a ciphertext.',
  key: 'Please enter a key.',
}

/**
 * Convert a user string into bytes using the selected representation.
 *
 * @param value    raw value coming from the input field
 * @param format   `text` (UTF-8), `hex` or `binary`
 * @param role     what the value represents, used for the "empty" message
 */
export function parseToBytes(value: string, format: InputFormat, role: FieldRole): Uint8Array {
  if (!hasContent(value, format)) {
    throw new CryptoError(EMPTY_MESSAGE[role])
  }
  switch (format) {
    case 'text':
      return textToBytes(value)
    case 'hex':
      return hexToBytes(value)
    case 'binary':
      return binaryToBytes(value)
  }
}

/** Same as {@link parseToBytes} but for Base64 (used for pasted ciphertext). */
export function parseBase64(value: string, role: FieldRole): Uint8Array {
  if (value.trim().length === 0) {
    throw new CryptoError(EMPTY_MESSAGE[role])
  }
  return base64ToBytes(value)
}

/** A text field is "empty" only when it is truly empty: a single space is data. */
function hasContent(value: string, format: InputFormat): boolean {
  if (format === 'text') return value.length > 0
  return value.replace(/[\s_]+/g, '').replace(/^0[xX]/, '').length > 0
}

/**
 * A key may be shorter or longer than the message: it is repeated or trimmed
 * to fit (see `applyKey` in `xor.ts`). The only hard rule left is that a key
 * must exist at all.
 */
export function assertUsableKey(key: Uint8Array): void {
  if (key.length === 0) {
    throw new CryptoError('Please enter a key.')
  }
}

/** Generic same-length requirement, used where repetition would be meaningless. */
export function assertSameLengthStrict(a: Uint8Array, b: Uint8Array, message: string): void {
  if (a.length !== b.length) {
    throw new CryptoError(message)
  }
}

/** Attack section: both messages must be the same size to share one key. */
export function assertEqualPair(a: Uint8Array, b: Uint8Array): void {
  if (a.length !== b.length) {
    throw new CryptoError(
      'Both messages must have the same length in bytes so they can share one key.',
    )
  }
}

/** Non-throwing check used to grey out the primary buttons. */
export function validateXorInput(
  input: string,
  inputFormat: InputFormat,
  key: string,
  keyFormat: InputFormat,
  operation: 'encrypt' | 'decrypt',
): string | null {
  const role = operation === 'encrypt' ? 'plaintext' : 'ciphertext'
  try {
    parseToBytes(input, inputFormat, role)
    parseToBytes(key, keyFormat, 'key')
    return null
  } catch (error) {
    return error instanceof CryptoError ? error.message : 'Invalid input.'
  }
}
