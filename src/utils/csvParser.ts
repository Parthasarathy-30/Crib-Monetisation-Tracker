import { HostelRecord } from '../data/types';

export function parseCSV(csvText: string): HostelRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse CSV line handling quotes
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const records: HostelRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (!row || row.length < 5 || !row[1]) continue;

    // S NO,PG NAME,PAYMENT TYPE,PAYMEN MODE,CONTACT,LOCATION,OPERATOR NAME,BEDS ,SPOC,RATE PER BED (RS),DISCOUNTS,PLAN,MONTHS,AMOUNT,18% GST,TOTAL,PAYMENT MONTH,PAYMENT DATE ,PLAN START MONT,MRR MONTH,NEXT PAY MONTH,RENEWAL MONTH,MONTH WISE,Q WISE,INVOICE,INCENTIVES,REMARKS,MRR,MRR AMOUNT,CRIB CODE
    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/[₹,%\s"]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sNo = parseInt(row[0], 10) || i;
    const pgName = row[1] || '';
    const paymentType = (row[2] || '').trim().toUpperCase();
    const paymentMode = (row[3] || '').trim().toUpperCase();
    const contact = (row[4] || '').trim();
    const location = (row[5] || '').trim().toUpperCase();
    const operatorName = (row[6] || '').trim();
    const beds = parseNum(row[7]);
    const spoc = (row[8] || '').trim().toUpperCase();
    const ratePerBed = parseNum(row[9]);
    const discount = (row[10] || '').trim();
    const plan = (row[11] || '').trim().toUpperCase();
    const months = parseNum(row[12]) || 1;
    const amount = parseNum(row[13]);
    const gst = parseNum(row[14]);
    const total = parseNum(row[15]);
    const paymentMonth = (row[16] || '').trim();
    const paymentDate = (row[17] || '').trim();
    const planStartMonth = (row[18] || '').trim();
    const mrrMonth = (row[19] || '').trim();
    const nextPayMonth = (row[20] || '').trim();
    const renewalMonth = (row[21] || '').trim();
    const monthWise = (row[22] || '').trim();
    const qWise = (row[23] || '').trim();
    const invoice = (row[24] || '').trim();
    const incentives = parseNum(row[25]);
    const remarks = (row[26] || '').trim();
    const mrr = parseNum(row[27]) || (months > 0 && amount > 0 ? Math.round(amount / months) : 0);
    const mrrAmount = parseNum(row[28]) || mrr;
    const cribCode = (row[29] || '').trim();

    records.push({
      id: `rec-${sNo}-${i}-${Date.now().toString(36)}`,
      sNo,
      pgName,
      paymentType,
      paymentMode,
      contact,
      location,
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
      planStartMonth,
      mrrMonth,
      nextPayMonth,
      renewalMonth,
      monthWise,
      qWise,
      invoice,
      incentives,
      remarks,
      mrr,
      mrrAmount,
      cribCode,
    });
  }

  return records;
}

export function exportToCSV(records: HostelRecord[]): string {
  const headers = [
    'S NO', 'PG NAME', 'PAYMENT TYPE', 'PAYMEN MODE', 'CONTACT', 'LOCATION',
    'OPERATOR NAME', 'BEDS', 'SPOC', 'RATE PER BED (RS)', 'DISCOUNTS', 'PLAN',
    'MONTHS', 'AMOUNT', '18% GST', 'TOTAL', 'PAYMENT MONTH', 'PAYMENT DATE',
    'PLAN START MONT', 'MRR MONTH', 'NEXT PAY MONTH', 'RENEWAL MONTH',
    'MONTH WISE', 'Q WISE', 'INVOICE', 'INCENTIVES', 'REMARKS', 'MRR', 'MRR AMOUNT', 'CRIB CODE'
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = records.map(r => [
    r.sNo,
    escapeCSV(r.pgName),
    escapeCSV(r.paymentType),
    escapeCSV(r.paymentMode),
    escapeCSV(r.contact),
    escapeCSV(r.location),
    escapeCSV(r.operatorName),
    r.beds,
    escapeCSV(r.spoc),
    r.ratePerBed,
    escapeCSV(r.discount),
    escapeCSV(r.plan),
    r.months,
    r.amount,
    r.gst,
    r.total,
    escapeCSV(r.paymentMonth),
    escapeCSV(r.paymentDate),
    escapeCSV(r.planStartMonth),
    escapeCSV(r.mrrMonth),
    escapeCSV(r.nextPayMonth),
    escapeCSV(r.renewalMonth),
    escapeCSV(r.monthWise),
    escapeCSV(r.qWise),
    escapeCSV(r.invoice),
    r.incentives,
    escapeCSV(r.remarks),
    r.mrr,
    r.mrrAmount,
    escapeCSV(r.cribCode)
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
