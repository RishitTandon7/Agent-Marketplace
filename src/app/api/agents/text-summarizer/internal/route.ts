import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Internal Text Summarizer agent.
 *
 * Provider priority (auto):
 *   1. Ollama (local desktop — no API key, free)
 *   2. Gemini / OpenAI / Anthropic key pool (random rotation)
 *   3. Rule-based fallback (always works)
 *
 * Contract: POST { text: string } → { summary, key_points, word_count, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text: string = (body?.text ?? '').trim()

  if (!text) {
    return NextResponse.json(
      { error: '"text" field is required and cannot be empty.' },
      { status: 400 }
    )
  }

  // Try LLM path first
  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            'You are a precise text summarizer. Return ONLY valid JSON with exactly these keys:\n' +
            '"summary": a 2-4 sentence summary of the main ideas\n' +
            '"key_points": an array of up to 5 concise bullet-point strings\n' +
            'No markdown, no explanation — pure JSON only.',
        },
        {
          role: 'user',
          content: `Summarise the following text:\n\n${text}`,
        },
      ],
      true // jsonMode
    )

    const parsed = parseJSONResponse(result.text)

    return NextResponse.json({
      summary:    String(parsed.summary    ?? ''),
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      word_count: text.split(/\s+/).length,
      model:      result.model,
      provider:   result.provider,
    })
  } catch (err) {
    console.warn('[text-summarizer] LLM unavailable, using rule-based:', err)
    return NextResponse.json(ruleBasedSummary(text))
  }
}

/** Zero-dependency fallback — works even with no API keys and no Ollama */
function ruleBasedSummary(text: string) {
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const words     = text.trim().split(/\s+/)
  const wordCount = words.length

  const summary =
    sentences.slice(0, 2).join(' ') ||
    words.slice(0, 30).join(' ') + (wordCount > 30 ? '…' : '')

  const keyWords = [
    ...new Set(words.filter((w, i) => i > 0 && /^[A-Z][a-z]{3,}/.test(w))),
  ].slice(0, 5)

  return {
    summary,
    key_points: keyWords.length
      ? keyWords.map(k => `Mentions: ${k}`)
      : ['No AI provider available — using demo mode.'],
    word_count: wordCount,
    model:    'rule-based',
    provider: 'fallback',
  }
}
