import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, HeartPulse } from 'lucide-react';

export const SafetyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-3">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          Handling Safeguards
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Safety Guidelines & Waste Handling
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Essential protocols to prevent toxic chemical exposure, accidental ingestion, and environmental harm.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6 text-xs sm:text-sm text-slate-600">
        <div className="space-y-3">
          <h3 className="font-bold text-botanical-900 text-base">Key Safety Directives</h3>
          <ul className="space-y-2 list-disc pl-5 text-slate-700">
            <li><strong>Keep Original Containers:</strong> Keep tablets in blister pockets until handed over at the take-back kiosk to minimize accidental touch and child poisoning.</li>
            <li><strong>Do Not Crush Tablets:</strong> Avoid crushing or powdering unknown medicines, as aerosolized particles can cause severe allergic or respiratory reactions.</li>
            <li><strong>Sharps & Needles:</strong> PharmaCycle AI focuses exclusively on solid packaging and tablets. Medical sharps and syringes require puncture-proof biohazard containers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
