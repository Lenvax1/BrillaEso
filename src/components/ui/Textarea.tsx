import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none focus:ring-2 focus:ring-neon-purple/40',
        className
      )}
      {...props}
    />
  )
}

