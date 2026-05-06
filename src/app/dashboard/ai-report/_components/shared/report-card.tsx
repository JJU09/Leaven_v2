import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ReportCardProps {
  title: string
  icon?: ReactNode
  summary?: string
  className?: string
  children: ReactNode
}

export function ReportCard({ title, icon, summary, className, children }: ReportCardProps) {
  return (
    <Card className={cn("overflow-hidden border shadow-sm h-full flex flex-col", className)}>
      <CardHeader className="bg-muted/30 pb-2.5 pt-2.5 px-3 flex-none">
        <CardTitle className="text-[14px] flex items-center gap-1.5">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          {title}
        </CardTitle>
        {summary && (
          <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
            {summary}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-2 px-3 pb-2 flex-1">
        {children}
      </CardContent>
    </Card>
  )
}
