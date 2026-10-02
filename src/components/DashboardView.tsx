import React, { useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber } from '../utils/formatters';
import { 
  TrendingUp, 
  Bed, 
  Building2, 
  AlertCircle, 
  IndianRupee,
  Layers, 
  Award,
  ChevronRight,
  MapPin,
  Clock
} from 'lucide-react';

interface DashboardViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  onSelectRecord,
  onNavigateTab
}) => {
  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalGst = 0;
    let totalBeds = 0;
    let totalMrr = 0;
    let totalIncentives = 0;

    const uniqueHostels = new Set<string>();
    const planCounts: Record<string, { count: number; revenue: number; beds: number }> = {};
    const spocStats: Record<string, { deals: number; revenue: number; beds: number; incentives: number }> = {};
    const locationStats: Record<string, { count: number; beds: number; revenue: number }> = {};

    records.forEach((r) => {
      totalGross += r.total || 0;
      totalNet += r.amount || 0;
      totalGst += r.gst || 0;
      totalBeds += r.beds || 0;
      totalMrr += r.mrrAmount || r.mrr || 0;
      totalIncentives += r.incentives || 0;

      const normName = r.pgName.trim().toUpperCase();
      if (normName) uniqueHostels.add(normName);

      // Plan
      const p = r.plan || 'OTHER';
      if (!planCounts[p]) planCounts[p] = { count: 0, revenue: 0, beds: 0 };
      planCounts[p].count += 1;
      planCounts[p].revenue += r.total || 0;
      planCounts[p].beds += r.beds || 0;

      // SPOC
      const s = r.spoc || 'UNASSIGNED';
      if (!spocStats[s]) spocStats[s] = { deals: 0, revenue: 0, beds: 0, incentives: 0 };
      spocStats[s].deals += 1;
      spocStats[s].revenue += r.total || 0;
      spocStats[s].beds += r.beds || 0;
      spocStats[s].incentives += r.incentives || 0;

      // Location
      const loc = r.location || 'OTHER';
      if (!locationStats[loc]) locationStats[loc] = { count: 0, beds: 0, revenue: 0 };
      locationStats[loc].count += 1;
      locationStats[loc].beds += r.beds || 0;
      locationStats[loc].revenue += r.total || 0;
    });

    const topLocations = Object.entries(locationStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    const sortedSpocs = Object.entries(spocStats)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    return {
      totalGross,
      totalNet,
      totalGst,
      totalBeds,
      totalMrr,
      totalIncentives,
      uniqueHostelsCount: uniqueHostels.size,
      planCounts,
      sortedSpocs,
      topLocations
    };
  }, [records]);

  // Find upcoming / recent renewals needing attention
  const recentRecords = useMemo(() => {
    return records.slice(-6).reverse();
  }, [records]);

  // Records with notable balance remarks (e.g. pending installment)
  const pendingDuesRecords = useMemo(() => {
    return records.filter(r => {
      const rem = (r.remarks || '').toLowerCase();
      return rem.includes('pending') || rem.includes('need to pay') || rem.includes('balance') || rem.includes('partial');
    }).slice(0, 5);
  }, [records]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert for Pending Dues & Renewals */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Monetization Overview & Pending Dues</span>
              <span className="text-xs text-amber-400 font-normal">· {pendingDuesRecords.length} Active Installment Tracks</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track renewals, bed top-ups, partial payments, and sales incentives across all accounts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('renewals')}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
          >
            <span>View Renewal Tracker</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Gross Revenue */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Collected</span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono tabular-nums">
            {formatINR(stats.totalGross)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            GST included
          </div>
        </div>

        {/* Net Base Amount */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Base Amount</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-400 font-mono tabular-nums">
            {formatINR(stats.totalNet)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            GST 18%: {formatINR(stats.totalGst)}
          </div>
        </div>

        {/* Estimated MRR */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total MRR Sum</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-indigo-400 font-mono tabular-nums">
            {formatINR(stats.totalMrr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Monthly recurring value
          </div>
        </div>

        {/* Total Beds */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Beds</span>
            <Bed className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
            {formatNumber(stats.totalBeds)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Contracted capacity
          </div>
        </div>

        {/* Unique Hostels */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Unique Hostels</span>
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-400 font-mono tabular-nums">
            {stats.uniqueHostelsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {records.length} billing cycles
          </div>
        </div>

        {/* Incentives */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Incentives</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">
            {formatINR(stats.totalIncentives)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Paid to sales reps
          </div>
        </div>

      </div>

      {/* Middle Row: Plan Share & SPOC Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Plan Distribution */}
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Subscription Tier Share</h3>
            <span className="text-xs text-slate-400 font-mono">{Object.keys(stats.planCounts).length} Tiers</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(stats.planCounts).map(([planName, data]) => {
              const pct = stats.totalGross > 0 ? (data.revenue / stats.totalGross) * 100 : 0;
              const badgeColors: Record<string, string> = {
                SILVER: 'text-slate-300 bg-slate-700/50',
                GOLD: 'text-amber-300 bg-amber-900/40',
                'GOLD - COMMERCIAL': 'text-amber-400 bg-amber-800/40',
                BRONZE: 'text-orange-300 bg-orange-900/40',
              };

              return (
                <div key={planName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${badgeColors[planName] || 'text-slate-300 bg-slate-800'}`}>
                        {planName}
                      </span>
                      <span className="text-slate-400">{data.count} deals · {formatNumber(data.beds)} beds</span>
                    </div>
                    <span className="font-mono text-white font-semibold">{formatINR(data.revenue)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        planName.includes('GOLD') ? 'bg-amber-500' : planName === 'BRONZE' ? 'bg-orange-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SPOC Leaderboard */}
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">SPOC Sales Leaderboard</h3>
            <button 
              onClick={() => onNavigateTab('spoc')}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.sortedSpocs.map(([spocName, data], index) => {
              return (
                <div key={spocName} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-300">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">{spocName}</div>
                      <div className="text-[11px] text-slate-400">
                        {data.deals} deals · {formatNumber(data.beds)} beds
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">{formatINR(data.revenue)}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Incentive: {formatINR(data.incentives)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Top Revenue Locations</h3>
            <span className="text-xs text-slate-400 font-mono">Hubs</span>
          </div>

          <div className="space-y-3">
            {stats.topLocations.map(([locName, data], index) => {
              return (
                <div key={locName} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-200">{locName}</div>
                      <div className="text-[10px] text-slate-400">{data.count} deals · {formatNumber(data.beds)} beds</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-100">{formatINR(data.revenue)}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Recent Activity & Follow-up Needed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Recent Deals */}
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Latest Registered Deals</span>
            </h3>
            <button
              onClick={() => onNavigateTab('ledger')}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {recentRecords.map((r) => (
              <div 
                key={r.id} 
                onClick={() => onSelectRecord(r)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 px-2 rounded-lg transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {r.pgName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{r.location || 'N/A'}</span>
                    <span>·</span>
                    <span>{r.beds} Beds</span>
                    <span>·</span>
                    <span className="text-slate-300">{r.spoc}</span>
                    <span>·</span>
                    <span className="text-slate-400">{r.paymentDate || r.paymentMonth}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-white">{formatINR(r.total)}</div>
                  <div className="text-[10px] text-emerald-400/90 font-mono">MRR: {formatINR(r.mrrAmount || r.mrr)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deals with Installments & Notes */}
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Accounts with Pending Payment Notes</span>
            </h3>
            <button
              onClick={() => onNavigateTab('renewals')}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5"
            >
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {pendingDuesRecords.map((r) => (
              <div 
                key={r.id}
                onClick={() => onSelectRecord(r)}
                className="py-2.5 cursor-pointer hover:bg-slate-800/30 px-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {r.pgName}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200">{formatINR(r.total)}</span>
                </div>
                <p className="text-[11px] text-amber-300/80 bg-amber-950/30 border border-amber-900/40 p-1.5 rounded mt-1.5">
                  {r.remarks}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
