#include <WiFi.h>
#include <HTTPClient.h>

// WiFi
const char* ssid = "AKSHITHA PG 3F";
const char* password = "7349493773";

// ThingSpeak
const char* server = "https://api.thingspeak.com/update";
String apiKey = "WPH3OA57TYQYM7UJ";

// Pins
#define PULSE_PIN 36      // VP
#define LDR_PIN 39        // VN
#define LED_INDICATOR 2

// Pulse settings
const int THRESHOLD = 2000;

unsigned long lastBeatTime = 0;
bool beatDetected = false;
float bpm = 0;

// ThingSpeak timer
unsigned long lastUploadTime = 0;
const unsigned long uploadInterval = 15000;

void setup() {
  Serial.begin(115200);

  pinMode(LED_INDICATOR, OUTPUT);

  Serial.println();
  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {

  // ==========================
  // LDR
  // ==========================
  int rawLdrValue = analogRead(LDR_PIN);
  int light = 4095 - rawLdrValue;

  // ==========================
  // Pulse Sensor
  // ==========================
  int signal = analogRead(PULSE_PIN);

  Serial.print("Pulse=");
  Serial.print(signal);

  if (signal > THRESHOLD && !beatDetected) {

    unsigned long now = millis();

    if (lastBeatTime > 0) {

      unsigned long interval = now - lastBeatTime;

      if (interval > 300 && interval < 2000) {
        bpm = 60000.0 / interval;
      }
    }

    lastBeatTime = now;
    beatDetected = true;
  }

  if (signal < (THRESHOLD - 150)) {
    beatDetected = false;
  }

  Serial.print("  BPM=");
  Serial.print((int)bpm);

  Serial.print("  Light=");
  Serial.println(light);

  // ==========================
  // Upload every 15 sec
  // ==========================
  if (millis() - lastUploadTime >= uploadInterval) {

    lastUploadTime = millis();

    if (WiFi.status() == WL_CONNECTED) {

      digitalWrite(LED_INDICATOR, HIGH);

      HTTPClient http;

      String url =
        String(server) +
        "?api_key=" + apiKey +
        "&field1=" + String((int)bpm) +
        "&field2=" + String(light);

      Serial.println("--------------------------------");
      Serial.println("Sending to ThingSpeak");
      Serial.println(url);

      http.begin(url);

      int responseCode = http.GET();

      Serial.print("HTTP Response: ");
      Serial.println(responseCode);

      http.end();

      digitalWrite(LED_INDICATOR, LOW);
    }
  }

  delay(50);
}
