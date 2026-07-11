import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSONResponse } from '@/lib/llm'

/**
 * Email Drafter agent — PREMIUM.
 * Contract: POST { topic: string, tone: string, bullet_points: string, recipient_name?: string }
 * →        { subject, body, word_count, model, provider }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const topic:          string = (body?.topic          ?? '').trim()
  const tone:           string = (body?.tone           ?? 'Professional').trim()
  const bulletPoints:   string = (body?.bullet_points  ?? '').trim()
  const recipientName:  string = (body?.recipient_name ?? '').trim()

  if (!topic) {
    return NextResponse.json({ error: '"topic" field is required.' }, { status: 400 })
  }

  const validTones = ['Professional', 'Friendly', 'Formal', 'Casual', 'Persuasive', 'Apologetic']
  const effectiveTone = validTones.includes(tone) ? tone : 'Professional'

  try {
    const result = await callLLM(
      [
        {
          role: 'system',
          content:
            `You are an expert email copywriter. Write professional, clear, and effective emails. ` +
            `Return ONLY valid JSON with these keys:\n` +
            `"subject": a compelling email subject line (max 60 characters)\n` +
            `"body": the complete email body as a string with \\n for newlines. Include greeting, body paragraphs, and sign-off.\n` +
            `"alternative_subjects": array of 2 alternative subject line options\n` +
            `No markdown in JSON values, pure JSON only.`,
        },
        {
          role: 'user',
          content:
            `Write a ${effectiveTone} email about: ${topic}\n` +
            (recipientName ? `Recipient name: ${recipientName}\n` : '') +
            (bulletPoints  ? `Key points to cover:\n${bulletPoints}\n` : ''),
        },
      ],
      true
    )

    const parsed = parseJSONResponse(result.text)
    const emailBody = String(parsed.body ?? '')

    return NextResponse.json({
      subject:              String(parsed.subject ?? ''),
      body:                 emailBody,
      alternative_subjects: Array.isArray(parsed.alternative_subjects) ? parsed.alternative_subjects : [],
      word_count:           emailBody.split(/\s+/).filter(Boolean).length,
      tone:                 effectiveTone,
      model:                result.model,
      provider:             result.provider,
    })
  } catch (err) {
    console.error('[email-drafter] Error:', err)
    return NextResponse.json(
      { error: 'Failed to draft email. Please try again.' },
      { status: 500 }
    )
  }
}
