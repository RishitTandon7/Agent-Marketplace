# AgentLab — Detailed Build Guide (Index)

This is a step-by-step, fully detailed build guide for the AgentLab project. Follow the files in order — each one assumes the previous steps are done.

| # | File | What it covers |
|---|---|---|
| 1 | `01-foundation-setup.md` | Next.js app scaffold, Supabase project, Google OAuth login end-to-end |
| 2 | `02-database-schema.md` | Full SQL schema (`profiles`, `agents`, `subscriptions`, `usage_logs`) + Row-Level Security |
| 3 | `03-agent-catalog-ui.md` | Browse page + agent detail page, pulling live data from Supabase |
| 4 | `04-first-agent-container.md` | Building your first two agents (Text Summarizer, SMS Sender) as standalone Docker containers |
| 5 | `05-free-agent-integration.md` | Docker Compose + the gateway API route + usage logging + playground UI |
| 6 | `06-razorpay-integration.md` | Razorpay Plans, Subscriptions, Checkout, and the signed webhook handler |
| 7 | `07-premium-gating.md` | Enforcing subscription checks before allowing premium agent calls |
| 8 | `08-deployment-free-tier.md` | Going live on Vercel + Render/Railway + Supabase, entirely free |
| 9 | `09-cicd-pipeline.md` | GitHub Actions: lint/build checks, per-agent Docker builds, auto-redeploy |
| 10 | `10-scaling-kubernetes.md` | Later-stage migration to k3s/Kubernetes, AWS, and an optional self-hosted node |

## Suggested pace
- Steps 1–3: get the shell of the app working (auth + browsing), no real agents yet.
- Steps 4–5: your first working agent, fully wired end-to-end.
- Steps 6–7: monetization — Razorpay + gating.
- Step 8: go live for free.
- Step 9: automate deploys (this is the strongest "DevOps" story for a resume/portfolio).
- Step 10: revisit only once you have real users/traffic — not needed to launch.

## Golden rule throughout
Every agent exposes the same contract:
```
POST /run   { "input": {...} } → { "output": {...} }
GET  /health → { "status": "ok" }
```
This is what lets you add new agents, move hosting providers, and scale independently — without ever touching the gateway's core logic. Only the `agents` table (`runtime_url`, `docker_image`, `deployment_env`) changes.
