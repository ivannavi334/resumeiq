import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, X, Zap, Building2 } from 'lucide-react'
import { billingService } from '@/services/billing'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { stripePromise } from '@/lib/stripe'
import type { Plan } from '@/types'

type FeatureRow = { label: string; free: boolean | string; pro: boolean | string; enterprise: boolean | string }

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Resume analyses / month', free: '3', pro: '50', enterprise: 'Unlimited' },
  { label: 'ATS compatibility score', free: true, pro: true, enterprise: true },
  { label: 'Job description matching', free: false, pro: true, enterprise: true },
  { label: 'Keyword gap analysis', free: false, pro: true, enterprise: true },
  { label: 'Detailed improvement tips', free: false, pro: true, enterprise: true },
  { label: 'API access', free: false, pro: false, enterprise: true },
  { label: 'Team management', free: false, pro: false, enterprise: true },
  { label: 'Dedicated support', free: false, pro: false, enterprise: true },
]

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span className="text-sm font-semibold text-gray-900">{value}</span>
  return value
    ? <Check className="mx-auto h-5 w-5 text-green-500" />
    : <X className="mx-auto h-5 w-5 text-gray-300" />
}

export function BillingPage() {
  const { profile } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: billingService.getPlans,
  })

  const proPlan = data?.plans.find((p: Plan) => p.id === 'pro')
  const enterprisePlan = data?.plans.find((p: Plan) => p.id === 'enterprise')

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      await stripePromise
      return billingService.createCheckoutSession(priceId)
    },
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url },
  })

  const currentPlan = profile?.plan ?? 'free'

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="mt-2 text-gray-500">Start for free. Upgrade when you need more.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        {/* Column headers */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 bg-gray-50">
          <div className="py-5 px-6 text-sm font-medium text-gray-500">Features</div>

          {/* Free */}
          <div className="py-5 px-6 text-center">
            <p className="text-base font-semibold text-gray-900">Free</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">$0</p>
            <p className="text-xs text-gray-400">forever</p>
            {currentPlan === 'free' && <div className="mt-2"><Badge variant="default">Current</Badge></div>}
          </div>

          {/* Pro */}
          <div className="relative py-5 px-6 text-center bg-indigo-50">
            <Badge variant="purple" className="absolute right-2 top-2 text-xs">Popular</Badge>
            <p className="text-base font-semibold text-indigo-700">Pro</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">$9<span className="text-sm font-normal text-gray-500">/mo</span></p>
            <p className="text-xs text-gray-400">billed monthly</p>
            {currentPlan === 'pro' && <div className="mt-2"><Badge variant="purple">Current</Badge></div>}
          </div>

          {/* Enterprise */}
          <div className="py-5 px-6 text-center bg-gray-900">
            <p className="text-base font-semibold text-white">Enterprise</p>
            <p className="mt-1 text-2xl font-bold text-white">$99<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gray-500">billed monthly</p>
            {currentPlan === 'enterprise' && <div className="mt-2"><Badge variant="default">Current</Badge></div>}
          </div>
        </div>

        {/* Feature rows */}
        <div className="divide-y divide-gray-100">
          {FEATURE_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-4 divide-x divide-gray-100">
              <div className="py-3.5 px-6 text-sm text-gray-700">{row.label}</div>
              <div className="py-3.5 px-6 text-center"><Cell value={row.free} /></div>
              <div className="py-3.5 px-6 text-center bg-indigo-50/50"><Cell value={row.pro} /></div>
              <div className="py-3.5 px-6 text-center bg-gray-900/5"><Cell value={row.enterprise} /></div>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50">
          <div className="py-5 px-6" />

          {/* Free CTA */}
          <div className="py-5 px-6 flex justify-center items-center">
            {currentPlan === 'free'
              ? <span className="text-sm text-gray-400 italic">Your plan</span>
              : <span className="text-sm text-gray-400">—</span>}
          </div>

          {/* Pro CTA */}
          <div className="py-5 px-6 flex justify-center bg-indigo-50">
            {currentPlan === 'pro' || currentPlan === 'enterprise' ? (
              <Button variant="secondary" disabled className="w-full">
                {currentPlan === 'pro' ? 'Current Plan' : 'Included'}
              </Button>
            ) : (
              <Button
                className="w-full gap-2"
                loading={checkoutMutation.isPending}
                disabled={!proPlan?.stripe_price_id}
                onClick={() => proPlan?.stripe_price_id && checkoutMutation.mutate(proPlan.stripe_price_id)}
              >
                <Zap className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Enterprise CTA */}
          <div className="py-5 px-6 flex justify-center bg-gray-900/5">
            {currentPlan === 'enterprise' ? (
              <Button variant="secondary" disabled className="w-full">Current Plan</Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full gap-2 bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
                loading={checkoutMutation.isPending}
                disabled={!enterprisePlan?.stripe_price_id}
                onClick={() => enterprisePlan?.stripe_price_id && checkoutMutation.mutate(enterprisePlan.stripe_price_id)}
              >
                <Building2 className="h-4 w-4" />
                Upgrade to Enterprise
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
