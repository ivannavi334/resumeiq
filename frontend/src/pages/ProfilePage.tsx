import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useState } from 'react'

const passwordSchema = z.object({
  new_password: z.string().min(8, 'At least 8 characters'),
  confirm_password: z.string().min(8),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type PasswordForm = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const { user, profile } = useAuthStore()
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordForm) => {
    try {
      setError('')
      await authService.changePassword(data.new_password)
      setSuccess('Password updated successfully!')
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password')
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-900">Account Info</h2></CardHeader>
        <CardBody className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium capitalize text-gray-900">{profile?.plan ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Analyses this month</span>
            <span className="font-medium text-gray-900">{profile?.analyses_used_this_month ?? 0}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-900">Change Password</h2></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="New Password" type="password" {...register('new_password')} error={errors.new_password?.message} />
            <Input label="Confirm Password" type="password" {...register('confirm_password')} error={errors.confirm_password?.message} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" loading={isSubmitting}>Update Password</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
