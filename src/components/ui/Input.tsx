import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-white/10 bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none focus:ring-2 focus:ring-neon-purple/40',
        className
      )}
      {...props}
    />
  )
}

