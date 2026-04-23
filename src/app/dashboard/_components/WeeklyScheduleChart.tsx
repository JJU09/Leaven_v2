import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"

interface WeeklyScheduleChartProps {
  data: {
    monday: number
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
  }
}

export function WeeklyScheduleChart({ data }: WeeklyScheduleChartProps) {
  const maxCount = Math.max(
    data.monday, data.tuesday, data.wednesday, data.thursday, data.friday, 1 // Avoid divide by zero
  )
  
  const today = new Date().getDay()
  
  const days = [
    { label: '월', key: 'monday', value: data.monday, isToday: today === 1 },
    { label: '화', key: 'tuesday', value: data.tuesday, isToday: today === 2 },
    { label: '수', key: 'wednesday', value: data.wednesday, isToday: today === 3 },
    { label: '목', key: 'thursday', value: data.thursday, isToday: today === 4 },
    { label: '금', key: 'friday', value: data.friday, isToday: today === 5 },
  ]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          이번 주 근무 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-4">
          {days.map((day) => {
            const widthPercentage = Math.max((day.value / maxCount) * 100, 2)
            
            return (
              <div key={day.key} className="flex items-center gap-3">
                <div className="w-8 text-sm font-medium text-slate-500 text-right">
                  {day.label}
                </div>
                <div className="flex-1 h-8 bg-slate-100 rounded-md relative flex items-center overflow-hidden">
                  <div 
                    className={`h-full flex items-center px-3 transition-all duration-500 ${
                      day.isToday ? 'bg-[#185FA5] text-white' : 'bg-[#B5D4F4] text-slate-700'
                    }`}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    {day.value > 0 && <span className="text-xs font-semibold">{day.value}명</span>}
                  </div>
                </div>
                <div className="w-8 text-sm font-semibold text-slate-700">
                  {day.value}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}