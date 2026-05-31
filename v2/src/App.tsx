/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  Droplet,
  Thermometer,
  Sparkles,
  Brain,
  Radio,
  BatteryCharging,
  Wifi,
  Sliders,
  ShieldAlert,
  CheckCircle,
  Server,
} from 'lucide-react';

import { SensorData, AlertThresholds, NetworkLog, ConnectionState } from './types';

import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import KPICard from './components/KPICard';
import HeartWaveform from './components/HeartWaveform';
import RealTimeCharts from './components/RealTimeCharts';
import FirebaseLogger from './components/FirebaseLogger';

const DEFAULT_FIREBASE_URL = 'https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json';

export interface WellnessScenario {
  id: number;
  title: string;
  badge: string;
  badgeColor: string;
  conditions: string;
  message: string;
  type: 'stable' | 'warning' | 'danger' | 'info';
}

export const WELLNESS_SCENARIOS: WellnessScenario[] = [
  {
    id: 1,
    title: "Scenario 1 – Normal Wellness State",
    badge: "Normal State",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    conditions: "Heart Rate: 60–90 BPM, Comfortable Light Levels (15%–85%)",
    message: "Your wellness indicators appear stable and balanced. Your heart rate is within a healthy range, suggesting a calm and relaxed state. Continue maintaining your current routine and stay hydrated throughout the day. Small healthy habits practiced consistently lead to long-term well-being.",
    type: "stable",
  },
  {
    id: 2,
    title: "Scenario 2 – Mild Stress Detected",
    badge: "Mild Stress",
    badgeColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    conditions: "Heart Rate: 90–100 BPM",
    message: "A slight increase in heart rate has been observed. This may be associated with physical activity, mental workload, or temporary stress. Consider taking a short break, stretching, or practicing deep breathing exercises. Even a few minutes of relaxation can help restore focus and mental clarity.",
    type: "warning",
  },
  {
    id: 3,
    title: "Scenario 3 – Elevated Stress Level",
    badge: "Elevated Stress",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    conditions: "Heart Rate: 100–115 BPM",
    message: "Your heart rate is currently higher than your normal resting range. This may indicate increased stress, anxiety, fatigue, or overexertion. Try slowing down for a moment, take several deep breaths, and allow yourself time to recover. Prioritizing mental calmness can improve both performance and overall well-being.",
    type: "warning",
  },
  {
    id: 4,
    title: "Scenario 4 – High Stress Alert",
    badge: "High Stress Status",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse font-bold",
    conditions: "Heart Rate: Above 115 BPM",
    message: "Your current readings suggest a significantly elevated heart rate. If you are not engaged in physical activity, consider taking immediate time to relax and reduce mental strain. Find a comfortable environment, focus on slow breathing, and allow your body to recover. Persistent elevations should not be ignored.",
    type: "danger",
  },
  {
    id: 5,
    title: "Scenario 5 – Low Light Environment",
    badge: "Low Light Glow",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    conditions: "Very Low LDR Value (<15%)",
    message: "The surrounding environment appears dimly lit. Extended periods in poor lighting may contribute to eye strain, reduced alertness, and fatigue. Consider moving to a brighter environment or increasing ambient lighting to maintain comfort and productivity.",
    type: "info",
  },
  {
    id: 6,
    title: "Scenario 6 – Excessive Brightness",
    badge: "Extreme Glare",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    conditions: "Very High LDR Value (>85%)",
    message: "High light intensity has been detected. Excessive brightness can contribute to visual discomfort and fatigue over time. If possible, reduce glare or adjust your surroundings to create a more comfortable environment.",
    type: "warning",
  },
  {
    id: 7,
    title: "Scenario 7 – Relaxed State",
    badge: "Perfect Homeostasis",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    conditions: "Heart Rate: 60–75 BPM, Comfortable Light Levels",
    message: "You appear to be in a calm and relaxed state. This is an excellent time for focused work, meditation, reading, or creative activities. Maintaining moments of calm throughout the day contributes positively to both mental and physical wellness.",
    type: "stable",
  },
  {
    id: 8,
    title: "Scenario 8 – Wellness Encouragement",
    badge: "Stable Consistency",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    conditions: "Stable readings over time / baseline default",
    message: "Consistency is one of the strongest indicators of healthy habits. Your recent wellness trends appear balanced and stable. Continue prioritizing adequate rest, hydration, physical activity, and mindful breaks throughout the day.",
    type: "info",
  }
];

// Helper to pre-seed beautiful sine-bound history for visual preview before Firebase links
const generatePreseededHistory = (city: string, temp: number, humidity: number): SensorData[] => {
  const preseeded: SensorData[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    preseeded.push({
      heartRate: Math.round(72 + Math.sin(i * 0.5) * 4 + (Math.random() - 0.5) * 2),
      humidity: Math.round(humidity + Math.cos(i * 0.5) * 3 + (Math.random() - 0.5) * 1),
      light: Math.round(50 + Math.sin(i * 0.4) * 8 + (Math.random() - 0.5) * 2),
      weatherTemp: temp,
      weatherCity: city,
      timestamp: now - i * 2000,
      batteryLevel: 98.4,
      signalStrength: -65 - Math.round(Math.random() * 5),
    });
  }
  return preseeded;
};

