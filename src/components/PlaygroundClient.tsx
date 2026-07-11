'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Agent } from '@/types/agent'
import { createClient } from '@/lib/supabase/client'

/* ── icons ─────────────────────────────────────────── */
const SendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
)
const CopyIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ClockIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

/* ── types ─────────────────────────────────────────── */
interface RunResult {
  output: Record<string, unknown>
  duration_ms: number
}

interface Props {
  agent: Agent
}

/* ── SmartOutput ─────────────────────────────────────── */
type Out = Record<string, unknown>
function Label({ children }: { children: string }) {
  return <div className="text-[10px] uppercase tracking-widest text-p-black/40 font-bold mb-2">{children}</div>
}
function TBlock({ children }: { children: string }) {
  return <p className="font-sans text-p-black/80 leading-relaxed text-sm bg-p-bg border-2 border-p-black/10 rounded-xl p-4">{children}</p>
}
function OTag({ children, color = 'lime' }: { children: React.ReactNode; color?: string }) {
  const cls = color === 'purple' ? 'bg-p-purple/10 border-p-purple/30 text-p-purple'
    : color === 'blue' ? 'bg-p-blue/10 border-p-blue/30 text-p-blue'
    : color === 'red'  ? 'bg-p-red/10 border-p-red/30 text-p-red'
    : 'bg-p-lime/20 border-p-lime/50 text-p-black/70'
  return <span className={`inline-flex items-center border rounded-lg px-2.5 py-1 font-sans text-xs font-semibold ${cls}`}>{children}</span>
}
function StatBar({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className="flex items-center gap-4 pt-4 border-t-2 border-p-black/10 flex-wrap">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="w-px h-8 bg-p-black/10" />}
          <div className="text-center">
            <div className="font-display font-bold text-xl">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-p-black/40 font-bold">{s.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
function SmartOutput({ output, durationMs }: { output: Out; durationMs: number }) {
  const o = output
  if (typeof o.summary === 'string') return (
    <div className="space-y-5">
      <div><Label>Summary</Label><TBlock>{o.summary}</TBlock></div>
      {Array.isArray(o.key_points) && (o.key_points as string[]).length > 0 && (
        <div><Label>Key Points</Label>
          <ul className="space-y-2">{(o.key_points as string[]).map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 font-sans text-sm text-p-black/70">
              <span className="w-5 h-5 bg-p-lime border-2 border-p-black rounded-md flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">{i + 1}</span>{pt}
            </li>
          ))}</ul>
        </div>
      )}
      <StatBar stats={[
        ...(typeof o.word_count === 'number' ? [{ label: 'Words', value: o.word_count as number }] : []),
        { label: 'ms', value: durationMs },
        ...(o.model ? [{ label: 'Model', value: String(o.model).split('/').pop() ?? String(o.model) }] : []),
      ]} />
    </div>
  )
  if (Array.isArray(o.keywords)) return (
    <div className="space-y-5">
      <div><Label>Keywords</Label><div className="flex flex-wrap gap-2">{(o.keywords as string[]).map(k => <OTag key={k}>{k}</OTag>)}</div></div>
      {Array.isArray(o.tags) && (o.tags as string[]).length > 0 && (<div><Label>Tags</Label><div className="flex flex-wrap gap-2">{(o.tags as string[]).map(t => <OTag key={t} color="purple">#{t}</OTag>)}</div></div>)}
      {Array.isArray(o.topics) && (o.topics as string[]).length > 0 && (<div><Label>Topics</Label><div className="flex flex-wrap gap-2">{(o.topics as string[]).map(t => <OTag key={t} color="blue">{t}</OTag>)}</div></div>)}
      <StatBar stats={[{ label: 'ms', value: durationMs }, ...(o.language ? [{ label: 'Language', value: String(o.language) }] : [])]} />
    </div>
  )
  if (typeof o.explanation === 'string') return (
    <div className="space-y-5">
      <div><Label>Explanation</Label><TBlock>{o.explanation}</TBlock></div>
      {typeof o.complexity === 'string' && (<div className="flex items-center gap-3"><Label>Complexity</Label><OTag color={o.complexity==='Beginner'?'lime':o.complexity==='Advanced'?'red':'blue'}>{o.complexity}</OTag></div>)}
      {Array.isArray(o.key_concepts) && (o.key_concepts as string[]).length > 0 && (<div><Label>Key Concepts</Label><div className="flex flex-wrap gap-2">{(o.key_concepts as string[]).map(c => <OTag key={c} color="purple">{c}</OTag>)}</div></div>)}
      {Array.isArray(o.line_by_line) && (o.line_by_line as {line:string;meaning:string}[]).length > 0 && (
        <div><Label>Line by Line</Label><div className="space-y-2">{(o.line_by_line as {line:string;meaning:string}[]).map((l,i) => (
          <div key={i} className="bg-p-bg border-2 border-p-black/10 rounded-xl p-3"><code className="font-mono text-xs text-p-purple block mb-1">{l.line}</code><span className="font-sans text-xs text-p-black/60">{l.meaning}</span></div>
        ))}</div></div>
      )}
      <StatBar stats={[{ label: 'ms', value: durationMs }, ...(o.model ? [{ label: 'Model', value: String(o.model).split('/').pop() ?? '' }] : [])]} />
    </div>
  )
  if (typeof o.sentiment === 'string') {
    const score = Number(o.score ?? 0); const pct = Math.round(((score+1)/2)*100)
    const barCls = score >= 0.3 ? 'bg-p-lime' : score <= -0.3 ? 'bg-p-red' : 'bg-p-blue'
    return (<div className="space-y-5">
      <div className="flex items-center gap-3"><span className="font-display font-bold text-2xl">{o.sentiment as string}</span><OTag color={score>=0.3?'lime':score<=-0.3?'red':'blue'}>{score>=0?'+':''}{score.toFixed(2)}</OTag></div>
      <div><Label>Score</Label><div className="bg-p-bg border-2 border-p-black/10 rounded-xl p-3"><div className="h-3 bg-p-black/10 rounded-full overflow-hidden"><div className={`h-full ${barCls} rounded-full`} style={{width:`${pct}%`}} /></div><div className="flex justify-between mt-1.5 font-sans text-[10px] text-p-black/40"><span>Very Negative</span><span>Neutral</span><span>Very Positive</span></div></div></div>
      {Array.isArray(o.emotions) && (o.emotions as string[]).length > 0 && (<div><Label>Emotions</Label><div className="flex flex-wrap gap-2">{(o.emotions as string[]).map(e => <OTag key={e}>{e}</OTag>)}</div></div>)}
      {typeof o.reasoning==='string' && o.reasoning && <div><Label>Reasoning</Label><TBlock>{o.reasoning}</TBlock></div>}
      {Array.isArray(o.key_phrases) && (o.key_phrases as string[]).length > 0 && (<div><Label>Key Phrases</Label><div className="flex flex-wrap gap-2">{(o.key_phrases as string[]).map(p => <OTag key={p} color="purple">&ldquo;{p}&rdquo;</OTag>)}</div></div>)}
      <StatBar stats={[{label:'ms',value:durationMs},...(o.confidence?[{label:'Confidence',value:`${Math.round(Number(o.confidence)*100)}%`}]:[])]} />
    </div>)
  }
  if (Array.isArray(o.passwords)) return (
    <div className="space-y-5">
      <div><Label>Generated Passwords</Label><div className="space-y-2">{(o.passwords as string[]).map((pwd,i) => (
        <div key={i} className="flex items-center justify-between gap-3 bg-p-bg border-2 border-p-black/10 rounded-xl px-4 py-3">
          <code className="font-mono text-sm text-p-black/80 break-all">{pwd}</code>
          <button onClick={() => navigator.clipboard.writeText(pwd)} className="shrink-0 text-xs text-p-black/40 hover:text-p-black border border-p-black/20 rounded-lg px-2 py-1 font-sans">Copy</button>
        </div>
      ))}</div></div>
      <StatBar stats={[{label:'Strength',value:String(o.strength??'')},{label:'Entropy',value:`${o.entropy_bits??0} bits`},{label:'ms',value:durationMs}]} />
      {Array.isArray(o.tips) && (o.tips as string[]).length > 0 && (<div><Label>Security Tips</Label><ul className="space-y-1.5">{(o.tips as string[]).map((t,i) => (<li key={i} className="font-sans text-xs text-p-black/60 flex items-start gap-2"><span className="text-p-lime">→</span>{t}</li>))}</ul></div>)}
    </div>
  )
  if (typeof o.valid === 'boolean') return (
    <div className="space-y-5">
      <div className="flex items-center gap-2"><span className={`font-display font-bold text-lg ${o.valid?'text-p-lime':'text-p-red'}`}>{o.valid?'✅ Valid':'❌ Invalid'}</span>{typeof o.type==='string'&&<OTag>{o.type}</OTag>}</div>
      {!!o.error && <div className="bg-p-red/10 border-2 border-p-red/30 rounded-xl p-3 font-mono text-xs text-p-red">{String(o.error)}</div>}
      {typeof o.result==='string' && o.result!=='✅ Valid JSON' && (<div><Label>Result</Label><pre className="font-mono text-xs text-p-purple bg-p-bg border-2 border-p-black/10 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap max-h-72">{o.result as string}</pre></div>)}
      <StatBar stats={[...(typeof o.key_count==='number'?[{label:'Keys',value:o.key_count as number}]:[]),...(typeof o.depth==='number'?[{label:'Depth',value:o.depth as number}]:[]),...(o.savings?[{label:'Saved',value:String(o.savings as string)}]:[]),{label:'ms',value:durationMs}]} />
    </div>
  )
  if (typeof o.subject === 'string') return (
    <div className="space-y-5">
      <div><Label>Subject</Label><p className="font-sans font-bold text-p-black bg-p-lime/20 border-2 border-p-lime/40 rounded-xl px-4 py-3">{o.subject as string}</p></div>
      {Array.isArray(o.alternative_subjects) && (o.alternative_subjects as string[]).length > 0 && (<div><Label>Alternative Subjects</Label><div className="space-y-1.5">{(o.alternative_subjects as string[]).map((s,i) => (<p key={i} className="font-sans text-sm text-p-black/60 bg-p-bg border border-p-black/10 rounded-xl px-4 py-2">{s}</p>))}</div></div>)}
      {typeof o.body==='string' && (<div><Label>Email Body</Label><pre className="font-sans text-sm text-p-black/80 bg-p-bg border-2 border-p-black/10 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">{o.body as string}</pre></div>)}
      <StatBar stats={[...(typeof o.word_count==='number'?[{label:'Words',value:o.word_count as number}]:[]),...(o.tone?[{label:'Tone',value:String(o.tone)}]:[]),{label:'ms',value:durationMs}]} />
    </div>
  )
  if (typeof o.corrected === 'string') {
    const errs = Array.isArray(o.errors) ? o.errors as {original:string;corrected:string;type:string;explanation:string}[] : []
    return (<div className="space-y-5">
      <div className="flex items-center gap-3"><div className="font-display font-bold text-3xl">{typeof o.score==='number'?o.score:100}</div><div><div className="font-sans text-sm font-bold">{String(o.readability??'Medium')} readability</div><div className="text-[10px] uppercase tracking-widest text-p-black/40 font-bold">{errs.length} error{errs.length!==1?'s':''} found</div></div></div>
      <div><Label>Corrected Text</Label><div className="font-sans text-sm text-p-black/80 bg-p-lime/10 border-2 border-p-lime/30 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{o.corrected as string}</div></div>
      {errs.length > 0 && (<div><Label>Corrections</Label><div className="space-y-2">{errs.map((e,i) => (<div key={i} className="bg-p-bg border-2 border-p-black/10 rounded-xl p-3"><div className="flex items-start gap-2 mb-1"><OTag color="red">{e.type}</OTag><span className="font-sans text-xs text-p-black/50">{e.explanation}</span></div><div className="font-mono text-xs flex items-center gap-2"><span className="line-through text-p-red/70">{e.original}</span><span className="text-p-black/40">→</span><span className="text-p-lime font-bold">{e.corrected}</span></div></div>))}</div></div>)}
      {Array.isArray(o.suggestions) && (o.suggestions as string[]).length > 0 && (<div><Label>Style Suggestions</Label><ul className="space-y-1.5">{(o.suggestions as string[]).map((s,i) => (<li key={i} className="font-sans text-xs text-p-black/60 flex items-start gap-2"><span className="text-p-blue">💡</span>{s}</li>))}</ul></div>)}
      <StatBar stats={[{label:'ms',value:durationMs},...(o.model?[{label:'Model',value:String(o.model).split('/').pop()??''}]:[])]} />
    </div>)
  }
  if (typeof o.sent === 'boolean') return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><span className={`font-display font-bold text-2xl ${o.sent?'text-p-lime':'text-p-red'}`}>{o.sent?'✅ Sent':'❌ Failed'}</span>{!!o.demo&&<OTag color="blue">Demo Mode</OTag>}</div>
      {typeof o.to==='string'&&<div><Label>Recipient</Label><TBlock>{o.to}</TBlock></div>}
      {typeof o.sid==='string'&&<div><Label>Message SID</Label><code className="font-mono text-xs text-p-purple">{o.sid}</code></div>}
      {typeof o.note==='string'&&<div className="bg-p-blue/10 border-2 border-p-blue/30 rounded-xl p-3 font-sans text-sm text-p-blue/80">{o.note as string}</div>}
      <StatBar stats={[{label:'ms',value:durationMs}]} />
    </div>
  )
  return (<div className="space-y-4"><pre className="font-mono text-xs text-p-purple bg-p-bg border-2 border-p-black/10 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(output,null,2)}</pre><StatBar stats={[{label:'ms',value:durationMs}]} /></div>)
}

/* ── component ─────────────────────────────────────── */
export default function PlaygroundClient({ agent }: Props) {
  // Build initial input state from input_schema fields
  const schemaFields: { key: string; label: string; type: string; placeholder: string }[] =
    agent.input_schema
      ? Object.entries(agent.input_schema as Record<string, { type?: string; description?: string; example?: string }>).map(
          ([key, meta]) => ({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: meta.type ?? 'text',
            placeholder: meta.example ?? meta.description ?? '',
          })
        )
      : [{ key: 'text', label: 'Text', type: 'textarea', placeholder: 'Paste any text you want summarised…' }]

  const initialValues = schemaFields.reduce<Record<string, string>>(
    (acc, f) => ({ ...acc, [f.key]: '' }),
    {}
  )

  const [values, setValues] = useState(initialValues)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // API Key integration states
  const [keys, setKeys] = useState<{ id: string; name: string; key_prefix: string; is_active: boolean }[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showKeyPanel, setShowKeyPanel] = useState(false)

  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleCreateKey() {
    setCreatingKey(true)
    setNewKeyValue(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/keys', {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: agent.slug }),
      })
      const data = await res.json()
      if (res.ok && data.key) {
        setNewKeyValue(data.key)
        await fetchKeys()
      } else {
        alert(data.error ?? 'Failed to generate key')
      }
    } finally {
      setCreatingKey(false)
    }
  }

  function handleCopyKey(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const isPurple = agent.category === 'ai'
  const accentColor = isPurple ? 'bg-p-purple' : 'bg-p-blue'
  const textColor = isPurple ? 'text-p-black' : 'text-white'

  async function handleRun() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/agents/${agent.slug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error — please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result.output, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isEmpty = schemaFields.every(f => !values[f.key]?.trim())

  return (
    <div suppressHydrationWarning className="min-h-screen bg-p-bg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="premium-grid" />

      {/* ── Nav ── */}
      <header className="relative z-50 border-b-2 border-p-black bg-p-surface sticky top-0">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href={`/agents/${agent.slug}`} className="font-sans font-bold text-sm hover:text-p-blue transition-colors flex items-center gap-2">
            ← Back to Agent
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowKeyPanel(!showKeyPanel)}
              className="font-sans font-bold text-xs bg-p-bg hover:bg-p-lime border-2 border-p-black rounded-xl px-4 py-2 transition-all premium-shadow flex items-center gap-1.5"
            >
              🔑 {showKeyPanel ? 'Hide API Key' : 'View API Key'}
            </button>
            <Link href="/dashboard" className="font-sans font-semibold text-sm hover:text-p-blue transition-colors">
              Agent Dashboard
            </Link>
          </div>
        </div>

        {/* Expandable Key Panel */}
        {showKeyPanel && (
          <div className="border-t-2 border-p-black bg-p-bg py-6 px-4 md:px-8 animate-[fadeInScale_0.3s_ease-out_forwards]">
            <div className="max-w-[1000px] mx-auto space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-display font-bold text-lg">API Access Token</h4>
                  <p className="font-sans text-xs text-p-black/50">Used to authenticate requests specifically for {agent.name}.</p>
                </div>
                {creatingKey && (
                  <span className="font-sans text-xs text-p-black/40">Generating token...</span>
                )}
              </div>

              {/* Render key details */}
              {(() => {
                const agentKey = keys.find(k => k.name === agent.slug && k.is_active)
                const currentDisplay = newKeyValue ?? (agentKey ? `${agentKey.key_prefix}xxxxxxxxxxxx` : null)

                if (currentDisplay) {
                  return (
                    <div className="space-y-4">
                      {newKeyValue && (
                        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 font-sans text-xs text-amber-900 space-y-1">
                          <strong>🎉 Key Generated successfully for {agent.name}!</strong>
                          <p>Copy this key now. It will <strong>never be shown again</strong>.</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white border-2 border-p-black rounded-xl p-3">
                        <code className="font-mono text-sm text-p-purple flex-1 break-all select-all">
                          {currentDisplay}
                        </code>
                        <button
                          onClick={() => handleCopyKey(newKeyValue ?? agentKey!.key_prefix + '...')}
                          className="shrink-0 bg-p-black text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-p-purple transition-all"
                        >
                          {copiedKey ? '✓ Copied' : 'Copy Key'}
                        </button>
                        <button
                          onClick={handleCreateKey}
                          disabled={creatingKey}
                          className="shrink-0 border border-p-black/35 hover:bg-p-surface font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
                        >
                          Rotate Key
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="bg-white border-2 border-dashed border-p-black/20 rounded-xl p-6 text-center space-y-4">
                    <p className="font-sans text-sm text-p-black/60">You do not have an API key for {agent.name} yet.</p>
                    <button
                      onClick={handleCreateKey}
                      disabled={creatingKey}
                      className="bg-p-black text-white font-display font-bold text-xs px-5 py-3 rounded-xl hover:bg-p-lime hover:text-p-black transition-all disabled:opacity-50"
                    >
                      {creatingKey ? 'Generating...' : `🔑 Generate API Key for ${agent.name}`}
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-[1000px] mx-auto px-4 md:px-8 py-12">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className={`inline-flex items-center gap-2 ${accentColor} border-2 border-p-black rounded-full px-4 py-1.5 mb-4`}>
            <span className={`font-sans font-bold text-xs tracking-widest uppercase ${textColor}`}>
              Live Playground
            </span>
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tighter leading-tight mb-2">
            {agent.name}
          </h1>
          <p className="font-sans text-p-black/60 text-lg max-w-xl">{agent.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Input Panel ── */}
          <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow flex flex-col">
            <div className="px-6 py-4 border-b-2 border-p-black/10 flex items-center justify-between">
              <span className="font-sans font-bold text-sm uppercase tracking-widest text-p-black/50">Input</span>
              <button
                onClick={() => setValues(initialValues)}
                className="text-xs text-p-black/40 hover:text-p-black transition-colors font-sans"
              >
                Clear
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5">
              {schemaFields.map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <label className="font-sans font-semibold text-sm text-p-black/70">{field.label}</label>
                  {field.type === 'textarea' || field.key === 'text' || field.key === 'content' ? (
                    <textarea
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={10}
                      className="font-sans text-sm bg-p-bg border-2 border-p-black/20 focus:border-p-black rounded-xl p-4 resize-none outline-none transition-colors text-p-black placeholder:text-p-black/30 w-full leading-relaxed"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="font-sans text-sm bg-p-bg border-2 border-p-black/20 focus:border-p-black rounded-xl px-4 py-3 outline-none transition-colors text-p-black placeholder:text-p-black/30 w-full"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={handleRun}
                disabled={loading || isEmpty}
                className={`mt-auto w-full flex items-center justify-center gap-2.5 rounded-xl px-6 py-4 font-display font-bold text-base border-2 transition-all premium-shadow ${
                  loading || isEmpty
                    ? 'bg-p-black/10 border-p-black/10 text-p-black/30 cursor-not-allowed'
                    : 'bg-p-black text-white border-p-black hover:bg-p-red hover:border-p-red'
                }`}
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    Running…
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Run Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Output Panel ── */}
          <div className="flex flex-col gap-6">

            {/* Output card */}
            <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow flex-1 flex flex-col">
              <div className="px-6 py-4 border-b-2 border-p-black/10 flex items-center justify-between">
                <span className="font-sans font-bold text-sm uppercase tracking-widest text-p-black/50">Output</span>
                {result && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-p-black/40 font-sans">
                      <ClockIcon /> {result.duration_ms}ms
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs text-p-black/50 hover:text-p-black transition-colors font-sans border border-p-black/20 rounded-lg px-2.5 py-1"
                    >
                      {copied ? <><CheckIcon />Copied</> : <><CopyIcon />Copy</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 flex-1">
                {/* Error state */}
                {error && (
                  <div className="bg-p-red/10 border-2 border-p-red rounded-2xl p-5">
                    <div className="font-sans font-bold text-sm text-p-red mb-1">Error</div>
                    <p className="font-sans text-sm text-p-red/80">{error}</p>
                    {error.includes('sign in') && (
                      <Link href="/login" className="mt-3 inline-block bg-p-red text-white px-4 py-2 rounded-xl font-display font-bold text-sm border-2 border-p-red hover:bg-p-surface hover:text-p-red transition-all">
                        Sign In →
                      </Link>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!result && !error && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-3">
                    <div className="w-14 h-14 bg-p-bg border-2 border-p-black/20 rounded-2xl flex items-center justify-center text-2xl">
                      ⚡
                    </div>
                    <p className="font-sans text-p-black/40 text-sm max-w-xs">
                      Enter your input on the left and click <strong>Run Agent</strong> to see the live output here.
                    </p>
                  </div>
                )}

                {/* Loading shimmer */}
                {loading && (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-p-black/10 rounded-lg w-3/4" />
                    <div className="h-4 bg-p-black/10 rounded-lg w-full" />
                    <div className="h-4 bg-p-black/10 rounded-lg w-5/6" />
                    <div className="h-4 bg-p-black/10 rounded-lg w-2/3 mt-6" />
                    <div className="h-4 bg-p-black/10 rounded-lg w-full" />
                  </div>
                )}

                {/* Result */}
                {result && !loading && (
                  <SmartOutput output={result.output} durationMs={result.duration_ms} />
                )}
              </div>
            </div>

            {/* API snippet */}
            <div className="bg-p-black text-white border-2 border-p-black rounded-3xl overflow-hidden">
              <div className="px-6 py-3 border-b border-white/10">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-white/40">cURL</span>
              </div>
              <pre className="p-5 font-mono text-xs text-p-lime overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`curl -X POST \\
  https://agentlab.rishit.site/api/v1/agents/${agent.slug}/run \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(
    schemaFields.reduce<Record<string, string>>((a, f) => ({ ...a, [f.key]: f.placeholder || `your_${f.key}` }), {})
  , null, 2)}'`}
              </pre>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
