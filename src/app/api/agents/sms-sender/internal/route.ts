import { NextRequest, NextResponse } from 'next/server'

/**
 * Internal SMS Sender agent.
 *
 * Uses Twilio when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER are set.
 * Returns a simulated success response in demo mode (no keys needed).
 *
 * Contract:
 *   POST { to: string, message: string }
 *   →    { sent: boolean, sid?: string, to: string, demo?: boolean }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const to: string      = (body?.to      ?? '').trim()
  const message: string = (body?.message ?? '').trim()

  if (!to || !message) {
    return NextResponse.json(
      { error: '"to" (phone number) and "message" fields are required.' },
      { status: 400 }
    )
  }

  // Basic E.164 format check: +<country code><number>
  if (!/^\+\d{7,15}$/.test(to)) {
    return NextResponse.json(
      { error: 'Phone number must be in E.164 format, e.g. +919876543210' },
      { status: 400 }
    )
  }

  if (message.length > 1600) {
    return NextResponse.json(
      { error: 'Message exceeds maximum length of 1600 characters.' },
      { status: 400 }
    )
  }

  const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID
  const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN
  const FROM_NUMBER  = process.env.TWILIO_FROM_NUMBER

  // ── Demo mode: no Twilio keys ────────────────────────────────────────────
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    // Simulate a 400ms send delay for realism
    await new Promise(r => setTimeout(r, 400))
    return NextResponse.json({
      sent:    true,
      demo:    true,
      to,
      message,
      note: 'Demo mode — SMS not actually sent. Add Twilio keys to send real SMS.',
      sid:  `DEMO_${Date.now()}`,
    })
  }

  // ── Twilio path ──────────────────────────────────────────────────────────
  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`

    const form = new URLSearchParams()
    form.append('To',   to)
    form.append('From', FROM_NUMBER)
    form.append('Body', message)

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json()

    if (!res.ok) {
      const twilioError = data?.message ?? 'Unknown Twilio error'
      console.error('Twilio error:', twilioError)
      return NextResponse.json(
        { error: `SMS provider error: ${twilioError}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      sent:   true,
      sid:    data.sid,
      to:     data.to,
      status: data.status,
    })
  } catch (err) {
    console.error('Twilio call failed:', err)
    return NextResponse.json(
      { error: 'Failed to reach SMS provider. Please try again.' },
      { status: 500 }
    )
  }
}
