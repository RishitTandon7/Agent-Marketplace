import { createClient } from './supabase/server'
import { Agent } from '@/types/agent'

export async function getActiveAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching agents:', error)
    return []
  }
  return data as Agent[]
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .single()
    
  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching agent by slug:', error)
    }
    return null
  }
  return data as Agent
}
