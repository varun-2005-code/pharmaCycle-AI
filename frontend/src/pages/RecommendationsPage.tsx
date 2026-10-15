import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  Calendar,
  AlertOctagon
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DisposalRecommendResponse } from '../types';

const CATEGORY_PRESETS = [
  'Medicine or tablet strip',
  'Empty blister pack',
  'Medicine bottle or container',
  'Cardboard or paper pharmaceutical packaging',
  'Unknown or other'
];

const MATERIAL_SUGGESTIONS: Record<string, string[]> = {
  'Medicine or tablet strip': ['PVC/Alu blister strip', 'Alu-Alu cold form', 'Loose tablets in plastic pouch'],
  'Empty blister pack': ['Bonded Aluminium-PVC laminate', 'Cold-formed foil', 'Multilayer plastic'],
  'Medicine bottle or container': ['Amber glass bottle', 'HDPE plastic bottle', 'PET liquid syrup container'],
  'Cardboard or paper pharmaceutical packaging': ['Clean folding paperboard', 'Patient information leaflet (PIL)'],
  'Unknown or other': ['Unmarked composite', 'Ointment tube', 'Compounded chemical vial']
};

export const RecommendationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'Medicine or tablet strip';
  const initialExpiry = searchParams.get('expiry') || 'unverified';

  const [category, setCategory] = useState<string>(initialCategory);
  const [expiryStatus, setExpiryStatus] = useState<string>(initialExpiry);
  const [materialType, setMaterialType] = useState<string>('');
  const [location, setLocation] = useState<string>('Central City');
  const [userNotes, setUserNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<DisposalRecommendResponse | null>(null);

  const fetchRecommendation = async (
    targetCat: string,
    targetExpiry: string,
    targetMat: string,
    targetLoc: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/disposal/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waste_category: targetCat,
          expiry_status: targetExpiry,
          material_type: targetMat || undefined,
          location: targetLoc || undefined,
          user_notes: userNotes || undefined
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Failed to generate recommendation`);
      }

      const data: DisposalRecommendResponse = await res.json();
      setRecommendation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to recommendation service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount with default parameters
    fetchRecommendation(category, expiryStatus, materialType, location);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecommendation(category, expiryStatus, materialType, location);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4D • Deterministic Rules Engine (Decoupled from LLMs)
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          Disposal Recommendation Engine
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Safety-critical guidance evaluating verified waste categories, confirmed expiration dates, and specialized recycling delamination protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-soft">
          <h2 className="text-base font-bold text-botanical-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-tealAccent-600" /> Configure Item Parameters
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                1. Waste Packaging Category
              </label>
              <div className="space-y-1.5">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setMaterialType('');
                      fetchRecommendation(cat, expiryStatus, '', location);
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                      category === cat
                        ? 'border-tealAccent-600 bg-tealAccent-50/70 text-botanical-900 font-semibold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> 2. Expiry Status
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'confirmed_expired', label: 'Expired', color: 'text-rose-700 bg-rose-50 border-rose-200' },
                  { id: 'confirmed_valid', label: 'Unexpired', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { id: 'unverified', label: 'Unverified', color: 'text-amber-700 bg-amber-50 border-amber-200' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setExpiryStatus(item.id);
                      fetchRecommendation(category, item.id, materialType, location);
                    }}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-semibold transition-all ${
                      expiryStatus === item.id
                        ? `${item.color} ring-2 ring-offset-1 ring-slate-400`
                        : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Packaging Material (Optional)
              </label>
              <input
                type="text"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. Amber glass, PVC/Aluminium foil..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
              />
              {/* Preset suggestion chips */}
              {MATERIAL_SUGGESTIONS[category] && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {MATERIAL_SUGGESTIONS[category].map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      onClick={() => setMaterialType(mat)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      + {mat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location / City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> 4. Location / City
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city or PIN code..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                User-entered location. GPS is never collected silently.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-botanical-900 text-white text-xs font-bold hover:bg-botanical-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>Evaluating Rules...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-tealAccent-400" />
                  Generate Verified Recommendation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {recommendation && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6">
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tealAccent-700 block">
                    Target Waste Category
                  </span>
                  <h3 className="text-lg font-bold text-botanical-900">
                    {recommendation.waste_category}
                  </h3>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {recommendation.verification_status === 'verified'
                    ? 'Verified Health Authority Rule'
                    : 'Unverified Policy'}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mandated Disposal Action
                </div>
                <p className="text-sm font-semibold text-emerald-950 leading-relaxed">
                  {recommendation.recommended_action}
                </p>
              </div>

              {/* Rationale & Handling Cautions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-tealAccent-600" /> Why This Action Is Suggested
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {recommendation.why_suggested}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Handling Cautions
                  </span>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {recommendation.handling_cautions}
                  </p>
                </div>
              </div>

              {/* Verification & Sources (Section 4D spec requirement: do not fabricate citations) */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-700">Official Source Reference:</span>
                  <span className="text-[10px] text-slate-400">
                    Jurisdiction: {recommendation.applicable_location}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  {recommendation.source_title}
                </p>
                {recommendation.source_url && (
                  <a
                    href={recommendation.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-tealAccent-700 hover:text-tealAccent-800 font-semibold"
                  >
                    View Official Documentation <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="pt-1 text-[11px] text-slate-500 italic">
                  Note: {recommendation.confidence_explanation}
                </div>
              </div>

              {/* Eligible Facilities matching location */}
              {recommendation.eligible_facilities.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-botanical-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-tealAccent-600" /> Eligible Nearby Facilities ({recommendation.eligible_facilities.length})
                  </h4>
                  <div className="space-y-2">
                    {recommendation.eligible_facilities.slice(0, 2).map((fac) => (
                      <div
                        key={fac.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-botanical-900">{fac.name}</div>
                          <div className="text-[11px] text-slate-500">{fac.address}, {fac.city}</div>
                        </div>
                        <Link
                          to={`/facilities?city=${encodeURIComponent(fac.city)}`}
                          className="px-3 py-1.5 rounded-lg bg-botanical-900 text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-botanical-800"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Links */}
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/facilities"
                  className="px-4 py-2 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors inline-flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-tealAccent-400" /> Find Collection Centres
                </Link>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-tealAccent-600" /> View Digital Twin
                </Link>
                <Link
                  to="/guide"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Full Disposal Guide
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
