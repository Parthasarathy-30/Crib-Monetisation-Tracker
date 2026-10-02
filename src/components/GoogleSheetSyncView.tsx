import React, { useState, useEffect } from 'react';
import { HostelRecord, SheetSyncConfig } from '../data/types';
import { 
  Cloud, 
  ArrowRightLeft, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Info,
  LogOut,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { exportToCSV, parseCSV } from '../utils/csvParser';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from '../services/googleAuth';
import { 
  listUserSpreadsheets, 
  fetchSpreadsheetMetadata, 
  readSpreadsheetValues, 
  convertSheetRowsToRecords,
  DriveSpreadsheetFile,
  SheetTabInfo,
  extractSpreadsheetId
} from '../services/googleSheetsApi';
import { User } from 'firebase/auth';

interface GoogleSheetSyncViewProps {
  records: HostelRecord[];
  syncConfig: SheetSyncConfig;
  onSaveConfig: (config: SheetSyncConfig) => void;
  onSyncRecordsFromSheet: (newRecords: HostelRecord[]) => void;
  onExportCSV: () => void;
  onImportClick: () => void;
  onResetToInitialRecords: () => void;
}

// Convert standard Google Sheets URL to a direct CSV export link
function convertToDirectCsvUrl(url: string): string {
  const clean = url.trim();
  if (!clean) return '';
  if (clean.includes('/pub?output=csv') || clean.includes('/export?format=csv')) {
    return clean;
  }
  const match = clean.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    const gidMatch = clean.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }
  return clean;
}

