import React from 'react';
import { ShieldCheck, Lock, EyeOff, Trash2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 8 • Security & Privacy
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Privacy Policy & Data Retention
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Strict data minimization, zero biometric profiling, and transient image processing guidelines.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6 text-xs sm:text-sm text-slate-600">
        <div className="p-4 rounded-xl bg-botanical-50 border border-emerald-100 space-y-2">
          <h3 className="font-bold text-botanical-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-tealAccent-600" />
            Core Privacy Commitments
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
            <li><strong>No Patient Identification:</strong> Uploaded packaging photos are processed solely for material classification and expiry verification.</li>
            <li><strong>Zero Continuous Geolocation:</strong> Facility searches only query location when explicitly entered by the user (city / PIN code).</li>
            <li><strong>Automated Data Purging:</strong> Uploaded images are removed after processing. No raw user photographs are retained indefinitely.</li>
            <li><strong>Record Deletion Right:</strong> Users may remove any logged waste tracking record at any time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
