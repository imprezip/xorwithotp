import { describe, expect, it } from 'vitest'
import { buildExerciseView, checkAnswer, normalizeAnswer } from './exercise'
import {
  buildAttackOutline,
  buildAttackQuestion,
  buildXorOutline,
  buildXorQuestion,
  defaultAnswerFormat,
  type AttackQuestionInput,
  type XorQuestionInput,
} from './questions'
import { XOR_TEST_CASES, xorTestCasesFor, type XorTestCase } from '../data/xorTestCases'
import { attackTestCasesFor } from '../data/attackTestCases'
import { parseToBytes } from './parse'
import { base64ToBytes, bytesToHex, textToBytes } from './bytes'

const questionInput: XorQuestionInput = {
  operation: 'encrypt',
  input: 'HELLO',
  inputFormat: 'text',
  key: 'ABCDE',
  keyFormat: 'text',
  outputFormat: 'hex',
  answerFormat: 'hex',
}

const question = buildXorQuestion(questionInput)

/** The bytes a worked example records, whatever representation it uses. */
function recordedBytes(testCase: XorTestCase): Uint8Array {
  if (testCase.outputFormat === 'text') return textToBytes(testCase.expectedOutput)
  if (testCase.outputFormat === 'base64') return base64ToBytes(testCase.expectedOutput)
  return parseToBytes(testCase.expectedOutput, testCase.outputFormat, 'plaintext')
}

const attackInput: AttackQuestionInput = {
  operation: 'encrypt',
  message1: 'ATTACK AT DAWN',
  message2: 'DEFEND WALLS!!',
  ciphertext1: '',
  ciphertext2: '',
  key: parseToBytes('4B4C4D4E4F5051525354', 'hex', 'key'),
  otpMode: false,
}

describe('answer normalisation', () => {
  it('ignores case, spacing and 0x prefixes for hex answers', () => {
    expect(normalizeAnswer(' 0f1d 1a1b 110b ', 'hex')).toBe('0F1D1A1B110B')
    expect(normalizeAnswer('0F1D1A1B110B', 'hex')).toBe('0F1D1A1B110B')
    expect(normalizeAnswer('0f1d1a1b110b', 'hex')).toBe('0F1D1A1B110B')
  })

  it('ignores grouping for binary answers', () => {
    expect(normalizeAnswer('0000 1111 0000 1111', 'binary')).toBe('0000111100001111')
  })

  it('collapses whitespace and case for text answers', () => {
    expect(normalizeAnswer('  Attack   at Dawn ', 'text')).toBe('attack at dawn')
  })

  it('stays strict about content', () => {
    expect(normalizeAnswer('0F1D1A1B110C', 'hex')).not.toBe(normalizeAnswer('0F1D1A1B110B', 'hex'))
  })
})

const rightAnswer = { answer: '09070F080A' }

describe('expected output stays hidden until the answer is checked', () => {
  it('reports HIDDEN before checking, even though the question is built', () => {
    const view = buildExerciseView(question, rightAnswer, null)
    expect(view.status).toBe('idle')
    expect(view.expectedVisible).toBe(false)
    expect(view.headline).toBeNull()
    expect(view.icon).toBeNull()
    expect(view.fields[0].expected).toBeNull()
    expect(view.fields[0].correct).toBeNull()
    expect(view.reveal).toEqual([])
  })

  it('does not contain the expected value anywhere in the idle view', () => {
    const view = buildExerciseView(question, {}, null)
    expect(JSON.stringify(view)).not.toContain('09070F080A')
  })

  it('the outline itself carries no expected values at all', () => {
    const outline = buildXorOutline(questionInput)
    expect(outline.fields).toHaveLength(1)
    for (const field of outline.fields) {
      expect(field.expected).toBeUndefined()
    }
    expect(JSON.stringify(outline)).not.toContain('09070F080A')
    expect(outline.reveal).toEqual([])
  })

  it('the attack outline carries no expected values at all', () => {
    const outline = buildAttackOutline(attackInput)
    for (const field of outline.fields) {
      expect(field.expected).toBeUndefined()
    }
    expect(JSON.stringify(outline)).not.toContain('expected')
  })
})

