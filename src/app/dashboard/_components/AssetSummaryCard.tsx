import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getDday } from "../_utils/dateHelpers"

interface Asset {
  id: string
  name: string
  status: string
  next_inspection_date: string | null
  warranty_expiry_date: string | null
}

interface AssetSummaryCardProps {
  assets: Asset[]
}

export function AssetSummaryCard({ assets }: AssetSummaryCardProps) {
  
  // 카운트 집계
  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'active').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
    retired: assets.filter(a => a.status === 'retired').length,
  }

  // 점검 임박 자산
  const warnings = assets.map(a => {
    const insp = a.next_inspection_date ? getDday(a.next_inspection_date) : null
    const warr = a.warranty_expiry_date ? getDday(a.warranty_expiry_date) : null
    
    let minDday = 9999
    if (insp !== null && insp >= 0 && insp <= 30) minDday = Math.min(minDday, insp)
    if (warr !== null && warr >= 0 && warr <= 30) minDday = Math.min(minDday, warr)
    
    return { ...a, minDday }
  }).filter(a => a.minDday <= 30).sort((a, b) => a.minDday - b.minDday).slice(0, 3)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            자산 현황
          </CardTitle>
          <Link href="/dashboard/assets" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            전체 보기 &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-5">
        
        {/* 요약 그리드 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-50 p-2 rounded text-center">
            <p className="text-[10px] text-slate-500 font-medium">전체</p>
            <p className="text-sm font-bold mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 p-2 rounded text-center">
            <p className="text-[10px] text-emerald-600 font-medium">정상</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{stats.active}</p>
          </div>
          <div className="bg-amber-50 p-2 rounded text-center">
            <p className="text-[10px] text-amber-600 font-medium">점검/수리</p>
            <p className="text-sm font-bold text-amber-700 mt-0.5">{stats.maintenance}</p>
          </div>
          <div className="bg-slate-100 p-2 rounded text-center opacity-60">
            <p className="text-[10px] text-slate-500 font-medium">폐기</p>
            <p className="text-sm font-bold mt-0.5">{stats.retired}</p>
          </div>
        </div>

        {/* 점검 필요 자산 */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            점검 및 갱신 필요 ({warnings.length})
          </p>
          {warnings.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-2">30일 이내 점검이 필요한 자산이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {warnings.map(a => (
                <Link 
                  key={a.id} 
                  href={`/dashboard/assets?highlight=${a.id}`}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium truncate pr-2">{a.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap
                    ${a.minDday <= 14 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    D-{a.minDday}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}