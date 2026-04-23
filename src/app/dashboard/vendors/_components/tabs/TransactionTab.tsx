import { VendorDetail } from '@/features/vendor/types';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface TransactionTabProps {
  vendor: VendorDetail;
  onAddTransaction: () => void;
}

export function TransactionTab({ vendor, onAddTransaction }: TransactionTabProps) {
  const transactions = vendor.vendor_transactions || [];

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const paidAmount = transactions
    .filter(t => t.payment_status === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const unpaidAmount = transactions
    .filter(t => t.payment_status === 'unpaid' || t.payment_status === 'partial')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">결제 완료</Badge>;
      case 'unpaid': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">미결제</Badge>;
      case 'partial': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">부분 결제</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">취소됨</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderFileLink = (url: string | null) => {
    if (!url) return <span className="text-muted-foreground">-</span>;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
        <Download className="h-3 w-3 mr-1" /> 다운로드
      </a>
    );
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">총 거래 금액</p>
          <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">결제 완료</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">미결제 금액</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(unpaidAmount)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">거래 내역 ({transactions.length})</h3>
        <Button onClick={onAddTransaction} size="sm">
          <Plus className="h-4 w-4 mr-2" /> 거래 추가
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래일</TableHead>
              <TableHead>거래 내용</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>명세서</TableHead>
              <TableHead>세금계산서</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  거래 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.transaction_date}</TableCell>
                  <TableCell>{t.description || '-'}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(t.amount)}</TableCell>
                  <TableCell>{getStatusBadge(t.payment_status)}</TableCell>
                  <TableCell>{renderFileLink(t.statement_file_url)}</TableCell>
                  <TableCell>{renderFileLink(t.tax_invoice_file_url)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}