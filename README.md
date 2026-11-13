<div align="center">

# AgentLab

### A marketplace of AI & utility agents you can try in the browser, subscribe to, and call from any app through one REST API.

**[Live demo → agentlab.rishit.site](https://agentlab.rishit.site)**

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Razorpay

</div>

---

## What is AgentLab?

AgentLab is a full-stack SaaS marketplace. Users browse a catalog of ready-made agents, claim the free ones with one click, subscribe to premium ones with Razorpay, test everything in a built-in **playground**, and then ship it to production with a personal **API key** and a copy-paste code snippet in cURL, JavaScript, Python or Go.

## Features

- **Agent catalog** with search, category filters and free/premium badges
- **Google sign-in** and email login through Supabase Auth
- **One-click "Claim Agent"** for free agents, with an animated provisioning terminal
- **Premium subscriptions** through Razorpay (₹ monthly plans), unlocked the moment payment is verified
- **Playground** to run any agent from the browser and see the JSON response
- **Developer API** (`POST /api/v1/agents/:slug/run`) with per-agent API keys, usage logging and premium gating
- **Auto-generated API reference** per agent: endpoint, input and output schema, and code samples in 4 languages
- **Dashboard** for your agents, API keys and usage history
- **Smart LLM router** that works with no paid keys: local Ollama first, then a Gemini key and model pool, then OpenAI, then Anthropic, then a rule-based fallback so demos never break
- **Neo-brutalist UI**: animated boot loader, hard shadows, responsive from phone to desktop

## The agents

| Agent | Type | Plan | What it does |
|---|---|---|---|
| Text Summarizer | AI | Free | Summary and key points from any text |
| Code Explainer | AI | Free | Plain-English explanation of a code snippet |
| Sentiment Analyzer | AI | Free | Sentiment, score, emotions and key phrases |
| Keyword Extractor | AI | Free | Keywords, tags and topics |
| JSON Formatter | Utility | Free | Format, minify or validate JSON |
| Password Generator | Utility | Free | Secure passwords with entropy analysis |
| Email Drafter | AI | ₹499/mo | Professional emails with subject alternatives |
| Grammar Checker | AI | ₹299/mo | Corrections with explanations and a quality score |
| SMS Sender | Utility | ₹199/mo | Send SMS through Twilio (demo mode without keys) |

## Architecture

```
Browser ──▶ Next.js App Router (pages + API routes)
              │
              ├─ /api/agents/[slug]/run      session auth ─▶ gating ─▶ agent ─▶ usage log
              ├─ /api/v1/agents/[slug]/run   API-key auth ─▶ gating ─▶ agent ─▶ usage log
              ├─ /api/agents/<slug>/internal each agent's handler (LLM router or pure code)
              ├─ /api/razorpay/*             create subscription, verify payment
              └─ /api/keys                   create and revoke API keys (SHA-256 hashed)
              │
              ├─ Supabase  Postgres + Auth + Row Level Security
              └─ Razorpay  subscriptions and checkout
```

Premium access is granted when Razorpay's payment signature (HMAC-SHA256 with your key secret) is verified server-side, and the agent endpoints check for an active, unexpired subscription on every call.

## Getting started

### 1. Install

```bash
git clone https://github.com/RishitTandon7/Agent-Marketplace.git
cd Agent-Marketplace
npm install
```

### 2. Configure environment

Create `.env.local` (it is git-ignored):

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay (required for premium agents)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=        # optional, only if you add the webhook

# LLM providers (all optional; comma-separate several keys to rotate)
GEMINI_API_KEYS=
OPENAI_API_KEYS=
ANTHROPIC_API_KEYS=
# OLLAMA_URL=http://localhost:11434

# Twilio (optional; SMS Sender runs in demo mode without it)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Set up the database

In the Supabase SQL editor run, in order: the schema from [`docs/02-database-schema.md`](docs/02-database-schema.md), then [`docs/api-keys-schema.sql`](docs/api-keys-schema.sql), then [`docs/seed-agents.sql`](docs/seed-agents.sql).

For each premium agent, create a monthly plan in Razorpay and store its ID in `agents.razorpay_plan_id`.

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Using the API

```bash
curl -X POST https://agentlab.rishit.site/api/v1/agents/text-summarizer/run \
  -H "Authorization: Bearer ahub_lv_<your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is a subset of AI that enables computers to learn from data."}'
```

```json
{
  "success": true,
  "agent": "text-summarizer",
  "duration_ms": 1840,
  "output": {
    "summary": "Machine learning lets computers learn from data.",
    "key_points": ["ML is a subset of AI", "Computers learn from data"],
    "provider": "ollama"
  }
}
```

Create keys from the dashboard. Each key is scoped to one agent (or global) and only its SHA-256 hash is stored. `GET /api/v1/agents/:slug/run` returns the agent's schema.

## Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, custom neo-brutalist design system |
| Database and auth | Supabase (Postgres, Auth, RLS) |
| Payments | Razorpay Subscriptions |
| AI | Ollama, Google Gemini, OpenAI, Anthropic through one router (`src/lib/llm.ts`) |
| Hosting | Vercel, with Vercel Analytics |

## Project structure

```
src/
├── app/
│   ├── agents/           catalog, agent detail, playground
│   ├── dashboard/        user dashboard
│   ├── api/
│   │   ├── agents/       run route and per-agent internal handlers
│   │   ├── v1/           public developer API
│   │   ├── razorpay/     subscription and payment verification
│   │   └── keys/         API key management
│   └── login/
├── components/           catalog, playground, dashboard, deployment UI
└── lib/                  LLM router, Supabase and Razorpay clients
docs/                     build plan, schema, seed data, deployment guides
```

## Roadmap

- Razorpay webhook for automatic renewals and cancellations
- Per-key rate limiting (Upstash Redis)
- Dockerised agent runtimes (`runtime_url`) for heavy agents
- More agents: translator, PDF summarizer, image captioner

## Author

Built by **[Rishit Tandon](https://github.com/RishitTandon7)**.

---

<div align="center">If you like the project, a ⭐ on the repo means a lot.</div>
