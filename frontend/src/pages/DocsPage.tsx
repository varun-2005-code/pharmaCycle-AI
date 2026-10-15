import React from 'react';
import { FileCode, ExternalLink, Database, Server, Cpu } from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <FileCode className="w-3.5 h-3.5 text-tealAccent-600" />
          Technical Architecture
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Documentation & API Specifications
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Architecture overview, REST endpoints, database schemas, and AI pipeline adapters.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft space-y-6 text-xs sm:text-sm">
        <div className="p-4 rounded-2xl bg-botanical-50 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-botanical-900 text-sm">Interactive Swagger / OpenAPI Docs</h3>
            <p className="text-slate-600 text-xs mt-0.5">Explore FastAPI live interactive schema documentation and execute endpoints.</p>
          </div>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-botanical-900 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-botanical-800 transition-colors shadow-xs"
          >
            Launch Swagger UI <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200">
            <Server className="w-5 h-5 text-tealAccent-600 mb-2" />
            <h4 className="font-bold text-botanical-900">Backend Core</h4>
            <p className="text-slate-500 mt-1">FastAPI, Python 3.14, Pydantic V2, Uvicorn, structured logging.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200">
            <Database className="w-5 h-5 text-tealAccent-600 mb-2" />
            <h4 className="font-bold text-botanical-900">Database Layer</h4>
            <p className="text-slate-500 mt-1">SQLAlchemy ORM, SQLite development engine with PostgreSQL migration readiness.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200">
            <Cpu className="w-5 h-5 text-tealAccent-600 mb-2" />
            <h4 className="font-bold text-botanical-900">State Machine</h4>
            <p className="text-slate-500 mt-1">Validated transitions with audit-locked processed event requirement.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
