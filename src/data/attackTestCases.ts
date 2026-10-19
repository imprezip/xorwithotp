/**
 * Key-reuse attack worked examples.
 *
 * The key is fixed here so the numbers can be checked by hand. They are one-click
 * starting points for the live section; the student may type any key, in any
 * representation, of any length. Every expected output is re-verified against the
 * implementation in `src/lib/attack.test.ts`.
 */
import type { Operation } from '../lib/types'

export interface AttackTestCase {
  id: number
  operation: Operation
  title: string
  subtitle: string
  message1: string
  message2: string
  /** Fixed key so the exercise is deterministic. */
  key: string
  expectedCiphertext1: string
  expectedCiphertext2: string
  /** `C1 XOR C2` and `M1 XOR M2`: always identical, and never the key. */
  expectedXor: string
}

export const ATTACK_TEST_CASES: AttackTestCase[] = [
  {
    id: 1,
    operation: 'encrypt',
    title: 'Two 14-byte messages',
    subtitle: 'Encrypt both messages with the same key, then XOR the two ciphertexts.',
    message1: 'ATTACK AT DAWN',
    message2: 'DEFEND WALLS!!',
    key: '5A6F708192A3B4C5D6E7F809A1B2',
    expectedCiphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
    expectedCiphertext2: '1E2A36C4DCE7949297ABB45A8093',
    expectedXor: '051112040D0F0016156C0812766F',
  },
  {
    id: 2,
    operation: 'encrypt',
    title: 'Three bytes only',
    subtitle: 'Smallest possible case: 59 45 53 XOR 4E 4F 21.',
    message1: 'YES',
    message2: 'NO!',
    key: 'A1B2C3',
    expectedCiphertext1: 'F8F790',
    expectedCiphertext2: 'EFFDE2',
    expectedXor: '170A72',
  },
  {
    id: 3,
    operation: 'encrypt',
    title: 'Digit patterns',
    subtitle: 'Reversed digits make the XOR result easy to verify by eye.',
    message1: '1234567890',
    message2: '0987654321',
    key: '0F0F0F0F0F0F0F0F0F0F',
    expectedCiphertext1: '3E3D3C3B3A393837363F',
    expectedCiphertext2: '3F363738393A3B3C3D3E',
    expectedXor: '010B0B030303030B0B01',
  },
  {
    id: 4,
    operation: 'decrypt',
    title: 'Recover both messages from the key',
    subtitle: 'Decrypt both ciphertexts with the same key.',
    message1: 'ATTACK AT DAWN',
    message2: 'DEFEND WALLS!!',
    key: '5A6F708192A3B4C5D6E7F809A1B2',
    expectedCiphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
    expectedCiphertext2: '1E2A36C4DCE7949297ABB45A8093',
    expectedXor: '051112040D0F0016156C0812766F',
  },
  {
    id: 5,
    operation: 'decrypt',
    title: 'Twelve bytes, two hidden messages',
    subtitle: 'Both ciphertexts fall back to readable text once the shared key is applied.',
    message1: 'HELLO WORLD!',
    message2: 'SECRET AGENT',
    key: 'C0FFEE112233445566778899',
    expectedCiphertext1: '88BAA25D6D13131A343BCCB8',
    expectedCiphertext2: '93BAAD43676764142132C6CD',
    expectedXor: '1B000F1E0A74770E15090A75',
  },
  {
    id: 6,
    operation: 'encrypt',
    title: 'A 3-byte key reused twice',
    subtitle: 'The key is shorter than the messages, so it repeats and still cancels out.',
    message1: 'BREACHNOW',
    message2: 'SECRETLAB',
    key: '4B3359',
    expectedCiphertext1: '09611C0A7011057C0E',
    expectedCiphertext2: '18761A19760D07721B',
    expectedXor: '11170613061C020E15',
  },
]

export function attackTestCasesFor(operation: Operation): AttackTestCase[] {
  return ATTACK_TEST_CASES.filter((testCase) => testCase.operation === operation)
}
