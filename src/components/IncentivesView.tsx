import React, { useState, useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber, formatDisplayDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { PaymentTypeBadge } from '../utils/paymentTypeHelper';
import { detectCity } from '../utils/cityHelper';
import { SubscriptionFilter } from './SubscriptionFilter';
import { 
  Coins, 
  TrendingUp, 
  User, 
  Building2, 
  MapPin, 
  Calendar, 
  Search, 
  ChevronLeft,
  ChevronRight, 
  DownloadCloud, 
  Sparkles, 
  Award,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';

interface IncentivesViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
}

export const IncentivesView: React.FC<IncentivesViewProps> = ({
  records,
  onSelectRecord
}) => {
  // Aggregate incentives data by payment month across the entire dataset (from 2023 to 2026)
  const monthlyIncentivesData = useMemo(() => {
    const monthOrder: { [k: string]: number } = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    const map = new Map<string, {
      monthKey: string;
      year: number;
      monthNum: number;
      totalIncentives: number;
      totalRevenue: number;
      records: HostelRecord[];
      sortKey: number;
    }>();

    records.forEach(r => {
      let rawMonth = (r.paymentMonth || '').trim();
      if (!rawMonth && r.paymentDate) {
        const parts = r.paymentDate.split(/[-/]/);
        if (parts.length >= 3) {
          rawMonth = `${parts[1]} ${parts[2]}`;
        }
      }
      if (!rawMonth) rawMonth = 'Unknown';

      // Standardize month label: e.g. "Apr 2025" or "April 2024" -> "Apr 2025"
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

      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const standardMonthKey = `${monthNamesShort[m - 1]} ${y}`;

      if (!map.has(standardMonthKey)) {
        map.set(standardMonthKey, {
          monthKey: standardMonthKey,
          year: y,
          monthNum: m,
          totalIncentives: 0,
          totalRevenue: 0,
          records: [],
          sortKey: y * 100 + m
        });
      }

      const item = map.get(standardMonthKey)!;
      item.totalIncentives += (r.incentives || 0);
      item.totalRevenue += (r.total || r.amount || 0);
      item.records.push(r);
    });

    const list = Array.from(map.values());
    // Sort chronological descending (most recent month first: Sep 2026 -> Oct 2023)
    return list.sort((a, b) => b.sortKey - a.sortKey);
  }, [records]);

  // Current system active month for incentives (defaults to Sep 2026)
  const defaultMonth = useMemo(() => {
    const preferred = monthlyIncentivesData.find(m => 
      m.monthKey.toLowerCase().includes('sep 2026') || 
      m.monthKey.toLowerCase().includes('aug 2026') || 
      m.monthKey.toLowerCase().includes('oct 2026')
    );
    return preferred?.monthKey || monthlyIncentivesData[0]?.monthKey || 'Sep 2026';
  }, [monthlyIncentivesData]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedSpoc, setSelectedSpoc] = useState<string>('ALL');
  const [selectedSubscriptionMonths, setSelectedSubscriptionMonths] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract distinct years available
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    monthlyIncentivesData.forEach(m => years.add(m.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthlyIncentivesData]);

  // Filter months by selected year tab
  const displayedMonths = useMemo(() => {
    if (selectedYear === 'ALL') return monthlyIncentivesData;
    const yNum = parseInt(selectedYear, 10);
    return monthlyIncentivesData.filter(m => m.year === yNum);
  }, [monthlyIncentivesData, selectedYear]);

  // Active month complete data
  const currentMonthData = useMemo(() => {
    return monthlyIncentivesData.find(m => m.monthKey.toLowerCase() === selectedMonth.toLowerCase()) || {
      monthKey: selectedMonth,
      totalIncentives: 0,
      totalRevenue: 0,
      records: []
    };
  }, [monthlyIncentivesData, selectedMonth]);

  // Filter records within the selected month (by City, SPOC, Subscription duration, and Search)
  const filteredDeals = useMemo(() => {
    return currentMonthData.records.filter(r => {
      const recCity = detectCity(r.location, r.pgName);
      if (selectedCity !== 'ALL' && recCity.toLowerCase() !== selectedCity.toLowerCase()) return false;
      if (selectedSpoc !== 'ALL' && (r.spoc || '').toUpperCase() !== selectedSpoc.toUpperCase()) return false;
      if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (r.pgName || '').toLowerCase().includes(q) ||
        (r.operatorName || '').toLowerCase().includes(q) ||
        (r.spoc || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (recCity || '').toLowerCase().includes(q) ||
        (r.plan || '').toLowerCase().includes(q)
      );
    });
  }, [currentMonthData.records, selectedCity, selectedSpoc, selectedSubscriptionMonths, searchQuery]);

  // SPOC-wise aggregated incentives for the selected month
  const spocIncentives = useMemo(() => {
    const spocMap = new Map<string, {
      spoc: string;
      totalIncentive: number;
      dealCount: number;
      totalRevenue: number;
      deals: HostelRecord[];
    }>();

    currentMonthData.records.forEach(r => {
      const recCity = detectCity(r.location, r.pgName);
      if (selectedCity !== 'ALL' && recCity.toLowerCase() !== selectedCity.toLowerCase()) return;
      if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) return;

      const spoc = (r.spoc || 'UNASSIGNED').trim().toUpperCase();
      if (!spocMap.has(spoc)) {
        spocMap.set(spoc, {
          spoc,
          totalIncentive: 0,
          dealCount: 0,
          totalRevenue: 0,
          deals: []
        });
      }

      const item = spocMap.get(spoc)!;
      item.totalIncentive += (r.incentives || 0);
      item.dealCount++;
      item.totalRevenue += (r.total || r.amount || 0);
      item.deals.push(r);
    });

    const list = Array.from(spocMap.values());
    return list.sort((a, b) => b.totalIncentive - a.totalIncentive);
  }, [currentMonthData.records, selectedCity, selectedSubscriptionMonths]);

  // Overall totals for filtered deals
  const totalFilteredIncentives = useMemo(() => {
    return filteredDeals.reduce((sum, r) => sum + (r.incentives || 0), 0);
  }, [filteredDeals]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredDeals.reduce((sum, r) => sum + (r.total || r.amount || 0), 0);
  }, [filteredDeals]);

  // Distinct cities in the selected month
  const availableCitiesInMonth = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthData.records.forEach(r => {
      const c = detectCity(r.location, r.pgName);
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([city, count]) => ({ city, count }));
  }, [currentMonthData.records]);

  // When changing month, reset city & SPOC filters so user sees full month picture
  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setSelectedCity('ALL');
    setSelectedSpoc('ALL');
    setSelectedSubscriptionMonths('ALL');
  };

  // Month navigation helpers
  const currentMonthIndex = displayedMonths.findIndex(m => m.monthKey.toLowerCase() === selectedMonth.toLowerCase());
  const handleNextMonth = () => {
    if (currentMonthIndex > 0) {
      handleSelectMonth(displayedMonths[currentMonthIndex - 1].monthKey);
    }
  };
  const handlePrevMonth = () => {
    if (currentMonthIndex >= 0 && currentMonthIndex < displayedMonths.length - 1) {
      handleSelectMonth(displayedMonths[currentMonthIndex + 1].monthKey);
    }
  };

  // Export current view to CSV
  const handleExportIncentivesCSV = () => {
    const headers = [
      'S.No', 'Property Name', 'Operator Name', 'Phone', 'Location', 'City',
      'SPOC', 'Plan', 'Beds', 'Deal Amount (Rs)', 'Incentives (Rs)', 'Payment Date', 'Payment Month'
    ];

    const rows = filteredDeals.map((r, i) => [
      r.sNo || i + 1,
      `"${(r.pgName || '').replace(/"/g, '""')}"`,
      `"${(r.operatorName || '').replace(/"/g, '""')}"`,
      r.contact || '',
      `"${(r.location || '').replace(/"/g, '""')}"`,
      detectCity(r.location, r.pgName),
      r.spoc || '',
      r.plan || '',
      r.beds || 0,
      r.total || r.amount || 0,
      r.incentives || 0,
      formatDisplayDate(r.paymentDate || ''),
      r.paymentMonth || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crib_incentives_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFilterActive = selectedCity !== 'ALL' || selectedSpoc !== 'ALL' || selectedSubscriptionMonths !== 'ALL' || searchQuery;

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Banner & Month Carousel */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                Commissions &amp; Incentives
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Sales Performance &amp; Commission Tracker (2023 - 2026)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Sales Team Incentives Hub
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportIncentivesCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Export {selectedMonth} CSV</span>
            </button>
          </div>
        </div>

        {/* YEAR SELECTION FILTER & MONTH NAVIGATOR */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                Filter Year:
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear('ALL')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedYear === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Years
              </button>
              {availableYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(String(yr))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedYear === String(yr)
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* MONTH SELECTION CAROUSEL (Full dataset with all months) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {displayedMonths.map((m) => {
              const isSelected = selectedMonth.toLowerCase() === m.monthKey.toLowerCase();

              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => handleSelectMonth(m.monthKey)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex flex-col items-center justify-center border text-center ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 scale-[1.03]'
                      : 'bg-slate-50 text-slate-700 hover:bg-purple-50/70 border-slate-200'
                  }`}
                >
                  <span className="text-xs">{m.monthKey}</span>
                  <span className={`text-[10px] font-mono mt-0.5 ${
                    isSelected ? 'text-purple-100' : 'text-amber-700 font-bold'
                  }`}>
                    {formatINR(m.totalIncentives)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Indicator if user filtered by City, SPOC or Subscription */}
        {isFilterActive && (
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-950 flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                Active Filters:
              </span>
              {selectedCity !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-amber-900 text-[11px]">
                  <span>City: {selectedCity}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCity('ALL')}
                    className="hover:text-amber-950 p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Remove city filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSpoc !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-amber-900 text-[11px]">
                  <span>SPOC: {selectedSpoc}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSpoc('ALL')}
                    className="hover:text-amber-950 p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Remove SPOC filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSubscriptionMonths !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-amber-900 text-[11px]">
                  <span>{selectedSubscriptionMonths} Month Plan</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubscriptionMonths('ALL')}
                    className="hover:text-amber-950 p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Remove plan filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-amber-900 text-[11px]">
                  <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-amber-950 p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="text-amber-800/80 font-medium text-[11px]">
                ({filteredDeals.length} of {currentMonthData.records.length} deals in {selectedMonth})
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedCity('ALL');
                setSelectedSpoc('ALL');
                setSelectedSubscriptionMonths('ALL');
                setSearchQuery('');
              }}
              className="self-start sm:self-auto px-2.5 py-1 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}

        {/* KPI Summary Cards for Selected Month */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block text-center">
              Total Incentives ({selectedMonth})
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-950 mt-1 block text-center">
              {formatINR(totalFilteredIncentives)}
            </span>
            <span className="text-[10px] text-amber-700 font-medium block text-center">
              {isFilterActive ? `Filtered (${formatINR(currentMonthData.totalIncentives)} total)` : 'Monthly Total'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block text-center">
              Total Revenue Closed
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-950 mt-1 block text-center">
              {formatINR(totalFilteredRevenue)}
            </span>
            <span className="text-[10px] text-purple-700 font-medium block text-center">Inclusive of GST</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
              Deals Monitored
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1 block text-center">
              {filteredDeals.length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block text-center">Transactions</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block text-center">
              Active Sales Reps
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-950 mt-1 block text-center">
              {spocIncentives.length}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium block text-center">Earned Incentives</span>
          </div>

        </div>

      </div>

      {/* Sales Representative Ranking for Selected Month */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Sales Representative (SPOC) Ranking in {selectedMonth}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Click any Sales Rep to filter their specific customer deals below
          </p>
        </div>

        {spocIncentives.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No sales incentives recorded for the selected filters in {selectedMonth}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {spocIncentives.map((rep, index) => {
              const isRepSelected = selectedSpoc.toUpperCase() === rep.spoc.toUpperCase();

              return (
                <div
                  key={rep.spoc}
                  onClick={() => {
                    setSelectedSpoc(isRepSelected ? 'ALL' : rep.spoc);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isRepSelected
                      ? 'bg-purple-50/80 border-purple-500 shadow-md ring-2 ring-purple-400'
                      : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {rep.spoc}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {rep.dealCount} Deals
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Incentive Earned:</span>
                      <span className="font-bold font-mono text-amber-700 text-sm">
                        {formatINR(rep.totalIncentive)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Revenue Closed:</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {formatINR(rep.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Deals Breakdown Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Customer Deals &amp; Incentives Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              {filteredDeals.length} Customer deals in {selectedMonth}
              {selectedSpoc !== 'ALL' ? ` for ${selectedSpoc}` : ''}
              {selectedCity !== 'ALL' ? ` in ${selectedCity}` : ''}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hostel or operator..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Subscription Validity Filter (User request!) */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Subscription Validity:
          </span>
          <SubscriptionFilter
            records={currentMonthData.records}
            selectedMonths={selectedSubscriptionMonths}
            onChange={setSelectedSubscriptionMonths}
            variant="pills"
          />
        </div>

        {/* PROPER CITY TABS WITH CLEAN ALIGNMENT (User request: "சென்னை சிட்டீஸ் வந்து ப்ராப்பரா ஒழுங்கா இல்ல... கேரளா தள்ளி போகுது") */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Filter by City:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCity('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                selectedCity === 'ALL'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Cities ({currentMonthData.records.length})
            </button>

            {availableCitiesInMonth.map(({ city, count }) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  selectedCity.toLowerCase() === city.toLowerCase()
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {city} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Deals Table - High Density with Centered Numeric Values */}
        {filteredDeals.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No deals found matching your selected filters for {selectedMonth}.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Property / Hostel</th>
                  <th className="py-2.5 px-3">Operator &amp; Phone</th>
                  <th className="py-2.5 px-3">Location &amp; City</th>
                  <th className="py-2.5 px-3 text-center">SPOC</th>
                  <th className="py-2.5 px-3 text-center">Beds</th>
                  <th className="py-2.5 px-3 text-center">Validity</th>
                  <th className="py-2.5 px-3 text-center">Payment Date</th>
                  <th className="py-2.5 px-3 text-center">Deal Amount</th>
                  <th className="py-2.5 px-3 text-center bg-amber-50/80 text-amber-900 font-bold">Incentives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal, idx) => {
                  const dealCity = detectCity(deal.location, deal.pgName);

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => onSelectRecord(deal)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">
                        {deal.sNo || idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block truncate max-w-xs">
                          {deal.pgName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <PlanBadge plan={deal.plan} />
                          <PaymentTypeBadge paymentType={deal.paymentType} />
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 block truncate max-w-[150px]">
                          {deal.operatorName || '—'}
                        </span>
                        {deal.contact && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {deal.contact}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 block truncate max-w-[140px]">
                          {deal.location}
                        </span>
                        <span className="text-[10px] text-purple-700 font-semibold">
                          {dealCity}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        {deal.spoc || 'Direct'}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-800">
                        {deal.beds || 0}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-700">
                        {deal.months || 1} mo
                      </td>

                      {/* Strict DD-MM-YYYY Payment Date */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {formatDisplayDate(deal.paymentDate || deal.paymentMonth)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {formatINR(deal.total || deal.amount)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 bg-amber-50/50 text-sm">
                        {formatINR(deal.incentives)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
