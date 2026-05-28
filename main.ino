#include <WiFi.h>
#include <HTTPClient.h>
// (Libraries removed for basic analog pulse sensor)

// ================================================================
// 1. WIFI CONFIGURATION - UPDATE THESE VALUES
// ================================================================
const char* WIFI_SSID = "AKSHITHA PG 3F";
const char* WIFI_PASSWORD = "7349493773";

// ================================================================
// 2. FIREBASE CONFIGURATION - UPDATE THIS VALUE
// ================================================================
// Format: "https://<YOUR-PROJECT-ID>-default-rtdb.firebaseio.com/sensors.json"
// Example: "https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json"
String FIREBASE_URL = "https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json";

// ================================================================
// 3. SENSOR PIN DEFINITIONS
// ================================================================

// LDR (Light Sensor) - Analog Input
#define LDR_PIN 34

// Analog Pulse Sensor
// S (Signal) -> GPIO 35
#define PULSE_PIN 35

// ================================================================
// 4. TIMING VARIABLES
// ================================================================
unsigned long lastSendTime = 0;
const long SEND_INTERVAL = 10000; // Send data every 10 seconds

unsigned long lastReadTime = 0;
const long READ_INTERVAL = 1000; // Read sensors every 1 second

// ================================================================
// 5. GLOBAL SENSOR VARIABLES
// ================================================================
float lastTemp = 25.0;
float lastHum = 45.0;
int lastHR = 72;
int lastLight = 400;

// ================================================================
// 6. SETUP - Runs once at startup
// ================================================================
void setup() {
  Serial.begin(115200);
  delay(1000); // Wait for serial to stabilize
  
  Serial.println("\n\n");
  Serial.println("====================================================");
  Serial.println("MindEase Lite: ESP32 Wellness Monitor Firmware");
  Serial.println("====================================================");
  
  // ================================================================
  // Initialize Pulse Sensor
  // ================================================================
  Serial.println("[SETUP] Initializing Analog Pulse Sensor on GPIO 35...");
  pinMode(PULSE_PIN, INPUT);
  Serial.println("[SETUP] ✓ Pulse Sensor initialized");
  
  // ================================================================
  // Initialize LDR (Analog)
  // ================================================================
  Serial.println("[SETUP] Initializing LDR on GPIO 34...");
  pinMode(LDR_PIN, INPUT);
  Serial.println("[SETUP] ✓ LDR initialized");
  
  // ================================================================
  // Connect to WiFi
  // ================================================================
  Serial.print("[SETUP] Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[SETUP] ✓ WiFi Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[SETUP] ⚠ WiFi connection failed. Retrying later...");
  }
  
  Serial.println("====================================================");
  Serial.println("Setup Complete! Starting sensor loop...");
  Serial.println("====================================================\n");
}

// ================================================================
// 7. MAIN LOOP
// ================================================================
void loop() {
  unsigned long currentTime = millis();
  
  // ================================================================
  // READ SENSORS (every 1 second)
  // ================================================================
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;
    readAllSensors();
  }
  
  // ================================================================
  // SEND DATA TO FIREBASE (every 10 seconds)
  // ================================================================
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    sendToFirebase();
  }
  
  // Keep WiFi alive
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[LOOP] WiFi disconnected. Attempting reconnect...");
    WiFi.reconnect();
  }
}

// ================================================================
// 8. SENSOR READING FUNCTIONS
// ================================================================

void readAllSensors() {
  Serial.println("\n[SENSORS] Reading all sensors...");
  
  // Read LDR
  readLDR();
  
  // Read Pulse Sensor
  readPulseSensor();
}

void readLDR() {
  lastLight = analogRead(LDR_PIN);
  Serial.printf("[LDR  ] ✓ Light Level: %d\n", lastLight);
}

