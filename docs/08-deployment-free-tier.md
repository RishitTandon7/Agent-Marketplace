# Step 8: Deploy to Free-Tier Hosting

**Goal by the end of this step:** The full app — frontend, gateway API, and agent containers — live on the internet, entirely on free tiers.

---

## 8.1 Split responsibilities across free tiers

| Component | Where | Why |
|---|---|---|
| Next.js frontend + API routes | **Vercel** (free Hobby tier) | Best-in-class Next.js support, auto SSL, generous free tier |
| Agent containers | **Render** or **Railway** (free tier) | Both support deploying arbitrary Dockerfiles, unlike Vercel which doesn't run long-lived containers |
| Database + Auth | **Supabase** (free tier) | Already set up in Step 1 |
| Payments | **Razorpay** | No hosting needed — it's an API/hosted checkout |

> Vercel's serverless functions can't host long-running Docker containers — that's why agent containers need a separate host like Render/Railway, which do support Dockerfile-based deploys on their free tiers.

---

## 8.2 Deploy agent containers to Render (example)

1. Push your `agents/` folder structure to a GitHub repo (can be the same repo as your Next.js app, or a separate one — separate is cleaner for independent deploys).
2. In Render dashboard → **New → Web Service**.
3. Connect your GitHub repo, set:
   - **Root Directory:** `agents/text-summarizer`
   - **Environment:** Docker
   - Render auto-detects the `Dockerfile`.
4. Add environment variables (`ANTHROPIC_API_KEY`, etc.) under **Environment**.
5. Deploy. Render gives you a public URL like `https://agent-text-summarizer.onrender.com`.
6. Repeat for each agent (each is its own Render "Web Service").

> Free tier note: Render's free web services spin down after inactivity and take a few seconds to "wake up" on the next request — fine for a demo/MVP, just be aware of the cold-start delay.

---

## 8.3 Update `runtime_url` for production

```sql
update agents set runtime_url = 'https://agent-text-summarizer.onrender.com' where slug = 'text-summarizer';
update agents set runtime_url = 'https://agent-sms-sender.onrender.com' where slug = 'sms-sender';
```

Since your gateway route already reads `runtime_url` dynamically from the database (Step 5), no code changes are needed — just update the data.

---

## 8.4 Deploy the Next.js app to Vercel

1. Push your Next.js app to GitHub.
2. Go to https://vercel.com → **New Project** → import the repo.
3. Vercel auto-detects Next.js — no config needed.
4. Add all environment variables from `.env.local` under **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
5. Deploy. You get a live URL like `https://agentlab.vercel.app`.

---

## 8.5 Update external callback URLs to production

1. **Google OAuth:** add your Vercel domain to authorized redirect URIs if needed (Supabase's callback URL doesn't change, but if you allow custom domains, double check).
2. **Razorpay webhook:** update the webhook URL in Razorpay Dashboard to:
   ```
   https://agentlab.vercel.app/api/webhooks/razorpay
   ```
3. **Supabase Auth → URL Configuration:** set your **Site URL** to the Vercel production URL, and add it to **Redirect URLs**.

---

## 8.6 Switch Razorpay to Live Mode (when ready to accept real payments)

1. Complete Razorpay's KYC/activation process for Live Mode.
2. Generate **Live API Keys** (separate from Test keys).
3. Update Vercel environment variables with live keys.
4. Re-create your Plans in Live Mode (plans created in Test Mode don't carry over) and update `agents.razorpay_plan_id` accordingly.
5. Update the webhook endpoint in Live Mode with the same URL and a (new) live webhook secret.

---

## 8.7 Smoke test in production

- [ ] Visit the live URL, sign in with Google
- [ ] Browse `/agents`, run a free agent successfully
- [ ] Subscribe to a premium agent using a Razorpay test card (while still in Test Mode)
- [ ] Confirm webhook updates Supabase correctly in production
- [ ] Run the premium agent successfully after subscribing

---

## 8.8 The "admin switch" for later environments

To prepare for the AWS/self-hosted move later without rewriting code, add one more column now:

```sql
alter table agents add column deployment_env text default 'free-tier';
-- values you'll use later: 'free-tier' | 'aws' | 'self-hosted'
```

For now every agent stays `'free-tier'`. In Step 10 (scaling), you'll use this column to decide routing logic without touching the gateway's core code — just update `runtime_url` and `deployment_env` per agent as you migrate each one.

---

## Checklist before moving to Step 9
- [ ] Frontend live on Vercel
- [ ] Both agent containers live on Render/Railway free tier
- [ ] `runtime_url` values updated to production URLs
- [ ] Google OAuth + Razorpay webhook URLs updated for production
- [ ] Full user journey (login → free agent → subscribe → premium agent) verified live
