import { describe, expect, it } from 'vitest'
import { UNKNOWN_CHAR, bytesEqual, bytesToHex, textToBytes } from './bytes'
import {
  buildXorRows,
  keyCancelsOut,
  roundTripIsLossless,
  xorBytes,
  xorDecrypt,
  xorEncrypt,
} from './xor'
import { runXor, buildXorSteps, operationLabels } from './pipeline'
import { parseToBytes, assertUsableKey, validateXorInput } from './parse'
import { XOR_TEST_CASES } from '../data/xorTestCases'

describe('xorBytes', () => {
  it('matches the worked example from the specification', () => {
    const result = xorBytes(textToBytes('HELLO'), textToBytes('ABCDE'))
    expect(bytesToHex(result)).toBe('09070F080A')
  })

  it('works byte for byte on hexadecimal pairs', () => {
    expect(bytesToHex(xorBytes(Uint8Array.from([0x48]), Uint8Array.from([0x41])))).toBe('09')
    expect(bytesToHex(xorBytes(Uint8Array.from([0x45]), Uint8Array.from([0x42])))).toBe('07')
    expect(bytesToHex(xorBytes(Uint8Array.from([0x4c]), Uint8Array.from([0x43])))).toBe('0F')
    expect(bytesToHex(xorBytes(Uint8Array.from([0x4c]), Uint8Array.from([0x44])))).toBe('08')
    expect(bytesToHex(xorBytes(Uint8Array.from([0x4f]), Uint8Array.from([0x45])))).toBe('0A')
  })

  it('is its own inverse', () => {
    const message = textToBytes('the quick brown fox')
    const key = textToBytes('jumps over the lazy')
    expect(bytesEqual(xorDecrypt(xorEncrypt(message, key), key), message)).toBe(true)
  })

  it('refuses mismatched lengths instead of truncating', () => {
    expect(() => xorBytes(textToBytes('HELLO'), textToBytes('ABC'))).toThrow(
      'Key length must match the input length in bytes.',
    )
  })

  it('never mutates its inputs and always returns a new array', () => {
    const a = Uint8Array.from([1, 2, 3])
    const b = Uint8Array.from([3, 2, 1])
    const result = xorBytes(a, b)
    expect(bytesEqual(a, Uint8Array.from([1, 2, 3]))).toBe(true)
    expect(bytesEqual(b, Uint8Array.from([3, 2, 1]))).toBe(true)
    expect(result).not.toBe(a)
    expect(result).not.toBe(b)
  })

  it('treats XOR of a value with itself as zero', () => {
    const key = textToBytes('LOCKED')
    expect(keyCancelsOut(key)).toBe(true)
    expect(xorBytes(key, key).every((byte) => byte === 0)).toBe(true)
  })
})

