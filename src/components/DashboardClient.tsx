'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Agent } from '@/types/agent'

/* ── SVG Icons ─────────────────────────────────────── */
const GridIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const LayersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
)
const ReceiptIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
)
const BarChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const LogOutIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const ApertureIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/>
    <line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
    <line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
  </svg>
)

/* ── Types ─────────────────────────────────────────── */
type Tab = 'marketplace' | 'agents' | 'purchases' | 'logs'

interface Props {
  userEmail: string
  userAvatar: string | null
  userName: string
  initialAgents: Agent[]
  subscribedAgentIds: string[]
  subscriptions: any[]
}

/* ── Mock log data ─────────────────────────────────── */
const MOCK_LOGS = [
  { id: 1, agent: 'Text Summarizer', status: 'success', duration: 1240, time: '2m ago'  },
  { id: 2, agent: 'Text Summarizer', status: 'success', duration: 980,  time: '8m ago'  },
  { id: 3, agent: 'Text Summarizer', status: 'error',   duration: 0,    time: '15m ago' },
  { id: 4, agent: 'Text Summarizer', status: 'success', duration: 1100, time: '1h ago'  },
]

/* ── Sidebar Tab Button ─────────────────────────────── */
function SidebarTab({ icon, active, onClick, title, href }: {
  icon: React.ReactNode
  active: boolean
  onClick?: () => void
  title: string
  href?: string
}) {
  const className = `w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-200 ${
    active
      ? 'bg-p-lime border-p-black text-p-black'
      : 'bg-transparent border-transparent text-p-black/40 hover:text-p-black hover:bg-p-surface hover:border-p-black/20'
  }`

  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {icon}
      </Link>
    )
  }

  return (
    <button onClick={onClick} title={title} className={className}>
      {icon}
    </button>
  )
}

