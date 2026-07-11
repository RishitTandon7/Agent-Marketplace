# AgentLab — Full Build Plan

A DevOps-focused marketplace where users log in with Google, browse free & premium AI/utility agents, and pay via Razorpay for monthly access to premium agents. Each agent runs in its own isolated Docker container.

---

## 1. High-Level Architecture

```
                        ┌─────────────────────┐
                        │   Next.js Frontend   │
                        │ (Browse, Dashboard,  │
                        │  Playground, Billing)│
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  Next.js API Routes   │
                        │  (BFF / Gateway layer)│
                        └──────────┬───────────┘
                                   │
        ┌──────────────┬──────────┼───────────┬──────────────┐
        │              │          │           │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌──▼───┐ ┌─────▼─────┐ ┌──────▼──────┐
│ Supabase Auth │ │ Supabase  │ │Razor-│ │  Container │ │  Usage /    │
│ (Google OAuth)│ │ Postgres  │ │ pay  │ │ Orchestrator│ │  Logs table │
└───────────────┘ └───────────┘ └──────┘ └──────┬──────┘ └─────────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                       ┌──────▼─────┐      ┌──────▼─────┐      ┌──────▼─────┐
                       │ Agent #1   │      │ Agent #2   │      │ Agent #N   │
                       │ (Docker)   │      │ (Docker)   │      │ (Docker)   │
                       └────────────┘      └────────────┘      └────────────┘
```

**Request flow (a user calling a premium agent):**
1. User logs in via Google OAuth (Supabase Auth issues a JWT session).
2. Frontend calls `/api/agents/[agentId]/run` with the JWT.
3. API route verifies the JWT, checks Supabase `subscriptions` table for active access to that agent.
4. If allowed → request forwarded to the container orchestrator, which routes it to the right agent container.
5. Agent container processes the request, returns result.
6. API route logs usage (for rate limits / analytics) and returns response to the frontend.

---

## 2. Tech Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Frontend + BFF | Next.js (App Router) | Full-stack in one repo, deploys anywhere, easy free hosting |
| Auth | Supabase Auth (Google OAuth 2.0) | No custom auth code, secure, fast to set up |
| Database | Supabase (Postgres) | Free tier, built-in RLS (row-level security), realtime if needed |
| Payments | Razorpay Subscriptions API | Recurring monthly billing for premium agents |
| Agent runtime | Docker (one container per agent) | Isolation, portability, independent scaling |
| Orchestration (Phase 1) | Docker Compose | Simple, good enough for a handful of agents on one host |
| Orchestration (Phase 2) | Kubernetes (k3s recommended for small scale) | Real scaling, self-healing, later production growth |
| Hosting (Phase 1) | Free tiers (Render / Railway / Fly.io / Oracle Free Tier) | Zero cost to validate the idea |
| Hosting (Phase 2) | AWS (or admin-configurable target) | Production-grade once revenue justifies it |
| Hosting (Phase 3, optional) | Self-hosted node (your gaming laptop via Cloudflare Tunnel) | Free compute for non-critical/background agents |

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Users are managed by Supabase Auth automatically (auth.users table).
-- We extend with a public profile table.

create table profiles (
  id uuid references auth.users(id) primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category text,               -- 'ai' | 'utility'
  is_premium boolean default false,
  price_inr integer default 0, -- monthly price in paise, e.g. 9900 = ₹99
  docker_image text,           -- e.g. registry/agent-summarizer:latest
  input_schema jsonb,          -- expected request shape, for playground form
  output_schema jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  agent_id uuid references agents(id),
  razorpay_subscription_id text,
  status text,                 -- 'active' | 'past_due' | 'cancelled'
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  agent_id uuid references agents(id),
  request_payload jsonb,
  response_status text,
  duration_ms integer,
  created_at timestamptz default now()
);
```

**Row-Level Security (RLS):** enable RLS on `subscriptions` and `usage_logs` so users can only read their own rows. `agents` table stays publicly readable (for browsing).

---

## 4. Auth Flow (Google OAuth via Supabase)

1. Enable Google provider in Supabase dashboard → Authentication → Providers.
2. Create OAuth credentials in Google Cloud Console (Client ID + Secret), set redirect URI to your Supabase project's callback URL.
3. Frontend: use `supabase.auth.signInWithOAuth({ provider: 'google' })`.
4. On successful login, Supabase creates a row in `auth.users`; you insert/upsert a matching row in `profiles` (via a Postgres trigger or on first login in your app).
5. Every API route validates the Supabase JWT (from cookies/headers) before doing anything.

---

## 5. Agent Container Model

Each agent is a **self-contained Docker image** exposing a small HTTP API, e.g.:

```
POST /run
Body: { "input": { ... } }
Response: { "output": { ... } }
```

**Example Dockerfile pattern (per agent):**
```dockerfile
FROM node:20-slim   # or python:3.12-slim for python agents
WORKDIR /app
COPY . .
RUN npm install       # or pip install -r requirements.txt
EXPOSE 8080
CMD ["node", "server.js"]
```

Keeping every agent behind the same `POST /run` contract means your orchestrator/gateway code never needs agent-specific logic — it just forwards requests and returns responses.

### Orchestration — Phase 1: Docker Compose
```yaml
version: "3.9"
services:
  agent-summarizer:
    image: yourrepo/agent-summarizer:latest
    ports: ["8081:8080"]
    restart: unless-stopped

  agent-sms-sender:
    image: yourrepo/agent-sms-sender:latest
    ports: ["8082:8080"]
    restart: unless-stopped
    env_file: ./secrets/sms.env
