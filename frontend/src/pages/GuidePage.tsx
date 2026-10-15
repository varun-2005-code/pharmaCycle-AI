import React from 'react';
import { BookOpen, AlertOctagon, CheckCircle2, FileQuestion, Pill, Box, ShieldAlert } from 'lucide-react';

export const GuidePage: React.FC = () => {
  const guideSections = [
    {
      title: 'Expired & Unused Medicines (Tablets & Capsules)',
      materials: 'Active pharmaceutical ingredients, binders, gelatin/cellulose capsules',
      route: 'Authorized pharmacy take-back bins or specialized municipal drop-offs',
      dont: 'Do not flush down sinks or toilets; do not toss into household trash where pets or children can reach them',
      depends: 'Some regions provide seal-and-mail disposal bags, while others have central hospital take-backs',
    },
    {
      title: 'Empty Pharmaceutical Blister Packs',
      materials: 'Bonded PVC plastic and aluminium foil layers',
      route: 'Dedicated blister recycling drop-boxes (e.g. TerraCycle or pharmacy partners)',
      dont: 'Do not place in standard kerbside plastic recycling bins — the bonded layers cannot be processed by standard MRFs',
      depends: 'Check facility locator for verified drop-off hubs accepting empty blisters',
    },
    {
      title: 'Medicine Bottles & Syrup Containers',
      materials: 'Amber glass, HDPE, PET, plastic screw caps',
      route: 'Rinse thoroughly only if directed; remove personal prescription labels; place in municipal glass/plastic streams',
      dont: 'Do not leave residual liquid syrup inside recyclables',
      depends: 'Local municipal guidelines on cap removal and label washing',
    },
    {
      title: 'Cardboard Medicine Cartons & Paper Leaflets',
      materials: 'Clean cardboard, paper instruction leaflets',
      route: 'Standard municipal dry paper and cardboard recycling streams',
      dont: 'Do not recycle if soiled with spilled liquid medications',
      depends: 'Flatten cartons before recycling to optimize bin volume',
    },
    {
      title: 'Unknown or Contaminated Pharmaceutical Packaging',
      materials: 'Unmarked composites, damaged cytotoxic packaging, mystery compounds',
      route: 'Consult municipal hazardous waste handler or hospital environmental safety office',
      dont: 'Do not attempt to crush, burn, or dissolve unknown pharmaceutical chemicals',
      depends: 'Specialized chemical collection days in your municipality',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4H • Verified Disposal Guide
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          Pharmaceutical Waste Disposal Guide
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Comprehensive, material-by-material guidance distinguishing general stewardship from certified local disposal routes.
        </p>
      </div>

      <div className="space-y-6">
        {guideSections.map((sec, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            <h3 className="text-lg font-bold text-botanical-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-tealAccent-100 text-tealAccent-800 text-xs flex items-center justify-center font-bold">
                {idx + 1}
              </span>
              {sec.title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 block">Common Materials:</span>
                <p className="text-slate-600">{sec.materials}</p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Appropriate Disposal Route:
                </span>
                <p className="text-emerald-800">{sec.route}</p>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1">
                <span className="font-bold text-rose-900 block flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> What NOT To Do:
                </span>
                <p className="text-rose-800">{sec.dont}</p>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Depends On Local Rules:
                </span>
                <p className="text-amber-800">{sec.depends}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
