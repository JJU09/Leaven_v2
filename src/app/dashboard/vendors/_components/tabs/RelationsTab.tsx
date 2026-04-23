import { VendorDetail } from '@/features/vendor/types';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface RelationsTabProps {
  vendor: VendorDetail;
}

export function RelationsTab({ vendor }: RelationsTabProps) {
  const assets = vendor.store_assets || [];
  const transactions = vendor.vendor_transactions || [];

  const assetsTotalAmount = assets.reduce((sum, a) => sum + (a.purchase_amount || 0), 0);
  const transactionsTotalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const grandTotalAmount = assetsTotalAmount + transactionsTotalAmount;

  const getAssetStatusBadge = (status: string) => {
    switch(status) {
      case 'in_use': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">사용 중</Badge>;
      case 'repairing': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">수리 중</Badge>;
      case 'broken': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">고장</Badge>;
      case 'discarded': return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">폐기됨</Badge>;
      case 'lost': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">분실됨</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">연결 자산 수</p>
          <p className="text-xl font-bold">{assets.length}개</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">자산 구매 총액</p>
          <p className="text-xl font-bold">{formatCurrency(assetsTotalAmount)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">총 거래 금액 (자산+거래)</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(grandTotalAmount)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">연결된 자산 ({assets.length})</h3>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/assets?vendor_id=${vendor.id}`}>
            전체 보기 <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>자산명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>구매일</TableHead>
              <TableHead>구매 금액</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  연결된 자산이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.category || '-'}</TableCell>
                  <TableCell>{asset.purchase_date || '-'}</TableCell>
                  <TableCell>{formatCurrency(asset.purchase_amount)}</TableCell>
                  <TableCell>{getAssetStatusBadge(asset.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}