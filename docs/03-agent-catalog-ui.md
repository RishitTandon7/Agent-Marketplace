# Step 3: Agent Catalog UI (Browse Page)

**Goal by the end of this step:** A `/agents` page listing all active agents from Supabase, showing which are free vs. premium, with a link into each agent's detail page.

---

## 3.1 Types

Create `src/types/agent.ts`:

```ts
export type Agent = {
  id: string
  name: string
  slug: string
  description: string | null
  category: 'ai' | 'utility'
  is_premium: boolean
  price_inr: number
  active: boolean
}
```

---

## 3.2 Server-side data fetch helper

Create `src/lib/agents.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Agent } from '@/types/agent'

export async function getActiveAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, slug, description, category, is_premium, price_inr, active')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch agents:', error)
    return []
  }

  return data as Agent[]
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error) return null
  return data as Agent
}
```

---

## 3.3 Browse page

Create `src/app/agents/page.tsx`:

```tsx
import Link from 'next/link'
import { getActiveAgents } from '@/lib/agents'

export default async function AgentsPage() {
  const agents = await getActiveAgents()

  const freeAgents = agents.filter((a) => !a.is_premium)
  const premiumAgents = agents.filter((a) => a.is_premium)

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">AgentLab</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Free Agents</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {freeAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Premium Agents</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {premiumAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </div>
  )
}

function AgentCard({ agent }: { agent: import('@/types/agent').Agent }) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="block rounded-xl border p-4 transition hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{agent.name}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs uppercase">
          {agent.category}
        </span>
      </div>
      <p className="mb-3 text-sm text-gray-600">{agent.description}</p>
      {agent.is_premium ? (
        <span className="text-sm font-medium text-amber-600">
          ₹{(agent.price_inr / 100).toFixed(0)}/month
        </span>
      ) : (
        <span className="text-sm font-medium text-green-600">Free</span>
      )}
    </Link>
  )
}
```

---

## 3.4 Agent detail page

Create `src/app/agents/[slug]/page.tsx`:

```tsx
import { getAgentBySlug } from '@/lib/agents'
import { notFound } from 'next/navigation'

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)

  if (!agent) notFound()

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">{agent.name}</h1>
      <p className="mt-2 text-gray-600">{agent.description}</p>

      <div className="mt-6">
        {agent.is_premium ? (
          <div>
            <p className="mb-3 font-medium">
              ₹{(agent.price_inr / 100).toFixed(0)} / month
            </p>
            {/* Subscribe button wired up in Step 6 (Razorpay) */}
            <button className="rounded-lg bg-black px-5 py-2 text-white">
              Subscribe to Unlock
            </button>
          </div>
        ) : (
          // Playground form wired up in Step 5
          <button className="rounded-lg bg-green-600 px-5 py-2 text-white">
            Try it now
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## 3.5 Navigation link

Add a link to `/agents` in your main nav/header component so it's reachable from the homepage.

---

## Checklist before moving to Step 4
- [ ] `/agents` page renders free and premium agents from Supabase
- [ ] Clicking an agent card navigates to its detail page
- [ ] Detail page shows correct pricing/free label
- [ ] Page still works for a logged-out visitor (browsing doesn't require login — only *running* an agent will, later)
