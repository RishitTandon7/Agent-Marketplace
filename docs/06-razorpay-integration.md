# Step 6: Razorpay Subscription Integration (Premium Agents)

**Goal by the end of this step:** A user can click "Subscribe" on a premium agent, complete payment via Razorpay Checkout, and have your database correctly reflect their active subscription via webhook.

---

## 6.1 Create a Razorpay account & get API keys

1. Sign up at https://dashboard.razorpay.com (use Test Mode first).
2. Go to **Settings → API Keys → Generate Test Keys**.
3. Copy the **Key ID** and **Key Secret**.

Add to `.env.local`:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
RAZORPAY_WEBHOOK_SECRET=a_secret_you_choose_and_also_paste_into_razorpay_dashboard
```

---

## 6.2 Install the Razorpay SDK

```bash
npm install razorpay
```

---

## 6.3 Create a Razorpay client helper

Create `src/lib/razorpay.ts`:

```ts
import Razorpay from 'razorpay'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})
```

---

## 6.4 Create a Razorpay Plan for each premium agent

This is a one-time setup step per agent (do it via a script or manually in the Razorpay dashboard under **Subscriptions → Plans**).

Example using the API (run once, e.g. in a Node REPL or small script):

```js
import { razorpay } from './src/lib/razorpay.js'

const plan = await razorpay.plans.create({
  period: 'monthly',
  interval: 1,
  item: {
    name: 'SMS Sender Agent — Monthly Access',
    amount: 9900, // in paise = ₹99
    currency: 'INR',
  },
})

console.log(plan.id) // save this as plan_id on the agent row
```

Store the returned `plan.id` on the agent:

```sql
alter table agents add column razorpay_plan_id text;
update agents set razorpay_plan_id = 'plan_xxxxxxxxxxxxx' where slug = 'sms-sender';
```

---

## 6.5 API route: create a subscription (checkout initiation)

Create `src/app/api/subscriptions/create/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { agentSlug } = await request.json()
  const admin = createAdminClient()

  const { data: agent } = await admin
    .from('agents')
    .select('*')
    .eq('slug', agentSlug)
    .single()

  if (!agent || !agent.is_premium || !agent.razorpay_plan_id) {
    return NextResponse.json({ error: 'Invalid premium agent' }, { status: 400 })
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: agent.razorpay_plan_id,
    customer_notify: 1,
    total_count: 12, // bill for up to 12 months; user can cancel anytime
    notes: {
      user_id: user.id,
      agent_id: agent.id,
    },
  })

  // Store a pending row — webhook will flip status to 'active' once paid
  await admin.from('subscriptions').upsert(
    {
      user_id: user.id,
      agent_id: agent.id,
      razorpay_subscription_id: subscription.id,
      status: 'created',
    },
    { onConflict: 'user_id,agent_id' }
  )

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
```

---

## 6.6 Frontend: trigger Razorpay Checkout

Create `src/components/SubscribeButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Script from 'next/script'

export function SubscribeButton({ agentSlug }: { agentSlug: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    const res = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentSlug }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      alert(data.error || 'Failed to start subscription')
      return
    }

    const options = {
      key: data.keyId,
      subscription_id: data.subscriptionId,
      name: 'AgentLab',
      description: 'Monthly Agent Subscription',
      handler: function () {
        // Payment succeeded on the client side — but we only trust
        // the server-side webhook (Step 6.7) to actually activate access.
        window.location.href = '/dashboard?subscribed=pending'
      },
      theme: { color: '#000000' },
    }

    // @ts-expect-error Razorpay is loaded globally via the script tag
    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Subscribe to Unlock'}
      </button>
    </>
  )
}
```

Use it in the agent detail page in place of the placeholder premium button:

```tsx
import { SubscribeButton } from '@/components/SubscribeButton'
// ...
{agent.is_premium && <SubscribeButton agentSlug={agent.slug} />}
```

---

## 6.7 Webhook handler (the source of truth)

**Never trust the frontend `handler` callback alone** — always confirm via Razorpay's webhook, which is signed and server-to-server.

1. In Razorpay Dashboard → **Settings → Webhooks**, add an endpoint:
   ```
   https://yourdomain.com/api/webhooks/razorpay
   ```
2. Subscribe to events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`.
3. Set a webhook secret (paste the same value into `RAZORPAY_WEBHOOK_SECRET`).

Create `src/app/api/webhooks/razorpay/route.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const admin = createAdminClient()

  const subscriptionEntity = event.payload?.subscription?.entity
  if (!subscriptionEntity) {
    return NextResponse.json({ received: true })
  }

  const razorpaySubId = subscriptionEntity.id
  const currentPeriodEnd = subscriptionEntity.current_end
    ? new Date(subscriptionEntity.current_end * 1000).toISOString()
    : null

  let status: string | null = null
  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      status = 'active'
      break
    case 'subscription.cancelled':
    case 'subscription.completed':
      status = 'cancelled'
      break
    default:
      break
  }

  if (status) {
    await admin
      .from('subscriptions')
      .update({ status, current_period_end: currentPeriodEnd })
      .eq('razorpay_subscription_id', razorpaySubId)
  }

  return NextResponse.json({ received: true })
}
```

> **Important:** this route must read the **raw body** (not pre-parsed JSON) to correctly verify the HMAC signature. In Next.js App Router, `request.text()` gives you the raw string, which is what's used above — do not use `request.json()` here.

---

## 6.8 Test the flow (Test Mode)

1. Use Razorpay's test card numbers (found in their docs) to simulate a successful payment.
2. Complete checkout → confirm the webhook fires (check Razorpay Dashboard → Webhooks → logs, or your server logs).
3. Confirm `subscriptions.status` flips to `'active'` in Supabase.
4. Use the Razorpay dashboard's "test webhook" resend feature to make sure your signature verification is correct without needing a fresh payment each time.

---

## Checklist before moving to Step 7
- [ ] Razorpay Plan created for at least one premium agent
- [ ] "Subscribe" button opens Razorpay Checkout with correct amount
- [ ] Webhook endpoint verifies signature correctly (test with an intentionally wrong secret to confirm it rejects)
- [ ] Successful test payment flips `subscriptions.status` to `active` in Supabase
- [ ] Cancelling a test subscription flips status to `cancelled`
