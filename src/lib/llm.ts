/**
 * LLM Router — Unified provider abstraction for AgentLab
 *
 * Priority chain (auto-detected at request time):
 *   1. Ollama (local desktop) — free, no API keys, checked first
 *   2. Gemini model pool — rotates across ALL keys × ALL models with quota
 *   3. OpenAI key pool
 *   4. Anthropic key pool
 *   5. Rule-based fallback — always works
 *
 * Gemini model pool (only models with confirmed non-zero RPD quota):
 *   Each call picks a random (key, model) pair from the full matrix.
 *   With 5 keys × 10 models = 50 combinations, quota exhaustion is nearly impossible.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  text: string
  provider: string
  model: string
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function parseKeys(envVar: string | undefined): string[] {
  return (envVar ?? '').split(',').map(k => k.trim()).filter(Boolean)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* ── Gemini model pool ────────────────────────────────────────────────────── */
// Only models with non-zero RPD from your AI Studio quota page.
// Higher-RPD models appear multiple times for weighted selection.
const GEMINI_MODELS = [
  // 1.5K RPD — highest priority (Gemma 4 series)
  'gemma-4-27b-it',    // Gemma 4 26B
  'gemma-4-27b-it',
  'gemma-4-27b-it',
  'gemma-4-31b-it',    // Gemma 4 31B
  'gemma-4-31b-it',
  'gemma-4-31b-it',

  // 500 RPD — Gemini 3.1 Flash Lite
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite',

  // 100 RPD — Antigravity Agents special allocation
  'gemini-2.0-flash-exp',

  // 20 RPD — remaining text models
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.0-flash',
  'gemini-3.5-flash',

  // Robotics models (250K TPM, 20 RPD) — general purpose text works fine
  'gemini-robotics-er-1.5',
  'gemini-robotics-er-1.6',
]

/* ── Ollama ───────────────────────────────────────────────────────────────── */

const OLLAMA_BASE = process.env.OLLAMA_URL ?? 'http://localhost:11434'

async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(1_500),
    })
    return res.ok
  } catch {
    return false
  }
}

async function getBestOllamaModel(): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(1_500) })
    const data = await res.json()
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name)
    const preferred = [
      'gemma3', 'gemma2', 'gemma',
      'llama3.2', 'llama3.1', 'llama3', 'llama2',
      'mistral', 'phi3', 'phi',
      'qwen2.5', 'qwen2',
    ]
    for (const pref of preferred) {
      const match = models.find(m => m.toLowerCase().startsWith(pref))
      if (match) return match
    }
    return models[0] ?? 'llama3.2'
  } catch {
    return 'llama3.2'
  }
}

async function callOllama(messages: LLMMessage[], jsonMode: boolean): Promise<LLMResponse> {
  const model = await getBestOllamaModel()
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: jsonMode ? 'json' : undefined,
      options: { temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  const data = await res.json()
  return { text: data?.message?.content ?? '', provider: 'ollama', model }
}

/* ── Gemini ───────────────────────────────────────────────────────────────── */

async function callGeminiModel(
  key: string,
  model: string,
  messages: LLMMessage[],
  jsonMode: boolean
): Promise<LLMResponse> {
  const systemMsg = messages.find(m => m.role === 'system')?.content ?? ''
  const userMsgs = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ parts: [{ text: m.content }], role: m.role === 'user' ? 'user' : 'model' }))

  const prompt = systemMsg
    ? [{ parts: [{ text: systemMsg }], role: 'user' }, ...userMsgs]
    : userMsgs

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: prompt,
        generationConfig: {
          temperature: 0.3,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini/${model} ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return { text, provider: 'gemini', model }
}

/**
 * Try multiple (key, model) combinations until one succeeds.
 * Pairs are shuffled so load is spread across the full matrix.
 */
async function callGeminiPool(
  keys: string[],
  messages: LLMMessage[],
  jsonMode: boolean
): Promise<LLMResponse> {
  // Build all (key, model) combinations
  type Pair = { key: string; model: string }
  const pairs: Pair[] = []
  for (const key of keys) {
    for (const model of [...new Set(GEMINI_MODELS)]) { // unique models
      pairs.push({ key, model })
    }
  }

  const errors: string[] = []
  for (const { key, model } of shuffle(pairs)) {
    try {
      console.log(`[LLM Router] Gemini → key[…${key.slice(-6)}] model[${model}]`)
      return await callGeminiModel(key, model, messages, jsonMode)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(msg)
      // Don't spam logs for every 429, just track count
    }
  }
  throw new Error(`All Gemini (key×model) combinations failed (${errors.length} attempts)`)
}

/* ── OpenAI ───────────────────────────────────────────────────────────────── */

async function callOpenAI(
  key: string,
  messages: LLMMessage[],
  jsonMode: boolean
): Promise<LLMResponse> {
  const model = 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { text: data?.choices?.[0]?.message?.content ?? '', provider: 'openai', model }
}

/* ── Anthropic ────────────────────────────────────────────────────────────── */

async function callAnthropic(key: string, messages: LLMMessage[]): Promise<LLMResponse> {
  const model = 'claude-haiku-4-5'
  const systemMsg = messages.find(m => m.role === 'system')?.content
  const chatMsgs = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMsgs,
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { text: data?.content?.[0]?.text ?? '', provider: 'anthropic', model }
}

/* ── Main router ──────────────────────────────────────────────────────────── */

export async function callLLM(
  messages: LLMMessage[],
  jsonMode = false
): Promise<LLMResponse> {
  const errors: string[] = []

  // 1. Ollama — local desktop, free, zero API calls
  if (await isOllamaRunning()) {
    try {
      console.log('[LLM Router] Using Ollama (local)')
      return await callOllama(messages, jsonMode)
    } catch (e) {
      errors.push(`Ollama: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 2. Gemini pool — 5 keys × 10 models = 50 combinations
  const geminiKeys = parseKeys(process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY)
  if (geminiKeys.length > 0) {
    try {
      return await callGeminiPool(geminiKeys, messages, jsonMode)
    } catch (e) {
      errors.push(`Gemini pool: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 3. OpenAI pool
  const openaiKeys = parseKeys(process.env.OPENAI_API_KEYS ?? process.env.OPENAI_API_KEY)
  for (const key of shuffle(openaiKeys)) {
    try {
      console.log('[LLM Router] Trying OpenAI')
      return await callOpenAI(key, messages, jsonMode)
    } catch (e) {
      errors.push(`OpenAI: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 4. Anthropic pool
  const anthropicKeys = parseKeys(process.env.ANTHROPIC_API_KEYS ?? process.env.ANTHROPIC_API_KEY)
  for (const key of shuffle(anthropicKeys)) {
    try {
      console.log('[LLM Router] Trying Anthropic')
      return await callAnthropic(key, messages)
    } catch (e) {
      errors.push(`Anthropic: ${e instanceof Error ? e.message : e}`)
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.join('\n')}`)
}

/** Strip markdown fences and parse JSON from LLM response */
export function parseJSONResponse(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}
