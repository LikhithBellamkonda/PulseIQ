/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { SensorData, AlertThresholds } from '../types';

interface RealTimeChartsProps {
  data: SensorData[];
  thresholds: AlertThresholds;
}

// Format Unix Timestamp to HH:MM:SS
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function RealTimeCharts({ data, thresholds }: RealTimeChartsProps) {
  // Format the data for chart consumption
  const chartData = data.map((d) => ({
    ...d,
    timeLabel: formatTime(d.timestamp),
    hrValue: d.heartRate,
    humidityValue: d.humidity ?? 45,
    lightValue: d.light ?? 50,
    tempValue: d.weatherTemp ?? 25.0,
  }));

  // Smart axis scalings
  const heartRates = chartData.map((d) => d.hrValue);
  const minHr = Math.max(30, Math.min(...heartRates, 55) - 5);
  const maxHr = Math.min(220, Math.max(...heartRates, 105) + 5);

  const humidities = chartData.map((d) => d.humidityValue);
  const minHum = Math.max(0, Math.min(...humidities, 25) - 5);
  const maxHum = Math.min(100, Math.max(...humidities, 85) + 5);

  const lights = chartData.map((d) => d.lightValue);
  const minLight = Math.max(0, Math.min(...lights, 15) - 5);
  const maxLight = Math.min(100, Math.max(...lights, 85) + 5);

  const temps = chartData.map((d) => d.tempValue);
  const minTemp = Math.max(-10, Math.min(...temps, 15) - 3);
  const maxTemp = Math.min(55, Math.max(...temps, 35) + 3);

  const latestData = data[data.length - 1] as SensorData | undefined;
  const isHrBreached = latestData ? (latestData.heartRate > thresholds.maxBpm || latestData.heartRate < thresholds.minBpm) : false;

  // Custom tooltips matching sleek dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#090e17] border border-slate-800 p-3 rounded-lg shadow-2xl backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1.5">{label}</p>
          <div className="flex flex-col space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-6">
                <span className="text-xs text-slate-400 capitalize">{entry.name}:</span>
                <span className="text-xs font-mono font-bold" style={{ color: entry.stroke || entry.color }}>
                  {entry.value} {entry.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. HEART RATE TREND */}
      <div id="chart-heart-rate" className="flex flex-col bg-[#060a12]/90 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 tracking-wide">
              Heartbeat Sensor Trend (BPM)
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              Live cardiac pulse values from Firebase
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <div className="flex items-center space-x-1">
              <span className={`w-2.5 h-1 ${isHrBreached ? 'bg-red-500' : 'bg-cyan-400'} opacity-80 rounded`} />
              <span className="text-slate-400">Normal Range: {thresholds.minBpm}-{thresholds.maxBpm}</span>
            </div>
          </div>
        </div>

        <div className="h-[210px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isHrBreached ? "#ef4444" : "#22d3ee"} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={isHrBreached ? "#ef4444" : "#22d3ee"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.08)" />
              <XAxis
                dataKey="timeLabel"
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dy={6}
              />
              <YAxis
                domain={[minHr, maxHr]}
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea
                y1={thresholds.minBpm}
                y2={thresholds.maxBpm}
                {...{ fill: '#22d3ee', fillOpacity: 0.04 } as any}
              />
              <ReferenceLine
                y={thresholds.maxBpm}
                stroke="#ef4444"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `High Limit (${thresholds.maxBpm})`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                y={thresholds.minBpm}
                stroke="#06b6d4"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Low Limit (${thresholds.minBpm})`,
                  position: 'bottom',
                  fill: '#06b6d4',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="hrValue"
                name="Pulse Rate"
                unit="BPM"
                stroke={isHrBreached ? "#ef4444" : "#22d3ee"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#hrGlow)"
                dot={{ stroke: isHrBreached ? "#ef4444" : "#22d3ee", strokeWidth: 1.5, r: 2.5, fill: '#090e17' }}
                activeDot={{ stroke: '#ef4444', strokeWidth: 2, r: 4.5, fill: '#ef4444' }}
                animationDuration={250}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. HUMIDITY TREND */}
      <div id="chart-humidity" className="flex flex-col bg-[#060a12]/90 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 tracking-wide">
              Environment Humidity Trend (%)
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              Relative air humidity index from DHT sensor on Firebase
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-1 bg-emerald-400 opacity-80 rounded" />
              <span className="text-slate-400">Optimal Range: 30%-60%</span>
            </div>
          </div>
        </div>

        <div className="h-[210px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="humidityGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.08)" />
              <XAxis
                dataKey="timeLabel"
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dy={6}
              />
              <YAxis
                domain={[minHum, maxHum]}
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea
                y1={thresholds.minHumidity ?? 30}
                y2={thresholds.maxHumidity ?? 65}
                {...{ fill: '#34d399', fillOpacity: 0.04 } as any}
              />
              <ReferenceLine
                y={thresholds.maxHumidity ?? 60}
                stroke="#f59e0b"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `High Limit (${thresholds.maxHumidity ?? 60}%)`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                y={thresholds.minHumidity ?? 30}
                stroke="#34d399"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Low Limit (${thresholds.minHumidity ?? 30}%)`,
                  position: 'bottom',
                  fill: '#34d399',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="humidityValue"
                name="Humidity"
                unit="%"
                stroke="#34d399"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#humidityGlow)"
                dot={{ stroke: '#34d399', strokeWidth: 1.5, r: 2.5, fill: '#090e17' }}
                activeDot={{ stroke: '#34d399', strokeWidth: 2, r: 4.5, fill: '#34d399' }}
                animationDuration={250}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. LIGHT INTENSITY TREND */}
      <div id="chart-light" className="flex flex-col bg-[#060a12]/90 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 tracking-wide">
              LDR Ambient Light Intensity (%)
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              LDR Brightness sensor index from Firebase (High = Brighter)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-1 bg-amber-400 opacity-80 rounded" />
              <span className="text-slate-400">Cozy Target: 15%-85%</span>
            </div>
          </div>
        </div>

        <div className="h-[210px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lightGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.08)" />
              <XAxis
                dataKey="timeLabel"
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dy={6}
              />
              <YAxis
                domain={[minLight, maxLight]}
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea
                y1={thresholds.minLight ?? 15}
                y2={thresholds.maxLight ?? 85}
                {...{ fill: '#fbbf24', fillOpacity: 0.04 } as any}
              />
              <ReferenceLine
                y={thresholds.maxLight ?? 85}
                stroke="#e11d48"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Bright Limit (${thresholds.maxLight ?? 85}%)`,
                  position: 'top',
                  fill: '#e11d48',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                y={thresholds.minLight ?? 15}
                stroke="#fbbf24"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Dark Limit (${thresholds.minLight ?? 15}%)`,
                  position: 'bottom',
                  fill: '#fbbf24',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="lightValue"
                name="Light Intensity"
                unit="%"
                stroke="#fbbf24"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#lightGlow)"
                dot={{ stroke: '#fbbf24', strokeWidth: 1.5, r: 2.5, fill: '#090e17' }}
                activeDot={{ stroke: '#fbbf24', strokeWidth: 2, r: 4.5, fill: '#fbbf24' }}
                animationDuration={250}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. OUTDOOR WEATHER TEMPERATURE TREND */}
      <div id="chart-weather" className="flex flex-col bg-[#060a12]/90 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 tracking-wide">
              Outdoor City Temperature (°C)
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              Live outdoor values fetched from Searched Weather Location
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-1 bg-sky-400 opacity-80 rounded" />
              <span className="text-slate-400">Stable: 15°C-35°C</span>
            </div>
          </div>
        </div>

        <div className="h-[210px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weatherGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.08)" />
              <XAxis
                dataKey="timeLabel"
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dy={6}
              />
              <YAxis
                domain={[minTemp, maxTemp]}
                stroke="rgba(148, 163, 184, 0.25)"
                tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 9, fontFamily: 'monospace' }}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea
                y1={thresholds.minTemp}
                y2={thresholds.maxTemp}
                {...{ fill: '#38bdf8', fillOpacity: 0.04 } as any}
              />
              <ReferenceLine
                y={thresholds.maxTemp}
                stroke="#ef4444"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `High Limit (${thresholds.maxTemp}°C)`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                y={thresholds.minTemp}
                stroke="#0284c7"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Low Limit (${thresholds.minTemp}°C)`,
                  position: 'bottom',
                  fill: '#0284c7',
                  fontSize: 8,
                  fontFamily: 'monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="tempValue"
                name="Outdoor Temp"
                unit="°C"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#weatherGlow)"
                dot={{ stroke: '#38bdf8', strokeWidth: 1.5, r: 2.5, fill: '#090e17' }}
                activeDot={{ stroke: '#38bdf8', strokeWidth: 2, r: 4.5, fill: '#38bdf8' }}
                animationDuration={250}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
