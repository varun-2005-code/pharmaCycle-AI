import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Recycle,
  Sparkles,
  BookOpen,
  MapPin,
  BarChart3,
  Bot,
  Info,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import type { HealthResponse } from '../types';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const location = useLocation();

  const fetchHealth = async () => {
    try {
      setHealthStatus('checking');
      const res = await fetch('/api/health');
      if (res.ok) {
        const data: HealthResponse = await res.json();
        setHealth(data);
        setHealthStatus(data.status === 'healthy' ? 'healthy' : 'error');
      } else {
        setHealthStatus('error');
      }
    } catch {
      setHealthStatus('error');
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/', icon: Recycle },
    { name: 'Identify Waste', path: '/identify', icon: Sparkles },
    { name: 'Disposal Guide', path: '/guide', icon: BookOpen },
    { name: 'Collection Centres', path: '/facilities', icon: MapPin },
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Assistant', path: '/assistant', icon: Bot },
    { name: 'About', path: '/about', icon: Info },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-botanical-900 to-tealAccent-600 flex items-center justify-center text-white shadow-md shadow-botanical-900/15 group-hover:scale-105 transition-transform duration-200">
                <Recycle className="w-6 h-6 animate-spin-slow" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-botanical-900 tracking-tight flex items-center gap-1.5">
                  PharmaCycle <span className="text-tealAccent-600 font-black">AI</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  Smart Recycling Assistant
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-botanical-50 text-botanical-900 font-semibold'
                        : 'text-slate-600 hover:text-botanical-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-tealAccent-600' : 'text-slate-400'}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Header Section: Health Pill & Sign In */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Backend Health Badge */}
              <button
                onClick={fetchHealth}
                title="Click to recheck API status"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  healthStatus === 'healthy'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : healthStatus === 'checking'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {healthStatus === 'healthy' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      healthStatus === 'healthy'
                        ? 'bg-emerald-500'
                        : healthStatus === 'checking'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </span>
                <span>
                  {healthStatus === 'healthy'
                    ? `API: Healthy (v${health?.version || '1.0'})`
                    : healthStatus === 'checking'
                    ? 'API: Connecting...'
                    : 'API: Disconnected'}
                </span>
                <RefreshCw className={`w-3 h-3 ml-0.5 opacity-60 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
              </button>

              {/* Sign In / Auth Button */}
              <button
                onClick={() => setShowSignInModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-botanical-900 border border-botanical-200 hover:bg-botanical-50 transition-colors shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-tealAccent-600" />
                Sign In
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-botanical-900 hover:bg-slate-100"
                aria-label="Toggle Navigation"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-emerald-100 bg-white px-4 pt-3 pb-5 space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">API Connectivity:</span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  healthStatus === 'healthy'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {healthStatus === 'healthy' ? 'Healthy' : 'Offline'}
              </span>
            </div>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    active
                      ? 'bg-botanical-50 text-botanical-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-tealAccent-600' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSignInModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-botanical-900 text-white text-sm font-semibold hover:bg-botanical-800"
              >
                <UserCheck className="w-4 h-4 text-tealAccent-400" />
                Sign In (Demo Access)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Demo Sign In Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-emerald-100 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-botanical-50 flex items-center justify-center text-botanical-800 mb-3">
              <ShieldCheck className="w-6 h-6 text-tealAccent-600" />
            </div>
            <h3 className="text-lg font-bold text-botanical-900">Demo Environment Access</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              PharmaCycle AI is currently running in hackathon prototype mode. All public features are accessible without credentials.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Role:</span>
                <span className="font-semibold text-botanical-900">Guest Evaluator</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admin Mode:</span>
                <Link to="/admin" onClick={() => setShowSignInModal(false)} className="text-tealAccent-600 font-medium hover:underline">
                  Visit /admin
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Database:</span>
                <span className="font-medium text-emerald-700">{health?.database || 'SQLite'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowSignInModal(false)}
              className="mt-5 w-full py-2 px-4 rounded-xl bg-botanical-900 text-white font-semibold text-sm hover:bg-botanical-800 transition-colors"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}
    </>
  );
};
