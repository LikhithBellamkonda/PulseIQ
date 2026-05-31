/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SensorData {
  heartRate: number;      // BPM (pulse heartbeat)
  timestamp: number;     // Unix timestamp (ms)
  batteryLevel?: number;  // Optional percentage (device health)
  signalStrength?: number;// dBm (RSSI)
  humidity?: number;      // Environment Relative Humidity % (from Weather API)
  light?: number;         // Ambient Light Intensity LDR % (from ESP32 Firebase)
  weatherTemp?: number;   // Outdoor Temperature from Searched Weather API (°C)
  weatherCity?: string;   // Searched location city name
}

export interface AlertThresholds {
  minBpm: number;
  maxBpm: number;
  minTemp: number;
  maxTemp: number;
  minHumidity?: number;
  maxHumidity?: number;
  minLight?: number;
  maxLight?: number;
}

export interface NetworkLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
  payload?: string;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'simulating';
  url: string;
  latencyMs: number;
  lastFetchTime: number | null;
  errorCount: number;
}
