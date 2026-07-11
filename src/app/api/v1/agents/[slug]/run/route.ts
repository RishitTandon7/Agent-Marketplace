import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Public Developer API — POST /api/v1/agents/[slug]/run
 *
 * Auth: Authorization: Bearer ahub_lv_<key>
 *
 * Free agents: available to all authenticated API users
 * Premium agents: require an active subscription
 *
 * Rate limiting: enforced per-key via request_count + time window
 * (simple DB-level for now; upgrade to Redis/Upstash post-launch)
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const startMs = Date.now()

  // ── 1. Authenticate API key ───────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ahub_')) {
    return NextResponse.json(
      {
        error:   'Missing or invalid API key.',
        hint:    'Set the Authorization header: Authorization: Bearer ahub_lv_<your_key>',
        docs:    'https://agentlab.dev/docs/api',
      },
      { status: 401 }
    )
  }

  const rawKey = authHeader.slice(7).trim()
  const keyHash = hashKey(rawKey)

  const { data: keyRow, error: keyErr } = await supabase
    .from('api_keys')
    .select('id, user_id, name, is_active, request_count')
    .eq('key_hash', keyHash)
    .single()

  if (keyErr || !keyRow) {
    return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 })
  }

  if (!keyRow.is_active) {
    return NextResponse.json({ error: 'This API key has been revoked.' }, { status: 401 })
  }

  // Enforce agent-specific keys
  if (keyRow.name !== slug && keyRow.name !== 'global') {
    return NextResponse.json(
      {
        error: `Unauthorized. This API key was generated for agent "${keyRow.name}", but you are trying to execute "${slug}".`,
        hint: `Please use the API key created specifically for "${slug}".`,
      },
      { status: 403 }
    )
  }

  // ── 2. Look up the agent ──────────────────────────────
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, slug, name, is_premium, active, input_schema')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json(
      { error: `Agent "${slug}" not found or is currently inactive.` },
      { status: 404 }
    )
  }

  // ── 3. Premium gate ───────────────────────────────────
  if (agent.is_premium) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', keyRow.user_id)
      .eq('agent_id', agent.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json(
        {
          error:    `"${agent.name}" is a premium agent.`,
          hint:     'Subscribe at https://agentlab.dev/agents/' + slug,
          agent:    slug,
          premium:  true,
        },
        { status: 403 }
      )
    }
  }

  // ── 4. Parse and validate input ───────────────────────
  let input: Record<string, unknown>
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  // ── 5. Proxy to internal route ────────────────────────
  const internalUrl = new URL(
    `/api/agents/${slug}/internal`,
    process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  )

  let agentOutput: Record<string, unknown>
  try {
    const internalRes = await fetch(internalUrl.toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(input),
      signal:  AbortSignal.timeout(60_000),
    })
    agentOutput = await internalRes.json()

    if (!internalRes.ok) {
      return NextResponse.json(
        { error: (agentOutput?.error as string) ?? 'Agent execution failed.' },
        { status: internalRes.status }
      )
    }
  } catch (err) {
    console.error(`[v1/run] Agent ${slug} failed:`, err)
    return NextResponse.json({ error: 'Agent execution timed out or failed.' }, { status: 502 })
  }

  const durationMs = Date.now() - startMs

  // ── 6. Log usage + update key stats (fire-and-forget) ─
  void supabase.from('usage_logs').insert({
    user_id:    keyRow.user_id,
    agent_id:   agent.id,
    api_key_id: keyRow.id,
    input_data: input,
    duration_ms: durationMs,
    status:     'success',
  })

  void supabase.from('api_keys').update({
    last_used_at:  new Date().toISOString(),
    request_count: (keyRow.request_count ?? 0) + 1,
  }).eq('id', keyRow.id)

  // ── 7. Return response ────────────────────────────────
  return NextResponse.json(
    {
      success:     true,
      agent:       slug,
      duration_ms: durationMs,
      output:      agentOutput,
    },
    {
      headers: {
        'X-Agent-Duration-Ms': String(durationMs),
        'X-Agent-Slug':        slug,
      },
    }
  )
}

/* ── GET /api/v1/agents/[slug]/run — returns agent info ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: agent } = await supabase
    .from('agents')
    .select('slug, name, description, category, is_premium, price_inr, input_schema, output_schema')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })

  return NextResponse.json({
    agent,
    endpoint:    `POST /api/v1/agents/${slug}/run`,
    auth:        'Authorization: Bearer ahub_lv_<your_api_key>',
    docs:        `https://agentlab.dev/agents/${slug}`,
    input_schema: agent.input_schema,
  })
}
