# MindEase Lite: Complete Circuit Connections Guide

## Overview

This document provides exact wiring instructions for connecting all sensors to the **ESP32 Dev Module**. Follow these connections precisely to avoid hardware damage or malfunctioning sensors.

---

## 📋 Quick Reference Table

| Component        | Pin Type  | ESP32 Pin   | Signal Type  |
| ---------------- | --------- | ----------- | ------------ |
| **Pulse Sensor +** | Power     | **3V3**     | Power        |
| **Pulse Sensor -** | Ground    | **GND**     | Ground       |
| **Pulse Sensor S** | Analog    | **GPIO 35** | Analog Input |
| **LDR VCC**      | Power     | **3V3**     | Power        |
| **LDR A0**       | Analog    | **GPIO 34** | Analog Input |
| **LDR GND**      | Ground    | **GND**     | Ground       |

---

## 🔌 Detailed Sensor Connections

### 1️⃣ 3-Pin Heart Pulse Sensor (Analog)

**Communication Protocol:** Analog Input  
**Output Range:** 0-4095 (12-bit ADC on ESP32)

| Pulse Sensor Pin | ESP32 Pin   | Wire Color (Recommended) | Notes            |
| :--------------- | :---------- | :----------------------- | :--------------- |
| **+ (VCC)**      | **3V3**     | Red                      | Power Supply     |
| **- (GND)**      | **GND**     | Black                    | Ground Reference |
| **S (Signal)**   | **GPIO 35** | Yellow/White             | Analog Data Line |

**Special Notes:**

- The analog signal fluctuates with your heartbeat
- Keep your finger steady, pressing too hard will cut off blood circulation
- Ensure you use an analog-capable pin like GPIO 35 (ADC1_CH7)

**Connection Diagram (Text):**

```
ESP32              Pulse Sensor
3V3 ────────────→ +
GND ────────────→ -
GPIO 35 ────────→ S
```

---

---

### 3️⃣ LDR Module (Light Sensor)

**Communication Protocol:** Analog Input  
**Output Range:** 0-4095 (12-bit ADC on ESP32)

| LDR Pin              | ESP32 Pin   | Wire Color (Recommended) | Notes                             |
| :------------------- | :---------- | :----------------------- | :-------------------------------- |
| **VCC**              | **3V3**     | Red                      | Power Supply                      |
| **A0 (Analog Out)**  | **GPIO 34** | Green                    | Analog Input                      |
| **GND**              | **GND**     | Black                    | Ground Reference                  |
| **D0 (Digital Out)** | _Not used_  | —                        | Optional, ignore for this project |

**Special Notes:**

- GPIO 34 is **ADC1_CH6** on ESP32
- This pin is **input-only**, cannot be used as output
- Typical LDR modules include a potentiometer for threshold adjustment
- Analog readings range: ~300 (bright) to ~3000 (dark) depending on your sensor

**Connection Diagram (Text):**

```
ESP32              LDR Module
3V3 ────────────→ VCC
GPIO 34 ────────→ A0
GND ────────────→ GND
[D0 ─ Not Connected]
```

---

## 🌳 Complete Breadboard Layout

```
Power Rails (Left Side):
+3V3 ═══════════════════════════════════════════
 ║
 └─ (VIN to all sensors)

GND ═══════════════════════════════════════════
 ║
 └─ (GND from all sensors)

Sensor Connections:
PulseSensor: S→GPIO35
LDR:         A0→GPIO34
```

---

## 🔋 Power & Ground Summary

### Power Distribution

- **3V3 Rail:** Supplies all sensors (max ~500mA total)
  - Pulse Sensor: ~4mA
  - LDR Module: ~5mA
  - Total: **~9mA** (well within limits)

### Ground Distribution

- **GND (Multiple points available):**
  - GND (pin 1)
  - GND (pin 38)
  - GND (GND-R on dev board)
- All must be connected to ensure stable operation

---

## ⚠️ Important Warnings & Tips

### ❌ DO NOT:

