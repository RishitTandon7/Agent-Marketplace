# Step 5: Wire Up a Free Agent End-to-End (Docker Compose + Gateway Route)

**Goal by the end of this step:** A logged-in user can open the Text Summarizer agent page, submit text, and see a real summary — with the call logged to `usage_logs`.

---

## 5.1 Docker Compose file

Create `docker-compose.yml` at the project root:

```yaml
version: "3.9"
services:
  agent-text-summarizer:
    build: ./agents/text-summarizer
    ports:
      - "8081:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: unless-stopped

  agent-sms-sender:
    build: ./agents/sms-sender
    ports:
      - "8082:8080"
    environment:
      - SMS_API_KEY=${SMS_API_KEY}
    restart: unless-stopped
```

Create a root `.env` (used by Compose, separate from Next.js's `.env.local`):

```bash
ANTHROPIC_API_KEY=your_key_here
SMS_API_KEY=your_key_here
```

Start everything:

```bash
docker compose up --build
```

Both agents are now reachable at `localhost:8081` and `localhost:8082`.

---

## 5.2 Update the `agents` table with runtime URLs

```sql
update agents set runtime_url = 'http://localhost:8081' where slug = 'text-summarizer';
update agents set runtime_url = 'http://localhost:8082' where slug = 'sms-sender';
```

> In production, `runtime_url` will point to your hosting platform's internal service address (e.g. `http://agent-text-summarizer.internal:8080` on Railway, or a Kubernetes service DNS name later).

---

## 5.3 Gateway API route

Create `src/app/api/agents/[slug]/run/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient() // service_role client, server-only
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Premium gating happens here in Step 7 — for now, free agents only.
  if (agent.is_premium) {
    return NextResponse.json(
      { error: 'This agent requires an active subscription' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const startedAt = Date.now()

  let agentResponse: Response
  try {
    agentResponse = await fetch(`${agent.runtime_url}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000), // 15s timeout guard
    })
  } catch (err) {
    await logUsage(admin, user.id, agent.id, body, 'agent_unreachable', Date.now() - startedAt)
    return NextResponse.json({ error: 'Agent is currently unavailable' }, { status: 502 })
  }

  const result = await agentResponse.json()
  const durationMs = Date.now() - startedAt

  await logUsage(
    admin,
    user.id,
    agent.id,
    body,
    agentResponse.ok ? 'success' : 'agent_error',
    durationMs
  )

  return NextResponse.json(result, { status: agentResponse.status })
}

async function logUsage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  agentId: string,
  payload: unknown,
  status: string,
  durationMs: number
) {
  await admin.from('usage_logs').insert({
    user_id: userId,
    agent_id: agentId,
    request_payload: payload,
    response_status: status,
    duration_ms: durationMs,
  })
}
```

---

## 5.4 Service-role (admin) Supabase client

Create `src/lib/supabase/admin.ts` — **only ever imported in server-side code** (API routes), never in Client Components:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

---

## 5.5 Playground form on the agent detail page

Update `src/app/agents/[slug]/page.tsx` to include a small client-side form component for free agents:

Create `src/components/AgentPlayground.tsx`:

```tsx
'use client'

import { useState } from 'react'

export function AgentPlayground({ slug }: { slug: string }) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setLoading(true)
    setError(null)
    setOutput(null)

    try {
      const res = await fetch(`/api/agents/${slug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text: input } }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setOutput(JSON.stringify(data.output, null, 2))
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <textarea
        className="w-full rounded-lg border p-3"
        rows={5}
        placeholder="Paste text to summarize..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={handleRun}
        disabled={loading || !input.trim()}
        className="rounded-lg bg-green-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Run Agent'}
      </button>

      {error && <p className="text-red-600">{error}</p>}
      {output && (
        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
          {output}
        </pre>
      )}
    </div>
  )
}
```

Use it in the detail page (replace the free-agent button):

```tsx
import { AgentPlayground } from '@/components/AgentPlayground'
// ...
{!agent.is_premium && <AgentPlayground slug={agent.slug} />}
```

---

## 5.6 Test the full flow

1. `docker compose up --build` (agents running)
2. `npm run dev` (Next.js app running)
3. Log in via Google → go to `/agents/text-summarizer`
4. Paste text → click "Run Agent" → see the summary appear
5. Check Supabase → `usage_logs` table → confirm a new row was inserted with `response_status = 'success'`

---

## Checklist before moving to Step 6
- [ ] Gateway route authenticates the user before forwarding any request
- [ ] Gateway route correctly blocks premium agents (temporary hard block until Step 7's real check)
- [ ] Free agent call works end-to-end from the UI
- [ ] `usage_logs` row created for each call, with accurate duration
- [ ] Agent-unreachable case handled gracefully (try stopping the container and confirm you get a clean 502, not a crash)
