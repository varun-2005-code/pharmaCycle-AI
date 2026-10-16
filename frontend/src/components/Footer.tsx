import React from 'react';
import { Link } from 'react-router-dom';
import {
  Recycle,
  ShieldAlert,
  FileText,
  Mail,
  ExternalLink,
  HeartHandshake
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-botanical-950 text-slate-300 border-t border-botanical-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-tealAccent-500 flex items-center justify-center text-botanical-950 font-bold shadow-md">
                <Recycle className="w-5 h-5 text-botanical-950" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                PharmaCycle <span className="text-tealAccent-400">AI</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart Pharmaceutical Waste Assistant. Promoting safe disposal, verifiable recovery, and traceable environmental stewardship.
            </p>
            <div className="pt-2">
              <span className="inline-block text-[11px] font-medium text-tealAccent-300 bg-botanical-900/60 border border-botanical-800 rounded-full px-3 py-1">
                "Identify Smart. Dispose Safe. Recover Responsibly."
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Core Capabilities
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/identify" className="hover:text-tealAccent-400 transition-colors">
                  AI Waste Identification
                </Link>
              </li>
              <li>
                <Link to="/ocr" className="hover:text-tealAccent-400 transition-colors">
                  Expiry-Date OCR
                </Link>
              </li>
              <li>
                <Link to="/guide" className="hover:text-tealAccent-400 transition-colors">
                  Disposal Guidelines
                </Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-tealAccent-400 transition-colors">
                  Collection Centre Locator
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-tealAccent-400 transition-colors">
                  Digital Twin Dashboard
                </Link>
              </li>
              <li>
                <Link to="/assistant" className="hover:text-tealAccent-400 transition-colors">
                  AI Guidance Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance & Safety (Section 4A spec requirements) */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Transparency & Safety
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/about" className="hover:text-tealAccent-400 transition-colors">
                  About & Environmental Impact
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-tealAccent-400 transition-colors">
                  Safety & Handling Instructions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-tealAccent-400 transition-colors">
                  Privacy & Data Retention
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-tealAccent-400 transition-colors">
                  Documentation & API Specs
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Hackathon Info */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Support & Community
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-tealAccent-400" />
                <Link to="/contact" className="hover:text-tealAccent-400 transition-colors">
                  Contact Support & Municipal Teams
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-tealAccent-400" />
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-tealAccent-400 transition-colors flex items-center gap-1"
                >
                  Backend API Health <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li className="flex items-center gap-2">
                <HeartHandshake className="w-3.5 h-3.5 text-tealAccent-400" />
                <span>Smart Recycling Prototype</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer per Section 1 & 7 */}
        <div className="border-t border-botanical-900 mt-10 pt-6 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-start gap-2 bg-botanical-900/40 p-3 rounded-xl border border-botanical-800/80">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-200">Prototype Disclaimer:</strong> Identifying a pharmaceutical package does not guarantee expiry date, chemical safety, or recyclability. Never flush medicines down sinks or toilets unless specifically instructed by local authorities.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-slate-400">
            <p>© {new Date().getFullYear()} PharmaCycle AI. All rights reserved.</p>
            <p className="text-[10px]">Built for Smart Environmental Health & Circular Economy</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
