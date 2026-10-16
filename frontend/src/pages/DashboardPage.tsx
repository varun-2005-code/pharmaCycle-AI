import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  History,
  Calendar,
  Filter,
  CheckCircle2,
  FileCheck2,
  Home,
  ScanLine,
  Building2,
  Recycle,
  Layers,
  Inbox
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import type {
  DashboardSummaryResponse,
  DashboardAnalyticsResponse,
  WasteItem,
  WasteItemListResponse,
  WasteEvent,
  WasteStatus
} from '../types';

const PIE_COLORS = ['#0F3E2E', '#14B8A6', '#065F46', '#2DD4BF', '#F59E0B', '#64748B'];

const NEXT_STATUS_MAP: Record<WasteStatus, WasteStatus | null> = {
  identified: 'awaiting_confirmation',
  awaiting_confirmation: 'collection_pending',
  collection_pending: 'collected',
  collected: 'processed',
  processed: null
};

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [items, setItems] = useState<WasteItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');

  // Modals
  const [selectedItemHistory, setSelectedItemHistory] = useState<WasteItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [itemHistoryEvents, setItemHistoryEvents] = useState<WasteEvent[]>([]);

  const [transitioningItem, setTransitioningItem] = useState<WasteItem | null>(null);

  // Transition form state
  const [transitionActor, setTransitionActor] = useState<string>('Household User');
  const [transitionEvidence, setTransitionEvidence] = useState<string>('Visual verification logged');
  const [transitionQuantity, setTransitionQuantity] = useState<string>('');
  const [transitionUnit, setTransitionUnit] = useState<string>('units');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, anaRes, itemsRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/analytics'),
        fetch('/api/waste-items?limit=100')
      ]);

      if (!sumRes.ok || !anaRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch dashboard data from server');
      }

      const sumData: DashboardSummaryResponse = await sumRes.json();
      const anaData: DashboardAnalyticsResponse = await anaRes.json();
      const itData: WasteItemListResponse = await itemsRes.json();

      setSummary(sumData);
      setAnalytics(anaData);
      setItems(itData.items || []);
    } catch (err: any) {
      setError(err.message || 'Error connecting to backend dashboard service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeedDemoData = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed demo data');
      const data = await res.json();
      setFeedbackMessage(`Loaded ${data.items_seeded || 6} sample demo items across lifecycle states.`);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleResetDemoData = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset demo data');
      const data = await res.json();
      setFeedbackMessage(`Reset demo records: ${data.demo_items_deleted || 0} demo items removed.`);
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm(`Are you sure you want to delete waste item #${itemId} per privacy policy?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/waste-items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      setFeedbackMessage(`Waste item #${itemId} deleted per privacy protocol.`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleOpenHistory = async (item: WasteItem) => {
    setSelectedItemHistory(item);
    setItemHistoryEvents(item.events || []);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/waste-items/${item.id}/history`);
      if (res.ok) {
        const events: WasteEvent[] = await res.json();
        setItemHistoryEvents(events);
      }
    } catch (err) {
      console.warn('Could not fetch fresh event history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitioningItem) return;

    const targetStatus = NEXT_STATUS_MAP[transitioningItem.current_status];
    if (!targetStatus) return;

    setTransitionError(null);
    setActionLoading(true);

    try {
      const payload = {
        event_type: `${targetStatus}_event`,
        target_status: targetStatus,
        actor: transitionActor.trim() || 'System',
        evidence_reference: transitionEvidence.trim() || undefined,
        quantity: transitionQuantity ? parseFloat(transitionQuantity) : undefined,
        quantity_unit: transitionUnit.trim() || undefined,
        demo_record: transitioningItem.demo_record || transitioningItem.model_mode === 'demo'
      };

      const res = await fetch(`/api/waste-items/${transitioningItem.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'State transition failed');
      }

      setFeedbackMessage(`Item #${transitioningItem.id} successfully transitioned to '${targetStatus}'.`);
      setTransitioningItem(null);
      await fetchDashboardData();
    } catch (err: any) {
      setTransitionError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Filtered items logic including status, category and date range
  const filteredItems = items.filter((item) => {
    const matchesStatus = filterStatus === 'all' || item.current_status === filterStatus;
    const matchesCat = filterCategory === 'all' || item.visual_category === filterCategory;

    let matchesDate = true;
    if (filterDateRange !== 'all' && item.created_at) {
      const itemDate = new Date(item.created_at).getTime();
      const now = Date.now();
      if (filterDateRange === 'today') {
        matchesDate = now - itemDate <= 24 * 60 * 60 * 1000;
      } else if (filterDateRange === '7days') {
        matchesDate = now - itemDate <= 7 * 24 * 60 * 60 * 1000;
      } else if (filterDateRange === '30days') {
        matchesDate = now - itemDate <= 30 * 24 * 60 * 60 * 1000;
      }
    }

    return matchesStatus && matchesCat && matchesDate;
  });

  const hasActiveFilters = filterStatus !== 'all' || filterCategory !== 'all' || filterDateRange !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2 border border-purple-200">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            Section 4G • Digital Twin Tracking & State Machine
          </div>
          <h1 className="text-3xl font-extrabold text-botanical-900 tracking-tight">
            Waste Tracking & Lifecycle Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Real-time digital twin monitoring identified, collected, and verified processed pharmaceutical waste items
            across the finite state machine lifecycle.
          </p>
        </div>

        {/* Demo Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedDemoData}
            disabled={actionLoading}
            id="btn-load-sample-data"
            className="px-3.5 py-2 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-tealAccent-400" /> Load Sample Data
          </button>
          <button
            onClick={handleResetDemoData}
            disabled={actionLoading}
            id="btn-reset-demo-data"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-tealAccent-600" /> Reset
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-botanical-900 shadow-2xs cursor-pointer"
            title="Refresh Dashboard"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-tealAccent-50 border border-tealAccent-200 text-tealAccent-900 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-tealAccent-700 shrink-0" />
          <span className="font-medium">{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Process-Flow Visualization: Section 4G Explicit Requirement */}
      {/* Household -> Identification -> Collection Point -> Processing Facility -> Confirmed Recovery or Final Treatment */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-tealAccent-700 block">
              Section 4G Process-Flow Pipeline
            </span>
            <h3 className="text-sm font-bold text-botanical-900">
              Household → Identification → Collection Point → Processing Facility → Confirmed Recovery
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
            Finite State Machine Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
          {[
            {
              step: 'Step 1',
              title: 'Household',
              subtitle: 'Consumer Sorting & Segregation',
              icon: Home,
              status: 'identified' as WasteStatus,
              count: summary?.status_breakdown.identified || 0,
              desc: 'Initial packaging discard'
            },
            {
              step: 'Step 2',
              title: 'Identification',
              subtitle: 'AI Scan & Expiry Verification',
              icon: ScanLine,
              status: 'awaiting_confirmation' as WasteStatus,
              count: summary?.status_breakdown.awaiting_confirmation || 0,
              desc: 'User verifies OCR & notes'
            },
            {
              step: 'Step 3',
              title: 'Collection Point',
              subtitle: 'Authorized Drop-off / Kiosk',
              icon: Building2,
              status: 'collection_pending' as WasteStatus,
              count: summary?.status_breakdown.collection_pending || 0,
              desc: 'Take-back route assigned'
            },
            {
              step: 'Step 4',
              title: 'Processing Facility',
              subtitle: 'Licensed Hauler / Depot Intake',
              icon: Layers,
              status: 'collected' as WasteStatus,
              count: summary?.status_breakdown.collected || 0,
              desc: 'Physical custody manifest'
            },
            {
              step: 'Step 5',
              title: 'Confirmed Recovery',
              subtitle: 'Final Treatment / Destruction',
              icon: Recycle,
              status: 'processed' as WasteStatus,
              count: summary?.status_breakdown.processed || 0,
              desc: 'Verified certificate logged'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.status}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-tealAccent-500 transition-all text-center space-y-2 relative group"
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                  <span>{item.step}</span>
                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-tealAccent-600 transition-colors" />
                </div>
                <div className="text-xs font-bold text-botanical-900 leading-snug">{item.title}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1">{item.subtitle}</div>
                <div className="pt-1 flex flex-col items-center gap-1">
                  <span className="text-xl font-black text-botanical-900">{item.count}</span>
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">{item.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Identified</span>
          <span className="text-2xl font-black text-botanical-900 block mt-1">
            {summary?.total_items || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {summary?.demo_items_count || 0} demo / {summary?.actual_items_count || 0} actual
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Awaiting Confirmation</span>
          <span className="text-2xl font-black text-amber-600 block mt-1">
            {summary?.status_breakdown.awaiting_confirmation || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Requires user review</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Collection Pending</span>
          <span className="text-2xl font-black text-purple-600 block mt-1">
            {summary?.status_breakdown.collection_pending || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Drop-box scheduled</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">In Custody / Collected</span>
          <span className="text-2xl font-black text-tealAccent-700 block mt-1">
            {summary?.status_breakdown.collected || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Transferred to depot</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Verified Processed</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">
            {summary?.status_breakdown.processed || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Supported by certificate</span>
        </div>
      </div>

      {/* Quantities Distinction Panel (Section 4G Strict Requirement) */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-tealAccent-700">
              Audit Compliance Protocol
            </span>
            <h3 className="text-sm font-bold text-botanical-900">
              Quantity Distinction: Estimated vs Recorded Collected vs Verified Processed
            </h3>
          </div>
          <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-semibold self-start sm:self-auto">
            Do not infer recycled quantities from detections
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">1. Estimated User-Reported Quantities</span>
            <span className="text-xl font-bold text-slate-800 block">
              {analytics?.quantities.user_reported_units || 0} units
            </span>
            <p className="text-[10px] text-slate-500">Unverified estimates entered during packaging visual scans</p>
          </div>

          <div className="p-4 rounded-2xl bg-tealAccent-50/60 border border-tealAccent-200 space-y-1">
            <span className="text-tealAccent-900 font-medium block">2. Recorded Collection Events</span>
            <span className="text-xl font-bold text-tealAccent-800 block">
              {analytics?.quantities.recorded_collected_units || 0} units
            </span>
            <p className="text-[10px] text-tealAccent-700">Physical receipt acknowledged by courier / pharmacy drop box</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-emerald-950 font-medium block">3. Verified Processed / Recovered</span>
            <span className="text-xl font-bold text-emerald-800 block">
              {analytics?.quantities.verified_processed_units || 0} units
            </span>
            <p className="text-[10px] text-emerald-700">Supported by batch destruction or recovery manifest certificate</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
          <strong>Audit Standard Note:</strong> In accordance with pharmaceutical waste management regulations,
          detection of an item does not prove physical recovery. Recycled quantities are only counted when verified
          by an authorized processing facility event log.
        </p>
      </div>

      {/* Analytics Visualizations: Category Distribution, Status Breakdown & Timeline (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Category Distribution Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-1 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-tealAccent-600" />
            Category Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">Waste items by visual classification</p>
          <div className="h-64">
            {analytics?.category_distribution && analytics.category_distribution.some((c) => c.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.category_distribution}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {analytics.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No items recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Bar Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-tealAccent-600" />
            Status Breakdown
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">Item distribution across the 5 lifecycle states</p>
          <div className="h-64">
            {analytics?.status_distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.status_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="status"
                    stroke="#94A3B8"
                    fontSize={9}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Bar dataKey="count" name="Items" radius={[6, 6, 0, 0]}>
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={
                          entry.status === 'processed'
                            ? '#059669'
                            : entry.status === 'collected'
                            ? '#0D9488'
                            : entry.status === 'collection_pending'
                            ? '#9333EA'
                            : entry.status === 'awaiting_confirmation'
                            ? '#D97706'
                            : '#0F3E2E'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No status data available.
              </div>
            )}
          </div>
        </div>

        {/* Waste Event Flow Timeline */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tealAccent-600" />
            Waste-Flow Timeline
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">Event activity over time</p>
          <div className="h-64">
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Total Events"
                    stroke="#0F3E2E"
                    fill="#0F3E2E"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#14B8A6"
                    fill="#14B8A6"
                    fillOpacity={0.25}
                  />
                  <Area
                    type="monotone"
                    dataKey="processed"
                    name="Processed"
                    stroke="#059669"
                    fill="#059669"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No event logs available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracked Items & Recent Activity Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-botanical-900">Recent Activity & Tracked Waste Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive digital twin lifecycle state log. Demo items are visibly labelled with badges.
            </p>
          </div>

          {/* Filter Controls: Date, Category and Status */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter items by status"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-tealAccent-600"
              >
                <option value="all">All Statuses</option>
                <option value="identified">Identified</option>
                <option value="awaiting_confirmation">Awaiting Confirmation</option>
                <option value="collection_pending">Collection Pending</option>
                <option value="collected">Collected</option>
                <option value="processed">Processed</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                aria-label="Filter items by category"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-tealAccent-600"
              >
                <option value="all">All Categories</option>
                <option value="Medicine or tablet strip">Tablets / Strips</option>
                <option value="Empty blister pack">Empty Blister</option>
                <option value="Medicine bottle or container">Bottle / Container</option>
                <option value="Cardboard or paper pharmaceutical packaging">Cardboard / Paper</option>
                <option value="Unknown or other">Unknown</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Date:</span>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                aria-label="Filter items by date range"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-tealAccent-600"
              >
                <option value="all">All Time</option>
                <option value="today">Last 24 Hours</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setFilterDateRange('all');
                }}
                className="px-2 py-1.5 text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Empty State vs Table Display */}
        {items.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Waste Records in Database</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Your pharmaceutical waste tracking database is currently empty. Identify a waste item using computer vision
              or load verified sample records to explore the state machine.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleSeedDemoData}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-tealAccent-400" /> Load Sample Data
              </button>
              <Link
                to="/identify"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ScanLine className="w-3.5 h-3.5 text-botanical-700" /> Identify Waste
              </Link>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-50/50 rounded-2xl border border-slate-200">
            <Filter className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No items match the selected filters</p>
            <p className="text-slate-400 mt-1">Try resetting the status, category, or date range filters.</p>
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterCategory('all');
                setFilterDateRange('all');
              }}
              className="mt-3 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-100 font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Item ID & Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Expiry</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Record Type</th>
                  <th className="py-2.5 px-3 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => {
                  const nextStatus = NEXT_STATUS_MAP[item.current_status];
                  const isDemo = item.demo_record || item.model_mode === 'demo';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-botanical-900">
                          #{item.id} • {item.visual_category}
                        </div>
                        {item.user_notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.user_notes}</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={item.current_status} size="sm" />
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {item.expiry_date ? (
                          <span className="font-mono text-slate-800">{item.expiry_date}</span>
                        ) : (
                          <span className="text-slate-400">Not verified</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {item.estimated_quantity ? `${item.estimated_quantity} ${item.quantity_unit || ''}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-500 max-w-[120px] truncate">
                        {item.material_type || 'Standard'}
                      </td>

                      {/* Visibly Labelled Demo Data per Section 4G */}
                      <td className="py-3 px-3">
                        {isDemo ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title="Simulated sample item for hackathon evaluation"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            DEMO RECORD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            User Scan
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {/* Event History View */}
                        <button
                          onClick={() => handleOpenHistory(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer"
                        >
                          History
                        </button>

                        {/* Advance State Machine */}
                        {nextStatus ? (
                          <button
                            onClick={() => {
                              setTransitioningItem(item);
                              setTransitionActor(
                                nextStatus === 'processed'
                                  ? 'Thermal Destruction Plant #2'
                                  : nextStatus === 'collected'
                                  ? 'EcoHaul Courier #14'
                                  : 'Household User'
                              );
                              setTransitionEvidence(
                                nextStatus === 'processed'
                                  ? 'High-Temp Destruction Certificate CERT-HT-8891'
                                  : nextStatus === 'collected'
                                  ? 'Physical Custody Manifest #4401'
                                  : 'User confirmed packaging details'
                              );
                              setTransitionQuantity(item.estimated_quantity ? String(item.estimated_quantity) : '1');
                              setTransitionUnit(item.quantity_unit || 'units');
                              setTransitionError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-botanical-900 text-white hover:bg-botanical-800 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            Advance <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                            Terminal
                          </span>
                        )}

                        {/* Delete Record per Privacy */}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete per privacy policy"
                          aria-label={`Delete waste item #${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Per-Item Event History Audit Log */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                  Immutable Lifecycle History
                </span>
                <h3 className="text-base font-bold text-botanical-900 flex items-center gap-2">
                  Item #{selectedItemHistory.id} • {selectedItemHistory.visual_category}
                  {selectedItemHistory.demo_record && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      DEMO RECORD
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemHistory(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-tealAccent-600" />
                  Loading lifecycle audit trail...
                </div>
              ) : itemHistoryEvents && itemHistoryEvents.length > 0 ? (
                itemHistoryEvents.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ev.new_status} size="sm" />
                        <span className="font-bold text-slate-700">{ev.event_type}</span>
                        {ev.demo_record && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                            Demo Event
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <strong>Actor:</strong> {ev.actor || 'System'}
                      </div>
                      <div>
                        <strong>Quantity:</strong>{' '}
                        {ev.quantity ? `${ev.quantity} ${ev.quantity_unit || ''}` : 'Not specified'}
                      </div>
                    </div>

                    {ev.evidence_reference && (
                      <div className="text-[11px] text-tealAccent-800 bg-tealAccent-50 p-2 rounded-lg border border-tealAccent-100 font-mono">
                        Evidence Reference: {ev.evidence_reference}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No event history recorded.</div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedItemHistory(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: State Machine Transition */}
      {transitioningItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                  State Machine Transition
                </span>
                <h3 className="text-base font-bold text-botanical-900">
                  Item #{transitioningItem.id}
                </h3>
              </div>
              <button
                onClick={() => setTransitioningItem(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transitionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {transitionError}
              </div>
            )}

            <form onSubmit={handleExecuteTransition} className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Status</span>
                  <StatusBadge status={transitioningItem.current_status} size="sm" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Target Next Status</span>
                  <StatusBadge
                    status={NEXT_STATUS_MAP[transitioningItem.current_status] || 'processed'}
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Responsible Actor / Operator *
                </label>
                <input
                  type="text"
                  required
                  value={transitionActor}
                  onChange={(e) => setTransitionActor(e.target.value)}
                  placeholder="e.g. EcoHaul Logistics, City Reclaim Desk..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supporting Evidence / Certificate Reference *
                </label>
                <input
                  type="text"
                  required
                  value={transitionEvidence}
                  onChange={(e) => setTransitionEvidence(e.target.value)}
                  placeholder="e.g. Incineration Cert #CERT-992, Waybill #402..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Section 4G requirement: 'processed' status strictly requires supporting evidence.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={transitionQuantity}
                    onChange={(e) => setTransitionQuantity(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={transitionUnit}
                    onChange={(e) => setTransitionUnit(e.target.value)}
                    placeholder="packs / tabs / bottles"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransitioningItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving Transition...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