1. **Connect sensors to 5V** — ESP32 is 3.3V only
2. **Connect GND directly to 3V3** — This will short the board
3. **Leave wires loose** — Use a breadboard or soldering
4. **Mix up I2C pins** — SDA and SCL cannot be swapped
5. **Reverse polarity** — Always double-check VCC/GND before powering on

### ✅ DO:

1. **Use a breadboard** for prototyping
2. **Label your wires** with tape/markers
3. **Test each sensor individually** before integration
4. **Check pin voltage** with a multimeter (3.3V)
5. **Install Arduino libraries** before uploading code
6. **Verify I2C communication** with an I2C scanner sketch first

---

## 🧪 Verification Checklist

Before running the main firmware, verify each connection:

- [ ] Pulse sensor lights up (if it has a built-in LED)
- [ ] Pulse sensor reads fluctuating values in serial monitor when finger is placed
- [ ] LDR reads changing values when light changes

- [ ] No erratic readings on power-up
- [ ] WiFi connects successfully
- [ ] Firebase data appears in dashboard

---



## 🛠️ Troubleshooting by Symptom

| Symptom                          | Likely Cause           | Solution                            |
| :------------------------------- | :--------------------- | :---------------------------------- |
| Pulse sensor reading flat          | Wrong pin              | Check GPIO 35, ensure it's on S pin |
| LDR always returns 0             | ADC not initialized    | Check `pinMode(LDR_PIN, INPUT)`     |
| WiFi connects but Firebase fails | URL incorrect          | Verify Firebase URL format          |
| All sensors unresponsive         | Power issue            | Check GND connections               |


---

## 📸 Component Pinout References

### ESP32 Dev Module Pinout (Simplified)

```
                    ESP32 Dev Module
            ┌──────────────────────────────┐
        3V3 │                              │ GND
         EN │                              │ GND
        SVP │   ┌──────────────────────┐   │ GPIO23
        SVN │   │   ESP32-WROOM-32     │   │ GPIO19
       GPIO34│   │                      │   │ GPIO18
       GPIO35│   │                      │   │ GPIO5  ← Pulse Sensor S
       GPIO32│   │                      │   │ GPIO17
       GPIO33│   │                      │   │ GPIO16
       GPIO25│   │                      │   │ GPIO4
       GPIO26│   │                      │   │ GPIO0
       GPIO27│   │                      │   │ GPIO2
       GPIO14│   │                      │   │ GPIO15
       GPIO12│   │                      │   │ GPIO13
       GPIO11│   │                      │   │ GPIO12
       GPIO10│   │                      │   │ GPIO9
       GPIO9 │   │                      │   │ GPIO8
       GPIO8 │   │                      │   │ GPIO7
       GPIO7 │   │                      │   │ GPIO6
       GPIO6 │   │                      │   │ GPIO21
       GPIO5 │   │                      │   │ GPIO22
      GPIO3 │   │                      │   │ RXD0
      GPIO1 │   │                      │   │ TXD0
       GPIO0│   └──────────────────────┘   │ GPIO20
        GND │                              │ GND
       3V3 │                              │ 5V (Do not use)
            └──────────────────────────────┘
```

---

## 📝 Assembly Checklist

- [ ] **Step 1:** Connect power (3V3) and ground (GND) rails
- [ ] **Step 2:** Connect Pulse Sensor (GPIO 35)
- [ ] **Step 3:** Connect LDR analog (GPIO 34)
- [ ] **Step 5:** Verify all connections with multimeter
- [ ] **Step 6:** Upload firmware to ESP32
- [ ] **Step 7:** Open serial monitor (115200 baud)
- [ ] **Step 8:** Check initialization messages
- [ ] **Step 9:** Verify sensor readings in serial output
- [ ] **Step 10:** Check Firebase dashboard for data

---

## 📚 Additional Resources

- **ESP32 Official Pinout:** https://www.espressif.com/en/products/socs/esp32/
- **Pulse Sensor Information:** Typically uses an optical reflection circuit (LED + Phototransistor)

---

**Last Updated:** 2024  
**Project:** MindEase Lite v1.0  
**Status:** Production Ready ✓
