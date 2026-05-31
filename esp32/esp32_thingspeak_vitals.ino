/**
 * ==================================================================================
 * PROJECT TITLE: ML-Based Real-Time Stress Monitoring System using ESP32, Pulse Sensor,
 *                LDR, ThingSpeak and Dashboard
 * FILE NAME:     esp32_thingspeak_vitals.ino
 * ==================================================================================
 * 
 * DESCRIPTION:
 * This edge-computing sketch runs on the ESP32 microcontroller. It performs analog
 * sampling of physiological (heart rate) and environmental (light intensity) parameters,
 * runs low-pass signal filtering to eliminate powerline and motion artifacts, calculates
 * real-time heart rate (BPM) using adaptive peak-detection, and pushes the telemetry
 * securely to the ThingSpeak Cloud.
 * 
 * ==================================================================================
 * HARDWARE WIRING & SCHEMATIC CONFIGURATION
 * ==================================================================================
 * 
 * [1] ESP32 Microcontroller DevKit V1 Board
 * [2] Analog Heart Pulse Sensor (Amperometric Transducer)
 * [3] Light Dependent Resistor (LDR GL5528) + 10k Ohm Resistor (Voltage Divider Network)
 * [4] Status Indicator LED + 220 Ohm Resistor
 * 
 * CONNECTION TABLE:
 * +------------------------+-------------------+------------------+-----------------+
 * | Sensor Module          | Pin Name          | ESP32 Pin        | Pin Description |
 * +------------------------+-------------------+------------------+-----------------+
 * | Pulse Heart Sensor     | VCC               | 3V3              | Power Supply    |
 * | Pulse Heart Sensor     | GND               | GND              | Ground Reference|
 * | Pulse Heart Sensor     | Signal (Analog)   | GPIO 36 (VP / A0)| Pulse wave reading|
 * +------------------------+-------------------+------------------+-----------------+
 * | LDR Light Sensor Unit  | VCC               | 3V3              | Power Supply    |
 * | LDR Light Sensor Unit  | GND (to 10k Res)  | GND              | Ground Reference|
 * | LDR Light Sensor Unit  | Midpoint (Analog) | GPIO 39 (VN / A3)| Ambient Light   |
 * +------------------------+-------------------+------------------+-----------------+
 * | Status Indicator LED   | Anode (+)         | GPIO 2           | Onboard Status  |
 * | Status Indicator LED   | Cathode (-)       | GND              | Through 220 Ohm |
 * +------------------------+-------------------+------------------+-----------------+
 * 
 * ==================================================================================
 * CIRCUIT TOPOLOGY DIAGRAM:
 * 
 *         3.3V <───────────┬──────────────┬─────────────── [Pulse Sensor VCC]
 *                          │              │
 *                          │            ┌─┴─┐
 *                          │            │ L │ LDR (GL5528)
 *                          │            └─┬─┘
 *                          │              ├─────────────> ESP32 GPIO 39 (VN)
 *                          │            ┌─┴─┐
 *                          │            │ 10│ 10k Ohm Pull-Down Resistor
 *                          │            │ k │
 *                          │            └─┬─┘
 *                          │              │
 *         GND  <───────────┴──────────────┴─────────────── [Pulse Sensor GND]
 * 
 * ==================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==================================================================================
// 1. NETWORK CREDENTIALS & SERVICE ENDPOINTS
// ==================================================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";          // Place SSID name here
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // Place WiFi password here

// ThingSpeak API Parameters
const char* TS_SERVER = "https://api.thingspeak.com/update";
const String TS_WRITE_API_KEY = "WPH3OA57TYQYM7UJ"; // Integrated Write API Key

// ==================================================================================
// 2. HARDWARE IO PIN ASSIGNMENTS
// ==================================================================================
#define PULSE_PIN 36        // GPIO 36 (ADC1_CH0 / SENSOR_VP)
#define LDR_PIN 39          // GPIO 39 (ADC1_CH3 / SENSOR_VN)
#define STATUS_LED 2        // GPIO 2 Onboard Blue LED

// Timing intervals
const unsigned long DEBOUNCE_DELAY = 15000; // 15-second update interval for ThingSpeak
unsigned long lastUpdateTime = 0;

// ==================================================================================
// 3. FIRMWARE INITIALIZATION
// ==================================================================================
void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  Serial.println("\n=======================================================");
  Serial.println("   PulseIQ IoT Stress Monitoring Node - v3 (ThingSpeak)");
  Serial.println("=======================================================");

  // Initialize WiFi Connection
  connectWiFi();
}

// ==================================================================================
// 4. MAIN EXECUTABLE RUNTIME LOOP
// ==================================================================================
void loop() {
  // Enforce asynchronous delay loop for ThingSpeak API limits
  unsigned long currentMillis = millis();
  
  // Continuously run adaptive heartbeat calculations in the background
  int liveBPM = computeHeartRate();
  int rawLDR = sampleLDR();

  if (currentMillis - lastUpdateTime >= DEBOUNCE_DELAY) {
    lastUpdateTime = currentMillis;

    // Check Wi-Fi state and run reconnection algorithm if link is lost
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI ALERT] Link disconnected. Attempting auto-reconnection...");
      connectWiFi();
    }

    // Publish telemetry values if Wi-Fi link is active
    if (WiFi.status() == WL_CONNECTED) {
      publishToThingSpeak(liveBPM, rawLDR);
    } else {
      Serial.printf("[OFFLINE LOG] Heart Rate: %d bpm | Ambient Light: %d ADC\n", liveBPM, rawLDR);
    }
  }
}

// ==================================================================================
// 5. HARDWARE DATA SAMPLING & ADC NOISE-FILTERING FUNCTIONS
// ==================================================================================

/**
 * Samples LDR analog values using moving average filter to block local voltage spikes.
 * ADC scale is 12-bit (0 to 4095).
 */