describe('runXor pipeline', () => {
  it('encrypts the documented example', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: 'ABCDE',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(result.outputText).toBe('09070F080A')
    expect(result.outputHex).toBe('09070F080A')
    expect(result.inputLabel).toBe('Plaintext')
    expect(result.outputLabel).toBe('Ciphertext')
  })

  it('decrypts hexadecimal back to the original text', () => {
    const result = runXor({
      operation: 'decrypt',
      input: '09070F080A',
      inputFormat: 'hex',
      key: 'ABCDE',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(result.outputAsText).toBe('HELLO')
    expect(result.outputLabel).toBe('Plaintext')
  })

  it('produces the same bytes for every input representation', () => {
    const hex = runXor({
      operation: 'encrypt',
      input: 'MATH',
      inputFormat: 'text',
      key: 'BOOM',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    const binary = runXor({
      operation: 'encrypt',
      input: '01001101 01000001 01010100 01001000',
      inputFormat: 'binary',
      key: '01000010 01001111 01001111 01001101',
      keyFormat: 'binary',
      outputFormat: 'hex',
    })
    expect(binary.outputHex).toBe(hex.outputHex)
    expect(hex.outputHex).toBe('0F0E1B05')
  })

  it('handles multi-byte utf-8 in a byte oriented way', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'café ☕ bar',
      inputFormat: 'text',
      key: 'kopi-12345-xx',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(result.inputBytes.length).toBe(13)
    expect(result.outputHex).toBe('080E16AA8411D0ABA1154F190A')
    const back = runXor({
      operation: 'decrypt',
      input: '080E16AA8411D0ABA1154F190A',
      inputFormat: 'hex',
      key: 'kopi-12345-xx',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(back.outputAsText).toBe('café ☕ bar')
  })

  it('reports an empty plaintext, ciphertext and key', () => {
    const base = {
      operation: 'encrypt' as const,
      inputFormat: 'text' as const,
      keyFormat: 'text' as const,
      outputFormat: 'hex' as const,
    }
    expect(() => runXor({ ...base, input: '', key: 'ABC' })).toThrow('Please enter a plaintext.')
    expect(() => runXor({ ...base, input: 'ABC', key: '' })).toThrow('Please enter a key.')
    expect(() =>
      runXor({
        operation: 'decrypt',
        input: '   ',
        inputFormat: 'hex',
        key: '414243',
        keyFormat: 'hex',
        outputFormat: 'hex',
      }),
    ).toThrow('Please enter a ciphertext.')
  })

  it('repeats a short key instead of rejecting it', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: 'ABC',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(bytesToHex(result.effectiveKey)).toBe('4142434142')
    expect(result.keyUsage.mode).toBe('repeated')
    expect(result.keyUsage.repeats).toBe(2)
    expect(result.keyUsage.effectiveLength).toBe(5)
    expect(result.outputText).toBe('09070F0D0D')
  })

  it('truncates a long key instead of rejecting it', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: 'ABCDEFGHIJ',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    expect(bytesToHex(result.effectiveKey)).toBe('4142434445')
    expect(result.keyUsage.mode).toBe('truncated')
    expect(result.keyUsage.truncated).toBe(5)
  })

  it('rejects an empty key', () => {
    expect(() =>
      runXor({
        operation: 'encrypt',
        input: 'HELLO',
        inputFormat: 'text',
        key: '',
        keyFormat: 'text',
        outputFormat: 'hex',
      }),
    ).toThrow('Please enter a key.')
  })

  it('rejects invalid hexadecimal and binary input', () => {
    expect(() =>
      runXor({
        operation: 'encrypt',
        input: 'ZZ',
        inputFormat: 'hex',
        key: '4142',
        keyFormat: 'hex',
        outputFormat: 'hex',
      }),
    ).toThrow('Invalid hexadecimal format.')

    expect(() =>
      runXor({
        operation: 'encrypt',
        input: '0100 1002',
        inputFormat: 'binary',
        key: '01000000 01000000',
        keyFormat: 'binary',
        outputFormat: 'hex',
      }),
    ).toThrow('Binary input may contain only 0 and 1.')
  })

  it('shows unknown characters for decrypted bytes that are not utf-8', () => {
    const result = runXor({
      operation: 'decrypt',
      input: 'FFFE41',
      inputFormat: 'hex',
      key: '000000',
      keyFormat: 'hex',
      outputFormat: 'text',
    })
    expect(result.outputAsText).toBeNull()
    expect(result.outputLooseText).toBe(`${UNKNOWN_CHAR}${UNKNOWN_CHAR}A`)
    expect(result.outputText).toBe(result.outputLooseText)
    expect(result.outputHex).toBe('FFFE41')
  })
})

describe('input validation helpers', () => {
  it('treats a single space as real text', () => {
    expect(parseToBytes(' ', 'text', 'plaintext').length).toBe(1)
  })

  it('reports validation problems without throwing', () => {
    expect(validateXorInput('HELLO', 'text', 'ABCDE', 'text', 'encrypt')).toBeNull()
    // A key of any length is accepted: it is repeated or trimmed to fit.
    expect(validateXorInput('HELLO', 'text', 'ABC', 'text', 'encrypt')).toBeNull()
    expect(validateXorInput('HELLO', 'text', 'ABCDEFGHIJ', 'text', 'encrypt')).toBeNull()
    expect(validateXorInput('', 'text', 'ABC', 'text', 'decrypt')).toBe(
      'Please enter a ciphertext.',
    )
    expect(validateXorInput('HELLO', 'text', '', 'text', 'encrypt')).toBe('Please enter a key.')
  })

  it('rejects an empty key but nothing about its length', () => {
    expect(() => assertUsableKey(new Uint8Array(0))).toThrow('Please enter a key.')
    expect(() => assertUsableKey(new Uint8Array(1))).not.toThrow()
    expect(() => assertUsableKey(new Uint8Array(64))).not.toThrow()
  })
})

describe('step visualisation', () => {
  it('produces the documented encrypt steps', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: 'ABCDE',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    const steps = buildXorSteps(result)
    const titles = steps.map((step) => step.title)
    expect(titles).toEqual(['Input', 'Convert to Bytes', 'Convert to Binary', 'XOR', 'Convert Result'])

    const bytesStep = steps[1]
    expect(bytesStep.blocks[0].value).toBe('48 45 4C 4C 4F')
    expect(bytesStep.blocks[1].value).toBe('41 42 43 44 45')

    const binaryStep = steps[2]
    expect(binaryStep.blocks[0].value).toBe(
      '01001000 01000101 01001100 01001100 01001111',
    )

    const xorStep = steps[3]
    expect(xorStep.blocks.some((b) => b.value === '01001000  XOR  01000001  =  00001001')).toBe(
      true,
    )
    expect(xorStep.blocks.some((b) => b.value === '01000101  XOR  01000010  =  00000111')).toBe(
      true,
    )
    expect(xorStep.blocks.some((b) => b.value === '01001100  XOR  01000011  =  00001111')).toBe(
      true,
    )
    expect(xorStep.blocks.some((b) => b.value === '01001100  XOR  01000100  =  00001000')).toBe(
      true,
    )
    expect(xorStep.blocks.some((b) => b.value === '01001111  XOR  01000101  =  00001010')).toBe(
      true,
    )

    const resultStep = steps[4]
    expect(resultStep.blocks.some((b) => b.value === '00001001 00000111 00001111 00001000 00001010')).toBe(true)
    expect(resultStep.blocks.some((b) => b.value === '09 07 0F 08 0A')).toBe(true)
    expect(resultStep.blocks.some((b) => b.value === '09070F080A')).toBe(true)
  })

  it('produces the documented decrypt steps including the utf-8 stage', () => {
    const result = runXor({
      operation: 'decrypt',
      input: '09070F080A',
      inputFormat: 'hex',
      key: 'ABCDE',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    const steps = buildXorSteps(result)
    expect(steps.map((s) => s.title)).toContain('UTF-8 Decode')
    const xorStep = steps.find((step) => step.id === 4)
    expect(xorStep?.blocks.some((b) => b.value === '09  XOR  41  =  48')).toBe(true)
    expect(xorStep?.blocks.some((b) => b.value === '0F  XOR  43  =  4C')).toBe(true)
    const utf8 = steps.find((step) => step.id === 6)
    expect(utf8?.blocks.some((b) => b.value === 'HELLO')).toBe(true)
  })

  it('labels inputs and outputs per operation', () => {
    expect(operationLabels('encrypt')).toEqual({ input: 'Plaintext', output: 'Ciphertext' })
    expect(operationLabels('decrypt')).toEqual({ input: 'Ciphertext', output: 'Plaintext' })
  })

  it('never renders a key anywhere once the steps are redacted', () => {
    const result = runXor({
      operation: 'encrypt',
      input: 'HELLO',
      inputFormat: 'text',
      key: 'ABCDE',
      keyFormat: 'text',
      outputFormat: 'hex',
    })
    const open = buildXorSteps(result)
    const redacted = buildXorSteps(result, { redactKey: true })

    // Nothing of the key survives redaction: not the raw field, not the byte
    // dump, not the binary dump and not the per-byte XOR lines.
    const joined = redacted
      .flatMap((step) => step.blocks.map((block) => `${block.label ?? ''} ${block.value}`))
      .join('\n')
    expect(joined).not.toContain('ABCDE')
    expect(joined).not.toContain('41 42 43 44 45')
    expect(joined).not.toContain('01000001')
    expect(joined).toContain('•')

    // The input, the result and the maths around them stay untouched.
    expect(joined).toContain('HELLO')
    expect(joined).toContain('09070F080A')
    expect(redacted[3].blocks.some((b) => b.value === '01001000  XOR  ••••••••  =  00001001')).toBe(
      true,
    )
    expect(redacted[3].blocks.some((b) => b.value === '48  XOR  ••  =  09')).toBe(true)

    // Without redaction nothing is masked.
    expect(open[1].blocks[1].value).toBe('41 42 43 44 45')
  })

  it('builds one row per byte with bit level detail', () => {
    const rows = buildXorRows(textToBytes('CRYPTO'), textToBytes('LOCKED'))
    expect(rows).toHaveLength(6)
    expect(rows[0]).toMatchObject({
      index: 0,
      messageHex: '43',
      keyHex: '4C',
      resultHex: '0F',
      messageBin: '01000011',
      keyBin: '01001100',
      resultBin: '00001111',
    })
    expect(rows[0].setBits).toEqual([3, 2, 1, 0])
  })
})

/* -------------------------------------------------------------------------- */
/* Every shipped test case must agree with the implementation.                  */
/* -------------------------------------------------------------------------- */

describe('XOR test case data', () => {
  it('ships at least three test cases for each operation', () => {
    expect(XOR_TEST_CASES.filter((t) => t.operation === 'encrypt').length).toBeGreaterThanOrEqual(3)
    expect(XOR_TEST_CASES.filter((t) => t.operation === 'decrypt').length).toBeGreaterThanOrEqual(3)
  })

  it.each(XOR_TEST_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'test case #%i reproduces its expected output',
    (_id, testCase) => {
      const result = runXor({
        operation: testCase.operation,
        input: testCase.input,
        inputFormat: testCase.inputFormat,
        key: testCase.key,
        keyFormat: testCase.keyFormat,
        outputFormat: testCase.outputFormat,
      })
      // Encrypt exercises expose the ciphertext, decrypt exercises the plaintext.
      const actual =
        testCase.operation === 'encrypt' ? result.outputText : (result.outputAsText ?? '')
      expect(actual).toBe(testCase.expectedOutput)
    },
  )

  it.each(XOR_TEST_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'test case #%i is lossless: applying the key again returns the input',
    (_id, testCase) => {
      const inputBytes = parseToBytes(testCase.input, testCase.inputFormat, 'plaintext')
      const key = parseToBytes(testCase.key, testCase.keyFormat, 'key')
      expect(roundTripIsLossless(inputBytes, key)).toBe(true)

      const result = runXor({
        operation: testCase.operation,
        input: testCase.input,
        inputFormat: testCase.inputFormat,
        key: testCase.key,
        keyFormat: testCase.keyFormat,
        outputFormat: testCase.outputFormat,
      })
      expect(bytesEqual(xorDecrypt(result.outputBytes, key), inputBytes)).toBe(true)
    },
  )
})
