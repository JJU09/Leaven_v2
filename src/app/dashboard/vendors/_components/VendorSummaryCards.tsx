import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, AlertTriangle, CreditCard, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface VendorSummaryCardsProps {
  totalVendors: number;
  monthTotalAmount: number;
  unpaidCount: number;
  expiringCount: number;
}

export function VendorSummaryCards({
  totalVendors,
  monthTotalAmount,
  unpaidCount,
  expiringCount,
}: VendorSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 거래처 수</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalVendors}개</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">계약 만료 임박</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{expiringCount}건</div>
          <p className="text-xs text-muted-foreground mt-1">30일 이내 만료 예정</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">이번 달 거래 금액</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(monthTotalAmount)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">미결제 건수</CardTitle>
          <Receipt className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{unpaidCount}건</div>
        </CardContent>
      </Card>
    </div>
  );
}