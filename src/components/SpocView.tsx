import React, { useState, useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber } from '../utils/formatters';
import { 
  Users, 
  Award, 
  IndianRupee, 
  Bed, 
  CheckCircle,
  Briefcase
} from 'lucide-react';

interface SpocViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
}

export const SpocView: React.FC<SpocViewProps> = ({
  records,
  onSelectRecord
}) => {
  const [selectedSpoc, setSelectedSpoc] = useState<string>('ALL');

  // Compute breakdown by SPOC
  const spocData = useMemo(() => {
    const map: Record<string, {
      name: string;
      deals: number;
      revenue: number;
      netAmount: number;
      beds: number;
      mrr: number;
      incentives: number;
      records: HostelRecord[];
    }> = {};

    records.forEach(r => {
      const s = r.spoc?.trim().toUpperCase() || 'UNASSIGNED';
      if (!map[s]) {
        map[s] = {
          name: s,
          deals: 0,
          revenue: 0,
          netAmount: 0,
          beds: 0,
          mrr: 0,
          incentives: 0,
          records: []
        };
      }
      map[s].deals += 1;
      map[s].revenue += r.total || 0;
      map[s].netAmount += r.amount || 0;
      map[s].beds += r.beds || 0;
      map[s].mrr += r.mrrAmount || r.mrr || 0;
      map[s].incentives += r.incentives || 0;
      map[s].records.push(r);
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [records]);

  const activeRep = useMemo(() => {
    if (selectedSpoc === 'ALL') return null;
    return spocData.find(s => s.name === selectedSpoc) || null;
  }, [selectedSpoc, spocData]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>SPOC Sales Performance & Incentives</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track business closed, total beds onboarded, and incentive commissions earned by each account manager.
          </p>
        </div>

        {/* SPOC Selector Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedSpoc('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedSpoc === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Reps
          </button>
          {spocData.map(s => (
            <button
              key={s.name}
              onClick={() => setSelectedSpoc(s.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedSpoc === s.name
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* SPOC Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {spocData.map((s, idx) => {
          const isSelected = selectedSpoc === s.name;
          return (
            <div
              key={s.name}
              onClick={() => setSelectedSpoc(isSelected ? 'ALL' : s.name)}
              className={`bg-slate-900/80 p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-emerald-500 shadow-md shadow-emerald-950/40 bg-slate-900' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{s.name}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Top Closer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5 block">{s.deals} Deals Closed</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
                  #{idx + 1}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Revenue:</span>
                  <span className="font-mono font-bold text-white">{formatINR(s.revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Beds:</span>
                  <span className="font-mono font-semibold text-emerald-400">{formatNumber(s.beds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">MRR Share:</span>
                  <span className="font-mono font-semibold text-blue-400">{formatINR(s.mrr)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-amber-400 font-medium">Incentives Earned:</span>
                  <span className="font-mono font-bold text-amber-400">{formatINR(s.incentives)}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Selected SPOC Detail View or All Deals */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              {selectedSpoc === 'ALL' ? 'All Account Managers Deals' : `${selectedSpoc}'s Closed Deals`}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {activeRep ? activeRep.records.length : records.length} Deals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 w-14 font-mono">#</th>
                <th className="py-2.5 px-3 min-w-[200px] font-medium">Hostel Name</th>
                <th className="py-2.5 px-3 min-w-[120px] font-medium">Location</th>
                <th className="py-2.5 px-3 font-medium">Plan</th>
                <th className="py-2.5 px-3 text-right font-medium">Beds</th>
                <th className="py-2.5 px-3 text-right font-medium">Total (₹)</th>
                <th className="py-2.5 px-3 text-right font-medium">Incentive (₹)</th>
                <th className="py-2.5 px-3 font-medium">SPOC</th>
                <th className="py-2.5 px-3 font-medium">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {(activeRep ? activeRep.records : records).slice(0, 100).map((r) => (
                <tr 
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">{r.sNo}</td>
                  <td className="py-2.5 px-3 font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {r.pgName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{r.location}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {r.plan}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200 tabular-nums">{r.beds}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-white tabular-nums">{formatINR(r.total)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-400 tabular-nums">
                    {r.incentives > 0 ? formatINR(r.incentives) : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">{r.spoc}</td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{r.paymentDate || r.paymentMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