```
Your Next.js backend keeps a small internal routing table (agent slug → container URL/port) in the `agents` table (add a `runtime_url` column) so it knows where to forward each request.

### Orchestration — Phase 2: Kubernetes (later)
- Each agent becomes a `Deployment` + `Service`.
- Use an `Ingress` or internal gateway to route `/agents/<slug>/run` to the right service.
- Add `HorizontalPodAutoscaler` per agent so popular agents scale independently.
- k3s is a lightweight k8s distro good for small teams/solo devs — cheaper to run than full EKS.

---

## 6. Razorpay Integration (Premium Agents Only)

**Model:** Free agents are always callable. Premium agents require an active Razorpay subscription tied to that specific agent (or a bundle plan later).

**Flow:**
1. Create a Razorpay Plan for each premium agent (monthly billing amount = `agents.price_inr`).
2. User clicks "Subscribe" on a premium agent → backend creates a Razorpay Subscription via API, returns a checkout link/session.
3. User completes payment on Razorpay's hosted checkout.
4. Razorpay sends a **webhook** (`subscription.activated`, `subscription.charged`, `subscription.cancelled`) to your backend endpoint (`/api/webhooks/razorpay`).
5. Webhook handler updates the `subscriptions` table (`status`, `current_period_end`).
6. Before running a premium agent, your API checks: does this user have a row in `subscriptions` with `status = 'active'` and `current_period_end > now()` for this agent?

**Security notes:**
- Verify Razorpay webhook signatures (`X-Razorpay-Signature` header) before trusting any webhook payload.
- Never trust the frontend to say "payment succeeded" — always confirm via webhook or server-side verification call to Razorpay.

---

## 7. Deployment Strategy (Cost-Conscious, Portable)

Since you want to start free and move later, **containerize everything from day one** and keep all environment-specific values (URLs, secrets, ports) in `.env` files / environment variables — never hardcoded.

| Phase | What | Where |
|---|---|---|
| Phase 1 (now) | Next.js app + agent containers | Free tiers: Render/Railway (backend+containers), Vercel (frontend), Supabase (DB/Auth) |
| Phase 2 | Same containers, more scale | AWS (ECS/EKS) or your own VPS — controlled by an admin-configurable `DEPLOY_TARGET` env variable |
| Phase 3 (optional) | Background/free agents | Your gaming laptop as a worker node via Cloudflare Tunnel (exposes local containers securely to the internet without opening router ports) |

**"Admin switch" idea:** store a `deployment_config` table or `.env` value like `AGENT_RUNTIME_MODE = cloud | local | hybrid`, and have your orchestrator read from it to decide where to route agent traffic. This lets you flip between free-tier cloud and your laptop without code changes.

---

## 8. CI/CD Pipeline (the "DevOps" part to showcase)

Use **GitHub Actions**:
1. **On push to `main`:**
   - Run lint/tests for the Next.js app.
   - Build Docker images for any changed agent folders.
   - Push images to a registry (Docker Hub or GitHub Container Registry — both free).
2. **Deploy step:**
   - Trigger redeploy on Render/Railway via their deploy hook, or `docker compose pull && docker compose up -d` on your target host via SSH action.
3. **Later (Kubernetes phase):** replace the deploy step with `kubectl apply -f k8s/` or a Helm chart release.

This gives you a genuine CI/CD story: code push → build → containerize → deploy, which is exactly what makes this a "DevOps project" rather than just a web app.

---

## 9. Suggested Build Order (Milestones)

1. **Foundation:** Next.js app scaffold + Supabase project + Google OAuth login working end-to-end.
2. **Data layer:** Create tables (`profiles`, `agents`, `subscriptions`, `usage_logs`) with RLS policies.
3. **Agent catalog UI:** Browse page pulling from `agents` table (static/free agents first).
4. **First real agent:** Build one simple agent (e.g., a text summarizer using an LLM API) as a Docker container, run it locally via Docker Compose, wire up the `/run` gateway route.
5. **Free agent end-to-end:** User logs in → picks free agent → calls it → sees result + usage logged.
6. **Razorpay integration:** Add one premium agent, wire up subscription creation + webhook handling.
7. **Premium gating:** Enforce subscription check before running premium agents.
8. **Deploy to free tier:** Push everything live (Vercel + Render/Railway + Supabase).
9. **CI/CD:** Add GitHub Actions for automated build/deploy.
10. **Scale-up path (later):** Add more agents, move to AWS/Kubernetes/self-hosted node as needed.

---

## 10. Open Decisions to Revisit Later
- Whether to eventually let other developers submit agents (true marketplace vs. curated).
- Per-agent pricing vs. bundled plans as the catalog grows.
- Rate-limiting/quota strategy per subscription tier (e.g., 100 calls/month).
- Whether the in-browser playground becomes a first-class feature (recommended — great for demoing agents before purchase).
