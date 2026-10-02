export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Number(val);
  const hasDecimals = Math.abs(num % 1) > 0.001;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const num = Number(val);
  const hasDecimals = Math.abs(num % 1) > 0.001;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

const monthNamesMap: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseFlexibleDate(dateStr: string): { day: number; month: number; year: number; ymd: string } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();

  // 1. Check standard ISO YYYY-MM-DD FIRST!
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, month, year, ymd };
    }
  }

  // 2. Check "1 October 2026" or "14 October 2026"
  const spaceParts = clean.split(/\s+/);
  if (spaceParts.length === 3) {
    const day = parseInt(spaceParts[0], 10);
    const mStr = spaceParts[1].toLowerCase();
    const month = monthNamesMap[mStr] || monthNamesMap[mStr.slice(0, 3)];
    const year = parseInt(spaceParts[2], 10);
    if (!isNaN(day) && month && !isNaN(year)) {
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, month, year, ymd };
    }
  }

  // 3. Check "1-Oct-2026" or "14-Oct-2026" or "25-Sep-2025" or "1/10/2026"
  const dashParts = clean.split(/[-/]/);
  if (dashParts.length === 3) {
    const firstNum = parseInt(dashParts[0], 10);
    const mStr = dashParts[1].toLowerCase();
    let month = monthNamesMap[mStr] || monthNamesMap[mStr.slice(0, 3)];
    if (!month && !isNaN(parseInt(mStr, 10))) {
      month = parseInt(mStr, 10);
    }
    let year = parseInt(dashParts[2], 10);
    if (year < 100) year += 2000;

    if (!isNaN(firstNum) && month && !isNaN(year)) {
      const day = firstNum;
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, month, year, ymd };
    }
  }

  return null;
}

export function isDateMatching(recordDateStr: string, filterDateStr: string): boolean {
  if (!filterDateStr) return true;
  const parsedRec = parseFlexibleDate(recordDateStr);
  const parsedFilter = parseFlexibleDate(filterDateStr);

  if (!parsedRec || !parsedFilter) {
    return recordDateStr.toLowerCase().includes(filterDateStr.toLowerCase());
  }

  return parsedRec.ymd === parsedFilter.ymd;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) return dateStr;
  const dayStr = String(parsed.day).padStart(2, '0');
  const monthNumStr = String(parsed.month).padStart(2, '0');
  return `${dayStr}-${monthNumStr}-${parsed.year}`;
}

export function formatDisplayDateWord(dateStr: string): string {
  if (!dateStr) return '—';
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) return dateStr;
  const dayStr = String(parsed.day).padStart(2, '0');
  const monthStr = shortMonthNames[parsed.month - 1] || String(parsed.month);
  return `${dayStr}-${monthStr}-${parsed.year}`;
}