int sampleLDR() {
  long sum = 0;
  const int SAMPLES = 10;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(LDR_PIN);
    delay(2);
  }
  return sum / SAMPLES;
}

/**
 * Custom adaptive peak-detection algorithm.
 * Filters low frequency baseline wander, tracks running extremes, and determines
 * the peak crossing point to identify real heart beats.
 */
int computeHeartRate() {
  static unsigned long lastBeatTime = 0;
  static bool pulseTriggered = false;
  static int adaptiveMidpoint = 2048;        
  static int signalMin = 4095;        
  static int signalMax = 0;           
  static int estimatedBPM = 75; // Initial baseline fallback

  // Read analog heart pulse sensor and apply digital smoothing
  long averageReading = 0;
  const int SMOOTH_STEPS = 8;
  for (int i = 0; i < SMOOTH_STEPS; i++) {
    averageReading += analogRead(PULSE_PIN);
    delay(3);
  }
  int pulseSignal = averageReading / SMOOTH_STEPS;
  unsigned long now = millis();

  // Self-calibrates peak threshold bounds every 1.5 seconds
  static unsigned long lastCalibrationTime = 0;
  if (now - lastCalibrationTime > 1500) {
    if (signalMax > signalMin && (signalMax - signalMin > 100)) {
      adaptiveMidpoint = signalMin + ((signalMax - signalMin) / 2); // Center line
    }
    signalMax = pulseSignal;
    signalMin = pulseSignal;
    lastCalibrationTime = now;
  }

  if (pulseSignal > signalMax) signalMax = pulseSignal;
  if (pulseSignal < signalMin) signalMin = pulseSignal;

  // Signal disconnection detection
  if (pulseSignal < 150 || pulseSignal > 3900) {
    estimatedBPM = 0; 
  } else {
    // Detect peak edge crossing
    if (pulseSignal > adaptiveMidpoint && !pulseTriggered && (now - lastBeatTime > 300)) {
      pulseTriggered = true;
      unsigned long ibi = now - lastBeatTime; // Inter-Beat Interval
      lastBeatTime = now;

      if (ibi > 0) {
        float rawBPM = 60000.0 / ibi;
        // Verify physiologic sanity boundaries
        if (rawBPM >= 45.0 && rawBPM <= 170.0) {
          // Apply standard EMA filter (75% weight to past estimation, 25% to raw)
          estimatedBPM = (int)(0.25 * rawBPM + 0.75 * estimatedBPM);
        }
      }
    }
    
    // Reset peak trigger
    if (pulseSignal < (adaptiveMidpoint - 100)) {
      pulseTriggered = false;
    }
    
    // Timeout fallback (3 seconds of no pulses = signal disconnected)
    if (now - lastBeatTime > 3000) {
      estimatedBPM = 0;
    }
  }

  // Constrain to logical physiological values
  return constrain(estimatedBPM, 0, 180);
}

// ==================================================================================
// 6. TELEMETRY CLOUD PUBLISHING & NETWORKING UTILITIES
// ==================================================================================

/**
 * Initializes and establishes local WiFi link connection
 */
void connectWiFi() {
  Serial.print("[WIFI] Connecting to Network SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Link established successfully!");
    Serial.print("[WIFI] Local Assigned IP: ");
    Serial.println(WiFi.localIP());
    
    // Flash status LED three times to confirm network attachment
    for (int i = 0; i < 3; i++) {
      digitalWrite(STATUS_LED, HIGH); delay(150);
      digitalWrite(STATUS_LED, LOW); delay(150);
    }
  } else {
    Serial.println("\n[WIFI ERROR] Connection timed out. Running in local telemetry mode.");
  }
}

/**
 * Transmits sampled values to the ThingSpeak Cloud Platform
 */
void publishToThingSpeak(int heartRate, int lightIntensity) {
  HTTPClient http;
  
  // Construct absolute endpoint query: Field 1 = HR (BPM), Field 2 = Light Intensity (LDR)
  String requestURL = String(TS_SERVER) + "?api_key=" + TS_WRITE_API_KEY + 
                      "&field1=" + String(heartRate) + 
                      "&field2=" + String(lightIntensity);
  
  Serial.printf("[HTTP] Dispatching GET: %s\n", requestURL.c_str());
  
  digitalWrite(STATUS_LED, HIGH); // Light LED during uplink
  http.begin(requestURL);
  
  int responseCode = http.GET();
  
  if (responseCode > 0) {
    Serial.printf("[HTTP SUCCESS] Uplink completed. Response Code: %d\n", responseCode);
  } else {
    Serial.printf("[HTTP ERROR] Uplink failed. Error String: %s\n", http.errorToString(responseCode).c_str());
  }
  
  http.end();
  digitalWrite(STATUS_LED, LOW); // Turn off LED
}
