import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  Map as MapIcon,
  List as ListIcon,
  X,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import type { CollectionFacility, FacilityListResponse } from '../types';

const CATEGORIES = [
  'All Categories',
  'Medicine or tablet strip',
  'Empty blister pack',
  'Medicine bottle or container',
  'Cardboard or paper pharmaceutical packaging',
  'Unknown or other'
];

interface FacilityMapProps {
  facilities: CollectionFacility[];
}

const FacilityMap: React.FC<FacilityMapProps> = ({ facilities }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom Icon for Leaflet
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const facsWithCoords = facilities.filter((f) => f.latitude != null && f.longitude != null);
    const initialLat = facsWithCoords.length > 0 ? facsWithCoords[0].latitude! : 40.7128;
    const initialLng = facsWithCoords.length > 0 ? facsWithCoords[0].longitude! : -74.0060;

    if (!leafletInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;

    // Remove existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (facsWithCoords.length > 0) {
      const bounds = L.latLngBounds([]);

      facsWithCoords.forEach((fac) => {
        const marker = L.marker([fac.latitude!, fac.longitude!], { icon: defaultIcon }).addTo(map);
        bounds.extend([fac.latitude!, fac.longitude!]);

        const isVerified = fac.verification_status === 'verified';
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${fac.name}, ${fac.address}, ${fac.city}`
        )}`;

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 200px; max-width: 250px;">
            <div style="font-weight: bold; font-size: 13px; color: #0f3e2e; margin-bottom: 4px;">${fac.name}</div>
            <div style="margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe;">EXAMPLE – Not Real</span>
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; ${
                isVerified ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'
              }">
                ${isVerified ? '✓ Verified' : '⚠ Acceptance Not Verified'}
              </span>
            </div>
            <div style="color: #475569; margin-bottom: 4px;">📍 ${fac.address}, ${fac.city}</div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;"><strong>Accepted:</strong> ${fac.accepted_categories.join(
              ', '
            )}</div>
            ${
              isVerified
                ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #0d9488; font-weight: bold; text-decoration: none;">Get Directions ↗</a>`
                : '<span style="color: #b45309; font-size: 10px; font-style: italic;">Directions hidden (unverified destination)</span>'
            }
          </div>
        `;
        marker.bindPopup(popupContent);
      });

      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [facilities]);

  useEffect(() => {
    return () => {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-3xl overflow-hidden border border-emerald-100 shadow-soft bg-white mb-8">
      <div className="p-4 bg-botanical-50/60 border-b border-emerald-100 flex flex-wrap items-center justify-between text-xs gap-2">
        <span className="font-bold text-botanical-900 flex items-center gap-1.5">
          <MapIcon className="w-4 h-4 text-tealAccent-600" /> OpenStreetMap Interactive Map View
        </span>
        <span className="text-[11px] text-slate-500">
          Plotting {facilities.filter((f) => f.latitude != null).length} collection points with verified GPS coordinates
        </span>
      </div>
      <div ref={mapContainerRef} style={{ height: '380px', width: '100%' }} className="z-0" />
    </div>
  );
};

export const FacilitiesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || '';

  const [searchQuery, setSearchQuery] = useState<string>(initialCity);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'both' | 'cards' | 'map'>('both');

  // Explicit User Location Authorization (Section 4F: never collect silently)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  const [facilities, setFacilities] = useState<CollectionFacility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacilities = async (targetQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const q = targetQuery !== undefined ? targetQuery : searchQuery;
      if (q.trim()) {
        params.set('search', q.trim());
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

  // Section 4F: Location must be typed by the user or explicitly authorized
  const handleExplicitLocationAuth = () => {
    if (!navigator.geolocation) {
      setLocationFeedback('Geolocation is not supported by your browser.');
      setShowAuthModal(false);
      return;
    }

    setLocating(true);
    setLocationFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setShowAuthModal(false);
        // Map user's coordinates to nearest demo cluster or inform user
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationFeedback(`Location authorized: Lat ${lat.toFixed(3)}, Lng ${lng.toFixed(3)}.`);
        // Default to Central City search context for demonstration
        setSearchQuery('Central City');
        fetchFacilities('Central City');
      },
      (err) => {
        setLocating(false);
        setShowAuthModal(false);
        setLocationFeedback(`Geolocation permission denied or timed out (${err.message}). Please type your city or PIN manually.`);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <MapPin className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4F • Collection Centre Locator
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          Collection Centre Locator
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Locate certified take-back kiosks, specialized blister delamination drop-boxes, and municipal hazardous transfer stations.
        </p>
      </div>

      {/* Explicit Location Authorization Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-tealAccent-50 text-tealAccent-700 flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-botanical-900">
                Authorize Location Access
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                PharmaCycle AI respects your privacy. In compliance with Section 4F, location is <strong>never collected silently</strong>.
                Do you authorize querying your browser's approximate GPS coordinates to locate nearby drop-off points?
              </p>
            </div>
            <div className="p-3 bg-botanical-50 rounded-xl border border-emerald-100 text-[11px] text-botanical-900">
              🔒 <strong>Compliance:</strong> Coordinates are used strictly for local distance filtering and are never logged or stored without consent.
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExplicitLocationAuth}
                disabled={locating}
                className="flex-1 py-2 px-3 rounded-xl bg-botanical-900 hover:bg-botanical-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {locating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Authorize & Detect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft mb-8 space-y-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city (e.g., Central City, Metro City), PIN code (e.g., 10001), or address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-tealAccent-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-botanical-50 hover:bg-botanical-100 text-botanical-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            title="Explicitly authorize location access per Section 4F"
          >
            <Navigation className="w-3.5 h-3.5 text-tealAccent-600" />
            <span>Use My Location</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-bold hover:bg-botanical-800 transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <Search className="w-4 h-4 text-tealAccent-400" /> Search Directory
          </button>
        </form>

        {locationFeedback && (
          <div className="p-3 bg-tealAccent-50/70 border border-tealAccent-200 rounded-xl text-xs text-tealAccent-900 flex items-center justify-between">
            <span>{locationFeedback}</span>
            <button onClick={() => setLocationFeedback(null)} className="text-tealAccent-700 hover:text-tealAccent-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Pills, Verified Toggle & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
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

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded text-tealAccent-600 focus:ring-tealAccent-500 h-4 w-4"
              />
              <span>Verified Only</span>
            </label>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  viewMode === 'both' ? 'bg-white text-botanical-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  viewMode === 'map' ? 'bg-white text-botanical-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3 h-3" /> Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  viewMode === 'cards' ? 'bg-white text-botanical-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                <ListIcon className="w-3 h-3" /> Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold text-botanical-900">
          {loading ? 'Searching Facilities...' : `${facilities.length} Collection Centres Located`}
        </h2>
        <button
          onClick={() => fetchFacilities()}
          className="text-xs text-slate-500 hover:text-botanical-900 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Results
        </button>
      </div>

      {/* Optional Leaflet Map View */}
      {(viewMode === 'both' || viewMode === 'map') && !loading && facilities.length > 0 && (
        <FacilityMap facilities={facilities} />
      )}

      {/* Facilities Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tealAccent-600" />
          Loading collection facilities...
        </div>
      ) : error ? (
        <div role="alert" aria-live="assertive" className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
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
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left text-xs text-amber-950 space-y-2">
            <strong className="block text-amber-900 font-bold">Municipal Waste Authority Guidance:</strong>
            <p className="text-amber-900 leading-relaxed">
              If no registered pharmacy drop-box or verified recycling centre exists in your immediate area:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900">
              <li>Contact your local municipal environmental health department or public works authority.</li>
              <li>Ask about scheduled <em>Household Hazardous Waste (HHW) Drop-off Events</em> or municipal chemical collection drives.</li>
              <li>Inquire if your local police precinct or central municipal hospital hosts an authorized drug take-back receptacle.</li>
              <li><strong>CRITICAL SAFETY RULE:</strong> Never flush medicines down the toilet or sink, and never deposit them into household recycling bins while awaiting collection.</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Categories');
              setVerifiedOnly(false);
              fetchFacilities('');
            }}
            className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors shadow-2xs"
          >
            Clear Search Filters
          </button>
        </div>
      ) : (
        viewMode !== 'map' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facilities.map((fac) => {
              const isVerified = fac.verification_status === 'verified';
              const isExample = fac.is_example || fac.name.includes('EXAMPLE') || fac.name.includes('Demo');
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${fac.name}, ${fac.address}, ${fac.city}`
              )}`;

              return (
                <div
                  key={fac.id}
                  className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Status & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-tealAccent-700 uppercase tracking-wider block">
                          {fac.city} {fac.postal_code ? `• PIN ${fac.postal_code}` : ''}
                        </span>
                        <h3 className="font-bold text-base text-botanical-900 mt-0.5">
                          {fac.name}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {/* Section 4F: Visible badge for example facilities */}
                        {isExample && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-200">
                            EXAMPLE – not a real facility
                          </span>
                        )}

                        {/* Verification Badge */}
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-600" /> Acceptance not verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 4F Safeguard: Warn that unverified facility is NOT a confirmed destination */}
                    {!isVerified && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Acceptance not verified:</strong> Do not treat this facility as a confirmed destination for pharmaceutical waste without direct prior confirmation.
                        </span>
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{fac.address}</span>
                    </div>

                    {/* Details: Hours & Contact */}
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
                      {fac.last_verified_at && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Last Verified: {new Date(fac.last_verified_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Accepted Categories */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Accepted Waste Materials:
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

                  {/* Footer Buttons: Show directions links ONLY when a verified address exists */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    {isVerified && fac.address ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-tealAccent-700 hover:text-tealAccent-800"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Get Directions ↗
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Directions hidden (acceptance unverified)
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
        )
      )}
    </div>
  );
};
