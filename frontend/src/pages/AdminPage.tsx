import React, { useState, useEffect } from 'react';
import {
  Shield,
  PlusCircle,
  CheckCircle2,
  Database,
  Lock,
  Building2,
  BookOpen,
  FileText,
  Key,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { AdminStats, DisposalRule } from '../types';

export const AdminPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>('pharmacycle-dev-admin-key-2026');
  const [activeTab, setActiveTab] = useState<'facilities' | 'rules' | 'events'>('facilities');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rules, setRules] = useState<DisposalRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Facility form state
  const [facName, setFacName] = useState<string>('');
  const [facAddress, setFacAddress] = useState<string>('');
  const [facCity, setFacCity] = useState<string>('');
  const [facPostal, setFacPostal] = useState<string>('');
  const [facHours, setFacHours] = useState<string>('Mon - Fri 09:00 - 18:00');
  const [facContact, setFacContact] = useState<string>('');
  const [facCategories, setFacCategories] = useState<string[]>([
    'Medicine or tablet strip',
    'Empty blister pack'
  ]);
  const [facVerified, setFacVerified] = useState<string>('verified');

  // Rule form state
  const [ruleCat, setRuleCat] = useState<string>('Medicine or tablet strip');
  const [ruleScope, setRuleScope] = useState<string>('National / Municipal');
  const [ruleAction, setRuleAction] = useState<string>('');
  const [ruleCautions, setRuleCautions] = useState<string>('');
  const [ruleSourceTitle, setRuleSourceTitle] = useState<string>('National Health Authority');
  const [ruleSourceUrl, setRuleSourceUrl] = useState<string>('https://www.who.int');

  // Event form state
  const [evItemId, setEvItemId] = useState<string>('1');
  const [evType, setEvType] = useState<string>('processing_recovery');
  const [evStatus, setEvStatus] = useState<string>('processed');
  const [evActor, setEvActor] = useState<string>('Thermal Destruction Facility #2');
  const [evEvidence, setEvEvidence] = useState<string>('Batch Incineration Cert #CERT-9901');
  const [evQty, setEvQty] = useState<string>('10');
  const [evUnit, setEvUnit] = useState<string>('tabs');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'X-Admin-Key': adminKey }
      });
      if (!statsRes.ok) {
        throw new Error('Unauthorized or invalid Admin Key.');
      }
      const statsData: AdminStats = await statsRes.json();
      setStats(statsData);

      const rulesRes = await fetch('/api/admin/rules', {
        headers: { 'X-Admin-Key': adminKey }
      });
      if (rulesRes.ok) {
        const rulesData: DisposalRule[] = await rulesRes.json();
        setRules(rulesData);
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

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);
    try {
      const payload = {
        name: facName,
        address: facAddress,
        city: facCity,
        postal_code: facPostal || undefined,
        operating_hours: facHours,
        contact_details: facContact || undefined,
        accepted_categories: facCategories,
        verification_status: facVerified
      };

      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create facility');
      setSuccessMsg(`Successfully created facility "${facName}"!`);
      setFacName('');
      setFacAddress('');
      setFacCity('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);
    try {
      const payload = {
        waste_category: ruleCat,
        location_scope: ruleScope,
        recommended_action: ruleAction,
        handling_cautions: ruleCautions || undefined,
        source_title: ruleSourceTitle || undefined,
        source_url: ruleSourceUrl || undefined,
        verification_status: 'verified'
      };

      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create disposal rule');
      setSuccessMsg(`Successfully created guidance rule for "${ruleCat}"!`);
      setRuleAction('');
      setRuleCautions('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);
    try {
      const payload = {
        waste_item_id: parseInt(evItemId, 10),
        event_type: evType,
        new_status: evStatus,
        actor: evActor,
        evidence_reference: evEvidence,
        quantity: evQty ? parseFloat(evQty) : undefined,
        quantity_unit: evUnit || undefined,
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
        throw new Error(errJson.detail || 'Failed to log event');
      }

      setSuccessMsg(`Successfully logged event for item #${evItemId} -> ${evStatus}!`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-3 border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          Section 4J • Development Admin Console
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Facility & Rule Management
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Development-only console for configuring authorized collection facilities, updating verification status, and logging batch processing events.
        </p>
      </div>

      {/* Admin Key Bar */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-tealAccent-600" />
            <span className="text-xs font-bold text-botanical-900">Admin Secret Key:</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter X-Admin-Key..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-tealAccent-600 flex-1 sm:w-72"
            />
            <button
              onClick={fetchAdminData}
              className="px-4 py-1.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800"
            >
              Verify Key
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Total Facilities</span>
            <span className="text-xl font-bold text-botanical-900 block mt-1">
              {stats.total_facilities}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Verified Facilities</span>
            <span className="text-xl font-bold text-emerald-700 block mt-1">
              {stats.verified_facilities}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Guidance Rules</span>
            <span className="text-xl font-bold text-tealAccent-800 block mt-1">
              {stats.total_rules}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Tracked Items</span>
            <span className="text-xl font-bold text-slate-800 block mt-1">
              {stats.total_items}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Logged Events</span>
            <span className="text-xl font-bold text-purple-700 block mt-1">
              {stats.total_events}
            </span>
          </div>
        </div>
      )}

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'facilities'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1.5" /> Manage Facilities
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'rules'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 inline mr-1.5" /> Disposal Guidance Rules
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'events'
              ? 'border-botanical-900 text-botanical-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Log Batch Processing Event
        </button>
      </div>

      {/* Tab 1: Facilities Form */}
      {activeTab === 'facilities' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4">Add Collection Facility Record</h3>
          <form onSubmit={handleCreateFacility} className="space-y-4 text-xs">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                >
                  <option value="verified">Verified Acceptance</option>
                  <option value="unverified">Unverified (Pilot / Testing)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors"
              >
                Save Facility Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Rules Form */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4">Add or Update Guidance Rule</h3>
          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Waste Category *</label>
                <select
                  value={ruleCat}
                  onChange={(e) => setRuleCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
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
                  placeholder="e.g. National Take-Back / General"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recommended Action *</label>
              <textarea
                required
                rows={2}
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value)}
                placeholder="Specific disposal instruction (never flush, use pharmacy drop box, etc.)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Handling Cautions</label>
              <textarea
                rows={2}
                value={ruleCautions}
                onChange={(e) => setRuleCautions(e.target.value)}
                placeholder="e.g. Deface patient details, store safely away from children..."
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

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors"
              >
                Save Guidance Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Events Form */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
          <h3 className="font-bold text-sm text-botanical-900 mb-4">Log Verified Processing / Recovery Event</h3>
          <form onSubmit={handleLogEvent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Waste Item ID *</label>
                <input
                  type="number"
                  required
                  value={evItemId}
                  onChange={(e) => setEvItemId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Type *</label>
                <input
                  type="text"
                  required
                  value={evType}
                  onChange={(e) => setEvType(e.target.value)}
                  placeholder="e.g. high_temp_incineration"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Status *</label>
                <select
                  value={evStatus}
                  onChange={(e) => setEvStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                >
                  <option value="collected">collected</option>
                  <option value="processed">processed (Requires Evidence)</option>
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
                  placeholder="e.g. Batch Destruction Manifest #8801"
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
                  placeholder="capsules / packs / bottles"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors"
              >
                Log Verified Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Disclaimer Box */}
      <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Development Authentication Protocol:</strong>
          <p className="text-amber-800 mt-0.5">
            Admin endpoints require the header <code className="bg-amber-100 px-1 py-0.5 rounded">X-Admin-Key</code>.
            In production, replace this with OAuth2 Bearer tokens. Never commit sensitive production credentials into git repositories.
          </p>
        </div>
      </div>
    </div>
  );
};
