import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
        variant === 'primary' && 'bg-neon-green text-bg hover:shadow-glowGreen',
        variant === 'secondary' && 'border border-white/10 bg-transparent text-text-primary hover:bg-white/5',
        variant === 'ghost' && 'bg-transparent text-text-primary hover:bg-white/5',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110',
        className
      )}
      {...props}
    />
  )
}

