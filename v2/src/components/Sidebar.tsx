/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import {
  HeartPulse,
  Database,
  CloudSun,
  Search,
  User,
  RefreshCw,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { ConnectionState } from '../types';

interface SidebarProps {
  connection: ConnectionState;
  onConnectionChange: (conn: Partial<ConnectionState>) => void;
  onManualTriggerFetch: () => void;
  isFetching: boolean;
  
  // Real-time Weather Integration Props
  searchedCity: string;
  onTriggerWeatherSearch: (city: string) => void;
  isWeatherLoading: boolean;
  weatherError: string | null;
  weatherTemp: number;
  weatherHumidity: number;
}

export default function Sidebar({
  connection,
  onConnectionChange,
  onManualTriggerFetch,
  isFetching,
  searchedCity,
  onTriggerWeatherSearch,
  isWeatherLoading,
  weatherError,
  weatherTemp,
  weatherHumidity,
}: SidebarProps) {
  const [cityInput, setCityInput] = useState(searchedCity);

  const resetToDefaultDb = () => {
    onConnectionChange({
      url: 'https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json',
    });
  };

  const handleWeatherSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cityInput.trim()) {
      onTriggerWeatherSearch(cityInput.trim());
    }
  };

  return (
    <aside className="w-full lg:w-80 bg-[#060a12] border-r border-slate-900 flex flex-col h-full overflow-y-auto select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900 flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] text-black">
          <HeartPulse className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center">
            PulseIQ <span className="text-cyan-400 font-normal ml-1">Personal</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">
            Personal Health Hub • v2.0.0
          </p>
        </div>
      </div>

      {/* Patient / Subject Summary ID */}
      <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/20 flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">
          <User className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Personal Profile
          </p>
          <p className="text-sm font-semibold text-slate-200 truncate mt-1">
            Likith Bellamkonda
          </p>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-mono text-slate-400">Home Health Mode • Active</span>
          </div>
        </div>
      </div>

      {/* Primary Panels */}
      <div className="p-6 flex-1 space-y-6">
        
        {/* OUTDOOR WEATHER ENVIRONMENT INTEGRATION */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <CloudSun className="w-4 h-4 text-sky-400" />
            <span>Outdoor Weather Feed</span>
          </h2>

          <div className="bg-[#090e17] border border-slate-900 rounded-xl p-4 space-y-3.5">
            <p className="text-[11px] text-slate-400 leading-normal">
              Search your precise city to retrieve current localized outdoor temperatures in real-time.
            </p>

            <form onSubmit={handleWeatherSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Search city (e.g. Hyderabad)"
                className="w-full bg-[#05080f] border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-300 font-sans focus:outline-none focus:border-sky-500/70"
                id="weather-city-input"
              />
              <button
                type="submit"
                disabled={isWeatherLoading}
                className="absolute right-1 px-2 py-1 bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/15 rounded-md cursor-pointer disabled:opacity-50"
              >
                {isWeatherLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            {weatherError && (
              <p className="text-[10px] text-red-400 font-mono italic">
                Error: {weatherError}
              </p>
            )}

            {!weatherError && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-mono">Outdoor Ambient Temp</span>
                  <span className="text-sm font-bold text-sky-400 font-mono">
                    {weatherTemp.toFixed(1)} °C
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-mono">Outdoor Humidity</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {weatherHumidity.toFixed(0)} %
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FIREBASE TELEMETRY MODULE */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400/90" />
            <span>Firebase Feed Node</span>
          </h2>

          <div className="bg-[#090e17] border border-slate-900 rounded-xl p-4 space-y-4">
            {/* Custom URL settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  RTDB JSON Endpoint
                </label>
                <button
                  onClick={resetToDefaultDb}
                  className="text-[9px] font-mono text-cyan-400 hover:underline leading-none cursor-pointer"
                >
                  Reset Endpoint
                </button>
              </div>
              <input
                type="text"
                value={connection.url}
                onChange={(e) => onConnectionChange({ url: e.target.value })}
                placeholder="https://your-rtdb-url/sensors.json"
                className="w-full bg-[#05080f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/50"
                id="firebase-url-input"
              />
              
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={onManualTriggerFetch}
                  disabled={isFetching}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-1 px-3 bg-[#05080f] hover:bg-slate-950 disabled:opacity-55 text-[10px] font-mono text-slate-300 border border-slate-800 rounded-lg cursor-pointer animate-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
                  <span>Ping Feed</span>
                </button>
                <div className="px-2 py-1.5 bg-[#05080f] border border-slate-800 text-[9px] font-mono rounded-lg text-slate-400">
                  {connection.latencyMs}ms
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sidebar Footer Info */}
      <div className="p-6 border-t border-slate-900 bg-[#060a12] flex items-center space-x-2 text-[10px] text-slate-500 font-mono tracking-wider">
        <Cpu className="w-4 h-4 text-cyan-500/70 animate-pulse" />
        <span>Hardware Node Active</span>
      </div>
    </aside>
  );
}
