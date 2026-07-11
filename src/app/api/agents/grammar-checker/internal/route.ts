import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Grammar Checker agent — PREMIUM.
 * Contract: POST { text: string }
 * →        { corrected, errors, suggestions, score, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text: string = (body?.text ?? '').trim()

  if (!text) {
    return NextResponse.json({ error: '"text" field is required.' }, { status: 400 })
  }

  if (text.length > 5000) {
    return NextResponse.json(
      { error: 'Text exceeds maximum length of 5000 characters.' },
      { status: 400 }
    )
  }

  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            'You are a professional grammar and writing editor. Check text for errors and suggest improvements. ' +
            'Return ONLY valid JSON with these keys:\n' +
            '"corrected": the fully corrected version of the text\n' +
            '"errors": array of objects with "original" (string), "corrected" (string), "type" (one of: "grammar", "spelling", "punctuation", "style"), "explanation" (string)\n' +
            '"suggestions": array of up to 5 style improvement suggestions (strings)\n' +
            '"score": a number from 0-100 representing overall writing quality\n' +
            '"readability": one of "Very Easy", "Easy", "Medium", "Hard", "Very Hard"\n' +
            'No markdown, pure JSON only.',
        },
        {
          role: 'user',
          content: `Check and correct the following text:\n\n${text}`,
        },
      ],
      true
    )

    const parsed = parseJSONResponse(result.text)
    return NextResponse.json({
      corrected:   String(parsed.corrected   ?? text),
      errors:      Array.isArray(parsed.errors)      ? parsed.errors      : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      score:       Number(parsed.score       ?? 100),
      readability: String(parsed.readability ?? 'Medium'),
      error_count: Array.isArray(parsed.errors) ? parsed.errors.length : 0,
      model:       result.model,
      provider:    result.provider,
    })
  } catch (err) {
    console.error('[grammar-checker] Error:', err)
    return NextResponse.json(
      { error: 'Failed to check grammar. Please try again.' },
      { status: 500 }
    )
  }
}
