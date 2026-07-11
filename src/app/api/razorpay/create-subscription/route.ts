import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  // 1. Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  const { agentSlug } = await req.json()
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
    console.log('[razorpay-sub] Profile missing, creating self-healing profile row for user:', user.id)
    await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url
    })
  }

  // 5. Create Razorpay subscription
  const subscription = await razorpay.subscriptions.create({
    plan_id:        agent.razorpay_plan_id,
    total_count:    12,         // 12 billing cycles
    quantity:       1,
    customer_notify: 1,
    notes: {
      user_id:  user.id,
      agent_id: agent.id,
    },
  })

  // 6. Upsert subscription row as 'created'
  await admin.from('subscriptions').upsert({
    user_id:                 user.id,
    agent_id:                agent.id,
    razorpay_subscription_id: subscription.id,
    status:                  'created',
  }, { onConflict: 'user_id,agent_id' })

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
