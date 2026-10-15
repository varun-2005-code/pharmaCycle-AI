import React from 'react';
import { Bot, MessageSquare, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export const AssistantPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tealAccent-50 text-tealAccent-800 text-xs font-semibold mb-3">
          <Bot className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4E • Grounded AI Assistant
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          AI Pharmaceutical Disposal Assistant
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Interactive chat assistant answering packaging disposal queries, grounded in approved health authority guidelines.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/60 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-botanical-900 to-tealAccent-600 flex items-center justify-center text-white shadow-md">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-botanical-900">Grounded Q&A Interface</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Retrieval-augmented Q&A pipeline with rules-backed FAQ fallback. Provides source citations and avoids medical diagnosis or drug consumption advice.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
              "How do I recycle empty blister foils?"
            </span>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
              "What to do with expired antibiotic capsules?"
            </span>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
              "Can glass cough syrup bottles be washed?"
            </span>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Safety Constraint:</strong> The assistant refuses requests to assess medicine efficacy, evaluate pill toxicity, or recommend self-treatment.
          </p>
        </div>
      </div>
    </div>
  );
};
