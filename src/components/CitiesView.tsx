import React, { useState, useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber, formatDisplayDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { 
  Building2, 
  MapPin, 
  Search, 
  ChevronRight,
  X, 
  History,
  Calendar,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { normalizeAreaName, detectCity } from '../utils/cityHelper';
import { SubscriptionFilter } from './SubscriptionFilter';

interface CitiesViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
}

interface AreaStatItem {
  area: string;
  city: string;
  dealsCount: number;
  revenue: number;
  deals: HostelRecord[];
  uniqueHostelMap: Map<string, { pgName: string; beds: number; dealsCount: number }>;
  uniqueHostelCount: number;
  totalUniqueBeds: number;
}

export const CitiesView: React.FC<CitiesViewProps> = ({
  records,
  onSelectRecord
}) => {
  const [activeCityTab, setActiveCityTab] = useState<'ALL' | 'Chennai' | 'Coimbatore' | 'Bangalore' | 'Kerala'>('ALL');
  const [selectedSubscriptionMonths, setSelectedSubscriptionMonths] = useState<number | 'ALL'>('ALL');
  const [searchArea, setSearchArea] = useState('');

  // Selected Area Hub for deep inspection (e.g., "Anna Nagar", "Mogappair")
  const [inspectedArea, setInspectedArea] = useState<{ area: string; city: string } | null>(null);

  // Selected Hostel for full payment ledger history
  const [inspectedHostel, setInspectedHostel] = useState<{ pgName: string; deals: HostelRecord[] } | null>(null);

  // Segregate by city & accurately count UNIQUE hostels and beds
  const cityStats = useMemo(() => {
    const initCity = (name: string, code: string) => ({
      name,
      code,
      dealsCount: 0,
      uniqueHostelsMap: new Map<string, { pgName: string; beds: number }>(),
      firstPayCount: 0,
      renewalCount: 0,
      revenue: 0,
      areas: new Map<string, AreaStatItem>()
    });

    const cities = {
      Chennai: initCity('Chennai Region', 'Chennai'),
      Coimbatore: initCity('Coimbatore Region', 'Coimbatore'),
      Bangalore: initCity('Bangalore Region', 'Bangalore'),
      Kerala: initCity('Kerala Region', 'Kerala')
    };

    const targetList = selectedSubscriptionMonths === 'ALL'
      ? records
      : records.filter(r => (r.months || 1) === selectedSubscriptionMonths);

    targetList.forEach(r => {
      const realCity = detectCity(r.location, r.pgName);
      const c = (realCity || 'Chennai') as keyof typeof cities;
      const target = cities[c] || cities.Chennai;

      target.dealsCount++;
      const amt = r.total || r.amount || 0;
      target.revenue += amt;

      const normHostelKey = (r.pgName || 'UNKNOWN')
        .trim()
        .toLowerCase()
        .replace(/^(m\/s\.?|m\/s|mr\.|ms\.)\s*/i, '');

      // City-wide unique hostels
      if (!target.uniqueHostelsMap.has(normHostelKey)) {
        target.uniqueHostelsMap.set(normHostelKey, { pgName: r.pgName, beds: r.beds || 0 });
      } else {
        const exist = target.uniqueHostelsMap.get(normHostelKey)!;
        if ((r.beds || 0) > exist.beds) exist.beds = r.beds || 0;
      }

      const pType = (r.paymentType || '').toUpperCase();
      if (pType.includes('FIRST')) target.firstPayCount++;
      if (pType.includes('RENEWAL')) target.renewalCount++;

      const area = normalizeAreaName(r.location);
      if (!target.areas.has(area)) {
        target.areas.set(area, {
          area,
          city: c,
          dealsCount: 0,
          revenue: 0,
          deals: [],
          uniqueHostelMap: new Map(),
          uniqueHostelCount: 0,
          totalUniqueBeds: 0
        });
      }
      const a = target.areas.get(area)!;
      a.dealsCount++;
      a.revenue += amt;
      a.deals.push(r);

      // Area-level unique hostels & true beds count (duplicate deals for same hostel don't multiply beds!)
      if (!a.uniqueHostelMap.has(normHostelKey)) {
        a.uniqueHostelMap.set(normHostelKey, { pgName: r.pgName, beds: r.beds || 0, dealsCount: 1 });
      } else {
        const item = a.uniqueHostelMap.get(normHostelKey)!;
        item.dealsCount++;
        if ((r.beds || 0) > item.beds) item.beds = r.beds || 0;
      }
    });

    // Finalize unique counts
    Object.values(cities).forEach(cityObj => {
      cityObj.areas.forEach(areaObj => {
        areaObj.uniqueHostelCount = areaObj.uniqueHostelMap.size;
        let bedsSum = 0;
        areaObj.uniqueHostelMap.forEach(h => {
          bedsSum += h.beds;
        });
        areaObj.totalUniqueBeds = bedsSum;
      });
    });

    return cities;
  }, [records, selectedSubscriptionMonths]);

  // Latest registered hostels with full payment and next due dates
  const latestRegistered = useMemo(() => {
    return [...records]
      .filter(r => {
        if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) return false;
        if (activeCityTab === 'ALL') return true;
        const c = detectCity(r.location, r.pgName);
        return c.toLowerCase() === activeCityTab.toLowerCase();
      })
      .sort((a, b) => (b.sNo || 0) - (a.sNo || 0))
      .slice(0, 30);
  }, [records, activeCityTab]);

  // Area ranking for selected city (strictly respects active city tab!)
  const topAreas = useMemo(() => {
    const combinedAreas: AreaStatItem[] = [];
    
    const targetCodes: (keyof typeof cityStats)[] = 
      activeCityTab === 'ALL' 
        ? ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'] 
        : [activeCityTab];

    targetCodes.forEach(code => {
      const c = cityStats[code];
      if (c) {
        c.areas.forEach((val) => {
          combinedAreas.push(val);
        });
      }
    });

    let list = combinedAreas;

    if (searchArea.trim()) {
      const q = searchArea.toLowerCase();
      list = list.filter(item => item.area.toLowerCase().includes(q) || item.city.toLowerCase().includes(q));
    }

    // Sort by uniqueHostelCount descending, then dealsCount
    return list.sort((a, b) => b.uniqueHostelCount - a.uniqueHostelCount || b.dealsCount - a.dealsCount);
  }, [cityStats, activeCityTab, searchArea]);

  // Unique hostels inside the currently inspected area hub (Handles duplicates as 1 unique hostel!)
  const areaUniqueHostels = useMemo(() => {
    if (!inspectedArea) return [];
    
    const matchedDeals = records.filter(r => {
      const c = detectCity(r.location, r.pgName);
      const a = normalizeAreaName(r.location);
      return c.toLowerCase() === inspectedArea.city.toLowerCase() && a.toLowerCase() === inspectedArea.area.toLowerCase();
    });

    const pgMap = new Map<string, {
      pgName: string;
      operatorName: string;
      contact: string;
      beds: number;
      totalRevenue: number;
      deals: HostelRecord[];
    }>();

    matchedDeals.forEach(r => {
      const normKey = (r.pgName || 'UNKNOWN')
        .trim()
        .toLowerCase()
        .replace(/^(m\/s\.?|m\/s|mr\.|ms\.)\s*/i, '');

      if (!pgMap.has(normKey)) {
        pgMap.set(normKey, {
          pgName: r.pgName,
          operatorName: r.operatorName,
          contact: r.contact,
          beds: r.beds || 0,
          totalRevenue: 0,
          deals: []
        });
      }
      const item = pgMap.get(normKey)!;
      item.totalRevenue += (r.total || r.amount || 0);
      item.deals.push(r);
      if ((r.beds || 0) > item.beds) item.beds = r.beds || 0;
      if (!item.contact && r.contact) item.contact = r.contact;
      if (!item.operatorName && r.operatorName) item.operatorName = r.operatorName;
    });

    return Array.from(pgMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [inspectedArea, records]);

  // Which city cards to display (When Chennai selected, ONLY show Chennai card)
  const visibleCityCodes: (keyof typeof cityStats)[] = useMemo(() => {
    if (activeCityTab === 'ALL') {
      return ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'];
    }
    return [activeCityTab];
  }, [activeCityTab]);

  return (
    <div className="space-y-4">
      
      {/* City Switcher Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <MapPin className="w-3.5 h-3.5" />
              City & Territory Distribution
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Geographic Performance
            </h1>
          </div>

          {/* City Segmented Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {(['ALL', 'Chennai', 'Coimbatore', 'Bangalore', 'Kerala'] as const).map(tab => {
              const count = tab === 'ALL' 
                ? records.length 
                : records.filter(r => detectCity(r.location, r.pgName).toLowerCase() === tab.toLowerCase()).length;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveCityTab(tab);
                    setInspectedArea(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeCityTab === tab
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'All Regions' : tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeCityTab === tab ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* City Comparison Cards */}
        <div className={`grid gap-3 ${
          visibleCityCodes.length === 1 
            ? 'grid-cols-1' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {visibleCityCodes.map(code => {
            const data = cityStats[code];
            const isSelected = activeCityTab === code;
            let cityUniqueBeds = 0;
            data.uniqueHostelsMap.forEach(h => { cityUniqueBeds += h.beds; });

            return (
              <div
                key={code}
                className={`rounded-2xl p-4 border transition-all ${
                  visibleCityCodes.length === 1
                    ? 'bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 border-purple-300 ring-2 ring-purple-200'
                    : isSelected
                    ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 cursor-pointer'
                }`}
                onClick={() => {
                  if (activeCityTab !== code) setActiveCityTab(code);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{data.name}</h3>
                    <p className="text-xs text-purple-700 font-semibold">{data.areas.size} Active Area Hubs</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 inline-block font-mono">
                      {data.uniqueHostelsMap.size} Hostels
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                      ({data.dealsCount} Total Deals)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">Total Beds</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{formatNumber(cityUniqueBeds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">Total Revenue</span>
                    <span className="font-bold text-purple-950 font-mono text-sm">{formatINR(data.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block font-medium">Renewals</span>
                    <span className="font-bold text-emerald-800 font-mono text-sm">{data.renewalCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700 block font-medium">First Pay</span>
                    <span className="font-bold text-blue-800 font-mono text-sm">{data.firstPayCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subscription Duration Filter (User requested feature!) */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Subscription Validity:
          </span>
          <SubscriptionFilter
            records={records}
            selectedMonths={selectedSubscriptionMonths}
            onChange={setSelectedSubscriptionMonths}
            variant="pills"
          />
        </div>

      </div>

      {/* Areas Table & Latest Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Area Hubs (Showing accurate Hostels Count & Beds, properly aligned!) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Area Hubs & Capacity</h2>
                <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  {topAreas.length} Areas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays verified hostel counts & unique bed capacity per locality. Click to inspect hostels.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                placeholder="Search area (e.g. Anna Nagar)..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
            {topAreas.slice(0, 45).map((item, idx) => (
              <div
                key={`${item.city}-${item.area}-${idx}`}
                onClick={() => setInspectedArea({ area: item.area, city: item.city })}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/80 border border-slate-200 hover:border-purple-300 transition-all cursor-pointer group shadow-2xs"
              >
                {/* Left Area Name & City */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 font-mono shrink-0 shadow-2xs">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                      {item.area}
                    </h4>
                    <span className="inline-block text-[11px] text-purple-700 font-semibold bg-purple-100/60 px-2 py-0.2 rounded-md mt-0.5">
                      {item.city}
                    </span>
                  </div>
                </div>

                {/* Right: Unique Hostels Count, Total Beds & Revenue (Clear and perfectly aligned) */}
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    {/* Primary Highlight: Number of unique Hostels and beds */}
                    <span className="text-xs font-bold text-slate-900 font-mono block">
                      {item.uniqueHostelCount} {item.uniqueHostelCount === 1 ? 'Hostel' : 'Hostels'}
                    </span>
                    <span className="text-[11px] font-semibold text-purple-800 block">
                      {formatNumber(item.totalUniqueBeds)} Beds
                    </span>
                  </div>

                  <div className="hidden sm:block min-w-[90px] border-l border-slate-200/80 pl-3">
                    <span className="text-xs font-bold text-slate-800 font-mono block">
                      {item.dealsCount} Deals
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {formatINR(item.revenue)}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Latest Registered Hostels with Payment Date & Next Due Date */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-slate-900">Latest Registered Deals</h2>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              {latestRegistered.length} Recent
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">Recently added properties & payment dates</p>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
            {latestRegistered.map((r) => {
              const status = r.status || (r.isPaid ? 'PAID' : 'UNPAID');
              const isPaid = status === 'PAID';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 transition-all cursor-pointer shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded">
                        #{r.sNo}
                      </span>
                      <PlanBadge plan={r.plan} />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isPaid 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {isPaid ? 'PAID' : 'UNPAID'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate hover:text-purple-700 transition-colors">
                      {r.pgName}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-0.5">
                      <span>{r.beds} Beds • {r.city}</span>
                      <span className="font-bold text-purple-950 font-mono">{formatINR(r.total || r.amount)}</span>
                    </div>
                  </div>

                  {/* Payment Date & Next Due Date (User requested addition!) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/70 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-600 truncate" title="Payment Date">
                      <CreditCard className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Paid: <strong>{formatDisplayDate(r.paymentDate || r.paymentMonth)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-purple-800 truncate" title="Next Payment Due">
                      <Calendar className="w-3 h-3 text-purple-600 shrink-0" />
                      <span className="truncate">
                        Next: <strong>{formatDisplayDate(r.nextPayMonth || r.renewalMonth)}</strong>
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* AREA HUB INSPECTOR MODAL */}
      {inspectedArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setInspectedArea(null)} />

          <div className="relative bg-white border border-purple-100 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-purple-100 bg-purple-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                    {inspectedArea.city} Hub
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {areaUniqueHostels.length} Unique Hostels
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                  📍 {inspectedArea.area} Area Hub
                </h3>
              </div>

              <button
                onClick={() => setInspectedArea(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Hostels List */}
            <div className="p-5 space-y-3 flex-1 overflow-y-auto no-scrollbar">
              <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                <span>
                  Showing all verified properties in <strong>{inspectedArea.area}</strong>. Repeated deals are organized under each single hostel.
                </span>
              </div>

              <div className="space-y-3">
                {areaUniqueHostels.map((hostel) => (
                  <div
                    key={hostel.pgName}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 transition-all shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            {hostel.deals.length} Total Deals / Payments
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            {hostel.beds} Total Beds
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 truncate">
                          {hostel.pgName}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                          <span>Operator: <strong>{hostel.operatorName || 'Partner'}</strong></span>
                          {hostel.contact && <span className="font-mono">Ph: {hostel.contact}</span>}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-500 block font-medium">Total Collected</span>
                          <span className="text-lg font-bold font-mono text-purple-900">
                            {formatINR(hostel.totalRevenue)}
                          </span>
                        </div>

                        <button
                          onClick={() => setInspectedHostel({ pgName: hostel.pgName, deals: hostel.deals })}
                          className="mt-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View Payment Ledger ({hostel.deals.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setInspectedArea(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close Hub
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULL PAYMENT HISTORY LEDGER MODAL */}
      {inspectedHostel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setInspectedHostel(null)} />

          <div className="relative bg-white border border-purple-100 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-purple-100 bg-purple-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                    Hostel Payment Ledger
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    {inspectedHostel.deals.length} Lifetime Deals
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {inspectedHostel.pgName}
                </h3>
              </div>

              <button
                onClick={() => setInspectedHostel(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto no-scrollbar">
              
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold uppercase text-purple-700 block">Total Lifetime Collected</span>
                  <span className="text-2xl font-bold font-mono text-purple-950 mt-0.5 block">
                    {formatINR(inspectedHostel.deals.reduce((sum, d) => sum + (d.total || d.amount || 0), 0))}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Active Capacity</span>
                  <span className="text-2xl font-bold font-mono text-amber-950 mt-0.5 block">
                    {Math.max(...inspectedHostel.deals.map(d => d.beds || 0))} Beds
                  </span>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Transaction & Renewal History
                </h4>

                <div className="space-y-2.5">
                  {inspectedHostel.deals.map((deal, idx) => {
                    const st = deal.status || (deal.isPaid ? 'PAID' : 'UNPAID');

                    return (
                      <div
                        key={deal.id || `deal-${idx}`}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-200 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              #{deal.sNo}
                            </span>
                            <PlanBadge plan={deal.plan} />
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              {deal.paymentType}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            st === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : st === 'YET_TO_PAY'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {st === 'PAID' ? '🟢 PAID' : st === 'YET_TO_PAY' ? '🔵 YET TO BE PAID' : '🔴 UNPAID'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Payment Date</span>
                            <span className="font-bold text-slate-800">
                              {formatDisplayDate(deal.paymentDate || deal.paymentMonth)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">Renewal Due Date</span>
                            <span className="font-bold text-purple-900">
                              {formatDisplayDate(deal.nextPayMonth || deal.renewalMonth)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">Rate & Beds</span>
                            <span>₹{deal.ratePerBed}/bed • {deal.beds} Beds</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">Deal Total (Incl. GST)</span>
                            <span className="font-bold font-mono text-slate-900 text-sm">
                              {formatINR(deal.total || deal.amount)}
                            </span>
                          </div>
                        </div>

                        {deal.remarks && (
                          <div className="text-[11px] text-slate-500 mt-2 italic border-t border-slate-200/60 pt-1">
                            Note: {deal.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setInspectedHostel(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
