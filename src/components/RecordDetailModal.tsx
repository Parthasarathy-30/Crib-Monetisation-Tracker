import React from 'react';
import { HostelRecord } from '../data/types';
import { formatINR, formatDisplayDate } from '../utils/formatters';
import { 
  X, 
  Building2, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Edit3, 
  CreditCard 
} from 'lucide-react';
import { PlanBadge } from '../utils/planHelper';

interface RecordDetailModalProps {
  record: HostelRecord | null;
  onClose: () => void;
  onEdit: (record: HostelRecord) => void;
  onToggleStatus?: (recordId: string, status: 'PAID' | 'UNPAID' | 'YET_TO_PAY') => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onEdit,
}) => {
  if (!record) return null;

  const status = record.status || (record.isPaid ? 'PAID' : 'UNPAID');
  const isPaid = status === 'PAID';
  const isYetToPay = status === 'YET_TO_PAY';
  const amountVal = record.total || record.amount || 0;

  const handleWhatsApp = () => {
    if (!record.contact) return;
    const cleanNumber = record.contact.replace(/\D/g, '');
    const phone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const amountStr = formatINR(amountVal);
    const dueDateStr = formatDisplayDate(record.nextPayMonth || record.renewalMonth);

    const msg = `Hello ${record.operatorName || 'Partner'},

Greetings from Crib! Regarding your property *${record.pgName}* (${record.beds} Beds, ${record.plan} Plan).
• Total Renewal Amount: ${amountStr}
• Renewal Due Date: ${dueDateStr}
• Status: ${isPaid ? 'Paid' : isYetToPay ? 'Upcoming Due' : 'Pending Due'}

Please let us know if you need any assistance with invoice or renewal details.
Thank you,
Crib Operations Team`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog with decoupled non-overlapping footer */}
      <div className="relative bg-white border border-purple-100 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden">
        
        {/* Modal Header (Fixed at top) */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-purple-100 bg-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  #{record.sNo}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isPaid 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : isYetToPay
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}>
                  {isPaid ? '🟢 PAID' : isYetToPay ? '🔵 YET TO BE PAID' : '🔴 UNPAID / OVERDUE'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[240px] sm:max-w-xs mt-0.5">
                {record.pgName}
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

        {/* Modal Body (Scrollable independently, pb-6 so bottom items are never obscured) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Key Deal Highlights: Per Bed Cost, Plan, Total Amount */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-100">
              <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
                Total Deal Amount
              </span>
              <span className="text-xl font-bold font-mono text-purple-950 mt-0.5 block">
                {formatINR(amountVal)}
              </span>
              <span className="text-[10px] text-purple-600 font-medium">Incl. 18% GST</span>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                Per Bed Cost
              </span>
              <span className="text-xl font-bold font-mono text-amber-950 mt-0.5 block flex items-center gap-1">
                <span>{formatINR(record.ratePerBed)}</span>
                <span className="text-xs text-amber-700 font-normal">/bed</span>
              </span>
              <span className="text-[10px] text-amber-700 font-medium">{record.beds} Total Beds</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Subscription Plan
              </span>
              <div className="mt-0.5">
                <PlanBadge plan={record.plan} />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">{record.months} Months Billing</span>
            </div>
          </div>

          {/* Critical Dates: Payment Date & Renewal Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                <span>Payment Date</span>
              </span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {formatDisplayDate(record.paymentDate || record.paymentMonth)}
              </span>
            </div>

            <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-200">
              <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Renewal Due Date</span>
              </span>
              <span className="text-base font-bold text-purple-950 mt-1 block">
                {formatDisplayDate(record.nextPayMonth || record.renewalMonth)}
              </span>
              <span className="text-[10px] text-purple-600">Cycle: {record.renewalMonth}</span>
            </div>
          </div>

          {/* Operator and Contact Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Operator & Contact
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{record.operatorName || 'Not Provided'}</h4>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{record.contact || 'No phone number'}</span>
                </p>
              </div>

              {record.contact && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleWhatsApp}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <a
                    href={`tel:${record.contact}`}
                    className="p-2 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Location and Contract Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Location & Operations SPOC
            </span>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Location / Area</span>
                <span className="font-semibold text-slate-900">{record.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">City</span>
                <span className="font-semibold text-purple-700">{record.city || 'Chennai'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Payment Type</span>
                <span className="font-semibold text-slate-900">{record.paymentType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sales SPOC</span>
                <span className="font-semibold text-slate-900">{record.spoc}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {record.remarks && (
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
              <strong className="font-bold">Remarks:</strong> {record.remarks}
            </div>
          )}

        </div>

        {/* Modal Actions Footer: Solid opaque background, clear separation, completely fixes overlap on scroll! */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {record.contact && (
              <button
                onClick={handleWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span> WhatsApp
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shadow-purple-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Deal</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
