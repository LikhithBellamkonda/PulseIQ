# MindEase Lite: Complete Circuit Connections Guide

## Overview

This document provides exact wiring instructions for connecting all sensors to the **ESP32 Dev Module**. Follow these connections precisely to avoid hardware damage or malfunctioning sensors.

---

## 📋 Quick Reference Table

| Component        | Pin Type  | ESP32 Pin   | Signal Type  |
| ---------------- | --------- | ----------- | ------------ |
| **MAX30102 VIN** | Power     | **3V3**     | Power        |
| **MAX30102 GND** | Ground    | **GND**     | Ground       |
| **MAX30102 SDA** | I2C Data  | **GPIO 21** | I2C          |
| **MAX30102 SCL** | I2C Clock | **GPIO 22** | I2C          |
| **DHT11 VCC**    | Power     | **3V3**     | Power        |
| **DHT11 DATA**   | Digital   | **GPIO 4**  | Digital      |
| **DHT11 GND**    | Ground    | **GND**     | Ground       |
| **LDR VCC**      | Power     | **3V3**     | Power        |
| **LDR A0**       | Analog    | **GPIO 34** | Analog Input |
| **LDR GND**      | Ground    | **GND**     | Ground       |

---

## 🔌 Detailed Sensor Connections

### 1️⃣ MAX30102 (Pulse Oximeter & Heart Rate Sensor)

**Communication Protocol:** I2C (Inter-Integrated Circuit)  
**Default Address:** 0x57

| MAX30102 Pin | ESP32 Pin   | Wire Color (Recommended) | Notes            |
| :----------- | :---------- | :----------------------- | :--------------- |
| **VIN**      | **3V3**     | Red                      | Power Supply     |
| **GND**      | **GND**     | Black                    | Ground Reference |
| **SDA**      | **GPIO 21** | Blue                     | I2C Data Line    |
| **SCL**      | **GPIO 22** | Yellow                   | I2C Clock Line   |

**Special Notes:**

- I2C requires pull-up resistors (usually 4.7kΩ on each of SDA/SCL)
- Many MAX30102 breakout boards include these pull-ups
- Verify no other I2C devices conflict at address 0x57
- Place the sensor on a stable breadboard

**Connection Diagram (Text):**

```
ESP32              MAX30102
3V3 ────────────→ VIN
GND ────────────→ GND
GPIO 21 ────────→ SDA
GPIO 22 ────────→ SCL
```

---

### 2️⃣ DHT11 (Temperature & Humidity Sensor)

**Communication Protocol:** Single-Wire Digital  
**Operating Voltage:** 3.3V to 5V

| DHT11 Pin      | ESP32 Pin  | Wire Color (Recommended) | Notes            |
| :------------- | :--------- | :----------------------- | :--------------- |
| **VCC (+)**    | **3V3**    | Red                      | Power Supply     |
| **DATA (out)** | **GPIO 4** | Green                    | Digital Data     |
| **GND (-)**    | **GND**    | Black                    | Ground Reference |

**Special Notes:**

- Data pin may require a 10kΩ pull-up resistor to VCC (check your module)
- Keep the sensor away from direct heat sources
- Sensor has ~2-second response time
- Do not exceed read frequency of 1 Hz (1 reading per second)

**Connection Diagram (Text):**

```
ESP32              DHT11
3V3 ────────────→ VCC
GPIO 4 ─────────→ DATA
GND ────────────→ GND
```

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
MAX30102:    SDA→GPIO21, SCL→GPIO22
DHT11:       DATA→GPIO4
LDR:         A0→GPIO34
```

---

## 🔋 Power & Ground Summary

### Power Distribution

- **3V3 Rail:** Supplies all sensors (max ~500mA total)
  - MAX30102: ~15mA
  - DHT11: ~2mA
  - LDR Module: ~5mA
  - Total: **~22mA** (well within limits)

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

- [ ] MAX30102 lights up (red indicator LED)
- [ ] DHT11 responds (no error in serial monitor)
- [ ] LDR reads changing values when light changes
- [ ] I2C devices found at 0x57 (MAX30102)
- [ ] No erratic readings on power-up
- [ ] WiFi connects successfully
- [ ] Firebase data appears in dashboard

---

## 📡 I2C Address Reference

If using I2C address scanner, you should see:

```
Scanning I2C addresses...
I2C device found at address 0x57 (MAX30102)
Scan complete.
```

If you don't see 0x57:

1. Check SDA/SCL wiring
2. Verify 3.3V power on MAX30102
3. Try swapping SDA/SCL (rare cases)
4. Test with different I2C address (consult datasheet)

---

## 🛠️ Troubleshooting by Symptom

| Symptom                          | Likely Cause           | Solution                            |
| :------------------------------- | :--------------------- | :---------------------------------- |
| MAX30102 not responding          | Wrong pins or 5V power | Check GPIO 21/22, ensure 3.3V       |
| DHT11 reading ~0 or 999          | No power or wrong pin  | Verify GPIO 4 and VCC connection    |
| LDR always returns 0             | ADC not initialized    | Check `pinMode(LDR_PIN, INPUT)`     |
| WiFi connects but Firebase fails | URL incorrect          | Verify Firebase URL format          |
| All sensors unresponsive         | Power issue            | Check GND connections               |
| I2C conflicts                    | Address 0x57 occupied  | Change MAX30102 address if possible |

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
       GPIO35│   │                      │   │ GPIO5
       GPIO32│   │                      │   │ GPIO17
       GPIO33│   │                      │   │ GPIO16
       GPIO25│   │                      │   │ GPIO4  ← DHT11 DATA
       GPIO26│   │                      │   │ GPIO0
       GPIO27│   │                      │   │ GPIO2
       GPIO14│   │                      │   │ GPIO15
       GPIO12│   │                      │   │ GPIO13
       GPIO11│   │                      │   │ GPIO12
       GPIO10│   │                      │   │ GPIO9
       GPIO9 │   │                      │   │ GPIO8
       GPIO8 │   │                      │   │ GPIO7
       GPIO7 │   │                      │   │ GPIO6
       GPIO6 │   │                      │   │ GPIO21 ← MAX30102 SDA
       GPIO5 │   │                      │   │ GPIO22 ← MAX30102 SCL
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
- [ ] **Step 2:** Connect MAX30102 I2C (GPIO 21, 22)
- [ ] **Step 3:** Connect DHT11 data (GPIO 4)
- [ ] **Step 4:** Connect LDR analog (GPIO 34)
- [ ] **Step 5:** Verify all connections with multimeter
- [ ] **Step 6:** Upload firmware to ESP32
- [ ] **Step 7:** Open serial monitor (115200 baud)
- [ ] **Step 8:** Check initialization messages
- [ ] **Step 9:** Verify sensor readings in serial output
- [ ] **Step 10:** Check Firebase dashboard for data

---

## 📚 Additional Resources

- **ESP32 Official Pinout:** https://www.espressif.com/en/products/socs/esp32/
- **MAX30102 Datasheet:** https://datasheets.maximintegrated.com/en/ds/MAX30102.pdf
- **DHT11 Datasheet:** https://www.mouser.com/datasheet/2/758/DHT11-9151000B1-9.pdf

---

**Last Updated:** 2024  
**Project:** MindEase Lite v1.0  
**Status:** Production Ready ✓
