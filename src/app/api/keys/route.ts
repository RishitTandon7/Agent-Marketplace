import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(32).toString('base64url')
  const raw    = `ahub_lv_${random}`          // e.g. ahub_lv_abc123...
  const prefix = raw.slice(0, 16) + '...'     // shown in dashboard
  const hash   = hashKey(raw)
  return { raw, prefix, hash }
}

/* ── GET /api/keys — list user's keys ─────────────────── */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  // Verify session token
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, is_active, last_used_at, request_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

/* ── POST /api/keys — create new key ──────────────────── */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Max 10 keys per user
  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Maximum 10 active API keys allowed. Please revoke an existing key first.' },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const name = ((body?.name as string) ?? 'My API Key').slice(0, 64)

  const { raw, prefix, hash } = generateApiKey()

  const { error: insertErr } = await supabase.from('api_keys').insert({
    user_id:    user.id,
    name,
    key_prefix: prefix,
    key_hash:   hash,
  })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Return raw key ONCE — never stored
  return NextResponse.json({
    key:     raw,
    prefix,
    name,
    message: '⚠️ Save this key now — it will never be shown again.',
  }, { status: 201 })
}

/* ── DELETE /api/keys — revoke a key ──────────────────── */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Key ID required' }, { status: 400 })

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)  // safety — can only revoke own keys

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ revoked: true })
}
