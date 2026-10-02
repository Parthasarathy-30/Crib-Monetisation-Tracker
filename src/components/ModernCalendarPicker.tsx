import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from 'lucide-react';
import { parseFlexibleDate } from '../utils/formatters';

interface ModernCalendarPickerProps {
  selectedDate: string; // Accepts ISO YYYY-MM-DD or DD-MM-YYYY or empty
  onChange: (formattedDDMMYYYY: string, isoYMD: string) => void;
  onClear?: () => void;
  dayDuesCounts?: Record<number, number>; // Map of day number -> count of deals due
  placeholder?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ModernCalendarPicker: React.FC<ModernCalendarPickerProps> = ({
  selectedDate,
  onChange,
  onClear,
  dayDuesCounts = {},
  placeholder = 'Select Date'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Initialize view year and month based on selected date or default Oct 2026
  const parsed = parseFlexibleDate(selectedDate);
  const [viewYear, setViewYear] = useState<number>(parsed?.year || 2026);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month || 10); // 1-indexed

  // Format display text as DD-MM-YYYY
  const displayLabel = parsed 
    ? `${String(parsed.day).padStart(2, '0')}-${String(parsed.month).padStart(2, '0')}-${parsed.year}`
    : '';

  const handlePrevMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSlideDirection('right');
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSlideDirection('left');
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Touch swipe support with page-turn transition
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped right -> go to previous month (page turns right)
        handlePrevMonth();
      } else {
        // Swiped left -> go to next month (page turns left)
        handleNextMonth();
      }
    }
    setTouchStartX(null);
  };

  // Generate calendar grid for current viewMonth & viewYear
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday

  const handleSelectDay = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(viewMonth).padStart(2, '0');
    const ddMMyyyy = `${dayStr}-${monthStr}-${viewYear}`;
    const isoYmd = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(ddMMyyyy, isoYmd);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    // Current system reference is Oct 1, 2026
    const todayDay = 1;
    const todayMonth = 10;
    const todayYear = 2026;
    const ddMMyyyy = `01-10-2026`;
    const isoYmd = `2026-10-01`;
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    onChange(ddMMyyyy, isoYmd);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 hover:border-purple-300 text-slate-800 text-xs font-semibold shadow-xs cursor-pointer transition-all select-none whitespace-nowrap"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span className={displayLabel ? 'font-bold text-slate-900 font-mono text-[11px] sm:text-xs' : 'text-slate-500 font-medium text-[11px] sm:text-xs'}>
          {displayLabel || placeholder}
        </span>
        {displayLabel && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors ml-0.5"
            title="Clear Date"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Modern Calendar Modal - Perfectly Centered in Viewport */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Calendar Card with Page Turn Slide Animation */}
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-[320px] max-w-[94vw] bg-white rounded-3xl shadow-2xl border border-purple-100 p-4.5 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            
            {/* Header: Month & Year with Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-purple-50 text-slate-600 hover:text-purple-700 active:scale-95 transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="font-bold text-base text-slate-900 block tracking-tight">
                  {MONTH_NAMES[viewMonth - 1]} {viewYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-purple-50 text-slate-600 hover:text-purple-700 active:scale-95 transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Days Matrix with Page-turn Slide Animation */}
            <div 
              key={`${viewYear}-${viewMonth}`}
              className={`transition-all duration-300 ease-out ${
                slideDirection === 'left'
                  ? 'animate-in slide-in-from-right-6 fade-in'
                  : slideDirection === 'right'
                  ? 'animate-in slide-in-from-left-6 fade-in'
                  : 'animate-in fade-in'
              }`}
            >
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Empty leading cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {/* Month Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = parsed && 
                    parsed.day === dayNum && 
                    parsed.month === viewMonth && 
                    parsed.year === viewYear;
                  
                  const duesCount = dayDuesCounts[dayNum] || 0;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white font-bold shadow-xs scale-105'
                          : duesCount > 0
                          ? 'bg-purple-50 text-purple-900 hover:bg-purple-100 font-bold border border-purple-200'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {duesCount > 0 && !isSelected && (
                        <span className="text-[8px] leading-none text-purple-700 font-mono">
                          {duesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Quick Actions */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[11px] font-bold text-purple-700 transition-colors cursor-pointer"
              >
                Today (01-10-2026)
              </button>

              {onClear && (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg hover:bg-rose-50 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
