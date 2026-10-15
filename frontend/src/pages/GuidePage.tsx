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
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DisposalGuideArticle, DisposalGuideResponse } from '../types';

const CATEGORIES = [
  'All Items',
  'Medicine or tablet strip',
  'Empty blister pack',
  'Medicine bottle or container',
  'Cardboard or paper pharmaceutical packaging',
  'Unknown or other'
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
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <BookOpen className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4H • Verified Disposal Guide
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          Pharmaceutical Waste Disposal Guide
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Comprehensive, material-by-material guidance distinguishing general household stewardship from certified municipal disposal routes.
        </p>
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
              placeholder="Search guide by keyword, material, or waste type..."
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
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                selectedCategory === cat
                  ? 'bg-botanical-900 text-white border-botanical-900 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
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
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article, idx) => (
            <div
              key={article.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft hover:shadow-md transition-shadow space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-tealAccent-100 text-tealAccent-800 text-xs flex items-center justify-center font-bold">
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
                <span className="self-start sm:self-center text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {article.verification_status === 'verified' ? 'Verified Guideline' : 'Informational'}
                </span>
              </div>

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

              {/* Citations & Links */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="text-slate-500">
                  <strong>Source:</strong> {article.source_title || 'Health Authority Standards'}{' '}
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-tealAccent-700 hover:text-tealAccent-800 font-semibold ml-1"
                    >
                      Official Reference <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/recommendations?category=${encodeURIComponent(article.category)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-botanical-900 hover:text-tealAccent-700"
                  >
                    Evaluate this item <ArrowRight className="w-3 h-3" />
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
