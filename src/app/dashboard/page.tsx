import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch active agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  // Fetch user's active subscriptions with joined agent details
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, agent:agents(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const subscribedAgentIds = (subscriptions ?? []).map(s => s.agent_id)

  return (
    <DashboardClient
      userEmail={user.email ?? ''}
      userAvatar={user.user_metadata?.avatar_url ?? null}
      userName={user.user_metadata?.full_name ?? user.email ?? ''}
      initialAgents={agents ?? []}
      subscribedAgentIds={subscribedAgentIds}
      subscriptions={subscriptions ?? []}
    />
  )
}
