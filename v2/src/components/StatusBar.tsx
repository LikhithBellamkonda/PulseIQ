/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Cpu,
  Wifi,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { SensorData, AlertThresholds } from '../types';

interface StatusBarProps {
  currentData: SensorData;
  thresholds: AlertThresholds;
  isAlarmActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  connectionStatus: string;
}

export default function StatusBar({
  currentData,
  thresholds,
  isAlarmActive,
  isMuted,
  onToggleMute,
  connectionStatus,
}: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Calculate patient triage status based on active breaches
  let statusPhrase = 'Stable';
  let statusColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';

  const breaches: string[] = [];
  if (currentData.heartRate > thresholds.maxBpm) breaches.push('High Heart Rate');
  if (currentData.heartRate < thresholds.minBpm) breaches.push('Low Heart Rate');
  if (currentData.light !== undefined && thresholds.maxLight !== undefined && currentData.light > thresholds.maxLight) breaches.push('Ambient Glare');
  if (currentData.light !== undefined && thresholds.minLight !== undefined && currentData.light < thresholds.minLight) breaches.push('Ambient Darkness');
  if (currentData.weatherTemp !== undefined && currentData.weatherTemp > thresholds.maxTemp) breaches.push('High Temperature');
  if (currentData.weatherTemp !== undefined && currentData.weatherTemp < thresholds.minTemp) breaches.push('Low Temperature');

  if (breaches.length > 0) {
    if (breaches.includes('High Heart Rate') && currentData.heartRate > 130) {
      statusPhrase = 'URGENT METRIC BREACH';
      statusColor = 'text-red-400 border-red-500/30 bg-red-500/10 animate-pulse';
    } else {
      statusPhrase = 'ABNORMAL PARAMETERS';
      statusColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    }
  }

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-dark bg-panel-bg p-4 md:px-6 select-none shrink-0 space-y-3 md:space-y-0">
      
      {/* Subject Triage Diagnostics Status */}
      <div className="flex items-center space-x-3">
        <div className="bg-brand-bg border border-border-dark p-2 rounded-lg">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Triage Status:</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${statusColor}`}>
              {statusPhrase}
            </span>
          </div>
          <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest leading-none">
            {breaches.length > 0 ? (
              <span className="text-red-400 font-semibold">Active: {breaches.join(' + ')}</span>
            ) : (
              'Vital signs within normal medical tolerances'
            )}
          </div>
        </div>
      </div>

      {/* Flashing global panic marquee / banner if alarms are active */}
      {isAlarmActive && (
        <div className="flex-1 max-w-md mx-4 hidden lg:flex items-center justify-center bg-red-950/20 border border-red-500/30 rounded-lg py-1.5 px-3 space-x-3 text-red-400 animate-pulse animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <marquee scrollamount="3" className="text-xs font-mono font-bold tracking-wider uppercase">
            WARNING: Patient vitals breached threshold guidelines. Inspect sensor contact &amp; patient condition immediately.
          </marquee>
        </div>
      )}

      {/* Hardware Node Indicators & Date Tickers */}
      <div className="flex items-center justify-between md:justify-end space-x-6">
        
        {/* Device Node specs */}
        <div className="hidden sm:flex items-center space-x-4 border-r border-border-dark pr-5">
          <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-400">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span>ESP32-BLE</span>
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-400">
            <Wifi className="w-4 h-4 text-cyan-500/80" />
            <span>{currentData.signalStrength ? `${currentData.signalStrength} dBm` : '-64 dBm'}</span>
          </div>
        </div>

        {/* Global alarm sound mute toggler */}
        <div className="flex items-center space-x-3 font-mono">
          <button
            onClick={onToggleMute}
            className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
              isAlarmActive 
                ? isMuted
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 animate-bounce'
                : isMuted
                ? 'bg-brand-bg border-[#444] text-slate-500 hover:text-slate-300'
                : 'bg-brand-bg border-border-dark text-slate-400 hover:text-slate-200'
            }`}
            title={isMuted ? 'Unmute Alarms' : 'Silence Alarms'}
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className={`w-4 h-4 ${isAlarmActive ? 'animate-swing' : ''}`} />}
          </button>

          {/* Clock Node */}
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-mono leading-none">System Clock (UTC)</p>
            <p className="text-xs font-mono font-bold text-slate-300 mt-1 tracking-wide">
              {formattedTime}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
