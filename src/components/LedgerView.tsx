import React, { useState, useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber, formatDisplayDate, parseFlexibleDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { SubscriptionFilter } from './SubscriptionFilter';
import { 
  Search, 
  ArrowUpDown, 
  Eye, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { detectCity } from '../utils/cityHelper';

interface LedgerViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
  onEditRecord: (record: HostelRecord) => void;
  onDeleteRecord: (id: string) => void;
}

type SortOption = 
  | 'paymentDate_desc' 
  | 'paymentDate_asc'
  | 'pgName_asc' 
  | 'pgName_desc' 
  | 'renewalMonth_asc' 
  | 'renewalMonth_desc'
  | 'total_desc' 
  | 'total_asc'
  | 'beds_desc' 
  | 'beds_asc'
  | 'sNo_asc'
  | 'sNo_desc';

export const LedgerView: React.FC<LedgerViewProps> = ({
  records,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedSpoc, setSelectedSpoc] = useState<string>('ALL');
  const [selectedPayType, setSelectedPayType] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedSubscriptionMonths, setSelectedSubscriptionMonths] = useState<number | 'ALL'>('ALL');
  
  // Quick Sort option: Default to latest payment date as requested by user
  const [sortBy, setSortBy] = useState<SortOption>('paymentDate_desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Dynamic filter options with counts
  const { cityList, spocList, planList, payTypeList } = useMemo(() => {
    const cityCountMap = new Map<string, number>();
    const spocCountMap = new Map<string, number>();
    const planCountMap = new Map<string, number>();
    const payTypeCountMap = new Map<string, number>();

    // Seed major cities in preferred order
    ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'].forEach(c => {
      cityCountMap.set(c, 0);
    });

    records.forEach(r => {
      const city = detectCity(r.location, r.pgName);
      cityCountMap.set(city, (cityCountMap.get(city) || 0) + 1);

      if (r.spoc) {
        const s = r.spoc.trim();
        spocCountMap.set(s, (spocCountMap.get(s) || 0) + 1);
      }

      if (r.plan) {
        const p = r.plan.trim();
        planCountMap.set(p, (planCountMap.get(p) || 0) + 1);
      }

      if (r.paymentType) {
        const pt = r.paymentType.trim();
        payTypeCountMap.set(pt, (payTypeCountMap.get(pt) || 0) + 1);
      }
    });

    // Helper to format as sorted list
    const toSortedList = (map: Map<string, number>) => {
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      cityList: Array.from(cityCountMap.entries())
        .map(([name, count]) => ({ name, count }))
        .filter(c => c.count > 0 || ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'].includes(c.name)),
      spocList: toSortedList(spocCountMap),
      planList: toSortedList(planCountMap),
      payTypeList: toSortedList(payTypeCountMap),
    };
  }, [records]);

  // Filtering: searches Property Name, City, SPOC, Plan, Operator, Location, etc.
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const recCity = detectCity(r.location, r.pgName);
      if (selectedCity !== 'ALL' && recCity.toLowerCase() !== selectedCity.toLowerCase()) return false;
      if (selectedSpoc !== 'ALL' && r.spoc !== selectedSpoc) return false;
      if (selectedPayType !== 'ALL' && r.paymentType !== selectedPayType) return false;
      if (selectedPlan !== 'ALL' && r.plan !== selectedPlan) return false;
      if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (r.pgName || '').toLowerCase().includes(term) ||
        (r.operatorName || '').toLowerCase().includes(term) ||
        (r.location || '').toLowerCase().includes(term) ||
        (recCity || '').toLowerCase().includes(term) ||
        (r.contact || '').toLowerCase().includes(term) ||
        (r.spoc || '').toLowerCase().includes(term) ||
        (r.plan || '').toLowerCase().includes(term) ||
        (r.paymentType || '').toLowerCase().includes(term) ||
        (r.paymentDate || '').toLowerCase().includes(term) ||
        (r.nextPayMonth || '').toLowerCase().includes(term) ||
        (r.remarks || '').toLowerCase().includes(term)
      );
    });
  }, [records, selectedCity, selectedSpoc, selectedPayType, selectedPlan, searchTerm]);

  // Sorting
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (sortBy.startsWith('paymentDate')) {
        const isDesc = sortBy === 'paymentDate_desc';
        const parsedA = parseFlexibleDate(a.paymentDate || a.paymentMonth);
        const parsedB = parseFlexibleDate(b.paymentDate || b.paymentMonth);
        const timeA = parsedA ? parsedA.year * 10000 + parsedA.month * 100 + parsedA.day : 0;
        const timeB = parsedB ? parsedB.year * 10000 + parsedB.month * 100 + parsedB.day : 0;
        if (timeA !== timeB) return isDesc ? timeB - timeA : timeA - timeB;
        return (b.sNo || 0) - (a.sNo || 0);
      }

      if (sortBy.startsWith('pgName')) {
        const isDesc = sortBy === 'pgName_desc';
        // User requested: Strip "M/s", "M/S" etc. so it sorts under actual name letter!
        const cleanA = (a.pgName || '').trim().replace(/^(m\/s\.?|m\/s|mr\.|ms\.)\s*/i, '').toLowerCase();
        const cleanB = (b.pgName || '').trim().replace(/^(m\/s\.?|m\/s|mr\.|ms\.)\s*/i, '').toLowerCase();
        return isDesc ? cleanB.localeCompare(cleanA) : cleanA.localeCompare(cleanB);
      }

      if (sortBy.startsWith('renewalMonth')) {
        const isDesc = sortBy === 'renewalMonth_desc';
        const parsedA = parseFlexibleDate(a.nextPayMonth || a.renewalMonth);
        const parsedB = parseFlexibleDate(b.nextPayMonth || b.renewalMonth);
        const timeA = parsedA ? parsedA.year * 10000 + parsedA.month * 100 + parsedA.day : 0;
        const timeB = parsedB ? parsedB.year * 10000 + parsedB.month * 100 + parsedB.day : 0;
        if (timeA !== timeB) return isDesc ? timeB - timeA : timeA - timeB;
        return (b.sNo || 0) - (a.sNo || 0);
      }

      if (sortBy.startsWith('total')) {
        const isDesc = sortBy === 'total_desc';
        const valA = a.total || a.amount || 0;
        const valB = b.total || b.amount || 0;
        return isDesc ? valB - valA : valA - valB;
      }

      if (sortBy.startsWith('beds')) {
        const isDesc = sortBy === 'beds_desc';
        return isDesc ? (b.beds || 0) - (a.beds || 0) : (a.beds || 0) - (b.beds || 0);
      }

      if (sortBy === 'sNo_asc') {
        return (a.sNo || 0) - (b.sNo || 0);
      }

      // Default sNo_desc
      return (b.sNo || 0) - (a.sNo || 0);
    });
  }, [filteredRecords, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Building2 className="w-3.5 h-3.5" />
                All Properties & Deals
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredRecords.length} of {records.length} Records
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Hostel Monetization Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold font-mono">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Filter Bar with Numerical Values in every selector & Multi-field search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-slate-100">
          
          {/* Universal Search: Property, City, SPOC, Plan, Operator */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search property, city, SPOC, plan..."
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* City with Numerical Count for each item */}
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Cities ({records.length})</option>
            {cityList.map(c => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>

          {/* Plan with Numerical Count */}
          <select
            value={selectedPlan}
            onChange={(e) => {
              setSelectedPlan(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Plans ({records.length})</option>
            {planList.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.count})
              </option>
            ))}
          </select>

          {/* SPOC with Numerical Count */}
          <select
            value={selectedSpoc}
            onChange={(e) => {
              setSelectedSpoc(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All SPOCs ({records.length})</option>
            {spocList.map(s => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>

          {/* Payment Type with Numerical Count */}
          <select
            value={selectedPayType}
            onChange={(e) => {
              setSelectedPayType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Pay Types ({records.length})</option>
            {payTypeList.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.count})
              </option>
            ))}
          </select>

          {/* Subscription Validity Filter (User requested) */}
          <SubscriptionFilter
            records={records}
            selectedMonths={selectedSubscriptionMonths}
            onChange={(m) => {
              setSelectedSubscriptionMonths(m);
              setCurrentPage(1);
            }}
            variant="select"
          />

        </div>

        {/* Sort Controls Bar: User requested ability to sort by latest payment date or property name without M/s prefix */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="paymentDate_desc">⚡ Latest Payment Date (Newest first)</option>
              <option value="paymentDate_asc">📅 Payment Date (Oldest first)</option>
              <option value="pgName_asc">🔤 Property Name (A to Z - ignoring M/s)</option>
              <option value="pgName_desc">🔤 Property Name (Z to A)</option>
              <option value="renewalMonth_asc">⏳ Renewal Due Date (Earliest first)</option>
              <option value="renewalMonth_desc">⏳ Renewal Due Date (Latest first)</option>
              <option value="total_desc">💰 Deal Amount (Highest first)</option>
              <option value="beds_desc">🛏️ Beds Count (Highest first)</option>
              <option value="sNo_asc">🔢 S.No (#1 to #...)</option>
              <option value="sNo_desc">🔢 S.No (Latest added first)</option>
            </select>
          </div>

          {(selectedCity !== 'ALL' || selectedSpoc !== 'ALL' || selectedPlan !== 'ALL' || selectedPayType !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCity('ALL');
                setSelectedSpoc('ALL');
                setSelectedPlan('ALL');
                setSelectedPayType('ALL');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold self-start sm:self-auto cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>

      </div>

      {/* MOBILE VIEW: Card Stack */}
      <div className="block md:hidden space-y-3">
        {paginatedRecords.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (r.paymentType || '').includes('FIRST') 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {r.paymentType}
                  </span>
                  <PlanBadge plan={r.plan} />
                  <span className="text-[10px] font-mono text-slate-400">
                    #{r.sNo}
                  </span>
                </div>
                <h3 
                  onClick={() => onSelectRecord(r)}
                  className="text-base font-bold text-slate-900 cursor-pointer hover:text-purple-600"
                >
                  {r.pgName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.operatorName} • {r.location} ({detectCity(r.location, r.pgName)})
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-bold font-mono text-slate-900 block">
                  {formatINR(r.total || r.amount)}
                </span>
                <span className="text-[10px] text-slate-500">{r.beds} Beds</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 truncate">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Paid: <strong>{formatDisplayDate(r.paymentDate || r.paymentMonth)}</strong></span>
              </div>
              <div className="flex items-center gap-1 truncate text-purple-900">
                <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Due: <strong>{formatDisplayDate(r.nextPayMonth || r.renewalMonth)}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>SPOC: <strong>{r.spoc}</strong></span>
              <div className="flex items-center gap-2">
                {r.contact && (
                  <a
                    href={`tel:${r.contact}`}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => onSelectRecord(r)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 border border-purple-200 cursor-pointer"
                >
                  View
                </button>
                <button
                  onClick={() => onEditRecord(r)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP VIEW: High-Density Table with Payment Date & Renewal Due Date */}
      <div className="hidden md:block bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-purple-50/50 border-b border-purple-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-14 cursor-pointer" onClick={() => setSortBy(s => s === 'sNo_desc' ? 'sNo_asc' : 'sNo_desc')}>
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => setSortBy(s => s === 'pgName_asc' ? 'pgName_desc' : 'pgName_asc')}>
                  <div className="flex items-center gap-1">
                    <span>Property Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Location & City</th>
                <th className="py-3 px-3 text-center cursor-pointer" onClick={() => setSortBy(s => s === 'beds_desc' ? 'beds_asc' : 'beds_desc')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Beds</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => setSortBy(s => s === 'total_desc' ? 'total_asc' : 'total_desc')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center cursor-pointer" onClick={() => setSortBy(s => s === 'paymentDate_desc' ? 'paymentDate_asc' : 'paymentDate_desc')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Payment Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center cursor-pointer" onClick={() => setSortBy(s => s === 'renewalMonth_asc' ? 'renewalMonth_desc' : 'renewalMonth_asc')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Renewal Due</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">SPOC</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((r) => {
                const recCity = detectCity(r.location, r.pgName);

                return (
                  <tr 
                    key={r.id}
                    className="hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-slate-500 font-medium">
                      {r.sNo}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onSelectRecord(r)}
                        className="font-bold text-slate-900 hover:text-purple-600 text-left truncate max-w-xs block cursor-pointer"
                      >
                        {r.pgName}
                      </button>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <PlanBadge plan={r.plan} />
                        <span className="text-[10px] text-slate-500 font-mono">({r.months} mo)</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 block truncate max-w-[140px]">{r.location}</span>
                      <span className="text-[10px] text-purple-700 font-semibold">{recCity}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                      {r.beds}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (r.paymentType || '').includes('FIRST')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.paymentType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(r.total || r.amount)}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {formatDisplayDate(r.paymentDate || r.paymentMonth)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-900">
                      {formatDisplayDate(r.nextPayMonth || r.renewalMonth)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {r.spoc}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectRecord(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditRecord(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                          title="Edit Deal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-purple-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-600">
          Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
          <strong>{Math.min(currentPage * pageSize, sortedRecords.length)}</strong> of{' '}
          <strong>{sortedRecords.length}</strong> deals
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs cursor-pointer"
          >
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-800 px-2 font-mono">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
