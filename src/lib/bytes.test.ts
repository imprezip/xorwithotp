import { describe, expect, it } from 'vitest'
import {
  base64ToBytes,
  binaryToBytes,
  bytesEqual,
  bytesToBase64,
  bytesToBinary,
  bytesToHex,
  bytesToHexSpaced,
  bytesToLooseText,
  formatBytes,
  hexToBytes,
  isValidHex,
  textToBytes,
  tryBytesToText,
  UNKNOWN_CHAR,
} from './bytes'
import { CryptoError } from './errors'

describe('hexadecimal conversion', () => {
  it('encodes bytes as uppercase hexadecimal without separators', () => {
    expect(bytesToHex(Uint8Array.from([0x48, 0x45, 0x4c, 0x4c, 0x4f]))).toBe('48454C4C4F')
  })

  it('encodes bytes as spaced hexadecimal', () => {
    expect(bytesToHexSpaced(Uint8Array.from([0x09, 0x07, 0x0f]))).toBe('09 07 0F')
  })

  it('pads single-digit bytes', () => {
    expect(bytesToHex(Uint8Array.from([0x00, 0x0f, 0xa0]))).toBe('000FA0')
  })

  it('decodes lowercase, uppercase, spaced and 0x-prefixed input', () => {
    const expected = Uint8Array.from([0xde, 0xad, 0xbe, 0xef])
    expect(bytesEqual(hexToBytes('DEADBEEF'), expected)).toBe(true)
    expect(bytesEqual(hexToBytes('deadbeef'), expected)).toBe(true)
    expect(bytesEqual(hexToBytes('DE AD BE EF'), expected)).toBe(true)
    expect(bytesEqual(hexToBytes('0xdeadbeef'), expected)).toBe(true)
  })

  it('rejects non hexadecimal characters', () => {
    expect(() => hexToBytes('12ZZ')).toThrow('Invalid hexadecimal format.')
    expect(() => hexToBytes('12G4')).toThrow(CryptoError)
  })

  it('rejects an odd number of digits', () => {
    expect(() => hexToBytes('ABC')).toThrow('Hexadecimal input must contain complete bytes.')
  })

  it('exposes a non throwing validity check', () => {
    expect(isValidHex('00FF')).toBe(true)
    expect(isValidHex('00F')).toBe(false)
    expect(isValidHex('zz')).toBe(false)
  })
})

describe('binary conversion', () => {
  it('encodes bytes MSB first in groups of eight', () => {
    expect(bytesToBinary(Uint8Array.from([0b01001000, 0b00000001]))).toBe('01001000 00000001')
  })

  it('decodes grouped binary back to bytes', () => {
    const bytes = binaryToBytes('01001000 01000101 01001100 01001100 01001111')
    expect(bytesToHex(bytes)).toBe('48454C4C4F')
    expect(bytesToLooseText(bytes)).toBe('HELLO')
  })

  it('rejects characters other than 0 and 1', () => {
    expect(() => binaryToBytes('0100 1002')).toThrow('Binary input may contain only 0 and 1.')
    expect(() => binaryToBytes('0100AB')).toThrow('Binary input may contain only 0 and 1.')
  })

  it('rejects groups that are not a whole byte', () => {
    expect(() => binaryToBytes('0100100')).toThrow(
      'Binary input must contain complete bytes (a multiple of 8 bits).',
    )
  })
})

describe('base64 conversion', () => {
  it('round trips arbitrary bytes', () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 7) % 256)
    expect(bytesEqual(base64ToBytes(bytesToBase64(bytes)), bytes)).toBe(true)
  })

  it('pads output and matches known values', () => {
    expect(bytesToBase64(textToBytes('MATH'))).toBe('TUFUSA==')
    expect(bytesToBase64(textToBytes('CRYPTO') )).toBe('Q1JZUFRP')
  })

  it('rejects malformed base64', () => {
    expect(() => base64ToBytes('***')).toThrow('Invalid Base64 format.')
    expect(() => base64ToBytes('QUJD=')).toThrow('Invalid Base64 format.')
  })
})

describe('utf-8 conversion', () => {
  it('encodes ascii to bytes', () => {
    expect(bytesToHex(textToBytes('HELLO'))).toBe('48454C4C4F')
  })

  it('encodes multi-byte characters to more bytes than characters', () => {
    const bytes = textToBytes('café')
    expect(bytes.length).toBe(5)
    expect(bytesToHex(bytes)).toBe('636166C3A9')
  })

  it('round trips multi-byte text', () => {
    for (const sample of ['café ☕ bar', 'naïve', '日本語', 'Ünïcödé ✓']) {
      expect(bytesToLooseText(textToBytes(sample))).toBe(sample)
    }
  })

  it('keeps byte sequences that are not valid utf-8 out of the text result', () => {
    const invalid = Uint8Array.from([0xff, 0xfe, 0x41])
    expect(tryBytesToText(invalid)).toBeNull()
  })

  it('decodes invalid bytes to unknown characters instead of failing', () => {
    expect(bytesToLooseText(Uint8Array.from([0xff, 0xfe, 0x41]))).toBe(`${UNKNOWN_CHAR}${UNKNOWN_CHAR}A`)
  })
})

describe('formatBytes', () => {
  const bytes = textToBytes('MATH')

  it('renders hex, binary and base64', () => {
    expect(formatBytes(bytes, 'hex')).toBe('4D415448')
    expect(formatBytes(bytes, 'binary')).toBe('01001101 01000001 01010100 01001000')
    expect(formatBytes(bytes, 'base64')).toBe('TUFUSA==')
  })
})
