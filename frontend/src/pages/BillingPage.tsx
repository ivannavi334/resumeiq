import { useQuery, useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { billingService } from '@/services/billing'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Plan } from '@/types'

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return 'Free'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

export function BillingPage() {
  const { profile } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: billingService.getPlans,
  })

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => billingService.createCheckoutSession(priceId),
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url },
  })

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading plans…</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plans & Billing</h1>
        <p className="mt-1 text-gray-500">Choose a plan that works for you</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {data?.plans.map((plan: Plan) => {
          const isCurrent = profile?.plan === plan.id
          const isPro = plan.id === 'pro'
          return (
            <Card key={plan.id} className={isPro ? 'border-indigo-500 ring-2 ring-indigo-500' : ''}>
              <CardHeader className="relative">
                {isPro && (
                  <Badge variant="purple" className="absolute right-4 top-4">Most Popular</Badge>
                )}
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price, plan.currency)}
                  {plan.price > 0 && <span className="text-base font-normal text-gray-500">/{plan.interval}</span>}
                </p>
              </CardHeader>
              <CardBody>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>Current Plan</Button>
                  ) : plan.price === 0 ? (
                    <Button variant="outline" className="w-full" disabled>Free Plan</Button>
                  ) : (
                    <Button
                      className="w-full"
                      loading={checkoutMutation.isPending}
                      onClick={() => plan.stripe_price_id && checkoutMutation.mutate(plan.stripe_price_id)}
                      disabled={!plan.stripe_price_id}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
