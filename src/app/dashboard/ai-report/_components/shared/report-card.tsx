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
    <Card className={cn("overflow-hidden border shadow-sm", className)}>
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          {title}
        </CardTitle>
        {summary && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {summary}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  )
}