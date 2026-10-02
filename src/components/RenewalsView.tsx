import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatNumber, parseFlexibleDate, isDateMatching, formatDisplayDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { PaymentTypeBadge } from '../utils/paymentTypeHelper';
import { MarkAsPaidModal } from './MarkAsPaidModal';
import { ModernCalendarPicker } from './ModernCalendarPicker';
import { SubscriptionFilter } from './SubscriptionFilter';
import { 
  CalendarClock, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Search, 
  MapPin, 
  Bed, 
  User, 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  X, 
  CreditCard, 
  Clock, 
  EyeOff, 
  Eye, 
  SlidersHorizontal 
} from 'lucide-react';

interface RenewalsViewProps {
  records: HostelRecord[];
  onSelectRecord: (record: HostelRecord) => void;
  onEditRecord: (record: HostelRecord) => void;
  onToggleStatus: (recordId: string, status: 'PAID' | 'UNPAID' | 'YET_TO_PAY') => void;
  onRecordPaymentAndScheduleRenewal?: (paidDeal: HostelRecord, nextDeal: HostelRecord) => void;
}

interface GroupedPgRenewals {
  groupKey: string;
  pgName: string;
  operatorName: string;
  contact: string;
  location: string;
  city: string;
  spoc: string;
  totalAmount: number;
  unpaidAmount: number;
  paidAmount: number;
  unpaidCount: number;
  paidCount: number;
  yetToPayCount: number;
  deals: HostelRecord[];
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({
  records,
  onSelectRecord,
  onEditRecord,
  onToggleStatus,
  onRecordPaymentAndScheduleRenewal
}) => {
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const [paidModalDeal, setPaidModalDeal] = useState<HostelRecord | null>(null);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);

  // Extract all distinct renewal months sorted chronologically
  const allMonthsList = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach(r => {
      const rm = (r.renewalMonth || '').trim();
      if (rm) {
        counts.set(rm, (counts.get(rm) || 0) + 1);
      }
    });

    const monthOrder: { [k: string]: number } = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    const list = Array.from(counts.keys()).map(name => {
      const parts = name.split(/[\s-]+/);
      let m = 1;
      let y = 2026;
      parts.forEach(p => {
        const lower = p.toLowerCase();
        if (monthOrder[lower]) m = monthOrder[lower];
        if (/^\d{4}$/.test(p)) y = parseInt(p, 10);
      });
      return {
        name,
        count: counts.get(name) || 0,
        sortKey: y * 100 + m
      };
    });

