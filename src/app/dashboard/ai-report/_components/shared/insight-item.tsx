import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InsightType = 'warning' | 'good' | 'bad' | 'info'

interface InsightItemProps {
  type: InsightType
  text: string
}

export function InsightItem({ type, text }: InsightItemProps) {
  const config = {
    warning: {
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-900/50'
    },
    good: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200 dark:border-emerald-900/50'
    },
    bad: {
      icon: XCircle,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/20',
      borderColor: 'border-rose-200 dark:border-rose-900/50'
    },
    info: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-900/50'
    }
  }

  const { icon: Icon, color, bgColor, borderColor } = config[type] || config.info

  return (
    <div className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border text-[13px]", bgColor, borderColor)}>
      <Icon className={cn("w-4 h-4 shrink-0 mt-[2px]", color)} />
      <span className="text-foreground leading-snug">{text}</span>
    </div>
  )
}