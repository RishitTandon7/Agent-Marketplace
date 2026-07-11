import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse request
  const body = await req.json().catch(() => ({}))
  const { slug } = body
  if (!slug) return NextResponse.json({ error: 'Agent slug required' }, { status: 400 })

  // 3. Get the agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('id, name, is_premium')
    .eq('slug', slug)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // 4. Verify it's a free agent
  if (agent.is_premium) {
    return NextResponse.json({ error: 'This is a premium agent. Please purchase a subscription.' }, { status: 400 })
  }

  // 4.5 Self-healing: Ensure a profile row exists for this user in public.profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    console.log('[deploy-free] Profile missing, creating self-healing profile row for user:', user.id)
    await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url
    })
  }

  // 5. Create/upsert subscription row
  const freeSubId = `free_${agent.id.slice(0, 8)}_${user.id.slice(0, 8)}`

  const { error: subErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id:                 user.id,
    agent_id:                agent.id,
    razorpay_subscription_id: freeSubId,
    status:                  'active',
    current_period_end:      null,
  }, { onConflict: 'user_id,agent_id' })

  if (subErr) {
    console.error('[deploy-free] DB error:', subErr)
    return NextResponse.json({ error: subErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Agent deployed successfully' })
}
