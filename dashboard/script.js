// script.js
const { useState, useEffect, useMemo } = React;
const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } = Recharts;

// ==========================================
// 1. SERVICES & API CONFIGURATIONS
// ==========================================
// Integrated user ThingSpeak details:
const CHANNEL_ID = "3397706";
const READ_API_KEY = "OMSG4XBQ1WY507SE";

// ==========================================
// 2. ML REGRESSION MODELS & CONFIGS
// ==========================================
// Calibrated from Random Forest selection offline pipeline:
const ML_CONFIG = {
  intercept: 12.591163916709874,
  weight_heart_rate: 0.5472341139459247,
  weight_light: -0.009763119467582022,
  t1: 21.552408399524374,       // Relaxed / Normal Boundary
  t2: 36.87471894101088,        // Normal / Mild Stress Boundary
  t3: 53.205473929866045,       // Mild / Moderate Stress Boundary
  t4: 70.91952364267055         // Moderate / High Stress Boundary
};

// ==========================================
// 3. TELEMETRY STREAMS & HOOKS
// ==========================================

/**
 * Custom hook to securely poll from ThingSpeak JSON feeds.
 * Retains history of previous 40 data points for active charting.
 */
const useSensorStream = () => {
  const [data, setData] = useState({ series: [], latest: { hr: 75, light: 2000, time: "--" } });
  
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const endpoint = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=40`;
        const res = await fetch(endpoint);
        const json = await res.json();
        
        if (json.feeds && json.feeds.length > 0) {
          const series = json.feeds.map(feed => {
            const hrVal = parseInt(feed.field1);
            const lightVal = parseInt(feed.field2);
            return {
              time: new Date(feed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              hr: isNaN(hrVal) || hrVal <= 0 ? 72 : hrVal,
              light: isNaN(lightVal) ? 2200 : lightVal
            };
          });
          
          const latestFeed = json.feeds[json.feeds.length - 1];
          const hrVal = parseInt(latestFeed.field1);
          const lightVal = parseInt(latestFeed.field2);
          
          setData({
            series,
            latest: {
              hr: isNaN(hrVal) || hrVal <= 0 ? 72 : hrVal,
              light: isNaN(lightVal) ? 2200 : lightVal,
              time: new Date(latestFeed.created_at).toLocaleString()
            }
          });
        }
      } catch (err) {
        console.error("[ERROR] ThingSpeak Polling Failed: ", err);
      }
    };

    fetchStream();
    const timer = setInterval(fetchStream, 15000); // Polls every 15s (ThingSpeak Limit)
    return () => clearInterval(timer);
  }, []);

  return data;
};

/**
 * Custom hook that fetches temperature & relative humidity from the Open-Meteo API
 * using browser-geocoded coordinates for a highly professional ambient context.
 */
const useWeather = (locationName) => {
  const [weather, setWeather] = useState({ temp: "--", hum: "--" });

  useEffect(() => {
    if (!locationName) return;
    const fetchWeather = async () => {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude } = geoData.results[0];
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
          const wRes = await fetch(weatherUrl);
          const wData = await wRes.json();
          
          if (wData.current) {
            setWeather({
              temp: Math.round(wData.current.temperature_2m),
              hum: Math.round(wData.current.relative_humidity_2m)
            });
          }
        }
      } catch (err) {
        console.error("[ERROR] Weather Sync Failed: ", err);
      }
    };

    fetchWeather();
    const wTimer = setInterval(fetchWeather, 300000); // Syncs every 5 minutes
    return () => clearInterval(wTimer);
  }, [locationName]);

  return weather;
};

// ==========================================
// 4. UI HELPER ASSETS
// ==========================================
const icons = {
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  temp: "M14 4a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0z",
  droplet: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  wifi: "M5 12.55a11 11 0 0 1 14 0M2 8.82a16 16 0 0 1 20 0M8.5 16.43a6 6 0 0 1 7 0M12 20h.01",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  dash: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z"
};

// ==========================================
// 5. ATOMIC COMPONENT VIEWS
// ==========================================

const Icon = ({ d, size = 18, className = "" }) => (
  <svg className={`inline-block ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}></path>
  </svg>
);

