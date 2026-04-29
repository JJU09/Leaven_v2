import { CheckCircle2, ArrowRight } from 'lucide-react'

interface Recommendation {
  title: string
  description: string
}

interface RecommendationListProps {
  items: Recommendation[]
}

export function RecommendationList({ items }: RecommendationListProps) {
  if (!items || items.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-primary flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5" />
        AI 액션 제안
      </h3>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
              {index + 1}
            </div>
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2">
                {item.title}
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}