    return list;
  }, [records]);

  // Current System Month (Defaults to "October 2026")
  const currentSystemMonth = useMemo(() => {
    const match = allMonthsList.find(m => m.name.toLowerCase() === 'october 2026');
    if (match) return match.name;
    const anyOct = allMonthsList.find(m => m.name.toLowerCase().includes('october 2026'));
    if (anyOct) return anyOct.name;
    return 'October 2026';
  }, [allMonthsList]);

  // Active Selected Month (Defaults automatically to Current Month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentSystemMonth);

  useEffect(() => {
    if (currentSystemMonth && (!selectedMonth || selectedMonth === 'August 2026')) {
      setSelectedMonth(currentSystemMonth);
    }
  }, [currentSystemMonth]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID' | 'YET_TO_PAY'>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedSpoc, setSelectedSpoc] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');

  // Calendar Due Date Picker states
  const [selectedDueDate, setSelectedDueDate] = useState<string>(''); // YYYY-MM-DD
  const [isTodayFilterActive, setIsTodayFilterActive] = useState<boolean>(false);
  const [selectedSubscriptionMonths, setSelectedSubscriptionMonths] = useState<number | 'ALL'>('ALL');

  // Hideable UI Sections (Collapsible Summary & Filters)
  const [isSummaryHidden, setIsSummaryHidden] = useState<boolean>(false);
  const [isFiltersHidden, setIsFiltersHidden] = useState<boolean>(false);

  // Filter records belonging to selected renewal month
  const monthRecords = useMemo(() => {
    return records.filter(r => (r.renewalMonth || '').trim().toLowerCase() === selectedMonth.toLowerCase());
  }, [records, selectedMonth]);

  // All 4 Core Cities permanently available with current month counts
  const availableCities = useMemo(() => {
    const core = ['Chennai', 'Coimbatore', 'Bangalore', 'Kerala'];
    const otherCities = new Set<string>();
    records.forEach(r => {
      if (r.city && !core.includes(r.city)) {
        otherCities.add(r.city);
      }
    });

    const fullList = [...core, ...Array.from(otherCities)];
    return fullList.map(city => {
      const inMonthCount = monthRecords.filter(r => (r.city || '').toLowerCase() === city.toLowerCase()).length;
      return {
        name: city,
        count: inMonthCount
      };
    });
  }, [records, monthRecords]);

  // Available SPOC list with current month counts
  const spocList = useMemo(() => {
    const spocSet = new Set<string>();
    records.forEach(r => {
      if (r.spoc) spocSet.add(r.spoc.trim().toUpperCase());
    });
    const reps = Array.from(spocSet).sort();
    return reps.map(spoc => {
      const inMonthCount = monthRecords.filter(r => (r.spoc || '').toUpperCase() === spoc).length;
      return {
        name: spoc,
        count: inMonthCount
      };
    });
  }, [records, monthRecords]);

  // Available Plans list with counts in this month (Requested in Image 5!)
  const planList = useMemo(() => {
    const planSet = new Set<string>();
    // Standard plans in crib system
    ['SILVER', 'GOLD', 'BRONZE', 'GOLD - COMMERCIAL'].forEach(p => planSet.add(p));
    monthRecords.forEach(r => {
      if (r.plan) planSet.add(r.plan.trim().toUpperCase());
    });
    
    return Array.from(planSet).map(plan => {
      const inMonthCount = monthRecords.filter(r => (r.plan || '').trim().toUpperCase() === plan).length;
      return {
        name: plan,
        count: inMonthCount
      };
    });
  }, [monthRecords]);

  // System Today date formatted (YYYY-MM-DD)
  const todayYMD = useMemo(() => {
    return '2026-10-01';
  }, []);

  // Distinct due dates with counts in this active month for instant day chips
  const monthDueDatesList = useMemo(() => {
    const dateMap = new Map<string, { ymd: string; display: string; day: number; count: number }>();
    monthRecords.forEach(r => {
      const raw = r.nextPayMonth || '';
      const parsed = parseFlexibleDate(raw);
      if (parsed) {
        if (!dateMap.has(parsed.ymd)) {
          dateMap.set(parsed.ymd, {
            ymd: parsed.ymd,
            display: formatDisplayDate(raw),
            day: parsed.day,
            count: 0
          });
        }
        dateMap.get(parsed.ymd)!.count++;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.day - b.day);
  }, [monthRecords]);

  // Count dues for Today (1 Oct 2026) in this month
  const duesTodayCount = useMemo(() => {
    return monthRecords.filter(r => isDateMatching(r.nextPayMonth || '', todayYMD)).length;
  }, [monthRecords, todayYMD]);

  // Scrollable Months (No 2023 or 2024 clutter)
  const scrollableMonthList = useMemo(() => {
    const filtered = allMonthsList.filter(m => m.sortKey >= 202501);
    return [...filtered].sort((a, b) => b.sortKey - a.sortKey);
  }, [allMonthsList]);

  // Auto-scroll to Current Month on mount
  const scrollToCurrentMonth = () => {
    if (monthScrollRef.current) {
      const currentEl = monthScrollRef.current.querySelector('[data-current="true"]') as HTMLElement;
      if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentMonth();
    }, 200);
    return () => clearTimeout(timer);
  }, [currentSystemMonth]);

  // Group Records by PG Name (Handles duplicate PGs appearing under the same PG!)
  const groupedPgList = useMemo(() => {
    const groupsMap = new Map<string, GroupedPgRenewals>();

    monthRecords.forEach(r => {
      // 1. Status Filter
      const st = r.status || (r.isPaid ? 'PAID' : 'UNPAID');
      if (statusFilter !== 'ALL' && st !== statusFilter) return;

      // 2. City Filter
      if (selectedCity !== 'ALL' && (r.city || '').toLowerCase() !== selectedCity.toLowerCase()) return;

      // 3. SPOC Filter
      if (selectedSpoc !== 'ALL' && (r.spoc || '').toUpperCase() !== selectedSpoc.toUpperCase()) return;

      // 4. Plan Filter
      if (selectedPlan !== 'ALL' && (r.plan || '').trim().toUpperCase() !== selectedPlan.toUpperCase()) return;

      // 5. Date Filter (Calendar or Today)
      if (isTodayFilterActive) {
        if (!isDateMatching(r.nextPayMonth || '', todayYMD)) return;
      } else if (selectedDueDate) {
        if (!isDateMatching(r.nextPayMonth || '', selectedDueDate)) return;
      }

      // 5b. Subscription Duration Filter (User requested)
      if (selectedSubscriptionMonths !== 'ALL' && (r.months || 1) !== selectedSubscriptionMonths) return;

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          r.pgName.toLowerCase().includes(q) ||
          r.operatorName.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.contact.toLowerCase().includes(q) ||
          r.spoc.toLowerCase().includes(q)
        );
        if (!matches) return;
      }

      const normKey = (r.pgName || 'UNKNOWN').trim().toLowerCase();

      if (!groupsMap.has(normKey)) {
        groupsMap.set(normKey, {
          groupKey: normKey,
          pgName: r.pgName,
          operatorName: r.operatorName,
          contact: r.contact,
          location: r.location,
          city: r.city || 'Chennai',
          spoc: r.spoc,
          totalAmount: 0,
          unpaidAmount: 0,
          paidAmount: 0,
          unpaidCount: 0,
          paidCount: 0,
          yetToPayCount: 0,
          deals: []
        });
      }

      const grp = groupsMap.get(normKey)!;
      const amt = r.total || r.amount || 0;
      grp.totalAmount += amt;
      grp.deals.push(r);

      if (st === 'PAID') {
        grp.paidAmount += amt;
        grp.paidCount++;
      } else if (st === 'YET_TO_PAY') {
        grp.yetToPayCount++;
      } else {
        grp.unpaidAmount += amt;
        grp.unpaidCount++;
      }
    });

    return Array.from(groupsMap.values());
  }, [
    monthRecords,
    statusFilter,
    selectedCity,
    selectedSpoc,
    selectedPlan,
    isTodayFilterActive,
    selectedDueDate,
    todayYMD,
    searchQuery
  ]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalUnpaid = 0;
    let totalPaid = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let yetToPayCount = 0;

    monthRecords.forEach(r => {
      const amt = r.total || r.amount || 0;
      totalExpected += amt;
      const st = r.status || (r.isPaid ? 'PAID' : 'UNPAID');

      if (st === 'PAID') {
        totalPaid += amt;
        paidCount++;
      } else if (st === 'YET_TO_PAY') {
        yetToPayCount++;
      } else {
        totalUnpaid += amt;
        unpaidCount++;
      }
    });

    const percent = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalUnpaid,
      totalPaid,
      unpaidCount,
      paidCount,
      yetToPayCount,
      totalCount: monthRecords.length,
      percent
    };
  }, [monthRecords]);

  const handleToggleToday = () => {
    if (isTodayFilterActive) {
      setIsTodayFilterActive(false);
    } else {
      setIsTodayFilterActive(true);
      setSelectedDueDate('');
    }
  };

  const handleSelectDate = (dateVal: string) => {
    setSelectedDueDate(dateVal);
    setIsTodayFilterActive(false);
  };

  const handleClearDateFilter = () => {
    setSelectedDueDate('');
    setIsTodayFilterActive(false);
  };

  const getWhatsAppLink = (
    pgName: string, 
    operator: string, 
    phone: string, 
    amount: number,
    dueDate: string
  ) => {
    const cleanNumber = (phone || '').replace(/\D/g, '');
    const phoneWithCode = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const amountStr = formatINR(amount);
    const dateFormatted = formatDisplayDate(dueDate);

    const message = `Hello ${operator || 'Partner'},

This is a reminder regarding the monthly subscription renewal for *${pgName}*.

• Property: ${pgName}
• Renewal Due Date: ${dateFormatted}
• Amount Due: ${amountStr}

Kindly confirm once the payment is completed. Thank you!
- Crib Operations Team`;

    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner: Month Selector & Clean Month Scroll Track */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs">
        
        {/* Header Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <CalendarClock className="w-3.5 h-3.5" />
                Renewals Management
              </span>
              
              {/* CURRENT MONTH AUTOMATIC PILL (Clean, unclipped) */}
              <button
                onClick={() => {
                  setSelectedMonth(currentSystemMonth);
                  setSelectedDueDate('');
                  setIsTodayFilterActive(false);
                  setTimeout(scrollToCurrentMonth, 100);
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                  selectedMonth.toLowerCase() === currentSystemMonth.toLowerCase()
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Jump directly to active Current Month"
              >
                <span>Current Month (Oct 2026)</span>
                {selectedMonth.toLowerCase() === currentSystemMonth.toLowerCase() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                )}
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5 flex items-center gap-2.5">
              <span>{selectedMonth} Renewals</span>
              <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {metrics.totalCount} Hostels
              </span>
            </h1>
          </div>

          {/* Month Selector Dropdown & Collapse Summary Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
            >
              {allMonthsList.map(m => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.count} Hostels)
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsSummaryHidden(!isSummaryHidden)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1 transition-colors"
              title={isSummaryHidden ? "Show Summary Cards" : "Hide Summary Cards"}
            >
              {isSummaryHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSummaryHidden ? 'Show' : 'Hide'}</span>
            </button>
          </div>
        </div>

        {/* Clean Scrollable Month Track (Clutter removed: no extra text labels) */}
        <div className="pt-2 border-t border-slate-100">
          <div 
            ref={monthScrollRef}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar touch-pan-x"
          >
            {scrollableMonthList.map((m) => {
              const isSelected = selectedMonth.toLowerCase() === m.name.toLowerCase();
              const isCurrent = currentSystemMonth.toLowerCase() === m.name.toLowerCase();
              const isNextMonth = m.name.toLowerCase().includes('november 2026');

              return (
                <button
                  key={m.name}
                  data-current={isCurrent ? 'true' : undefined}
                  onClick={() => {
                    setSelectedMonth(m.name);
                    setSelectedDueDate('');
                    setIsTodayFilterActive(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                      : isCurrent
                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300 font-extrabold'
                      : isNextMonth
                      ? 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{m.name}</span>
                  {isCurrent && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white text-purple-900' : 'bg-purple-600 text-white'
                    }`}>
                      Current
                    </span>
                  )}
                  {isNextMonth && !isSelected && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-200 text-blue-900">
                      Next
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 KPI Metrics (Can be collapsed by user) */}
        {!isSummaryHidden && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-slate-100">
            
            {/* 1. Pending Due to Collect (Sheet Matched: Dark Red) */}
            <div className="bg-rose-50/60 rounded-xl p-3 sm:p-4 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-rose-800">Pending to Collect</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-rose-950 mt-1 font-mono tracking-tight">
                {formatINR(metrics.totalUnpaid)}
              </div>
              <div className="text-[10px] sm:text-xs text-rose-700 font-semibold mt-0.5">
                {metrics.unpaidCount} Accounts Pending
              </div>
            </div>

            {/* 2. Collected Amount (Sheet Matched: Green) */}
            <div className="bg-emerald-50/60 rounded-xl p-3 sm:p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-800">Collected Amount</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-950 mt-1 font-mono tracking-tight">
                {formatINR(metrics.totalPaid)}
              </div>
              <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold mt-0.5">
                {metrics.paidCount} Accounts Paid
              </div>
            </div>

            {/* 3. Total Expected */}
            <div className="bg-purple-50/60 rounded-xl p-3 sm:p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-purple-800">Total Renewal Value</span>
                <span className="text-[10px] font-mono font-bold bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded">
                  {metrics.totalCount} deals
                </span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-purple-950 mt-1 font-mono tracking-tight">
                {formatINR(metrics.totalExpected)}
              </div>
              <div className="text-[10px] sm:text-xs text-purple-700 font-medium mt-0.5">
                {metrics.yetToPayCount > 0 ? `${metrics.yetToPayCount} Future Dues` : 'All Accounts Scheduled'}
              </div>
            </div>

            {/* 4. Collection Rate */}
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700">Collection Rate</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
                {metrics.percent}%
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                {metrics.paidCount} of {metrics.totalCount} completed
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CLEAN, PERFECTLY ALIGNED FILTER TOOLBAR (Fixing Screenshot 2 & 3) */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs space-y-3">
        
        {/* Top Control Bar: Search + Quick Date & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PG name, operator, location, phone..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          {/* Quick Date Controls (Neatly aligned on a single row) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* TODAY DUE BUTTON - Compact professional size */}
            <button
              onClick={handleToggleToday}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 border cursor-pointer shrink-0 ${
                isTodayFilterActive
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-200'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
              }`}
              title="Filter dues for Today (01 Oct 2026)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today Due</span>
              {duesTodayCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isTodayFilterActive ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-900'
                }`}>
                  {duesTodayCount}
                </span>
              )}
            </button>

            {/* Modern In-App Calendar Date Picker */}
            <ModernCalendarPicker
              selectedDate={selectedDueDate}
              onChange={(ddmmyyyy, iso) => handleSelectDate(iso)}
              onClear={handleClearDateFilter}
              placeholder="Select Date"
            />

            {/* Clear Date Filter Button */}
            {(selectedDueDate || isTodayFilterActive) && (
              <button
                onClick={handleClearDateFilter}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Collapse Filters Toggle */}
            <button
              onClick={() => setIsFiltersHidden(!isFiltersHidden)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs cursor-pointer"
              title={isFiltersHidden ? "Show Filters" : "Hide Filters"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>

        {/* Quick Due Day Chips */}
        {monthDueDatesList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar pt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Due Days:
            </span>
            {monthDueDatesList.map(item => {
              const isSelected = selectedDueDate === item.ymd;
              return (
                <button
                  key={item.ymd}
                  onClick={() => handleSelectDate(item.ymd)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{item.day}{item.day === 1 ? 'st' : item.day === 2 ? 'nd' : item.day === 3 ? 'rd' : 'th'}</span>
                  <span className={`text-[10px] ml-1 px-1 rounded-full ${
                    isSelected ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Status, City, SPOC & Plan Filter Rows */}
        {!isFiltersHidden && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fade-in">
            
            {/* Status Segmented Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({monthRecords.length})
              </button>

              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'UNPAID'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Unpaid / Overdue ({metrics.unpaidCount})
              </button>

              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Paid ({metrics.paidCount})
              </button>

              <button
                onClick={() => setStatusFilter('YET_TO_PAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'YET_TO_PAY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Yet to be Paid ({metrics.yetToPayCount})
              </button>
            </div>

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
                All Cities ({monthRecords.length})
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

            {/* Dropdown Grid: SPOC & Plan with explicit counts (Fixing Screenshot 2 & 5!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              
              {/* SPOC Select with Counts */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Sales SPOC</label>
                <select
                  value={selectedSpoc}
                  onChange={(e) => setSelectedSpoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  <option value="ALL">Sales SPOC: All Reps ({monthRecords.length})</option>
                  {spocList.map(s => (
                    <option key={s.name} value={s.name}>
                      SPOC: {s.name} ({s.count} hostels)
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Select with Counts (Requested in Image 5!) */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Plan Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  <option value="ALL">Plan: All Plans ({monthRecords.length})</option>
                  {planList.map(p => (
                    <option key={p.name} value={p.name}>
                      Plan: {p.name} ({p.count})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Subscription Validity Filter (User requested feature!) */}
            <div className="pt-1 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Subscription Validity (Filter by duration):
              </label>
              <SubscriptionFilter
                records={monthRecords}
                selectedMonths={selectedSubscriptionMonths}
                onChange={setSelectedSubscriptionMonths}
                variant="pills"
              />
            </div>

            {/* Reset Filters Option */}
            {(selectedCity !== 'ALL' || selectedSpoc !== 'ALL' || selectedPlan !== 'ALL' || selectedSubscriptionMonths !== 'ALL' || statusFilter !== 'ALL' || searchQuery || selectedDueDate || isTodayFilterActive) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setSelectedCity('ALL');
                    setSelectedSpoc('ALL');
                    setSelectedPlan('ALL');
                    setSelectedSubscriptionMonths('ALL');
                    setStatusFilter('ALL');
                    setSearchQuery('');
                    setSelectedDueDate('');
                    setIsTodayFilterActive(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}

          </div>
        )}

        {/* Date Filter Indicator Banner */}
        {(selectedDueDate || isTodayFilterActive) && (
          <div className="p-2.5 rounded-xl bg-purple-50/90 border border-purple-200 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-xs">
            <span className="flex items-center gap-1.5 font-semibold">
              <CalendarIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>
                Filtered by Due Date:{' '}
                <strong className="font-mono text-purple-950 font-bold">{formatDisplayDate(selectedDueDate || todayYMD)}</strong>
                {isTodayFilterActive ? ' (Today)' : ''}
              </span>
            </span>
            <button
              onClick={handleClearDateFilter}
              className="self-start sm:self-auto text-[11px] font-bold text-purple-700 underline hover:text-purple-900 cursor-pointer"
            >
              Show All Month Dues
            </button>
          </div>
        )}

      </div>

      {/* GROUPED PG LIST: Handles duplicate PGs appearing under the same PG! */}
      {groupedPgList.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-purple-100 shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No matching renewals found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query, city, SPOC, plan, or due date filter for {selectedMonth}.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {groupedPgList.map((group) => {
            const hasMultipleDeals = group.deals.length > 1;
            const allPaid = group.unpaidCount === 0 && group.deals.every(d => d.status === 'PAID');
            const hasYetToPay = group.deals.some(d => d.status === 'YET_TO_PAY');

            return (
              <div
                key={group.groupKey}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs hover:shadow-md ${
                  allPaid 
                    ? 'border-slate-200 hover:border-purple-200' 
                    : hasYetToPay
                    ? 'border-blue-200 bg-blue-50/10'
                    : 'border-rose-200 bg-rose-50/10 ring-1 ring-rose-300/40'
                }`}
              >
                {/* Primary PG Group Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {/* Status Pill */}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        allPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : hasYetToPay
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {allPaid ? 'PAID ✓' : hasYetToPay ? 'YET TO BE PAID 🔵' : 'UNPAID / OVERDUE 🔴'}
                      </span>

                      {/* City Pill */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {group.city}
                      </span>

                      {/* SPOC */}
                      <span className="text-[10px] font-mono text-slate-500">
                        SPOC: {group.spoc}
                      </span>

                      {/* Multiple Deals Badge if PG appears twice! */}
                      {hasMultipleDeals && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          {group.deals.length} Deals in {selectedMonth}
                        </span>
                      )}
                    </div>

                    {/* PG Name */}
                    <h2 
                      onClick={() => onSelectRecord(group.deals[0])}
                      className="text-base sm:text-lg font-bold text-slate-900 hover:text-purple-700 cursor-pointer truncate tracking-tight"
                      title={group.pgName}
                    >
                      {group.pgName}
                    </h2>

                    {/* Operator and Location */}
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {group.operatorName || 'Operator'}
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {group.location}
                      </span>

                      {group.contact && (
                        <span className="text-slate-500 font-mono">
                          Ph: {group.contact}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Header: Combined Total & Quick WhatsApp/Call */}
                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-2 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-slate-500 block font-medium">
                        {allPaid ? 'Total Paid' : 'Total Amount Due'}
                      </span>
                      <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                        allPaid ? 'text-emerald-700' : 'text-purple-900'
                      }`}>
                        {formatINR(group.totalAmount)}
                      </span>
                    </div>

                    {/* Operator Action Buttons (WhatsApp & Call) */}
                    {group.contact && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <a
                          href={getWhatsAppLink(
                            group.pgName,
                            group.operatorName,
                            group.contact,
                            group.unpaidAmount || group.totalAmount,
                            group.deals[0]?.nextPayMonth || ''
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                          title="WhatsApp Reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${group.contact}`}
                          className="p-1.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                          title={`Call: ${group.contact}`}
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                        </a>
                      </div>
                    )}

                  </div>

                </div>

                {/* SUB-DEALS LIST: Prominently displaying Plan Badge with distinct Colors! */}
                <div className="mt-3 space-y-2.5">
                  {group.deals.map((deal, dIdx) => {
                    const dealStatus = deal.status || (deal.isPaid ? 'PAID' : 'UNPAID');
                    const dealAmount = deal.total || deal.amount || 0;

                    return (
                      <div
                        key={deal.id || `deal-${dIdx}`}
                        className={`rounded-xl p-3 sm:p-3.5 border transition-all ${
                          dealStatus === 'PAID'
                            ? 'bg-slate-50/70 border-slate-200' 
                            : dealStatus === 'YET_TO_PAY'
                            ? 'bg-blue-50/40 border-blue-200'
                            : 'bg-rose-50/30 border-rose-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          
                          {/* Deal Metadata Highlights (Per Bed Cost, Plan Badge, Payment Date, Due Date) */}
                          <div className="flex-1 min-w-0">
                            
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {hasMultipleDeals && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-200 text-purple-900">
                                  Deal #{dIdx + 1}
                                </span>
                              )}

                              {/* OFFICIAL PLAN BADGE WITH SPECIFIC COLORS (Gold, Silver, Bronze, Gold-Commercial) */}
                              <PlanBadge plan={deal.plan} />

                              {/* PER BED COST */}
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                                <Bed className="w-3 h-3 text-amber-700" />
                                <span>{formatINR(deal.ratePerBed)}/bed</span>
                                <span className="text-slate-500 font-normal">({deal.beds} Beds)</span>
                              </span>

                              {/* PAYMENT TYPE */}
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                {deal.paymentType}
                              </span>

                              {/* STATUS BADGE */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                dealStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : dealStatus === 'YET_TO_PAY'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {dealStatus}
                              </span>
                            </div>

                            {/* Dates Row: PAYMENT DATE & NEXT DUE DATE (Date, Month, Year) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mt-1.5">
                              
                              {/* Payment Date */}
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>
                                  Payment Date:{' '}
                                  <strong className="text-slate-900 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {formatDisplayDate(deal.paymentDate || deal.paymentMonth)}
                                  </strong>
                                </span>
                              </div>

                              {/* Next Due Date (NEXT PAY MONTH) */}
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="whitespace-nowrap">
                                  Due Date:{' '}
                                  <strong className="text-slate-900 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                    {formatDisplayDate(deal.nextPayMonth || deal.renewalMonth)}
                                  </strong>
                                </span>
                              </div>

                            </div>

                            {deal.remarks && (
                              <div className="text-[11px] text-slate-500 mt-1 italic">
                                Note: {deal.remarks}
                              </div>
                            )}

                          </div>

                          {/* Deal Amount & Status Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            
                            <div className="text-left sm:text-right mr-2">
                              <span className="text-[10px] text-slate-500 block font-medium">Deal Amount</span>
                              <span className={`text-base sm:text-lg font-bold font-mono ${
                                dealStatus === 'PAID' 
                                  ? 'text-emerald-700' 
                                  : dealStatus === 'YET_TO_PAY'
                                  ? 'text-blue-700'
                                  : 'text-rose-700'
                              }`}>
                                {formatINR(dealAmount)}
                              </span>
                            </div>

                            {/* Status Change Buttons (Cycle between PAID, UNPAID, YET_TO_PAY) */}
                            <div className="flex items-center gap-1">
                              {dealStatus !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setPaidModalDeal(deal);
                                    setIsPaidModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Record Payment & Schedule Next Renewal (Green)"
                                >
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  <span>Paid</span>
                                </button>
                              )}

                              {dealStatus !== 'UNPAID' && (
                                <button
                                  onClick={() => onToggleStatus(deal.id, 'UNPAID')}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                                  title="Mark as Unpaid (Red)"
                                >
                                  Unpaid
                                </button>
                              )}

                              {dealStatus !== 'YET_TO_PAY' && (
                                <button
                                  onClick={() => onToggleStatus(deal.id, 'YET_TO_PAY')}
                                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                                  title="Mark as Yet to be Paid (Blue)"
                                >
                                  Future
                                </button>
                              )}

                              {/* View / Edit Details */}
                              <button
                                onClick={() => onSelectRecord(deal)}
                                className="p-1.5 rounded-xl text-purple-700 bg-white hover:bg-purple-100 transition-colors border border-purple-200 cursor-pointer"
                                title="View Deal Details"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Mark As Paid and Schedule Next Renewal Modal */}
      {isPaidModalOpen && paidModalDeal && (
        <MarkAsPaidModal
          deal={paidModalDeal}
          isOpen={isPaidModalOpen}
          onClose={() => {
            setIsPaidModalOpen(false);
            setPaidModalDeal(null);
          }}
          onConfirm={(paidDeal, nextDeal) => {
            if (onRecordPaymentAndScheduleRenewal) {
              onRecordPaymentAndScheduleRenewal(paidDeal, nextDeal);
            } else {
              onToggleStatus(paidDeal.id, 'PAID');
            }
            setIsPaidModalOpen(false);
            setPaidModalDeal(null);
          }}
        />
      )}

    </div>
  );
};
