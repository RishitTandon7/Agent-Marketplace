# Step 4: Build Your First Agent as a Docker Container

**Goal by the end of this step:** A working "Text Summarizer" agent, packaged as a standalone Docker container, exposing a `POST /run` endpoint, runnable locally.

Every agent — AI-powered or utility — follows the **same HTTP contract**, so your gateway code (Step 5) never needs agent-specific logic.

```
POST /run
Body:    { "input": { "text": "..." } }
Response: { "output": { "summary": "..." } }
```

---

## 4.1 Project layout

Keep agents in their own folder, separate from the main Next.js app:

```
agentlab/
├── src/                     (Next.js app)
├── agents/
│   ├── text-summarizer/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── server.js
│   └── sms-sender/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── server.py
└── docker-compose.yml
```

---

## 4.2 Text Summarizer agent (Node.js + an LLM API)

`agents/text-summarizer/package.json`:

```json
{
  "name": "agent-text-summarizer",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

`agents/text-summarizer/server.js`:

```js
import express from 'express'

const app = express()
app.use(express.json({ limit: '1mb' }))

// Health check — used by orchestrator/monitoring
app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.post('/run', async (req, res) => {
  const startedAt = Date.now()
  try {
    const { text } = req.body?.input ?? {}

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'input.text (string) is required' })
    }

    const summary = await summarizeWithLLM(text)

    return res.json({
      output: { summary },
      meta: { duration_ms: Date.now() - startedAt },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Agent failed to process request' })
  }
})

async function summarizeWithLLM(text) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        { role: 'user', content: `Summarize this in 3 bullet points:\n\n${text}` },
      ],
    }),
  })

  const data = await response.json()
  const textBlock = data.content?.find((c) => c.type === 'text')
  return textBlock?.text ?? ''
}

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Text Summarizer agent listening on ${PORT}`))
```

`agents/text-summarizer/Dockerfile`:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js .
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
```

---

## 4.3 SMS Sender agent (Python, utility-style, as a second example)

`agents/sms-sender/requirements.txt`:

```
fastapi==0.111.0
uvicorn==0.30.1
httpx==0.27.0
```

`agents/sms-sender/server.py`:

```python
import os
import time
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class RunRequest(BaseModel):
    input: dict

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/run")
async def run(req: RunRequest):
    started = time.time()
    to = req.input.get("to")
    message = req.input.get("message")

    if not to or not message:
        raise HTTPException(status_code=400, detail="input.to and input.message are required")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.smsprovider.example.com/send",
            headers={"Authorization": f"Bearer {os.environ['SMS_API_KEY']}"},
            json={"to": to, "message": message},
        )

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="Upstream SMS provider error")

    return {
        "output": {"sent": True, "provider_response": resp.json()},
        "meta": {"duration_ms": int((time.time() - started) * 1000)},
    }
```

`agents/sms-sender/Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
EXPOSE 8080
ENV PORT=8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 4.4 Run the first agent locally (no Compose yet)

```bash
cd agents/text-summarizer
docker build -t agent-text-summarizer .
docker run -p 8081:8080 -e ANTHROPIC_API_KEY=your_key_here agent-text-summarizer
```

Test it:

```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Paste a long paragraph here..."}}'
```

You should get back `{ "output": { "summary": "..." } }`.

---

## 4.5 A note on the "same contract" pattern

Because every agent exposes `POST /run` and `GET /health`, your Next.js gateway (Step 5) can treat all agents identically:

```
gateway → POST http://<agent_runtime_url>/run  → forward body → return response
```

This is what lets you add a 10th, 50th, 100th agent later without changing any gateway code — only the `agents` table gets a new row with a new `docker_image` / `runtime_url`.

---

## Checklist before moving to Step 5
- [ ] Text Summarizer agent builds and runs locally as a standalone container
- [ ] `curl` test against `/run` returns a real summary
- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] Second agent (SMS Sender) at least builds successfully (doesn't need a real SMS provider key yet — stub the response if needed)
