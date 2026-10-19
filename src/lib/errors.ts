/**
 * A single, user-presentable error type.
 *
 * Every parsing / cryptographic routine in CryptoLab throws `CryptoError` with a
 * message that is safe (and intended) to be shown inline in the UI, so an
 * invalid input can never crash the application.
 */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CryptoError'
  }
}

/** Narrow an unknown thrown value to a displayable message. */
export function toMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof CryptoError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
