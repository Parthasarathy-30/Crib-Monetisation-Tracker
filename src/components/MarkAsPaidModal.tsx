import React, { useState, useEffect } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatDisplayDate, parseFlexibleDate } from '../utils/formatters';
import { PlanBadge } from '../utils/planHelper';
import { PaymentTypeBadge, OFFICIAL_PAYMENT_TYPES } from '../utils/paymentTypeHelper';
import { ModernCalendarPicker } from './ModernCalendarPicker';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Bed, 
  Sparkles, 
  ArrowRight, 
  CreditCard,
  Building2,
  Clock,
  Plus,
  Minus,
  Calculator
} from 'lucide-react';

interface MarkAsPaidModalProps {
  deal: HostelRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paidDeal: HostelRecord, nextScheduledDeal: HostelRecord) => void;
}

export const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({
  deal,
  isOpen,
  onClose,
  onConfirm
}) => {
  // Defaults with safe optional chaining so hooks run unconditionally
  const initialParsed = parseFlexibleDate(deal?.paymentDate || deal?.nextPayMonth || '');
  const [paymentDateISO, setPaymentDateISO] = useState<string>(() => {
    return initialParsed?.ymd || '2026-10-02';
  });

  const [paymentDateDDMMYYYY, setPaymentDateDDMMYYYY] = useState<string>(() => {
    if (initialParsed) {
      return `${String(initialParsed.day).padStart(2, '0')}-${String(initialParsed.month).padStart(2, '0')}-${initialParsed.year}`;
    }
    return '02-10-2026';
  });

  // Bed Count & Pricing state
  const [bedsCount, setBedsCount] = useState<number | string>(() => deal?.beds || 80);
  const [ratePerBed, setRatePerBed] = useState<number | string>(() => deal?.ratePerBed || 25);
  const [renewalMonths, setRenewalMonths] = useState<number>(deal?.months || 1);
  const [paidAmount, setPaidAmount] = useState<number | string>(() => deal?.total || deal?.amount || 1520);
  
  const [selectedPlan, setSelectedPlan] = useState<string>(deal?.plan || 'GOLD');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(deal?.paymentType || 'RENEWAL PAY');
  const [remarks, setRemarks] = useState<string>(deal?.remarks || 'Renewal paid successfully');

  // Next renewal date calculations
  const [nextDueDisplay, setNextDueDisplay] = useState<string>('');
  const [nextMonthDisplay, setNextMonthDisplay] = useState<string>('');
  const [estimatedNextAmount, setEstimatedNextAmount] = useState<number>(deal?.total || deal?.amount || 0);

  // Synchronize state when deal or isOpen changes
  useEffect(() => {
    if (!deal) return;
    const parsed = parseFlexibleDate(deal.paymentDate || deal.nextPayMonth);
    const iso = parsed?.ymd || '2026-10-02';
    setPaymentDateISO(iso);
    if (parsed) {
      setPaymentDateDDMMYYYY(`${String(parsed.day).padStart(2, '0')}-${String(parsed.month).padStart(2, '0')}-${parsed.year}`);
    } else {
      setPaymentDateDDMMYYYY('02-10-2026');
    }
    setBedsCount(deal.beds || 80);
    setRatePerBed(deal.ratePerBed || 25);
    setRenewalMonths(deal.months || 1);
    setPaidAmount(deal.total || deal.amount || 1520);
    setSelectedPlan(deal.plan || 'GOLD');
    setSelectedPaymentType(deal.paymentType || 'RENEWAL PAY');
    setRemarks(deal.remarks || 'Renewal paid successfully');
  }, [deal, isOpen]);

  // Recalculate estimated next amount and due dates whenever duration, rate, beds, or date change
  useEffect(() => {
    if (!paymentDateISO) return;
    const [yStr, mStr, dStr] = paymentDateISO.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // Calculate future date by adding renewalMonths
      const futureDate = new Date(year, month - 1 + renewalMonths, day);
      const fYear = futureDate.getFullYear();
      const fMonth = futureDate.getMonth() + 1;
      const fDay = futureDate.getDate();

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const mName = monthNames[fMonth - 1] || 'January';
      // Universal DD-MM-YYYY format
      const formattedNextDue = `${String(fDay).padStart(2, '0')}-${String(fMonth).padStart(2, '0')}-${fYear}`;
      const formattedNextMonth = `${mName} ${fYear}`;

      setNextDueDisplay(formattedNextDue);
      setNextMonthDisplay(formattedNextMonth);

      // Estimated amount for the new cycle
      const numBeds = parseFloat(String(bedsCount)) || 0;
      const numRate = parseFloat(String(ratePerBed)) || 0;
      const baseAmt = numBeds * numRate * renewalMonths;
      const gstAmt = Number((baseAmt * 0.18).toFixed(2));
      const totalAmt = Number((baseAmt + gstAmt).toFixed(2));
      setEstimatedNextAmount(totalAmt);
    }
  }, [paymentDateISO, renewalMonths, ratePerBed, bedsCount]);

  // Handler: When user enters or changes Bed Count, auto-update Amount Paid
  const handleBedsChange = (raw: number | string) => {
    const rawStr = String(raw);
    if (rawStr === '') {
      setBedsCount('');
      return;
    }
    setBedsCount(raw);
    const validBeds = parseFloat(rawStr);
    if (!isNaN(validBeds)) {
      const numRate = parseFloat(String(ratePerBed)) || 0;
      const baseAmt = validBeds * numRate * renewalMonths;
      const withGst = Number((baseAmt * 1.18).toFixed(2));
      setPaidAmount(withGst);
    }
  };

  // Handler: When user enters Amount Paid, calculate beds based on Rate & Months
  const handleAmountChange = (raw: number | string) => {
    const rawStr = String(raw);
    if (rawStr === '') {
      setPaidAmount('');
      return;
    }
    setPaidAmount(raw);
    const newAmount = parseFloat(rawStr);
    if (!isNaN(newAmount)) {
      const numRate = parseFloat(String(ratePerBed)) || 0;
      if (numRate > 0 && renewalMonths > 0) {
        // Base amount before 18% GST
        const baseAmt = newAmount / 1.18;
        const calculatedBeds = Math.round(baseAmt / (numRate * renewalMonths));
        if (calculatedBeds > 0) {
          setBedsCount(calculatedBeds);
        }
      }
    }
  };

  // Handler: When Rate Per Bed changes
  const handleRateChange = (raw: number | string) => {
    const rawStr = String(raw);
    if (rawStr === '') {
      setRatePerBed('');
      return;
    }
    setRatePerBed(raw);
    const validRate = parseFloat(rawStr);
    if (!isNaN(validRate)) {
      const numBeds = parseFloat(String(bedsCount)) || 0;
      const baseAmt = numBeds * validRate * renewalMonths;
      const withGst = Number((baseAmt * 1.18).toFixed(2));
      setPaidAmount(withGst);
    }
  };

  // Handler: When Duration Months changes
  const handleDurationChange = (months: number) => {
    setRenewalMonths(months);
    const numBeds = parseFloat(String(bedsCount)) || 0;
    const numRate = parseFloat(String(ratePerBed)) || 0;
    const baseAmt = numBeds * numRate * months;
    setPaidAmount(Number((baseAmt * 1.18).toFixed(2)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;

    const [y, m, d] = paymentDateISO.split('-').map(Number);
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mShort = monthShort[m - 1] || 'Oct';
    // Strictly formatted DD-MM-YYYY
    const formattedPaymentDate = `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
    const formattedPaymentMonth = `${mShort} ${y}`;

    const numBeds = Math.max(1, parseFloat(String(bedsCount)) || 1);
    const numRate = parseFloat(String(ratePerBed)) || 0;
    const numPaid = parseFloat(String(paidAmount)) || 0;

    const baseAmount = Number((numPaid / 1.18).toFixed(2));
    const gstAmount = Number((numPaid - baseAmount).toFixed(2));

    // 1. Updated current deal (marked as PAID)
    // Preserves the historical data of the past deal while marking it paid
    const updatedPaidDeal: HostelRecord = {
      ...deal,
      status: 'PAID',
      isPaid: true,
      paymentDate: formattedPaymentDate,
      paymentMonth: formattedPaymentMonth,
      plan: selectedPlan,
      paymentType: selectedPaymentType,
      ratePerBed: numRate,
      beds: numBeds,
      total: numPaid,
      amount: baseAmount,
      gst: gstAmount,
      remarks: remarks.trim()
    };

    // 2. Automatically generated next scheduled renewal deal
    // Reflects the NEW bed count and new renewal cycle for the future month!
    const nextDealId = `rec-sched-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nextBaseAmount = Number((estimatedNextAmount / 1.18).toFixed(2));
    const nextGstAmount = Number((estimatedNextAmount - nextBaseAmount).toFixed(2));

    const nextScheduledDeal: HostelRecord = {
      ...deal,
      id: nextDealId,
      sNo: deal.sNo, // keeps associated sequence
      beds: numBeds, // newly updated bed count
      paymentType: 'RENEWAL PAY',
      paymentMode: deal.paymentMode || 'ONLINE',
      plan: selectedPlan,
      months: renewalMonths,
      ratePerBed: numRate,
      amount: nextBaseAmount,
      gst: nextGstAmount,
      total: estimatedNextAmount,
      paymentMonth: nextMonthDisplay,
      paymentDate: '',
      nextPayMonth: nextDueDisplay,
      renewalMonth: nextMonthDisplay,
      status: 'YET_TO_PAY',
      isPaid: false,
      remarks: `Renewal scheduled with ${numBeds} beds from previous payment on ${formattedPaymentDate}`
    };

    onConfirm(updatedPaidDeal, nextScheduledDeal);
  };

  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white border border-purple-100 rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl z-10 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-purple-100 bg-gradient-to-r from-emerald-50 via-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  #{deal.sNo}
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Record Payment & Renewal
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[260px] sm:max-w-xs mt-0.5">
                {deal.pgName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          
          {/* Quick Context Summary */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Operator & Area</span>
              <span className="font-bold text-slate-900">{deal.operatorName} • {deal.location}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Previous Capacity</span>
              <span className="font-bold text-purple-950">{deal.beds} Beds</span>
            </div>
          </div>

          {/* Payment Date with Modern Calendar (Clean single picker) */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
            <label className="text-xs font-bold text-purple-900 block mb-1.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Payment Date (Received)*</span>
              </div>
            </label>

            <div className="flex items-center gap-2">
              <ModernCalendarPicker
                selectedDate={paymentDateISO}
                onChange={(ddmmyyyy, iso) => {
                  setPaymentDateDDMMYYYY(ddmmyyyy);
                  setPaymentDateISO(iso);
                }}
                placeholder="Select Date"
              />
              <span className="text-[11px] text-slate-500">
                Tap to pick payment date
              </span>
            </div>
          </div>

          {/* Bed Count Edit & Auto-calc Section (User requested feature!) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/60 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-indigo-600" />
                <span>Capacity (Bed Count) &amp; Pricing</span>
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                Auto-syncs with Amount
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Editable Beds */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Bed Count (Editable):
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBedsChange(Math.max(1, (Number(bedsCount) || 0) - 5))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                    title="Decrease 5 beds"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={bedsCount}
                    onChange={(e) => handleBedsChange(e.target.value)}
                    placeholder="Beds"
                    className="w-full text-center px-2 py-1.5 rounded-xl bg-white border border-indigo-300 text-indigo-950 text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleBedsChange((Number(bedsCount) || 0) + 5)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                    title="Increase 5 beds"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rate Per Bed */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Rate / Bed (₹):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={ratePerBed}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="Rate (e.g. 25.50)"
                  className="w-full text-center px-2 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Amount Paid with Auto-calc */}
              <div>
                <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                  Amount Paid (₹)*:
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={paidAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Amount (e.g. 1520.50)"
                  className="w-full text-center px-2 py-1.5 rounded-xl bg-white border border-emerald-400 text-emerald-950 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            <p className="text-[10px] text-indigo-800 leading-tight">
              💡 <em>Changing the Amount automatically updates the Bed count, or you can manually adjust beds using +/- buttons.</em>
            </p>
          </div>

          {/* Plan & Payment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Plan Package*
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold cursor-pointer"
              >
                <option value="GOLD">GOLD PLAN (Yellow)</option>
                <option value="SILVER">SILVER PLAN (Silver)</option>
                <option value="BRONZE">BRONZE PLAN (Bronze)</option>
                <option value="GOLD - COMMERCIAL">GOLD - COMMERCIAL (Yellow + Blue)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Type (Sheet Matched)*
              </label>
              <select
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
              >
                {OFFICIAL_PAYMENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Renewal Duration / Cycle */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Renewal Duration / Plan Validity*</span>
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                {renewalMonths} Month{renewalMonths > 1 ? 's' : ''} Cycle
              </span>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleDurationChange(m)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    renewalMonths === m
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  {m === 1 ? '1 Month' : m === 12 ? '1 Year' : `${m} Months`}
                </button>
              ))}
            </div>
          </div>

          {/* Next Renewal Schedule Preview (Auto-calculated) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Next Renewal Schedule (Auto Generated)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">Next Due Date:</span>
                <span className="font-bold text-purple-900 font-mono text-sm block">
                  {nextDueDisplay}
                </span>
                <span className="text-[10px] text-purple-600">({nextMonthDisplay})</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Est. Next Deal Amount:</span>
                <span className="font-bold text-emerald-800 font-mono text-sm block">
                  {formatINR(estimatedNextAmount)}
                </span>
                <span className="text-[10px] text-emerald-600">Based on {bedsCount} Beds</span>
              </div>
            </div>

            <p className="text-[10px] text-purple-800 pt-1 border-t border-purple-200/60 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-purple-600 shrink-0" />
              <span>Historical record for past month remains intact. New ticket generated for next cycle.</span>
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Remarks / Payment Note:
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paid via GPay / UPI, renewed with 80 beds"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm &amp; Schedule Next ({nextDueDisplay})</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
