# Contributing

1. Fork and clone, then `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the values you need.
3. `npm run dev`, then before opening a PR run `npm run typecheck` and `npm run lint`.
4. Keep commits small and describe what changed and why.

To add an agent: insert a row in `agents` (see `docs/seed-agents.sql`) and add a handler at
`src/app/api/agents/<slug>/internal/route.ts` that accepts the input schema and returns JSON.
