import { getAgentBySlug } from '@/lib/agents'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeploymentAction from '@/components/DeploymentAction'
import CodeSnippetTabs from '@/components/CodeSnippetTabs'

export const dynamic = 'force-dynamic'

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) notFound()

  // Check if agent is deployed for user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isDeployed = false
  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('agent_id', agent.id)
      .eq('status', 'active')
      .single()
    if (sub) isDeployed = true
  }

  const isPurple = agent.category === 'ai'

  return (
    <div suppressHydrationWarning className="min-h-screen bg-p-bg">
      <div className="premium-grid" />

      {/* ── Nav ── */}
      <header className="relative z-10 border-b-2 border-p-black bg-p-surface/90 backdrop-blur-md sticky top-0">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/agents" className="font-sans font-bold text-sm hover:text-p-blue transition-colors flex items-center gap-2">
            ← Back to Catalog
          </Link>
          <Link href="/dashboard" className="font-sans font-semibold text-sm hover:text-p-blue transition-colors px-4 py-2">
            Agent Dashboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-[1000px] mx-auto px-4 md:px-8 py-16">

        {/* Hero card */}
        <div className="bg-p-surface border-2 border-p-black rounded-3xl overflow-hidden premium-shadow mb-12">
          <div className={`h-36 ${isPurple ? 'bg-p-purple' : 'bg-p-blue'} border-b-2 border-p-black p-8 relative overflow-hidden flex items-end`}>
            {/* Decorative rings */}
            <div className="absolute -bottom-12 -right-12 w-40 h-40 border-2 border-p-black/15 rounded-full" />
            <div className="absolute -bottom-6 -right-6  w-24 h-24 border-2 border-p-black/15 rounded-full" />
            <div className="absolute top-4 right-6 bg-p-surface border-2 border-p-black rounded-full px-3 py-1 font-sans text-xs font-bold">
              {agent.category.toUpperCase()}
            </div>
            <h1 className={`font-display font-bold text-4xl md:text-5xl tracking-tighter ${isPurple ? 'text-p-black' : 'text-white'}`}>
              {agent.name}
            </h1>
          </div>

          <div className="p-8 md:p-12">
            <p className="font-sans text-lg text-p-black/70 leading-relaxed mb-10">
              {agent.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t-2 border-p-black/10 items-end">
              <div>
                <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-2">Pricing</div>
                <div className="font-display font-bold text-4xl tracking-tighter">
                  {agent.is_premium ? `₹${agent.price_inr / 100}` : 'Free'}
                  {agent.is_premium && <span className="text-sm text-p-black/40 font-sans tracking-normal ml-1">/ mo</span>}
                </div>
              </div>

              <div className="flex justify-end">
                <DeploymentAction
                  agentSlug={agent.slug}
                  agentName={agent.name}
                  isPremium={agent.is_premium}
                  priceInr={agent.price_inr}
                  agentId={agent.id}
                  initialDeployed={isDeployed}
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Reference */}
        <div className="space-y-8">
          <h2 className="font-display font-bold text-3xl">API Reference</h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: endpoint and code snippets */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-p-surface border-2 border-p-black rounded-2xl p-6 premium-static">
                <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-3">REST Endpoint</div>
                <code className="block bg-p-bg border-2 border-p-black/10 rounded-xl p-4 font-mono text-sm text-p-black/80 break-all select-all">
                  POST https://agentlab.dev/api/v1/agents/{agent.slug}/run
                </code>
              </div>

              <CodeSnippetTabs slug={agent.slug} inputSchema={agent.input_schema as Record<string, unknown> | null} />
            </div>

            {/* Right side: Schemas */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-p-surface border-2 border-p-black rounded-2xl p-6 premium-static">
                <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-4">Input Schema</div>
                <pre className="font-mono text-xs text-p-black/60 overflow-x-auto whitespace-pre-wrap max-h-48">
                  {agent.input_schema
                    ? JSON.stringify(agent.input_schema, null, 2)
                    : '// No schema defined yet'}
                </pre>
              </div>

              <div className="bg-p-surface border-2 border-p-black rounded-2xl p-6 premium-static">
                <div className="text-[10px] text-p-black/50 uppercase tracking-widest font-bold mb-4">Output Schema</div>
                <pre className="font-mono text-xs text-p-black/60 overflow-x-auto whitespace-pre-wrap max-h-48">
                  {agent.output_schema
                    ? JSON.stringify(agent.output_schema, null, 2)
                    : '// No schema defined yet'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
