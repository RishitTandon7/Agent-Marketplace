import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Password Generator agent — ZERO LLM needed.
 * Contract: POST { length?: number, include_uppercase?: boolean, include_numbers?: boolean, include_symbols?: boolean, count?: number }
 * →        { passwords: string[], strength, entropy_bits, tips }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const length:            number  = Math.min(Math.max(Number(body?.length ?? 16), 4), 128)
  const includeUppercase:  boolean = body?.include_uppercase  !== false
  const includeNumbers:    boolean = body?.include_numbers    !== false
  const includeSymbols:    boolean = body?.include_symbols    !== false
  const count:             number  = Math.min(Math.max(Number(body?.count ?? 3), 1), 10)

  // Build character set
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  let charset = lower
  if (includeUppercase) charset += upper
  if (includeNumbers)   charset += numbers
  if (includeSymbols)   charset += symbols

  function generate(): string {
    const bytes = crypto.randomBytes(length * 2)
    let password = ''
    let i = 0
    while (password.length < length) {
      const byte = bytes[i++ % bytes.length]
      if (byte < charset.length * Math.floor(256 / charset.length)) {
        password += charset[byte % charset.length]
      }
    }
    return password
  }

  // Calculate entropy
  const entropyBits = Math.floor(length * Math.log2(charset.length))

  // Strength classification
  let strength: string
  if (entropyBits >= 128)     strength = 'Very Strong'
  else if (entropyBits >= 96) strength = 'Strong'
  else if (entropyBits >= 72) strength = 'Good'
  else if (entropyBits >= 48) strength = 'Fair'
  else                        strength = 'Weak'

  const passwords = Array.from({ length: count }, generate)

  const tips: string[] = []
  if (length < 12)          tips.push('Use at least 12 characters for better security')
  if (!includeSymbols)      tips.push('Adding symbols increases entropy significantly')
  if (!includeNumbers)      tips.push('Numbers increase the character set size')
  if (entropyBits < 72)     tips.push('Consider a longer password for sensitive accounts')

  return NextResponse.json({
    passwords,
    strength,
    entropy_bits: entropyBits,
    charset_size: charset.length,
    tips: tips.length ? tips : ['This is a strong password configuration ✅'],
  })
}
