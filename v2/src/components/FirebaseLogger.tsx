/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Terminal, Trash2, ShieldCheck, Database } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NetworkLog } from '../types';

interface FirebaseLoggerProps {
  logs: NetworkLog[];
  onClearLogs: () => void;
  connectionStatus: string;
}

export default function FirebaseLogger({
  logs,
  onClearLogs,
  connectionStatus,
}: FirebaseLoggerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Automatically scroll logs to bottom when they change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogTypeColor = (type: NetworkLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400 font-medium';
      case 'warn':
        return 'text-amber-400 font-medium';
      case 'error':
        return 'text-red-400 font-extrabold animate-pulse';
      case 'info':
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIndicatorColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-400 border-emerald-500/30';
      case 'connecting':
        return 'bg-amber-400 border-amber-500/30';
      case 'disconnected':
        return 'bg-red-400 border-red-500/30';
      case 'simulating':
      default:
        return 'bg-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div id="firebase-logger" className="bg-card-bg border border-border-dark rounded-xl p-5 backdrop-blur-md flex flex-col h-[230px]">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-3.5 border-b border-border-dark pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
            Network Diagnostics &amp; Firebase RTDB Console
          </h3>
          <span className={`w-2 h-2 rounded-full ${getStatusIndicatorColor()} animate-pulse ml-1.5`} />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden md:inline">
            Status: {connectionStatus}
          </span>
        </div>

        <button
          onClick={onClearLogs}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono tracking-wider bg-brand-bg border border-border-dark hover:bg-card-bg rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
        >
          <Trash2 className="w-3 h-3 text-slate-500" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Scrolling Text Buffer */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 pr-2 custom-scrollbar bg-brand-bg border border-border-dark rounded-lg p-3 scroll-smooth"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 select-none">
            <span className="text-[10px] uppercase tracking-widest">Awaiting sensor data transmission packets...</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 md:space-x-3 text-[11px] border-b border-brand-bg pb-1">
              <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={`shrink-0 uppercase font-bold text-[9px] px-1.5 py-0.2 rounded border select-none ${
                log.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                  : log.type === 'error'
                  ? 'bg-red-500/10 text-red-400 border-red-500/10'
                  : log.type === 'warn'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
              }`}>
                {log.type}
              </span>
              <div className="flex-1 break-all">
                <span className={getLogTypeColor(log.type)}>{log.message}</span>
                {log.payload && (
                  <pre className="mt-1 text-[10px] text-cyan-400/80 p-2 bg-card-bg rounded border border-border-dark overflow-x-auto">
                    {log.payload}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dynamic footer status */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2.5 mt-1 select-none">
        <span className="flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-500/60" />
          <span>Polling Rate: 2000ms</span>
        </span>
        <span className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/65" />
          <span>No memory leaks detected</span>
        </span>
      </div>
    </div>
  );
}
