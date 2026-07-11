export interface Agent {
  id: string
  name: string
  slug: string
  description: string
  category: 'ai' | 'utility'
  is_premium: boolean
  price_inr: number
  docker_image?: string
  runtime_url?: string
  razorpay_plan_id?: string
  deployment_env: string
  input_schema?: Record<string, any>
  output_schema?: Record<string, any>
  active: boolean
  created_at: string
}
