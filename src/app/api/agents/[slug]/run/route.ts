import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Auth — user must be logged in
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 2. Fetch agent record
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('id, slug, name, is_premium, runtime_url, active, input_schema')
    .eq('slug', slug)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }
  if (!agent.active) {
    return NextResponse.json({ error: 'Agent is currently unavailable.' }, { status: 503 })
  }

  // 3. Premium gating — if the agent is premium, check subscription
  if (agent.is_premium) {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('agent_id', agent.id)
      .single()

    const now = new Date()
    const isActive =
      sub?.status === 'active' &&
      sub?.current_period_end &&
      new Date(sub.current_period_end) > now

    if (!isActive) {
      return NextResponse.json(
        { error: 'Subscription required. Please subscribe to use this premium agent.' },
        { status: 403 }
      )
    }
  }

  // 4. Parse user input
  let input: Record<string, unknown>
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const startTime = Date.now()

  // 5. Route to the agent runtime
  // runtime_url is the Docker container URL (e.g. http://localhost:8081)
  // For agents without a runtime_url, fall back to internal Next.js handler
  let agentResult: Record<string, unknown>
  let responseStatus = 'success'

  try {
    const runtimeUrl = agent.runtime_url
      ? `${agent.runtime_url}/run`
      : `${req.nextUrl.origin}/api/agents/${slug}/internal`

    const agentRes = await fetch(runtimeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      // 25 second timeout — most LLM calls are fast but can be slow
      signal: AbortSignal.timeout(25_000),
    })

    if (!agentRes.ok) {
      const errText = await agentRes.text()
      throw new Error(`Agent returned ${agentRes.status}: ${errText}`)
    }

    agentResult = await agentRes.json()
  } catch (err) {
    responseStatus = 'error'
    const duration = Date.now() - startTime
    // Log failed call
    await admin.from('usage_logs').insert({
      user_id: user.id,
      agent_id: agent.id,
      request_payload: input,
      response_status: 'error',
      duration_ms: duration,
    })
    const message = err instanceof Error ? err.message : 'Agent call failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const duration = Date.now() - startTime

  // 6. Log usage
  await admin.from('usage_logs').insert({
    user_id: user.id,
    agent_id: agent.id,
    request_payload: input,
    response_status: responseStatus,
    duration_ms: duration,
  })

  return NextResponse.json({ output: agentResult, duration_ms: duration })
}
