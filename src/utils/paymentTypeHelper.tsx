import React from 'react';

export const OFFICIAL_PAYMENT_TYPES = [
  'FIRST PAY',
  'RENEWAL PAY',
  'ONE TIME',
  'PART 02',
  'PART 03',
  'PART 04',
  'PART 05',
  'BED TOP UP',
  'PART 06'
] as const;

export type OfficialPaymentType = typeof OFFICIAL_PAYMENT_TYPES[number];

export function getPaymentTypeStyles(type: string = ''): {
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
} {
  const norm = type.trim().toUpperCase();

  // 1. FIRST PAY: Soft Pastel Green
  if (norm.includes('FIRST')) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      badgeClass: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]'
    };
  }

  // 2. RENEWAL PAY: Light Blue / Sky
  if (norm.includes('RENEWAL')) {
    return {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      border: 'border-sky-300',
      badgeClass: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
    };
  }

  // 3. ONE TIME: Light Yellow / Amber
  if (norm.includes('ONE TIME') || norm.includes('ONETIME')) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      badgeClass: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
    };
  }

  // 4. PART 02: Soft Peach / Orange
  if (norm.includes('PART 02') || norm.includes('PART 2') || norm.includes('PART-02') || norm.includes('PART-2')) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      badgeClass: 'bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]'
    };
  }

  // 5. PART 03: Lavender / Purple
  if (norm.includes('PART 03') || norm.includes('PART 3') || norm.includes('PART-03') || norm.includes('PART-3')) {
    return {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
      badgeClass: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]'
    };
  }

  // 6. PART 04: Olive Green / Lime
  if (norm.includes('PART 04') || norm.includes('PART 4') || norm.includes('PART-04') || norm.includes('PART-4')) {
    return {
      bg: 'bg-lime-100',
      text: 'text-lime-900',
      border: 'border-lime-300',
      badgeClass: 'bg-[#ecfccb] text-[#3f6212] border-[#d9f99d]'
    };
  }

  // 7. PART 05: Deep Rose / Magenta
  if (norm.includes('PART 05') || norm.includes('PART 5') || norm.includes('PART-05') || norm.includes('PART-5')) {
    return {
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      border: 'border-rose-300',
      badgeClass: 'bg-[#ffe4e6] text-[#9f1239] border-[#fecdd3]'
    };
  }

  // 8. BED TOP UP: Deep Indigo / Violet
  if (norm.includes('TOP UP') || norm.includes('TOPUP') || norm.includes('BED TOP')) {
    return {
      bg: 'bg-indigo-700',
      text: 'text-white',
      border: 'border-indigo-800',
      badgeClass: 'bg-[#4338ca] text-white border-[#3730a3]'
    };
  }

  // 9. PART 06: Bright Pink
  if (norm.includes('PART 06') || norm.includes('PART 6') || norm.includes('PART-06') || norm.includes('PART-6')) {
    return {
      bg: 'bg-pink-100',
      text: 'text-pink-800',
      border: 'border-pink-300',
      badgeClass: 'bg-[#fce7f3] text-[#9d174d] border-[#fbcfe8]'
    };
  }

  // Default Fallback
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200'
  };
}

export const PaymentTypeBadge: React.FC<{ type?: string; paymentType?: string; className?: string }> = ({
  type,
  paymentType,
  className = ''
}) => {
  const actualType = type || paymentType || 'RENEWAL PAY';
  const styles = getPaymentTypeStyles(actualType);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border shadow-2xs ${styles.badgeClass} ${className}`}
    >
      {actualType}
    </span>
  );
};
