import { Badge } from '@/components/ui/badge';
import { AssetStatus } from '../types';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const getBadgeConfig = (status: AssetStatus) => {
    switch (status) {
      case 'active':
        return { label: '정상 운용', variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'needs_inspection':
        return { label: '점검 필요', variant: 'secondary' as const, className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' };
      case 'under_repair':
        return { label: '수리 중', variant: 'secondary' as const, className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' };
      case 'as_submitted':
        return { label: 'A/S 접수', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
      case 'disposed':
        return { label: '폐기', variant: 'destructive' as const, className: 'bg-red-100 text-red-800 hover:bg-red-100' };
      default:
        return { label: '알 수 없음', variant: 'outline' as const, className: '' };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}