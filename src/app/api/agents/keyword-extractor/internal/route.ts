import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Keyword Extractor agent.
 * Contract: POST { text: string, max_keywords?: number }
 * →        { keywords, tags, topics, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text: string       = (body?.text ?? '').trim()
  const maxKeywords: number = Math.min(Number(body?.max_keywords ?? 10), 20)

  if (!text) {
    return NextResponse.json({ error: '"text" field is required.' }, { status: 400 })
  }

  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            `You are a keyword extraction expert. Extract the most relevant keywords and topics from text. ` +
            `Return ONLY valid JSON with these keys:\n` +
            `"keywords": array of up to ${maxKeywords} single-word or short-phrase keywords, ordered by relevance\n` +
            `"tags": array of up to 8 hashtag-style tags (without #, lowercase, underscores for spaces)\n` +
            `"topics": array of up to 4 broad topic categories the text belongs to\n` +
            `"language": the detected language of the text\n` +
            `No markdown, pure JSON only.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      true
    )

    const parsed = parseJSONResponse(result.text)
    return NextResponse.json({
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      tags:     Array.isArray(parsed.tags)     ? parsed.tags     : [],
      topics:   Array.isArray(parsed.topics)   ? parsed.topics   : [],
      language: String(parsed.language ?? 'English'),
      model:    result.model,
      provider: result.provider,
    })
  } catch (err) {
    console.error('[keyword-extractor] Error:', err)
    return NextResponse.json(
      { error: 'Failed to extract keywords. Please try again.' },
      { status: 500 }
    )
  }
}
