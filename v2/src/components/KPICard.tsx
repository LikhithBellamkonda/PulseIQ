/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface KPICardProps {
  id: string;
  title: string;
  value: string | number;
  unit: string;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'stable';
  icon: ReactNode;
  status: 'normal' | 'warning' | 'critical';
  thresholdText: string;
  pulseSpeedMs?: number; // Optional pulsing effect for heart rates
  historyData?: number[]; // Mini history values for full-width sparkline
  minThreshold?: number;  // Numeric low benchmark
  maxThreshold?: number;  // Numeric high benchmark
  gaugeMin?: number;      // Numeric scale start
  gaugeMax?: number;      // Numeric scale end
}

export default function KPICard({
  id,
  title,
  value,
  unit,
  trend,
  trendDirection = 'stable',
  icon,
  status,
  thresholdText,
  pulseSpeedMs,
  historyData,
  minThreshold,
  maxThreshold,
  gaugeMin = 0,
  gaugeMax = 100,
}: KPICardProps) {
  // Styles based on severity
  const themeStyles = {
    normal: {
      border: 'border-slate-800 hover:border-cyan-500/40',
      bgGlow: 'from-cyan-500/5 to-transparent',
      textGlow: 'text-white',
      badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      statusText: 'text-cyan-400/80',
      pulseColor: 'bg-cyan-400',
      badgeText: 'NORMAL',
    },
    warning: {
      border: 'border-yellow-500/20 hover:border-yellow-400/50',
      bgGlow: 'from-yellow-400/5 to-transparent',
      textGlow: 'text-yellow-400',
      badgeBg: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      statusText: 'text-yellow-500/80',
      pulseColor: 'bg-yellow-400',
      badgeText: 'WARNING',
    },
    critical: {
      border: 'border-red-500/40 hover:border-red-400/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
      bgGlow: 'from-red-500/10 to-transparent',
      textGlow: 'text-red-400 font-bold',
      badgeBg: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse',
      statusText: 'text-red-400 font-medium',
      pulseColor: 'bg-red-500',
      badgeText: 'CRITICAL',
    },
  };

  const style = themeStyles[status];

  // Render Sparkline SVG Path
  const renderSparkline = () => {
    if (!historyData || historyData.length < 2) return null;
    
    const minVal = Math.min(...historyData);
    const maxVal = Math.max(...historyData);
    const valRange = maxVal - minVal;
    
    const points = historyData.map((val, idx) => {
      const x = (idx / (historyData.length - 1)) * 100;
      let y = 15; // default center
      if (valRange > 0) {
        y = 35 - ((val - minVal) / valRange) * 30; // map into range 5 to 35
      }
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L 100,40 L 0,40 Z`;
    
    // Choose neon color based on status
    const strokeColors = {
      normal: '#06b6d4', // cyan-500
      warning: '#fac107', // yellow-500
      critical: '#ef4444', // red-500
    };
    
    const fillColor = strokeColors[status];
    
    return (
      <div className="absolute left-0 right-0 bottom-[54px] h-10 w-full opacity-70 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path d={areaPath} fill={`url(#gradient-${id})`} />
          {/* Neon path line */}
          <path d={linePath} fill="none" stroke={fillColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  };

  return (
    <motion.div
      id={`kpi-${id}`}
      layout
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-xl bg-[#090e17] border ${style.border} p-5 pb-4 flex flex-col justify-between transition-colors duration-300 backdrop-blur-md min-h-[148px]`}
    >
      {/* Background radial soft gradient */}
      <div className={`absolute top-0 right-0 w-36 h-36 bg-radial ${style.bgGlow} filter blur-xl pointer-events-none rounded-full`} />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {title}
        </span>
        <div className="flex items-center space-x-2">
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${style.badgeBg}`}>
            {style.badgeText}
          </span>
          <div className="flex items-center space-x-1">
            {pulseSpeedMs ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: pulseSpeedMs / 1000,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`w-2 h-2 rounded-full ${style.pulseColor}`}
              />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${style.pulseColor}`} />
            )}
            <span className="text-slate-400">{icon}</span>
          </div>
        </div>
      </div>

      {/* Primary Value Display */}
      <div className="flex items-baseline mb-4 z-10 relative">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className={`text-4xl font-semibold tracking-tight ${style.textGlow} tabular-nums`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <span className="text-slate-400 font-medium ml-1.5 uppercase text-xs">
          {unit}
        </span>
      </div>

      {/* Full-width trend line sparkline */}
      {renderSparkline()}

      {/* Modern Visual Gauge showing exact threshold benchmarks */}
      {minThreshold !== undefined && maxThreshold !== undefined && (
        <div className="mx-1 mt-2 mb-3.5 z-10 relative select-none">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
            <span>Limit: {minThreshold} – {maxThreshold} {unit}</span>
            <span className={`${status === 'critical' ? 'text-red-400 font-bold' : status === 'warning' ? 'text-yellow-400 font-bold' : 'text-slate-400'}`}>
              Current: {value}
            </span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-950/60 rounded-full overflow-hidden border border-slate-900/40">
            {/* Safe Comfort Zone segment bar */}
            <div
              className="absolute h-full bg-emerald-500/10 border-x border-emerald-500/15"
              style={{
                left: `${Math.max(0, Math.min(100, ((minThreshold - gaugeMin) / (gaugeMax - gaugeMin)) * 100))}%`,
                width: `${Math.max(0, Math.min(100, (((maxThreshold - minThreshold) / (gaugeMax - gaugeMin)) * 100)))}%`
              }}
            />
            {/* Current Value pin location */}
            <div
              className={`absolute top-0 bottom-0 w-2.5 h-2.5 -mt-[2px] rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-all duration-500 ${
                status === 'critical' ? 'bg-red-500 shadow-red-500/50' : status === 'warning' ? 'bg-yellow-400 shadow-yellow-400/50' : 'bg-cyan-400 shadow-cyan-400/50'
              }`}
              style={{
                left: `${Math.max(0, Math.min(97, ((Number(value) - gaugeMin) / (gaugeMax - gaugeMin)) * 100))}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Footer statistics & thresholds */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3.5 mt-2 z-10 relative bg-[#090e17]/60 backdrop-blur-sm -mx-5 px-5">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            Normal Threshold
          </span>
          <span className="text-[11px] text-slate-300 mt-0.5 tracking-wide font-mono">
            {thresholdText}
          </span>
        </div>

        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
            {trendDirection === 'up' && <span className="text-[9px]">▲</span>}
            {trendDirection === 'down' && <span className="text-[9px]">▼</span>}
            {trendDirection === 'stable' && <span className="text-[9px] font-bold">~</span>}
            <span className="font-mono font-medium">{trend}</span>
          </div>
        )}
      </div>

      {/* Quick Visual Alarm Overlay (Flashes red if critical) */}
      {status === 'critical' && (
        <div className="absolute inset-0 border border-red-500/50 rounded-xl pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
}
