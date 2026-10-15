import React from 'react';
import { ShieldCheck, BookOpen, Layers, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecommendationsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          Section 4D • Deterministic Rules Engine
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Disposal Recommendation Engine
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Evidence-grounded disposal recommendations decoupled from LLMs for safety-critical compliance.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-soft space-y-6">
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-botanical-900">
          <CheckCircle2 className="w-5 h-5 text-tealAccent-600 shrink-0 mt-0.5" />
          <p>
            The backend DisposalRule database model encodes material-specific instructions for tablets, empty PVC/Alu blister strips, glass bottles, and paper packaging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-botanical-900">1. Unused / Expired Tablets</h4>
            <p className="text-slate-500">
              Prescription take-back drop boxes; never dispose of active pharmaceutical ingredients down toilets or standard recycling bins.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-botanical-900">2. Empty Blister Packs</h4>
            <p className="text-slate-500">
              Specialized multilayer recyclers only. Cannot be processed by standard kerbside mixed plastic collections.
            </p>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-tealAccent-400" />
            Browse Full Disposal Guide
          </Link>
        </div>
      </div>
    </div>
  );
};
