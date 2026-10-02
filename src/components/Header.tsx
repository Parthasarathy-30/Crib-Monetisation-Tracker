import React from 'react';
import { ViewTab } from '../data/types';
import { 
  CalendarClock, 
  TrendingUp, 
  Building2, 
  TableProperties, 
  Plus, 
  RotateCcw,
  FileSpreadsheet,
  Coins
} from 'lucide-react';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onNewRecord: () => void;
  onResetData: () => void;
  totalRecordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onNewRecord,
  onResetData,
  totalRecordsCount
}) => {
  const navTabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'renewals', label: 'Renewals', icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'mrr', label: 'First Pay MRR', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'cities', label: 'Cities & Locations', icon: <Building2 className="w-4 h-4" /> },
    { id: 'ledger', label: 'All Deals', icon: <TableProperties className="w-4 h-4" /> },
    { id: 'incentives', label: 'Incentives', icon: <Coins className="w-4 h-4 text-amber-500" /> },
    { id: 'sheetsync', label: 'Sheet Sync', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs">
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main App Bar */}
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-purple-200">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                  Crib Monetize
                </span>
                <span className="text-[10px] font-mono font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200">
                  {totalRecordsCount} Deals
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Hostel Monetization & Renewal Management
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            {navTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onResetData}
              title="Reset corrupted records back to official 669 initial records"
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-xs hidden sm:flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Data</span>
            </button>

            <button
              onClick={onNewRecord}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-200 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>New Deal</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Strip (Clean horizontal scrolling) */}
        <div className="flex lg:hidden items-center gap-1 py-2 overflow-x-auto no-scrollbar border-t border-slate-100">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
