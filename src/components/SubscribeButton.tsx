'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  agentSlug: string
  agentName: string
  priceInr: number
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
    script.id  = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function SubscribeButton({ agentSlug, agentName, priceInr }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load Razorpay checkout')

      // 2. Create subscription server-side
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

      // 3. Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key:             keyId,
        subscription_id: subscriptionId,
        name:            'AgentLab',
        description:     `${agentName} — Monthly Subscription`,
        image:           '/favicon.ico',
        theme:           { color: '#FF4522' },
        handler: () => {
          // Payment confirmed — refresh to show active subscription
          router.refresh()
        },
      })
      rzp.open()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full md:w-auto bg-p-blue text-white border-2 border-p-black rounded-xl px-8 py-4 font-display font-bold text-lg premium-shadow hover:bg-p-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? 'Loading...' : `Subscribe ₹${priceInr / 100}/mo`}
    </button>
  )
}
