import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: Props) {
  return <div className={cn('rounded-xl border border-white/10 bg-surface', className)} {...props} />
}

