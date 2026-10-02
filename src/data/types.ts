export interface HostelRecord {
  id: string;
  sNo: number;
  pgName: string;
  paymentType: string;
  paymentMode: string;
  contact: string;
  location: string;
  city?: string; // Chennai, Coimbatore, Bangalore, Kerala, etc.
  operatorName: string;
  beds: number;
  spoc: string;
  ratePerBed: number;
  discount: string;
  plan: string;
  months: number;
  amount: number;
  gst: number;
  total: number;
  paymentMonth: string;
  paymentDate: string;
  planStartMonth: string;
  mrrMonth: string;
  nextPayMonth: string; // The Renewal Due Date (e.g. 1-Oct-2026)
  renewalMonth: string; // Renewal Month (e.g. October 2026)
  monthWise: string;
  qWise: string;
  invoice: string;
  incentives: number; // Column Z: Incentives amount from Google Sheet
  remarks: string;
  mrr: number;
  mrrAmount: number;
  cribCode: string;
  // Sheet-matched status: PAID (Green), UNPAID (Red), YET_TO_PAY (Blue)
  status?: 'PAID' | 'UNPAID' | 'YET_TO_PAY';
  isPaid?: boolean;
}

export type ViewTab = 'renewals' | 'mrr' | 'cities' | 'ledger' | 'sheetsync' | 'incentives';

export interface SheetSyncConfig {
  webhookUrl: string;
  sheetCsvUrl: string;
  lastSyncedAt?: string;
  autoSync: boolean;
}