describe('checking a correct answer', () => {
  it('marks the exercise correct and reveals the expected output', () => {
    const result = checkAnswer(question, rightAnswer)
    expect(result.correct).toBe(true)
    expect(result.correctCount).toBe(1)
    expect(result.isEmpty).toBe(false)

    const view = buildExerciseView(question, rightAnswer, result)
    expect(view.status).toBe('correct')
    expect(view.isCorrect).toBe(true)
    expect(view.headline).toBe('Correct!')
    expect(view.icon).toBe('✓')
    expect(view.summary).toBe('All 1 answer correct')
    expect(view.fields[0].expected).toBe('09070F080A')
    expect(view.fields[0].correct).toBe(true)
    expect(view.reveal.length).toBeGreaterThan(0)
  })

  it('accepts equivalent formatting', () => {
    const result = checkAnswer(question, { answer: '09 07 0f 08 0a' })
    expect(result.correct).toBe(true)
  })

  it('treats a missing answer as wrong, not as correct', () => {
    const result = checkAnswer(question, {})
    expect(result.correct).toBe(false)
    expect(result.correctCount).toBe(0)
  })
})

describe('checking a wrong answer', () => {
  it('marks the exercise wrong and still reveals the expected output', () => {
    const result = checkAnswer(question, { answer: 'DEADBEEF' })
    expect(result.correct).toBe(false)
    expect(result.correctCount).toBe(0)

    const view = buildExerciseView(question, { answer: 'DEADBEEF' }, result)
    expect(view.status).toBe('wrong')
    expect(view.headline).toBe('Wrong!')
    expect(view.icon).toBe('✗')
    expect(view.summary).toBe('0 of 1 correct')
    expect(view.fields[0].expected).toBe('09070F080A')
    expect(view.fields[0].correct).toBe(false)
  })

  it('treats an empty answer as wrong and not as correct', () => {
    const result = checkAnswer(question, { answer: '   ' })
    expect(result.correct).toBe(false)
    expect(result.isEmpty).toBe(true)
    expect(result.fields[0].empty).toBe(true)
  })

  it('keeps the typed answer so the student can see the mistake', () => {
    const result = checkAnswer(question, { answer: '09070F080C' })
    const view = buildExerciseView(question, { answer: '09070F080C' }, result)
    expect(view.fields[0].submitted).toBe('09070F080C')
  })
})

