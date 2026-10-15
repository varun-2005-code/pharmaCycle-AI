/**
 * Shared TypeScript types for PharmaCycle AI Frontend.
 */

export type WasteStatus =
  | 'identified'
  | 'awaiting_confirmation'
  | 'collection_pending'
  | 'collected'
  | 'processed';

export interface HealthResponse {
  status: string;
  database: string;
  environment: string;
  version: string;
  timestamp: string;
}

export interface WasteItem {
  id: number;
  visual_category: string;
  confidence?: number;
  model_mode: 'demo' | 'real';
  expiry_date?: string;
  expiry_confirmation_status: string;
  material_type?: string;
  user_notes?: string;
  estimated_quantity?: number;
  quantity_unit?: string;
  current_status: WasteStatus;
  created_at: string;
  updated_at: string;
}

export interface WasteEvent {
  id: number;
  waste_item_id: number;
  event_type: string;
  previous_status?: string;
  new_status: WasteStatus;
  quantity?: number;
  quantity_unit?: string;
  timestamp: string;
  actor?: string;
  evidence_reference?: string;
  demo_record: boolean;
}

export interface DisposalRule {
  id: number;
  waste_category: string;
  location_scope: string;
  recommended_action: string;
  handling_cautions?: string;
  source_title?: string;
  source_url?: string;
  verification_status: 'verified' | 'unverified';
  last_verified_at?: string;
}

export interface CollectionFacility {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  contact_details?: string;
  operating_hours?: string;
  accepted_categories: string;
  source_url?: string;
  verification_status: 'verified' | 'unverified';
  last_verified_at?: string;
}
