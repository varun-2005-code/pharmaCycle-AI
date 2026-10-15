import React from 'react';
import { BarChart3, TrendingUp, Layers, RefreshCw, CheckCircle2, Truck, Package, Clock, Sparkles } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            Section 4G • Digital Twin Tracking
          </div>
          <h1 className="text-3xl font-extrabold text-botanical-900">
            Waste Tracking & Lifecycle Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time tracking of identified, collected, and verified processed pharmaceutical waste items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 text-tealAccent-600" /> Reset Demo Data
          </button>
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            State Machine Active
          </span>
        </div>
      </div>

      {/* 5-State Process Flow Visualization (Section 4G spec) */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Waste Lifecycle State Transition Model
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
            <StatusBadge status="identified" size="sm" />
            <span className="block text-[11px] text-slate-500 mt-2">1. Visual detection</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
            <StatusBadge status="awaiting_confirmation" size="sm" />
            <span className="block text-[11px] text-slate-500 mt-2">2. User verified</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
            <StatusBadge status="collection_pending" size="sm" />
            <span className="block text-[11px] text-slate-500 mt-2">3. Pickup booked</span>
          </div>
          <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 text-center">
            <StatusBadge status="collected" size="sm" />
            <span className="block text-[11px] text-slate-500 mt-2">4. In custody</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
            <StatusBadge status="processed" size="sm" />
            <span className="block text-[11px] text-slate-500 mt-2">5. Recovery logged</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Identified</span>
          <span className="text-2xl font-black text-botanical-900 block mt-1">124</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Awaiting Confirm</span>
          <span className="text-2xl font-black text-amber-600 block mt-1">18</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Collection Pending</span>
          <span className="text-2xl font-black text-purple-600 block mt-1">32</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Collected</span>
          <span className="text-2xl font-black text-tealAccent-700 block mt-1">45</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Processed</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">29</span>
        </div>
      </div>

      {/* Recent Activity Mock Table */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft">
        <h3 className="font-bold text-sm text-botanical-900 mb-4">Recent Waste Events</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Item Category</th>
                <th className="py-2.5 px-3">Current Status</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Evidence Ref</th>
                <th className="py-2.5 px-3">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-3 font-medium">Paracetamol 500mg Strip</td>
                <td className="py-3 px-3"><StatusBadge status="processed" size="sm" /></td>
                <td className="py-3 px-3">10 tabs</td>
                <td className="py-3 px-3">Thermal Destruction Plant #2</td>
                <td className="py-3 px-3 font-mono text-[10px]">CERT-7889</td>
                <td className="py-3 px-3 text-slate-400">Demo</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Empty Multilayer Blister</td>
                <td className="py-3 px-3"><StatusBadge status="collected" size="sm" /></td>
                <td className="py-3 px-3">4 units</td>
                <td className="py-3 px-3">Van Driver 12</td>
                <td className="py-3 px-3 font-mono text-[10px]">PICKUP-441</td>
                <td className="py-3 px-3 text-slate-400">Demo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
