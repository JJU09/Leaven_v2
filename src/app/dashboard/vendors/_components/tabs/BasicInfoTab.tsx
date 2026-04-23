import { Vendor } from '@/features/vendor/types';
import { formatPhoneNumber } from '@/lib/formatters';

interface BasicInfoTabProps {
  vendor: Vendor;
}

export function BasicInfoTab({ vendor }: BasicInfoTabProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">거래처명</p>
          <p className="text-sm">{vendor.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">업종/카테고리</p>
          <p className="text-sm">{vendor.category || '-'}</p>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">대표 연락처</p>
          <p className="text-sm">{formatPhoneNumber(vendor.contact_number) || '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">담당자명</p>
          <p className="text-sm">{vendor.manager_name || '-'}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">직통 연락처</p>
          <p className="text-sm">{formatPhoneNumber(vendor.direct_contact) || '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">이메일</p>
          <p className="text-sm">{vendor.email || '-'}</p>
        </div>

        <div className="space-y-1 col-span-2">
          <p className="text-sm font-medium text-muted-foreground">주소</p>
          <p className="text-sm">{vendor.address || '-'}</p>
        </div>

        <div className="space-y-1 col-span-2">
          <p className="text-sm font-medium text-muted-foreground">사업자번호</p>
          <p className="text-sm">{vendor.business_number || '-'}</p>
        </div>

        <div className="space-y-1 col-span-2">
          <p className="text-sm font-medium text-muted-foreground">계좌번호</p>
          <p className="text-sm">{vendor.bank_account || '-'}</p>
        </div>

        <div className="space-y-1 col-span-2">
          <p className="text-sm font-medium text-muted-foreground">메모</p>
          <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md min-h-[80px]">
            {vendor.notes || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}