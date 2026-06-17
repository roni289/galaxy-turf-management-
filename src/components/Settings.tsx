import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert,
  Cloud,
  CheckCircle2,
  Loader2,
  ExternalLink,
  LogOut,
  RefreshCw,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ToastType } from './ui/Toast';

interface SettingsProps {
  showToast: (message: string, type: ToastType) => void;
  bookings: any[];
  customers: any[];
  onDataLoaded: (data: { bookings: any[], customers: any[] }) => void;
  isDriveConnected: boolean;
  user: { name?: string; email?: string; picture?: string } | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export function Settings({ 
  showToast, 
  bookings, 
  customers, 
  onDataLoaded,
  isDriveConnected,
  user,
  onLoginClick,
  onLogoutClick
}: SettingsProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToDrive = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings, customers })
      });
      if (res.ok) {
        showToast('Data synced to Google Drive!', 'success');
      } else {
        throw new Error();
      }
    } catch (error) {
      showToast('Failed to sync to Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromDrive = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/load');
      if (res.ok) {
        const data = await res.json();
        if (data.bookings && data.customers) {
          onDataLoaded(data);
          showToast('Data restored from Google Drive!', 'success');
        }
      } else {
        showToast('No backup found in Drive or failed to load', 'info');
      }
    } catch (error) {
      showToast('Failed to load from Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">System <span className="text-brand">Settings</span></h2>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-2">Manage your portal structure and cloud integration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Google Drive Integration Card */}
        <div className="bg-card-dark border border-slate-800 rounded-[2rem] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Cloud className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white">Google Drive</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Cloud Backup & Storage</p>
              </div>
            </div>
            {isDriveConnected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Connected</span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Connect your Google Drive account to securely backup and sync your sports arena data. This ensures your records are never lost even if local data is cleared.
          </p>

          {!isDriveConnected ? (
            <button 
              onClick={onLoginClick}
              className="w-full bg-brand text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand/10"
            >
              <ExternalLink className="w-4 h-4" /> Connect Drive
            </button>
          ) : (
            <div className="space-y-4">
              {user && (
                <div className="flex items-center gap-3 p-3 bg-[#020617] border border-slate-800 rounded-2xl mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-brand/20">
                    <img src={user.picture} referrerPolicy="no-referrer" alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <p className="text-[10px] text-slate-500">{user.email}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleSyncToDrive}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 font-display"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-3 h-3" /> Sync to Drive</>}
                </button>
                <button 
                  onClick={handleLoadFromDrive}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 font-display"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-3 h-3" /> Load Backup</>}
                </button>
              </div>
              <button 
                onClick={onLogoutClick}
                className="w-full text-slate-500 hover:text-red-400 py-2 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-3 h-3" /> Disconnect Account
              </button>
            </div>
          )}

          <div className="p-4 bg-[#020617] border border-slate-800 rounded-2xl">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Recommended Action</p>
             </div>
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Connect your official <span className="text-white">galaxysports112@gmail.com</span> account to sync field operations across all admin devices.
             </p>
          </div>
        </div>

        {/* Security & Access Card */}
        <div className="bg-card-dark border border-slate-800 rounded-[2rem] p-8 space-y-6">
           <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white">System Logs</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Access Monitoring</p>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[9px] font-black text-brand uppercase">Cloud Sync</span>
                   <span className="text-[9px] text-slate-500">{isDriveConnected ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-xs font-bold text-white">
                  {isDriveConnected ? 'Automatic cloud backup protocols are standing by.' : 'Cloud backup is disabled. Sync to Drive to secure data.'}
                </p>
             </div>
             <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[9px] font-black text-blue-400 uppercase">Local Cache</span>
                   <span className="text-[9px] text-slate-500">Encrypted</span>
                </div>
                <p className="text-xs font-bold text-white">Browser local storage is being used as primary cache layer.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
