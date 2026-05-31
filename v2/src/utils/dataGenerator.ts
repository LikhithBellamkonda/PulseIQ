/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SensorData } from '../types';

export type SimulationPreset = 'normal' | 'tachycardia' | 'bradycardia' | 'low_light' | 'high_glare';

export function getPresetDefaults(preset: SimulationPreset) {
  switch (preset) {
    case 'tachycardia':
      return { heartRate: 125, light: 50 };
    case 'bradycardia':
      return { heartRate: 46, light: 50 };
    case 'low_light':
      return { heartRate: 74, light: 5 };
    case 'high_glare':
      return { heartRate: 78, light: 95 };
    case 'normal':
    default:
      return { heartRate: 72, light: 50 };
  }
}

/**
 * Generates the next point in a realistic random-walk sensory stream
 */
export function generateNextReading(
  current: SensorData,
  preset: SimulationPreset,
  noiseScale = 1.0
): SensorData {
  const target = getPresetDefaults(preset);
  const now = Date.now();

  // Drift towards preset target with random fluctuations
  const hrDrift = (target.heartRate - current.heartRate) * 0.1;
  const hrRandom = (Math.random() - 0.5) * 3 * noiseScale;
  const nextHeartRate = Math.max(30, Math.min(220, Math.round(current.heartRate + hrDrift + hrRandom)));

  const lightDrift = (target.light - (current.light ?? 50)) * 0.15;
  const lightRandom = (Math.random() - 0.5) * 5 * noiseScale;
  const nextLight = Math.max(0, Math.min(100, Math.round((current.light ?? 50) + lightDrift + lightRandom)));

  // Simulate Battery slow drain (-0.005%)
  const curBattery = current.batteryLevel ?? 100;
  let nextBattery = curBattery - 0.005;
  if (nextBattery <= 5) nextBattery = 100;

  // Simulate signal strength index (RSSI dBm) random walk around -65dBm
  const rssiDrift = (-65 - (current.signalStrength ?? -65)) * 0.1;
  const rssiRandom = (Math.random() - 0.5) * 4;
  const nextRssi = Math.max(-95, Math.min(-35, Math.round((current.signalStrength ?? -65) + rssiDrift + rssiRandom)));

  return {
    heartRate: nextHeartRate,
    light: nextLight,
    timestamp: now,
    batteryLevel: Math.round(nextBattery * 100) / 100,
    signalStrength: nextRssi,
    humidity: current.humidity,
    weatherTemp: current.weatherTemp,
    weatherCity: current.weatherCity,
  };
}

export function generateInitialHistory(preset: SimulationPreset, count = 20): SensorData[] {
  let initial: SensorData = {
    heartRate: getPresetDefaults(preset).heartRate,
    light: getPresetDefaults(preset).light,
    timestamp: Date.now() - count * 2000,
    batteryLevel: 98.4,
    signalStrength: -62,
    humidity: 45,
    weatherTemp: 27.5,
    weatherCity: 'Hyderabad',
  };

  const history: SensorData[] = [];
  for (let i = 0; i < count; i++) {
    initial = generateNextReading(initial, preset);
    initial.timestamp = Date.now() - (count - i) * 2000;
    history.push({ ...initial });
  }

  return history;
}
