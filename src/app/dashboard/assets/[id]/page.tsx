import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAssetDetail } from '@/features/asset/actions';
import { AssetDetailView } from '@/features/asset/components/asset-detail-view';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = await params;
  
  if (!id) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const asset = await getAssetDetail(id).catch(() => null);

  if (!asset) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard/assets" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">자산 상세 정보</h2>
          <p className="text-muted-foreground mt-1">자산의 기본 정보, 유지보수 이력 등을 확인하고 관리합니다.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <AssetDetailView asset={asset} userId={user.id} storeId={asset.store_id} />
      </div>
    </div>
  );
}