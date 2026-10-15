import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
  RefreshCw,
  Edit3,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  FileCheck
} from 'lucide-react';

interface OcrResponse {
  extracted_text: string;
  candidate_date: string | null;
  normalized_date: string | null;
  is_expired: boolean | null;
  verification_status: string;
  confidence_score: number | null;
  engine_mode: string;
  labels_detected: string[];
  manufacturing_date_detected?: string | null;
  disclaimer: string;
}

export const OcrPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [manualDateInput, setManualDateInput] = useState('');
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrResult(null);
      setUserConfirmed(false);
      setErrorMessage(null);
    }
  };

  const handleRunOcr = async (useManual = false) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    if (useManual) {
      if (!manualDateInput.trim()) {
        setErrorMessage('Please enter a date string to verify (e.g. MM/YYYY or DD/MM/YYYY).');
        setIsProcessing(false);
        return;
      }
      formData.append('manual_date', manualDateInput.trim());
    } else {
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
    }

    try {
      const res = await fetch('/api/ocr/expiry', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'OCR processing failed.');
      }

      const data: OcrResponse = await res.json();
      setOcrResult(data);
      if (data.verification_status === 'manual_entry' || data.verification_status === 'confirmed') {
        setUserConfirmed(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing OCR service.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetSample = (text: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append('sample_text', text);

    fetch('/api/ocr/expiry', {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then((data: OcrResponse) => {
        setOcrResult(data);
        setUserConfirmed(false);
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setIsProcessing(false));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 lg:py-14">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tealAccent-100 text-tealAccent-900 text-xs font-semibold mb-3">
          <Calendar className="w-3.5 h-3.5 text-tealAccent-700" />
          Section 4C • Optical Text Recognition
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900 tracking-tight">
          Expiry-Date OCR & Verification
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Automated extraction of embossed expiration stamps with manufacturing date disambiguation, safe user confirmation, and manual entry fallbacks.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-amber-900">Safety Verification Directive:</strong>
          <span className="text-amber-800 ml-1">
            Never declare a medicine expired unless an expiration date is verified and confirmed. If stamps are unreadable or conflicting, the status remains <strong>"Expiry not verified"</strong>.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Upload / Manual Input (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-soft">
            <h3 className="font-bold text-sm text-botanical-900 mb-3 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-tealAccent-600" />
              Upload Packaging or Blister Foil
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-100 bg-slate-50 p-3">
                <img
                  src={previewUrl}
                  alt="Packaging crop"
                  className="max-h-60 mx-auto object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setOcrResult(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-200 hover:border-emerald-300 rounded-2xl p-8 text-center cursor-pointer bg-botanical-50/50 hover:bg-botanical-50 transition-colors"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-tealAccent-100 text-tealAccent-800 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-tealAccent-700" />
                </div>
                <p className="font-bold text-xs text-botanical-900">
                  Click to select stamped blister foil or packaging image
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Supports JPG, PNG, WEBP (Max 5 MB)
                </span>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRunOcr(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-botanical-900 hover:bg-botanical-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-tealAccent-400" /> Scanning Image...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 text-tealAccent-400" /> Read Expiry Date via OCR
                  </>
                )}
              </button>
            </div>

            {/* Quick Test Presets (Section 4C) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Simulated Test Stamps
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePresetSample("MFG: 01/2024\nBATCH: 881\nEXP: 12/2028")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 text-left font-medium"
                >
                  🟢 Valid Future (EXP: 12/2028)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSample("MFG: 05/2018\nBATCH: 110\nEXPIRY: 08/2021")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-700 text-left font-medium"
                >
                  🔴 Expired Date (EXP: 08/2021)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSample("MFG DATE: 03/2023\nBATCH NO: 9942")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 text-slate-700 text-left font-medium"
                >
                  🟡 Ambiguous (MFG Only)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSample("UNREADABLE EMBOSSING / SCRATCHED")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-left font-medium"
                >
                  ⚪ Faint / Unverified
                </button>
              </div>
            </div>

            {/* Manual Date Override (Mandatory per Section 4C) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs font-bold text-botanical-900 flex items-center gap-1.5 mb-2">
                <Edit3 className="w-3.5 h-3.5 text-tealAccent-600" />
                Manual Date Entry Fallback
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                If the embossed stamp is worn, curved, or unreadable, enter the visible date directly:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 12/2026 or 15/10/2026"
                  value={manualDateInput}
                  onChange={(e) => setManualDateInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-tealAccent-600"
                />
                <button
                  type="button"
                  onClick={() => handleRunOcr(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-botanical-900 font-semibold text-xs rounded-xl transition-colors"
                >
                  Confirm Date
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: OCR Analysis & Confirmation Results (6 Cols) */}
        <div className="lg:col-span-6">
          {ocrResult ? (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-soft space-y-5 animate-in fade-in duration-300">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  OCR Verification Result
                </span>
                <span className="text-[11px] font-semibold text-tealAccent-800 bg-tealAccent-50 px-2.5 py-0.5 rounded-full border border-tealAccent-200">
                  {ocrResult.engine_mode === 'manual' ? 'User Manual Confirmation' : 'OCR Parser Pipeline'}
                </span>
              </div>

              {/* Status Badge */}
              <div className="p-4 rounded-2xl border text-xs space-y-2.5 bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Candidate Date:</span>
                  <span className="text-base font-extrabold text-botanical-900 font-mono">
                    {ocrResult.candidate_date || 'None Detected'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Expiration Status:</span>
                  {ocrResult.is_expired === true ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" /> EXPIRED
                    </span>
                  ) : ocrResult.is_expired === false ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> VALID (NOT EXPIRED)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full text-xs">
                      <HelpCircle className="w-3.5 h-3.5" /> EXPIRY NOT VERIFIED
                    </span>
                  )}
                </div>

                {ocrResult.normalized_date && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Normalized ISO:</span>
                    <span className="font-mono text-slate-700 font-semibold">{ocrResult.normalized_date}</span>
                  </div>
                )}
              </div>

              {/* Distinguishing MFG Date */}
              {ocrResult.manufacturing_date_detected && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-blue-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Manufacturing Date Safeguard:
                  </span>
                  <p className="text-blue-800 text-[11px]">
                    Identified manufacturing stamp <code>{ocrResult.manufacturing_date_detected}</code>. The system protected this date from being wrongly treated as an expiry date.
                  </p>
                </div>
              )}

              {/* Extracted Raw Text Display */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 block">Extracted Packaging Text:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {ocrResult.extracted_text}
                </pre>
              </div>

              {/* User Confirmation Checkbox */}
              {ocrResult.candidate_date && (
                <div className="p-4 rounded-xl bg-botanical-50 border border-emerald-200 text-xs space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userConfirmed}
                      onChange={(e) => setUserConfirmed(e.target.checked)}
                      className="mt-0.5 rounded-sm border-slate-300 text-tealAccent-600 focus:ring-tealAccent-500"
                    />
                    <span className="text-botanical-900 leading-relaxed">
                      <strong>I visually confirm</strong> that <code>{ocrResult.candidate_date}</code> matches the expiry date stamped on the physical container.
                    </span>
                  </label>
                </div>
              )}

              {/* Suggested Next Action */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  to={`/recommendations?category=Medicine%20or%20tablet%20strip&expiry=${
                    ocrResult.is_expired === true
                      ? 'confirmed_expired'
                      : ocrResult.is_expired === false
                      ? 'confirmed_valid'
                      : 'unverified'
                  }`}
                  className="w-full py-3 px-4 rounded-xl bg-botanical-900 hover:bg-botanical-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  Proceed to Disposal Recommendations <ArrowRight className="w-4 h-4 text-tealAccent-400" />
                </Link>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-4 text-slate-500">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                <FileCheck className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">No OCR Scan Active</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Upload a packaging image, test a preset sample, or type a date string manually to begin verification.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
