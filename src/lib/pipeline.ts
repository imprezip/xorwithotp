/**
 * The XOR cipher pipeline: parse -> validate -> XOR -> render -> explain.
 *
 * This module is pure (no React), which makes the whole cipher testable and
 * lets the "Show Steps" visualisation be generated from the exact same data
 * that produced the result on screen.
 */
import {
  bytesToBase64,
  bytesToBinary,
  bytesToHex,
  bytesToHexSpaced,
  bytesToLooseText,
  formatBytes,
  tryBytesToText,
} from './bytes'
import { parseToBytes } from './parse'
import { applyKey, buildXorRows, describeKeyUsage, xorBytes, type KeyUsage, type XorRow } from './xor'
import type { CipherOutputFormat, InputFormat, Operation } from './types'

/**
 * `hex`, `binary` and `base64` describe a *ciphertext*; `text` only makes sense
 * for the decrypt direction, where the recovered plaintext is the whole point.
 */
export type OutputFormat = CipherOutputFormat | 'text'

export interface XorRunRequest {
  operation: Operation
  input: string
  inputFormat: InputFormat
  key: string
  keyFormat: InputFormat
  outputFormat: OutputFormat
}

export interface XorRunResult {
  operation: Operation
  /** Exactly what the user typed (kept for the step views). */
  inputRaw: string
  keyRaw: string
  inputBytes: Uint8Array
  keyBytes: Uint8Array
  outputBytes: Uint8Array
  /** Result rendered in the representation the user asked for. */
  outputText: string
  /** Result decoded back to UTF-8 when that is possible (null otherwise). */
  /** The output decoded as UTF-8, or `null` when the bytes are not valid text. */
  outputAsText: string | null
  /** The output decoded leniently: unknown bytes become the replacement character. */
  outputLooseText: string
  /** Canonical byte dumps used by the step views and the byte table. */
  inputHex: string
  keyHex: string
  outputHex: string
  inputLabel: string
  outputLabel: string
  inputFormat: InputFormat
  keyFormat: InputFormat
  outputFormat: OutputFormat
  /** How the typed key was fitted to the message. Shown, never hidden. */
  keyUsage: KeyUsage
  /** The key exactly as it will be applied, after repeating or trimming. */
  effectiveKey: Uint8Array
  rows: XorRow[]
}

export const INPUT_FORMAT_LABEL: Record<InputFormat, string> = {
  text: 'Text (UTF-8)',
  hex: 'Hexadecimal',
  binary: 'Binary',
}

export const OUTPUT_FORMAT_LABEL: Record<OutputFormat, string> = {
  hex: 'Hexadecimal',
  binary: 'Binary',
  base64: 'Base64',
  text: 'Text (UTF-8)',
}

/** Human readable name of the two halves of the operation. */
export function operationLabels(operation: Operation): { input: string; output: string } {
  return operation === 'encrypt'
    ? { input: 'Plaintext', output: 'Ciphertext' }
    : { input: 'Ciphertext', output: 'Plaintext' }
}

/** Run the cipher. Throws a `CryptoError` with a user-facing message on any problem. */
export function runXor(request: XorRunRequest): XorRunResult {
  const { operation, inputFormat, keyFormat, outputFormat } = request
  const role = operation === 'encrypt' ? 'plaintext' : 'ciphertext'
  const inputBytes = parseToBytes(request.input, inputFormat, role)
  const keyBytes = parseToBytes(request.key, keyFormat, 'key')

  const { bytes: effectiveKey, usage: keyUsage } = applyKey(keyBytes, inputBytes.length)
  const outputBytes = xorBytes(inputBytes, effectiveKey)

  // Wrong keys and short keys produce arbitrary bytes, so the result is always
  // shown: bytes that are not valid UTF-8 are rendered as unknown characters.
  const outputAsText = tryBytesToText(outputBytes)
  const outputLooseText = bytesToLooseText(outputBytes)

  const labels = operationLabels(operation)

  return {
    operation,
    inputRaw: request.input,
    keyRaw: request.key,
    inputBytes,
    keyBytes,
    effectiveKey,
    keyUsage,
    outputBytes,
    outputText: outputFormat === 'text' ? outputLooseText : formatBytes(outputBytes, outputFormat),
    outputAsText,
    outputLooseText,
    inputHex: bytesToHex(inputBytes),
    keyHex: bytesToHex(keyBytes),
    outputHex: bytesToHex(outputBytes),
    inputLabel: labels.input,
    outputLabel: labels.output,
    inputFormat,
    keyFormat,
    outputFormat,
    rows: buildXorRows(inputBytes, keyBytes),
  }
}

/* -------------------------------------------------------------------------- */
/* Step visualisation                                                          */
/* -------------------------------------------------------------------------- */

export interface XorStepBlock {
  label?: string
  value: string
  tone?: 'default' | 'accent' | 'muted'
  wrap?: boolean
  /** Short remark shown under the value, e.g. how the key was fitted. */
  note?: string
}

export interface XorStep {
  id: number
  title: string
  caption: string
  blocks: XorStepBlock[]
  formula?: string[]
}

