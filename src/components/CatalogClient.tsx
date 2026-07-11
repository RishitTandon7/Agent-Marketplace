'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Agent } from '@/types/agent'

interface Props {
  agents: Agent[]
  userName: string
  userEmail: string
  userAvatar: string | null
}

const AGENT_THEMES: Record<string, {
  gradient: string
  icon: string
  color: string
}> = {
  'text-summarizer': { gradient: 'from-emerald-400 to-teal-600', icon: '📝', color: 'bg-emerald-500' },
  'code-explainer': { gradient: 'from-indigo-600 to-violet-800', icon: '💻', color: 'bg-indigo-600' },
  'sentiment-analyzer': { gradient: 'from-rose-400 to-orange-500', icon: '🎭', color: 'bg-rose-500' },
  'keyword-extractor': { gradient: 'from-cyan-400 to-blue-600', icon: '🔑', color: 'bg-cyan-500' },
  'json-formatter': { gradient: 'from-green-400 to-emerald-600', icon: '⚡', color: 'bg-green-500' },
  'password-generator': { gradient: 'from-yellow-400 to-amber-500', icon: '🔒', color: 'bg-yellow-500' },
  'email-drafter': { gradient: 'from-blue-600 to-indigo-800', icon: '✉️', color: 'bg-blue-600' },
  'grammar-checker': { gradient: 'from-purple-500 to-pink-600', icon: '✨', color: 'bg-purple-500' },
  'sms-sender': { gradient: 'from-sky-400 to-blue-500', icon: '💬', color: 'bg-sky-500' },
}

/* ── SVG Icons ─────────────────────────────────────── */
const ApertureIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/>
    <line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
    <line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
  </svg>
)
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

