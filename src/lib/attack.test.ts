import { describe, expect, it } from 'vitest'
import { bytesEqual, bytesToHex, textToBytes } from './bytes'
import {
  buildAttackSteps,
  recoverKeyFromKnownPlaintext,
  runKeyReuseAttack,
  runKeyReuseDecrypt,
} from './attack'
import { verifyKeyReuseIdentity, xorBytes, keyCancelsOut } from './xor'
import { ATTACK_TEST_CASES } from '../data/attackTestCases'

const key = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

describe('key reuse attack', () => {
  it('encrypts both messages with the same key', () => {
    const result = runKeyReuseAttack({
      message1: 'ATTACK AT DAWN',
      message2: 'DEFEND WALLS!!',
      otpMode: false,
      key: key('5A6F708192A3B4C5D6E7F809A1B2'),
    })
    expect(bytesToHex(result.key)).toBe('5A6F708192A3B4C5D6E7F809A1B2')
    expect(bytesToHex(result.c1)).toBe('1B3B24C0D1E8948482C7BC48F6FC')
    expect(bytesToHex(result.c2)).toBe('1E2A36C4DCE7949297ABB45A8093')
  })

  it('always satisfies C1 XOR C2 = M1 XOR M2', () => {
    const result = runKeyReuseAttack({
      message1: 'YES',
      message2: 'NO!',
      otpMode: true,
    })
    expect(bytesEqual(result.c1XorC2, result.m1XorM2)).toBe(true)
    expect(result.identityHolds).toBe(true)
    expect(result.keyMasked).toBe(true)
  })

  it('never produces the key as C1 XOR C2', () => {
    for (let i = 0; i < 25; i += 1) {
      const result = runKeyReuseAttack({ message1: 'abcdefgh', message2: 'ABCDEFGH', otpMode: true })
      expect(bytesEqual(result.c1XorC2, result.key)).toBe(false)
      expect(keyCancelsOut(result.key)).toBe(true)
    }
  })

  it('generates a key of the shared message length', () => {
    const result = runKeyReuseAttack({
      message1: '12345678',
      message2: 'abcdefgh',
      otpMode: true,
    })
    expect(result.key.length).toBe(8)
    expect(result.keyLabel).toBe('Random OTP Key (reused on purpose)')
  })

  it('accepts a user-supplied key of any length', () => {
    const short = runKeyReuseAttack({
      message1: 'BREACHNOW',
      message2: 'SECRETLAB',
      otpMode: false,
      key: textToBytes('K3Y'),
    })
    expect(short.keyUsage.mode).toBe('repeated')
    expect(bytesToHex(short.c1)).toBe('09611C0A7011057C0E')
    expect(bytesToHex(short.c2)).toBe('18761A19760D07721B')
    expect(bytesToHex(short.c1XorC2)).toBe('11170613061C020E15')
    expect(short.identityHolds).toBe(true)

    const long = runKeyReuseAttack({
      message1: 'HELLO',
      message2: 'WORLD',
      otpMode: false,
      key: textToBytes('TOOLONGKEY'),
    })
    expect(long.keyUsage.mode).toBe('truncated')
    expect(long.keyUsage.truncated).toBe(5)
    expect(long.identityHolds).toBe(true)
  })

  it('reuses the key it is given in OTP mode instead of generating a new one', () => {
    const reused = key('AE9D6DC115B277B864309C80F689')
    const result = runKeyReuseAttack({
      message1: 'ATTACK AT DAWN',
      message2: 'DEFEND WALLS!!',
      otpMode: true,
      key: reused,
      keyLabel: 'Random OTP Key (reused on purpose)',
    })
    // The panel, the run and the steps must all show this one key.
    expect(bytesToHex(result.key)).toBe('AE9D6DC115B277B864309C80F689')
    expect(result.keyHex).toBe('AE9D6DC115B277B864309C80F689')
    expect(bytesToHex(xorBytes(textToBytes('ATTACK AT DAWN'), result.effectiveKey))).toBe(
      bytesToHex(result.c1),
    )
  })

  it('labels a user key as such instead of calling it generated', () => {
    const result = runKeyReuseAttack({
      message1: 'HELLO',
      message2: 'WORLD',
      otpMode: false,
      key: textToBytes('NIGHTFALL'),
      keyLabel: 'Your Key (reused on purpose)',
    })
    expect(result.keyLabel).toBe('Your Key (reused on purpose)')
    const blocks = buildAttackSteps(result)[0].blocks
    expect(blocks.some((block) => block.label === 'Your Key (reused on purpose)')).toBe(true)
  })

  it('labels the key as a generated key when OTP mode is off', () => {
    const result = runKeyReuseAttack({ message1: 'AAAA', message2: 'BBBB', otpMode: false })
    expect(result.keyLabel).toBe('Generated Key')
  })

  it('requires both messages to have the same length', () => {
    expect(() => runKeyReuseAttack({ message1: 'short', message2: 'much longer', otpMode: false })).toThrow(
      'Both messages must have the same length in bytes so they can share one key.',
    )
  })

  it('requires both messages to be present', () => {
    expect(() => runKeyReuseAttack({ message1: '', message2: 'BBBB', otpMode: false })).toThrow(
      'Please enter both messages.',
    )
  })
})

