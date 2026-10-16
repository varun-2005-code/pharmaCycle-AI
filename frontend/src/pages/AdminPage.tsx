import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  BookOpen,
  FileText,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Key,
  Lock,
  Unlock,
  BadgeCheck,
  Search,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import type {
  AdminStats,
  CollectionFacility,
  DisposalRule,
  WasteItem,
  WasteItemListResponse
} from '../types';

export const AdminPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(() => {
    return localStorage.getItem('pharmacycle_admin_key') || 'pharmacycle-dev-admin-key-2026';
  });

  const [activeTab, setActiveTab] = useState<'facilities' | 'rules' | 'events' | 'waste_items'>('facilities');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [facilities, setFacilities] = useState<CollectionFacility[]>([]);
  const [rules, setRules] = useState<DisposalRule[]>([]);
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state for Facilities
  const [editingFacId, setEditingFacId] = useState<number | null>(null);
  const [facName, setFacName] = useState<string>('');
  const [facAddress, setFacAddress] = useState<string>('');
  const [facCity, setFacCity] = useState<string>('');
  const [facPostal, setFacPostal] = useState<string>('');
  const [facHours, setFacHours] = useState<string>('Mon - Fri 09:00 - 18:00');
  const [facContact, setFacContact] = useState<string>('');
  const [facSourceUrl, setFacSourceUrl] = useState<string>('');
  const [facCategories, setFacCategories] = useState<string[]>([
    'Medicine or tablet strip',
    'Empty blister pack'
  ]);
  const [facVerified, setFacVerified] = useState<string>('verified');

  // Editing state for Guidance Rules
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleCat, setRuleCat] = useState<string>('Medicine or tablet strip');
  const [ruleScope, setRuleScope] = useState<string>('National / Municipal');
  const [ruleAction, setRuleAction] = useState<string>('');
  const [ruleCautions, setRuleCautions] = useState<string>('');
  const [ruleSourceTitle, setRuleSourceTitle] = useState<string>('National Health Authority');
  const [ruleSourceUrl, setRuleSourceUrl] = useState<string>('https://www.who.int');
  const [ruleVerified, setRuleVerified] = useState<string>('verified');

  // Event form state
  const [evItemId, setEvItemId] = useState<string>('');
  const [evType, setEvType] = useState<string>('processing_recovery');
  const [evStatus, setEvStatus] = useState<string>('processed');
  const [evActor, setEvActor] = useState<string>('Thermal Destruction Facility #2');
  const [evEvidence, setEvEvidence] = useState<string>('Batch Incineration Cert #CERT-9901');
  const [evQty, setEvQty] = useState<string>('10');
  const [evUnit, setEvUnit] = useState<string>('units');

  const saveAdminKey = (newKey: string) => {
    setAdminKey(newKey);
    localStorage.setItem('pharmacycle_admin_key', newKey);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      const headers = { 'X-Admin-Key': adminKey };

      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.status === 401) {
        setAuthError(true);
        throw new Error('Unauthorized: Invalid or missing X-Admin-Key. Please verify ADMIN_SECRET_KEY.');
      }
      if (!statsRes.ok) throw new Error('Failed to fetch admin stats');
      const statsData: AdminStats = await statsRes.json();
      setStats(statsData);

      // 2. Fetch Facilities
      const facRes = await fetch('/api/admin/facilities', { headers });
      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData);
      }

      // 3. Fetch Rules
      const rulesRes = await fetch('/api/admin/rules', { headers });
      if (rulesRes.ok) {
        const rulesData: DisposalRule[] = await rulesRes.json();
        setRules(rulesData);
      }

      // 4. Fetch Waste Items for deletion / management
      const itemsRes = await fetch('/api/waste-items?limit=100');
      if (itemsRes.ok) {
        const itemsData: WasteItemListResponse = await itemsRes.json();
        setWasteItems(itemsData.items || []);
        if (itemsData.items && itemsData.items.length > 0 && !evItemId) {
          setEvItemId(String(itemsData.items[0].id));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with admin API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [adminKey]);

  // ---------------------------------------------------------------------------
  // Facilities Handlers
  // ---------------------------------------------------------------------------

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    const payload = {
      name: facName.trim(),
      address: facAddress.trim(),
      city: facCity.trim(),
      postal_code: facPostal.trim() || undefined,
      operating_hours: facHours.trim() || undefined,
      contact_details: facContact.trim() || undefined,
      accepted_categories: facCategories,
      source_url: facSourceUrl.trim() || undefined,
      verification_status: facVerified
    };

    try {
      const url = editingFacId
        ? `/api/admin/facilities/${editingFacId}`
        : '/api/admin/facilities';
      const method = editingFacId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save facility record.');
      }

      setSuccessMsg(
        editingFacId
          ? `Successfully updated facility "${facName}"!`
          : `Successfully created facility "${facName}"!`
      );
      resetFacilityForm();
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetFacilityForm = () => {
    setEditingFacId(null);
    setFacName('');
    setFacAddress('');
    setFacCity('');
    setFacPostal('');
    setFacContact('');
    setFacSourceUrl('');
    setFacHours('Mon - Fri 09:00 - 18:00');
    setFacCategories(['Medicine or tablet strip', 'Empty blister pack']);
    setFacVerified('verified');
  };

  const handleEditFacility = (fac: CollectionFacility) => {
    setEditingFacId(fac.id);
    setFacName(fac.name);
    setFacAddress(fac.address);
    setFacCity(fac.city);
    setFacPostal(fac.postal_code || '');
    setFacContact(fac.contact_details || '');
    setFacSourceUrl(fac.source_url || '');
    setFacHours(fac.operating_hours || 'Mon - Fri 09:00 - 18:00');
    setFacCategories(fac.accepted_categories || ['Medicine or tablet strip']);
    setFacVerified(fac.verification_status);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteFacility = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete facility "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/facilities/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey }
      });
      if (!res.ok) throw new Error('Failed to delete facility');
      setSuccessMsg(`Deleted facility "${name}".`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleFacilityVerification = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const res = await fetch(`/api/admin/facilities/${id}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ verification_status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update verification status');
      setSuccessMsg(`Updated facility #${id} status to '${newStatus}'.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // Guidance Rules Handlers
  // ---------------------------------------------------------------------------

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    const payload = {
      waste_category: ruleCat,
      location_scope: ruleScope.trim(),
      recommended_action: ruleAction.trim(),
      handling_cautions: ruleCautions.trim() || undefined,
      source_title: ruleSourceTitle.trim() || undefined,
      source_url: ruleSourceUrl.trim() || undefined,
      verification_status: ruleVerified
    };

    try {
      const url = editingRuleId
        ? `/api/admin/rules/${editingRuleId}`
        : '/api/admin/rules';
      const method = editingRuleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save disposal rule.');
      }

      setSuccessMsg(
        editingRuleId
          ? `Successfully updated rule for "${ruleCat}"!`
          : `Successfully created guidance rule for "${ruleCat}"!`
      );
      resetRuleForm();
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleCat('Medicine or tablet strip');
    setRuleScope('National / Municipal');
    setRuleAction('');
    setRuleCautions('');
    setRuleSourceTitle('National Health Authority');
    setRuleSourceUrl('https://www.who.int');
    setRuleVerified('verified');
  };

  const handleEditRule = (r: DisposalRule) => {
    setEditingRuleId(r.id);
    setRuleCat(r.waste_category);
    setRuleScope(r.location_scope);
    setRuleAction(r.recommended_action);
    setRuleCautions(r.handling_cautions || '');
    setRuleSourceTitle(r.source_title || '');
    setRuleSourceUrl(r.source_url || '');
    setRuleVerified(r.verification_status);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteRule = async (id: number, cat: string) => {
    if (!window.confirm(`Are you sure you want to delete disposal rule #${id} (${cat})?`)) return;
    try {
      const res = await fetch(`/api/admin/rules/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey }
      });
      if (!res.ok) throw new Error('Failed to delete guidance rule');
      setSuccessMsg(`Deleted guidance rule #${id}.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleRuleVerification = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const res = await fetch(`/api/admin/rules/${id}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ verification_status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update rule verification status');
      setSuccessMsg(`Updated rule #${id} verification to '${newStatus}'.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // Event Logging Handler
  // ---------------------------------------------------------------------------

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!evItemId) {
      setError('Please select or specify a Waste Item ID.');
      return;
    }

    try {
      const payload = {
        waste_item_id: parseInt(evItemId, 10),
        event_type: evType.trim(),
        new_status: evStatus,
        actor: evActor.trim(),
        evidence_reference: evEvidence.trim(),
        quantity: evQty ? parseFloat(evQty) : undefined,
        quantity_unit: evUnit.trim() || undefined,
        demo_record: false
      };

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to record event.');
      }

      setSuccessMsg(`Successfully logged event for item #${evItemId} -> ${evStatus}!`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // Waste Items Deletion Handler
  // ---------------------------------------------------------------------------

  const handleDeleteWasteItem = async (itemId: number) => {
    if (!window.confirm(`Permanently delete waste record #${itemId} and all associated lifecycle events per privacy policy?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/waste-items/${itemId}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey }
      });
      if (!res.ok) throw new Error('Failed to delete waste item.');
      setSuccessMsg(`Waste item #${itemId} and its event audit trail were permanently deleted.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-3 border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          Section 4J • Development Admin Console
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Admin Management Console
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Protected development portal for managing authorized drop-off facilities, updating verification statuses, recording verified processing events, and deleting waste records.
        </p>
      </div>

      {/* Admin Key Bar & Connection Status */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              authError ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {authError ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-botanical-900 block">
                Development Admin Key (ADMIN_SECRET_KEY):
              </span>
              <span className="text-[10px] text-slate-400">
                {authError
                  ? 'Access Denied: Key does not match backend configuration.'
                  : 'Authenticated for development administration.'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => saveAdminKey(e.target.value)}
              placeholder="Enter ADMIN_SECRET_KEY..."
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-tealAccent-600 flex-1 sm:w-80 font-mono"
            />
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Verify
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Facilities</span>
            <span className="text-2xl font-bold text-botanical-900 block mt-1">
              {stats.total_facilities}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Verified Facilities</span>
            <span className="text-2xl font-bold text-emerald-700 block mt-1">
              {stats.verified_facilities}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Guidance Rules</span>
            <span className="text-2xl font-bold text-tealAccent-800 block mt-1">
              {stats.total_rules}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Tracked Items</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">
              {stats.total_items}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Logged Events</span>
            <span className="text-2xl font-bold text-purple-700 block mt-1">
              {stats.total_events}
            </span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'facilities'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1.5" /> Facilities Management ({facilities.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'rules'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 inline mr-1.5" /> Guidance Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'events'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Record Processing Event
        </button>
        <button
          onClick={() => setActiveTab('waste_items')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'waste_items'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 inline mr-1.5" /> Waste Items & Deletion ({wasteItems.length})
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: Facilities Management (CRUD & Verification)                  */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'facilities' && (
        <div className="space-y-8">
          {/* Facility Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-botanical-900">
                {editingFacId ? `Edit Facility Record #${editingFacId}` : 'Add Collection Facility Record'}
              </h3>
              {editingFacId && (
                <button
                  type="button"
                  onClick={resetFacilityForm}
                  className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveFacility} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={facName}
                    onChange={(e) => setFacName(e.target.value)}
                    placeholder="e.g. St. Jude Hospital Take-Back Kiosk"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={facCity}
                    onChange={(e) => setFacCity(e.target.value)}
                    placeholder="e.g. Metro City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Address *</label>
                  <input
                    type="text"
                    required
                    value={facAddress}
                    onChange={(e) => setFacAddress(e.target.value)}
                    placeholder="e.g. 500 Healthcare Blvd, Suite 101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Postal / PIN Code</label>
                  <input
                    type="text"
                    value={facPostal}
                    onChange={(e) => setFacPostal(e.target.value)}
                    placeholder="e.g. 20002"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={facHours}
                    onChange={(e) => setFacHours(e.target.value)}
                    placeholder="e.g. Mon-Fri 08:00 - 18:00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Details</label>
                  <input
                    type="text"
                    value={facContact}
                    onChange={(e) => setFacContact(e.target.value)}
                    placeholder="Phone or email"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={facVerified}
                    onChange={(e) => setFacVerified(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600 font-semibold"
                  >
                    <option value="verified">verified (Official Acceptance)</option>
                    <option value="unverified">unverified (Pilot / Testing)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Registry Source URL</label>
                <input
                  type="url"
                  value={facSourceUrl}
                  onChange={(e) => setFacSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors cursor-pointer shadow-2xs"
                >
                  {editingFacId ? 'Update Facility' : 'Save Facility Record'}
                </button>
                {editingFacId && (
                  <button
                    type="button"
                    onClick={resetFacilityForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Facility Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            <h3 className="font-bold text-sm text-botanical-900 mb-4">
              Registered Facilities ({facilities.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">ID & Name</th>
                    <th className="py-2.5 px-3">City / Address</th>
                    <th className="py-2.5 px-3">Accepted Categories</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {facilities.map((fac) => (
                    <tr key={fac.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-botanical-900 block">
                          #{fac.id} • {fac.name}
                        </span>
                        {fac.is_example && (
                          <span className="text-[9px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                            EXAMPLE FACILITY
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{fac.city}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{fac.address}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {fac.accepted_categories?.map((c, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleFacilityVerification(fac.id, fac.verification_status)}
                          title="Click to toggle verification status"
                          className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                            fac.verification_status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {fac.verification_status === 'verified' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              VERIFIED
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-amber-600" />
                              UNVERIFIED
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleEditFacility(fac)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFacility(fac.id, fac.name)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: Guidance Rules Management (CRUD & Verification)              */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'rules' && (
        <div className="space-y-8">
          {/* Rule Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-botanical-900">
                {editingRuleId ? `Edit Guidance Rule #${editingRuleId}` : 'Add Disposal Guidance Rule'}
              </h3>
              {editingRuleId && (
                <button
                  type="button"
                  onClick={resetRuleForm}
                  className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waste Category *</label>
                  <select
                    value={ruleCat}
                    onChange={(e) => setRuleCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600 font-semibold"
                  >
                    <option value="Medicine or tablet strip">Medicine or tablet strip</option>
                    <option value="Empty blister pack">Empty blister pack</option>
                    <option value="Medicine bottle or container">Medicine bottle or container</option>
                    <option value="Cardboard or paper pharmaceutical packaging">Cardboard or paper pharmaceutical packaging</option>
                    <option value="Unknown or other">Unknown or other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location Scope *</label>
                  <input
                    type="text"
                    required
                    value={ruleScope}
                    onChange={(e) => setRuleScope(e.target.value)}
                    placeholder="e.g. National / Municipal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={ruleVerified}
                    onChange={(e) => setRuleVerified(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600 font-semibold"
                  >
                    <option value="verified">verified (Official Regulation)</option>
                    <option value="unverified">unverified (General Advice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recommended Action *</label>
                <textarea
                  required
                  rows={2}
                  value={ruleAction}
                  onChange={(e) => setRuleAction(e.target.value)}
                  placeholder="Specific disposal instruction (never flush, use authorized pharmacy drop box, etc.)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handling Cautions</label>
                <textarea
                  rows={2}
                  value={ruleCautions}
                  onChange={(e) => setRuleCautions(e.target.value)}
                  placeholder="e.g. Blacken personal patient prescription labels, keep out of reach of children..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Source Title</label>
                  <input
                    type="text"
                    value={ruleSourceTitle}
                    onChange={(e) => setRuleSourceTitle(e.target.value)}
                    placeholder="e.g. EPA / WHO Official Guidelines"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source URL</label>
                  <input
                    type="url"
                    value={ruleSourceUrl}
                    onChange={(e) => setRuleSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors cursor-pointer shadow-2xs"
                >
                  {editingRuleId ? 'Update Guidance Rule' : 'Save Guidance Rule'}
                </button>
                {editingRuleId && (
                  <button
                    type="button"
                    onClick={resetRuleForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            <h3 className="font-bold text-sm text-botanical-900 mb-4">
              Configured Disposal Rules ({rules.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Category & Scope</th>
                    <th className="py-2.5 px-3">Recommended Action</th>
                    <th className="py-2.5 px-3">Source & Verification</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-botanical-900 block">
                          #{r.id} • {r.waste_category}
                        </span>
                        <span className="text-[10px] text-slate-500">{r.location_scope}</span>
                      </td>
                      <td className="py-3 px-3 max-w-sm">
                        <div className="line-clamp-2 text-slate-700">{r.recommended_action}</div>
                        {r.handling_cautions && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5 line-clamp-1">
                            ⚠️ {r.handling_cautions}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 text-[11px] truncate max-w-[180px]">
                          {r.source_title || 'General guidance'}
                        </div>
                        <button
                          onClick={() => handleToggleRuleVerification(r.id, r.verification_status)}
                          title="Click to toggle verification status"
                          className={`mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                            r.verification_status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {r.verification_status === 'verified' ? 'VERIFIED' : 'UNVERIFIED'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleEditRule(r)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(r.id, r.waste_category)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: Event Logging                                                */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4">
            Record Verified Processing / Recovery Event
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Log physical custody transfers, batch thermal destruction, or material recovery certificates against tracked waste items.
          </p>

          <form onSubmit={handleLogEvent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Waste Item ID *</label>
                <select
                  value={evItemId}
                  onChange={(e) => setEvItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600 font-semibold"
                >
                  {wasteItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} - {item.visual_category} ({item.current_status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Type *</label>
                <input
                  type="text"
                  required
                  value={evType}
                  onChange={(e) => setEvType(e.target.value)}
                  placeholder="e.g. high_temperature_incineration"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New State *</label>
                <select
                  value={evStatus}
                  onChange={(e) => setEvStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600 font-semibold"
                >
                  <option value="collected">collected (In Transit / Drop Point)</option>
                  <option value="processed">processed (Final Thermal Recovery)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsible Operator / Actor *</label>
                <input
                  type="text"
                  required
                  value={evActor}
                  onChange={(e) => setEvActor(e.target.value)}
                  placeholder="e.g. Thermal Destruction Plant #2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence / Certificate Ref *</label>
                <input
                  type="text"
                  required
                  value={evEvidence}
                  onChange={(e) => setEvEvidence(e.target.value)}
                  placeholder="e.g. Manifest #CERT-HT-8891"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={evQty}
                  onChange={(e) => setEvQty(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={evUnit}
                  onChange={(e) => setEvUnit(e.target.value)}
                  placeholder="packs / capsules / bottles"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors cursor-pointer shadow-2xs"
              >
                Log Verified Processing Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 4: Waste Items Management & Privacy Deletion Option            */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'waste_items' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
            <div>
              <h3 className="font-bold text-sm text-botanical-900">
                Tracked Waste Records ({wasteItems.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage tracked pharmaceutical waste items or permanently erase records per user privacy request.
              </p>
            </div>
          </div>

          {wasteItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No waste records found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Item ID & Category</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Material / Qty</th>
                    <th className="py-2.5 px-3">Record Type</th>
                    <th className="py-2.5 px-3 text-right">Delete Option</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {wasteItems.map((item) => {
                    const isDemo = item.demo_record || item.model_mode === 'demo';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-botanical-900 block">
                            #{item.id} • {item.visual_category}
                          </span>
                          {item.user_notes && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                              {item.user_notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 capitalize">
                            {item.current_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {item.expiry_date || <span className="text-slate-400">Unverified</span>}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">
                          {item.material_type || 'Standard'} • {item.estimated_quantity || 1} {item.quantity_unit || 'units'}
                        </td>
                        <td className="py-3 px-3">
                          {isDemo ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              DEMO
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Real Scan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteWasteItem(item.id)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Delete this record per privacy policy"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Record
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
      )}

      {/* Security Notice & README Limitations */}
      <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong>Section 4J Security Protocol & Limitations:</strong>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            This administration interface is intended strictly for local development, hackathon evaluation, and operational registry updates.
            It uses token verification via the environment variable <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">ADMIN_SECRET_KEY</code> and is deliberately omitted from public application navigation menus.
            For production deployments, replace token-based header authentication with OAuth2/OIDC role-based access control and audited identity verification.
          </p>
        </div>
      </div>
    </div>
  );
};
