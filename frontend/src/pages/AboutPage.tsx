import React from 'react';
import { Info, AlertCircle, CheckCircle2, ShieldCheck, HeartPulse, Recycle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <Info className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4I • About & Impact
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          About PharmaCycle AI
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          An environmental-health technology prototype addressing pharmaceutical pollution and packaging recovery.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-8">
        
        {/* The Problem & Purpose */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-botanical-900">The Problem & Purpose</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every year, thousands of tons of unused pharmaceuticals end up in household garbage and municipal sewers. Active medicinal compounds bioaccumulate in waterways, causing endocrine disruption in wildlife and fostering antibiotic resistance. Concurrently, complex composite blister packs end up in landfills because consumers lack clarity on disposal segregation.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            PharmaCycle AI bridges this gap with computer vision classification, OCR text extraction, localized collection mapping, and transparent waste lifecycle tracking.
          </p>
        </section>

        {/* Mandatory Section per 4I: What the prototype can and cannot do */}
        <section className="p-6 rounded-2xl bg-botanical-50/70 border border-emerald-100 space-y-4">
          <h3 className="text-base font-bold text-botanical-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-tealAccent-600" />
            What the Prototype Can and Cannot Do
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white rounded-xl border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What It CAN Do
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                <li>Classify visual waste category (blister, bottle, carton, tablet).</li>
                <li>Extract candidate dates via OCR with manual user confirmation.</li>
                <li>Provide rules-based guidance on verified take-back bins.</li>
                <li>Track items through a 5-stage state machine (identified to processed).</li>
                <li>Enforce audit event logging before marking waste as processed.</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-2">
              <span className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> What It CANNOT Do
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                <li>Cannot determine chemical composition or drug potency from an image.</li>
                <li>Cannot verify counterfeit or genuine medical status.</li>
                <li>Cannot advise users on consuming medicines or diagnosing conditions.</li>
                <li>Cannot fabricate local collection facilities or acceptance policies.</li>
                <li>Does not guarantee municipal curbside recyclability without local verification.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Future Development */}
        <section className="space-y-2 text-xs sm:text-sm text-slate-600">
          <h3 className="font-bold text-botanical-900 text-base">Future Road Map</h3>
          <p className="leading-relaxed">
            Integration with municipal smart bin IoT scales, barcode/GS1 DataMatrix pharmaceutical lookups, and certified take-back pharmacy chain APIs.
          </p>
        </section>
      </div>
    </div>
  );
};