const DECODE_CAPTION: Record<InputFormat, string> = {
  text: 'Text is encoded as UTF-8 first.',
  hex: 'Two digits become one byte.',
  binary: 'Eight bits become one byte.',
}

/**
 * Produce the "Show Steps" breakdown for an already computed result.
 *
 * `redactKey` is used by OTP Mode: the generated key is only shown while the
 * demonstration countdown is running, and every later view of it is masked so
 * the countdown actually means something.
 */
export function buildXorSteps(
  result: XorRunResult,
  options: { redactKey?: boolean } = {},
): XorStep[] {
  const { operation, inputBytes, keyBytes, outputBytes, rows } = result
  const redactKey = options.redactKey === true
  const labels = operationLabels(operation)
  const steps: XorStep[] = []

  const effectiveKey = result.effectiveKey
  const keyRawView = redactKey ? mask(keyBytes.length * 2) : result.keyRaw
  const keyHexView = redactKey ? mask(effectiveKey.length) : bytesToHexSpaced(effectiveKey)
  const keyBinaryView = redactKey ? mask(effectiveKey.length * 8) : bytesToBinary(effectiveKey)
  const keyFormatLabel = redactKey
    ? 'hidden. Reveal the OTP key to inspect it'
    : INPUT_FORMAT_LABEL[result.keyFormat]
  const keyNote = redactKey ? undefined : describeKeyUsage(result.keyUsage)

  steps.push({
    id: 1,
    title: 'Input',
    caption: 'The key is what makes the output differ from the input.',
    blocks: [
      {
        label: `${labels.input} (${INPUT_FORMAT_LABEL[result.inputFormat]})`,
        value: result.inputRaw,
      },
      {
        label: `Key (${keyFormatLabel})`,
        value: keyRawView,
        note: keyNote,
      },
    ],
    formula: operation === 'encrypt' ? ['C = M XOR K'] : ['M = C XOR K'],
  })

  steps.push({
    id: 2,
    title: 'Convert to Bytes',
    caption: DECODE_CAPTION[result.inputFormat],
    blocks: [
      { label: labels.input, value: bytesToHexSpaced(inputBytes) },
      {
        label: 'Key applied to every byte',
        value: keyHexView,
        note: result.keyUsage.mode === 'exact' ? undefined : describeKeyUsage(result.keyUsage),
      },
    ],
  })

  steps.push({
    id: 3,
    title: 'Convert to Binary',
    caption: 'Each byte becomes 8 bits, most significant bit first.',
    blocks: [
      { label: labels.input, value: bytesToBinary(inputBytes), wrap: true },
      { label: 'Key', value: keyBinaryView, wrap: true },
    ],
  })

  const xorBlocks: XorStepBlock[] = rows.map((row) => ({
    value: `${row.messageBin}  XOR  ${redactKey ? mask(8) : row.keyBin}  =  ${row.resultBin}`,
  }))

  const hexBlocks: XorStepBlock[] = rows.map((row) => ({
    value: `${row.messageHex}  XOR  ${redactKey ? mask(2) : row.keyHex}  =  ${row.resultHex}`,
  }))

  steps.push({
    id: 4,
    title: operation === 'encrypt' ? 'XOR' : `${labels.input} XOR Key`,
    caption: 'A bit is 1 when the two input bits differ, otherwise 0.',
    blocks: [
      { label: 'Bit by bit', value: '', tone: 'muted' },
      ...xorBlocks,
      { label: 'Same result in hexadecimal', value: '', tone: 'muted' },
      ...hexBlocks,
    ],
  })

  steps.push({
    id: 5,
    title: 'Convert Result',
    caption: 'The result bytes are rendered in the representation you selected.',
    blocks: [
      { label: 'Binary', value: bytesToBinary(outputBytes), wrap: true },
      { label: 'Hexadecimal', value: bytesToHexSpaced(outputBytes) },
      { label: 'Base64', value: bytesToBase64(outputBytes) },
      {
        label: `${labels.output} (${OUTPUT_FORMAT_LABEL[result.outputFormat]})`,
        value: result.outputText,
        tone: 'accent',
        wrap: result.outputFormat === 'binary',
      },
    ],
  })

  if (operation === 'decrypt') {
    const isText = result.outputAsText !== null
    steps.push({
      id: 6,
      title: 'UTF-8 Decode',
      caption: isText
        ? 'The recovered bytes are interpreted as UTF-8 text.'
        : 'The recovered bytes are not valid UTF-8, so unknown bytes are shown as the replacement character.',
      blocks: [
        { label: 'Bytes', value: bytesToHexSpaced(outputBytes) },
        { label: 'UTF-8', value: '', tone: 'muted' },
        {
          label: labels.output,
          value: result.outputLooseText || '(empty string)',
          tone: 'accent',
        },
      ],
    })
  }

  return steps
}

/** Placeholder used wherever an OTP key must not be rendered. */
function mask(length: number): string {
  return '\u2022'.repeat(Math.max(length, 2))
}

function describeInput(result: XorRunResult): string {
  if (result.inputFormat === 'text') {
    return tryBytesToText(result.inputBytes) ?? ''
  }
  return bytesToHex(result.inputBytes)
}

export { describeInput }
