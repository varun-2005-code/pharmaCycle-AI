import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  ExternalLink,
  Pill,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DisposalGuideArticle, DisposalGuideResponse } from '../types';

const CATEGORY_FILTERS = [
  { label: 'All Items', value: 'All Items' },
  { label: 'Expired & Unused Medicines', value: 'Medicine or tablet strip' },
  { label: 'Empty Blister Packs', value: 'Empty blister pack' },
  { label: 'Medicine Bottles', value: 'Medicine bottle or container' },
  { label: 'Cardboard Cartons', value: 'Cardboard' },
  { label: 'Paper Leaflets', value: 'Leaflet' },
  { label: 'Unknown Waste', value: 'Unknown or other' }
];

export const GuidePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [articles, setArticles] = useState<DisposalGuideArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuideArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All Items') {
        params.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/disposal-guide?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Failed to load guide articles`);
      }
      const data: DisposalGuideResponse = await res.json();
      setArticles(data.articles);
    } catch (err: any) {
      setError(err.message || 'Error connecting to disposal guide');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideArticles();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGuideArticles();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <BookOpen className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4H • Evidence-Grounded Disposal Guide
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          Pharmaceutical Waste Disposal Guide
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Comprehensive, material-by-material guidance distinguishing general stewardship principles from certified municipal disposal regulations.
        </p>
      </div>

      {/* Distinction Banner: General Advice vs Verified Local Rules */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xs">
            <strong className="text-emerald-950 font-bold block mb-0.5">Verified Local & Official Rules</strong>
            <p className="text-emerald-900 leading-relaxed">
              Backed by validated environmental standards and verified collection facilities. Always prioritize verified take-back routes over ordinary domestic disposal.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xs">
            <strong className="text-amber-950 font-bold block mb-0.5">General Guidance (Unverified)</strong>
            <p className="text-amber-900 leading-relaxed">
              Provides conservative fallback principles when local data is pending. No fabricated regulations or fictitious links are ever provided.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guide by keyword (e.g. delamination, amber glass, take-back, blisters)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-botanical-900 text-white text-xs font-bold hover:bg-botanical-800 transition-colors flex items-center gap-1.5"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 items-center">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Topic Filter:
          </span>
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedCategory(item.value)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                selectedCategory === item.value
                  ? 'bg-botanical-900 text-white border-botanical-900 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tealAccent-600" />
          Loading disposal guide articles...
        </div>
      ) : error ? (
        <div role="alert" aria-live="assertive" className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article, idx) => (
            <div
              key={article.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-soft hover:shadow-md transition-shadow space-y-5 ${
                article.verification_status === 'verified'
                  ? 'border-emerald-100'
                  : 'border-amber-200/80 bg-amber-50/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center font-bold ${
                    article.verification_status === 'verified'
                      ? 'bg-tealAccent-100 text-tealAccent-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                      {article.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-botanical-900">
                      {article.title}
                    </h3>
                  </div>
                </div>

                {/* Clear Verification Status Badge per Spec */}
                <span className={`self-start sm:self-center text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                  article.verification_status === 'verified'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {article.verification_status === 'verified' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Local / Health Directive
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      General Guidance (Unverified)
                    </>
                  )}
                </span>
              </div>

              {/* Unverified Notice for transparency */}
              {article.verification_status !== 'verified' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>General Stewardship Notice:</strong> This article contains conservative general principles because no localized municipal regulation is registered. Do not place into domestic recycling without consulting local authorities.
                  </span>
                </div>
              )}

              {/* 4-Box Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Common Materials */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-slate-800 block">Common Materials:</span>
                  <p className="text-slate-600 leading-relaxed">{article.common_materials}</p>
                </div>

                {/* 2. Appropriate Route */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="font-bold text-emerald-950 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Appropriate Disposal Route:
                  </span>
                  <p className="text-emerald-900 leading-relaxed font-medium">{article.appropriate_route}</p>
                </div>

                {/* 3. What NOT to do */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1">
                  <span className="font-bold text-rose-950 block flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600" /> What NOT To Do:
                  </span>
                  <p className="text-rose-900 leading-relaxed">{article.what_not_to_do}</p>
                </div>

                {/* 4. Local Rules */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                  <span className="font-bold text-amber-950 block flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Depends On Local Rules:
                  </span>
                  <p className="text-amber-900 leading-relaxed">{article.depends_on_local_rules}</p>
                </div>
              </div>

              {/* Citations & Links (Spec safeguard: No fabricated URLs for unverified entries) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="text-slate-500">
                  <strong>Source Authority:</strong> {article.source_title || 'Health Authority Standards'}{' '}
                  {article.source_url ? (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-tealAccent-700 hover:text-tealAccent-800 font-semibold ml-1.5"
                    >
                      Official Reference <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic ml-1">(No external citation registered - general stewardship)</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/recommendations?category=${encodeURIComponent(article.category)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-botanical-900 hover:text-tealAccent-700 px-3 py-1.5 rounded-lg bg-botanical-50 hover:bg-botanical-100 transition-colors"
                  >
                    Evaluate in Engine <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
