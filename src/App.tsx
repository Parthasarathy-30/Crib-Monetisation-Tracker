/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { HostelRecord, ViewTab, SheetSyncConfig } from './data/types';
import { 
  initialRecords, 
  getStoredRecords, 
  saveStoredRecords,
  getSheetSyncConfig,
  saveSheetSyncConfig
} from './data/initialRecords';
import { parseCSV, exportToCSV } from './utils/csvParser';
import { Header } from './components/Header';
import { RenewalsView } from './components/RenewalsView';
import { FirstPayMrrView } from './components/FirstPayMrrView';
import { CitiesView } from './components/CitiesView';
import { LedgerView } from './components/LedgerView';
import { GoogleSheetSyncView } from './components/GoogleSheetSyncView';
import { IncentivesView } from './components/IncentivesView';
import { RecordModal } from './components/RecordModal';
import { RecordDetailModal } from './components/RecordDetailModal';

export default function App() {
  const [records, setRecords] = useState<HostelRecord[]>(() => getStoredRecords());
  // Default to renewals tab as requested by the user
  const [currentTab, setCurrentTab] = useState<ViewTab>('renewals');
  
  // Sheet sync configuration
  const [syncConfig, setSyncConfig] = useState<SheetSyncConfig>(() => getSheetSyncConfig());

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HostelRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HostelRecord | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to trigger auto-sync to Google Sheet if configured
  const triggerAutoSheetSync = async (record: HostelRecord) => {
    if (syncConfig.autoSync && syncConfig.webhookUrl) {
      try {
        await fetch(syncConfig.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_record',
            record
          })
        });
      } catch (err) {
        console.error('Auto sync error:', err);
      }
    }
  };

  // Toggle Status (PAID, UNPAID, YET_TO_PAY) for any record
  const handleToggleStatus = (recordId: string, status: 'PAID' | 'UNPAID' | 'YET_TO_PAY') => {
    let updatedTarget: HostelRecord | null = null;
    const isPaid = status === 'PAID';
    const updated = records.map(r => {
      if (r.id === recordId) {
        const mod = { ...r, status, isPaid };
        updatedTarget = mod;
        return mod;
      }
      return r;
    });

    setRecords(updated);
    saveStoredRecords(updated);

    if (updatedTarget) {
      triggerAutoSheetSync(updatedTarget);
      const msg = status === 'PAID' 
        ? 'Payment marked as Paid 🟢' 
        : status === 'YET_TO_PAY' 
        ? 'Marked as Yet to be Paid 🔵' 
        : 'Marked as Pending Due 🔴';
      showToast(msg);
    }
  };

  // Add / Edit record
  const handleSaveRecord = (record: HostelRecord) => {
    let updated: HostelRecord[];
    const exists = records.some(r => r.id === record.id);
    if (exists) {
      updated = records.map(r => r.id === record.id ? record : r);
      showToast(`Updated deal: ${record.pgName}`);
    } else {
      updated = [record, ...records];
      showToast(`Added new deal: ${record.pgName}`);
    }
    setRecords(updated);
    saveStoredRecords(updated);
    triggerAutoSheetSync(record);
    setEditingRecord(null);
  };

  // Record payment and auto schedule next renewal cycle
  const handleRecordPaymentAndScheduleRenewal = (paidDeal: HostelRecord, nextDeal: HostelRecord) => {
    const updated = records.map(r => r.id === paidDeal.id ? paidDeal : r);
    const finalRecords = [nextDeal, ...updated];
    setRecords(finalRecords);
    saveStoredRecords(finalRecords);
    triggerAutoSheetSync(paidDeal);
    showToast(`Payment recorded for ${paidDeal.pgName}! Next renewal scheduled for ${nextDeal.renewalMonth || 'future'}`);
  };

  // Delete record
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this property record?')) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      saveStoredRecords(updated);
      showToast('Record deleted successfully');
    }
  };

  // Reset to original spreadsheet data
  const handleResetData = () => {
    if (window.confirm('Reset all records back to the original spreadsheet data (669 deals)?')) {
      setRecords(initialRecords);
      saveStoredRecords(initialRecords);
      showToast('Reset to original spreadsheet data');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = exportToCSV(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `crib_hostel_monetization_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV file successfully!');
  };

  // Import CSV
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          const action = window.confirm(
            `Imported ${parsed.length} records!\n\nClick "OK" to replace current data, or "Cancel" to append.`
          );
          let newRecords: HostelRecord[];
          if (action) {
            newRecords = parsed;
          } else {
            newRecords = [...parsed, ...records];
          }
          setRecords(newRecords);
          saveStoredRecords(newRecords);
          showToast(`Successfully loaded ${parsed.length} records!`);
        } else {
          alert('Could not parse valid records from this CSV file. Please check format.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to parse file: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveSyncConfig = (cfg: SheetSyncConfig) => {
    setSyncConfig(cfg);
    saveSheetSyncConfig(cfg);
    showToast('Google Sheet sync settings saved');
  };

  const handleSyncRecordsFromSheet = (newRecords: HostelRecord[]) => {
    setRecords(newRecords);
    saveStoredRecords(newRecords);
    showToast(`Synced ${newRecords.length} records from Google Sheet!`);
  };

  return (
    <div className="min-h-screen bg-[#faf8fd] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Hidden file input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Main Top Navigation Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onNewRecord={() => {
          setEditingRecord(null);
          setIsRecordModalOpen(true);
        }}
        onResetData={handleResetData}
        totalRecordsCount={records.length}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 animate-fade-in flex items-center gap-2">
          <span className="text-purple-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport Container - Wide Desktop Full Width */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* TAB 1: RENEWALS HUB (DEFAULT) */}
        {currentTab === 'renewals' && (
          <RenewalsView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onEditRecord={(r) => {
              setEditingRecord(r);
              setIsRecordModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onRecordPaymentAndScheduleRenewal={handleRecordPaymentAndScheduleRenewal}
          />
        )}

        {/* TAB 2: FIRST PAY ONLY MRR */}
        {currentTab === 'mrr' && (
          <FirstPayMrrView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {/* TAB 3: CITIES & LOCATIONS */}
        {currentTab === 'cities' && (
          <CitiesView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
          />
        )}

        {/* TAB 4: ALL DEALS LEDGER */}
        {currentTab === 'ledger' && (
          <LedgerView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onEditRecord={(r) => {
              setEditingRecord(r);
              setIsRecordModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        {/* TAB 5: 2-WAY GOOGLE SHEET SYNC */}
        {currentTab === 'sheetsync' && (
          <GoogleSheetSyncView
            records={records}
            syncConfig={syncConfig}
            onSaveConfig={handleSaveSyncConfig}
            onSyncRecordsFromSheet={handleSyncRecordsFromSheet}
            onExportCSV={handleExportCSV}
            onImportClick={() => fileInputRef.current?.click()}
            onResetToInitialRecords={handleResetData}
          />
        )}

        {/* TAB 6: INCENTIVES */}
        {currentTab === 'incentives' && (
          <IncentivesView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
          />
        )}

      </main>

      {/* Add / Edit Record Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        initialData={editingRecord}
        totalRecordsCount={records.length}
      />

      {/* Deep Record Details Modal */}
      <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onEdit={(r) => {
          setSelectedRecord(null);
          setEditingRecord(r);
          setIsRecordModalOpen(true);
        }}
      />

    </div>
  );
}
