import { getAgentBySlug } from '@/lib/agents'
import { notFound } from 'next/navigation'
import PlaygroundClient from '@/components/PlaygroundClient'

export const dynamic = 'force-dynamic'

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) notFound()

  // Only free agents have an open playground; premium agents need subscription
  // (the client handles the 403 gracefully anyway)
  return <PlaygroundClient agent={agent} />
}
