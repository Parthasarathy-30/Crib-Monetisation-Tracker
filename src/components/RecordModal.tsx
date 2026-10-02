import React, { useState, useEffect } from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, parseFlexibleDate, formatDisplayDate } from '../utils/formatters';
import { X, Save, Calendar, MapPin, Sparkles, Bed } from 'lucide-react';
import { detectCity } from '../utils/cityHelper';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: HostelRecord) => void;
  initialData?: HostelRecord | null;
  totalRecordsCount: number;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  totalRecordsCount
}) => {
  const [formData, setFormData] = useState<Partial<HostelRecord>>({
    pgName: '',
    paymentType: 'RENEWAL PAY',
    paymentMode: 'FULL PAYMENT',
    contact: '',
    location: '',
    city: 'Chennai',
    operatorName: '',
    beds: 100,
    spoc: 'PARTHA',
    ratePerBed: 25,
    discount: '0.00%',
    plan: 'SILVER',
    months: 3,
    amount: 7500,
    gst: 1350,
    total: 8850,
    paymentMonth: 'Oct 2026',
    paymentDate: '1-Oct-2026',
    planStartMonth: '1-Oct-2026',
    mrrMonth: 'Oct 26',
    nextPayMonth: '1 October 2026',
    renewalMonth: 'October 2026',
    monthWise: '',
    qWise: '',
    invoice: 'PDF',
    incentives: 375,
    remarks: '',
    mrr: 2500,
    mrrAmount: 2500,
    cribCode: '',
    status: 'UNPAID',
    isPaid: false
  });

  // Helper to convert arbitrary date string to YYYY-MM-DD for <input type="date">
  const toISODate = (val: string | undefined): string => {
    if (!val) return '';
    const parsed = parseFlexibleDate(val);
    return parsed ? parsed.ymd : '';
  };

  const [dueDateISO, setDueDateISO] = useState<string>('');
  const [payDateISO, setPayDateISO] = useState<string>('');
  const [detectedCityBadge, setDetectedCityBadge] = useState<string>('Chennai');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setDueDateISO(toISODate(initialData.nextPayMonth || initialData.renewalMonth));
      setPayDateISO(toISODate(initialData.paymentDate || initialData.paymentMonth));
      const det = detectCity(initialData.location, initialData.pgName);
      setDetectedCityBadge(det);
    } else {
      const defaultDue = '2026-10-01';
      const defaultPay = '2026-10-01';
      setFormData({
        id: `rec-${totalRecordsCount + 1}-${Date.now().toString(36)}`,
        sNo: totalRecordsCount + 1,
        pgName: '',
        paymentType: 'RENEWAL PAY',
        paymentMode: 'FULL PAYMENT',
        contact: '',
        location: '',
        city: 'Chennai',
        operatorName: '',
        beds: 100,
        spoc: 'PARTHA',
        ratePerBed: 25,
        discount: '0.00%',
        plan: 'SILVER',
        months: 3,
        amount: 7500,
        gst: 1350,
        total: 8850,
        paymentMonth: 'Oct 2026',
        paymentDate: '1-Oct-2026',
        planStartMonth: '1-Oct-2026',
        mrrMonth: 'Oct 26',
        nextPayMonth: '1 October 2026',
        renewalMonth: 'October 2026',
        monthWise: '',
        qWise: '',
        invoice: 'PDF',
        incentives: 375,
        remarks: '',
        mrr: 2500,
        mrrAmount: 2500,
        cribCode: '',
        status: 'UNPAID',
        isPaid: false
      });
      setDueDateISO(defaultDue);
      setPayDateISO(defaultPay);
      setDetectedCityBadge('Chennai');
    }
  }, [initialData, totalRecordsCount, isOpen]);

  if (!isOpen) return null;

  // Auto calculate total, GST, amount, and MRR
  const handleRecalculate = (
    beds: number | string,
    rate: number | string,
    months: number | string,
    discountStr: string
  ) => {
    const numBeds = beds === '' ? 0 : parseFloat(String(beds)) || 0;
    const numRate = rate === '' ? 0 : parseFloat(String(rate)) || 0;
    const numMonths = months === '' ? 1 : parseFloat(String(months)) || 1;
    const discNum = parseFloat(String(discountStr).replace('%', '')) || 0;
    const rawBase = numBeds * numRate * numMonths;
    const discountedAmount = Number((rawBase * (1 - discNum / 100)).toFixed(2));
    const gstVal = Number((discountedAmount * 0.18).toFixed(2));
    const totalVal = Number((discountedAmount + gstVal).toFixed(2));
    const mrrVal = numMonths > 0 ? Number((discountedAmount / numMonths).toFixed(2)) : discountedAmount;

    setFormData(prev => ({
      ...prev,
      beds: beds as any,
      ratePerBed: rate as any,
      months: numMonths,
      discount: discountStr,
      amount: discountedAmount,
      gst: gstVal,
      total: totalVal,
      mrr: mrrVal,
      mrrAmount: mrrVal
    }));
  };

  // Location change with Real-time City Auto-Detection
  const handleLocationChange = (loc: string) => {
    const autoCity = detectCity(loc, formData.pgName || '');
    setDetectedCityBadge(autoCity);
    setFormData(prev => ({
      ...prev,
      location: loc,
      city: autoCity
    }));
  };

  // Due Date change: Automatically updates NextPayMonth & RenewalMonth (Date, Month, Year)
  const handleDueDateChange = (isoVal: string) => {
    setDueDateISO(isoVal);
    if (!isoVal) return;
    const [y, m, d] = isoVal.split('-').map(Number);
    if (y && m && d) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const mName = monthNames[m - 1] || 'October';
      const formattedDue = `${d} ${mName} ${y}`; // e.g. "1 October 2026"
      const formattedRenewalMonth = `${mName} ${y}`; // e.g. "October 2026"

      setFormData(prev => ({
        ...prev,
        nextPayMonth: formattedDue,
        renewalMonth: formattedRenewalMonth
      }));
    }
  };

  // Payment Date change:
  const handlePaymentDateChange = (isoVal: string) => {
    setPayDateISO(isoVal);
    if (!isoVal) return;
    const [y, m, d] = isoVal.split('-').map(Number);
    if (y && m && d) {
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mShort = monthShort[m - 1] || 'Oct';
      const formattedPay = `${d}-${mShort}-${y}`; // e.g. "1-Oct-2026"
      const payMonth = `${mShort} ${y}`;

      setFormData(prev => ({
        ...prev,
        paymentDate: formattedPay,
        paymentMonth: payMonth
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pgName?.trim()) {
      alert('Please enter Property Name');
      return;
    }

    const city = formData.city || detectCity(formData.location, formData.pgName);
    const finalStatus = formData.status || (formData.isPaid ? 'PAID' : 'UNPAID');

    const recordToSave: HostelRecord = {
      id: formData.id || `rec-${Date.now()}`,
      sNo: formData.sNo || totalRecordsCount + 1,
      pgName: formData.pgName.trim(),
      paymentType: formData.paymentType || 'RENEWAL PAY',
      paymentMode: formData.paymentMode || 'FULL PAYMENT',
      contact: formData.contact || '',
      location: formData.location || '',
      city: city,
      operatorName: formData.operatorName || '',
      beds: Number(formData.beds) || 0,
      spoc: formData.spoc || 'PARTHA',
      ratePerBed: Number(formData.ratePerBed) || 0,
      discount: formData.discount || '0%',
      plan: formData.plan || 'SILVER',
      months: Number(formData.months) || 1,
      amount: Number(formData.amount) || 0,
      gst: Number(formData.gst) || 0,
      total: Number(formData.total) || 0,
      paymentMonth: formData.paymentMonth || '',
      paymentDate: formData.paymentDate || '',
      planStartMonth: formData.planStartMonth || '',
      mrrMonth: formData.mrrMonth || '',
      nextPayMonth: formData.nextPayMonth || '',
      renewalMonth: formData.renewalMonth || '',
      monthWise: formData.monthWise || '',
      qWise: formData.qWise || '',
      invoice: formData.invoice || 'PDF',
      incentives: Number(formData.incentives) || 0,
      remarks: formData.remarks || '',
      mrr: Number(formData.mrr) || 0,
      mrrAmount: Number(formData.mrrAmount) || 0,
      cribCode: formData.cribCode || '',
      status: finalStatus,
      isPaid: finalStatus === 'PAID'
    };

    onSave(recordToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white border border-purple-100 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl z-10 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-100 bg-purple-50/50 sticky top-0 z-20 backdrop-blur-md">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {initialData ? 'Edit Deal Information' : 'Add New Monetization Deal'}
            </h3>
            <p className="text-xs text-slate-500">
              Property Subscription & Monetization Record
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          
          {/* Section 1: Property Info & City Auto-detection */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                1. Property & Location Details
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Auto-detected City: <strong>{detectedCityBadge}</strong></span>
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Property Name (PG)*
                </label>
                <input
                  type="text"
                  required
                  value={formData.pgName || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCity = detectCity(formData.location || '', name);
                    setDetectedCityBadge(autoCity);
                    setFormData({ ...formData, pgName: name, city: autoCity });
                  }}
                  placeholder="e.g. (M) SRI SAI MENS HOSTEL"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Location / Area*</span>
                  <span className="text-[10px] text-purple-600 font-normal">Type Bangalore / Kerala / Chennai</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.location || ''}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="e.g. Bangalore, Saravanampatti, Velachery, Kerala"
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Identified City*
                </label>
                <select
                  value={formData.city || detectedCityBadge}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-purple-50/60 border border-purple-200 text-purple-900 font-bold text-xs focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Coimbatore">Coimbatore</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Vellore">Vellore</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Operator Name
                </label>
                <input
                  type="text"
                  value={formData.operatorName || ''}
                  onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                  placeholder="e.g. RAJESH KUMAR"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.contact || ''}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Bed Plan */}
          <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-2.5">
              2. Plan, Beds & Per-Bed Cost
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Plan Tier
                </label>
                <select
                  value={formData.plan || 'SILVER'}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-bold"
                >
                  <option value="SILVER">SILVER</option>
                  <option value="GOLD">GOLD</option>
                  <option value="BRONZE">BRONZE</option>
                  <option value="GOLD - COMMERCIAL">GOLD - COMMERCIAL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Total Beds
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.beds !== undefined && formData.beds !== null ? formData.beds : ''}
                  onChange={(e) => handleRecalculate(
                    e.target.value,
                    formData.ratePerBed ?? '',
                    formData.months || 1,
                    formData.discount || '0%'
                  )}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Per Bed Cost (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.ratePerBed !== undefined && formData.ratePerBed !== null ? formData.ratePerBed : ''}
                  onChange={(e) => handleRecalculate(
                    formData.beds ?? '',
                    e.target.value,
                    formData.months || 1,
                    formData.discount || '0%'
                  )}
                  placeholder="e.g. 25.50"
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Billing Period
                </label>
                <select
                  value={formData.months || 1}
                  onChange={(e) => handleRecalculate(
                    formData.beds ?? '',
                    formData.ratePerBed ?? '',
                    Number(e.target.value),
                    formData.discount || '0%'
                  )}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-bold cursor-pointer"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>
            </div>

            {/* Calculated Values */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-100 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Base Amount</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {formatINR(formData.amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">18% GST</span>
                <span className="text-sm font-bold font-mono text-slate-700">
                  {formatINR(formData.gst)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-700 font-bold block">Total Deal Amount</span>
                <span className="text-base font-bold font-mono text-purple-950">
                  {formatINR(formData.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Due Date (Date, Month, Year), Payment Date & Status */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-2.5">
              3. Due Date, Payment Date & Sales Rep
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* RENEWAL DUE DATE (Date, Month, Year) */}
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200">
                <label className="text-xs font-bold text-purple-900 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Renewal Due Date (Date, Month, Year)*</span>
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDateISO}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-purple-700 font-medium">
                  <span><strong>{formatDisplayDate(formData.nextPayMonth || '')}</strong></span>
                  <span>Month: <strong>{formData.renewalMonth}</strong></span>
                </div>
              </div>

              {/* PAYMENT DATE (Date, Month, Year) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Date (Date, Month, Year)*</span>
                  </span>
                </label>
                <input
                  type="date"
                  value={payDateISO}
                  onChange={(e) => handlePaymentDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-1 text-[11px] text-slate-600 font-medium">
                  <strong>{formatDisplayDate(formData.paymentDate || '')}</strong>
                </div>
              </div>

              {/* Sales Rep (SPOC) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sales Rep (SPOC)*
                </label>
                <select
                  value={formData.spoc || 'PARTHA'}
                  onChange={(e) => setFormData({ ...formData, spoc: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold"
                >
                  <option value="PARTHA">PARTHA</option>
                  <option value="SANJAY">SANJAY</option>
                  <option value="SANTHOSH">SANTHOSH</option>
                  <option value="PRAVEEN">PRAVEEN</option>
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Type (Sheet Matched)*
                </label>
                <select
                  value={formData.paymentType || 'RENEWAL PAY'}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  <option value="FIRST PAY">FIRST PAY (New Onboarding MRR)</option>
                  <option value="RENEWAL PAY">RENEWAL PAY (Monthly Renewal)</option>
                  <option value="ONE TIME">ONE TIME</option>
                  <option value="PART 02">PART 02</option>
                  <option value="PART 03">PART 03</option>
                  <option value="PART 04">PART 04</option>
                  <option value="PART 05">PART 05</option>
                  <option value="BED TOP UP">BED TOP UP</option>
                  <option value="PART 06">PART 06</option>
                </select>
              </div>

              {/* Payment Status (Sheet color matched: Green = Paid, Red = Unpaid, Blue = Yet to be Paid) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Status (Sheet Matched)*
                </label>
                <select
                  value={formData.status || (formData.isPaid ? 'PAID' : 'UNPAID')}
                  onChange={(e) => {
                    const st = e.target.value as 'PAID' | 'UNPAID' | 'YET_TO_PAY';
                    setFormData({ ...formData, status: st, isPaid: st === 'PAID' });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold"
                >
                  <option value="PAID">🟢 PAID (Green)</option>
                  <option value="UNPAID">🔴 UNPAID / OVERDUE (Dark Red)</option>
                  <option value="YET_TO_PAY">🔵 YET TO BE PAID (Blue / Future)</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Invoice sent, awaiting confirmation"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium"
                />
              </div>

            </div>
          </div>

          {/* Footer Save */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-200 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Deal</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
