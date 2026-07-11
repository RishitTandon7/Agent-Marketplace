# Step 9: CI/CD Pipeline (GitHub Actions)

**Goal by the end of this step:** Every push to `main` automatically lints/tests the app, builds Docker images for any changed agents, pushes them to a registry, and triggers a redeploy — the core "DevOps" showcase of this project.

---

## 9.1 Repository layout assumption

```
agentlab/
├── .github/workflows/
│   ├── frontend-ci.yml
│   └── agents-ci.yml
├── src/                  (Next.js app — auto-deployed by Vercel's GitHub integration)
├── agents/
│   ├── text-summarizer/
│   └── sms-sender/
└── docker-compose.yml
```

> Vercel already auto-deploys on push if you connected the GitHub repo in Step 8 — no extra workflow needed for the frontend's deployment itself. The workflow below adds **linting/testing** as a safety gate, and handles **agent container builds**, which Vercel doesn't do.

---

## 9.2 Frontend CI (lint + build check)

Create `.github/workflows/frontend-ci.yml`:

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

This runs on every push/PR touching the app — if lint or build fails, you'll know before Vercel even deploys.

---

## 9.3 Agent containers CI (build + push to registry)

Create `.github/workflows/agents-ci.yml`:

```yaml
name: Agents CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'agents/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      agents: ${{ steps.set-matrix.outputs.agents }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - id: set-matrix
        run: |
          CHANGED_DIRS=$(git diff --name-only HEAD^ HEAD -- agents/ | cut -d/ -f2 | sort -u)
          JSON=$(echo "$CHANGED_DIRS" | jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "agents=$JSON" >> "$GITHUB_OUTPUT"

  build-and-push:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.agents != '[]' }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent: ${{ fromJson(needs.detect-changes.outputs.agents) }}
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ./agents/${{ matrix.agent }}
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/agent-${{ matrix.agent }}:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/agent-${{ matrix.agent }}:${{ github.sha }}

      - name: Trigger Render redeploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL_PREFIX }}-${{ matrix.agent }}"
```

**What this does:**
1. Detects which agent folders changed in the latest push (so unrelated agents aren't rebuilt every time).
2. Builds and pushes a fresh Docker image per changed agent to Docker Hub, tagged both `latest` and with the commit SHA (useful for rollbacks).
3. Hits Render's deploy hook to trigger a redeploy of that specific agent service.

---

## 9.4 Required GitHub Secrets

In your repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | a Docker Hub access token (not your password) |
| `RENDER_DEPLOY_HOOK_URL_PREFIX` | base URL for your Render deploy hooks, e.g. if each service's hook is `https://api.render.com/deploy/srv-xxx-text-summarizer`, structure this so the matrix variable appends correctly (adjust the workflow step to match your actual hook URL format per service) |

> Each Render service has its own unique deploy hook URL — you may prefer to store each one as a separate secret (`RENDER_DEPLOY_HOOK_TEXT_SUMMARIZER`, `RENDER_DEPLOY_HOOK_SMS_SENDER`) and reference them via a small lookup step instead of string concatenation, which is more reliable.

---

## 9.5 Optional: automated tests per agent

If you add tests to an agent (e.g., `agents/text-summarizer/test.js` using Node's built-in test runner), extend the workflow:

```yaml
      - name: Run agent tests
        run: |
          cd agents/${{ matrix.agent }}
          npm ci
          npm test
```
Place this step before the Docker build/push step so a failing test blocks deployment.

---

## 9.6 Branch protection (recommended)

In GitHub → **Settings → Branches → Add rule** for `main`:
- Require status checks to pass before merging (select `lint-and-build` and `build-and-push`).
- This prevents broken code or agents from ever reaching production.

---

## Checklist before moving to Step 10
- [ ] Pushing a change to `src/` triggers lint + build check
- [ ] Pushing a change to one agent folder only rebuilds/redeploys that agent, not all of them
- [ ] Docker images appear in Docker Hub with both `latest` and commit-SHA tags
- [ ] Render service redeploys automatically after a successful build
- [ ] Branch protection prevents merging if checks fail
