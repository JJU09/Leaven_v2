import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, AlertTriangle, Receipt } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { getDday } from "../_utils/dateHelpers"

interface Vendor {
  id: string
  name: string
  contract_end_date: string | null
  is_auto_renewal: boolean
  contract_type: string | null
}

interface Transaction {
  id: string
  vendor_id: string
  amount: number
  payment_status: string
  transaction_date: string
  vendors: { name: string } | { name: string }[] | null
}

interface VendorSummaryCardProps {
  vendors: Vendor[]
  transactions: Transaction[]
}

export function VendorSummaryCard({ vendors, transactions }: VendorSummaryCardProps) {
  
  // 만료 임박 거래처
  const expiringVendors = vendors.map(v => {
    if (v.is_auto_renewal || !v.contract_end_date) return null
    const dday = getDday(v.contract_end_date)
    return dday !== null && dday >= 0 && dday <= 30 ? { ...v, dday } : null
  }).filter((v): v is (Vendor & { dday: number }) => v !== null)
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 3)

  const stats = {
    total: vendors.length,
    expiring: expiringVendors.length,
    unpaid: transactions.length
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            거래처 현황
          </CardTitle>
          <Link href="/dashboard/vendors" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            전체 보기 &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-5">
        
        {/* 요약 그리드 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 p-2 rounded text-center">
            <p className="text-[10px] text-slate-500 font-medium">전체 거래처</p>
            <p className="text-sm font-bold mt-0.5">{stats.total}</p>
          </div>
          <div className={`${stats.expiring > 0 ? 'bg-amber-50' : 'bg-slate-50'} p-2 rounded text-center`}>
            <p className={`text-[10px] ${stats.expiring > 0 ? 'text-amber-600' : 'text-slate-500'} font-medium`}>만료 임박</p>
            <p className={`text-sm font-bold ${stats.expiring > 0 ? 'text-amber-700' : ''} mt-0.5`}>{stats.expiring}</p>
          </div>
          <div className={`${stats.unpaid > 0 ? 'bg-red-50' : 'bg-slate-50'} p-2 rounded text-center`}>
            <p className={`text-[10px] ${stats.unpaid > 0 ? 'text-red-600' : 'text-slate-500'} font-medium`}>미결제</p>
            <p className={`text-sm font-bold ${stats.unpaid > 0 ? 'text-red-700' : ''} mt-0.5`}>{stats.unpaid}</p>
          </div>
        </div>

        <div className="flex-1 grid grid-rows-2 gap-4">
          {/* 계약 만료 임박 */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              계약 만료 임박 ({stats.expiring})
            </p>
            {expiringVendors.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-1">만료 임박한 계약이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {expiringVendors.map(v => (
                  <Link 
                    key={v.id} 
                    href={`/dashboard/vendors?highlight=${v.id}`}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-sm font-medium">{v.name}</span>
                      {v.contract_type && <span className="text-xs text-slate-500">{v.contract_type}</span>}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0
                      ${v.dday <= 14 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      D-{v.dday}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 최근 미결제 내역 */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-red-500" />
              최근 미결제 내역 ({stats.unpaid})
            </p>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-1">미결제 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(t => {
                  const vendorsData = t.vendors
                  const vendorName = Array.isArray(vendorsData) 
                    ? vendorsData[0]?.name 
                    : vendorsData?.name || '알 수 없음'
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border border-red-100 bg-red-50/30">
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-sm font-medium">{vendorName}</span>
                        <span className="text-xs text-slate-500">{format(new Date(t.transaction_date), 'MM/dd')}</span>
                      </div>
                      <span className="text-sm font-bold text-red-600 whitespace-nowrap shrink-0">
                        {t.amount.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}