/* ── Main Component ─────────────────────────────────── */
export default function DashboardClient({ 
  userEmail, 
  userAvatar, 
  userName, 
  initialAgents, 
  subscribedAgentIds,
  subscriptions 
}: Props) {
  const [tab, setTab] = useState<Tab>('agents')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // API Key States
  const [keys, setKeys] = useState<{ id: string; name: string; key_prefix: string; is_active: boolean }[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [generatedKeyForAgent, setGeneratedKeyForAgent] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [activeLang, setActiveLang] = useState<'curl' | 'javascript' | 'python' | 'go'>('curl')
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})

  // Expanded code block state per agent
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

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

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as Tab
    if (t === 'agents' || t === 'logs' || t === 'purchases') {
      setTab(t)
    }
  }, [])

  async function handleCreateKey(agentSlug: string) {
    setCreatingKey(true)
    setNewKeyValue(null)
    setGeneratedKeyForAgent(agentSlug)
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
        body: JSON.stringify({ name: agentSlug }),
      })
      const data = await res.json()
      if (res.ok && data.key) {
        setNewKeyValue(data.key)
        setRevealedKeys(prev => ({ ...prev, [agentSlug]: true }))
        await fetchKeys()
      } else {
        alert(data.error ?? 'Failed to generate key')
      }
    } finally {
      setCreatingKey(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  // Active key calculation
  const activeKeyPrefix = keys.find(k => k.is_active)?.key_prefix ?? null
  const apiToken = newKeyValue ?? activeKeyPrefix ?? '<YOUR_API_KEY>'

  // Activated agents filter - ONLY show claimed/subscribed agents as requested
  const activatedAgents = useMemo(() => {
    return initialAgents.filter(a => subscribedAgentIds.includes(a.id))
  }, [initialAgents, subscribedAgentIds])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const tabLabel: Record<Tab, string> = {
    marketplace: 'AgentLab',
    agents: 'Agent Dashboard',
    purchases: 'Purchase History',
    logs: 'Usage Logs',
  }
  const tabSub: Record<Tab, string> = {
    marketplace: 'developer agents',
    agents: 'manage unique keys for claimed agents',
    purchases: 'receipts and invoices',
    logs: '',
  }

  return (
    <div suppressHydrationWarning className="flex flex-col-reverse md:flex-row h-[100dvh] w-screen overflow-hidden bg-p-bg font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="premium-grid" />

      {/* ── Narrow Icon Sidebar ─────────────────────── */}
      <aside className="relative z-20 w-full md:w-[88px] h-auto md:h-full bg-p-surface border-t-2 md:border-t-0 md:border-r-2 border-p-black flex flex-row md:flex-col items-center justify-between md:justify-start px-4 md:px-0 py-2 md:py-4 shrink-0 overflow-x-auto">
        <Link href="/" className="hidden md:flex w-10 h-10 md:w-12 md:h-12 bg-p-red rounded-full border-2 border-p-black items-center justify-center text-white md:mb-6 hover:scale-105 transition-transform premium-shadow shrink-0 mr-4 md:mr-0">
          <ApertureIcon />
        </Link>

        <nav className="flex flex-row md:flex-col items-center gap-2 flex-1 justify-around md:justify-center overflow-x-auto w-full mr-4 md:mr-0">
          <SidebarTab icon={<GridIcon />}    active={tab === 'marketplace'} title="Marketplace" href="/agents" />
          <SidebarTab icon={<LayersIcon />}  active={tab === 'agents'}      onClick={() => setTab('agents')}      title="Agent Dashboard" />
          <SidebarTab icon={<ReceiptIcon />} active={tab === 'purchases'}   onClick={() => setTab('purchases')}   title="Purchase History" />
          <SidebarTab icon={<BarChartIcon />} active={tab === 'logs'}       onClick={() => setTab('logs')}        title="Usage Logs" />
        </nav>

        {/* Avatar / Sign out */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-p-black overflow-hidden hover:opacity-80 transition-opacity flex items-center justify-center bg-p-black text-white shrink-0 ml-auto md:ml-0"
        >
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-sm">{(userName || userEmail || 'U')[0].toUpperCase()}</span>
          )}
        </button>
      </aside>

      {/* ── Main Area ───────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Top Header */}
        <header className="h-[72px] md:h-[72px] bg-p-surface border-b-2 border-p-black flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden w-10 h-10 bg-p-red rounded-full border-2 border-p-black flex items-center justify-center text-white hover:scale-105 transition-transform premium-shadow shrink-0">
              <ApertureIcon />
            </Link>
            <h1 className="font-display font-bold text-xl tracking-tight">{tabLabel[tab]}</h1>
            {tabSub[tab] && (
              <span className="font-serif italic text-p-black/40 text-base hidden sm:inline">{tabSub[tab]}</span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button className="w-11 h-11 rounded-full border-2 border-p-black bg-p-surface flex items-center justify-center relative hover:bg-p-lime transition-colors">
              <span className="material-symbols-outlined text-[20px] text-p-black">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-p-red" />
            </button>
          </div>
        </header>

        {/* Main Tabs Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          
          {/* ── MY AGENTS TAB (Per-Agent API Keys Dashboard) ── */}
          {tab === 'agents' && (
            <div className="space-y-8 animate-[fadeInScale_0.4s_ease-out_forwards]">
              
              {/* Top Title Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b-2 border-p-black/10 pb-6">
                <div>
                  <h2 className="font-display font-bold text-5xl tracking-tighter leading-tight">
                    Agent <span className="font-serif italic text-p-purple">Credentials.</span>
                  </h2>
                  <p className="text-p-black/50 mt-1.5">Manage unique API access keys for each of your claimed agents.</p>
                </div>
              </div>

              {/* Per-Agent Keys Grid/Table */}
              <div className="bg-p-surface border-2 border-p-black rounded-2xl overflow-hidden premium-shadow">
                <div className="px-6 py-4 bg-white/5 border-b border-p-black/10">
                  <h3 className="font-display font-bold text-lg">Your Activated Agent API Keys</h3>
                </div>

                {loadingKeys ? (
                  <div className="p-8 text-center text-p-black/40 font-sans text-sm">Loading credentials...</div>
                ) : activatedAgents.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="text-4xl">🎁</div>
                    <h4 className="font-display font-bold text-lg">No Claimed Agents Yet</h4>
                    <p className="text-sm text-p-black/50 max-w-sm mx-auto leading-relaxed">
                      You haven't claimed any agents yet. Head over to the Marketplace catalog to claim free or premium utilities.
                    </p>
                    <Link
                      href="/agents"
                      className="inline-block bg-p-black text-white px-6 py-3 rounded-xl border-2 border-p-black font-display font-bold text-sm hover:bg-p-surface hover:text-p-black transition-all"
                    >
                      Browse Agent Catalog →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-p-black/10">
                    {activatedAgents.map((agent) => {
                      const agentKey = keys.find(k => k.name === agent.slug && k.is_active)
                      const isRecentlyGenerated = newKeyValue && generatedKeyForAgent === agent.slug
                      const isRevealed = revealedKeys[agent.slug] || isRecentlyGenerated
                      const displayedToken = isRecentlyGenerated ? newKeyValue : (agentKey ? `${agentKey.key_prefix}xxxxxxxxxxxx` : null)

                      return (
                        <div key={agent.slug} className="p-6 hover:bg-p-bg transition-colors space-y-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <h4 className="font-display font-bold text-lg">{agent.name}</h4>
                                <span className={`text-[9px] border font-bold rounded px-2 py-0.5 uppercase tracking-wide ${
                                  agent.category === 'ai' ? 'bg-p-purple/10 border-p-purple/30 text-p-purple' : 'bg-p-blue/10 border-p-blue/30 text-p-blue'
                                }`}>
                                  {agent.category}
                                </span>
                              </div>
                              <p className="font-sans text-xs text-p-black/50 mt-1 max-w-xl">{agent.description}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              {agentKey ? (
                                <button
                                  onClick={() => setRevealedKeys(prev => ({ ...prev, [agent.slug]: !prev[agent.slug] }))}
                                  className="bg-p-black text-white border-2 border-p-black rounded-lg px-4 py-2 font-display font-bold text-xs hover:bg-p-lime hover:text-p-black transition-all flex items-center gap-1.5"
                                >
                                  🔑 {isRevealed ? 'Hide API Key' : 'View API Key'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCreateKey(agent.slug)}
                                  disabled={creatingKey}
                                  className="bg-p-black text-white border-2 border-p-black rounded-lg px-4 py-2 font-display font-bold text-xs hover:bg-p-lime hover:text-p-black transition-all disabled:opacity-50"
                                >
                                  🔑 Generate API Key
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expandable Key Panel for this agent */}
                          {isRevealed && displayedToken && (
                            <div className="bg-white border-2 border-p-black rounded-xl p-4 space-y-3 animate-[fadeInScale_0.2s_ease-out_forwards]">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-sans text-xs font-bold text-p-black/50 uppercase tracking-wide">
                                  {isRecentlyGenerated ? '⚠️ Newly Generated API Key' : 'Active API Token'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 bg-p-bg border border-p-black/10 rounded-lg p-2.5">
                                <code className="font-mono text-xs text-p-purple flex-1 break-all select-all">
                                  {displayedToken}
                                </code>
                                <button
                                  onClick={() => handleCopy(isRecentlyGenerated ? newKeyValue : agentKey!.key_prefix + '...')}
                                  className="shrink-0 bg-p-black text-white font-bold text-[10px] px-3 py-2 rounded-md hover:bg-p-purple transition-all"
                                >
                                  Copy Key
                                </button>
                                <button
                                  onClick={() => handleCreateKey(agent.slug)}
                                  disabled={creatingKey}
                                  className="shrink-0 border border-p-black/35 hover:bg-p-surface font-bold text-[10px] px-3 py-2 rounded-md transition-all"
                                >
                                  Rotate
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Warning callout for newly generated keys */}
                          {isRecentlyGenerated && (
                            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 font-sans text-xs text-amber-900 space-y-1">
                              <strong>🎉 Key generated successfully for {agent.name}!</strong>
                              <p className="opacity-95">
                                Please copy this key now and store it safely. For security reasons, it will <strong>never be shown again</strong>.
                              </p>
                            </div>
                          )}

                          {/* Quick integration snippet inside row */}
                          <div className="bg-p-bg border border-p-black/10 rounded-xl p-4 font-sans text-xs text-p-black/70 space-y-2">
                            <div className="font-semibold text-p-black">API Execution Endpoint:</div>
                            <code className="block bg-white border border-p-black/5 rounded p-2 font-mono text-[11px] text-p-black">
                              POST https://agentlab.rishit.site/api/v1/agents/{agent.slug}/run
                            </code>

                            {/* Collapsible Integration Snippets */}
                            <div>
                              <button
                                onClick={() => setExpandedAgent(expandedAgent === agent.slug ? null : agent.slug)}
                                className="text-p-blue hover:underline text-[10px] font-bold uppercase tracking-wider block mt-2"
                              >
                                {expandedAgent === agent.slug ? 'Hide Code Snippets ▲' : 'Show Integration Snippets ▼'}
                              </button>

                              {expandedAgent === agent.slug && (
                                <div className="mt-3 space-y-4 border-t border-p-black/5 pt-3 animate-[fadeInScale_0.2s_ease-out_forwards]">
                                  {/* Language selector */}
                                  <div className="flex gap-1.5">
                                    {(['curl', 'javascript', 'python', 'go'] as const).map((lang) => (
                                      <button
                                        key={lang}
                                        onClick={() => setActiveLang(lang)}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold border ${
                                          activeLang === lang
                                            ? 'bg-p-black text-white border-p-black'
                                            : 'bg-white text-p-black border-p-black/10 hover:border-p-black'
                                        }`}
                                      >
                                        {lang.toUpperCase()}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Code Block */}
                                  <div className="relative">
                                    <pre className="bg-white border border-p-black/10 rounded-lg p-3 overflow-x-auto text-[10px] font-mono text-p-black/80">
                                      {activeLang === 'curl' && `curl -X POST https://agentlab.rishit.site/api/v1/agents/${agent.slug}/run \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(agent.input_schema || { text: 'Hello world' })}'`}

                                      {activeLang === 'javascript' && `// Node.js implementation
const res = await fetch("https://agentlab.rishit.site/api/v1/agents/${agent.slug}/run", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiToken}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(agent.input_schema || { text: 'Hello world' }, null, 2).replace(/\n/g, '\n    ')})
});
const data = await res.json();
console.log(data);`}

                                      {activeLang === 'python' && `# Python implementation
import requests

res = requests.post(
    "https://agentlab.rishit.site/api/v1/agents/${agent.slug}/run",
    headers={
        "Authorization": "Bearer ${apiToken}",
        "Content-Type": "application/json"
    },
    json=${JSON.stringify(agent.input_schema || { text: 'Hello world' }, null, 2).replace(/\n/g, '\n    ')}
)
print(res.json())`}

                                      {activeLang === 'go' && `// Go implementation
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]string{
		"text": "Hello world",
	})
	req, _ := http.NewRequest("POST", "https://agentlab.rishit.site/api/v1/agents/${agent.slug}/run", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer ${apiToken}")
	req.Header.Set("Content-Type", "application/json")

	resp, _ := http.DefaultClient.Do(req)
	fmt.Println("Status:", resp.Status)
}`}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PURCHASE HISTORY TAB (Receipt Bills View) ── */}
          {tab === 'purchases' && (
            <div className="space-y-8 animate-[fadeInScale_0.4s_ease-out_forwards]">
              <div className="border-b-2 border-p-black/10 pb-6">
                <h2 className="font-display font-bold text-5xl tracking-tighter leading-tight">
                  Purchase <span className="font-serif italic text-p-red">History.</span>
                </h2>
                <p className="text-p-black/50 mt-1.5">Official invoices and proof-of-purchase logs for your active agents.</p>
              </div>

              {subscriptions.length === 0 ? (
                <div className="bg-p-surface border-2 border-p-black rounded-3xl p-12 text-center space-y-4 premium-shadow">
                  <div className="text-4xl">🧾</div>
                  <h4 className="font-display font-bold text-lg">No Purchase History Found</h4>
                  <p className="text-sm text-p-black/45 max-w-sm mx-auto leading-relaxed">
                    You haven't purchased or claimed any active agents yet. Invoices will generate automatically upon activation.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center md:justify-items-start">
                  {subscriptions.map((sub, idx) => {
                    const agentName = sub.agent?.name ?? 'Unknown Agent'
                    const isPremium = sub.agent?.is_premium ?? false
                    const amountText = isPremium ? `₹${(sub.agent?.price_inr / 100).toFixed(2)}` : '₹0.00'
                    const dateFormatted = mounted
                      ? new Date(sub.created_at || new Date()).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''
                    const invoiceNo = `INV-${sub.razorpay_subscription_id?.split('_')[1]?.toUpperCase() || sub.id.slice(0, 8).toUpperCase()}`

                    return (
                      <div 
                        key={sub.id || idx} 
                        className="bg-white border-2 border-p-black rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between w-full max-w-[340px] min-h-[420px] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] transition-all duration-300"
                      >
                        {/* Cut-out ticket notch decoration left/right */}
                        <div className="absolute top-24 -left-3 w-6 h-6 rounded-full bg-p-bg border-r-2 border-p-black" />
                        <div className="absolute top-24 -right-3 w-6 h-6 rounded-full bg-p-bg border-l-2 border-p-black" />

                        {/* Top Receipt header */}
                        <div className="text-center pb-4 border-b-2 border-dashed border-p-black/10">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-p-black/40 font-bold block">Invoice Receipt</span>
                          <span className="font-display font-extrabold text-xl text-p-black tracking-tight block mt-0.5">{invoiceNo}</span>
                        </div>

                        {/* Middle Receipt Details */}
                        <div className="py-6 space-y-4 text-xs font-mono text-p-black/80">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-p-black/40 uppercase">Agent:</span>
                            <span className="font-sans font-bold text-p-black text-right truncate max-w-[160px]" title={agentName}>
                              {agentName}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline">
                            <span className="text-p-black/40 uppercase">Plan:</span>
                            <span className="text-right font-bold text-p-black">
                              {isPremium ? 'Premium Monthly' : 'Free Sandbox'}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline">
                            <span className="text-p-black/40 uppercase">Issued:</span>
                            <span className="text-right text-[10px] text-p-black font-bold">
                              {dateFormatted}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline">
                            <span className="text-p-black/40 uppercase">Gateway:</span>
                            <span className="text-right text-p-black font-bold">
                              {isPremium ? 'Razorpay API' : 'Sandbox Internal'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t border-p-black/5 pt-3 mt-2">
                            <span className="text-p-black/40 uppercase text-xs">Total:</span>
                            <span className="font-display font-extrabold text-xl text-p-black tracking-tight">
                              {amountText}
                            </span>
                          </div>
                        </div>

                        {/* Receipt Footer with Mock Barcode */}
                        <div className="border-t-2 border-dashed border-p-black/10 pt-4 text-center space-y-3">
                          <div className="flex justify-center">
                            <span className="bg-p-lime text-p-black border border-p-black text-[9px] font-bold px-3 py-1 rounded uppercase tracking-wider shadow-sm">
                              🟢 ACTIVE / PAID
                            </span>
                          </div>

                          {/* Beautiful neobrutalist barcode */}
                          <div className="flex justify-center gap-[2px] h-6 opacity-75">
                            <div className="w-[2px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                            <div className="w-[3px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                            <div className="w-[4px] bg-black h-full" />
                            <div className="w-[2px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                            <div className="w-[3px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                            <div className="w-[2px] bg-black h-full" />
                            <div className="w-[4px] bg-black h-full" />
                            <div className="w-[1px] bg-black h-full" />
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── USAGE LOGS TAB ── */}
          {tab === 'logs' && (
            <div className="space-y-8 animate-[fadeInScale_0.4s_ease-out_forwards]">
              <div className="border-b-2 border-p-black/10 pb-6">
                <h2 className="font-display font-bold text-5xl tracking-tighter leading-tight">
                  Usage <span className="font-serif italic text-p-blue">Logs.</span>
                </h2>
                <p className="text-p-black/50 mt-1.5">Real-time container execution records and status telemetry.</p>
              </div>

              <div className="bg-p-surface border-2 border-p-black rounded-2xl overflow-hidden premium-shadow">
                <div className="px-6 py-4 bg-white/5 border-b border-p-black/10">
                  <h3 className="font-display font-bold text-lg">Execution Telemetry</h3>
                </div>
                <div className="divide-y divide-p-black/10 font-mono text-xs">
                  {MOCK_LOGS.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-p-bg transition-colors flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${log.status === 'success' ? 'bg-p-lime border border-p-black' : 'bg-p-red border border-p-black'}`} />
                        <span className="font-bold text-p-black">{log.agent}</span>
                      </div>
                      <div className="flex items-center gap-6 text-p-black/50">
                        <span>{log.duration > 0 ? `${log.duration}ms` : 'FAIL'}</span>
                        <span>{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  )
}
