/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface WaveformProps {
  heartRate: number;
  isAlert: boolean;
}

export default function HeartWaveform({ heartRate, isAlert }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const infoRef = useRef({ heartRate, isAlert });

  // Update refs to avoid restarting the animation loop when props change
  useEffect(() => {
    infoRef.current = { heartRate, isAlert };
  }, [heartRate, isAlert]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width;
    let height = canvas.height;

    // Handle high DPI screens
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Set canvas buffer sizes
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = 110 * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `110px`;
        width = canvas.width;
        height = canvas.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // ECG signal generator helper
    let x = 0;
    const points: { x: number; y: number }[] = [];
    const maxPoints = 500;

    // Cycle tracking
    let cycleTime = 0;

    const tick = () => {
      const { heartRate: currentBpm, isAlert: activeAlert } = infoRef.current;
      
      // Calculate how many samples per beat.
      // E.g., at 60BPM, 1 beat per second. At 60fps, 60 frames per beat cycle.
      // Beats per frame = (BPM / 60) / 60 = BPM / 3600.
      const bpm = Math.max(30, Math.min(220, currentBpm));
      const bps = bpm / 60;
      const cycleDurationFrames = 60 / bps; // Frames per pulse cycle

      cycleTime += 1;
      if (cycleTime >= cycleDurationFrames) {
        cycleTime = 0; // Beat starts over
      }

      // Generate ECG-like shape based on normalized phase (0 to 1) of current heartbeat
      const phase = cycleTime / cycleDurationFrames;
      
      let ecgOffset = 0; // Normalized -1 to +1 value for deflection
      
      // ECG Wave Stages: P, Q, R, S, T
      // We compress the entire PQRST duration into the first 45% of the cardiac cycle,
      // and leave 55% as baseline flat line (diastole), exactly like a real heart!
      const activePhaseLimit = 0.45; 
      
      if (phase < activePhaseLimit) {
        const p = phase / activePhaseLimit; // Phase scaled to 0..1 for the active segment
        
        if (p < 0.15) {
          // P Wave (Atrial Depolarization) - Small positive hump
          const theta = (p / 0.15) * Math.PI;
          ecgOffset = Math.sin(theta) * 0.15;
        } else if (p < 0.22) {
          // Flat segment (PR interval)
          ecgOffset = 0;
        } else if (p < 0.27) {
          // Q Wave - Tiny dip before contraction
          const factor = (p - 0.22) / 0.05;
          ecgOffset = -factor * 0.25;
        } else if (p < 0.35) {
          // R Wave (Ventricular Depolarization) - Massive neon upward spike!
          const factor = (p - 0.27) / 0.08;
          if (factor < 0.5) {
            // Going up
            const ratio = factor / 0.5;
            ecgOffset = -0.25 + (ratio * 1.5); // Spikes up to +1.25
          } else {
            // Coming down rapidly
            const ratio = (factor - 0.5) / 0.5;
            ecgOffset = 1.25 - (ratio * 1.75); // Spikes down to -0.5
          }
        } else if (p < 0.39) {
          // S Wave - Pulling back from negative dip to baseline
          const factor = (p - 0.35) / 0.04;
          ecgOffset = -0.5 + factor * 0.5;
        } else if (p < 0.41) {
          // Flat ST segment
          ecgOffset = 0;
        } else {
          // T Wave (Ventricular Repolarization) - Medium rounded mountain
          const factor = (p - 0.41) / 0.09;
          const theta = factor * Math.PI;
          ecgOffset = Math.sin(theta) * 0.25;
        }
      } else {
        // Diastolic rest (Flatline)
        ecgOffset = 0;
      }

      // Add a tiny random thermal baseline noise to make it look like a real hardware ADC capture
      const highFreqNoise = (Math.random() - 0.5) * 0.02;
      ecgOffset += highFreqNoise;

      // Scale to canvas center
      const centerY = height / 2;
      const amplitude = height * 0.35; // Draw up to 35% of height either way
      const yValue = centerY - ecgOffset * amplitude;

      const increment = 2.5; // Controls horizontal squeeze (higher = wider)
      x += increment;

      // Wrap-around scanning line effect with a fading trailing edge
      if (x > width) {
        x = 0;
      }

      // Register the point
      const point = { x, y: yValue };
      
      // Update our rolling point cache
      points.push(point);
      if (points.length > width / increment + 5) {
        points.shift();
      }

      // DRAW PHASE
      ctx.clearRect(0, 0, width, height);

      // Background grids (resembling dynamic high-resolution ECG grid paper)
      ctx.strokeStyle = activeAlert ? 'rgba(239, 68, 68, 0.04)' : 'rgba(6, 182, 212, 0.04)';
      ctx.lineWidth = 1;
      
      // Minor vertical grid lines
      const step = 20 * window.devicePixelRatio;
      for (let gX = 0; gX < width; gX += step) {
        ctx.beginPath();
        ctx.moveTo(gX, 0);
        ctx.lineTo(gX, height);
        ctx.stroke();
      }
      
      // Minor horizontal grid lines
      for (let gY = 0; gY < height; gY += step) {
        ctx.beginPath();
        ctx.moveTo(0, gY);
        ctx.lineTo(width, gY);
        ctx.stroke();
      }

      // Draw horizontal baseline
      ctx.strokeStyle = activeAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Draw the scrolling pulse signal
      ctx.lineWidth = 2.5 * window.devicePixelRatio;
      ctx.lineLineCap = 'round';
      ctx.lineJoin = 'round';
      
      // We want to draw trace. To give it a real diagnostic sweeping laser vibe, 
      // we don't connect points right at the sweep gap.
      ctx.shadowBlur = 12;
      ctx.shadowColor = activeAlert ? '#ef4444' : '#22d3ee';

      ctx.beginPath();
      let first = true;

      // Group points into segments that don't cross the sweep head.
      // Since it's a sweeping trace, points with x values just ahead of the current x
      // should be omitted, creating a distinct "wiper" scan gap ahead of the beam!
      const gapWidth = 35 * window.devicePixelRatio;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        
        // Skip points inside the wiper gap
        const isInGap = pt.x > x && pt.x < x + gapWidth;
        if (isInGap) {
          first = true; // Force-break line drawing path
          continue;
        }

        // Draw point
        if (first) {
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          first = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }

        // Apply progressive fading based on age (distance behind wiper)
        // Or simply draw solid neon for clean, high-intensity hardware visuals
        let distanceAhead = pt.x - x;
        if (distanceAhead < 0) {
          distanceAhead += width;
        }
        
        // Fading tail effect
        const alpha = Math.max(0.15, 1 - (distanceAhead / width));
        ctx.strokeStyle = activeAlert 
          ? `rgba(239, 68, 68, ${alpha})` 
          : `rgba(34, 211, 238, ${alpha})`;
          
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
      }

      // Draw the glowing leading visual scanner "laser head"
      ctx.beginPath();
      ctx.arc(x, yValue, 4 * window.devicePixelRatio, 0, 2 * Math.PI);
      ctx.fillStyle = activeAlert ? '#ef4444' : '#22d3ee';
      ctx.shadowBlur = 20;
      ctx.shadowColor = activeAlert ? '#ef4444' : '#22d3ee';
      ctx.fill();

      // Reset shadows for next loop iterations
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-card-bg rounded-xl border border-border-dark p-1.5 shadow-inner">
      {/* Visual diagnostic markings */}
      <div className="absolute top-2 left-3 flex items-center space-x-1 text-[10px] font-mono select-none tracking-widest text-[#22d3ee]/60 uppercase">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />
        Live Waveform (PPG/ECG)
      </div>
      <div className="absolute top-2 right-3 font-mono text-[9px] text-[#22d3ee]/40 uppercase tracking-widest select-none">
        Lead II • {heartRate} BPM • AutoScale
      </div>

      <div className="relative w-full h-[110px]">
        <canvas ref={canvasRef} className="block w-full h-full" id="live-ecg-canvas" />
      </div>

      {/* Grid scale labels */}
      <div className="absolute bottom-1 right-2 flex items-center space-x-2 text-[8px] font-mono text-slate-500 uppercase tracking-wider select-none">
        <span>25 mm/s</span>
        <span>10 mm/mV</span>
      </div>
    </div>
  );
}