describe('key reuse decrypt', () => {
  it('recovers both messages from the two ciphertexts and the session key', () => {
    const result = runKeyReuseDecrypt({
      ciphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
      ciphertext2: '1E2A36C4DCE7949297ABB45A8093',
      keyHex: '5A6F708192A3B4C5D6E7F809A1B2',
    })
    expect(result.m1Text).toBe('ATTACK AT DAWN')
    expect(result.m2Text).toBe('DEFEND WALLS!!')
    expect(result.identityHolds).toBe(true)
    expect(bytesToHex(result.c1XorC2)).toBe(bytesToHex(result.m1XorM2))
  })

  it('returns the bytes instead of failing when they are not valid UTF-8', () => {
    const result = runKeyReuseDecrypt({
      ciphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
      ciphertext2: '1E2A36C4DCE7949297ABB45A8093',
      // A key that leaves bytes outside UTF-8, as a random key does.
      keyHex: '0102030405060708090A0B0C0D0E0F',
    })
    expect(result.m1Text).toBeNull()
    expect(result.m2Text).toBeNull()
    // The bytes are still there, so the UI can show them in another format.
    expect(result.m1.length).toBe(14)
    expect(bytesToHex(result.m1XorM2)).toBe(bytesToHex(result.c1XorC2))
    expect(result.identityHolds).toBe(true)
  })

  it('still refuses ciphertexts of different lengths', () => {
    expect(() =>
      runKeyReuseDecrypt({ ciphertext1: '0A0E', ciphertext2: '0F1FAA', keyHex: '4B5A6F' }),
    ).toThrow('Both messages must have the same length in bytes so they can share one key.')
  })

  it('repeats a short key instead of refusing it, and the identity still holds', () => {
    const result = runKeyReuseDecrypt({
      ciphertext1: '09611C0A7011057C0E',
      ciphertext2: '18761A19760D07721B',
      keyHex: '4B3359',
    })
    expect(result.keyUsage.mode).toBe('repeated')
    expect(result.m1Text).toBe('BREACHNOW')
    expect(result.m2Text).toBe('SECRETLAB')
    expect(result.identityHolds).toBe(true)
  })

  it('validates hexadecimal input', () => {
    expect(() =>
      runKeyReuseDecrypt({ ciphertext1: 'ZZ', ciphertext2: '0F', keyHex: 'A1B2' }),
    ).toThrow('Invalid hexadecimal format.')
    expect(() =>
      runKeyReuseDecrypt({ ciphertext1: '0A0', ciphertext2: '0F1F', keyHex: 'A1B2C3' }),
    ).toThrow('Hexadecimal input must contain complete bytes.')
  })

  it('asks for a ciphertext when the field is empty', () => {
    expect(() =>
      runKeyReuseDecrypt({ ciphertext1: '', ciphertext2: '0F1F', keyHex: 'A1B2C3' }),
    ).toThrow('Please enter a ciphertext.')
  })
})

