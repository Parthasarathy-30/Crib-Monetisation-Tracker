import React, { useMemo } from 'react';
import { HostelRecord } from '../data/types';
import { CalendarRange } from 'lucide-react';

interface SubscriptionFilterProps {
  records: HostelRecord[];
  selectedMonths: number | 'ALL';
  onChange: (months: number | 'ALL') => void;
  variant?: 'pills' | 'select';
  className?: string;
}

export const SubscriptionFilter: React.FC<SubscriptionFilterProps> = ({
  records,
  selectedMonths,
  onChange,
  variant = 'select',
  className = ''
}) => {
  // Compute counts for each duration
  const counts = useMemo(() => {
    let all = records.length;
    let single = 0; // 1 month
    let three = 0;  // 3 months
    let six = 0;    // 6 months
    let twelve = 0; // 12 months
    let others = 0;

    records.forEach(r => {
      const m = r.months || 1;
      if (m === 1) single++;
      else if (m === 3) three++;
      else if (m === 6) six++;
      else if (m === 12) twelve++;
      else others++;
    });

    return { all, single, three, six, twelve, others };
  }, [records]);

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
        <button
          type="button"
          onClick={() => onChange('ALL')}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
            selectedMonths === 'ALL'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Validity ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => onChange(1)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
            selectedMonths === 1
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          1 Mo / Single ({counts.single})
        </button>

        <button
          type="button"
          onClick={() => onChange(3)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
            selectedMonths === 3
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          3 Months ({counts.three})
        </button>

        <button
          type="button"
          onClick={() => onChange(6)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
            selectedMonths === 6
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          6 Months ({counts.six})
        </button>

        <button
          type="button"
          onClick={() => onChange(12)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
            selectedMonths === 12
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          12 Months ({counts.twelve})
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedMonths}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
        }}
        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        <option value="ALL">Subscription: All Plans ({counts.all})</option>
        <option value="1">1 Month / Single ({counts.single})</option>
        <option value="3">3 Months Subscription ({counts.three})</option>
        <option value="6">6 Months Subscription ({counts.six})</option>
        <option value="12">12 Months / 1 Year ({counts.twelve})</option>
      </select>
    </div>
  );
};
