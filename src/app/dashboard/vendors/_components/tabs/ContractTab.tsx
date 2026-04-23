import { Vendor } from '@/features/vendor/types';
import { formatCurrency } from '@/lib/formatters';
import { differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText } from 'lucide-react';

interface ContractTabProps {
  vendor: Vendor;
}

export function ContractTab({ vendor }: ContractTabProps) {
  const renderDDay = () => {
    if (!vendor.contract_end_date) return null;
    
    const endDate = parseISO(vendor.contract_end_date);
    const daysLeft = differenceInDays(endDate, new Date());
    
    if (daysLeft < 0) return <Badge variant="destructive">만료됨</Badge>;
    if (daysLeft <= 30) return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">D-{daysLeft}</Badge>;
    return <Badge variant="outline">D-{daysLeft}</Badge>;
  };

  const getPaymentCycleText = (cycle: string | null) => {
    switch(cycle) {
      case 'monthly': return '매월';
      case 'quarterly': return '분기별';
      case 'yearly': return '매년';
      case 'per_case': return '건별결제';
      default: return '-';
    }
  };

  const getContractTypeText = (type: string | null) => {
    switch(type) {
      case 'delivery': return '납품';
      case 'lease': return '임대';
      case 'service': return '서비스';
      default: return '-';
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div>
        <h3 className="text-lg font-medium mb-4">계약 상세 정보</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-4 p-4 rounded-lg border bg-card">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">계약 유형</p>
            <p className="text-sm font-medium">{getContractTypeText(vendor.contract_type)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">계약 금액</p>
            <p className="text-sm font-medium">{formatCurrency(vendor.contract_amount)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">계약 시작일</p>
            <p className="text-sm">{vendor.contract_start_date || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">계약 종료일</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">{vendor.contract_end_date || '-'}</span>
              {renderDDay()}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">결제 주기</p>
            <p className="text-sm">{getPaymentCycleText(vendor.payment_cycle)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">자동 갱신 여부</p>
            <div>
              {vendor.is_auto_renewal ? (
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">자동 갱신</Badge>
              ) : (
                <Badge variant="outline">수동 갱신</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">계약서 파일</h3>
        <div className="p-6 rounded-lg border border-dashed flex flex-col items-center justify-center bg-muted/10">
          {vendor.contract_file_url ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">계약서 파일이 등록되어 있습니다.</p>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">
                  {vendor.contract_file_url.split('/').pop()}
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href={vendor.contract_file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> 다운로드
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">등록된 계약서가 없습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">편집 모드에서 업로드 할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}