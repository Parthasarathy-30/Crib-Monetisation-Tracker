import { HostelRecord, SheetSyncConfig } from './types';
import rawRecords from './initialRecords.json';
import { detectCity } from '../utils/cityHelper';

export const enrichedInitialRecords: HostelRecord[] = (rawRecords as HostelRecord[]).map(r => {
  const city = detectCity(r.location, r.pgName);
  
  // Default status matching user's spreadsheet rules:
  // - October 2026 dues are active pending renewals (Light Red / Dark Red => UNPAID)
  // - Future months (Nov 2026 onwards) => YET_TO_PAY (Blue)
  // - Past months (before Oct 2026) => PAID (Green) unless marked unpaid
  let defaultStatus: 'PAID' | 'UNPAID' | 'YET_TO_PAY' = 'PAID';
  const rm = (r.renewalMonth || '').toLowerCase();
  
  if (rm.includes('october 2026') || rm.includes('oct 2026')) {
    defaultStatus = 'UNPAID';
  } else if (
    rm.includes('november 2026') || 
    rm.includes('december 2026') || 
    rm.includes('2027')
  ) {
    defaultStatus = 'YET_TO_PAY';
  }

  return {
    ...r,
    city,
    status: r.status || defaultStatus,
    isPaid: r.status ? r.status === 'PAID' : (defaultStatus === 'PAID'),
  };
});

export const initialRecords: HostelRecord[] = enrichedInitialRecords;

export const STORAGE_KEY = 'crib_hostel_monetization_records_v4';
export const SYNC_CONFIG_KEY = 'crib_hostel_sheet_sync_config';

export function getStoredRecords(): HostelRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r: HostelRecord) => ({
          ...r,
          city: r.city && r.city !== 'Chennai' ? r.city : detectCity(r.location, r.pgName),
          status: r.status || (r.isPaid ? 'PAID' : 'UNPAID'),
          isPaid: r.status === 'PAID' || r.isPaid === true,
        }));
      }
    }
  } catch (err) {
    console.error('Error reading localStorage:', err);
  }
  return initialRecords;
}

export function saveStoredRecords(records: HostelRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export function getStoredSyncConfig(): SheetSyncConfig {
  try {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error reading sync config:', err);
  }
  return {
    webhookUrl: '',
    sheetCsvUrl: '',
    autoSync: false,
  };
}

export function saveStoredSyncConfig(config: SheetSyncConfig) {
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving sync config:', err);
  }
}

export const getSheetSyncConfig = getStoredSyncConfig;
export const saveSheetSyncConfig = saveStoredSyncConfig;
