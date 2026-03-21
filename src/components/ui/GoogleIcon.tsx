import { cn } from '@/lib/utils'

export function GoogleIcon({ className }: { className?: string }) {
  return <img src="/images/google-g-logo.svg" alt="Google" className={cn('w-4 h-4', className)} />
}
