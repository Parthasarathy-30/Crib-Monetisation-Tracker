// Helper to normalize month names for matching across variations like "Oct 2026", "October 2026", "Oct 26"
export function normalizeMonthYear(monthStr: string | undefined): { key: string; label: string; year: number; monthIndex: number } | null {
  if (!monthStr) return null;
  const str = monthStr.trim().toLowerCase();

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const fullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let matchedMonth = -1;
  for (let i = 0; i < months.length; i++) {
    if (str.includes(months[i])) {
      matchedMonth = i;
      break;
    }
  }

  if (matchedMonth === -1) return null;

  // Extract year (2023, 2024, 2025, 2026, 2027)
  const yrMatch = str.match(/\b(20\d{2}|\d{2})\b/);
  let year = 2026;
  if (yrMatch) {
    year = yrMatch[1].length === 2 ? 2000 + parseInt(yrMatch[1], 10) : parseInt(yrMatch[1], 10);
  }

  const key = `${year}-${String(matchedMonth + 1).padStart(2, '0')}`;
  const label = `${fullNames[matchedMonth]} ${year}`;

  return { key, label, year, monthIndex: matchedMonth };
}

// Extract City and Locality from location string
export function parseCityAndLocality(location: string = ''): { city: string; locality: string } {
  const norm = location.trim().toUpperCase();

  if (norm.includes('COIMBATORE')) {
    return { city: 'Coimbatore', locality: norm.replace('COIMBATORE', '').trim() || 'Coimbatore Central' };
  }
  if (norm.includes('KERALA')) {
    return { city: 'Kerala', locality: norm.replace('KERALA', '').trim() || 'Kerala' };
  }
  if (norm.includes('BANGLORE') || norm.includes('BANGALORE')) {
    return { city: 'Bangalore', locality: norm.replace(/BANGLORE|BANGALORE/, '').trim() || 'Bangalore' };
  }
  if (norm.includes('ERODE')) {
    return { city: 'Erode', locality: 'Erode' };
  }
  if (norm.includes('VELLORE')) {
    return { city: 'Vellore', locality: 'Vellore' };
  }
  if (norm.includes('KANCHIPURAM')) {
    return { city: 'Kanchipuram', locality: 'Kanchipuram' };
  }

  // Chennai Localities
  return { city: 'Chennai', locality: norm || 'Chennai' };
}
