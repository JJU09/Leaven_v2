'use client';

import { useState, useEffect } from 'react';
import { getAssets } from '../actions';
import { AssetStatus, AssetWithVendor } from '../types';
import { AssetStatusBadge } from './asset-status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { differenceInDays } from 'date-fns';
import { Search, Plus } from 'lucide-react';
import { AssetFormDialog } from './asset-form-dialog';
import { AssetDetail } from '../types';
import { useRouter } from 'next/navigation';

interface AssetListProps {
  storeId: string;
  userId: string;
  locations: string[];
}

export function AssetList({ storeId, userId, locations }: AssetListProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [location, setLocation] = useState<string>('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDetail | null>(null);

  const [data, setData] = useState<{ data: AssetWithVendor[], count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssets = () => {
    setIsLoading(true);
    getAssets({
      storeId,
      page,
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      status: status !== 'all' ? (status as AssetStatus) : undefined,
      location: location !== 'all' ? location : undefined,
    })
      .then(res => {
        setData(res);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAssets();
  }, [storeId, page, search, category, status, location]);

  const isInspectionDueSoon = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const days = differenceInDays(new Date(dateStr), new Date());
    return days >= 0 && days <= 30;
  };

  return (
    <div className="space-y-4">
      {/* 툴바 */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="자산명 또는 시리얼 검색"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 카테고리</SelectItem>
              <SelectItem value="전자기기">전자기기</SelectItem>
              <SelectItem value="가구집기">가구집기</SelectItem>
              <SelectItem value="주방기기">주방기기</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="active">정상 운용</SelectItem>
              <SelectItem value="needs_inspection">점검 필요</SelectItem>
              <SelectItem value="under_repair">수리 중</SelectItem>
              <SelectItem value="as_submitted">A/S 접수</SelectItem>
              <SelectItem value="disposed">폐기</SelectItem>
            </SelectContent>
          </Select>

          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="위치" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 위치</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => {
          setEditingAsset(null);
          setIsFormOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          자산 등록
        </Button>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] text-center">자산번호</TableHead>
              <TableHead className="text-center">자산명</TableHead>
              <TableHead className="text-center">카테고리</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-center">설치 위치</TableHead>
              <TableHead className="text-center">다음 점검일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  등록된 자산이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((asset: AssetWithVendor) => (
                <TableRow 
                  key={asset.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
                >
                  <TableCell className="font-mono text-xs text-center">{asset.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-center">{asset.name}</TableCell>
                  <TableCell className="text-center">{asset.category || '-'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <AssetStatusBadge status={asset.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{asset.installation_location || '-'}</TableCell>
                  <TableCell className={`text-center ${isInspectionDueSoon(asset.next_inspection_date) ? 'text-red-500 font-medium' : ''}`}>
                    {asset.next_inspection_date || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 간이 구현 */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          이전
        </Button>
        <div className="text-sm">페이지 {page}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={!data || data.data.length < 10}
        >
          다음
        </Button>
      </div>

      <AssetFormDialog
        storeId={storeId}
        userId={userId}
        asset={editingAsset}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          fetchAssets();
        }}
      />
    </div>
  );
}