describe('known plaintext recovery', () => {
  it('recovers the key and then the second message', () => {
    const result = recoverKeyFromKnownPlaintext(
      'ATTACK AT DAWN',
      '1B3B24C0D1E8948482C7BC48F6FC',
      '1E2A36C4DCE7949297ABB45A8093',
    )
    expect(result.recoveredKeyHex).toBe('5A6F708192A3B4C5D6E7F809A1B2')
    expect(result.recoveredMessage2Text).toBe('DEFEND WALLS!!')
    expect(result.checksOut).toBe(true)
  })

  it('is exactly C1 XOR C2 = M1 XOR M2 written differently', () => {
    const m1 = textToBytes('KNOWN TEXT 1')
    const m2 = textToBytes('SECRET TEXT2')
    const k = key('00112233445566778899AABB')
    const c1 = xorBytes(m1, k)
    const c2 = xorBytes(m2, k)
    const result = recoverKeyFromKnownPlaintext('KNOWN TEXT 1', bytesToHex(c1), bytesToHex(c2))
    expect(bytesEqual(result.recoveredKey, k)).toBe(true)
    expect(result.recoveredMessage2Text).toBe('SECRET TEXT2')
  })
})

describe('attack step visualisation', () => {
  it('shows the three documented steps and the K XOR K = 0 argument', () => {
    const result = runKeyReuseAttack({
      message1: 'YES',
      message2: 'NO!',
      otpMode: true,
    })
    const steps = buildAttackSteps(result)
    expect(steps).toHaveLength(3)
    expect(steps[0].title).toBe('Message 1')
    expect(steps[1].title).toBe('Message 2, same key')
    expect(steps[2].title).toBe('Cancel the key out')
    expect(steps[2].formula?.join('\n')).toContain('= M1 XOR M2   because   K XOR K = 0')
    expect(steps[2].blocks.some((b) => b.value.includes('C1 XOR C2 = M1 XOR M2'))).toBe(true)
    expect(steps[2].blocks.some((b) => b.value.includes('NOT the key'))).toBe(true)
  })
})

/* -------------------------------------------------------------------------- */
/* Every shipped attack test case must agree with the implementation.          */
/* -------------------------------------------------------------------------- */

describe('attack test case data', () => {
  it('ships at least two cases per operation', () => {
    expect(ATTACK_TEST_CASES.filter((t) => t.operation === 'encrypt').length).toBeGreaterThanOrEqual(2)
    expect(ATTACK_TEST_CASES.filter((t) => t.operation === 'decrypt').length).toBeGreaterThanOrEqual(2)
  })

  it.each(ATTACK_TEST_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'test case #%i reproduces its expected outputs',
    (_id, testCase) => {
      const result = runKeyReuseAttack({
        message1: testCase.message1,
        message2: testCase.message2,
        otpMode: false,
        key: key(testCase.key),
      })
      expect(bytesToHex(result.c1)).toBe(testCase.expectedCiphertext1)
      expect(bytesToHex(result.c2)).toBe(testCase.expectedCiphertext2)
      expect(bytesToHex(result.c1XorC2)).toBe(testCase.expectedXor)
      expect(bytesToHex(result.m1XorM2)).toBe(testCase.expectedXor)
      expect(verifyKeyReuseIdentity(result.m1, result.m2, result.key, result.c1, result.c2)).toBe(
        true,
      )
    },
  )

  it.each(ATTACK_TEST_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'test case #%i decrypts back to the original messages',
    (_id, testCase) => {
      const result = runKeyReuseDecrypt({
        ciphertext1: testCase.expectedCiphertext1,
        ciphertext2: testCase.expectedCiphertext2,
        keyHex: testCase.key,
      })
      expect(result.m1Text).toBe(testCase.message1)
      expect(result.m2Text).toBe(testCase.message2)
    },
  )
})
