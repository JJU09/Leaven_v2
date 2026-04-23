import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: number | string
  total?: number | string
  subText?: string
  subType?: 'ok' | 'warn' | 'danger'
  icon: LucideIcon
  iconClassName?: string
}

export function MetricCard({ 
  title, 
  value, 
  total, 
  subText, 
  subType = 'ok',
  icon: Icon,
  iconClassName
}: MetricCardProps) {
  
  const subTextColors = {
    ok: "text-slate-500",
    warn: "text-amber-500",
    danger: "text-red-500"
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <Icon className={`h-4 w-4 ${iconClassName || 'text-slate-400'}`} />
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <div className="text-3xl font-bold">{value}</div>
          {total !== undefined && (
            <div className="text-xl font-medium text-slate-400">/ {total}</div>
          )}
        </div>
        {subText && (
          <p className={`text-xs mt-1 font-medium ${subTextColors[subType]}`}>
            {subText}
          </p>
        )}
      </CardContent>
    </Card>
  )
}