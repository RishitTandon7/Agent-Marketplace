import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Code Explainer agent.
 * Contract: POST { code: string, language?: string }
 * →        { explanation, key_concepts, complexity, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const code: string     = (body?.code ?? '').trim()
  const language: string = (body?.language ?? 'auto-detect').trim()

  if (!code) {
    return NextResponse.json({ error: '"code" field is required.' }, { status: 400 })
  }

  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            'You are an expert programmer and teacher. Explain code clearly for a junior developer. ' +
            'Return ONLY valid JSON with these keys:\n' +
            '"explanation": a 2-4 sentence plain-English explanation of what the code does\n' +
            '"key_concepts": array of up to 5 programming concepts used (e.g. "recursion", "async/await")\n' +
            '"complexity": one of "Beginner", "Intermediate", "Advanced"\n' +
            '"line_by_line": array of objects with "line" (string) and "meaning" (string) for key lines\n' +
            'No markdown, pure JSON only.',
        },
        {
          role: 'user',
          content: `Language: ${language}\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
        },
      ],
      true
    )

    const parsed = parseJSONResponse(result.text)
    return NextResponse.json({
      explanation:  String(parsed.explanation  ?? ''),
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      complexity:   String(parsed.complexity   ?? 'Unknown'),
      line_by_line: Array.isArray(parsed.line_by_line) ? parsed.line_by_line : [],
      model:        result.model,
      provider:     result.provider,
    })
  } catch (err) {
    console.error('[code-explainer] Error:', err)
    return NextResponse.json(
      { error: 'Failed to explain code. Please try again.' },
      { status: 500 }
    )
  }
}
