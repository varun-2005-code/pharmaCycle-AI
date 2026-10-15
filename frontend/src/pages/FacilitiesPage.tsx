import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Phone,
  Navigation,
  ExternalLink,
  AlertCircle,
  Building2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { CollectionFacility, FacilityListResponse } from '../types';

const CATEGORIES = [
  'All Categories',
  'Medicine or tablet strip',
  'Empty blister pack',
  'Medicine bottle or container',
  'Cardboard or paper pharmaceutical packaging',
  'Unknown or other'
];

export const FacilitiesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || '';

  const [searchQuery, setSearchQuery] = useState<string>(initialCity);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const [facilities, setFacilities] = useState<CollectionFacility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (selectedCategory !== 'All Categories') {
        params.set('category', selectedCategory);
      }
      if (verifiedOnly) {
        params.set('verified_only', 'true');
      }

      const res = await fetch(`/api/facilities?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Failed to load facilities`);
      }
      const data: FacilityListResponse = await res.json();
      setFacilities(data.facilities);
    } catch (err: any) {
      setError(err.message || 'Error connecting to facilities directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [selectedCategory, verifiedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFacilities();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <MapPin className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4F • Authorized Collection Facilities
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          Collection Centre Locator
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Locate certified take-back kiosks, specialized blister delamination drop-boxes, and municipal hazardous depots.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft mb-8 space-y-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, address, postal PIN, or facility name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-tealAccent-600"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-bold hover:bg-botanical-800 transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <Search className="w-4 h-4 text-tealAccent-400" /> Search Directory
          </button>
        </form>

        {/* Category Pills & Verified Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 items-center">
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

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded text-tealAccent-600 focus:ring-tealAccent-500 h-4 w-4"
            />
            <span>Verified Facilities Only</span>
          </label>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-botanical-900">
          {loading ? 'Searching Facilities...' : `${facilities.length} Collection Centres Found`}
        </h2>
        <button
          onClick={fetchFacilities}
          className="text-xs text-slate-500 hover:text-botanical-900 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Facilities Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tealAccent-600" />
          Loading collection facilities...
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : facilities.length === 0 ? (
        /* Empty State (Per Section 4F: Explain municipal authority contact if no facility found) */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-botanical-900">No Eligible Facilities Located</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No authorized collection points were found matching your current location or filters.
          </p>
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-900 space-y-2">
            <strong>Municipal Guidance Recommendation:</strong>
            <p className="text-amber-800">
              Contact your local municipal environmental health office or town waste transfer authority.
              Inquire about annual "Household Hazardous Chemical & Medicine Collection Days."
              Never flush medicines down sinks or dispose of them in kerbside bins while awaiting collection.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Categories');
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors"
          >
            Clear Search Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {facilities.map((fac) => {
            const isVerified = fac.verification_status === 'verified';
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${fac.name}, ${fac.address}, ${fac.city}`
            )}`;

            return (
              <div
                key={fac.id}
                className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                        {fac.city} {fac.postal_code ? `• PIN ${fac.postal_code}` : ''}
                      </span>
                      <h3 className="font-bold text-base text-botanical-900 mt-0.5">
                        {fac.name}
                      </h3>
                    </div>

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Acceptance Not Verified
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{fac.address}</span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                    {fac.operating_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{fac.operating_hours}</span>
                      </div>
                    )}
                    {fac.contact_details && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{fac.contact_details}</span>
                      </div>
                    )}
                  </div>

                  {/* Accepted Categories */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Accepted Waste Categories:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {fac.accepted_categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2.5 py-0.5 rounded-lg bg-botanical-50 text-botanical-900 border border-botanical-100 font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  {isVerified ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-tealAccent-700 hover:text-tealAccent-800"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions
                    </a>
                  ) : (
                    <span className="text-[11px] text-amber-700 italic">
                      Verify directly before visiting
                    </span>
                  )}

                  {fac.source_url && (
                    <a
                      href={fac.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
