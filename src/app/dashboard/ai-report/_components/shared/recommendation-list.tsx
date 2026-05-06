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
    <div className="space-y-2">
      <h3 className="font-semibold text-[14px] text-primary flex items-center gap-1.5 mb-2">
        <CheckCircle2 className="w-4 h-4" />
        AI 액션 제안
      </h3>
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-[2px]">
              {index + 1}
            </div>
            <div>
              <h4 className="font-medium text-[13px] flex items-center gap-1 mb-0.5">
                {item.title}
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </h4>
              <p className="text-[12px] text-muted-foreground leading-tight line-clamp-2">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
