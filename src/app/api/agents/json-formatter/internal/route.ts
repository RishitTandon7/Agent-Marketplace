import { NextRequest, NextResponse } from 'next/server'

/**
 * JSON Formatter / Validator agent — ZERO LLM needed, pure logic.
 * Contract: POST { json: string, action: "format" | "minify" | "validate" }
 * →        { result, valid, error?, key_count?, depth? }
 */
export async function POST(req: NextRequest) {
  const body   = await req.json()
  const input: string = (body?.json ?? '').trim()
  const action: string = (body?.action ?? 'format').toLowerCase()

  if (!input) {
    return NextResponse.json({ error: '"json" field is required.' }, { status: 400 })
  }

  if (!['format', 'minify', 'validate'].includes(action)) {
    return NextResponse.json(
      { error: '"action" must be one of: format, minify, validate' },
      { status: 400 }
    )
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : 'Invalid JSON'
    return NextResponse.json({
      valid: false,
      result: input,
      error: msg,
    })
  }

  // Count keys and measure depth
  const keyCount = countKeys(parsed)
  const depth    = measureDepth(parsed)

  switch (action) {
    case 'format':
      return NextResponse.json({
        valid:     true,
        result:    JSON.stringify(parsed, null, 2),
        key_count: keyCount,
        depth,
      })

    case 'minify':
      return NextResponse.json({
        valid:         true,
        result:        JSON.stringify(parsed),
        original_size: `${input.length} chars`,
        minified_size: `${JSON.stringify(parsed).length} chars`,
        savings:       `${Math.round((1 - JSON.stringify(parsed).length / input.length) * 100)}%`,
        key_count:     keyCount,
        depth,
      })

    case 'validate':
      return NextResponse.json({
        valid:     true,
        result:    '✅ Valid JSON',
        key_count: keyCount,
        depth,
        type:      Array.isArray(parsed) ? 'array' : typeof parsed,
      })
  }
}

function countKeys(obj: unknown): number {
  if (typeof obj !== 'object' || obj === null) return 0
  if (Array.isArray(obj)) return obj.reduce<number>((n, v) => n + countKeys(v), 0)
  return Object.keys(obj).length +
    Object.values(obj).reduce<number>((n, v) => n + countKeys(v), 0)
}

function measureDepth(obj: unknown, current = 0): number {
  if (typeof obj !== 'object' || obj === null) return current
  const children = Array.isArray(obj) ? obj : Object.values(obj)
  if (children.length === 0) return current
  return Math.max(...children.map(v => measureDepth(v, current + 1)))
}
