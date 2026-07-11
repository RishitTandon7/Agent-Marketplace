'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  agentSlug: string
  agentName: string
  isPremium: boolean
  priceInr: number
  agentId: string
  initialDeployed: boolean
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/* ─── Portalled Overlay Wrapper ─────────────────────── */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

/* ─── Terminal Loader ────────────────────────────────── */
function TerminalLoader({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,10,0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: 16,
        }}
      >
        <div
          style={{
            background: '#111111',
            border: '1px solid #222',
            borderRadius: 14,
            width: '100%',
            maxWidth: 460,
            overflow: 'hidden',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              background: '#191919',
              borderBottom: '1px solid #222',
              padding: '11px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'block' }} />
            <span style={{ marginLeft: 10, fontSize: 12, color: '#4b5563', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
              agent-deploy
            </span>
          </div>

          {/* Steps */}
          <div style={{ padding: '22px 20px 26px', fontFamily: "'Fira Code', 'Courier New', monospace" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: '20px',
                    color: i < currentStep
                      ? '#16a34a'
                      : i === currentStep && currentStep === steps.length - 1
                      ? '#4ade80'
                      : i === currentStep
                      ? '#facc15'
                      : '#374151',
                    flexShrink: 0,
                    width: 14,
                  }}
                >
                  {i < currentStep || (i === currentStep && currentStep === steps.length - 1) ? '✓' : i === currentStep ? '›' : ' '}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: '20px',
                    color: i === currentStep && currentStep === steps.length - 1
                      ? '#4ade80'
                      : i < currentStep
                      ? '#374151'
                      : i === currentStep
                      ? '#e5e7eb'
                      : '#374151',
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
            {currentStep < steps.length - 1 && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 16,
                  background: '#facc15',
                  marginLeft: 24,
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ─── Success Modal ──────────────────────────────────── */
function SuccessModal({
  agentName,
  agentSlug,
  isPremium,
  priceInr,
  onDismiss,
}: {
  agentName: string
  agentSlug: string
  isPremium: boolean
  priceInr: number
  onDismiss: () => void
}) {
  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,10,0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: 16,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            width: '100%',
            maxWidth: 420,
            padding: '44px 36px 36px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.20)',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Check icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#0a0a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5L9.5 18L20 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Eyebrow */}
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
            {isPremium ? 'Premium License Activated' : 'Free License Activated'}
          </p>

          {/* Title */}
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.03em', margin: '0 0 10px', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.15 }}>
            Agent Activated
          </h2>

          {/* Subtitle */}
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, margin: '0 0 28px' }}>
            <strong style={{ color: '#111827', fontWeight: 600 }}>{agentName}</strong> has been successfully added to your workspace.
          </p>

          {/* Receipt */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', textAlign: 'left', marginBottom: 24 }}>
            {[
              { label: 'Product', value: agentSlug },
              { label: 'Plan', value: isPremium ? 'Premium Monthly' : 'Free Tier' },
              { label: 'Amount', value: isPremium ? `₹${(priceInr / 100).toFixed(2)} / mo` : 'Free' },
              { label: 'Status', value: 'Active', green: true },
            ].map(({ label, value, green }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                <span style={{ color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                <span style={{ color: green ? '#16a34a' : '#111827', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onDismiss}
            style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 11, padding: '14px 20px', fontSize: 14, fontWeight: 700, letterSpacing: '0.03em', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 12 }}
          >
            Go to Dashboard →
          </button>

          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#9ca3af', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </Portal>
  )
}

/* ─── Main Component ─────────────────────────────────── */
export default function DeploymentAction({
  agentSlug,
  agentName,
  isPremium,
  priceInr,
  agentId,
  initialDeployed,
}: Props) {
  const [deployed, setDeployed] = useState(initialDeployed)
  const [loading, setLoading] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Steps defined outside render to avoid re-creation
  const stepsRef = useRef([
    `Initializing container: ${agentSlug}`,
    `Allocating sandbox environment`,
    `Binding route /v1/agents/${agentSlug}/run`,
    `Finalizing JWT access policies`,
    `Container provisioned successfully`,
  ])

  useEffect(() => {
    if (!showTerminal) return
    const steps = stepsRef.current
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval)
          // Delay before switching to success so last step is visible
          setTimeout(() => {
            setShowTerminal(false)
            setShowSuccess(true)
          }, 800)
          return prev
        }
        return prev + 1
      })
    }, 650)
    return () => clearInterval(interval)
  }, [showTerminal])

  const handleDeployFree = async () => {
    setLoading(true)
    setCurrentStep(0)
    setShowTerminal(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/agents/deploy-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug: agentSlug }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Deployment failed')
      }
    } catch (err: any) {
      alert(err.message ?? 'Failed to deploy agent')
      setShowTerminal(false)
      setCurrentStep(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribePremium = async () => {
    setLoading(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load Razorpay checkout')

      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Failed to create subscription')
      }
      const { subscriptionId, keyId } = await res.json()

      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'AgentLab',
        description: `${agentName} — Premium Subscription`,
        image: '/favicon.ico',
        theme: { color: '#0a0a0a' },
        handler: () => setShowSuccess(true),
      })
      rzp.open()
    } catch (err: any) {
      alert(err.message ?? 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setShowSuccess(false)
    setDeployed(true)
    router.refresh()
  }

  if (deployed) {
    return (
      <div className="flex gap-4 w-full md:w-auto">
        <Link href={`/agents/${agentSlug}/playground`} className="flex-1 md:flex-initial text-center bg-p-lime text-p-black border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg premium-shadow hover:bg-p-surface transition-all">
          Open Playground →
        </Link>
        <Link href="/dashboard" className="flex-1 md:flex-initial text-center bg-p-surface text-p-black border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg premium-shadow hover:bg-p-black hover:text-white transition-all">
          Dashboard
        </Link>
      </div>
    )
  }

  return (
    <>
      {isPremium ? (
        <button
          onClick={handleSubscribePremium}
          disabled={loading}
          className="w-full md:w-auto bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-neutral-900 border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] transition-all disabled:opacity-60"
        >
          {loading ? 'Processing…' : `Subscribe ₹${priceInr / 100}/mo`}
        </button>
      ) : (
        <button
          onClick={handleDeployFree}
          disabled={loading}
          className="w-full md:w-auto bg-p-purple text-white border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg premium-shadow hover:bg-p-black transition-all disabled:opacity-60"
        >
          {loading ? 'Working…' : 'Claim Agent'}
        </button>
      )}

      {showTerminal && (
        <TerminalLoader steps={stepsRef.current} currentStep={currentStep} />
      )}

      {showSuccess && (
        <SuccessModal
          agentName={agentName}
          agentSlug={agentSlug}
          isPremium={isPremium}
          priceInr={priceInr}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}