function SidebarTab({ icon, active, title, href }: {
  icon: React.ReactNode
  active: boolean
  title: string
  href: string
}) {
  return (
    <Link 
      href={href} 
      title={title} 
      className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-200 ${
        active
          ? 'bg-p-lime border-p-black text-p-black'
          : 'bg-transparent border-transparent text-p-black/40 hover:text-p-black hover:bg-p-surface hover:border-p-black/20'
      }`}
    >
      {icon}
    </Link>
  )
}

function AgentCard({ agent, index, mounted }: { agent: Agent; index: number; mounted: boolean }) {
  const theme = AGENT_THEMES[agent.slug] ?? {
    gradient: 'from-gray-500 to-slate-700',
    icon: '🤖',
  }

  const borderClass = agent.is_premium
    ? 'premium-glow border-2'
    : 'border-2 border-p-black hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'

  const dividerClass = agent.is_premium ? 'border-b-2 border-amber-400' : 'border-b-2 border-p-black'
  const bottomDividerClass = agent.is_premium ? 'border-t border-amber-400/30' : 'border-t border-p-black/10'
  const bodyClass = agent.is_premium ? 'premium-hover-bg' : 'standard-hover-bg'

  return (
    <article
      style={{ 
        transitionDelay: `${index * 50}ms`,
      }}
      className={`gold-shine w-full bg-p-surface rounded-3xl overflow-hidden flex flex-col h-[510px] transition-all duration-500 hover:translate-y-[-8px] ${borderClass} ${bodyClass} ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      
      {/* Top Banner Accent */}
      <div className={`h-32 bg-gradient-to-br ${theme.gradient} ${dividerClass} p-5 relative overflow-hidden flex items-end shrink-0`}>
        <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 border-4 border-white/5 rounded-full" />
        
        {/* Watermark icon */}
        <span className="absolute -right-2 -bottom-4 text-7xl opacity-20 select-none transition-transform duration-700 hover:rotate-12">
          {theme.icon}
        </span>

        {/* Category tag */}
        <span className="absolute top-4 left-4 bg-p-black text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10">
          {agent.category}
        </span>

        <h3 className="font-display font-bold text-2xl text-white tracking-tight leading-none truncate w-full z-10">
          {agent.name}
        </h3>
      </div>

      {/* Body Area */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {agent.is_premium ? (
              <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-neutral-900 border border-amber-500 font-display text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide shadow-sm">
                🏆 Premium
              </span>
            ) : (
              <span className="bg-p-lime/20 border border-p-lime/50 text-p-black/70 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                Free Tier
              </span>
            )}
          </div>
          <p className="font-sans text-xs text-p-black/60 leading-relaxed line-clamp-6">
            {agent.description}
          </p>
        </div>

        {/* Bottom stats and action */}
        <div className={`space-y-4 pt-4 ${bottomDividerClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-p-black/40 font-bold">Cost</span>
            <div className={`font-display font-bold text-2xl tracking-tighter ${agent.is_premium ? 'text-amber-500' : 'text-p-black'}`}>
              {agent.is_premium ? `₹${agent.price_inr / 100}` : 'Free'}
              {agent.is_premium && <span className="text-xs font-sans font-normal text-p-black/40 ml-0.5">/mo</span>}
            </div>
          </div>

          <Link
            href={`/agents/${agent.slug}`}
            className={`w-full h-11 rounded-xl text-center font-display font-bold text-sm border-2 transition-all flex items-center justify-center gap-1.5 ${
              agent.is_premium
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-400 text-neutral-900 border-amber-500 shadow-md'
                : 'bg-p-black text-white border-p-black hover:bg-p-surface hover:text-p-black'
            }`}
          >
            View Agent <span className="text-base">→</span>
          </Link>
        </div>

      </div>

    </article>
  )
}

export default function CatalogClient({ agents, userName, userEmail, userAvatar }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'utility'>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    if (!mounted) return 'Welcome'
    const hr = new Date().getHours()
    if (hr < 12) return 'Good morning'
    if (hr < 17) return 'Good afternoon'
    return 'Good evening'
  }, [mounted])

  // Spotlight agent selection (prefer sms-sender or code-explainer, fallback to first)
  const spotlightAgent = useMemo(() => {
    return agents.find(a => a.slug === 'sms-sender') || 
           agents.find(a => a.slug === 'code-explainer') || 
           agents[0]
  }, [agents])

  // Filter agents reactively
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [agents, searchQuery, selectedCategory])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-p-bg flex items-center justify-center font-sans">
        <div className="font-display font-bold text-xl animate-pulse">Loading Marketplace...</div>
      </div>
    )
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
          <SidebarTab icon={<GridIcon />}    active={true} title="Marketplace" href="/agents" />
          <SidebarTab icon={<LayersIcon />}  active={false} title="Agent Dashboard" href="/dashboard?tab=agents" />
          <SidebarTab icon={<ReceiptIcon />} active={false} title="Purchase History" href="/dashboard?tab=purchases" />
          <SidebarTab icon={<BarChartIcon />} active={false} title="Usage Logs" href="/dashboard?tab=logs" />
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
        {/* Header inside Main Area */}
        <header className="h-[72px] md:h-[72px] bg-p-surface border-b-2 border-p-black flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden w-10 h-10 bg-p-red rounded-full border-2 border-p-black flex items-center justify-center text-white hover:scale-105 transition-transform premium-shadow shrink-0">
              <ApertureIcon />
            </Link>
            <h1 className="font-display font-bold text-xl tracking-tight">AgentLab</h1>
            <span className="font-serif italic text-p-black/40 text-base hidden sm:inline">The frontier of autonomous intelligence.</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="w-11 h-11 rounded-full border-2 border-p-black bg-p-surface flex items-center justify-center relative hover:bg-p-lime transition-colors">
              <span className="material-symbols-outlined text-[20px] text-p-black">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-p-red" />
            </button>
          </div>
        </header>

        {/* Scrollable Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="max-w-[1400px] mx-auto space-y-12 pb-16">
            
            {/* Zone A: Greeting */}
            <div>
              <h2 className="font-display font-extrabold text-5xl md:text-6xl text-p-black tracking-tighter leading-none">
                {greeting}, <span className="font-serif italic text-p-blue">{userName.split(' ')[0]}</span>
              </h2>
            </div>

            {/* Zone B: Spotlight Banner */}
            {spotlightAgent && (
              <section className="relative bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-2 border-p-black rounded-[32px] p-8 md:p-10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex overflow-hidden group">
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-p-lime/20 rounded-full blur-[80px] opacity-40 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  <span className="bg-p-red text-white px-3 py-1 rounded-full text-[10px] font-bold w-fit mb-4 border border-p-black">SPOTLIGHT</span>
                  <h3 className="font-display font-bold text-3xl md:text-4xl text-p-black mb-3">{spotlightAgent.name}</h3>
                  <p className="font-sans text-sm text-p-black/60 max-w-md mb-6 leading-relaxed">
                    {spotlightAgent.description}
                  </p>
                  <div className="flex gap-4">
                    <Link 
                      href={`/agents/${spotlightAgent.slug}`}
                      className="bg-p-black text-white font-bold text-xs px-6 py-3.5 border-2 border-p-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider"
                    >
                      Deploy Now
                    </Link>
                    <Link 
                      href={`/agents/${spotlightAgent.slug}`}
                      className="bg-white text-p-black font-bold text-xs px-6 py-3.5 border-2 border-p-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
                <div className="relative z-10 flex-1 hidden md:flex justify-end items-center pr-6 pointer-events-none select-none">
                  <div className={`w-52 h-64 border-2 border-p-black bg-gradient-to-br ${AGENT_THEMES[spotlightAgent.slug]?.gradient ?? 'from-gray-400 to-slate-600'} rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-[12deg] group-hover:rotate-[6deg] transition-transform duration-500 overflow-hidden flex items-center justify-center`}>
                    <span className="text-8xl">{AGENT_THEMES[spotlightAgent.slug]?.icon ?? '🤖'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Zone C: Trending This Week */}
            <section className="space-y-6">
              <div>
                <h4 className="font-display font-bold text-xl md:text-2xl text-p-black uppercase tracking-tight">Trending This Week</h4>
                <p className="font-sans text-xs text-p-black/50">Top performing autonomous micro-agents.</p>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {agents.slice(0, 4).map((agent) => {
                  const theme = AGENT_THEMES[agent.slug] ?? { gradient: 'from-gray-500 to-slate-700', icon: '🤖', color: 'bg-gray-500' }
                  return (
                    <Link
                      key={agent.slug}
                      href={`/agents/${agent.slug}`}
                      className="min-w-[280px] max-w-[280px] bg-white border-2 border-p-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] transition-all flex flex-col gap-4"
                    >
                      <div className={`w-10 h-10 ${theme.color} rounded-lg border-2 border-p-black flex items-center justify-center text-lg`}>
                        {theme.icon}
                      </div>
                      <div>
                        <h5 className="font-display font-bold text-base text-p-black truncate">{agent.name}</h5>
                        <p className="text-[11px] font-sans text-p-black/50 line-clamp-2 mt-1 leading-relaxed">{agent.description}</p>
                      </div>
                      <div className="mt-auto flex justify-between items-center pt-2 border-t border-p-black/5">
                        <span className="text-p-red text-xs font-bold">
                          {agent.is_premium ? `₹${agent.price_inr / 100}/mo` : 'Free'}
                        </span>
                        <span className="bg-p-lime text-p-black px-2 py-0.5 rounded text-[8px] font-bold border border-p-black">ACTIVE</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Zone D: All Agents Grid */}
            <section className="space-y-8">
              
              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t-2 border-p-black/10 pt-8">
                <div className="relative w-full md:w-80 shrink-0">
                  <input 
                    className="w-full bg-white border-2 border-p-black rounded-xl px-10 py-3 font-sans text-xs focus:ring-0 focus:border-p-black shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] transition-all focus:shadow-[4px_4px_0px_0px_rgba(223,46,10,1)]" 
                    placeholder="Search for agents..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-p-black/40 text-[18px]">search</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                  <button 
                    onClick={() => setSelectedCategory('all')}
                    className={`px-5 py-2 border-2 border-p-black rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                      selectedCategory === 'all' ? 'bg-p-black text-white' : 'bg-white text-p-black hover:bg-p-lime'
                    }`}
                  >
                    All Categories
                  </button>
                  <button 
                    onClick={() => setSelectedCategory('ai')}
                    className={`px-5 py-2 border-2 border-p-black rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                      selectedCategory === 'ai' ? 'bg-p-black text-white' : 'bg-white text-p-black hover:bg-p-lime'
                    }`}
                  >
                    AI Agents
                  </button>
                  <button 
                    onClick={() => setSelectedCategory('utility')}
                    className={`px-5 py-2 border-2 border-p-black rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                      selectedCategory === 'utility' ? 'bg-p-black text-white' : 'bg-white text-p-black hover:bg-p-lime'
                    }`}
                  >
                    Utilities
                  </button>
                </div>
              </div>

              {/* Grid */}
              {filteredAgents.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-p-black/20 rounded-3xl p-12 text-center">
                  <p className="text-sm text-p-black/45">No agents match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center w-full mx-auto max-w-[1400px]">
                  {filteredAgents.map((agent, i) => (
                    <AgentCard key={agent.id} agent={agent} index={i} mounted={mounted} />
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Shifting Gold Glow border for premium cards */
        @keyframes borderGlow {
          0% { border-color: #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.2); }
          50% { border-color: #fbbf24; box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), 4px 4px 0 0 #f59e0b; }
          100% { border-color: #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.2); }
        }
        .premium-glow {
          animation: borderGlow 4s infinite ease-in-out;
        }
        
        /* Card background hover gradients */
        .standard-hover-bg {
          background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
          transition: background 0.4s ease;
        }
        .standard-hover-bg:hover {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
        }
        .premium-hover-bg {
          background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
          transition: background 0.4s ease;
        }
        .premium-hover-bg:hover {
          background: linear-gradient(135deg, #ffffff 0%, #fffdf5 100%);
        }

        /* Gold glare reflection effect */
        .gold-shine {
          position: relative;
          overflow: hidden;
        }
        .gold-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -100%;
          width: 40%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.18) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          z-index: 10;
        }
        .gold-shine:hover::after {
          left: 160%;
        }

        /* Hide scrollbars for carousels */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}
