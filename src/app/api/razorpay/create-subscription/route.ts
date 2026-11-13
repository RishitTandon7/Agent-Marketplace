import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let agentSlug: string
  try {
    const body = await req.json()
    agentSlug = body?.agentSlug ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!agentSlug) {
    return NextResponse.json({ error: 'agentSlug is required' }, { status: 400 })
  }

  // 3. Fetch agent from Supabase
  const admin = createAdminClient()
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('id, razorpay_plan_id, price_inr, is_premium')
    .eq('slug', agentSlug)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  if (!agent.is_premium || !agent.razorpay_plan_id) {
    return NextResponse.json({ error: 'Agent is not a paid plan' }, { status: 400 })
  }

  // 4. Check existing active subscription
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('agent_id', agent.id)
    .single()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  // 4.5 Self-healing: Ensure a profile row exists in public.profiles
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    console.log('[razorpay-sub] Creating self-healing profile row for user:', user.id)
    await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url,
    })
  }

  // 5. Create Razorpay subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscription: any
  try {
    const razorpay = getRazorpay()
    subscription = await razorpay.subscriptions.create({
      plan_id:         agent.razorpay_plan_id,
      total_count:     12,         // 12 billing cycles (1 year)
      quantity:        1,
      customer_notify: 1,
      notes: {
        user_id:  user.id,
        agent_id: agent.id,
      },
    })
  } catch (err) {
    // The Razorpay SDK rejects with a plain object ({ statusCode, error: { description } }), not an Error
    const rzpErr = err as { error?: { description?: string }; statusCode?: number; message?: string }
    const msg =
      rzpErr?.error?.description ??
      (err instanceof Error ? err.message : rzpErr?.message) ??
      'Razorpay error'
    console.error('[razorpay-sub] Create subscription failed:', rzpErr?.statusCode, msg, 'plan:', agent.razorpay_plan_id)
    // Safe diagnostics (never the secret itself) so a wrong env var is easy to spot
    const id = process.env.RAZORPAY_KEY_ID ?? ''
    const secretLen = (process.env.RAZORPAY_KEY_SECRET ?? '').length
    const hint = /auth/i.test(msg)
      ? ` [server is using key "${id.slice(0, 9)}…${id.slice(-4)}", secret length ${secretLen}; expected live key ending "f3V", length 24]`
      : ''
    return NextResponse.json({ error: `Payment provider error: ${msg}${hint}` }, { status: 502 })
  }

  // 6. Upsert subscription row as 'created' — webhook will flip to 'active'
  const { error: upsertErr } = await admin.from('subscriptions').upsert({
    user_id:                  user.id,
    agent_id:                 agent.id,
    razorpay_subscription_id: subscription.id,
    status:                   'created',
  }, { onConflict: 'user_id,agent_id' })

  if (upsertErr) {
    console.error('[razorpay-sub] DB upsert failed:', upsertErr)
    return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId:          process.env.RAZORPAY_KEY_ID,
  })
}