const Sidebar = ({ active, setActive }) => (
  <aside className="w-64 h-full hidden lg:flex flex-col justify-between p-5 border-r border-[rgba(255,255,255,0.05)] bg-[#03050c] fixed left-0 top-0 z-20">
    <div>
      <div className="flex items-center gap-3 px-2 py-4 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-emerald-500 flex items-center justify-center font-bold text-black text-sm tracking-wide">P</div>
        <div>
          <h2 className="font-bold text-[16px] tracking-tight leading-none text-white">PulseIQ</h2>
          <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase leading-none mt-1 inline-block">v3 ML Engine</span>
        </div>
      </div>
      
      <nav className="space-y-1">
        <div className={`sidebar-link ${active === "dashboard" ? "active" : ""}`} onClick={() => setActive("dashboard")}>
          <Icon d={icons.dash}/>
          <span>Live Cockpit</span>
        </div>
        <div className={`sidebar-link ${active === "history" ? "active" : ""}`} onClick={() => setActive("history")}>
          <Icon d={icons.history}/>
          <span>Trend Analytics</span>
        </div>
      </nav>
    </div>
    
    <div className="glass p-4 rounded-xl border-emerald-500/20 bg-emerald-950/5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-led"></div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Node Status</span>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-400">ESP32 telemetry is active. Streams variables over HTTPS uplink.</p>
    </div>
  </aside>
);

const TopBar = ({ location, setLocation }) => {
  const [val, setVal] = useState("");
  return (
    <header className="h-16 border-b border-[rgba(255,255,255,0.05)] bg-[#03050c]/80 backdrop-filter backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-10 lg:ml-64">
      <div className="flex items-center gap-2">
        <Icon d={icons.wifi} className="text-emerald-400 pulse-led"/>
        <span className="text-[12px] font-bold tracking-wider text-slate-400 uppercase">ThingSpeak Secure Link</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <input type="text" placeholder="Sync Location..." value={val} onChange={e=>setVal(e.target.value)}
                 onKeyDown={e=>e.key==="Enter" && val && setLocation(val)}
                 className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[12px] pl-8 focus:outline-none focus:border-cyan-400 text-white w-40 transition-all duration-200 focus:w-48"/>
          <Icon d={icons.search} size={14} className="absolute left-2.5 top-2.5 text-slate-500"/>
        </div>
      </div>
    </header>
  );
};

