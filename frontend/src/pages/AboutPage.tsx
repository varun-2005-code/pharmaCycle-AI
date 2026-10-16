import React from 'react';
import { Link } from 'react-router-dom';
import {
  Info,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Recycle,
  Sparkles,
  BookOpen,
  BarChart3,
  ArrowRight,
  Cpu,
  Layers,
  Leaf,
  ScanLine,
  Calendar,
  Building2,
  Lock
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3 border border-botanical-200">
          <Info className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4I • About & Impact
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900">
          About PharmaCycle AI
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2">
          An environmental-health technology prototype advancing pharmaceutical waste identification, responsible disposal, and traceable lifecycle stewardship.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-soft space-y-10">
        
        {/* 1. The Problem & Purpose */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-tealAccent-700 bg-tealAccent-50 px-3 py-1 rounded-full">
            <Leaf className="w-3.5 h-3.5" />
            Environmental Problem & Purpose
          </div>
          <h2 className="text-2xl font-bold text-botanical-900">The Problem & Purpose</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every year, billions of unwanted or expired pharmaceutical products enter domestic solid waste and municipal wastewater streams.
            Active Pharmaceutical Ingredients (APIs)—including synthetic hormones, persistent antibiotics, and analgesics—pass largely unaltered through conventional wastewater treatment facilities.
            In aquatic ecosystems, these trace contaminants accelerate the emergence of <strong>antimicrobial resistance (AMR)</strong>, disrupt marine endocrine functions, and pose long-term ecotoxicological risks to drinking water aquifers.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            At the packaging level, composite multi-material packaging (such as <strong>polyvinyl chloride heat-bonded to aluminium foil</strong> in blister strips) cannot be mechanically segregated by standard municipal Material Recovery Facilities (MRFs). When consumers place blister strips into household recycling bins, they introduce batch-level contamination that causes entire loads to be rejected and sent to landfills or incinerators.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            <strong>PharmaCycle AI</strong> bridges this awareness and logistics gap by offering an accessible digital assistant that guides users through correct item separation, OCR-assisted expiry verification, authorized take-back location discovery, and immutable lifecycle status tracking.
          </p>
        </section>

        {/* 2. System Synergy: How Vision, OCR, Rules & Tracking Work Together */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-botanical-800 bg-botanical-50 px-3 py-1 rounded-full">
            <Cpu className="w-3.5 h-3.5 text-tealAccent-600" />
            Technical Synergy
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-botanical-900">
            How Vision, OCR, Rules, and Tracking Work Together
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            PharmaCycle AI combines four decoupled, purpose-built components into a unified workflow designed to avoid single points of failure or AI hallucinations:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-offwhite border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-botanical-900 font-bold text-sm">
                <ScanLine className="w-4 h-4 text-tealAccent-600" />
                1. Computer Vision Classifier
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Processes uploaded photographs to classify packaging into one of 5 standard categories (tablets, blisters, bottles, cartons, or unknown). Pluggable architecture supports ONNX runtime models with an explicit, un-hallucinated demo fallback mode.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-offwhite border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-botanical-900 font-bold text-sm">
                <Calendar className="w-4 h-4 text-tealAccent-600" />
                2. Expiry-Date OCR & Parser
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Optical text extraction parses EXP, EXPIRY, and USE BEFORE date labels while distinguishing them from MFG (manufacturing) and lot codes. Confirms date validity and flags ambiguous or unreadable stamps for manual user review.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-offwhite border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-botanical-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-tealAccent-600" />
                3. Deterministic Rules Engine
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Decoupled from generative language models, the rules engine outputs verified handling cautions and jurisdiction-specific disposal actions based strictly on material, confirmed expiry, and verified facility acceptance data.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-offwhite border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-botanical-900 font-bold text-sm">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                4. Digital Twin State Machine
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Models every item through an audited 5-stage lifecycle (<code className="text-[11px] font-mono">identified</code> → <code className="text-[11px] font-mono">awaiting_confirmation</code> → <code className="text-[11px] font-mono">collection_pending</code> → <code className="text-[11px] font-mono">collected</code> → <code className="text-[11px] font-mono">processed</code>). Terminal processing requires an immutable event record with physical custody evidence.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Identification vs. Verified Recycling */}
        <section className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-botanical-900 flex items-center gap-2">
            <Recycle className="w-5 h-5 text-tealAccent-600" />
            The Difference Between Identification and Verified Recycling
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            A critical principle of PharmaCycle AI is that <strong>identifying an object does not equate to recycling it</strong>.
          </p>
          <ul className="space-y-2 text-xs text-slate-700 list-disc pl-5">
            <li>
              <strong>Visual Detection:</strong> Recognizes visual packaging forms and logs an estimated digital twin record. It does not certify material purity or verify that the user completed disposal.
            </li>
            <li>
              <strong>Custodial Collection:</strong> Occurs when a registered take-back kiosk or municipal courier takes physical possession of the waste batch.
            </li>
            <li>
              <strong>Verified Treatment / Recovery:</strong> Occurs only when a licensed processing plant (such as a specialized blister foil delamination facility or high-temperature medical waste incinerator) records a certified destruction or material reclamation manifest.
            </li>
          </ul>
          <p className="text-xs text-slate-600 italic mt-1">
            Our Digital Twin dashboard strictly separates estimated / user-reported quantities from recorded collection events and verified processing certificates.
          </p>
        </section>

        {/* 4. Expected Environmental Benefits */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-botanical-900">
            Expected Environmental Benefits
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Without making speculative or unsupported numerical claims, the operational deployment of PharmaCycle AI is expected to yield concrete ecological benefits:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-botanical-900 block text-sm">Watershed Protection</span>
              <p className="text-slate-600">
                Preventing household toilet and sink flushing eliminates direct API shock loads into river basins and coastal marine life habitats.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-botanical-900 block text-sm">Contamination Reduction</span>
              <p className="text-slate-600">
                Educating consumers to keep non-recyclable composite blister foils out of domestic blue bins protects municipal paper and plastic recovery streams.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-botanical-900 block text-sm">Circular Material Recovery</span>
              <p className="text-slate-600">
                Directing clean amber glass, paper cartons, and specialized blister packs to dedicated recovery programs enables industrial-scale resource reclamation.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Mandatory Section per 4I: What the Prototype CAN and CANNOT Do */}
        <section className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200 space-y-4">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold text-botanical-900 flex items-center justify-center sm:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-tealAccent-600" />
              What the Prototype Can and Cannot Do
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Honest transparency regarding current prototype capabilities and boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* What it CAN do */}
            <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-2xs space-y-3">
              <span className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What It CAN Do
              </span>
              <ul className="space-y-2 text-slate-700 list-disc pl-4">
                <li>
                  <strong>Classify visual waste forms:</strong> Recognizes tablets, empty blister packs, medicine containers, cardboard cartons, and unknown items.
                </li>
                <li>
                  <strong>Extract & normalize expiry dates:</strong> Runs local OCR to extract text stamps and parse standard dates (MM/YYYY, MM/YY, DD/MM/YYYY).
                </li>
                <li>
                  <strong>Deterministic disposal rules:</strong> Outputs verified health authority guidance without LLM hallucinations.
                </li>
                <li>
                  <strong>Locate verified drop-off hubs:</strong> Filters collection centres by city, PIN, and accepted categories with verified badges.
                </li>
                <li>
                  <strong>Track Digital Twin lifecycle:</strong> Enforces state machine progression with audit logging and sample demo data loading/reset.
                </li>
                <li>
                  <strong>Grounded assistance:</strong> Provides answers strictly grounded in verified guidelines, refusing medical or appearance claims.
                </li>
              </ul>
            </div>

            {/* What it CANNOT do */}
            <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-2xs space-y-3">
              <span className="font-bold text-rose-800 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> What It CANNOT Do
              </span>
              <ul className="space-y-2 text-slate-700 list-disc pl-4">
                <li>
                  <strong>Cannot test chemical composition:</strong> Cannot analyze active drug molecules, degradation, or chemical purity from a photograph.
                </li>
                <li>
                  <strong>Cannot judge safety from appearance:</strong> A pristine pill can be chemically expired; visual inspection never proves clinical safety.
                </li>
                <li>
                  <strong>Cannot authenticate counterfeit drugs:</strong> Does not verify pharmaceutical supply chain authenticity or security holograms.
                </li>
                <li>
                  <strong>Cannot provide medical diagnoses:</strong> Does not prescribe, recommend dosages, or advise on consuming medications.
                </li>
                <li>
                  <strong>Cannot fabricate facilities:</strong> Does not invent fictitious drop-off locations or claim unverified bins accept controlled drugs.
                </li>
                <li>
                  <strong>Does not guarantee curbside acceptance:</strong> Municipal recycling rules vary widely; users must verify with local authorities.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Prototype Limitations & Future Roadmap */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-botanical-900">
            Prototype Limitations & Future Roadmap
          </h2>
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-slate-700 space-y-2">
            <p>
              <strong>Current Prototype Limitations:</strong> The current build operates in a hackathon development environment utilizing SQLite, local OCR fallback mechanisms, mock model adapters when real ONNX weights are unmounted, and dev-token admin authentication.
            </p>
            <p>
              <strong>Production Roadmap:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Integration with national GS1 DataMatrix pharmaceutical barcodes and serialized 2D code lookup APIs.</li>
              <li>IoT weight sensor integration for municipal smart deposit kiosks with RFID container tracking.</li>
              <li>Multi-lingual support across regional languages and localized municipal waste bylaws.</li>
              <li>Enterprise OAuth 2.0 / OpenID Connect security with role-based access for hospital waste contractors.</li>
            </ul>
          </div>
        </section>

        {/* 7. Actionable Navigation CTAs */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Ready to test the PharmaCycle AI workflow?
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/identify"
              className="px-5 py-2.5 rounded-xl bg-botanical-900 text-white font-semibold text-xs hover:bg-botanical-800 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-tealAccent-400" /> Identify Waste
            </Link>
            <Link
              to="/guide"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-botanical-700" /> Disposal Guide
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> Tracking Dashboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
