'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ApiKey {
  id:            string
  name:          string
  key_prefix:    string
  is_active:     boolean
  last_used_at:  string | null
  request_count: number
  created_at:    string
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null) // shown once
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setKeys(data.keys ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function createKey() {
    if (creating) return
    setCreating(true)
    setError(null)
    setNewKeyValue(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/keys', {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() || 'My API Key' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setNewKeyValue(data.key)
      setNewKeyName('')
      await fetchKeys()
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/keys?id=${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    await fetchKeys()
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(d: string | null) {
    if (!d) return 'Never'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">

      {/* New key revealed */}
      {newKeyValue && (
        <div className="bg-p-lime/20 border-2 border-p-lime rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-display font-bold text-lg">🎉 API Key Created</div>
              <div className="font-sans text-xs text-p-black/60 mt-0.5">
                ⚠️ Copy this key now — it will <strong>never be shown again</strong>.
              </div>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="text-p-black/40 hover:text-p-black text-xl leading-none"
            >×</button>
          </div>
          <div className="flex items-center gap-2 bg-p-black rounded-xl px-4 py-3">
            <code className="font-mono text-sm text-p-lime flex-1 break-all">{newKeyValue}</code>
            <button
              onClick={() => copyKey(newKeyValue)}
              className="shrink-0 bg-p-lime text-p-black font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-p-lime/80 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div className="bg-p-surface border-2 border-p-black/10 rounded-2xl p-5">
        <div className="font-display font-bold text-base mb-4">Create API Key</div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            placeholder="Key name (e.g. Production, My App)"
            className="flex-1 font-sans text-sm bg-p-bg border-2 border-p-black/20 rounded-xl px-4 py-2.5 focus:outline-none focus:border-p-black"
          />
          <button
            onClick={createKey}
            disabled={creating}
            className="bg-p-black text-white font-display font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-p-purple transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating…' : '+ Create Key'}
          </button>
        </div>
        {error && <p className="mt-2 font-sans text-xs text-p-red">{error}</p>}
      </div>

      {/* Key list */}
      <div className="bg-p-surface border-2 border-p-black/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-p-black/10 flex items-center justify-between">
          <div className="font-display font-bold text-base">Your API Keys</div>
          <div className="font-sans text-xs text-p-black/40">{keys.length}/10 keys</div>
        </div>

        {loading ? (
          <div className="p-8 text-center font-sans text-sm text-p-black/40">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">🔑</div>
            <p className="font-sans text-sm text-p-black/40">No API keys yet. Create one above to start building.</p>
          </div>
        ) : (
          <div className="divide-y divide-p-black/10">
            {keys.map(k => (
              <div key={k.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans font-bold text-sm text-p-black">{k.name}</span>
                    {!k.is_active && (
                      <span className="bg-p-red/10 border border-p-red/30 text-p-red text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">Revoked</span>
                    )}
                  </div>
                  <code className="font-mono text-xs text-p-black/50">{k.key_prefix}</code>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="font-sans text-xs text-p-black/60">{k.request_count.toLocaleString()} calls</div>
                  <div className="font-sans text-[11px] text-p-black/40">Last used {formatDate(k.last_used_at)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-sans text-[11px] text-p-black/40 mb-1.5">{formatDate(k.created_at)}</div>
                  {k.is_active && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="font-sans text-xs text-p-red hover:underline"
                    >Revoke</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage guide */}
      <div className="bg-p-black text-white rounded-2xl p-5 space-y-4">
        <div className="font-display font-bold text-base">How to use your API key</div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">cURL example</div>
          <pre className="font-mono text-xs text-p-lime bg-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{`curl -X POST \\
  https://agentlab.dev/api/v1/agents/text-summarizer/run \\
  -H "Authorization: Bearer ahub_lv_<YOUR_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Paste any text you want summarised..."}'`}</pre>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Python example</div>
          <pre className="font-mono text-xs text-p-lime bg-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{`import requests

response = requests.post(
    "https://agentlab.dev/api/v1/agents/text-summarizer/run",
    headers={"Authorization": "Bearer ahub_lv_<YOUR_KEY>"},
    json={"text": "Your text here..."}
)
print(response.json())`}</pre>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">JavaScript / Node.js example</div>
          <pre className="font-mono text-xs text-p-lime bg-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{`const res = await fetch(
  "https://agentlab.dev/api/v1/agents/sentiment-analyzer/run",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer ahub_lv_<YOUR_KEY>",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: "Your text here..." })
  }
);
const data = await res.json();
console.log(data.output);`}</pre>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <div className="font-sans text-xs text-white/60 space-y-1">
            <div>• <strong className="text-white">Base URL:</strong> <code className="text-p-lime">https://agentlab.dev/api/v1/agents/[slug]/run</code></div>
            <div>• <strong className="text-white">Method:</strong> POST with JSON body</div>
            <div>• <strong className="text-white">Auth:</strong> Bearer token in Authorization header</div>
            <div>• <strong className="text-white">Rate limit:</strong> 60 req/min (free), 300 req/min (premium)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