describe('questions are built from the live input, not from a test case', () => {
  it('grades whatever the student typed, including a repeated key', () => {
    const built = buildXorQuestion({
      ...questionInput,
      input: 'HELLO WORLD',
      key: 'Hi!',
    })
    expect(built.fields[0].expected).toBe('002C6D0426011F2673042D')
    expect(checkAnswer(built, { answer: '002C6D0426011F2673042D' }).correct).toBe(true)
  })

  it('grades a truncated key just as happily', () => {
    const built = buildXorQuestion({ ...questionInput, input: 'CRYPTO', key: 'TOOLONGKEY' })
    expect(built.fields[0].expected).toBe('171D161C1B01')
    expect(checkAnswer(built, { answer: '171d161c1b01' }).correct).toBe(true)
  })

  it('describes how the key was fitted in the prompt', () => {
    const repeated = buildXorOutline({ ...questionInput, input: 'HELLO WORLD', key: 'Hi!' })
    expect(repeated.prompt.map((row) => row.note)).toContain('key repeats')

    const truncated = buildXorOutline({ ...questionInput, input: 'CRYPTO', key: 'TOOLONGKEY' })
    expect(truncated.prompt.map((row) => row.note)).toContain('key truncates')

    const exact = buildXorOutline(questionInput)
    expect(exact.prompt.map((row) => row.note)).toContain('exact fit')
  })

  it('grades a hex OTP key, so the exercise also works in OTP mode', () => {
    // OTP mode hands the generated key to the question as hex, 4 bytes for a 6-byte message.
    const built = buildXorQuestion({
      ...questionInput,
      input: 'SECRET',
      key: '4C0F9A2B',
      keyFormat: 'hex',
    })
    expect(built.fields[0].expected).toBe('1F4AD979095B')
    expect(checkAnswer(built, { answer: '1f4ad979095b' }).correct).toBe(true)
    expect(checkAnswer(built, { answer: '1F4A D9 79 09 5B' }).correct).toBe(true)
  })

  it('masks the OTP key in the exercise once the countdown has ended', () => {
    const otp = { ...questionInput, input: 'SECRET', key: '4C0F9A2B', keyFormat: 'hex' as const }

    const revealed = buildXorQuestion(otp)
    expect(revealed.prompt.map((row) => row.value)).toContain('4C0F9A2B')

    const masked = buildXorQuestion({ ...otp, redactKey: true })
    expect(masked.prompt.map((row) => row.value)).not.toContain('4C0F9A2B')
    expect(masked.prompt.find((row) => row.label === 'Key')?.value).toBe('hidden')
    for (const item of masked.reveal) expect(item.value).not.toContain('4C0F9A2B')
    // The answer is still graded with the real key while its views stay masked.
    expect(masked.fields.map((field) => field.expected)).toEqual(
      revealed.fields.map((field) => field.expected),
    )
  })

  it('asks for a single answer with a format picker', () => {
    const built = buildXorQuestion(questionInput)
    expect(built.fields.map((field) => field.key)).toEqual(['answer'])
    expect(built.fields[0].label).toBe('Ciphertext')
    expect(built.fields[0].expected).toBe('09070F080A')
    expect(built.fields[0].options).toEqual(['hex', 'binary'])
    expect(built.fields[0].format).toBe('hex')
    expect(checkAnswer(built, { answer: '09070F080A' }).correct).toBe(true)
  })

  it('grades the answer in whichever format the student picked', () => {
    const binary = buildXorQuestion({ ...questionInput, answerFormat: 'binary' })
    expect(binary.fields[0].format).toBe('binary')
    expect(binary.fields[0].expected).toBe('00001001 00000111 00001111 00001000 00001010')
    expect(
      checkAnswer(binary, { answer: '00001001 00000111 00001111 00001000 00001010' }).correct,
    ).toBe(true)
    // The hex answer is no longer accepted once binary is chosen.
    expect(checkAnswer(binary, { answer: '09070F080A' }).correct).toBe(false)
  })

  it('defaults a plaintext answer to text and a ciphertext answer to hex', () => {
    expect(defaultAnswerFormat('decrypt')).toBe('text')
    expect(defaultAnswerFormat('encrypt')).toBe('hex')

    const decrypt = buildXorQuestion({
      ...questionInput,
      operation: 'decrypt',
      input: '09070F080A',
      inputFormat: 'hex',
      key: 'ABCDE',
      answerFormat: defaultAnswerFormat('decrypt'),
    })
    expect(decrypt.fields[0].format).toBe('text')
    expect(decrypt.fields[0].options).toEqual(['text', 'hex', 'binary'])
    expect(decrypt.fields[0].expected).toBe('HELLO')
    expect(checkAnswer(decrypt, { answer: 'hello' }).correct).toBe(true)

    // A ciphertext answer has no text form, so text is not offered.
    const encrypt = buildXorQuestion(questionInput)
    expect(encrypt.fields[0].options).not.toContain('text')
    // A format that does not apply falls back to the default instead of breaking.
    const unsupported = buildXorQuestion({ ...questionInput, answerFormat: 'text' })
    expect(unsupported.fields[0].format).toBe('hex')
  })

  it('grades a decrypt exercise of the live input', () => {
    const built = buildXorQuestion({
      ...questionInput,
      operation: 'decrypt',
      input: '09070F080A',
      inputFormat: 'hex',
      key: 'ABCDE',
    })
    expect(built.fields[0].expected).toBe('48454C4C4F')
    expect(checkAnswer(built, { answer: '48454C4C4F' }).correct).toBe(true)
  })

  it('every shipped XOR example still produces its recorded answer', () => {
    for (const testCase of XOR_TEST_CASES) {
      // Every example is graded in hex, whatever representation it records, so
      // the recorded output is decoded to the bytes it stands for first.
      const expectedHex = bytesToHex(recordedBytes(testCase))
      const built = buildXorQuestion({
        operation: testCase.operation,
        input: testCase.input,
        inputFormat: testCase.inputFormat,
        key: testCase.key,
        keyFormat: testCase.keyFormat,
        outputFormat: 'hex',
        answerFormat: 'hex',
      })
      expect(built.fields[0].expected).toBe(expectedHex)
      expect(checkAnswer(built, { answer: expectedHex }).correct).toBe(true)
    }
  })

  it('offers encrypt and decrypt examples separately', () => {
    expect(xorTestCasesFor('encrypt').length).toBeGreaterThanOrEqual(3)
    expect(xorTestCasesFor('decrypt').length).toBeGreaterThanOrEqual(3)
  })
})

