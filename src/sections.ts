/** The single-page structure, shared by the header navigation and the page body. */
export const NAV_ITEMS = [
  { id: 'xor-cipher', label: 'XOR Cipher' },
  { id: 'security', label: 'Security Attack' },
  { id: 'otp', label: 'OTP' },
] as const

export const SECTION_IDS: string[] = NAV_ITEMS.map((item) => item.id)
