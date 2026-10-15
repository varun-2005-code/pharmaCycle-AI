import React from 'react';
import { Calendar, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OcrPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tealAccent-50 text-tealAccent-800 text-xs font-semibold mb-3">
          <Calendar className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4C • Optical Text Extraction
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Expiry-Date OCR & Verification
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Automated parsing of embossed expiry dates (EXP, USE BEFORE) with user confirmation and manual fallbacks.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-soft space-y-6">
        <div className="p-6 bg-botanical-50/50 rounded-2xl border border-emerald-100 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-tealAccent-600 text-white flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-botanical-900">Dual-Engine OCR Architecture</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            EasyOCR / PaddleOCR backend adapter with regex normalization (MM/YYYY, DD/MM/YYYY) and safe fallback to manual entry when stamps are illegible.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-botanical-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Date Confidence Safeguard
            </span>
            <p className="text-slate-500">
              Never declares a medicine expired unless user confirms the parsed date or enters it manually.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-botanical-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Manufacturing Date Distinction
            </span>
            <p className="text-slate-500">
              Distinguishes MFG / BATCH from EXP stamps to avoid false expired determinations.
            </p>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link
            to="/identify"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-botanical-900 text-white text-xs font-semibold hover:bg-botanical-800 transition-colors"
          >
            Start with Waste Identification <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
