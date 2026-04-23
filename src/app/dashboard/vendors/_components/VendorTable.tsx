'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import { Vendor } from '@/features/vendor/types';
import { formatPhoneNumber } from '@/lib/formatters';
import { differenceInDays, parseISO } from 'date-fns';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VendorTableProps {
  vendors: Vendor[];
  totalCount: number;
  onVendorClick: (vendor: Vendor) => void;
  onAddClick: () => void;
  onEditClick: (vendor: Vendor) => void;
  onDeleteClick: (vendor: Vendor) => void;
}

export function VendorTable({ 
  vendors, 
  totalCount,
  onVendorClick,
  onAddClick,
  onEditClick,
  onDeleteClick
}: VendorTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contractTypeFilter, setContractTypeFilter] = useState('all');

  const getContractTypeBadge = (type: string | null) => {
    switch (type) {
      case 'delivery': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">납품</Badge>;
      case 'lease': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">임대</Badge>;
      case 'service': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">서비스</Badge>;
      default: return null;
    }
  };

  const renderEndDate = (vendor: Vendor) => {
    if (!vendor.contract_end_date) return '-';
    
    const endDate = parseISO(vendor.contract_end_date);
    const daysLeft = differenceInDays(endDate, new Date());
    const isUrgent = daysLeft <= 30 && daysLeft >= 0;
    const isExpired = daysLeft < 0;

    let colorClass = '';
    if (isExpired) colorClass = 'text-red-600 font-medium';
    else if (isUrgent) colorClass = 'text-amber-600 font-medium';

    return (
      <div className="flex items-center gap-2">
        <span className={colorClass}>{vendor.contract_end_date}</span>
        {vendor.is_auto_renewal && <span className="text-xs text-muted-foreground">(자동)</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="거래처명, 담당자 검색..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="카테고리 전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">카테고리 전체</SelectItem>
              <SelectItem value="food">식자재</SelectItem>
              <SelectItem value="equipment">장비</SelectItem>
              <SelectItem value="consumables">소모품</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </SelectContent>
          </Select>
          <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="계약 유형 전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">계약 유형 전체</SelectItem>
              <SelectItem value="delivery">납품</SelectItem>
              <SelectItem value="lease">임대</SelectItem>
              <SelectItem value="service">서비스</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onAddClick}>
          <Plus className="mr-2 h-4 w-4" /> 거래처 등록
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox />
              </TableHead>
              <TableHead>거래처명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>계약 유형</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>계약 만료일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  등록된 거래처가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow 
                  key={vendor.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onVendorClick(vendor)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.category || '-'}</TableCell>
                  <TableCell>{getContractTypeBadge(vendor.contract_type)}</TableCell>
                  <TableCell>{vendor.manager_name || '-'}</TableCell>
                  <TableCell>{formatPhoneNumber(vendor.contact_number) || '-'}</TableCell>
                  <TableCell>{renderEndDate(vendor)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(vendor)}>
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => onDeleteClick(vendor)}
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}