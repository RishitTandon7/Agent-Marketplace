import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Razorpay Webhook Handler — POST /api/webhooks/razorpay
 *
 * This is the ONLY source of truth for subscription status.
 * Never trust the client-side Razorpay handler callback alone.
 *
 * Events handled:
 *   subscription.activated  → status = 'active'
 *   subscription.charged    → status = 'active' (renewal)
 *   subscription.pending    → status = 'past_due'
 *   subscription.halted     → status = 'past_due'
 *   subscription.cancelled  → status = 'cancelled'
 *   subscription.completed  → status = 'cancelled'
 *   payment.failed          → logged (subscription stays in current state)
 */
export async function POST(req: NextRequest) {
  // ── 1. Read raw body BEFORE any parsing (required for HMAC) ──────────────
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // ── 2. Verify HMAC signature ─────────────────────────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret === 'XXXXXXXXXXXXXXXXXXXX') {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured!')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    console.error('[razorpay-webhook] Invalid signature — possible spoofed request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 3. Parse event ───────────────────────────────────────────────────────
  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventName = event.event as string
  console.log(`[razorpay-webhook] Received event: ${eventName}`)

  const admin = createAdminClient()

  // ── 4. Handle subscription events ───────────────────────────────────────
  const payload = event?.payload as Record<string, unknown> | undefined
  const subEntity = (payload?.subscription as Record<string, unknown> | undefined)?.entity as Record<string, unknown> | undefined
  const razorpaySubId: string = (subEntity?.id as string) ?? ''

  if (!razorpaySubId) {
    // Not a subscription event we care about — ack it and move on
    return NextResponse.json({ received: true })
  }

  switch (eventName) {
    // ── Subscription activated (first successful payment) ──────────────────
    case 'subscription.activated':
    case 'subscription.charged': {
      const periodEnd = subEntity?.current_end
        ? new Date((subEntity.current_end as number) * 1000).toISOString()
        : null

      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd })
        .eq('razorpay_subscription_id', razorpaySubId)

      if (error) {
        console.error(`[razorpay-webhook] DB update failed for ${eventName}:`, error)
      } else {
        console.log(`[razorpay-webhook] ✓ Subscription ${razorpaySubId} → active (period_end: ${periodEnd})`)
      }
      break
    }

    // ── Payment failed / subscription halted ───────────────────────────────
    case 'subscription.pending':
    case 'subscription.halted': {
      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('razorpay_subscription_id', razorpaySubId)

      if (error) {
        console.error(`[razorpay-webhook] DB update failed for ${eventName}:`, error)
      } else {
        console.log(`[razorpay-webhook] ✓ Subscription ${razorpaySubId} → past_due`)
      }
      break
    }

    // ── Cancelled / completed ──────────────────────────────────────────────
    case 'subscription.cancelled':
    case 'subscription.completed': {
      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'cancelled', current_period_end: new Date().toISOString() })
        .eq('razorpay_subscription_id', razorpaySubId)

      if (error) {
        console.error(`[razorpay-webhook] DB update failed for ${eventName}:`, error)
      } else {
        console.log(`[razorpay-webhook] ✓ Subscription ${razorpaySubId} → cancelled`)
      }
      break
    }

    default:
      console.log(`[razorpay-webhook] Unhandled event type: ${eventName} — ignoring`)
      break
  }

  // Always return 200 so Razorpay doesn't retry
  return NextResponse.json({ received: true })
}
