'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/* ─── Google Logo SVG ─── */
function GoogleLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/* ─── Aperture Icon ─── */
function ApertureIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="14.31" y1="8" x2="20.05" y2="17.94"/>
      <line x1="9.69" y1="8" x2="21.17" y2="8"/>
      <line x1="7.38" y1="12" x2="13.12" y2="2.06"/>
      <line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
      <line x1="14.31" y1="16" x2="2.83" y2="16"/>
      <line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
    </svg>
  )
}

export default function LandingClient() {
  const loaderRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const progressTextRef = useRef<HTMLDivElement>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [loaderHidden, setLoaderHidden] = useState(false)

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  // Check session on mount
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  useEffect(() => {
    // Mark body so the loader CSS only hides main/nav on this page
    document.body.classList.add('landing-page')

    const fill = progressFillRef.current
    const text = progressTextRef.current
    if (!fill || !text) return

    const steps = [
      { time: 300,  progress: 25,  stepId: 'step-1', nextId: 'step-2' },
      { time: 800,  progress: 65,  stepId: 'step-2', nextId: 'step-3' },
      { time: 1400, progress: 95,  stepId: 'step-3', nextId: null },
      { time: 1800, progress: 100, stepId: null,     nextId: null },
    ]

    const timers: ReturnType<typeof setTimeout>[] = []

    steps.forEach((stage) => {
      const t = setTimeout(() => {
        fill.style.width = `${stage.progress}%`
        text.innerText = `${stage.progress}%`

        if (stage.stepId) {
          const el = document.getElementById(stage.stepId)
          el?.classList.remove('active')
          el?.classList.add('done')
        }
        if (stage.nextId) {
          document.getElementById(stage.nextId)?.classList.add('active')
        }

        if (stage.progress > 30) {
          fill.classList.replace('bg-p-red', 'bg-p-purple')
          fill.style.backgroundColor = '#E9D5FF'
        }
        if (stage.progress > 70) {
          fill.style.backgroundColor = '#D9F99D'
        }
      }, stage.time)
      timers.push(t)
    })

    const onLoad = () => {
      const hideTimer = setTimeout(() => {
        fill.style.width = '100%'
        text.innerText = '100%'
        setTimeout(() => {
          setLoaderHidden(true)
          document.body.classList.add('page-loaded')
          setTimeout(() => {
            setShowLoader(false)
          }, 800)
        }, 400)
      }, 1900)
      timers.push(hideTimer)
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    return () => {
      timers.forEach(clearTimeout)
      document.body.classList.remove('landing-page')
      document.body.classList.remove('page-loaded')
    }
  }, [])

  return (
    <>
      {/* ── Loading Screen ── */}
      {showLoader && (
        <div
          ref={loaderRef}
          id="loader"
          className={`fixed inset-0 z-[100] bg-p-bg flex flex-col items-center justify-center overflow-hidden ${
            loaderHidden ? 'loader-hidden' : ''
          }`}
        >
        <div className="absolute inset-0 premium-grid opacity-10" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-p-purple/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-p-lime/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" style={{ animationDelay: '-3s' }} />

        <div className="relative z-10 flex flex-col items-center w-full max-w-md px-8">
          <div className="w-24 h-24 bg-p-surface rounded-3xl border-4 border-p-black premium-shadow flex items-center justify-center text-p-red mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-p-red/10 animate-pulse" />
            <ApertureIcon className="w-12 h-12 relative z-10 animate-glitch" />
          </div>

          <h2 className="font-display font-bold text-5xl tracking-tighter text-p-black mb-10">AgentLab</h2>

          <div className="w-full bg-p-surface border-2 border-p-black p-4 rounded-2xl premium-static relative">
            <div className="font-mono text-xs uppercase tracking-wider text-p-black/60 mb-6 flex flex-col gap-2 h-20 justify-end overflow-hidden">
              <div className="loading-step active" id="step-1">
                <span className="text-p-blue mr-2">&gt;</span> Booting kernel environment...
              </div>
              <div className="loading-step" id="step-2">
                <span className="mr-2" style={{ color: '#E9D5FF' }}>&gt;</span> Loading cognitive models...
              </div>
              <div className="loading-step" id="step-3">
                <span className="text-p-lime mr-2">&gt;</span> Establishing secure endpoints...
              </div>
            </div>

            <div className="h-4 w-full bg-p-bg rounded-full border-2 border-p-black overflow-hidden relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0A0A0A 10px, #0A0A0A 20px)' }} />
              <div ref={progressFillRef} id="progress-fill" className="h-full bg-p-red progress-bar-fill relative z-10" style={{ width: '5%', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>

            <div ref={progressTextRef} id="progress-text" className="absolute -right-2 -top-4 bg-p-black text-white text-[10px] font-bold px-2 py-1 rounded-md border-2 border-p-surface font-mono">
              5%
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Nav ── */}
      <nav className="relative z-50 border-b-2 border-p-black bg-p-surface/90 backdrop-blur-md sticky top-0">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-p-red rounded-full border-2 border-p-black premium-shadow flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <ApertureIcon className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight leading-none block">AgentLab</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/agents" className="hidden md:block font-sans font-semibold text-sm hover:text-p-red transition-colors px-4">Browse Agents</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hidden md:block font-sans font-semibold text-sm hover:text-p-blue transition-colors px-4">My Purchases</Link>
            ) : (
              <a href="#pricing" className="hidden md:block font-sans font-semibold text-sm hover:text-p-blue transition-colors px-4">Pricing</a>
            )}
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-p-black text-white border-2 border-p-black rounded-xl px-4 py-2.5 font-display font-bold text-sm sm:text-base premium-shadow hover:bg-p-red flex items-center gap-2 transition-all"
              >
                Agent Dashboard →
              </Link>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="bg-p-surface text-p-black border-2 border-p-black rounded-xl px-4 py-2.5 font-display font-bold text-sm sm:text-base premium-shadow hover:bg-p-bg flex items-center gap-2 transition-all"
              >
                <GoogleLogo />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 flex flex-col">

        {/* Hero */}
        <section className="relative pt-20 pb-32 px-4 md:px-8 overflow-hidden">
          <div className="max-w-[1400px] mx-auto text-center relative z-10">
            <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl tracking-tighter mb-6 leading-[0.9] max-w-5xl mx-auto">
              Plug-in <br className="hidden sm:block" />
              <span className="font-serif-italic text-p-blue pr-4">Intelligence.</span>
            </h1>
            <p className="font-sans text-lg md:text-xl text-p-black/70 leading-relaxed max-w-2xl mx-auto mb-10">
              A marketplace of ready-made AI and utility agents. Test instantly in our live browser playground, then integrate into your own codebase with a single API key.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/agents" className="w-full sm:w-auto bg-p-lime text-p-black border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg md:text-xl premium-shadow hover:bg-p-surface transition-all text-center">
                Browse Agents
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-p-black text-white border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg md:text-xl premium-shadow hover:bg-p-red flex items-center justify-center gap-3 transition-all"
                >
                  Go to Agent Dashboard →
                </Link>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full sm:w-auto bg-p-surface text-p-black border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg md:text-xl premium-shadow hover:bg-p-bg flex items-center justify-center gap-3 transition-all"
                >
                  <GoogleLogo className="w-6 h-6" />
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-20 left-10 w-32 h-32 bg-p-purple/30 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" />
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-p-lime/30 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" style={{ animationDelay: '-2s' }} />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 px-4 md:px-8 border-y-2 border-p-black bg-p-surface">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight mb-4">
                From zero to <span className="font-serif-italic text-p-red">deployed.</span>
              </h2>
              <p className="font-sans text-p-black/60 text-lg">Integrate powerful capabilities in minutes, not months.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-p-black/20 -z-10 -translate-y-1/2" />

              {[
                { num: '1', bg: 'bg-p-purple', title: 'Browse Catalog', desc: 'Discover specialized agents tailored for data parsing, web automation, security, and more.' },
                { num: '2', bg: 'bg-p-lime',   title: 'Test Instantly',  desc: 'Try any agent immediately in our interactive playground without writing code or providing a credit card.' },
                { num: '3', bg: 'bg-p-blue text-white', title: 'Subscribe & Integrate', desc: 'Get your secure API key. Every agent runs in a dedicated container, ready to scale with your app.' },
              ].map((step) => (
                <div key={step.num} className="bg-p-surface border-2 border-p-black rounded-3xl p-8 premium-static flex flex-col items-center text-center">
                  <div className={`w-16 h-16 ${step.bg} border-2 border-p-black rounded-2xl flex items-center justify-center premium-shadow mb-6 text-2xl font-display font-bold`}>
                    {step.num}
                  </div>
                  <h3 className="font-display font-bold text-2xl mb-3">{step.title}</h3>
                  <p className="font-sans text-p-black/70 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Agents */}
        <section id="featured-agents" className="py-24 px-4 md:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
              <div className="max-w-2xl">
                <h2 className="font-display font-bold text-5xl md:text-7xl tracking-tighter mb-4 leading-[0.9]">
                  Featured <br />
                  <span className="font-serif-italic text-p-black/40 pr-4">Catalog.</span>
                </h2>
              </div>
              <Link href="/agents" className="font-sans font-bold text-p-black hover:text-p-blue flex items-center gap-2 border-b-2 border-p-black pb-1 transition-colors">
                View all agents →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {/* Card 1 — Free */}
              <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow flex flex-col group relative">
                <div className="h-48 bg-p-lime border-b-2 border-p-black p-6 relative overflow-hidden flex justify-between items-start">
                  <div className="bg-p-surface border-2 border-p-black rounded-full px-3 py-1 font-sans text-xs font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-p-black" /> v2.4.1
                  </div>
                  <div className="bg-p-surface border-2 border-p-black rounded-full w-10 h-10 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.912 5.813L19.5 9.75l-4.769 3.67L16.5 19.5 12 16.5l-4.5 3-1.769-6.08L1.5 9.75l5.588-.937z"/></svg>
                  </div>
                  <svg className="absolute -bottom-10 -right-10 w-48 h-48 opacity-20 text-p-black transform group-hover:rotate-12 transition-transform duration-700" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="20"/><path d="M50 10 L50 90 M10 50 L90 50"/>
                  </svg>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1 bg-p-surface">
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-3xl tracking-tight mb-2">Text Summarizer</h3>
                    <p className="font-serif-italic text-lg text-p-black/60">AI Summarization</p>
                  </div>
                  <p className="font-sans text-sm text-p-black/70 leading-relaxed mb-8 flex-1">
                    Distills long-form content into concise bullet points. Powered by Claude for ultra-accurate summaries on any text or document.
                  </p>
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Context</div>
                      <div className="font-display font-bold text-lg">200k</div>
                    </div>
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Latency</div>
                      <div className="font-display font-bold text-lg">~1s</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-display font-bold text-3xl tracking-tighter text-p-black">Free</div>
                    <Link href="/agents/text-summarizer" className="flex-1 text-center bg-p-black text-white border-2 border-p-black rounded-xl py-3 font-display font-bold text-lg premium-shadow hover:bg-p-surface hover:text-p-black transition-all">
                      Try it Free
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 2 — Most Popular */}
              <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow flex flex-col group relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-p-black text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full border-2 border-p-surface z-20 shadow-xl whitespace-nowrap">
                  Most Popular
                </div>
                <div className="h-48 bg-p-blue border-b-2 border-p-black p-6 relative overflow-hidden flex justify-between items-start">
                  <div className="bg-p-surface border-2 border-p-black rounded-full px-3 py-1 font-sans text-xs font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-p-black" /> v4.0.0
                  </div>
                  <div className="bg-p-surface border-2 border-p-black rounded-full w-10 h-10 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <svg className="absolute -bottom-8 -right-8 w-48 h-48 opacity-20 text-white transform group-hover:scale-110 transition-transform duration-700" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="20" y="20" width="60" height="60" rx="10"/><circle cx="50" cy="50" r="10" fill="#2463EB"/>
                  </svg>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1 bg-p-surface">
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-3xl tracking-tight mb-2 text-p-blue">SMS Sender</h3>
                    <p className="font-serif-italic text-lg text-p-black/60">Messaging Utility</p>
                  </div>
                  <p className="font-sans text-sm text-p-black/70 leading-relaxed mb-8 flex-1">
                    Send SMS to any number via a clean REST API. Perfect for OTPs, notifications, and automated alert pipelines with delivery receipts.
                  </p>
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Delivery</div>
                      <div className="font-display font-bold text-lg">99.9%</div>
                    </div>
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Latency</div>
                      <div className="font-display font-bold text-lg">&lt;500ms</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-display font-bold text-3xl tracking-tighter text-p-blue">₹99<span className="text-sm text-p-black/40 font-sans">/mo</span></div>
                    <Link href="/agents/sms-sender" className="flex-1 text-center bg-p-blue text-white border-2 border-p-black rounded-xl py-3 font-display font-bold text-lg premium-shadow hover:bg-p-black transition-all">
                      View Agent
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 3 — Premium */}
              <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow flex flex-col group relative md:col-span-2 lg:col-span-1 md:w-1/2 lg:w-full md:mx-auto lg:mx-0">
                <div className="h-48 bg-p-purple border-b-2 border-p-black p-6 relative overflow-hidden flex justify-between items-start">
                  <div className="bg-p-surface border-2 border-p-black rounded-full px-3 py-1 font-sans text-xs font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-p-black" /> Coming Soon
                  </div>
                  <div className="bg-p-surface border-2 border-p-black rounded-full w-10 h-10 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </div>
                  <svg className="absolute -bottom-12 -right-4 w-56 h-56 opacity-30 text-p-black animate-[float_6s_ease-in-out_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                    <polygon points="50 15, 85 35, 85 75, 50 95, 15 75, 15 35"/>
                    <polygon points="50 35, 65 45, 65 65, 50 75, 35 65, 35 45"/>
                  </svg>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1 bg-p-surface">
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-3xl tracking-tight mb-2">More Agents</h3>
                    <p className="font-serif-italic text-lg text-p-black/60">Expanding Catalog</p>
                  </div>
                  <p className="font-sans text-sm text-p-black/70 leading-relaxed mb-8 flex-1">
                    Data extractors, code reviewers, image analyzers, translation engines, and more — being added continuously to the marketplace.
                  </p>
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Growing</div>
                      <div className="font-display font-bold text-lg">Fast</div>
                    </div>
                    <div className="flex-1 border-t border-p-black/10 pt-3">
                      <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-1">Notify</div>
                      <div className="font-display font-bold text-lg">Soon</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                    <div className="font-display font-bold text-3xl tracking-tighter w-full sm:w-auto">
                      ₹99<span className="text-sm text-p-black/40 font-sans tracking-normal block -mt-1">/ mo+</span>
                    </div>
                    <Link href="/agents" className="w-full sm:flex-1 text-center bg-p-surface text-p-black border-2 border-p-black rounded-xl py-3 font-display font-bold text-lg premium-shadow hover:bg-p-purple transition-all">
                      See All
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Benefits / Engineered for devs */}
        <section id="benefits" className="py-24 px-4 md:px-8 border-y-2 border-p-black bg-p-red/5">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              <div className="order-2 lg:order-1">
                <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tighter mb-8 leading-tight">
                  Engineered for <br />
                  <span className="font-serif-italic text-p-red">developers.</span>
                </h2>
                <div className="space-y-8">
                  {[
                    { title: 'Isolated Containers', desc: 'Every agent you run spins up in a secure, dedicated sandbox ensuring data privacy and zero cross-contamination.' },
                    { title: 'Instant No-Signup Playground', desc: 'Test prompts and payloads directly in the browser before you write a single line of code or create an account.' },
                    { title: 'One API Key to Rule Them All', desc: 'Stop juggling credentials for different AI providers. AgentLab gives you a unified Bearer Token for all your active agents.' },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4 items-start">
                      <div className="w-12 h-12 bg-p-surface border-2 border-p-black rounded-xl flex items-center justify-center premium-shadow shrink-0 mt-1">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xl mb-2">{item.title}</h4>
                        <p className="font-sans text-p-black/70 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-1 lg:order-2 bg-p-surface border-2 border-p-black rounded-3xl p-6 premium-static relative overflow-hidden h-[400px] flex items-center justify-center">
                <div className="absolute inset-0 premium-grid opacity-20" />
                <div className="w-full max-w-sm bg-p-black rounded-2xl border-2 border-p-black premium-shadow relative z-10 overflow-hidden transform rotate-2">
                  <div className="h-8 border-b border-white/20 flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-p-red" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-p-lime" />
                  </div>
                  <div className="p-6 font-mono text-sm text-p-surface/70 leading-relaxed">
                    <span className="text-p-purple">const</span> agent = <span className="text-p-blue">await</span> AgentLab.<span className="text-p-lime">connect</span>({'{'}<br />
                    &nbsp;&nbsp;id: <span className="text-amber-400">&apos;text-summarizer&apos;</span>,<br />
                    &nbsp;&nbsp;key: process.env.<span className="text-white">AG_TOKEN</span><br />
                    {'}'});<br /><br />
                    <span className="text-p-surface/40">// Ready for deployment</span><br />
                    agent.<span className="text-p-lime">execute</span>(payload);
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-p-surface border-2 border-p-black rounded-2xl premium-shadow mb-8">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>
            </div>
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight mb-6">Developer-First Pricing.</h2>
            <p className="font-sans text-xl text-p-black/70 leading-relaxed mb-12">
              Most agents in our catalog are <strong className="text-p-black font-bold">free forever</strong> to use within reasonable limits. Premium specialized agents unlock with a simple, flat monthly subscription billed securely in INR (₹).
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-p-surface border-2 border-p-black rounded-3xl p-8 premium-static">
              <div className="flex-1 flex flex-col items-center border-b-2 sm:border-b-0 sm:border-r-2 border-p-black/10 pb-6 sm:pb-0 sm:pr-6">
                <span className="font-display font-bold text-5xl text-p-black mb-2">Free</span>
                <span className="font-sans text-sm text-p-black/60 uppercase tracking-wider font-bold">Standard Agents</span>
              </div>
              <div className="flex-1 flex flex-col items-center pt-6 sm:pt-0 sm:pl-6">
                <span className="font-display font-bold text-5xl text-p-black mb-2 flex items-start">
                  <span className="text-2xl mt-1 opacity-50 mr-1">₹</span>99<span className="text-xl mt-3 opacity-50 font-sans tracking-normal">/mo+</span>
                </span>
                <span className="font-sans text-sm text-p-black/60 uppercase tracking-wider font-bold">Premium Agents</span>
              </div>
            </div>
            <p className="text-sm font-sans text-p-black/50 mt-6">No hidden usage fees. Cancel your subscription at any time.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 md:px-8 bg-p-black text-p-surface border-t-2 border-p-black relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 premium-grid" style={{ opacity: 1 }} />
          </div>
          <div className="max-w-[1400px] mx-auto text-center relative z-10 flex flex-col items-center">
            <h2 className="font-display font-bold text-5xl md:text-7xl tracking-tighter mb-8 leading-[0.9]">
              Start building with <br />
              <span className="font-serif-italic text-p-lime pr-4">AgentLab.</span>
            </h2>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-p-lime text-p-black border-2 border-p-lime rounded-xl px-8 py-5 font-display font-bold text-xl premium-shadow hover:bg-p-surface hover:border-p-surface flex items-center justify-center gap-3 transition-all"
              >
                Go to Agent Dashboard →
              </Link>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="bg-p-lime text-p-black border-2 border-p-lime rounded-xl px-8 py-5 font-display font-bold text-xl premium-shadow hover:bg-p-surface hover:border-p-surface flex items-center justify-center gap-3 transition-all"
              >
                <GoogleLogo className="w-6 h-6" />
                Sign in with Google
              </button>
            )}
            <p className="font-sans text-sm text-p-surface/50 mt-6">One click. No credit card required to explore.</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-p-surface border-t-2 border-p-black py-12 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 grayscale opacity-80">
            <div className="w-8 h-8 bg-p-black rounded-full flex items-center justify-center text-white">
              <ApertureIcon className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight leading-none text-p-black block">AgentLab</span>
          </div>
          <div className="flex gap-6 font-sans text-sm font-semibold text-p-black/60">
            <a href="#" className="hover:text-p-black transition-colors">Documentation</a>
            <a href="#" className="hover:text-p-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-p-black transition-colors">Terms</a>
          </div>
          <div className="font-sans text-xs text-p-black/40">&copy; 2026 AgentLab Inc. Built for builders.</div>
        </div>
      </footer>
    </>
  )
}
