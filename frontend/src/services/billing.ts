import { api } from './api'
import type { Plan } from '@/types'

export const billingService = {
  async getPlans(): Promise<{ plans: Plan[] }> {
    const { data } = await api.get<{ plans: Plan[] }>('/billing/plans')
    return data
  },

  async createCheckoutSession(priceId: string): Promise<{ checkout_url: string }> {
    const { data } = await api.post<{ checkout_url: string }>(
      `/billing/create-checkout-session?price_id=${priceId}`
    )
    return data
  },
}