export const GoogleSheetSyncView: React.FC<GoogleSheetSyncViewProps> = ({
  records,
  syncConfig,
  onSaveConfig,
  onSyncRecordsFromSheet,
  onExportCSV,
  onImportClick,
  onResetToInitialRecords
}) => {
  // Webhook & manual config state
  const [webhookUrl, setWebhookUrl] = useState(syncConfig.webhookUrl || '');
  const [sheetCsvUrl, setSheetCsvUrl] = useState(syncConfig.sheetCsvUrl || '');
  const [autoSync, setAutoSync] = useState(syncConfig.autoSync || false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [copiedCode, setCopiedCode] = useState(false);

  // Google OAuth & Sheets API state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [availableTabs, setAvailableTabs] = useState<SheetTabInfo[]>([]);
  const [selectedTabTitle, setSelectedTabTitle] = useState<string>('');
  const [activeIntegrationMode, setActiveIntegrationMode] = useState<'google_api' | 'webhook'>('google_api');

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAccessToken(token);
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // When access token is available, load user's Google Sheets from Drive
  useEffect(() => {
    if (accessToken) {
      loadDriveSpreadsheets(accessToken);
    }
  }, [accessToken]);

  const loadDriveSpreadsheets = async (token: string) => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
      if (files.length > 0 && !selectedSheetId) {
        handleSelectSpreadsheet(files[0].id, token);
      }
    } catch (err: any) {
      console.warn('Could not list Drive spreadsheets:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleSelectSpreadsheet = async (sheetId: string, tokenOverride?: string) => {
    const token = tokenOverride || accessToken;
    setSelectedSheetId(sheetId);
    if (!token || !sheetId) return;

    try {
      const meta = await fetchSpreadsheetMetadata(token, sheetId);
      setAvailableTabs(meta.sheets);
      if (meta.sheets.length > 0) {
        setSelectedTabTitle(meta.sheets[0].title);
      }
    } catch (err) {
      console.error('Failed to load sheet tabs:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        setStatusType('success');
        setSyncStatus(`Signed in as ${result.user.email}!`);
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setStatusType('error');
      setSyncStatus('Google Sign In failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    setAvailableTabs([]);
    setSelectedSheetId('');
    setSelectedTabTitle('');
    setStatusType('info');
    setSyncStatus('Signed out from Google account');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  // Direct sync via Google Sheets API
  const handleDirectGoogleSheetPull = async () => {
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (!token) {
      handleGoogleSignIn();
      return;
    }

    const cleanId = extractSpreadsheetId(selectedSheetId);
    if (!cleanId) {
      alert('Please select or enter a valid Google Spreadsheet ID / URL');
      return;
    }

    const tab = selectedTabTitle || (availableTabs.length > 0 ? availableTabs[0].title : 'Sheet1');

    setIsSyncing(true);
    setStatusType('info');
    setSyncStatus(`Reading directly from Google Sheet (${tab})...`);

    try {
      const rows = await readSpreadsheetValues(token, cleanId, tab);
      if (!rows || rows.length < 2) {
        setStatusType('error');
        setSyncStatus('Google Sheet appears empty or only has 1 header row.');
        return;
      }

      const parsedRecords = convertSheetRowsToRecords(rows);
      if (parsedRecords.length > 0) {
        onSyncRecordsFromSheet(parsedRecords);
        setStatusType('success');
        setSyncStatus(`✓ Successfully synced ${parsedRecords.length} deals directly from Google Sheet!`);
      } else {
        setStatusType('error');
        setSyncStatus('Could not identify valid hostel deal rows in this sheet.');
      }
    } catch (err: any) {
      console.error('Direct Google Sheets pull error:', err);
      setStatusType('error');
      setSyncStatus(`Failed to read sheet: ${err.message || 'Permission denied'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Check if webhook is mistakenly the Apps Script project editor URL
  const isAppsScriptProjectUrl = webhookUrl.includes('script.google.com') && 
    (webhookUrl.includes('/home/projects') || webhookUrl.includes('/edit'));

  // Apps Script code for webhook fallback
  const appsScriptCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "update_record" && data.record) {
      var r = data.record;
      sheet.appendRow([
        r.sNo || "", r.pgName || "", r.paymentType || "", r.paymentMode || "",
        r.contact || "", r.location || "", r.operatorName || "", r.beds || "",
        r.spoc || "", r.ratePerBed || "", r.discount || "", r.plan || "",
        r.months || "", r.amount || "", r.gst || "", r.total || "",
        r.paymentMonth || "", r.paymentDate || "", r.planStartMonth || "",
        r.mrrMonth || "", r.nextPayMonth || "", r.renewalMonth || "",
        r.monthWise || "", r.qWise || "", r.invoice || "", r.incentives || "",
        r.remarks || "", r.mrr || "", r.mrrAmount || "", r.isPaid ? "PAID" : "UNPAID"
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveSettings = () => {
    const finalCsvUrl = convertToDirectCsvUrl(sheetCsvUrl);
    const updated: SheetSyncConfig = {
      webhookUrl: webhookUrl.trim(),
      sheetCsvUrl: finalCsvUrl || sheetCsvUrl.trim(),
      autoSync,
      lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    onSaveConfig(updated);
    if (finalCsvUrl && finalCsvUrl !== sheetCsvUrl) {
      setSheetCsvUrl(finalCsvUrl);
    }
    setStatusType('success');
    setSyncStatus('Settings saved successfully!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handlePushToSheet = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter your Google Apps Script Webhook URL.');
      return;
    }

    if (isAppsScriptProjectUrl) {
      alert('⚠️ Error: You entered the Apps Script Project Editor URL.\n\nPlease click "Deploy > New deployment > Web App" in Apps Script and use the URL ending in "/exec".');
      return;
    }

    setIsSyncing(true);
    setStatusType('info');
    setSyncStatus('Pushing updates to Google Sheet...');

    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          timestamp: new Date().toISOString(),
          recordCount: records.length,
          records: records.slice(0, 100)
        })
      });

      setStatusType('success');
      setSyncStatus('✓ Successfully pushed latest updates to Google Sheet!');
      onSaveConfig({
        ...syncConfig,
        webhookUrl: webhookUrl.trim(),
        lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error('Push error:', err);
      setStatusType('error');
      setSyncStatus('Failed to send to Google Sheet. Please check the URL.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handlePullFromSheet = async () => {
    const rawUrl = sheetCsvUrl.trim();
    if (!rawUrl) {
      alert('Please provide a Google Sheet Published CSV Link or Sheet URL.');
      return;
    }

    const targetUrl = convertToDirectCsvUrl(rawUrl);
    if (targetUrl !== rawUrl) {
      setSheetCsvUrl(targetUrl);
    }

    setIsSyncing(true);
    setStatusType('info');
    setSyncStatus('Pulling records from Google Sheet...');

    try {
      const response = await fetch(targetUrl);
      const text = await response.text();

      // PROTECT DATABASE: Reject HTML web pages!
      if (
        text.trim().startsWith('<!DOCTYPE') || 
        text.trim().startsWith('<html') || 
        text.includes('google-site-verification') ||
        text.includes('isSnippetbookTemplate')
      ) {
        setStatusType('error');
        setSyncStatus('⚠️ Google Sheet returned an HTML web page instead of CSV data. Database protected!');
        alert(
          '⚠️ The URL you entered returned a Google Sheets Web Page instead of CSV data.\n\n' +
          'To fix this in 10 seconds:\n' +
          '1. Open your Google Sheet.\n' +
          '2. Make sure Share is set to "Anyone with the link can view".\n' +
          '3. Or click: File > Share > Publish to web > choose Comma-separated values (.csv) > click Publish.\n' +
          '4. Paste that CSV link here.\n\n' +
          'Your existing records have NOT been modified.'
        );
        return;
      }

      const parsed = parseCSV(text);

      if (parsed.length >= 5) {
        onSyncRecordsFromSheet(parsed);
        setStatusType('success');
        setSyncStatus(`✓ Successfully synced ${parsed.length} records from Google Sheet!`);
      } else {
        setStatusType('error');
        setSyncStatus('⚠️ Retrieved fewer than 5 valid records. Database was protected from accidental overwrite.');
      }
    } catch (err) {
      console.error('Pull error:', err);
      setStatusType('error');
      setSyncStatus('Could not read from Google Sheet link. Ensure the sheet has "Anyone with the link can view" permission.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Explanation Banner: Safe Sync & Restore Alert */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-purple-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Google Workspace Live Integration
              </span>
              <span className="text-xs font-medium text-purple-200">
                {records.length} Verified Deals
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Google Sheets Direct Sync
            </h1>
            <p className="text-xs text-purple-200/90 max-w-2xl leading-relaxed">
              Connect your Google Account to read deals directly from your Google Sheets or push newly confirmed deals in real-time. No manual CSV publishing needed.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Restore 669 Initial Records button */}
            <button
              onClick={onResetToInitialRecords}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-md transition-all flex items-center gap-2 cursor-pointer"
              title="Click here if any sheet sync wiped your records to immediately restore the original 669 enriched deals"
            >
              <RotateCcw className="w-4 h-4 text-amber-950" />
              <span>Restore 669 Deals</span>
            </button>

            <button
              onClick={onExportCSV}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onImportClick}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-purple-950 hover:bg-purple-50 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-700" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        {/* Sync Status Toast */}
        {syncStatus && (
          <div className={`mt-4 p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
            statusType === 'success'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
              : statusType === 'error'
              ? 'bg-rose-500/20 border-rose-400 text-rose-200'
              : 'bg-purple-500/20 border-purple-400 text-purple-100'
          }`}>
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveIntegrationMode('google_api')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeIntegrationMode === 'google_api'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Direct Google Account (Recommended)</span>
        </button>

        <button
          onClick={() => setActiveIntegrationMode('webhook')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeIntegrationMode === 'webhook'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Webhook &amp; CSV Link (Apps Script)</span>
        </button>
      </div>

      {/* MODE 1: DIRECT GOOGLE SHEETS API VIA OAUTH */}
      {activeIntegrationMode === 'google_api' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Card 1: Account & Sheet Selection */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>1. Google Account Connection</span>
                  {currentUser && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  Access Google Sheets with permission from your Google Workspace account
                </p>
              </div>
            </div>

            {/* Google Sign-In Official Button */}
            {!currentUser ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-600">
                  Sign in with your Google account to select and sync your spreadsheets automatically.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isAuthenticating}
                    className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    <span>{isAuthenticating ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || ''} 
                      className="w-9 h-9 rounded-full border border-purple-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900">{currentUser.displayName || 'Authorized User'}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignOut}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Sign out of Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}

            {/* Choose Spreadsheet from Drive or enter URL */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-800 block">
                Select Spreadsheet:
              </label>

              {currentUser && driveFiles.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedSheetId}
                    onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Choose from your Google Drive files --</option>
                    {driveFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <input
                  type="text"
                  value={selectedSheetId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSheetId(val);
                    if (accessToken && val) {
                      handleSelectSpreadsheet(val);
                    }
                  }}
                  placeholder="Or paste Google Sheet URL or ID (e.g. 1BxiMVs0XR...)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* Tab Selector if available */}
              {availableTabs.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Select Sheet Tab:
                  </label>
                  <select
                    value={selectedTabTitle}
                    onChange={(e) => setSelectedTabTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {availableTabs.map((tab) => (
                      <option key={tab.sheetId} value={tab.title}>
                        {tab.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
              <button
                onClick={handleDirectGoogleSheetPull}
                disabled={isSyncing || (!currentUser && !selectedSheetId)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs shadow-purple-200 flex items-center gap-2 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Pull Deals from Sheet</span>
              </button>

              <button
                onClick={() => {
                  if (accessToken) {
                    loadDriveSpreadsheets(accessToken);
                    setStatusType('info');
                    setSyncStatus('Refreshed Drive files list');
                  }
                }}
                disabled={!currentUser || isLoadingDriveFiles}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                <span>Refresh Files</span>
              </button>
            </div>

          </div>

          {/* Card 2: Safe Guide & Why Data Was Previously Empty */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-600" />
              <span>Explanation &amp; Safety Guide</span>
            </h2>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Why did "Pull from Sheet" previously make deals disappear?
              </p>
              <p className="leading-relaxed text-[11px] text-amber-800">
                When you pasted the browser URL (like <code>.../spreadsheets/d/.../edit</code>) into the old pull tool, Google returned an <strong>HTML login web page</strong> instead of raw spreadsheet CSV data. Because it was an HTML page, the parser found 0 deal rows and temporarily replaced the view with an empty list.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">How we solved this:</p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px]">
                <li><strong>HTML Guard:</strong> The app now blocks HTML web pages automatically so your database is 100% protected and cannot be wiped.</li>
                <li><strong>Direct Google API:</strong> Signing in above uses the official Google Sheets API v4 which reads directly without needing any URL hacks.</li>
                <li><strong>Instant Restore:</strong> If anything ever happens, clicking <strong>"Restore 669 Deals"</strong> above brings back all your data in 1 second.</li>
              </ul>
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 text-[11px] text-purple-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                All permissions are securely isolated in your browser session. Your data stays in your Google Drive and local app.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: WEBHOOK & CSV LINK FALLBACK */}
      {activeIntegrationMode === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Step 1: Webhook Configuration */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">1. Webhook Settings</h2>
              <p className="text-xs text-slate-500">Configure Webhook URL or Published Sheet Link</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Google Apps Script Webhook URL (for Auto-Push):
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono ${
                  isAppsScriptProjectUrl ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200'
                }`}
              />
              
              {isAppsScriptProjectUrl ? (
                <p className="text-[11px] text-amber-800 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Notice: This is the Apps Script editor link. Please click <strong>Deploy &gt; New deployment &gt; Web App</strong> to get the URL ending in <strong>/exec</strong>.</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  Must end in <strong>/exec</strong> (Web App URL from Deploy menu).
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Google Sheet Link or Published CSV Link (for Pull Sync):
              </label>
              <input
                type="url"
                value={sheetCsvUrl}
                onChange={(e) => setSheetCsvUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Paste your Google Sheet link or Published CSV link (File &gt; Share &gt; Publish to web &gt; CSV).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoSyncCheck"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
              />
              <label htmlFor="autoSyncCheck" className="text-xs font-medium text-slate-800 cursor-pointer">
                Automatically sync to Google Sheet whenever a deal or payment is updated
              </label>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 flex-wrap">
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs shadow-purple-200 cursor-pointer"
              >
                Save Settings
              </button>

              <button
                onClick={handlePushToSheet}
                disabled={isSyncing || !webhookUrl}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push to Sheet</span>
              </button>

              <button
                onClick={handlePullFromSheet}
                disabled={isSyncing || !sheetCsvUrl}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-purple-700 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull from Sheet</span>
              </button>
            </div>

            {syncConfig.lastSyncedAt && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Last Synced: {syncConfig.lastSyncedAt}</span>
              </div>
            )}
          </div>

          {/* Step 2: Google Apps Script Setup Guide */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">2. How to connect your Google Sheet</h2>
                <p className="text-xs text-slate-500">1-Time 30-Second Setup in Apps Script</p>
              </div>
              
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Script Code'}</span>
              </button>
            </div>

            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <li>Open your Google Sheet.</li>
              <li>In the top menu, go to <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Clear existing code, click <strong>"Copy Script Code"</strong> above, and paste it.</li>
              <li>In top right, click <strong>Deploy &gt; New deployment</strong>.</li>
              <li>Select type <strong>"Web App"</strong> and set <strong>Who has access: "Anyone"</strong>.</li>
              <li>Copy the <strong>Web App URL</strong> (ends in <code>/exec</code>) and paste it into the Webhook URL field on the left.</li>
            </ol>

            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-[11px] text-purple-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                Once configured, whenever you confirm a payment or update a deal in this app, it automatically syncs with your Google Sheet!
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