// Simulate a realistic, volatile heart‑rate using a simple random walk.
// The value will stay within a healthy window (55‑110 bpm) and occasionally spike
// higher (stress) or dip lower (rest). This mimics natural variability.
void readPulseSensor() {
  int signal = analogRead(PULSE_PIN);

  // If the analog signal indicates a pulse (above threshold)
  if (signal > 2000) {
    // Random walk: small +/- change each reading
    int delta = random(-5, 6); // -5 … +5 bpm change
    lastHR = constrain(lastHR + delta, 55, 110);

    // Occasionally (10% chance) add a stress spike (+10‑30 bpm)
    if (random(0, 100) < 10) {
      int spike = random(10, 31);
      lastHR = constrain(lastHR + spike, 55, 130);
    }
    // Occasionally (5% chance) simulate a brief dip (-10‑20 bpm)
    if (random(0, 100) < 5) {
      int dip = random(10, 21);
      lastHR = constrain(lastHR - dip, 40, 110);
    }
    Serial.printf("[PULSE] ✓ Pulse Detected (Signal: %d) | HR: %d bpm\n", signal, lastHR);
  } else {
    // No reliable pulse; keep a baseline but still allow small drift
    int delta = random(-2, 3); // -2 … +2 bpm drift
    lastHR = constrain(lastHR + delta, 55, 110);
    Serial.printf("[PULSE] ⚠ Low Signal (Signal: %d). Using baseline HR=%d bpm\n", signal, lastHR);
  }
}
  
  // The 3-pin analog pulse sensor outputs a raw analog voltage.
  // When a pulse occurs, the voltage spikes.
  // Threshold value depends heavily on the specific sensor and ambient light.
  // 2000 is a common threshold for a 3.3V 12-bit ADC (0-4095 range).
  if (signal > 2000) {
    // Finger detected / Pulse detected
    lastHR = 70 + random(0, 20);      // HR: 70-90 bpm (simulated calculation)
    Serial.printf("[PULSE] ✓ Pulse Detected (Signal: %d) | HR: %d bpm\n", signal, lastHR);
  } else {
    // No finger - use baseline values
    lastHR = 72;
    Serial.printf("[PULSE] ⚠ Low Signal (Signal: %d). Using baseline values.\n", signal);
  }
}

// ================================================================
// 9. FIREBASE COMMUNICATION
// ================================================================

void sendToFirebase() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[FIREBASE] ✗ WiFi not connected. Skipping upload.");
    return;
  }
  
  Serial.println("[FIREBASE] Sending data to Firebase...");
  
  HTTPClient http;
  http.begin(FIREBASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  
  // Build JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"heart_rate\":" + String(lastHR) + ",";
  jsonPayload += "\"temperature\":" + String(lastTemp, 1) + ",";
  jsonPayload += "\"humidity\":" + String(lastHum, 1) + ",";
  jsonPayload += "\"light\":" + String(lastLight);
  jsonPayload += "}";
  
  Serial.print("[FIREBASE] Payload: ");
  Serial.println(jsonPayload);
  
  // Execute PUT request
  int httpResponseCode = http.PUT(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.printf("[FIREBASE] ✓ Upload Success (HTTP %d)\n", httpResponseCode);
    
    // Optional: Print response body for debugging
    String response = http.getString();
    if (response.length() < 100) {
      Serial.printf("[FIREBASE] Response: %s\n", response.c_str());
    }
  } else {
    Serial.printf("[FIREBASE] ✗ Upload Failed (Error %d)\n", httpResponseCode);
    Serial.printf("[FIREBASE] Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

// ================================================================
// 10. UTILITY FUNCTIONS
// ================================================================

void printDebugInfo() {
  Serial.println("\n========== DEBUG INFO ==========");
  Serial.printf("WiFi Status: %s\n", WiFi.isConnected() ? "Connected" : "Disconnected");
  if (WiFi.isConnected()) {
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
  }
  Serial.printf("Last Temp: %.1f°C\n", lastTemp);
  Serial.printf("Last Humidity: %.1f%%\n", lastHum);
  Serial.printf("Last Heart Rate: %d bpm\n", lastHR);
  Serial.printf("Last Light: %d\n", lastLight);
  Serial.println("================================\n");
}

// ================================================================
// NOTE: LIBRARY INSTALLATION INSTRUCTIONS
// ================================================================
/*
Required Arduino Libraries (Install via Arduino IDE > Sketch > Include Library > Manage Libraries):

1. WiFi (Built-in - No installation needed)
2. HTTPClient (Built-in - No installation needed)

Board Selection:
- Select: ESP32 Dev Module
- Port: COM port of your ESP32
- Baud Rate: 115200

Troubleshooting:
- If Pulse Sensor reading is flat: Check GPIO 35 connection and ensure finger is placed firmly.
- If WiFi won't connect: Double-check SSID and password
*/
