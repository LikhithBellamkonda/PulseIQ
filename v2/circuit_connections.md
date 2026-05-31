# ESP32 Vitals & Ambient Sensor Circuit Connections

This document details the hardware connections and wiring configuration for your personal monitor using only an **Analog Heart Pulse Sensor** and an **LDR (Light Dependent Resistor)** on an **ESP32 DevKit V1 (30-pin or 38-pin)**. 

*Note: Outdoor Temperature and Humidity parameters are automatically fetched by the web dashboard from the precise Location Weather API, so no DHT sensors or external pulse oximeter hardware are required.*

---

## 1. LDR Calibration: Does High ADC = High Light?

**Yes, in the standard voltage divider pull-down configuration, a higher analog reading corresponds to high light intensity (a brighter room).**

### How it works:
* An **LDR** reduces its resistance as light level increases:
  - **In Pitch Dark:** Its resistance is very high ($> 1\text{ M}\Omega$).
  - **In Bright Light:** Its resistance drops very low ($< 1\text{ k}\Omega$).
* To measure this with an ESP32 analog pin (ADC), we use a standard **10kΩ resistor** to form a voltage divider:

```
    3.3V ───[ LDR ]───┬─── Analog Pin (e.g. GPIO 39 / SENSOR_VN as ADC)
                      │
                  [ 10kΩ ] (Pull-Down Resistor)
                      │
      GND ─────────────┴─
```

### Voltage and ADC Behavior:
* **Brighter Ambient Light:** LDR resistance is extremely small relative to the 10kΩ pull-down. Most of the 3.3V power drops across the 10kΩ resistor. The analog input pin measures close to **3.3V**, resulting in a high ADC digital value close to `4095`.
* **Darkness/Shade:** LDR resistance is massive. Most of the 3.3V drops across the LDR before reaching the divider junction. The input pin drops close to **0V**, resulting in a low ADC reading close to `0`.

---

## 2. Pin Allocation Table

Connect your active modules to your ESP32 board according to this layout:

| Hardware Module | Sensor Pin | ESP32 GPIO Pin | Description / Function |
| :--- | :--- | :--- | :--- |
| **Analog Heart Pulse Sensor** <br>(e.g. Pulsensor / KY-039) | **VCC** / (+) | **3.3V** | Power supply (3.3V is optimal for lower analog noise) |
| | **GND** / (-) | **GND** | Ground reference |
| | **Signal** / (S) | **GPIO 36** <br>(SENSOR_VP / ADC1_CH0) | Analog cardiac wave input |
| **LDR (Light Dependent Resistor)** | **Leg 1** | **3.3V** | Connected directly to the 3.3V bus |
| | **Leg 2** | **GPIO 39** <br>(SENSOR_VN / ADC1_CH3) | Connected to pin AND to Leg 1 of 10kΩ resistor |
| **10kΩ Pull-down Resistor** | **Leg 1** | **GPIO 39** / VN | Shared with Leg 2 of the LDR |
| | **Leg 2** | **GND** | Pulls the pin safely to GND in dark conditions |

---

## 3. Step-by-Step Wiring Guide

### A. Connecting the Analog Heart Pulse Sensor
1. Locate the 3 wires on your heartbeat sensor:
   - **GND** (often labeled `-`, Black, or Brown)
   - **VCC** (often labeled `+`, Red, or Middle Pin)
   - **Signal** (often labeled `S`, `Analog`, or White/Purple)
2. Connect the **GND (-)** wire to any `GND` pin on the ESP32.
3. Connect the **VCC (+)** wire to the `3.3V` power output pin on the ESP32.
4. Connect the **Signal (S)** wire to `GPIO 36` (SENSOR_VP / SVP) on the ESP32. 

### B. Connecting the LDR (Ambient Light Sensor)
1. Insert the LDR legs into two independent rows on your breadboard.
2. Run a jumper wire from one leg of the LDR to the `3.3V` pin of the ESP32.
3. Connect the other leg of the LDR to `GPIO 39` (SENSOR_VN / SVN) of the ESP32.
4. Place a **10kΩ resistor** on the breadboard so one leg connects to `GPIO 39` (the same junction as the LDR leg) and the other leg connects directly to a `GND` pin on your ESP32.

---

## 4. Testing Your Circuit

1. Once wired, upload the matching Arduino sketch (`esp32_firebase_vitals.ino`).
2. Open the **Arduino IDE Serial Plotter** at `115200` baud.
3. You will see coordinates streaming from your pulse sensor and LDR.
4. Once connected to WiFi, the ESP32 uploads these readings up to Firebase, where the PulseIQ web dashboard parses and plots them in real-time.
