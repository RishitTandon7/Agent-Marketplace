<div align="center">

<img src="src/app/icon.svg" width="84" alt="AgentLab logo" />

# AgentLab

**An AI agent marketplace. Try agents in the browser, subscribe with Razorpay, and call them from anywhere with one API key.**

[**Live demo →**](https://agentlab.rishit.site)

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232a?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-0ea5e9?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?logo=supabase&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-0c2451?logo=razorpay&logoColor=white)

</div>

---

## What it does

Browse a catalog of ready-made agents, claim the free ones in one click, and subscribe to premium ones. Every agent has a built-in **playground**, and a personal **API key** lets you run it from cURL, Postman or your own code.

## Agents

| Free | Premium |
|---|---|
| Text Summarizer | Email Drafter, ₹499/mo |
| Code Explainer | Grammar Checker, ₹299/mo |
| Sentiment Analyzer | SMS Sender, ₹199/mo |
| Keyword Extractor | |
| JSON Formatter | |
| Password Generator | |

## Highlights

- Google sign-in and a user dashboard (Supabase Auth)
- Razorpay subscriptions, unlocked as soon as payment is verified
- Public REST API with per-agent keys (stored as SHA-256 hashes) and usage logging
- Auto-generated API docs with cURL, JavaScript, Python and Go samples
- Smart LLM router: local Ollama, then Gemini, OpenAI, Anthropic, then a rule-based fallback, so demos never break

## Use the API

```bash
curl -X POST https://agentlab.rishit.site/api/v1/agents/password-generator/run \
  -H "Authorization: Bearer ahub_lv_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{"count":"3","length":"16"}'
```

```json
{ "success": true, "agent": "password-generator", "output": { "passwords": ["…"], "strength": "Strong" } }
```

Full reference in [docs/API.md](docs/API.md). Import [the Postman collection](docs/AgentLab.postman_collection.json) to try all 9 agents.

## Run locally

```bash
git clone https://github.com/RishitTandon7/Agent-Marketplace.git
cd Agent-Marketplace && npm install
cp .env.example .env.local     # add your Supabase and Razorpay keys
npm run dev                    # http://localhost:3000
```

Set up the database with [docs/02-database-schema.md](docs/02-database-schema.md), [docs/api-keys-schema.sql](docs/api-keys-schema.sql) and [docs/seed-agents.sql](docs/seed-agents.sql).

## Built with

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · Razorpay · Ollama / Gemini / OpenAI / Anthropic · Twilio · Vercel

---

<div align="center">Made by <a href="https://github.com/RishitTandon7">Rishit Tandon</a> · MIT License</div>
