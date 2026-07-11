import { getActiveAgents } from '@/lib/agents'
import { createClient } from '@/lib/supabase/server'
import CatalogClient from '@/components/CatalogClient'

export const dynamic = 'force-dynamic'

export default async function AgentsCatalogPage() {
  const agents = await getActiveAgents()
  
  // Get active session user details
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userName = 'Developer'
  let userEmail = ''
  let userAvatar: string | null = null

  if (user) {
    userEmail = user.email ?? ''
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()
      
    userName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Developer'
    userAvatar = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null
  }

  return (
    <CatalogClient 
      agents={agents} 
      userName={userName} 
      userEmail={userEmail} 
      userAvatar={userAvatar} 
    />
  )
}