describe('attack questions are built from the live input', () => {
  it('builds three answer fields for encrypt', () => {
    const built = buildAttackQuestion(attackInput)
    expect(built.fields.map((field) => field.key)).toEqual([
      'ciphertext1',
      'ciphertext2',
      'xor',
    ])
    const result = checkAnswer(built, {
      ciphertext1: built.fields[0].expected ?? '',
      ciphertext2: built.fields[1].expected ?? '',
      xor: built.fields[2].expected ?? '',
    })
    expect(result.correct).toBe(true)
  })

  it('accepts a partially correct answer set as wrong overall', () => {
    const built = buildAttackQuestion(attackInput)
    const result = checkAnswer(built, {
      ciphertext1: built.fields[0].expected ?? '',
      ciphertext2: '00',
      xor: built.fields[2].expected ?? '',
    })
    expect(result.correct).toBe(false)
    expect(result.correctCount).toBe(2)
  })

  it('builds two text fields plus the XOR for decrypt', () => {
    const built = buildAttackQuestion({
      ...attackInput,
      operation: 'decrypt',
      ciphertext1: '1B3B24C0D1E8948482C7BC48F6FC',
      ciphertext2: '1E2A36C4DCE7949297ABB45A8093',
      key: parseToBytes('5A6F708192A3B4C5D6E7F809A1B2', 'hex', 'key'),
    })
    expect(built.fields.map((field) => field.format)).toEqual(['text', 'text', 'hex'])
    const result = checkAnswer(built, {
      message1: 'ATTACK AT DAWN',
      message2: 'DEFEND WALLS!!',
      xor: built.fields[2].expected ?? '',
    })
    expect(result.correct).toBe(true)
  })

  it('reveals the identity, and never claims C1 XOR C2 is the key', () => {
    const built = buildAttackQuestion(attackInput)
    const view = buildExerciseView(built, {}, checkAnswer(built, {}))
    const identity = view.reveal.find((item) => item.label === 'Identity')
    expect(identity?.value).toContain('C1 XOR C2 = M1 XOR M2')
    const never = view.reveal.find((item) => item.label === 'K XOR K')
    expect(never?.value).toContain('all zero bits')
  })

  it('works with a short key that has to be repeated', () => {
    const built = buildAttackQuestion({
      ...attackInput,
      message1: 'BREACHNOW',
      message2: 'SECRETLAB',
      key: parseToBytes('K3Y', 'text', 'key'),
    })
    expect(built.fields.map((field) => field.expected)).toEqual([
      '09611C0A7011057C0E',
      '18761A19760D07721B',
      '11170613061C020E15',
    ])
    const result = checkAnswer(built, {
      ciphertext1: '09611C0A7011057C0E',
      ciphertext2: '18761A19760D07721B',
      xor: '11170613061C020E15',
    })
    expect(result.correct).toBe(true)
  })

  it('keeps every attack answer field hidden before checking', () => {
    for (const testCase of attackTestCasesFor('encrypt')) {
      const built = buildAttackOutline({
        operation: 'encrypt',
        message1: testCase.message1,
        message2: testCase.message2,
        ciphertext1: '',
        ciphertext2: '',
        key: parseToBytes(testCase.key, 'hex', 'key'),
        otpMode: false,
      })
      const view = buildExerciseView(built, {}, null)
      for (const field of view.fields) {
        expect(field.expected).toBeNull()
      }
    }
  })
})
