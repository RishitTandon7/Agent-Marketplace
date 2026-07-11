import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Sentiment Analyzer agent.
 * Contract: POST { text: string }
 * →        { sentiment, score, emotions, reasoning, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text: string = (body?.text ?? '').trim()

  if (!text) {
    return NextResponse.json({ error: '"text" field is required.' }, { status: 400 })
  }

  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            'You are a sentiment analysis expert. Analyze the emotional tone of text. ' +
            'Return ONLY valid JSON with these exact keys:\n' +
            '"sentiment": one of "Very Positive", "Positive", "Neutral", "Negative", "Very Negative"\n' +
            '"score": a number from -1.0 (very negative) to 1.0 (very positive)\n' +
            '"confidence": a number from 0.0 to 1.0\n' +
            '"emotions": array of detected emotions (e.g. ["joy", "surprise", "trust"])\n' +
            '"reasoning": 1-2 sentences explaining the sentiment classification\n' +
            '"key_phrases": array of up to 5 phrases that most influenced the sentiment\n' +
            'No markdown, pure JSON only.',
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
      sentiment:   String(parsed.sentiment   ?? 'Neutral'),
      score:       Number(parsed.score       ?? 0),
      confidence:  Number(parsed.confidence  ?? 0),
      emotions:    Array.isArray(parsed.emotions)    ? parsed.emotions    : [],
      reasoning:   String(parsed.reasoning   ?? ''),
      key_phrases: Array.isArray(parsed.key_phrases) ? parsed.key_phrases : [],
      model:       result.model,
      provider:    result.provider,
    })
  } catch (err) {
    console.error('[sentiment-analyzer] Error:', err)
    return NextResponse.json(
      { error: 'Failed to analyze sentiment. Please try again.' },
      { status: 500 }
    )
  }
}