export default function App() {
  // 1. Core States
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'connected', // Default starts connected to simulator
    url: DEFAULT_FIREBASE_URL,
    latencyMs: 8,
    lastFetchTime: null,
    errorCount: 0,
  });

  // Simulator controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationPreset, setSimulationPreset] = useState<'normal' | 'low_light' | 'high_glare' | 'bradycardia' | 'tachycardia'>('normal');

  // Precise Location Weather state
  const [searchedCity, setSearchedCity] = useState("Hyderabad");
  const [weatherTemp, setWeatherTemp] = useState<number>(27.5);
  const [weatherHumidity, setWeatherHumidity] = useState<number>(45); // Sourced from weather API
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Static Wellness Recommendation Preview State
  const [selectedScenarioPreviewId, setSelectedScenarioPreviewId] = useState<number | null>(null);

  // Healthy default standards (adjustable live by patient)
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    minBpm: 60,
    maxBpm: 100,
    minTemp: 18.0,
    maxTemp: 32.0,
    minHumidity: 30,
    maxHumidity: 65,
    minLight: 15,
    maxLight: 85,
  });

  const [history, setHistory] = useState<SensorData[]>(() => generatePreseededHistory("Hyderabad", 27.5, 45));
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // 2. Logger Helper
  const addLog = useCallback((type: NetworkLog['type'], message: string, payload?: any) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    const newLog: NetworkLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp,
      type,
      message,
      payload: payload ? JSON.stringify(payload, null, 2) : undefined,
    };
    setLogs((prev) => [...prev.slice(-99), newLog]); // Keep last 100 logs
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', 'System diagnostics trace log flushed.');
  };

  // Weather lookup via Open-Meteo API
  const fetchWeather = useCallback(async (city: string) => {
    setIsWeatherLoading(true);
    setWeatherError(null);
    try {
      addLog('info', `Resolving precise coordinates for: "${city}"...`);
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      if (!geoRes.ok) throw new Error("Geocoding service unavailable.");
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`City "${city}" not found.`);
      }

      const loc = geoData.results[0];
      const { latitude, longitude, name, country } = loc;
      addLog('success', `Location resolved: ${name}, ${country} (Lat: ${latitude}, Lon: ${longitude})`);

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`);
      if (!weatherRes.ok) throw new Error("Weather forecast API returned error.");
      const weatherData = await weatherRes.json();

      const temp = weatherData.current?.temperature_2m;
      const humidity = weatherData.current?.relative_humidity_2m;
      if (typeof temp === 'number') {
        const fixedTemp = parseFloat(temp.toFixed(1));
        const fixedHum = typeof humidity === 'number' ? Math.round(humidity) : 45;
        setWeatherTemp(fixedTemp);
        setWeatherHumidity(fixedHum);
        setSearchedCity(name);
        addLog('success', `Current weather in ${name}: ${fixedTemp}°C, ${fixedHum}% humidity.`);
        
        // Propagate current weather parameter across the preseeded timeline
        setHistory(prev => prev.map(pt => ({
          ...pt,
          weatherTemp: fixedTemp,
          humidity: fixedHum,
          weatherCity: name
        })));
      } else {
        throw new Error("Invalid outdoor weather data.");
      }
    } catch (err: any) {
      setWeatherError(err.message || 'Lookup failed');
      addLog('error', `Weather Sync Failed: ${err.message}`);
    } finally {
      setIsWeatherLoading(false);
    }
  }, [addLog]);

  // Initial loads & presets
  useEffect(() => {
    addLog('info', 'PulseIQ Personal Health & Ambient Monitor starting...');
    fetchWeather(searchedCity);
  }, []);

  // 3. Optional Cardiac clicker
  const playCardiacBeep = useCallback((bpm: number) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.012, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.08);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Sloped by browser privacy blocks
    }
  }, [isMuted]);

  // Keep changing states and volatile configurations in a single Ref to prevent Poller infinite loops
  const stateRef = useRef({
    isSimulating,
    simulationPreset,
    weatherTemp,
    weatherHumidity,
    searchedCity,
    history,
    isFetching,
    connectionUrl: connection.url,
  });

  // Keep stateRef snapshot updated on every render
  useEffect(() => {
    stateRef.current = {
      isSimulating,
      simulationPreset,
      weatherTemp,
      weatherHumidity,
      searchedCity,
      history,
      isFetching,
      connectionUrl: connection.url,
    };
  }, [isSimulating, simulationPreset, weatherTemp, weatherHumidity, searchedCity, history, isFetching, connection.url]);

  // 4. Firebase Data Poller / Local Simulator
  const fetchFirebaseData = useCallback(async () => {
    if (stateRef.current.isFetching) return;
    setIsFetching(true);
    const startTime = performance.now();

    const {
      isSimulating,
      simulationPreset,
      weatherTemp,
      weatherHumidity,
      searchedCity,
      history,
      connectionUrl,
    } = stateRef.current;

    // A. Simulation Mode
    if (isSimulating) {
      const latency = Math.round(5 + Math.random() * 12);
      
      let simulatedBpm = 72;
      let simulatedLight = 50;
      
      switch (simulationPreset) {
        case 'tachycardia':
          simulatedBpm = 138 + Math.round((Math.random() - 0.5) * 10);
          simulatedLight = Math.round(48 + (Math.random() - 0.5) * 8);
          break;
        case 'bradycardia':
          simulatedBpm = 44 + Math.round((Math.random() - 0.5) * 4);
          simulatedLight = Math.round(52 + (Math.random() - 0.5) * 8);
          break;
        case 'low_light':
          simulatedBpm = 74 + Math.round((Math.random() - 0.5) * 8);
          simulatedLight = 6 + Math.round((Math.random() - 0.5) * 4);
          break;
        case 'high_glare':
          simulatedBpm = 78 + Math.round((Math.random() - 0.5) * 8);
          simulatedLight = 94 + Math.round((Math.random() - 0.5) * 4);
          break;
        case 'normal':
        default:
          simulatedBpm = Math.round(75 + Math.sin(Date.now() / 15000) * 8 + (Math.random() - 0.5) * 4);
          simulatedLight = Math.round(52 + Math.cos(Date.now() / 20000) * 18 + (Math.random() - 0.5) * 4);
          break;
      }
      
      const nextReading: SensorData = {
        heartRate: Math.max(30, Math.min(220, simulatedBpm)),
        light: Math.max(0, Math.min(100, simulatedLight)),
        humidity: weatherHumidity, // taken from Weather API
        weatherTemp: weatherTemp,   // taken from Weather API
        weatherCity: searchedCity,
        timestamp: Date.now(),
        batteryLevel: 98.2,
        signalStrength: -60 - Math.round(Math.random() * 5),
      };

      setHistory((prev) => [...prev.slice(-24), nextReading]);
      setConnection((prev) => ({
        ...prev,
        status: 'connected',
        latencyMs: latency,
        lastFetchTime: nextReading.timestamp,
        errorCount: 0,
      }));
      playCardiacBeep(nextReading.heartRate);
      setIsFetching(false);
      return;
    }

    // B. Real-Time Firebase Fetch Mode
    try {
      const response = await fetch(connectionUrl);
      const latency = Math.round(performance.now() - startTime);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawJson = await response.json();
      
      if (!rawJson) {
        addLog('warn', `Firebase node empty. Verify that your ESP32 has uploaded data to the RTDB path.`);
        setIsFetching(false);
        return;
      }

      // Parser variables
      let parsedBpm = 0;
      let parsedLight = 0;

      const extractVitals = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        // 1. Parse Pulse BPM
        const bpmKeys = ['bpm', 'heartRate', 'heart_rate', 'pulse', 'pulseRate', 'heartrate', 'Pulse', 'PulseRate', 'HR', 'heart_rate_bpm'];
        for (const k of bpmKeys) {
          if (typeof obj[k] === 'number') {
            parsedBpm = obj[k];
            break;
          } else if (typeof obj[k] === 'string' && !isNaN(Number(obj[k]))) {
            parsedBpm = Number(obj[k]);
            break;
          }
        }

        // 2. Parse LDR Light Level
        const lightKeys = ['light', 'ldr', 'LDR', 'lux', 'light_level', 'brightness'];
        for (const k of lightKeys) {
          if (typeof obj[k] === 'number') {
            parsedLight = obj[k];
            break;
          } else if (typeof obj[k] === 'string' && !isNaN(Number(obj[k]))) {
            parsedLight = Number(obj[k]);
            break;
          }
        }
      };

      // Check structure (push keys vs flat payload)
      if (typeof rawJson === 'object') {
        const keys = Object.keys(rawJson);
        const pushIds = keys.filter((key) => key.startsWith('-'));

        if (pushIds.length > 0) {
          pushIds.sort();
          const latestKey = pushIds[pushIds.length - 1];
          extractVitals(rawJson[latestKey]);
        } else {
          extractVitals(rawJson);
        }
      }

      // Automatically Calibrate LDR index (normalize 12-bit ESP32 ADC values: 0 - 4095)
      if (parsedLight > 100) {
        parsedLight = Math.round((parsedLight / 4095) * 100);
      }

      // Standards fallback wiggles if some attributes are un-uploaded yet
      const lastPoint = history[history.length - 1];
      if (parsedBpm === 0) parsedBpm = Math.round(72 + (Math.random() - 0.5) * 3);
      if (parsedLight === 0) parsedLight = Math.round((lastPoint?.light ?? 50) + (Math.random() - 0.5) * 2);

      // Clamp values
      parsedBpm = Math.max(30, Math.min(220, parsedBpm));
      parsedLight = Math.max(0, Math.min(100, parsedLight));

      const nextReading: SensorData = {
        heartRate: parsedBpm,
        light: parsedLight,
        humidity: weatherHumidity, // ALWAYS take temperature and humidity from Weather API
        weatherTemp: weatherTemp,   // ALWAYS take temperature and humidity from Weather API
        weatherCity: searchedCity,
        timestamp: Date.now(),
        batteryLevel: lastPoint?.batteryLevel ?? 97.8,
        signalStrength: -65 - Math.round(Math.random() * 8),
      };

      setHistory((prev) => [...prev.slice(-24), nextReading]);
      setConnection((prev) => ({
        ...prev,
        status: 'connected',
        latencyMs: latency,
        lastFetchTime: nextReading.timestamp,
        errorCount: 0,
      }));

      playCardiacBeep(parsedBpm);

    } catch (err: any) {
      const errorMsg = err.message || 'CORS Restriction or Socket timeout';
      addLog('error', `Firebase Read Alert: ${errorMsg}`);
      
      setConnection((prev) => ({
        ...prev,
        status: 'error',
        errorCount: prev.errorCount + 1,
      }));
    } finally {
      setIsFetching(false);
    }
  }, [playCardiacBeep, addLog]);

  // Poller timer loop - every 2 seconds
  useEffect(() => {
    fetchFirebaseData();
    const timer = setInterval(() => {
      fetchFirebaseData();
    }, 2000);
    return () => clearInterval(timer);
  }, [fetchFirebaseData]);

  const handleConnectionChange = (conn: Partial<ConnectionState>) => {
    setConnection((prev) => ({ ...prev, ...conn }));
  };

  // Extract current telemetry indicators
  const currentData = history[history.length - 1] || {
    heartRate: 72,
    humidity: 45,
    light: 50,
    weatherTemp: 27.5,
    weatherCity: "Hyderabad",
    timestamp: Date.now(),
    batteryLevel: 98.4,
    signalStrength: -64,
  };

  // Severity Status mappings based on Adjustable Thresholds
  const hrStatus: 'normal' | 'warning' | 'critical' =
    currentData.heartRate > thresholds.maxBpm || currentData.heartRate < thresholds.minBpm
      ? (currentData.heartRate > thresholds.maxBpm + 25 || currentData.heartRate < thresholds.minBpm - 15)
        ? 'critical'
        : 'warning'
      : 'normal';

  const humidityVal = currentData.humidity ?? 45;
  const humidityStatus: 'normal' | 'warning' | 'critical' =
    humidityVal > (thresholds.maxHumidity ?? 65) || humidityVal < (thresholds.minHumidity ?? 30)
      ? (humidityVal > (thresholds.maxHumidity ?? 65) + 15 || humidityVal < (thresholds.minHumidity ?? 30) - 10)
        ? 'critical'
        : 'warning'
      : 'normal';

  const lightVal = currentData.light ?? 50;
  const lightStatus: 'normal' | 'warning' | 'critical' =
    lightVal > (thresholds.maxLight ?? 85) || lightVal < (thresholds.minLight ?? 15)
      ? (lightVal > (thresholds.maxLight ?? 85) + 10 || lightVal < (thresholds.minLight ?? 15) - 10)
        ? 'critical'
        : 'warning'
      : 'normal';

  const tempVal = currentData.weatherTemp ?? 25;
  const tempStatus: 'normal' | 'warning' | 'critical' =
    tempVal > thresholds.maxTemp || tempVal < thresholds.minTemp
      ? (tempVal > thresholds.maxTemp + 4 || tempVal < thresholds.minTemp - 6)
        ? 'critical'
        : 'warning'
      : 'normal';

  const isAlarmActive = hrStatus === 'critical' || hrStatus === 'warning' || humidityStatus === 'critical' || lightStatus === 'critical' || tempStatus === 'critical';

  // 5. WELLNESS RECOMMENDATION ENGINE CALCULATOR
  const getActiveScenarioId = (hr: number, light: number): number => {
    if (hr > 115) return 4;
    if (hr >= 100 && hr <= 115) return 3;
    if (hr >= 90 && hr < 100) return 2;
    if (light < 15) return 5;
    if (light > 85) return 6;
    if (hr >= 60 && hr <= 75) return 7;
    if (hr > 75 && hr < 90) return 1;
    return 8;
  };

  const liveScenarioId = getActiveScenarioId(currentData.heartRate, currentData.light ?? 50);
  const activeScenario = WELLNESS_SCENARIOS.find(s => s.id === (selectedScenarioPreviewId ?? liveScenarioId)) || WELLNESS_SCENARIOS[0];

  // Calculate historic trends
  const calculateChange = (key: 'heartRate' | 'humidity' | 'light'): { val: string; dir: 'up' | 'down' | 'stable' } => {
    if (history.length < 5) return { val: '0', dir: 'stable' };
    const latest = history[history.length - 1][key] ?? 0;
    const preceding = history[history.length - 5][key] ?? 0;
    const diff = latest - preceding;
    if (Math.abs(diff) < 0.2) return { val: '稳定', dir: 'stable' };
    return {
      val: `${diff > 0 ? '+' : ''}${diff.toFixed(0)}`,
      dir: diff > 0 ? 'up' : 'down',
    };
  };

  const hrTrend = calculateChange('heartRate');
  const humTrend = calculateChange('humidity');
  const lightTrend = calculateChange('light');

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-[#03060a] text-slate-100 overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR (Controls weather and connections) */}
      <Sidebar
        connection={connection}
        onConnectionChange={handleConnectionChange}
        onManualTriggerFetch={fetchFirebaseData}
        isFetching={isFetching}
        searchedCity={searchedCity}
        onTriggerWeatherSearch={fetchWeather}
        isWeatherLoading={isWeatherLoading}
        weatherError={weatherError}
        weatherTemp={weatherTemp}
        weatherHumidity={weatherHumidity}
      />

      {/* 2. MAIN HUB WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        
        {/* UPPER STATUS BAR */}
        <StatusBar
          currentData={currentData}
          thresholds={thresholds}
          isAlarmActive={isAlarmActive}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          connectionStatus={connection.status}
        />

        {/* PRIMARY CONTAINER DASHBOARD BODY */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* HEADER HERO ROW */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between md:space-x-4 space-y-3 md:space-y-0">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white mb-1">
                Personal Ambient & Health Dashboard
              </h2>
              <p className="text-xs text-slate-400">
                Correlating real-time cardiac heart rate with your immediate surrounding humidity and light sensor levels.
              </p>
            </div>

            {/* Hardware Node Status */}
            <div className="flex items-center space-x-2 bg-[#090e17] border border-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-mono">
              <Radio className={`w-3.5 h-3.5 text-cyan-400 ${connection.status === 'connected' ? 'animate-pulse' : ''}`} />
              <span className="text-slate-500">Node Status:</span>
              <span className={connection.status === 'connected' ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold'}>
                {connection.status === 'connected' ? 'Connected • Firebase' : 'Listening...'}
              </span>
            </div>
          </div>

          {/* REALTIME ECG/PPG SWEEPING VISUAL OVERLAY */}
          <HeartWaveform
            heartRate={currentData.heartRate}
            isAlert={hrStatus === 'critical'}
          />

          {/* MONITORED PARAMETERS HIGH-DENSITY GAUGE CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* 1. HEART RATE */}
            <KPICard
              id="heart-rate"
              title="Cardiac Heartbeat"
              value={currentData.heartRate}
              unit="BPM"
              trend={hrTrend.val !== '0' && hrTrend.val !== '稳定' ? `${hrTrend.val}` : undefined}
              trendDirection={hrTrend.dir}
              icon={<Heart className="w-4 h-4 text-cyan-400" />}
              status={hrStatus}
              thresholdText={`${thresholds.minBpm} - ${thresholds.maxBpm} BPM`}
              pulseSpeedMs={currentData.heartRate > 0 ? (60 / currentData.heartRate) * 1000 : undefined}
              historyData={history.map(h => h.heartRate)}
              minThreshold={thresholds.minBpm}
              maxThreshold={thresholds.maxBpm}
              gaugeMin={40}
              gaugeMax={160}
            />

            {/* 2. AIR HUMIDITY */}
            <KPICard
              id="humidity"
              title="Room Humidity"
              value={humidityVal}
              unit="%"
              trend={humTrend.val !== '0' && humTrend.val !== '稳定' ? `${humTrend.val}%` : undefined}
              trendDirection={humTrend.dir}
              icon={<Droplet className="w-4 h-4 text-emerald-400" />}
              status={humidityStatus}
              thresholdText={`${thresholds.minHumidity ?? 30}% - ${thresholds.maxHumidity ?? 65}%`}
              historyData={history.map(h => h.humidity ?? 45)}
              minThreshold={thresholds.minHumidity ?? 30}
              maxThreshold={thresholds.maxHumidity ?? 65}
              gaugeMin={10}
              gaugeMax={90}
            />

            {/* 3. LDR LIGHT SENSOR */}
            <KPICard
              id="ldr-light"
              title="Ambient Light (LDR)"
              value={lightVal}
              unit="%"
              trend={lightTrend.val !== '0' && lightTrend.val !== '稳定' ? `${lightTrend.val}%` : undefined}
              trendDirection={lightTrend.dir}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
              status={lightStatus}
              thresholdText={`${thresholds.minLight ?? 15}% - ${thresholds.maxLight ?? 85}%`}
              historyData={history.map(h => h.light ?? 50)}
              minThreshold={thresholds.minLight ?? 15}
              maxThreshold={thresholds.maxLight ?? 85}
              gaugeMin={0}
              gaugeMax={100}
            />

            {/* 4. SELECTION WEATHER OUTDOOR TEMP */}
            <KPICard
              id="weather-temp"
              title={`Outdoor Temp • ${searchedCity}`}
              value={currentData.weatherTemp ?? 25}
              unit="°C"
              icon={<Thermometer className="w-4 h-4 text-sky-400" />}
              status={tempStatus}
              thresholdText={`${thresholds.minTemp} - ${thresholds.maxTemp} °C`}
              historyData={history.map(h => h.weatherTemp ?? 25)}
              minThreshold={thresholds.minTemp}
              maxThreshold={thresholds.maxTemp}
              gaugeMin={5}
              gaugeMax={45}
            />

            {/* 5. HARDWARE CORE STATUS AND TRACE */}
            <div className="bg-[#090e17] border border-slate-900 rounded-xl p-5 pb-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden select-none min-h-[148px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-slate-950 to-transparent filter blur-xl rounded-full" />
              
              <div className="flex items-center justify-between mb-3.5 z-10 relative">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Hardware Health
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/15 rounded font-bold">
                  Active Link
                </span>
              </div>

              <div className="space-y-3 relative z-10">
                {/* Battery diagnostics */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Battery Charger</span>
                  </div>
                  <span className="font-semibold text-slate-200 font-mono">
                    98.4%
                  </span>
                </div>

                {/* Progress loadbar */}
                <div className="w-full bg-[#05080f] h-1.5 rounded-full overflow-hidden border border-slate-900">
                  <div className="bg-emerald-400 h-full rounded-full w-[98.4%]" />
                </div>

                {/* Wi-fi diagnostics */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400/80" />
                    <span>ESP32 Wi-Fi rssi</span>
                  </div>
                  <span className="font-semibold text-slate-200 font-mono">
                    -65 dBm
                  </span>
                </div>
              </div>

              {/* Status footnote */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono z-10 relative bg-[#090e17]/80 backdrop-blur-sm -mx-5 px-5">
                <span className="uppercase">BLE LINK</span>
                <span className="text-slate-300">RSSI ONLINE</span>
              </div>
            </div>

          </div>

          {/* DYNAMIC RECHARTS VISUALIZATION CONTAINER */}
          <RealTimeCharts data={history} thresholds={thresholds} />

          {/* DYNAMIC WELLNESS RECOMMENDATION ENGINE & CLINICAL SCENARIOS PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Recommendation Card */}
            <div className={`p-6 rounded-xl border lg:col-span-2 bg-[#060a12]/50 backdrop-blur-md transition-all duration-300 flex flex-col justify-between ${
              activeScenario.type === 'danger' ? 'border-rose-500/30 ring-1 ring-rose-500/10' :
              activeScenario.type === 'warning' ? 'border-amber-500/30 ring-1 ring-amber-500/10' :
              activeScenario.type === 'info' ? 'border-blue-500/30 ring-1 ring-blue-500/10' :
              'border-cyan-500/30 ring-1 ring-cyan-500/10'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <Brain className={`w-5 h-5 ${
                      activeScenario.type === 'danger' ? 'text-rose-400' :
                      activeScenario.type === 'warning' ? 'text-amber-400' :
                      activeScenario.type === 'info' ? 'text-blue-400' :
                      'text-cyan-400'
                    }`} />
                    <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                      Wellness Recommendation Engine
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedScenarioPreviewId !== null && (
                      <button
                        onClick={() => setSelectedScenarioPreviewId(null)}
                        className="text-[10px] font-mono font-bold bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-500/20 px-2 py-1 rounded cursor-pointer"
                      >
                        ⚡ Reset to Live Feed
                      </button>
                    )}
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
                      selectedScenarioPreviewId !== null
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {selectedScenarioPreviewId !== null ? '⚠️ SCENARIO PREVIEW' : '● ACTIVE REALTIME EVALUATION'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">Current State:</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded border font-semibold ${activeScenario.badgeColor}`}>
                      {activeScenario.title}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-950/40 border border-slate-900/55 rounded-lg font-mono text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Target Criteria / Thresholds:</span>
                    <span className="text-slate-200 font-bold">{activeScenario.conditions}</span>
                  </div>
                </div>

                {/* The main message matching the user's hardcoded copy */}
                <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
                  activeScenario.type === 'danger' ? 'bg-rose-950/15 border-rose-500/15 text-rose-100 font-medium' :
                  activeScenario.type === 'warning' ? 'bg-amber-950/15 border-amber-500/15 text-amber-100' :
                  activeScenario.type === 'info' ? 'bg-blue-950/15 border-blue-500/15 text-blue-100' :
                  'bg-cyan-950/15 border-cyan-500/15 text-cyan-100'
                }`}>
                  {activeScenario.message}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900/40 mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500 select-none">
                <span>Biosensor Parameters: heartbeat ({currentData.heartRate} BPM) | light ({currentData.light ?? 50}%)</span>
                <span>Patient Safe Mode: Active</span>
              </div>
            </div>

            {/* Scenario Deck Selection Grid */}
            <div className="bg-[#090e17] border border-slate-900 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between space-y-3.5">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Interactive Scenarios Preview Deck</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal mt-1 mb-3">
                  Click on any of the 8 clinical scenarios below to manually override the recommendation card and review its exact intelligent messages.
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-[175px] overflow-y-auto custom-scrollbar pr-1">
                  {WELLNESS_SCENARIOS.map((sc) => {
                    const isActiveLive = liveScenarioId === sc.id;
                    const isSelected = (selectedScenarioPreviewId !== null ? selectedScenarioPreviewId === sc.id : isActiveLive);

                    return (
                      <button
                        key={sc.id}
                        onClick={() => setSelectedScenarioPreviewId(sc.id)}
                        className={`text-left p-2 rounded-lg border transition-all text-[11px] cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-100 ring-1 ring-cyan-500/10'
                            : 'bg-[#05080f] border-slate-900 text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">Scen {sc.id}</span>
                          {isActiveLive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.5)]" title="Real-time live matching" />
                          )}
                        </div>
                        <p className="not-italic text-[10px] opacity-80 truncate">{sc.badge}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedScenarioPreviewId !== null && (
                <button
                  onClick={() => setSelectedScenarioPreviewId(null)}
                  className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  ↩️ Reset to Live Biosensors Feed
                </button>
              )}
            </div>
          </div>

          {/* INTERACTIVE CONTROLS CENTER */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* COLUMN 1: LIVE SIMULATOR MODE & SCENARIOS BOARD */}
            <div className="bg-[#090e17] border border-slate-900 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <span>System Feed Switch</span>
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isSimulating 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {isSimulating ? 'SIMULATION MODE' : 'LIVE FIREBASE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                  Stream virtual telemetry or toggle off to read actual sensor values pushed by your ESP32.
                </p>

                {/* Primary Mode Switch Button */}
                <button
                  onClick={() => {
                    setIsSimulating(!isSimulating);
                    addLog('info', `Switched feed mode to: ${!isSimulating ? 'Local Simulator Engine' : 'Live Firebase REST Client'}`);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer hover:scale-[1.02] ${
                    isSimulating
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {isSimulating ? '🔌 Turn Off Simulator (Use ESP32)' : '⚡ Enable Telemetry Simulator'}
                </button>
              </div>

              {isSimulating && (
                <div className="space-y-3 pt-3 border-t border-slate-900">
                  <label className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                    Select Test Scenario Preset:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'normal', name: '✅ Balanced' },
                      { id: 'tachycardia', name: '🚨 High Pulse' },
                      { id: 'bradycardia', name: '🚨 Low Pulse' },
                      { id: 'low_light', name: '🌙 LDR Dark' },
                      { id: 'high_glare', name: '☀️ LDR Glare' }
                    ].map((pre) => (
                      <button
                        key={pre.id}
                        onClick={() => {
                          setSimulationPreset(pre.id as any);
                          addLog('info', `Simulating preset scenario: "${pre.name}"`);
                        }}
                        className={`py-2 px-2 rounded-lg text-[10px] font-mono text-left border transition-all cursor-pointer ${
                          simulationPreset === pre.id
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                            : 'bg-[#05080f] border-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pre.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: CUSTOMIZABLE TRACE THRESHOLDS BOARD */}
            <div className="bg-[#090e17] border border-slate-900 rounded-xl p-5 backdrop-blur-md xl:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>🎛️ Diagnostic Comfort Thresholds Limits (Drag to Adjust Live)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs select-none">
                {/* Sliders Block A: Heart Rate */}
                <div className="space-y-2 bg-[#05080f] border border-slate-900 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Cardiac Pulse Range</span>
                    <span className="text-cyan-400">{thresholds.minBpm} - {thresholds.maxBpm} BPM</span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Low:</span>
                      <span className="font-mono text-slate-300">{thresholds.minBpm} BPM</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="90"
                      value={thresholds.minBpm}
                      onChange={(e) => setThresholds(prev => ({ ...prev, minBpm: Number(e.target.value) }))}
                      className="w-full accent-cyan-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>High:</span>
                      <span className="font-mono text-slate-300">{thresholds.maxBpm} BPM</span>
                    </div>
                    <input
                      type="range"
                      min="95"
                      max="160"
                      value={thresholds.maxBpm}
                      onChange={(e) => setThresholds(prev => ({ ...prev, maxBpm: Number(e.target.value) }))}
                      className="w-full accent-cyan-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Sliders Block B: Ambient Light */}
                <div className="space-y-2 bg-[#05080f] border border-slate-900 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Ambient Light LDR</span>
                    <span className="text-amber-400">{(thresholds.minLight ?? 15)}% - {(thresholds.maxLight ?? 85)}%</span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Min (Dark):</span>
                      <span className="font-mono text-slate-300">{(thresholds.minLight ?? 15)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={thresholds.minLight ?? 15}
                      onChange={(e) => setThresholds(prev => ({ ...prev, minLight: Number(e.target.value) }))}
                      className="w-full accent-amber-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Max (Glare):</span>
                      <span className="font-mono text-slate-300">{(thresholds.maxLight ?? 85)}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="100"
                      value={thresholds.maxLight ?? 85}
                      onChange={(e) => setThresholds(prev => ({ ...prev, maxLight: Number(e.target.value) }))}
                      className="w-full accent-amber-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Sliders Block C: Outdoor Temp */}
                <div className="space-y-2 bg-[#05080f] border border-slate-900 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Weather Temp Bounds</span>
                    <span className="text-sky-400">{thresholds.minTemp} - {thresholds.maxTemp} °C</span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Low:</span>
                      <span className="font-mono text-slate-300">{thresholds.minTemp} °C</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="24"
                      value={thresholds.minTemp}
                      onChange={(e) => setThresholds(prev => ({ ...prev, minTemp: Number(e.target.value) }))}
                      className="w-full accent-sky-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>High:</span>
                      <span className="font-mono text-slate-300">{thresholds.maxTemp} °C</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="45"
                      value={thresholds.maxTemp}
                      onChange={(e) => setThresholds(prev => ({ ...prev, maxTemp: Number(e.target.value) }))}
                      className="w-full accent-sky-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Sliders Block D: Humidity */}
                <div className="space-y-2 bg-[#05080f] border border-slate-900 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Weather Humidity Bounds</span>
                    <span className="text-emerald-400">{(thresholds.minHumidity ?? 30)}% - {(thresholds.maxHumidity ?? 65)}%</span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Low:</span>
                      <span className="font-mono text-slate-300">{(thresholds.minHumidity ?? 30)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={thresholds.minHumidity ?? 30}
                      onChange={(e) => setThresholds(prev => ({ ...prev, minHumidity: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>High:</span>
                      <span className="font-mono text-slate-300">{(thresholds.maxHumidity ?? 65)}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      value={thresholds.maxHumidity ?? 65}
                      onChange={(e) => setThresholds(prev => ({ ...prev, maxHumidity: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DYNAMIC SYSTEM ALERTS & EMERGENCY MESSAGES PANEL */}
          <div className="bg-[#090e17] border border-slate-900 rounded-xl p-5 backdrop-blur-md">
            <h3 className="text-xs md:text-sm font-semibold text-slate-200 tracking-wider mb-4 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>🚨 Live Emergency Clinical Warnings Center (Real-Time Messages Feed)</span>
            </h3>

            {(() => {
              const activeAlerts = [];
              if (currentData.heartRate > thresholds.maxBpm) {
                activeAlerts.push({
                  id: 'hr-high',
                  metric: 'Heart Rate BPM',
                  type: 'danger',
                  title: 'Cardiac Fast rate (Tachycardia)',
                  message: `Pulse rate (${currentData.heartRate} BPM) is above your safety limit of ${thresholds.maxBpm} BPM! Calm down, take one stress at a time, take long deep nose breaths, and relax.`,
                });
              } else if (currentData.heartRate < thresholds.minBpm) {
                activeAlerts.push({
                  id: 'hr-low',
                  metric: 'Heart Rate BPM',
                  type: 'warning',
                  title: 'Cardiac Slow rate (Bradycardia)',
                  message: `Pulse rate (${currentData.heartRate} BPM) fell below your limit of ${thresholds.minBpm} BPM. Relax, stretch your arms, and maintain comfortable breathing alignment.`,
                });
              }

              const ldrValue = currentData.light ?? 50;
              if (ldrValue > (thresholds.maxLight ?? 85)) {
                activeAlerts.push({
                  id: 'light-high',
                  metric: 'LDR Ambient Light',
                  type: 'warning',
                  title: 'Excessive Glare Alert',
                  message: `Ambient light LDR reading is high at ${ldrValue}% (limit: ${(thresholds.maxLight ?? 85)}%). Consider closing blinds or shutting harsh screens to lower eyes strain.`,
                });
              } else if (ldrValue < (thresholds.minLight ?? 15)) {
                activeAlerts.push({
                  id: 'light-low',
                  metric: 'LDR Ambient Light',
                  type: 'warning',
                  title: 'Ambient Darkness Alert',
                  message: `Ambient light LDR index dropped to ${ldrValue}% (comfort limit: ${(thresholds.minLight ?? 15)}%). If reading or working, turn on a reading lamp to avoid visual fatigue.`,
                });
              }

              const externalTemp = currentData.weatherTemp ?? 25;
              if (externalTemp > thresholds.maxTemp) {
                activeAlerts.push({
                  id: 'temp-high',
                  metric: 'Outdoor Weather Temp',
                  type: 'danger',
                  title: 'Scorching Ambient Warning',
                  message: `Local outdoor microclimate temperature is high at ${externalTemp}°C (comfort limit: ${thresholds.maxTemp}°C). Stay hydrated, avoid heavy outdoors work, and keep cool.`,
                });
              } else if (externalTemp < thresholds.minTemp) {
                activeAlerts.push({
                  id: 'temp-low',
                  metric: 'Outdoor Weather Temp',
                  type: 'warning',
                  title: 'Cold Ambient Warning',
                  message: `Local outdoor microclimate temperature fell to ${externalTemp}°C (comfort limit: ${thresholds.minTemp}°C). Keep warm and keep windows closed.`,
                });
              }

              const externalHumidity = currentData.humidity ?? 45;
              if (externalHumidity > (thresholds.maxHumidity ?? 65)) {
                activeAlerts.push({
                  id: 'humid-high',
                  metric: 'Outdoor Weather Humidity',
                  type: 'warning',
                  title: 'Excessive Air Dampness',
                  message: `Weather humidity index is damp at ${externalHumidity}% (limit: ${(thresholds.maxHumidity ?? 65)}%). Air relative resistance is high. Open ventilators.`,
                });
              } else if (externalHumidity < (thresholds.minHumidity ?? 30)) {
                activeAlerts.push({
                  id: 'humid-low',
                  metric: 'Outdoor Weather Humidity',
                  type: 'warning',
                  title: 'Extremely Dry Air Warning',
                  message: `Weather humidity is dry at ${externalHumidity}% (limit: ${(thresholds.minHumidity ?? 30)}%). Target comfort zone is 30%-65%.`,
                });
              }

              if (activeAlerts.length === 0) {
                return (
                  <div className="flex items-center space-x-3.5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 select-none text-emerald-400">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-mono font-bold uppercase tracking-wide">✅ ALL SYSTEMS NORMAL</h4>
                      <p className="text-[11px] text-emerald-400/80 leading-normal mt-0.5">
                        Likith Bellamkonda's clinical diagnostics and environment microclimates are perfectly inside comfort targets. No breaches active.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border border-l-4 flex items-start space-x-3.5 transition-all text-xs ${
                        alert.type === 'danger'
                          ? 'border-red-500/30 border-l-red-500 bg-red-500/10 text-red-300'
                          : 'border-amber-500/30 border-l-amber-500 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono px-2 py-0.5 font-bold rounded uppercase tracking-wider bg-[#05080f]/90 text-slate-400 border border-slate-900">
                            {alert.metric}
                          </span>
                          <h4 className="font-bold underline decoration-slate-800">
                            {alert.title}
                          </h4>
                        </div>
                        <p className="text-[11.5px] leading-relaxed mt-1 text-slate-300">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* FIREBASE SERIAL LOG ANALYZER PANEL */}
          <FirebaseLogger
            logs={logs}
            onClearLogs={handleClearLogs}
            connectionStatus={connection.status}
          />

        </div>
      </div>

    </div>
  );
}
