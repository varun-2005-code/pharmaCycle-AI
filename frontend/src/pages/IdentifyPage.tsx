import React from 'react';
import { Sparkles, UploadCloud, Camera, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const IdentifyPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4B • Computer Vision Pipeline
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          AI Pharmaceutical Waste Identification
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Upload an image of pharmaceutical packaging or medicine strips to classify materials into distinct disposal categories.
        </p>
      </div>

      {/* Placeholder Interface */}
      <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-soft">
        <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-12 text-center bg-botanical-50/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-botanical-900 to-tealAccent-600 flex items-center justify-center text-white shadow-md">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-botanical-900">Image Upload & Camera Capture</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
            Supports JPG, JPEG, PNG, and WEBP formats. Pluggable model adapter allows seamless switching between trained computer vision model and deterministic demo simulation mode.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors shadow-xs">
              Select Sample Image (Demo)
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-tealAccent-600" /> Camera Capture
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-emerald-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Supported Classes</span>
              <span className="text-xs font-semibold text-botanical-900 block mt-1">Blisters, Bottles, Strips, Cartons</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">OCR Integration</span>
              <span className="text-xs font-semibold text-botanical-900 block mt-1">Candidate Expiry Extraction</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Next Action Flow</span>
              <span className="text-xs font-semibold text-tealAccent-700 block mt-1">Rules-Based Take-Back Locator</span>
            </div>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-botanical-900">
          <Info className="w-5 h-5 text-tealAccent-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Transparent Machine Learning Disclosure:</span>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Identifying an item visually does not determine chemical potency or guarantee municipal recyclability. This foundation scaffold is ready for Stage 2 model integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
