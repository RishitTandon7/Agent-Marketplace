import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/razorpay/verify-payment
 *
 * Called from the client after the Razorpay checkout handler fires.
 * Verifies the payment_id + subscription_id HMAC so we know the payment
 * really came from Razorpay and isn't a replay attack.
 *
 * Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 *
 * Note: Access activation is controlled by the webhook (source of truth).
 * This endpoint only validates the signature for immediate client feedback.
 */
export async function POST(req: NextRequest) {
  // Auth — must be signed in
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let razorpay_payment_id: string
  let razorpay_subscription_id: string
  let razorpay_signature: string

  try {
    const body = await req.json()
    razorpay_payment_id      = body.razorpay_payment_id ?? ''
    razorpay_subscription_id = body.razorpay_subscription_id ?? ''
    razorpay_signature       = body.razorpay_signature ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // HMAC verification: sign with key_secret, NOT webhook_secret
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
  const payload   = `${razorpay_payment_id}|${razorpay_subscription_id}`
  const expected  = crypto.createHmac('sha256', keySecret).update(payload).digest('hex')

  if (expected !== razorpay_signature) {
    console.error('[verify-payment] Signature mismatch — possible tampered response')
    return NextResponse.json({ error: 'Payment signature invalid.' }, { status: 400 })
  }

  console.log(`[verify-payment] ✓ Payment ${razorpay_payment_id} verified for sub ${razorpay_subscription_id}`)

  return NextResponse.json({ verified: true, payment_id: razorpay_payment_id })
}

