/**
 * ESP32 BIOMETRIC & LIGHT ENVIRONMENT MONITORING SKETCH
 * (ThingSpeak Integration)
 * 
 * Hardware Checklist:
 * - ESP32 DevKit V1 Board
 * - Analog Heart Pulse Sensor (connected to GPIO 36 / VP)
 * - LDR Ambient Light Sensor + 10k resistor (connected to GPIO 39 / VN)
 * 
 * Target REST Endpoint: api.thingspeak.com
 * This sketch pushes Heart Rate (bpm) and Ambient Light (light) level to ThingSpeak fields.
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. NETWORK & CREDENTIALS CONFIGURATION
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";          // Replace with your local WiFi name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your local WiFi password

// ThingSpeak Configuration
const char* server = "https://api.thingspeak.com/update"; // Using HTTPS
String apiKey = "YOUR_WRITE_API_KEY"; // TODO: Replace with your actual ThingSpeak Write API Key

// ==========================================
// 2. BIOSENSOR ANALOG PIN MAPPINGS
// ==========================================
#define PULSE_PIN 36        // VP / SENSOR_VP pin (reads analog pulse waves)
#define LDR_PIN 39          // VN / SENSOR_VN pin (reads ambient brightness voltage divider)
#define LED_INDICATOR 2     // Onboard Status LED indicators (flashes on network updates)

void setup() {
  Serial.begin(115200);
  pinMode(LED_INDICATOR, OUTPUT);

  // Initialize WiFi connection
  Serial.println("");
  Serial.printf("Connecting to Access Point: %s \n", ssid);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi Network Mode] Connected successfully!");
    Serial.print("Local assigned IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi Warning] Connection timed out. Running offline telemetry mode.");
  }
}

void loop() {
  // ==========================================
  // 3. READ HARDWARE TRANSDUCERS (ANALOG INPUTS)
  // ==========================================
  
  // A. LDR Light Reading (12-bit ADC: 0 to 4095)
  // Higher value = higher voltage = higher light intensity
  int rawLdrValue = analogRead(LDR_PIN);

  // B. Adaptive Peak-Crossing Heartbeat & IBI (Inter-Beat Interval) Calculator
  static unsigned long lastBeatTime = 0;
  static bool pulseDetected = false;
  static int threshold = 2048;        
  static int signalMin = 4095;        
  static int signalMax = 0;           
  static int lastBpm = 75;
  int bpm = lastBpm;

  // We sample multiple times to perform smooth electronic filtering
  int pulseRaw = 0;
  for (int i = 0; i < 8; i++) {
    pulseRaw += analogRead(PULSE_PIN);
    delay(3);
  }
  pulseRaw /= 8;

  unsigned long now = millis();

  // Dynamic self-calibration of threshold window
  static unsigned long lastCalibrationTime = 0;
  if (now - lastCalibrationTime > 1500) {
    if (signalMax > signalMin && (signalMax - signalMin > 150)) {
      threshold = signalMin + ((signalMax - signalMin) / 2); // adaptive midpoint
    }
    signalMax = pulseRaw;
    signalMin = pulseRaw;
    lastCalibrationTime = now;
  }

  if (pulseRaw > signalMax) signalMax = pulseRaw;
  if (pulseRaw < signalMin) signalMin = pulseRaw;

  if (pulseRaw < 100 || pulseRaw > 3950) {
    bpm = 0; // Signal disconnected or finger removed
  } else {
    if (pulseRaw > threshold && !pulseDetected && (now - lastBeatTime > 350)) {
      pulseDetected = true;
      unsigned long ibi = now - lastBeatTime; 
      lastBeatTime = now;

      if (ibi > 0) {
        float rawBpm = 60000.0 / ibi;
        if (rawBpm >= 45 && rawBpm <= 165) {
          bpm = (int)(0.75 * rawBpm + 0.25 * lastBpm);
          lastBpm = bpm;
        }
      }
    }
    
    if (pulseRaw < (threshold - 100)) {
      pulseDetected = false;
    }
    
    if (now - lastBeatTime > 3000) {
      bpm = 0; 
    } else {
      bpm = lastBpm;
    }
  }

  bpm = constrain(bpm, 0, 180);

  Serial.print("BPM:");
  Serial.print(bpm);
  Serial.print(",LDR_Raw:");
  Serial.println(rawLdrValue);

  // ==========================================
  // 4. DISPATCH DATA TO THINGSPEAK VIA GET
  // ==========================================
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_INDICATOR, HIGH); 
    
    HTTPClient http;
    // Construct the URL: http://api.thingspeak.com/update?api_key=XYZ&field1=BPM&field2=LDR
    String url = String(server) + "?api_key=" + apiKey + "&field1=" + String(bpm) + "&field2=" + String(rawLdrValue);
    
    http.begin(url);
    Serial.println("[ThingSpeak] Sending Data: " + url);
    
    int httpResponseCode = http.GET(); 

    if (httpResponseCode > 0) {
      Serial.printf("[ThingSpeak Success] Response Code: %d\n", httpResponseCode);
    } else {
      Serial.printf("[ThingSpeak Alert] Error sending request: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
    digitalWrite(LED_INDICATOR, LOW);
  } else {
    Serial.println("[Offline Diagnostics] Wi-Fi lost.");
  }

  // ThingSpeak requires a strict 15-second delay between updates on the free tier.
  delay(15000); 
}
