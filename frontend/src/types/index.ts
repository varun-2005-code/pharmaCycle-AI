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

export interface AnalyzeResponse {
  predicted_category: string;
  confidence: number | null;
  model_mode: 'demo' | 'real';
  explanation: string;
  uncertainty_notes: string | null;
  suggested_next_action: string;
  disclaimer: string;
  detected_format: string;
  file_size_bytes: number;
  filename: string;
  waste_item_id: number | null;
}

export interface CategoryDetail {
  name: string;
  description: string;
  typical_materials: string;
}

export interface CategoriesResponse {
  categories: string[];
  details: CategoryDetail[];
  active_model_mode: string;
  supported_formats: string[];
  max_upload_size_mb: number;
  disclaimer: string;
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
  events?: WasteEvent[];
}

export interface WasteItemListResponse {
  total: number;
  items: WasteItem[];
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

export interface FacilitySummary {
  id: number;
  name: string;
  city: string;
  address: string;
  accepted_categories: string;
  verification_status: string;
  contact_details?: string;
  operating_hours?: string;
}

export interface DisposalRecommendResponse {
  waste_category: string;
  recommended_action: string;
  why_suggested: string;
  handling_cautions: string;
  applicable_location: string;
  source_title?: string;
  source_url?: string;
  verification_status: string;
  last_verified_at?: string;
  confidence_explanation: string;
  matched_rule_id?: number;
  eligible_facilities: FacilitySummary[];
}

export interface DisposalGuideArticle {
  id: string;
  category: string;
  title: string;
  common_materials: string;
  appropriate_route: string;
  what_not_to_do: string;
  depends_on_local_rules: string;
  source_title?: string;
  source_url?: string;
  verification_status: string;
}

export interface DisposalGuideResponse {
  total_articles: number;
  articles: DisposalGuideArticle[];
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
  accepted_categories: string[];
  source_url?: string;
  verification_status: 'verified' | 'unverified';
  last_verified_at?: string;
}

export interface FacilityListResponse {
  total: number;
  facilities: CollectionFacility[];
}

export interface StatusCounts {
  identified: number;
  awaiting_confirmation: number;
  collection_pending: number;
  collected: number;
  processed: number;
}

export interface DashboardSummaryResponse {
  total_items: number;
  status_breakdown: StatusCounts;
  total_events: number;
  demo_items_count: number;
  actual_items_count: number;
  recent_events_count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  percentage: number;
}

export interface StatusCountItem {
  status: string;
  label: string;
  count: number;
}

export interface TimelinePoint {
  date: string;
  events: number;
  identified: number;
  collected: number;
  processed: number;
}

export interface QuantityMetrics {
  user_reported_units: number;
  recorded_collected_units: number;
  verified_processed_units: number;
  note: string;
}

export interface DashboardAnalyticsResponse {
  category_distribution: CategoryCount[];
  status_distribution: StatusCountItem[];
  timeline: TimelinePoint[];
  quantities: QuantityMetrics;
}

export interface ChatSource {
  title: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  disclaimer?: string;
  timestamp: string;
}

export interface ChatResponse {
  reply: string;
  mode: string;
  sources: ChatSource[];
  disclaimer: string;
  suggestions: string[];
}

export interface AdminStats {
  total_facilities: number;
  verified_facilities: number;
  total_rules: number;
  total_items: number;
  total_events: number;
}

export interface CandidateDate {
  raw_date: string;
  normalized_date: string;
  label: 'EXPIRY' | 'MFG' | 'UNLABELED' | 'USER_PROVIDED';
  is_expiry_label: boolean;
  is_mfg_label: boolean;
  is_in_past: boolean;
}

export interface OcrResponse {
  extracted_text: string;
  candidate_date: string | null;
  normalized_date: string | null;
  is_expired: boolean | null;
  is_ambiguous: boolean;
  ambiguity_reason: string | null;
  ocr_available: boolean;
  verification_status: 'unverified' | 'confirmed' | 'user_provided' | 'ambiguous';
  confidence_score: number | null;
  engine_mode: 'real_ocr' | 'ocr_unavailable' | 'user_provided' | 'demo_ocr';
  labels_detected: string[];
  candidate_dates: CandidateDate[];
  manufacturing_date_detected?: string | null;
  user_confirmed: boolean;
  disclaimer: string;
}
