# Step 7: Enforce Premium Gating on Agent Calls

**Goal by the end of this step:** The gateway route from Step 5 correctly checks for an active subscription before forwarding requests to premium agents — replacing the temporary hard block.

---

## 7.1 Subscription check helper

Create `src/lib/subscriptions.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function hasActiveSubscription(
  userId: string,
  agentId: string
): Promise<boolean> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single()

  if (error || !data) return false

  const isActive = data.status === 'active'
  const notExpired =
    !data.current_period_end || new Date(data.current_period_end) > new Date()

  return isActive && notExpired
}
```

---

## 7.2 Update the gateway route

Update `src/app/api/agents/[slug]/run/route.ts` from Step 5 — replace the temporary hard block:

```ts
// BEFORE (Step 5 placeholder):
// if (agent.is_premium) {
//   return NextResponse.json(
//     { error: 'This agent requires an active subscription' },
//     { status: 403 }
//   )
// }

// AFTER:
import { hasActiveSubscription } from '@/lib/subscriptions'

if (agent.is_premium) {
  const allowed = await hasActiveSubscription(user.id, agent.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'This agent requires an active subscription', code: 'SUBSCRIPTION_REQUIRED' },
      { status: 403 }
    )
  }
}
```

---

## 7.3 Frontend: handle the `SUBSCRIPTION_REQUIRED` response

In `AgentPlayground.tsx` (Step 5), handle this specific error code to prompt the user to subscribe instead of showing a generic error:

```tsx
if (!res.ok) {
  if (data.code === 'SUBSCRIPTION_REQUIRED') {
    setError('This agent requires an active subscription. Please subscribe to continue.')
  } else {
    setError(data.error || 'Something went wrong')
  }
}
```

You can also conditionally render the `<SubscribeButton />` inline next to this error message instead of directing them elsewhere.

---

## 7.4 Show subscription status on the agent detail page

Update `src/app/agents/[slug]/page.tsx` to check subscription status server-side and show the right UI (Subscribe button vs. Playground):

```tsx
import { createClient } from '@/lib/supabase/server'
import { hasActiveSubscription } from '@/lib/subscriptions'
import { AgentPlayground } from '@/components/AgentPlayground'
import { SubscribeButton } from '@/components/SubscribeButton'

// inside the page component, after fetching `agent`:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

let unlocked = !agent.is_premium
if (user && agent.is_premium) {
  unlocked = await hasActiveSubscription(user.id, agent.id)
}

// then render:
{unlocked ? (
  <AgentPlayground slug={agent.slug} />
) : (
  <SubscribeButton agentSlug={agent.slug} />
)}
```

---

## 7.5 Handle expired subscriptions gracefully

Since `current_period_end` is checked on every request, an expired subscription automatically blocks access without needing a cron job — but it's good practice to also add a periodic check (e.g., a daily cron via GitHub Actions or Supabase Edge Function) that flips clearly expired rows to `status = 'past_due'` for cleaner reporting/analytics, even though the real-time check already protects access.

Example SQL you could run on a schedule:

```sql
update subscriptions
set status = 'past_due'
where status = 'active'
  and current_period_end < now();
```

---

## 7.6 Test the gating

1. As a user with **no subscription**, try calling a premium agent → expect `403 SUBSCRIPTION_REQUIRED`.
2. Complete a test Razorpay payment (Step 6) → confirm the same call now succeeds.
3. Manually set `current_period_end` to a past date in Supabase for your test subscription → confirm the call is blocked again.
4. Confirm free agents are unaffected by any of this and always work regardless of login... (well, they still require login per Step 5 — but never require a subscription).

---

## Checklist before moving to Step 8
- [ ] Premium agents correctly blocked without an active subscription
- [ ] Premium agents correctly unlocked after a successful test payment
- [ ] Expired subscriptions correctly re-block access
- [ ] Frontend shows a clear "Subscribe to unlock" prompt instead of a raw error
