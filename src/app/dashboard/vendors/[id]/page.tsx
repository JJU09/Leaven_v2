import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVendorDetail } from '@/features/vendor/actions';
import { VendorDetailView } from '../_components/VendorDetailView';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { VendorDetail } from '@/features/vendor/types';

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = await params;
  
  if (!id) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const vendorDetail = await getVendorDetail(id).catch(() => null);

  if (!vendorDetail) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard/vendors" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">거래처 상세 정보</h2>
          <p className="text-muted-foreground mt-1">거래처의 기본 정보, 계약 관리, 거래 기록 등을 확인하고 관리합니다.</p>
        </div>
      </div>

      <VendorDetailView vendorDetail={vendorDetail as unknown as VendorDetail} />
    </div>
  );
}