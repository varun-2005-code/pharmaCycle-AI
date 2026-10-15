import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  RefreshCw,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  Sparkles,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  X,
  Play,
  History,
  Calendar,
  Tag
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

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modals
  const [selectedItemHistory, setSelectedItemHistory] = useState<WasteItem | null>(null);
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
      setItems(itData.items);
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
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed demo data');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset demo data');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm(`Are you sure you want to delete waste item #${itemId} per privacy policy?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/waste-items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
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
        demo_record: transitioningItem.model_mode === 'demo'
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

      setTransitioningItem(null);
      await fetchDashboardData();
    } catch (err: any) {
      setTransitionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const matchesStatus = filterStatus === 'all' || item.current_status === filterStatus;
    const matchesCat = filterCategory === 'all' || item.visual_category === filterCategory;
    return matchesStatus && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2 border border-purple-200">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            Section 4G • Digital Twin Tracking & State Machine
          </div>
          <h1 className="text-3xl font-extrabold text-botanical-900">
            Waste Tracking & Lifecycle Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time digital twin monitoring identified, collected, and verified processed pharmaceutical waste items.
          </p>
        </div>

        {/* Demo Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedDemoData}
            disabled={actionLoading}
            className="px-3.5 py-1.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-tealAccent-400" /> Load Demo Data
          </button>
          <button
            onClick={handleResetDemoData}
            disabled={actionLoading}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-tealAccent-600" /> Reset Demo
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-botanical-900 shadow-2xs"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-State Process-Flow Visualization (Section 4G) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-soft mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pharmaceutical Waste Lifecycle State Progression
          </h3>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Finite State Machine Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
          {[
            {
              status: 'identified' as WasteStatus,
              label: '1. Visual Scan',
              count: summary?.status_breakdown.identified || 0,
              desc: 'AI packaging detection'
            },
            {
              status: 'awaiting_confirmation' as WasteStatus,
              label: '2. User Confirm',
              count: summary?.status_breakdown.awaiting_confirmation || 0,
              desc: 'Verified expiry & notes'
            },
            {
              status: 'collection_pending' as WasteStatus,
              label: '3. Booking Set',
              count: summary?.status_breakdown.collection_pending || 0,
              desc: 'Take-back route assigned'
            },
            {
              status: 'collected' as WasteStatus,
              label: '4. In Custody',
              count: summary?.status_breakdown.collected || 0,
              desc: 'Pharmacy / Courier custody'
            },
            {
              status: 'processed' as WasteStatus,
              label: '5. Processed',
              count: summary?.status_breakdown.processed || 0,
              desc: 'Verified recovery event'
            }
          ].map((step, idx) => (
            <div
              key={step.status}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-tealAccent-500 transition-all text-center space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">Step {idx + 1}</span>
                <span className="text-base font-black text-botanical-900">{step.count}</span>
              </div>
              <StatusBadge status={step.status} size="sm" />
              <div className="text-[11px] text-slate-500 font-medium">{step.desc}</div>
            </div>
          ))}
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
          <span className="text-xs text-slate-500 font-medium">Awaiting Confirm</span>
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
          <span className="text-xs text-slate-500 font-medium">In Custody</span>
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
          <span className="text-[10px] text-slate-400 mt-1 block">With event proof</span>
        </div>
      </div>

      {/* Analytics Visualizations (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Category Distribution Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-tealAccent-600" />
            Waste Category Distribution
          </h3>
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
                No items recorded yet. Click 'Load Demo Data' to view analytics.
              </div>
            )}
          </div>
        </div>

        {/* Waste Event Flow Timeline */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tealAccent-600" />
            Waste-Flow Event Activity
          </h3>
          <div className="h-64">
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline}>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px',
                      border: '1px solid #E2E8F0'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
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

      {/* Quantities Distinction Panel (Section 4G requirement) */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-tealAccent-700">
              Audit Compliance Protocol
            </span>
            <h3 className="text-sm font-bold text-botanical-900">
              Quantity Distinction: Estimated vs Collected vs Verified Processed
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Do not infer recycled quantities from detected items
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">1. Estimated User-Reported Units</span>
            <span className="text-xl font-bold text-slate-800 block">
              {analytics?.quantities.user_reported_units || 0} units
            </span>
            <p className="text-[10px] text-slate-500">Unverified estimates entered during packaging scans</p>
          </div>

          <div className="p-4 rounded-2xl bg-tealAccent-50/60 border border-tealAccent-200 space-y-1">
            <span className="text-tealAccent-900 font-medium">2. Recorded Collection Events</span>
            <span className="text-xl font-bold text-tealAccent-800 block">
              {analytics?.quantities.recorded_collected_units || 0} units
            </span>
            <p className="text-[10px] text-tealAccent-700">Physical receipt acknowledged by courier / pharmacy kiosk</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-emerald-950 font-medium">3. Verified Processed / Recovered</span>
            <span className="text-xl font-bold text-emerald-800 block">
              {analytics?.quantities.verified_processed_units || 0} units
            </span>
            <p className="text-[10px] text-emerald-700">Supported by batch destruction or recovery manifest certificate</p>
          </div>
        </div>
      </div>

      {/* Tracked Items Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-botanical-900">Tracked Waste Records</h3>
            <p className="text-xs text-slate-500">
              Interactive digital twin lifecycle state log. Click 'Advance' to transition status.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="identified">Identified</option>
              <option value="awaiting_confirmation">Awaiting Confirmation</option>
              <option value="collection_pending">Collection Pending</option>
              <option value="collected">Collected</option>
              <option value="processed">Processed</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              <option value="Medicine or tablet strip">Tablets / Strips</option>
              <option value="Empty blister pack">Empty Blister</option>
              <option value="Medicine bottle or container">Bottle / Container</option>
              <option value="Cardboard or paper pharmaceutical packaging">Cardboard / Paper</option>
              <option value="Unknown or other">Unknown</option>
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No waste items match the selected filter. Click 'Load Demo Data' above to populate sample records.
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
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => {
                  const nextStatus = NEXT_STATUS_MAP[item.current_status];

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

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            item.model_mode === 'demo'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {item.model_mode === 'demo' ? 'Demo' : 'Real Model'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right space-x-1">
                        {/* Event History View */}
                        <button
                          onClick={() => setSelectedItemHistory(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold"
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
                            className="px-2.5 py-1 rounded-lg bg-botanical-900 text-white hover:bg-botanical-800 text-[11px] font-semibold inline-flex items-center gap-1"
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
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete per privacy policy"
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

      {/* Modal: Event History Audit Log */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                  Immutable Audit History
                </span>
                <h3 className="text-base font-bold text-botanical-900">
                  Item #{selectedItemHistory.id} • {selectedItemHistory.visual_category}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemHistory(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedItemHistory.events && selectedItemHistory.events.length > 0 ? (
                selectedItemHistory.events.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ev.new_status} size="sm" />
                        <span className="font-bold text-slate-700">{ev.event_type}</span>
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
                        Evidence Ref: {ev.evidence_reference}
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
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
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
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors shadow-2xs"
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
