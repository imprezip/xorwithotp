/**
 * Shared domain types for CryptoLab.
 */

export type Operation = 'encrypt' | 'decrypt'

/** Formats accepted for plaintext / ciphertext / key input. */
export type InputFormat = 'text' | 'hex' | 'binary'

/** Formats available for the produced ciphertext. */
export type CipherOutputFormat = 'hex' | 'binary' | 'base64'

/** Formats a user may type an exercise answer in. */
export type AnswerFormat = 'text' | 'hex' | 'binary' | 'base64'

/** Human readable role of a field, used to build validation messages. */
export type FieldRole = 'plaintext' | 'ciphertext' | 'key'

export interface XorState {
  operation: Operation
  input: string
  inputFormat: InputFormat
  key: string
  keyFormat: InputFormat
  outputFormat: CipherOutputFormat
  otpMode: boolean
  exerciseMode: boolean
  showSteps: boolean
}

export interface AttackState {
  operation: Operation
  message1: string
  message2: string
  ciphertext1: string
  ciphertext2: string
  generatedKey: string
  otpMode: boolean
  exerciseMode: boolean
  showSteps: boolean
}
