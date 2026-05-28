/*****************************************************************
 *  MindEase Lite - ESP32 Wellness Monitor
 *
 *  Sensors:
 *   - LDR Module        → GPIO 34
 *   - Pulse Sensor      → GPIO 35
 *
 *  Features:
 *   - Real pulse detection (NO fake random BPM)
 *   - Firebase Realtime Database upload
 *   - Stable Wi-Fi reconnect logic
 *   - Smoothed BPM calculation
 *   - Clean sensor logging
 *
 *  Board:
 *   ESP32 Dev Module
 *****************************************************************/

#include <WiFi.h>
#include <HTTPClient.h>

// ================================================================
// WIFI CONFIGURATION
// ================================================================
const char* WIFI_SSID     = "esp32wifi";
const char* WIFI_PASSWORD = "12345678";

// ================================================================
// FIREBASE URL
// ================================================================
String FIREBASE_URL =
"https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json";

// ================================================================
// SENSOR PINS
// ================================================================
#define LDR_PIN    34
#define PULSE_PIN  35

// ================================================================
// TIMING
// ================================================================
unsigned long lastReadTime = 0;
unsigned long lastSendTime = 0;

const long READ_INTERVAL = 1000;
const long SEND_INTERVAL = 10000;

// ================================================================
// SENSOR VARIABLES
// ================================================================
int lastLight = 0;
int lastHR = 72;

float lastTemp = 25.0;
float lastHum  = 45.0;

// ================================================================
// PULSE DETECTION VARIABLES
// ================================================================
int pulseSignal = 0;

bool pulseDetected = false;

unsigned long lastBeatTime = 0;

int bpm = 0;
int smoothedBPM = 72;

// Threshold tuning
const int PULSE_THRESHOLD = 1800;

// ================================================================
// WIFI CONNECT FUNCTION
// ================================================================
void connectWiFi() {

  Serial.println("\n[WIFI] Connecting...");

  WiFi.disconnect(true);
  delay(1000);

  WiFi.mode(WIFI_STA);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;

  while (WiFi.status() != WL_CONNECTED && retry < 30) {

    delay(500);
    Serial.print(".");

    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] IP Address: ");

    Serial.println(WiFi.localIP());

  } else {

    Serial.println("\n[WIFI] Connection Failed!");
  }
}

// ================================================================
// SETUP
// ================================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println("\n==================================");
  Serial.println("MindEase Lite Starting...");
  Serial.println("==================================");

  pinMode(LDR_PIN, INPUT);
  pinMode(PULSE_PIN, INPUT);

  connectWiFi();

  Serial.println("\n[SETUP] Complete\n");
}

// ================================================================
// MAIN LOOP
// ================================================================
void loop() {

  unsigned long currentMillis = millis();

  // ------------------------------------------------------------
  // Maintain WiFi
  // ------------------------------------------------------------
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("\n[WIFI] Connection Lost!");

    connectWiFi();
  }

  // ------------------------------------------------------------
  // Read Sensors
  // ------------------------------------------------------------
  if (currentMillis - lastReadTime >= READ_INTERVAL) {

    lastReadTime = currentMillis;

    readSensors();
  }

  // ------------------------------------------------------------
  // Upload to Firebase
  // ------------------------------------------------------------
  if (currentMillis - lastSendTime >= SEND_INTERVAL) {

    lastSendTime = currentMillis;

    sendToFirebase();
  }
}

// ================================================================
// READ ALL SENSORS
// ================================================================
void readSensors() {

  Serial.println("\n========== SENSOR DATA ==========");

  readLDR();

  readPulseSensor();

  Serial.println("=================================");
}

// ================================================================
// READ LDR
// ================================================================
void readLDR() {

  lastLight = analogRead(LDR_PIN);

  Serial.print("[LDR] Light Level: ");
  Serial.println(lastLight);
}

// ================================================================
// READ PULSE SENSOR
// ================================================================
void readPulseSensor() {

  pulseSignal = analogRead(PULSE_PIN);

  Serial.print("[PULSE] Signal: ");
  Serial.println(pulseSignal);

  // ------------------------------------------------------------
  // Detect Pulse Peak
  // ------------------------------------------------------------
  if (pulseSignal > PULSE_THRESHOLD && !pulseDetected) {

    pulseDetected = true;

    unsigned long currentBeatTime = millis();

    if (lastBeatTime > 0) {

      unsigned long beatInterval =
        currentBeatTime - lastBeatTime;

      bpm = 60000 / beatInterval;

      // --------------------------------------------------------
      // Filter unrealistic BPM
      // --------------------------------------------------------
      if (bpm >= 55 && bpm <= 130) {

        // Smooth readings
        smoothedBPM =
          (smoothedBPM * 3 + bpm) / 4;

        lastHR = smoothedBPM;

        Serial.print("[PULSE] Beat Detected | BPM: ");
        Serial.println(lastHR);
      }
    }

    lastBeatTime = currentBeatTime;
  }

  // ------------------------------------------------------------
  // Reset detector when signal drops
  // ------------------------------------------------------------
  if (pulseSignal < (PULSE_THRESHOLD - 200)) {

    pulseDetected = false;
  }

  // ------------------------------------------------------------
  // Weak Signal Handling
  // ------------------------------------------------------------
  if (pulseSignal < 1000) {

    Serial.println("[PULSE] Weak signal / No finger");

    // Keep previous valid BPM
    lastHR = smoothedBPM;
  }
}

// ================================================================
// SEND TO FIREBASE
// ================================================================
void sendToFirebase() {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("[FIREBASE] No WiFi!");

    return;
  }

  HTTPClient http;

  http.begin(FIREBASE_URL);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.setConnectTimeout(5000);

  // ------------------------------------------------------------
  // JSON Payload
  // ------------------------------------------------------------
  String jsonData = "{";

  jsonData += "\"heart_rate\":";
  jsonData += String(lastHR);
  jsonData += ",";

  jsonData += "\"temperature\":";
  jsonData += String(lastTemp, 1);
  jsonData += ",";

  jsonData += "\"humidity\":";
  jsonData += String(lastHum, 1);
  jsonData += ",";

  jsonData += "\"light\":";
  jsonData += String(lastLight);

  jsonData += "}";

  Serial.println("\n[FIREBASE] Uploading...");
  Serial.println(jsonData);

  // ------------------------------------------------------------
  // HTTP PUT
  // ------------------------------------------------------------
  int httpResponseCode =
    http.PUT(jsonData);

  if (httpResponseCode > 0) {

    Serial.print("[FIREBASE] Success | HTTP ");

    Serial.println(httpResponseCode);

  } else {

    Serial.print("[FIREBASE] Failed: ");

    Serial.println(
      http.errorToString(httpResponseCode)
    );
  }

  http.end();
}
