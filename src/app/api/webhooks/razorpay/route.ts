import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // 1. Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    console.error('Razorpay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const admin = createAdminClient()

  const subscriptionPayload = event?.payload?.subscription?.entity
  const razorpaySubId: string = subscriptionPayload?.id

  if (!razorpaySubId) {
    return NextResponse.json({ received: true })
  }

  // 2. Map Razorpay events → Supabase subscription status
  switch (event.event) {
    case 'subscription.activated': {
      const periodEnd = new Date(subscriptionPayload.current_end * 1000).toISOString()
      await admin
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd })
        .eq('razorpay_subscription_id', razorpaySubId)
      break
    }
    case 'subscription.charged': {
      const periodEnd = new Date(subscriptionPayload.current_end * 1000).toISOString()
      await admin
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd })
        .eq('razorpay_subscription_id', razorpaySubId)
      break
    }
    case 'subscription.pending':
    case 'subscription.halted': {
      await admin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('razorpay_subscription_id', razorpaySubId)
      break
    }
    case 'subscription.cancelled':
    case 'subscription.completed': {
      await admin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('razorpay_subscription_id', razorpaySubId)
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