const KPI = ({ title, value, unit, color, status, sparkline, icon }) => {
  const statusColor = status === "crit" ? "text-red-400 bg-red-950/20 border-red-500/30" :
                      status === "warn" ? "text-yellow-400 bg-yellow-950/20 border-yellow-500/30" :
                      "text-cyan-400 bg-cyan-950/20 border-cyan-500/30";
  return (
    <div className="glass p-5 flex flex-col justify-between relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="text-[28px] font-bold mt-1 tracking-tight leading-none text-white">
            {value} <span className="text-[14px] font-normal text-slate-500">{unit}</span>
          </div>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${statusColor}`}>
          <Icon d={icon}/>
        </div>
      </div>
      
      {sparkline && sparkline.length > 0 && (
        <div className="h-10 mt-4 overflow-hidden -mx-5 -mb-5 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color === "red" ? "#ef4444" : color === "yellow" ? "#f59e0b" : "#22d3ee"} stopOpacity={0.25}/>
                  <stop offset="100%" stopColor={color === "red" ? "#ef4444" : color === "yellow" ? "#f59e0b" : "#22d3ee"} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color === "red" ? "#ef4444" : color === "yellow" ? "#f59e0b" : "#22d3ee"} strokeWidth={1.5} fill={`url(#grad-${color})` } dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. CHARTS & DATA VISUALIZATIONS
// ==========================================

const CustomTooltip = ({ active, payload, units }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 border-white/10 shadow-2xl text-[12px] bg-[#0c1020]/90">
        <p className="font-bold text-white mb-2">{payload[0].payload.time}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.stroke }} className="font-medium mt-1">
            {item.name}: <span className="font-bold text-white">{item.value}{units[item.dataKey]}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const HeartRateChart = ({ data }) => (
  <div className="glass p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon d={icons.heart} className="text-cyan-400"/>
      <h3 className="font-semibold text-[14px]">Heart Rate Pulse History</h3>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data.slice(-25)}>
        <defs>
          <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2}/>
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a1f29" vertical={false}/>
        <XAxis dataKey="time" stroke="#1f2530" tick={{fill:"#6b7689", fontSize:9}}/>
        <YAxis domain={[40, 150]} stroke="#1f2530" tick={{fill:"#6b7689", fontSize:9}}/>
        <Tooltip content={<CustomTooltip units={{hr:" bpm"}}/>}/>
        <Area type="monotone" name="Heart Rate" dataKey="hr" stroke="#22d3ee" strokeWidth={2} fill="url(#hrGrad)" dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const LightLevelChart = ({ data }) => (
  <div className="glass p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon d={icons.sun} className="text-yellow-400"/>
      <h3 className="font-semibold text-[14px]">Ambient Light (LDR Sensor)</h3>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data.slice(-25)}>
        <defs>
          <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2}/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a1f29" vertical={false}/>
        <XAxis dataKey="time" stroke="#1f2530" tick={{fill:"#6b7689", fontSize:9}}/>
        <YAxis domain={[0, 4095]} stroke="#1f2530" tick={{fill:"#6b7689", fontSize:9}}/>
        <Tooltip content={<CustomTooltip units={{light:" ADC"}}/>}/>
        <Area type="monotone" name="Light Level" dataKey="light" stroke="#f59e0b" strokeWidth={2} fill="url(#lightGrad)" dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ==========================================
// 7. COMPLEX REACTION & ANALYSIS PANELS
// ==========================================

const SignalGauge = ({ latest }) => {
  const hr = latest.hr || 72;
  const ldr = latest.light || 2200;
  
  // Dynamic score derived directly from thresholds.json model coefficients
  const scoreRaw = ML_CONFIG.intercept + (ML_CONFIG.weight_heart_rate * hr) + (ML_CONFIG.weight_light * ldr);
  const score = Math.round(Math.max(0, Math.min(100, scoreRaw)) * 10) / 10;
  
  // Calculate angle on gauge (-90 to 90 deg / semicircular arc)
  const angle = (score / 100) * 180 - 90;
  
  // Gauge visual highlight configurations
  let themeColor = "var(--cyan)";
  if (score >= ML_CONFIG.t4) themeColor = "var(--red)";
  else if (score >= ML_CONFIG.t3) themeColor = "var(--orange)";
  else if (score >= ML_CONFIG.t2) themeColor = "var(--yellow)";
  else if (score >= ML_CONFIG.t1) themeColor = "var(--green)";

  return (
    <div className="glass p-5 flex flex-col items-center justify-center overflow-hidden">
      <div className="flex items-center gap-2 mb-4 w-full justify-start">
        <Icon d={icons.pulse} className="text-cyan-400 pulse-led"/>
        <h3 className="font-semibold text-[14px]">ML Classification Boundary Dial</h3>
      </div>
      
      <div className="relative w-48 h-24 mb-3 flex items-end justify-center">
        {/* Semicircular Border Gauge Ring */}
        <div className="absolute w-44 h-44 rounded-full border-[6px] border-white/5 top-2"></div>
        <div className="absolute w-44 h-44 rounded-full border-[6px] border-dashed top-2" style={{borderColor: themeColor, opacity: 0.25, clipPath: 'inset(0 0 50% 0)'}}></div>
        
        {/* Rotational indicator needle */}
        <div className="absolute w-2 h-20 bottom-0 origin-bottom transition-all duration-700 ease-out" 
             style={{transform: `rotate(${angle}deg)`, zIndex: 1}}>
          <div className="w-1 h-14 mx-auto rounded-full" style={{background: themeColor, boxShadow: `0 0 12px ${themeColor}`}}></div>
        </div>
        
        {/* Core base pin */}
        <div className="absolute w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 bottom-0" style={{transform: 'translateY(50%)', zIndex: 2}}></div>
      </div>
      
      <div className="text-center">
        <div className="text-[26px] font-bold text-white leading-none">{score}%</div>
        <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase mt-1 inline-block">Dynamic Stress Score</span>
      </div>
    </div>
  );
};

const RecommendationEngine = ({ latest }) => {
  const hr = latest.hr || 72;
  const ldr = latest.light || 2200;
  
  // Real-time inference computed offline using regression configurations
  const scoreRaw = ML_CONFIG.intercept + (ML_CONFIG.weight_heart_rate * hr) + (ML_CONFIG.weight_light * ldr);
  const score = Math.round(Math.max(0, Math.min(100, scoreRaw)) * 10) / 10;
  
  let category = "Normal";
  let status = "ok";
  let glow = "neon-cyan";
  let feedback = "";
  let barColor = "var(--cyan)";

  if (score < ML_CONFIG.t1) {
    category = "Relaxed";
    status = "ok";
    glow = "neon-cyan";
    barColor = "var(--cyan)";
    feedback = "Outstanding! Your stress score is low. Maintain healthy habits: Prioritize consistent sleep schedules, regular active recovery routines, standard physical exercise, and a balanced lifestyle to keep your mind and body perfectly centered.";
  } else if (score < ML_CONFIG.t2) {
    category = "Normal";
    status = "ok";
    glow = "neon-green";
    barColor = "var(--green)";
    feedback = "Your wellness indicators appear stable and balanced. General wellness suggestions: Stay hydrated throughout the day, continue your positive daily routines, take short periodic walks, and maintain steady diaphragmatic breathing.";
  } else if (score < ML_CONFIG.t3) {
    category = "Mild Stress";
    status = "warn";
    glow = "neon-yellow";
    barColor = "var(--yellow)";
    feedback = "A mild level of stress is detected by the ML engine. We suggest a quick 5-minute break: Try slow deep breathing exercises (inhale for 4s, hold for 4s, exhale for 4s), stand up to stretch, and let your eyes rest from digital screens.";
  } else if (score < ML_CONFIG.t4) {
    category = "Moderate Stress";
    status = "warn";
    glow = "neon-orange";
    barColor = "var(--orange)";
    feedback = "Moderate stress level detected. Take a structured break: Hydrate immediately, engage in light physical movement or walk around your workspace, and apply active relaxation techniques such as progressive muscle relaxation.";
  } else {
    category = "High Stress";
    status = "crit";
    glow = "neon-red";
    barColor = "var(--red)";
    feedback = "High stress alert! Immediate calming suggestions are highly recommended: Stop high-strain work, find a quiet space, perform slow deep breathing, and take a dedicated rest. Seek professional advice if elevated stress levels persist over several days.";
  }

  // Inspirational Quote Carousel
  const quotes = [
    "Every small step toward wellness creates lasting positive change.",
    "A calm mind and a healthy body are built through consistent daily habits.",
    "Pause, breathe, and reset. Your well-being deserves attention.",
    "Progress is not measured by perfection but by consistency.",
    "Take a moment to care for yourself today; your future self will thank you.",
    "Balance is the foundation of sustainable productivity and happiness.",
    "Wellness is a journey of awareness, not a destination.",
    "Your health is your greatest asset—invest in it every day.",
    "Even a brief moment of mindfulness can transform your entire day.",
    "Listening to your body is the first step toward living healthier and happier."
  ];
  const qIdx = (new Date().getDay() + Math.floor(hr / 10)) % quotes.length;

  return (
    <div className={`glass p-5 fade-in flex-1 flex flex-col justify-between ${glow}`}>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Icon d={icons.shield} className="text-cyan-400"/>
          <h3 className="font-semibold text-[15px]">ML Stress Predictor & Interventions</h3>
          <span className={`chip ml-auto ${status}`}>{category}</span>
        </div>
        
        {/* Dynamic Class Boundary Progress Slider */}
        <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between text-[11px] mb-1 text-slate-400">
            <span>Machine Learning Stress Index</span>
            <span className="font-bold text-white">{score}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
            <div className="h-full rounded-full transition-all duration-500 ease-out" 
                 style={{width: `${score}%`, background: barColor, boxShadow: `0 0 10px ${barColor}`}}></div>
          </div>
          <div className="flex justify-between text-[8px] mt-1 text-slate-500">
            <span>Relaxed</span>
            <span>Normal</span>
            <span>Mild</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-slate-300">
          {feedback}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
        <p className="text-[12px] italic text-center font-medium text-cyan-400">"{quotes[qIdx]}"</p>
      </div>
    </div>
  );
};

// ==========================================
// 8. ROUTED HISTORICAL ANALYTICS VIEW
// ==========================================

const HistoryView = ({ series }) => {
  const stats = useMemo(() => {
    if (!series.length) return { hr: 72, light: 2200, score: 30, cat: "Normal" };
    const sumHr = series.reduce((acc, p) => acc + p.hr, 0);
    const sumLight = series.reduce((acc, p) => acc + p.light, 0);
    const sumScore = series.reduce((acc, p) => acc + p.score, 0);
    const avgHr = Math.round(sumHr / series.length);
    const avgLight = Math.round(sumLight / series.length);
    const avgScore = Math.round((sumScore / series.length) * 10) / 10;
    
    let cat = "Normal";
    if (avgScore < ML_CONFIG.t1) cat = "Relaxed";
    else if (avgScore < ML_CONFIG.t2) cat = "Normal";
    else if (avgScore < ML_CONFIG.t3) cat = "Mild Stress";
    else if (avgScore < ML_CONFIG.t4) cat = "Moderate Stress";
    else cat = "High Stress";

    return { hr: avgHr, light: avgLight, score: avgScore, cat };
  }, [series]);

  return (
    <div className="p-5 grid-bg fade-in">
      <h2 className="text-[22px] font-bold tracking-tight mb-5 text-white">Historical Telemetry & Deep ML Trends</h2>
      
      <div className="glass p-5 mb-5">
        <h3 className="font-semibold mb-4 text-sm text-slate-300">Historical Signal Timelines</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={series.slice(-40)}>
            <CartesianGrid stroke="#1a1f29" vertical={false}/>
            <XAxis dataKey="time" stroke="#1f2530" tick={{fill:"#6b7689", fontSize:10}}/>
            <YAxis yAxisId="left" domain={[40, 150]} stroke="#1f2530" tick={{fill:"#6b7689", fontSize:10}}/>
            <YAxis yAxisId="right" orientation="right" domain={[0, 4095]} stroke="#1f2530" tick={{fill:"#6b7689", fontSize:10}}/>
            <Tooltip content={<CustomTooltip units={{hr:" bpm", light:" ADC", score:"%"}}/>}/>
            <Line yAxisId="left" type="monotone" name="Heart Rate (BPM)" dataKey="hr" stroke="#22d3ee" strokeWidth={2.5} dot={false}/>
            <Line yAxisId="right" type="monotone" name="Light Intensity (ADC)" dataKey="light" stroke="#f59e0b" strokeWidth={2} dot={false}/>
            <Line yAxisId="left" type="monotone" name="Stress Index (%)" dataKey="score" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 4" dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 flex flex-col items-center justify-center">
          <h4 className="text-[13px] font-semibold mb-1 text-slate-400 uppercase tracking-wider">Avg Heart Rate</h4>
          <div className="text-[30px] font-bold text-cyan-400">{stats.hr} <span className="text-[15px] text-slate-500 font-normal">bpm</span></div>
        </div>
        <div className="glass p-5 flex flex-col items-center justify-center">
          <h4 className="text-[13px] font-semibold mb-1 text-slate-400 uppercase tracking-wider">Avg Ambient Light</h4>
          <div className="text-[30px] font-bold text-yellow-400">{stats.light} <span className="text-[15px] text-slate-500 font-normal">ADC</span></div>
        </div>
        <div className="glass p-5 flex flex-col items-center justify-center">
          <h4 className="text-[13px] font-semibold mb-1 text-slate-400 uppercase tracking-wider">Overall Aggregated Index</h4>
          <div className="text-[26px] font-bold text-emerald-400">{stats.cat} <span className="text-[14px] text-slate-500 font-normal">({stats.score}%)</span></div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. ROOT APPLICATION CONTROLLER
// ==========================================

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [location, setLocation] = useState("London");
  
  const { series, latest } = useSensorStream();
  const weather = useWeather(location);

  // Dynamically calculate stress score for sparkline streams
  const seriesWithScores = useMemo(() => {
    return series.map(p => {
      const scoreRaw = ML_CONFIG.intercept + (ML_CONFIG.weight_heart_rate * p.hr) + (ML_CONFIG.weight_light * p.light);
      const score = Math.round(Math.max(0, Math.min(100, scoreRaw)) * 10) / 10;
      return { ...p, score };
    });
  }, [series]);

  const latestScore = useMemo(() => {
    const hr = latest.hr || 72;
    const ldr = latest.light || 2200;
    const scoreRaw = ML_CONFIG.intercept + (ML_CONFIG.weight_heart_rate * hr) + (ML_CONFIG.weight_light * ldr);
    return Math.round(Math.max(0, Math.min(100, scoreRaw)) * 10) / 10;
  }, [latest.hr, latest.light]);

  const latestCategory = useMemo(() => {
    if (latestScore < ML_CONFIG.t1) return "Relaxed";
    if (latestScore < ML_CONFIG.t2) return "Normal";
    if (latestScore < ML_CONFIG.t3) return "Mild Stress";
    if (latestScore < ML_CONFIG.t4) return "Moderate Stress";
    return "High Stress";
  }, [latestScore]);

  const hrSpark = useMemo(() => series.slice(-20).map(p => ({ v: p.hr })), [series]);
  const lightSpark = useMemo(() => series.slice(-20).map(p => ({ v: p.light })), [series]);
  const scoreSpark = useMemo(() => seriesWithScores.slice(-20).map(p => ({ v: p.score })), [seriesWithScores]);

  return (
    <div className="min-h-screen lg:h-screen flex">
      {/* Fixed sidebar navigation panel */}
      <Sidebar active={activeTab} setActive={setActiveTab}/>
      
      {/* Primary dashboard window */}
      <main className="flex-1 lg:ml-64 h-screen overflow-y-auto scroll-area">
        <TopBar location={location} setLocation={setLocation}/>
        
        {activeTab === "history" ? (
          <HistoryView series={seriesWithScores} />
        ) : (
          <div className="p-5 grid-bg">
            <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="text-[24px] font-bold tracking-tight text-white">Live Stress Diagnostics Cockpit</h1>
                <div className="text-[12px] text-slate-400 mt-1">
                  Active Sensors: <span className="text-cyan-400 font-semibold">Heart Rate + LDR</span> • Local Ambient Climate: <span className="text-yellow-400 font-semibold">{location}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-medium">
                Last Telemetry Uplink: <span className="text-white font-bold">{latest.time}</span>
              </div>
            </div>

            {/* Responsive grid mapping atomic KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
              <KPI title="Heart Rate" value={latest.hr} unit="bpm" color="cyan"
                   status={latest.hr > 110 || latest.hr < 55 ? "crit" : latest.hr > 90 ? "warn" : "ok"}
                   sparkline={hrSpark} icon={icons.heart}/>
                   
              <KPI title="Ambient Light" value={latest.light} unit="ADC" color="yellow"
                   status={latest.light < 300 || latest.light > 3800 ? "warn" : "ok"}
                   sparkline={lightSpark} icon={icons.sun}/>
                   
              <KPI title="ML Stress score" value={latestScore} unit="%" color={latestScore >= ML_CONFIG.t4 ? "red" : latestScore >= ML_CONFIG.t2 ? "yellow" : "cyan"}
                   status={latestScore >= ML_CONFIG.t4 ? "crit" : latestScore >= ML_CONFIG.t2 ? "warn" : "ok"}
                   sparkline={scoreSpark} icon={icons.shield}/>
                   
              <KPI title="Ambient Temp" value={weather.temp} unit="°C" color="cyan"
                   status={weather.temp !== "--" && (weather.temp >= 36 || weather.temp <= 5) ? "crit" : "ok"}
                   icon={icons.temp}/>
                   
              <KPI title="Relative Hum" value={weather.hum} unit="%" color="cyan"
                   status={weather.hum !== "--" && (weather.hum <= 20 || weather.hum >= 85) ? "warn" : "ok"}
                   icon={icons.droplet}/>
            </div>

            {/* Interactive graphical visualization panel */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
              <HeartRateChart data={series}/>
              <LightLevelChart data={series}/>
            </div>

            {/* Bottom active classification and prediction gauges */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
              <RecommendationEngine latest={latest} />
              <SignalGauge latest={latest}/>
            </div>

            <footer className="text-center text-[11px] py-4 border-t border-[rgba(255,255,255,0.05)] text-slate-500">
              PulseIQ AI Stress Platform © {new Date().getFullYear()} • ESP32 + ThingSpeak IoT Telemetry Node
            </footer>
          </div>
        )}
      </main>
    </div>
  );
};

// Render React Application
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
