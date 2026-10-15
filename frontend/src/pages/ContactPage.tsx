import React from 'react';
import { Mail, Phone, Building2, MapPin } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <Mail className="w-3.5 h-3.5 text-tealAccent-600" />
          Municipal & Community Outreach
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Contact & Municipal Directory
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Connect with local healthcare authorities, hospital environmental officers, and hackathon project contributors.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h3 className="font-bold text-botanical-900 text-base">Project Team</h3>
          <p className="text-slate-600">PharmaCycle AI Student Hackathon Development Team</p>
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-tealAccent-600" /> support@pharmacycle-ai.org
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-tealAccent-600" /> Circular Health Innovation Lab
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-botanical-50 border border-emerald-100 space-y-3">
          <h3 className="font-bold text-botanical-900 text-base">Municipal Waste Guidance</h3>
          <p className="text-slate-600">
            If your locality lacks verified pharmaceutical take-back kiosks, contact your municipal sanitation department before disposing of bulk medications.
          </p>
        </div>
      </div>
    </div>
  );
};
