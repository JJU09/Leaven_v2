export type AssetStatus = 'active' | 'needs_inspection' | 'under_repair' | 'as_submitted' | 'disposed';
export type MaintenanceType = 'regular' | 'breakdown' | 'replacement';

export interface StoreAsset {
  id: string;
  store_id: string;
  vendor_id?: string | null;
  name: string;
  category?: string | null;
  model_name?: string | null;
  manufacturer?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_amount?: number | null;
  installation_location?: string | null;
  warranty_expiry_date?: string | null;
  as_vendor_name?: string | null;
  as_contact?: string | null;
  as_url?: string | null;
  as_usage_count: number;
  next_inspection_date?: string | null;
  status: AssetStatus;
  image_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AssetMaintenanceLog {
  id: string;
  asset_id: string;
  maintenance_date: string;
  maintenance_type: MaintenanceType;
  description?: string | null;
  cost?: number | null;
  next_inspection_date?: string | null;
  performed_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AssetStatusLog {
  id: string;
  asset_id: string;
  from_status?: AssetStatus | null;
  to_status: AssetStatus;
  changed_by?: string | null;
  changer_name?: string | null;
  note?: string | null;
  created_at: string;
}

export interface AssetWithVendor extends StoreAsset {
  vendors?: {
    id?: string;
    name: string;
    contact_number?: string | null;
    email?: string | null;
  } | null;
}

export interface AssetDetail extends AssetWithVendor {
  asset_maintenance_logs: AssetMaintenanceLog[];
  asset_status_logs: AssetStatusLog[];
}

export interface GetAssetsParams {
  storeId: string;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: AssetStatus;
  location?: string;
}