import React from 'react';
import { MapPin, Search, Filter, ShieldCheck, ExternalLink, Navigation } from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <MapPin className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4F • Collection Centre Locator
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Authorized Collection Facilities
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Discover verified take-back kiosks, municipal drop-off sites, and specialized blister-pack drop boxes.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6">
        {/* Search Mockup */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by city, address or PIN code..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-tealAccent-600"
              disabled
            />
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold flex items-center justify-center gap-2">
            <Filter className="w-4 h-4 text-tealAccent-400" /> Filter Categories
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-emerald-100 bg-botanical-50/40 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider">Pharmacy Take-Back</span>
                <h4 className="font-bold text-sm text-botanical-900">GreenCross Eco Pharmacy</h4>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
              </span>
            </div>
            <p className="text-xs text-slate-600">104 Botanical Way, Health District • PIN 12345</p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <div><strong>Hours:</strong> Mon - Fri 08:00 - 20:00</div>
              <div><strong>Accepted:</strong> Tablets, Empty Blister Strips, Syrup Bottles</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Municipal Hub</span>
                <h4 className="font-bold text-sm text-botanical-900">Central Waste Reclamation Centre</h4>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                Pilot Testing
              </span>
            </div>
            <p className="text-xs text-slate-600">Harbor Industrial Park, Bay 7 • PIN 12348</p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <div><strong>Hours:</strong> Tue, Thu, Sat 09:00 - 17:00</div>
              <div><strong>Accepted:</strong> Cardboard Packaging, Clean Glass Containers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
