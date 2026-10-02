import React from 'react';

export function formatPlanName(plan: string | undefined): string {
  if (!plan) return 'STANDARD PLAN';
  const clean = plan.trim().toUpperCase();
  if (clean.includes('COMMERCIAL')) {
    return 'GOLD - COMMERCIAL PLAN';
  }
  if (clean.includes('GOLD')) {
    return 'GOLD PLAN';
  }
  if (clean.includes('SILVER')) {
    return 'SILVER PLAN';
  }
  if (clean.includes('BRONZE')) {
    return 'BRONZE PLAN';
  }
  return `${clean} PLAN`;
}

export function getPlanBadgeClass(plan: string | undefined): string {
  const p = (plan || '').toUpperCase().trim();
  if (p.includes('COMMERCIAL')) {
    // Yellow merged with Blue
    return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-sky-500 text-slate-950 border border-sky-400 font-extrabold shadow-xs';
  }
  if (p.includes('GOLD')) {
    // Pure Gold / Yellow
    return 'bg-amber-400 text-amber-950 border border-amber-500 font-extrabold shadow-xs';
  }
  if (p.includes('SILVER')) {
    // Silver Metallic
    return 'bg-slate-200 text-slate-800 border border-slate-300 font-extrabold shadow-xs';
  }
  if (p.includes('BRONZE')) {
    // Bronze Metallic / Copper
    return 'bg-orange-800 text-amber-100 border border-orange-950 font-extrabold shadow-xs';
  }
  return 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold shadow-xs';
}

export interface PlanBadgeProps {
  plan: string | undefined;
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, className = '' }) => {
  const name = formatPlanName(plan);
  const badgeClass = getPlanBadgeClass(plan);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] tracking-wide uppercase ${badgeClass} ${className}`}>
      {name}
    </span>
  );
};
