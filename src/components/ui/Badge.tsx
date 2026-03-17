import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'green' | 'purple' | 'danger'
}

export function Badge({ className, tone = 'neutral', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs',
        tone === 'neutral' && 'border-white/10 bg-white/5 text-text-secondary',
        tone === 'green' && 'border-neon-green/30 bg-neon-green/10 text-neon-green',
        tone === 'purple' && 'border-neon-purple/30 bg-neon-purple/10 text-neon-purple',
        tone === 'danger' && 'border-danger/40 bg-danger/10 text-danger',
        className
      )}
      {...props}
    />
  )
}

