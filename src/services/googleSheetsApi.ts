import { HostelRecord } from '../data/types';
import { detectCity } from '../utils/cityHelper';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMetadata {
  title: string;
  sheets: SheetTabInfo[];
}

/**
 * Extracts spreadsheet ID from any Google Sheets URL or raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const clean = input.trim();
  const match = clean.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) {
    return clean;
  }
  return clean;
}

/**
 * List Google Spreadsheets from user's Google Drive.
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=files(id,name,modifiedTime)`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google Drive API error (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime
  }));
}

/**
 * Fetch spreadsheet metadata including tab names.
 */
export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties(sheetId,title)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to fetch sheet info (${res.status})`);
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId || 0,
    title: s.properties?.title || 'Sheet1'
  }));

  return {
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets
  };
}

/**
 * Read all cell values from a sheet tab.
 */
export async function readSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<any[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const safeRange = encodeURIComponent(`'${sheetTitle}'!A1:AZ4000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${safeRange}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to read sheet cells (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Append a newly confirmed deal or renewal to the Google Sheet.
 */
export async function appendDealToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  record: HostelRecord
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const safeRange = encodeURIComponent(`'${sheetTitle}'!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${safeRange}:append?valueInputOption=USER_ENTERED`;

  const rowValues = [
    record.sNo || '',
    record.pgName || '',
    record.paymentType || 'RENEWAL PAY',
    record.paymentMode || 'Online',
    record.contact || '',
    record.location || '',
    record.operatorName || '',
    record.beds || '',
    record.spoc || '',
    record.ratePerBed || '',
    record.discount || '',
    record.plan || '',
    record.months || '',
    record.amount || '',
    record.gst || '',
    record.total || '',
    record.paymentMonth || '',
    record.paymentDate || '',
    record.planStartMonth || '',
    record.mrrMonth || '',
    record.nextPayMonth || '',
    record.renewalMonth || '',
    record.monthWise || '',
    record.qWise || '',
    record.invoice || '',
    record.incentives || '',
    record.remarks || '',
    record.mrr || '',
    record.mrrAmount || '',
    record.isPaid ? 'PAID' : 'UNPAID'
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to append deal to Google Sheet (${res.status})`);
  }
}

/**
 * Converts raw 2D row array from Google Sheets API into typed HostelRecord[].
 */
export function convertSheetRowsToRecords(rows: any[][]): HostelRecord[] {
  if (!rows || rows.length < 2) return [];

  // Normalize header strings
  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  const getColIdx = (keywords: string[]): number => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const sNoIdx = getColIdx(['s.no', 'sno', 'sl no', 'serial']);
  const pgNameIdx = getColIdx(['pg name', 'hostel', 'property name', 'pg']);
  const paymentTypeIdx = getColIdx(['payment type', 'pay type']);
  const paymentModeIdx = getColIdx(['payment mode', 'mode of pay', 'mode']);
  const contactIdx = getColIdx(['contact', 'phone', 'mobile']);
  const locationIdx = getColIdx(['location', 'area', 'address']);
  const operatorIdx = getColIdx(['operator', 'owner', 'manager']);
  const bedsIdx = getColIdx(['beds', 'bed count', 'no of beds']);
  const spocIdx = getColIdx(['spoc', 'sales person', 'sales rep', 'assigned']);
  const rateIdx = getColIdx(['rate per bed', 'rate/bed', 'rate']);
  const discountIdx = getColIdx(['discount']);
  const planIdx = getColIdx(['plan', 'package', 'tier']);
  const monthsIdx = getColIdx(['months', 'period', 'duration']);
  const amountIdx = getColIdx(['amount', 'subtotal', 'deal value']);
  const gstIdx = getColIdx(['gst', 'tax']);
  const totalIdx = getColIdx(['total', 'net total', 'grand total', 'collected']);
  const paymentMonthIdx = getColIdx(['payment month', 'pay month']);
  const paymentDateIdx = getColIdx(['payment date', 'paid date', 'pay date']);
  const nextPayMonthIdx = getColIdx(['next pay', 'next payment', 'renewal due']);
  const renewalMonthIdx = getColIdx(['renewal month', 'renewal date', 'next renewal']);
  const invoiceIdx = getColIdx(['invoice', 'bill no']);
  const incentivesIdx = headers.length > 25 ? 25 : getColIdx(['incentive', 'incentives', 'comm']);
  const remarksIdx = getColIdx(['remarks', 'notes', 'comment']);
  const statusIdx = getColIdx(['status', 'deal status', 'paid/unpaid']);

  const parseNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const records: HostelRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const pgName = String(row[pgNameIdx >= 0 ? pgNameIdx : 1] || '').trim();
    if (!pgName) continue; // Skip blank rows

    const sNo = sNoIdx >= 0 ? parseNum(row[sNoIdx]) || i : i;
    const paymentType = paymentTypeIdx >= 0 ? String(row[paymentTypeIdx] || '').trim() : 'RENEWAL PAY';
    const paymentMode = paymentModeIdx >= 0 ? String(row[paymentModeIdx] || '').trim() : 'Online';
    const contact = contactIdx >= 0 ? String(row[contactIdx] || '').trim() : '';
    const location = locationIdx >= 0 ? String(row[locationIdx] || '').trim() : '';
    const operatorName = operatorIdx >= 0 ? String(row[operatorIdx] || '').trim() : '';
    const beds = bedsIdx >= 0 ? parseNum(row[bedsIdx]) : 0;
    const spoc = spocIdx >= 0 ? String(row[spocIdx] || '').trim() : 'Direct';
    const ratePerBed = rateIdx >= 0 ? parseNum(row[rateIdx]) : 25;
    const discount = discountIdx >= 0 ? String(row[discountIdx] || '0').trim() : '0';
    const plan = planIdx >= 0 ? String(row[planIdx] || 'GOLD').trim() : 'GOLD';
    const months = monthsIdx >= 0 ? parseNum(row[monthsIdx]) || 1 : 1;
    const amount = amountIdx >= 0 ? parseNum(row[amountIdx]) : 0;
    const gst = gstIdx >= 0 ? parseNum(row[gstIdx]) : 0;
    const total = totalIdx >= 0 ? parseNum(row[totalIdx]) : (amount + gst);
    const paymentMonth = paymentMonthIdx >= 0 ? String(row[paymentMonthIdx] || '').trim() : '';
    const paymentDate = paymentDateIdx >= 0 ? String(row[paymentDateIdx] || '').trim() : '';
    const nextPayMonth = nextPayMonthIdx >= 0 ? String(row[nextPayMonthIdx] || '').trim() : '';
    const renewalMonth = renewalMonthIdx >= 0 ? String(row[renewalMonthIdx] || '').trim() : (nextPayMonth || 'October 2026');
    const invoice = invoiceIdx >= 0 ? String(row[invoiceIdx] || '').trim() : '';
    const incentives = incentivesIdx >= 0 ? parseNum(row[incentivesIdx]) : 0;
    const remarks = remarksIdx >= 0 ? String(row[remarksIdx] || '').trim() : '';
    
    // Status check
    const rawStatus = statusIdx >= 0 ? String(row[statusIdx] || '').toUpperCase().trim() : '';
    let isPaid = true;
    let status: 'PAID' | 'UNPAID' | 'YET_TO_PAY' = 'PAID';
    
    if (rawStatus.includes('UNPAID') || rawStatus.includes('PENDING') || rawStatus.includes('DUE')) {
      isPaid = false;
      status = 'UNPAID';
    } else if (rawStatus.includes('YET') || rawStatus.includes('FUTURE')) {
      isPaid = false;
      status = 'YET_TO_PAY';
    }

    const city = detectCity(location, pgName);

    records.push({
      id: `sheet_row_${sNo}_${Date.now()}_${i}`,
      sNo,
      pgName,
      paymentType,
      paymentMode,
      contact,
      location,
      city,
      operatorName,
      beds,
      spoc,
      ratePerBed,
      discount,
      plan,
      months,
      amount,
      gst,
      total,
      paymentMonth,
      paymentDate,
      planStartMonth: '',
      mrrMonth: '',
      nextPayMonth,
      renewalMonth,
      monthWise: '',
      qWise: '',
      invoice,
      incentives,
      remarks,
      mrr: 0,
      mrrAmount: 0,
      cribCode: '',
      isPaid,
      status
    });
  }

  return records;
}
