'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateAssetStatus } from '../actions';
import { AssetDetail, AssetStatus } from '../types';
import { AssetStatusBadge } from './asset-status-badge';
import { AssetFormDialog } from './asset-form-dialog';
import { differenceInDays } from 'date-fns';
import { Printer, Edit, ExternalLink, Calendar, Wrench, Shield, Box, User, ArrowRight, Plus } from 'lucide-react';

interface AssetDetailViewProps {
  asset: AssetDetail;
  userId: string;
  storeId: string;
}

export function AssetDetailView({ asset: initialAsset, userId, storeId }: AssetDetailViewProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail>(initialAsset);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleStatusUpdate = async (newStatus: AssetStatus) => {
    if (asset.status === newStatus || isUpdatingStatus) return;
    
    setIsUpdatingStatus(true);
    try {
      await updateAssetStatus(asset.id, asset.status, newStatus, userId, '상태 수동 변경');
      setAsset(prev => ({ ...prev, status: newStatus }));
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('상태 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const daysToWarrantyEnd = asset.warranty_expiry_date 
    ? differenceInDays(new Date(asset.warranty_expiry_date), new Date()) 
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 섹션 */}
      <div className="p-6 border-b flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <AssetStatusBadge status={asset.status} />
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              편집
            </Button>
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold">{asset.name}</h3>
          <p className="font-mono mt-1 text-muted-foreground">
            {asset.id.slice(0, 8)} • {asset.category || '카테고리 없음'}
          </p>
        </div>
      </div>

      {/* 탭 섹션 */}
      <Tabs defaultValue="info" className="flex-1 w-full">
        <div className="px-6 pt-4 border-b pb-2">
          <TabsList className="w-full flex flex-wrap justify-start h-auto bg-transparent border-b-0 gap-2">
            <TabsTrigger value="info" className="rounded-full px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">기본 정보</TabsTrigger>
            <TabsTrigger value="warranty" className="rounded-full px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">A/S·보증</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">유지보수</TabsTrigger>
            <TabsTrigger value="status" className="rounded-full px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">상태 이력</TabsTrigger>
            <TabsTrigger value="vendor" className="rounded-full px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">거래처</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* 탭 1: 기본 정보 */}
          <TabsContent value="info" className="space-y-6 m-0 w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">모델명</span>
                <span className="font-medium text-base">{asset.model_name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">제조사</span>
                <span className="font-medium text-base">{asset.manufacturer || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">시리얼 번호</span>
                <span className="font-mono text-base">{asset.serial_number || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">설치 위치</span>
                <span className="font-medium text-base">{asset.installation_location || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">구매일</span>
                <span className="text-base">{asset.purchase_date || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">구매 금액</span>
                <span className="text-base">{asset.purchase_amount ? `${asset.purchase_amount.toLocaleString()}원` : '-'}</span>
              </div>
              <div className="col-span-2 md:col-span-3">
                <span className="text-muted-foreground block mb-2">메모</span>
                <p className="bg-muted/50 p-4 rounded-md min-h-[80px] whitespace-pre-wrap leading-relaxed text-base">
                  {asset.notes || '-'}
                </p>
              </div>
            </div>

            {asset.image_url && (
              <div className="mt-6">
                <span className="text-muted-foreground block mb-2">사진</span>
                <div className="rounded-md border overflow-hidden bg-muted aspect-video max-w-2xl relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={asset.image_url} 
                    alt={asset.name}
                    className="object-contain w-full h-full" 
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* 탭 2: A/S · 보증 */}
          <TabsContent value="warranty" className="space-y-8 m-0 w-full max-w-4xl mx-auto">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center text-lg">
                <Shield className="w-5 h-5 mr-2 text-primary" /> 보증 정보
              </h4>
              <div className="bg-muted/30 border p-6 rounded-lg flex justify-between items-center max-w-2xl">
                <div>
                  <div className="text-muted-foreground mb-1 text-sm">보증 만료일</div>
                  <div className="font-bold text-2xl">{asset.warranty_expiry_date || '설정 안됨'}</div>
                </div>
                {daysToWarrantyEnd !== null && (
                  <div className={`text-right font-black text-2xl ${
                    daysToWarrantyEnd < 0 ? 'text-red-500' : 
                    daysToWarrantyEnd <= 30 ? 'text-amber-500' : 'text-green-500'
                  }`}>
                    {daysToWarrantyEnd < 0 ? '만료됨' : `D-${daysToWarrantyEnd}`}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <h4 className="font-medium flex items-center text-lg">
                <Wrench className="w-5 h-5 mr-2 text-primary" /> A/S 업체 정보
              </h4>
              <div className="border rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-4 items-center">
                  <span className="text-muted-foreground">업체명</span>
                  <span className="col-span-3 font-medium text-lg">{asset.as_vendor_name || '-'}</span>
                </div>
                <div className="grid grid-cols-4 items-center">
                  <span className="text-muted-foreground">연락처</span>
                  <span className="col-span-3 text-lg font-mono">{asset.as_contact || '-'}</span>
                </div>
                <div className="grid grid-cols-4 items-center">
                  <span className="text-muted-foreground">접수 URL</span>
                  <span className="col-span-3">
                    {asset.as_url ? (
                      <a href={asset.as_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center bg-blue-50 w-fit px-3 py-1.5 rounded-md">
                        온라인 접수 바로가기 <ExternalLink className="w-4 h-4 ml-1.5" />
                      </a>
                    ) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center">
                  <span className="text-muted-foreground">이용 횟수</span>
                  <span className="col-span-3 font-medium">{asset.as_usage_count}회</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 탭 3: 유지보수 이력 */}
          <TabsContent value="history" className="space-y-6 m-0 w-full max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h4 className="font-medium text-muted-foreground">총 <span className="text-foreground font-bold">{asset.asset_maintenance_logs?.length || 0}</span>건의 유지보수 이력</h4>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> 이력 추가
              </Button>
            </div>
            
            <div className="space-y-4 max-w-4xl">
              {asset.asset_maintenance_logs?.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                  <Wrench className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  유지보수 이력이 없습니다.
                </div>
              ) : (
                asset.asset_maintenance_logs?.map(log => (
                  <div key={log.id} className="border rounded-lg p-5 space-y-3 hover:shadow-sm transition-shadow bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          log.maintenance_type === 'regular' ? 'default' : 
                          log.maintenance_type === 'breakdown' ? 'destructive' : 'secondary'
                        } className="px-2.5 py-1 text-sm">
                          {log.maintenance_type === 'regular' ? '정기점검' : 
                           log.maintenance_type === 'breakdown' ? '고장수리' : '부품교체'}
                        </Badge>
                        <span className="font-medium text-lg">{log.maintenance_date}</span>
                      </div>
                      <span className="text-muted-foreground flex items-center bg-muted/50 px-2 py-1 rounded text-sm">
                        <User className="w-4 h-4 mr-1.5" /> {log.performed_by || '-'}
                      </span>
                    </div>
                    <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed py-2">{log.description || '내용 없음'}</p>
                    <div className="flex justify-between text-sm pt-4 mt-2 border-t text-muted-foreground bg-muted/10 -mx-5 -mb-5 p-4 rounded-b-lg">
                      <span className="font-medium text-foreground">비용: {log.cost ? `${log.cost.toLocaleString()}원` : '무상 / 내용없음'}</span>
                      <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> 다음 점검 예정: {log.next_inspection_date || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* 탭 4: 상태 트래킹 */}
          <TabsContent value="status" className="space-y-8 m-0 w-full max-w-4xl mx-auto">
            <div>
              <h4 className="font-medium text-muted-foreground mb-4">현재 상태 변경</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 max-w-4xl">
                {(['active', 'needs_inspection', 'under_repair', 'as_submitted', 'disposed'] as AssetStatus[]).map(s => (
                  <Button
                    key={s}
                    variant={asset.status === s ? "secondary" : "outline"}
                    className={`justify-start h-auto py-4 px-4 transition-all ${
                      asset.status === s 
                        ? 'border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20 hover:bg-primary/10' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleStatusUpdate(s)}
                    disabled={isUpdatingStatus}
                  >
                    <div className="flex flex-col items-center w-full space-y-2">
                      <AssetStatusBadge status={s} />
                      {asset.status === s && <span className="text-xs text-primary font-medium">현재 상태</span>}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-12 max-w-3xl">
              <h4 className="font-medium text-muted-foreground mb-6">상태 변경 타임라인</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {asset.asset_status_logs?.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg bg-muted/10">상태 변경 이력이 없습니다.</div>
                ) : (
                  asset.asset_status_logs?.map(log => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-primary-foreground shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-card border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-muted-foreground text-sm font-medium">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 my-3">
                          {log.from_status ? <AssetStatusBadge status={log.from_status} /> : <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">초기 등록</span>}
                          <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
                          <AssetStatusBadge status={log.to_status} />
                        </div>
                        <div className="text-muted-foreground text-sm mt-4 pt-4 border-t flex justify-between items-center bg-muted/20 -mx-5 -mb-5 p-4 rounded-b-xl">
                          <span className="font-medium text-foreground/70">{log.note || '사유 없음'}</span>
                          <span className="flex items-center"><User className="w-4 h-4 mr-1.5 opacity-70" /> {log.changer_name || log.changed_by || '시스템'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* 탭 5: 거래처 연결 */}
          <TabsContent value="vendor" className="space-y-4 m-0 w-full max-w-4xl mx-auto">
            {asset.vendors ? (
              <div className="border rounded-xl p-6 bg-card shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-2xl flex items-center">
                      {asset.vendors.name}
                      <Badge variant="outline" className="ml-3 font-normal">연결된 거래처</Badge>
                    </h3>
                    <div className="text-muted-foreground mt-4 space-y-3">
                      <div className="grid grid-cols-4 items-center">
                        <span className="text-sm">연락처</span>
                        <span className="col-span-3 font-medium text-foreground text-lg">{asset.vendors.contact_number || '-'}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center">
                        <span className="text-sm">이메일</span>
                        <span className="col-span-3 text-foreground">{asset.vendors.email || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end">
                  <Button variant="default" asChild>
                    <a href={`/dashboard/vendors/${asset.vendors.id}`} target="_blank" rel="noreferrer">
                      거래처 상세 보기 <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
                <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg mb-2">연결된 거래처가 없습니다.</p>
                <p className="text-sm opacity-70 mb-6">이 자산을 구매하거나 A/S를 담당하는 거래처를 연결해두면 관리가 편해집니다.</p>
                <Button variant="outline" onClick={() => setIsFormOpen(true)}>거래처 연결/수정하기</Button>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <AssetFormDialog
        storeId={storeId}
        userId={userId}
        asset={asset}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            router.refresh();
          }
        }}
        onSuccess={() => {
          setIsFormOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}