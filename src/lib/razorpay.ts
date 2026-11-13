import Razorpay from 'razorpay'

/**
 * Singleton Razorpay server-side client.
 * Only import in API routes — never in client components.
 */
let _razorpay: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      throw new Error(
        'Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local'
      )
    }

    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return _razorpay
}

