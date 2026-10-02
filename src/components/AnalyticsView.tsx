import React, { useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber } from '../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  Layers, 
  Percent
} from 'lucide-react';

interface AnalyticsViewProps {
  records: HostelRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records }) => {
  // Compute Month-Wise Aggregates
  const monthData = useMemo(() => {
    const map: Record<string, { month: string; revenue: number; net: number; deals: number; beds: number }> = {};

    records.forEach(r => {
      const m = r.paymentMonth || 'UNKNOWN';
      if (!map[m]) {
        map[m] = { month: m, revenue: 0, net: 0, deals: 0, beds: 0 };
      }
      map[m].revenue += r.total || 0;
      map[m].net += r.amount || 0;
      map[m].deals += 1;
      map[m].beds += r.beds || 0;
    });

    return Object.values(map);
  }, [records]);

  // Duration distribution (1M, 3M, 6M, 12M)
  const durationData = useMemo(() => {
    const map: Record<number, { months: number; count: number; revenue: number; beds: number }> = {};

    records.forEach(r => {
      const m = r.months || 1;
      if (!map[m]) {
        map[m] = { months: m, count: 0, revenue: 0, beds: 0 };
      }
      map[m].count += 1;
      map[m].revenue += r.total || 0;
      map[m].beds += r.beds || 0;
    });

    return Object.values(map).sort((a, b) => a.months - b.months);
  }, [records]);

  // Overall Financial Averages
  const averages = useMemo(() => {
    if (records.length === 0) return { avgDeal: 0, avgRate: 0, avgBeds: 0 };
    let sumTotal = 0;
    let sumRate = 0;
    let sumBeds = 0;
    records.forEach(r => {
      sumTotal += r.total || 0;
      sumRate += r.ratePerBed || 0;
      sumBeds += r.beds || 0;
    });

    return {
      avgDeal: sumTotal / records.length,
      avgRate: sumRate / records.length,
      avgBeds: sumBeds / records.length,
    };
  }, [records]);

  const maxMonthRev = useMemo(() => {
    return Math.max(...monthData.map(m => m.revenue), 1);
  }, [monthData]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <span>Revenue & Subscription Analytics</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Historical monetization trajectory, monthly collection bars, and contract duration trends.
        </p>
      </div>

      {/* Key Benchmark Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Average Deal Size</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {formatINR(averages.avgDeal)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Per hostel contract invoice</span>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Average Rate / Bed</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ₹{averages.avgRate.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all tiers & discounts</span>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Average Beds / Property</span>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">
            {averages.avgBeds.toFixed(1)} Beds
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Average client capacity</span>
        </div>
      </div>

      {/* Subscription Duration Breakdown */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Commitment Period Split (1M / 3M / 6M / 12M Plans)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {durationData.map((d) => (
            <div key={d.months} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-emerald-400 text-sm">{d.months} Month{d.months > 1 ? 's' : ''} Plan</span>
                <span className="font-mono text-white font-bold">{d.count} deals</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mb-1">
                {formatINR(d.revenue)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {formatNumber(d.beds)} beds covered
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Collection Trend Bar Chart */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Monthly Revenue Collection Trend</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {monthData.length} Billing Periods
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {monthData.map((m) => {
            const pct = (m.revenue / maxMonthRev) * 100;
            return (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-200 font-medium w-24 truncate">{m.month}</span>
                    <span className="text-slate-400 text-[11px]">({m.deals} deals · {formatNumber(m.beds)} beds)</span>
                  </div>
                  <span className="font-mono text-white font-bold">{formatINR(m.revenue)}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
