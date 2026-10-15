import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ScanLine,
  CheckCircle2,
  MapPin,
  BarChart3,
  Recycle,
  Layers,
  Calendar,
  FileText,
  Activity,
  HeartPulse,
  Leaf
} from 'lucide-react';
import type { HealthResponse } from '../types';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="bg-botanical-mesh">
      {/* 1. HERO SECTION (Section 4A) */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-botanical-100/80 border border-botanical-200 text-botanical-900 text-xs font-semibold">
                <Leaf className="w-3.5 h-3.5 text-tealAccent-600" />
                <span>Environmental Health & Circular Pharma</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-botanical-900 tracking-tight leading-[1.15]">
                Smarter Pharmaceutical Waste Management Starts Here.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                PharmaCycle AI helps households and healthcare facilities accurately identify pharmaceutical waste, separate medicines from blister packaging, discover authorized take-back centres, and trace verifiable recycling outcomes.
              </p>

              {/* CTAs per Section 4A */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/identify"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-botanical-900 hover:bg-botanical-800 text-white font-semibold text-sm shadow-md shadow-botanical-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-tealAccent-400" />
                  Identify Waste
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  to="/guide"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-botanical-900 font-semibold text-sm border border-botanical-200 shadow-xs transition-all hover:border-botanical-300"
                >
                  <BookOpen className="w-4 h-4 text-tealAccent-600" />
                  Explore Disposal Guide
                </Link>
              </div>

              {/* System Connectivity Callout */}
              <div className="pt-4 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  FastAPI SQLite Backend: {health ? 'Connected & Healthy' : 'Initializing / Offline'}
                </span>
                <span>•</span>
                <span>State Machine Engine: Active</span>
              </div>
            </div>

            {/* Right Column: Visually Attractive Upload / Scan Illustration */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 shadow-soft-lg border border-emerald-100">
                <div className="absolute -top-3 -right-3 bg-tealAccent-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-md">
                  Interactive Demo
                </div>

                <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center bg-botanical-50/50 hover:bg-botanical-50 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-botanical-800 to-tealAccent-500 flex items-center justify-center text-white shadow-md">
                    <ScanLine className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-botanical-900 text-base">Waste Scanner Preview</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag and drop tablet blister packs, medicine containers, or packaging carton images.
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-emerald-100 grid grid-cols-2 gap-2 text-left">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 block font-medium">Model Mode</span>
                      <span className="font-semibold text-botanical-900">Demo Simulation</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 block font-medium">Target Category</span>
                      <span className="font-semibold text-tealAccent-700">Blister Pack / Strips</span>
                    </div>
                  </div>

                  <Link
                    to="/identify"
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-botanical-900 text-white font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-botanical-800 transition-colors"
                  >
                    Launch Full Scanner <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FOUR CORE FEATURE CARDS (Section 4A) */}
      <section className="py-16 bg-white border-y border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-botanical-900">
              Complete End-to-End Waste Recovery Workflow
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Combining visual classification, optical character verification, local collection logistics, and tamper-resistant tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: AI Identification */}
            <div className="p-6 rounded-2xl bg-offwhite border border-slate-200/80 card-hover-effect">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-botanical-900 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-tealAccent-600" />
              </div>
              <h3 className="font-bold text-base text-botanical-900 mb-2">AI Identification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Separates loose medicine tablets, multilayer blister strips, bottles, and clean outer cardboard cartons into distinct waste categories.
              </p>
            </div>

            {/* Card 2: Expiry Assistance */}
            <div className="p-6 rounded-2xl bg-offwhite border border-slate-200/80 card-hover-effect">
              <div className="w-12 h-12 rounded-xl bg-tealAccent-100 text-tealAccent-800 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-tealAccent-700" />
              </div>
              <h3 className="font-bold text-base text-botanical-900 mb-2">Expiry Assistance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Optical text analysis extracts candidate expiry dates from embossed foils and cartons, with safe user confirmation and fallback flows.
              </p>
            </div>

            {/* Card 3: Safe Disposal Guidance */}
            <div className="p-6 rounded-2xl bg-offwhite border border-slate-200/80 card-hover-effect">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-botanical-900 mb-2">Safe Disposal Guidance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deterministic rules prevent hazardous sewer disposal and advise users on authorized take-back boxes and specialized material recyclers.
              </p>
            </div>

            {/* Card 4: Waste Tracking */}
            <div className="p-6 rounded-2xl bg-offwhite border border-slate-200/80 card-hover-effect">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-700" />
              </div>
              <h3 className="font-bold text-base text-botanical-900 mb-2">Waste Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Digital Twin state machine models the lifecycle from identification to collection and certified treatment events.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. WORKFLOW SECTION: Identify -> Verify -> Dispose -> Track (Section 4A) */}
      <section className="py-16 bg-botanical-mesh">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold text-tealAccent-600 tracking-wider">Step-by-Step Flow</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-botanical-900 mt-1">
              From Household Waste to Verified Recovery
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            
            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
              <span className="text-2xl font-black text-botanical-200 absolute top-4 right-4">01</span>
              <div className="w-8 h-8 rounded-lg bg-botanical-900 text-white flex items-center justify-center font-bold text-xs mb-3">
                1
              </div>
              <h4 className="font-bold text-sm text-botanical-900">Identify</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Capture packaging or medicine strip photo to detect material category.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
              <span className="text-2xl font-black text-botanical-200 absolute top-4 right-4">02</span>
              <div className="w-8 h-8 rounded-lg bg-tealAccent-600 text-white flex items-center justify-center font-bold text-xs mb-3">
                2
              </div>
              <h4 className="font-bold text-sm text-botanical-900">Verify</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Confirm candidate expiry dates and check local facility acceptance status.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
              <span className="text-2xl font-black text-botanical-200 absolute top-4 right-4">03</span>
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs mb-3">
                3
              </div>
              <h4 className="font-bold text-sm text-botanical-900">Dispose</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Deliver to verified drop-off bins without flushing or hazardous landfill dumping.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
              <span className="text-2xl font-black text-botanical-200 absolute top-4 right-4">04</span>
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs mb-3">
                4
              </div>
              <h4 className="font-bold text-sm text-botanical-900">Track</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Log manifest events through the Digital Twin state machine until processed.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. STATISTICS SECTION (Explicitly Labelled Demo Data per Section 4A & 9) */}
      <section className="py-14 bg-botanical-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-botanical-900">
            <div>
              <h3 className="text-lg font-bold text-white">Platform Activity & Pilot Metrics</h3>
              <p className="text-xs text-slate-400">Benchmark monitoring across active collection pilot hubs.</p>
            </div>
            <span className="mt-2 md:mt-0 text-[11px] px-2.5 py-1 rounded-full bg-botanical-900 text-tealAccent-300 border border-botanical-800 font-medium">
              Demo Simulation Dataset
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-botanical-900/60 rounded-xl border border-botanical-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-tealAccent-400">1,240+</span>
              <span className="block text-xs text-slate-300 mt-1">Waste Items Identified</span>
            </div>
            <div className="p-4 bg-botanical-900/60 rounded-xl border border-botanical-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">88%</span>
              <span className="block text-xs text-slate-300 mt-1">Blister Packs Separated</span>
            </div>
            <div className="p-4 bg-botanical-900/60 rounded-xl border border-botanical-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-tealAccent-400">42</span>
              <span className="block text-xs text-slate-300 mt-1">Verified Drop-off Points</span>
            </div>
            <div className="p-4 bg-botanical-900/60 rounded-xl border border-botanical-800">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">0</span>
              <span className="block text-xs text-slate-300 mt-1">Unverified Sewer Flushes</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ENVIRONMENTAL PROBLEM & RESPONSIBLE DISPOSAL SECTION (Section 4A) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                The Environmental Challenge
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-botanical-900">
                Why Pharmaceutical Waste Requires Specialized Handling
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Improperly flushed medications leach active pharmaceutical compounds into groundwater and aquatic ecosystems, accelerating antimicrobial resistance (AMR) and disrupting biological life. Standard municipal wastewater treatment plants are not engineered to eliminate dissolved synthetic hormones and antibiotics.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Furthermore, blister packs composed of bonded PVC and aluminium cannot be melted in ordinary plastic recycling streams, causing entire recycling batches to be condemned to incinerators or landfills.
              </p>
            </div>

            <div className="bg-botanical-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
              <h3 className="text-base font-bold text-botanical-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-tealAccent-600" />
                Our Responsible Stewardship Rules
              </h3>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-botanical-900 shrink-0">1.</span>
                  <span><strong>Never flush medicines</strong>: Sinks and toilets directly discharge persistent chemical agents into local watersheds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-botanical-900 shrink-0">2.</span>
                  <span><strong>Separate packaging</strong>: Detach clean cardboard cartons and leaflets for municipal paper recycling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-botanical-900 shrink-0">3.</span>
                  <span><strong>Use take-back kiosks</strong>: Deliver unused tablets to certified take-back pharmacies with verified high-temperature destruction protocols.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-tealAccent-700 hover:text-tealAccent-800"
                >
                  Read our full methodology & prototype limitations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
