import React from 'react';
import { Shield, PlusCircle, CheckCircle, Database, Lock } from 'lucide-react';

export const AdminPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-3">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          Section 4J • Development Admin Console
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Facility & Rule Management
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Development-only console for seeding collection facilities, updating verification status, and logging disposal events.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6">
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Development Environment Authentication Notice:</strong>
            <p className="text-amber-800 mt-0.5">
              Production deployments must restrict this route via OAuth2 / JWT. Never hard-code real production credentials in git.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-bold text-botanical-900 block">Facility Directory</span>
            <p className="text-slate-500">Add or edit take-back kiosks, coordinates, and accepted categories.</p>
            <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 text-xs">
              Manage Facilities
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-bold text-botanical-900 block">Disposal Rules</span>
            <p className="text-slate-500">Edit material recommendations, handling cautions, and verified source URLs.</p>
            <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 text-xs">
              Edit Guidance Rules
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-bold text-botanical-900 block">State Machine Audits</span>
            <p className="text-slate-500">Record verified batch destruction and thermal treatment recovery events.</p>
            <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 text-xs">
              Log Event Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
