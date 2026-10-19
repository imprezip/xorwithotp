/**
 * XOR Cipher worked examples.
 *
 * These are *data*, not a feature. Exercise Mode grades whatever is in the form;
 * these vectors are one-click starting points, and `src/lib/xor.test.ts` re-verifies
 * every expected output against the implementation, so the data can never drift
 * from the cipher.
 */
import type { InputFormat, Operation } from '../lib/types'
import type { OutputFormat } from '../lib/pipeline'

export interface XorTestCase {
  id: number
  operation: Operation
  title: string
  /** Tooltip on the example chip. */
  subtitle: string
  input: string
  inputFormat: InputFormat
  key: string
  keyFormat: InputFormat
  outputFormat: OutputFormat
  expectedOutput: string
}

export const XOR_TEST_CASES: XorTestCase[] = [
  {
    id: 1,
    operation: 'encrypt',
    title: 'Short uppercase message',
    subtitle: 'XOR every byte of the plaintext with the matching key byte.',
    input: 'CRYPTO',
    inputFormat: 'text',
    key: 'LOCKED',
    keyFormat: 'text',
    outputFormat: 'hex',
    expectedOutput: '0F1D1A1B110B',
  },
  {
    id: 2,
    operation: 'encrypt',
    title: 'Sentence with spaces',
    subtitle: 'A space is a byte too: 0x20.',
    input: 'attack at dawn',
    inputFormat: 'text',
    key: 'NightFALL2026!',
    keyFormat: 'text',
    outputFormat: 'hex',
    expectedOutput: '2F1D1309172D612D38125453414F',
  },
  {
    id: 3,
    operation: 'encrypt',
    title: 'Multi-byte UTF-8 characters',
    subtitle: 'The 10 characters "café naïve" become 12 UTF-8 bytes.',
    input: 'café naïve',
    inputFormat: 'text',
    key: 'key-key-key!',
    keyFormat: 'text',
    outputFormat: 'hex',
    expectedOutput: '08041FEEC245174CA8CA0F44',
  },
  {
    id: 4,
    operation: 'encrypt',
    title: 'Hexadecimal input, Base64 output',
    subtitle: 'Same cipher, different representation. "MATH" is 4D 41 54 48.',
    input: '4D415448',
    inputFormat: 'hex',
    key: '424F4F4D',
    keyFormat: 'hex',
    outputFormat: 'base64',
    expectedOutput: 'Dw4bBQ==',
  },
  {
    id: 5,
    operation: 'decrypt',
    title: 'Recover a message from hex',
    subtitle: 'XOR is its own inverse: apply the same key again.',
    input: '19160D19011278030D7806180F0C',
    inputFormat: 'hex',
    key: 'XBYXBYXBYXBYXB',
    keyFormat: 'text',
    outputFormat: 'text',
    expectedOutput: 'ATTACK AT DAWN',
  },
  {
    id: 6,
    operation: 'decrypt',
    title: 'Recover UTF-8 text',
    subtitle: 'Some decrypted bytes are >= 0x80, part of a multi-byte character.',
    input: '080E16AA8411D0ABA1154F190A',
    inputFormat: 'hex',
    key: 'kopi-12345-xx',
    keyFormat: 'text',
    outputFormat: 'text',
    expectedOutput: 'café ☕ bar',
  },
  {
    id: 7,
    operation: 'decrypt',
    title: 'Hexadecimal key',
    subtitle: 'The key can be given in any representation, as long as it covers the message.',
    input: '0F1D1A1B110B',
    inputFormat: 'hex',
    key: '4C4F434B4544',
    keyFormat: 'hex',
    outputFormat: 'text',
    expectedOutput: 'CRYPTO',
  },
  {
    id: 8,
    operation: 'decrypt',
    title: 'Binary input',
    subtitle: 'Read the bytes MSB first, group them in eights, then XOR.',
    input: '00001111 00001110 00011011 00000101',
    inputFormat: 'binary',
    key: '01000010 01001111 01001111 01001101',
    keyFormat: 'binary',
    outputFormat: 'text',
    expectedOutput: 'MATH',
  },
  {
    id: 9,
    operation: 'encrypt',
    title: 'Short key is repeated',
    subtitle: 'A 3-byte key repeats until it fits.',
    input: 'HELLO WORLD',
    inputFormat: 'text',
    key: 'Hi!',
    keyFormat: 'text',
    outputFormat: 'hex',
    expectedOutput: '002C6D0426011F2673042D',
  },
  {
    id: 10,
    operation: 'encrypt',
    title: 'Long key is truncated',
    subtitle: 'A 10-byte key is cut down to the length of the message instead of being an error.',
    input: 'CRYPTO',
    inputFormat: 'text',
    key: 'TOOLONGKEY',
    keyFormat: 'text',
    outputFormat: 'hex',
    expectedOutput: '171D161C1B01',
  },
  {
    id: 11,
    operation: 'decrypt',
    title: 'Decrypt with a repeated key',
    subtitle: 'The key repeats on the way back too, so the message comes out unchanged.',
    input: '13110404021F650506651404161A',
    inputFormat: 'hex',
    key: 'REPEATED',
    keyFormat: 'text',
    outputFormat: 'text',
    expectedOutput: 'ATTACK AT DAWN',
  },
]

export function xorTestCasesFor(operation: Operation): XorTestCase[] {
  return XOR_TEST_CASES.filter((testCase) => testCase.operation === operation)
}
