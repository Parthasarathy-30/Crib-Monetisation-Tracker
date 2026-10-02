import React, { useState, useMemo, useEffect } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber, formatDisplayDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { SubscriptionFilter } from './SubscriptionFilter';
import { 
  TrendingUp, 
  Bed, 
  Building2, 
  Search, 
  AlertCircle, 
  Calendar,
  Phone,
  ArrowUpRight, 
  SlidersHorizontal 
} from 'lucide-react';

interface FirstPayMrrViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
  onToggleStatus: (recordId: string, status: 'PAID' | 'UNPAID' | 'YET_TO_PAY') => void;
}

export const FirstPayMrrView: React.FC<FirstPayMrrViewProps> = ({
  records,
  onSelectRecord
}) => {
  // CRITICAL RULE: ONLY FIRST PAY deals count as MRR! Renewal pay is strictly excluded!
  const firstPayRecords = useMemo(() => {
    return records.filter(r => {
      const pType = (r.paymentType || '').trim().toUpperCase();
      return pType.includes('FIRST');
    });
  }, [records]);

  // Aggregate First Pay MRR by Payment Month
  const monthlyData = useMemo(() => {
    const monthsMap = new Map<string, {
      monthKey: string;
      mrrTotal: number;
      records: HostelRecord[];
      bedsTotal: number;
      sortKey: number;
    }>();

    const monthOrder: { [k: string]: number } = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    firstPayRecords.forEach(r => {
      let rawMonth = (r.paymentMonth || '').trim();
      if (!rawMonth && r.paymentDate) {
        const parts = r.paymentDate.split('-');
        if (parts.length >= 3) {
          rawMonth = `${parts[1]} ${parts[2]}`;
        }
      }
      if (!rawMonth) rawMonth = 'Unknown';

      if (!monthsMap.has(rawMonth)) {
        let m = 1;
        let y = 2026;
        const pParts = rawMonth.split(/[\s-]+/);
        pParts.forEach(p => {
          const lower = p.toLowerCase();
          if (monthOrder[lower] || monthOrder[lower.slice(0, 3)]) {
            m = monthOrder[lower] || monthOrder[lower.slice(0, 3)];
          }
          if (/^\d{4}$/.test(p)) y = parseInt(p, 10);
          else if (/^\d{2}$/.test(p)) y = 2000 + parseInt(p, 10);
        });

        monthsMap.set(rawMonth, {
          monthKey: rawMonth,
          mrrTotal: 0,
          records: [],
          bedsTotal: 0,
          sortKey: y * 100 + m
        });
      }

      const item = monthsMap.get(rawMonth)!;
      const mrrValue = r.mrr || r.mrrAmount || (r.months > 0 ? Math.round(r.amount / r.months) : r.amount);
      item.mrrTotal += mrrValue;
      item.records.push(r);
      item.bedsTotal += (r.beds || 0);
    });

    const sortedList = Array.from(monthsMap.values());
    sortedList.sort((a, b) => b.sortKey - a.sortKey);
    return sortedList;
  }, [firstPayRecords]);

  // Current system month detection for MRR
  const currentSystemMonth = useMemo(() => {
    const match = monthlyData.find(m => m.monthKey.toLowerCase().includes('sep 2026') || m.monthKey.toLowerCase().includes('oct 2026'));
    if (match) return match.monthKey;
    return monthlyData[0]?.monthKey || 'Sep 2026';
  }, [monthlyData]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentSystemMonth);

  useEffect(() => {
    if (currentSystemMonth && !selectedMonthKey) {
      setSelectedMonthKey(currentSystemMonth);
    }
  }, [currentSystemMonth]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedSpoc, setSelectedSpoc] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedSubscriptionMonths, setSelectedSubscriptionMonths] = useState<number | 'ALL'>('ALL');
  const [isFiltersHidden, setIsFiltersHidden] = useState<boolean>(false);

  // Month-specific records
  const selectedMonthObj = useMemo(() => {
    return monthlyData.find(m => m.monthKey.toLowerCase() === selectedMonthKey.toLowerCase()) || {
      monthKey: selectedMonthKey,
      mrrTotal: 0,
      records: [],
      bedsTotal: 0
    };
  }, [monthlyData, selectedMonthKey]);

  // Available Cities in active month with counts
  const availableCities = useMemo(() => {
    const core = ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'];
    return core.map(city => {
      const inMonthCount = selectedMonthObj.records.filter(r => (r.city || '').toLowerCase() === city.toLowerCase()).length;
      return {
        name: city,
        count: inMonthCount
      };
    });
  }, [selectedMonthObj.records]);

  // Available SPOC list with counts
  const spocList = useMemo(() => {
    const set = new Set<string>();
    selectedMonthObj.records.forEach(r => {
      if (r.spoc) set.add(r.spoc.trim().toUpperCase());
    });
    return Array.from(set).sort().map(spoc => {
      const inMonthCount = selectedMonthObj.records.filter(r => (r.spoc || '').toUpperCase() === spoc).length;
      return {
        name: spoc,
        count: inMonthCount
      };
    });
  }, [selectedMonthObj.records]);

  // Available Plans list with counts
  const planList = useMemo(() => {
    const planSet = new Set<string>();
    ['SILVER', 'GOLD', 'BRONZE', 'GOLD - COMMERCIAL'].forEach(p => planSet.add(p));
    selectedMonthObj.records.forEach(r => {
      if (r.plan) planSet.add(r.plan.trim().toUpperCase());
    });
    return Array.from(planSet).map(plan => {
      const inMonthCount = selectedMonthObj.records.filter(r => (r.plan || '').trim().toUpperCase() === plan).length;
      return {
        name: plan,
        count: inMonthCount
      };
    });
  }, [selectedMonthObj.records]);

  // Filtered records
  const displayedRecords = useMemo(() => {
    return selectedMonthObj.records.filter(r => {
      if (selectedCity !== 'ALL' && (r.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedSpoc !== 'ALL' && (r.spoc || '').toUpperCase() !== selectedSpoc.toUpperCase()) {
        return false;
      }
      if (selectedPlan !== 'ALL' && (r.plan || '').trim().toUpperCase() !== selectedPlan.toUpperCase()) {
        return false;
      }
      if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.pgName.toLowerCase().includes(q) ||
          r.operatorName.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedMonthObj.records, selectedCity, selectedSpoc, selectedPlan, searchQuery]);

  const filteredMrrTotal = useMemo(() => {
    return displayedRecords.reduce((sum, r) => {
      const mrrValue = r.mrr || r.mrrAmount || (r.months > 0 ? Math.round(r.amount / r.months) : r.amount);
      return sum + mrrValue;
    }, 0);
  }, [displayedRecords]);

  const filteredBedsTotal = useMemo(() => {
    return displayedRecords.reduce((sum, r) => sum + (r.beds || 0), 0);
  }, [displayedRecords]);

  return (
    <div className="space-y-4">
      
      {/* Hero Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <TrendingUp className="w-3.5 h-3.5" />
                First Pay Deals Only
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Renewals Excluded
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Monthly Recurring Revenue (MRR)
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
            >
              {monthlyData.map(m => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.monthKey} ({m.records.length} deals • {formatINR(m.mrrTotal)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Highlight Card */}
        <div className="rounded-2xl p-5 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-purple-200 uppercase tracking-wider block">
                {selectedMonthKey} New MRR Added
              </span>
              <div className="text-2xl sm:text-4xl font-bold font-mono tracking-tight mt-1">
                {formatINR(filteredMrrTotal)}
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Base recurring subscription from onboarding deals only
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-purple-100 border-t sm:border-t-0 sm:border-l border-purple-400/40 pt-2 sm:pt-0 sm:pl-5">
              <div>
                <span className="text-[10px] text-purple-200 block uppercase">New Deals</span>
                <span className="text-lg font-bold text-white">{displayedRecords.length} Properties</span>
              </div>
              <div>
                <span className="text-[10px] text-purple-200 block uppercase">New Beds</span>
                <span className="text-lg font-bold text-white">{formatNumber(filteredBedsTotal)} Beds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly First Pay MRR History */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Monthly First Pay MRR History
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {monthlyData.slice(0, 6).map((m) => {
            const isSelected = m.monthKey.toLowerCase() === selectedMonthKey.toLowerCase();
            return (
              <button
                key={m.monthKey}
                onClick={() => setSelectedMonthKey(m.monthKey)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-200'
                    : 'bg-slate-50 hover:bg-purple-50 text-slate-800 border-slate-200'
                }`}
              >
                <div className={`text-[10px] font-bold ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>
                  {m.monthKey}
                </div>
                <div className="text-sm font-bold font-mono mt-0.5">
                  {formatINR(m.mrrTotal)}
                </div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                  {m.records.length} deals • {m.bedsTotal} beds
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar (Cleanly aligned, solving Screenshot 2!) */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-3">
        
        {/* Row 1: Search + Toggle Filter */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals in this month..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          <button
            onClick={() => setIsFiltersHidden(!isFiltersHidden)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Toggle Filter Options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFiltersHidden ? 'Show Filters' : 'Hide Filters'}</span>
          </button>
        </div>

        {!isFiltersHidden && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fade-in">
            
            {/* City Filter Row with Counts */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCity('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCity === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Cities ({selectedMonthObj.records.length})
              </button>
              {availableCities.map(c => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    selectedCity.toLowerCase() === c.name.toLowerCase()
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded-full ${
                    selectedCity.toLowerCase() === c.name.toLowerCase() ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>

            {/* SPOC & Plan Dropdowns in a neat 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Sales SPOC</label>
                <select
                  value={selectedSpoc}
                  onChange={(e) => setSelectedSpoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  <option value="ALL">Sales SPOC: All Reps ({selectedMonthObj.records.length})</option>
                  {spocList.map(s => (
                    <option key={s.name} value={s.name}>
                      SPOC: {s.name} ({s.count} deals)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Plan Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  <option value="ALL">Plan: All Plans ({selectedMonthObj.records.length})</option>
                  {planList.map(p => (
                    <option key={p.name} value={p.name}>
                      Plan: {p.name} ({p.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subscription Validity Filter */}
            <div className="pt-1 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Subscription Validity (Durations &amp; Counts):
              </label>
              <SubscriptionFilter
                records={selectedMonthObj.records}
                selectedMonths={selectedSubscriptionMonths}
                onChange={setSelectedSubscriptionMonths}
                variant="pills"
              />
            </div>

            {/* Reset Filter Button */}
            {(selectedCity !== 'ALL' || selectedSpoc !== 'ALL' || selectedPlan !== 'ALL' || selectedSubscriptionMonths !== 'ALL' || searchQuery) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setSelectedCity('ALL');
                    setSelectedSpoc('ALL');
                    setSelectedPlan('ALL');
                    setSelectedSubscriptionMonths('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Deals List */}
      {displayedRecords.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-purple-100 shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No MRR deals found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No first pay deals match these filters in {selectedMonthKey}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRecords.map((r, idx) => {
            const mrrValue = r.mrr || r.mrrAmount || (r.months > 0 ? Math.round(r.amount / r.months) : r.amount);

            return (
              <div
                key={r.id || `mrr-${idx}`}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 hover:border-purple-300 shadow-xs transition-all"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        FIRST PAY MRR
                      </span>
                      
                      {/* OFFICIAL PLAN BADGE (Gold, Silver, Bronze, Gold-Commercial with uppercase name) */}
                      <PlanBadge plan={r.plan} />

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        ₹{r.ratePerBed}/bed ({r.beds} Beds)
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {r.city} • SPOC: {r.spoc}
                      </span>
                    </div>

                    <h2 
                      onClick={() => onSelectRecord(r)}
                      className="text-base sm:text-lg font-bold text-slate-900 hover:text-purple-600 cursor-pointer truncate tracking-tight"
                    >
                      {r.pgName}
                    </h2>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{r.operatorName}</span>
                      <span>{r.location}</span>
                      <span>Period: {r.months} Month(s)</span>
                      <span>Payment Date: <strong>{formatDisplayDate(r.paymentDate || r.paymentMonth)}</strong></span>
                      <span>Next Due: <strong>{formatDisplayDate(r.nextPayMonth || r.renewalMonth)}</strong></span>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-500 block font-medium">Monthly MRR</span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-purple-800">
                        {formatINR(mrrValue)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Total Deal: <span className="font-bold text-slate-900">{formatINR(r.total || r.amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {r.contact && (
                      <a
                        href={`tel:${r.contact}`}
                        className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                        title={`Call: ${r.contact}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectRecord(r)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs flex items-center gap-1 border border-purple-200 cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
