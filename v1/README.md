# 📄 Project Summary: MindEase Lite (PulseIQ)

## **Project Title**
**MindEase Lite (PulseIQ): IoT-Based Wellness and Stress Monitoring System Using Machine Learning**

## **1. Abstract / Introduction**
Stress is a significant factor affecting overall human health and productivity. **MindEase Lite (PulseIQ)** is a scalable, Internet of Things (IoT) based wellness monitoring system designed to observe both physiological signals and environmental conditions in real-time. By utilizing an ESP32 microcontroller, physiological sensors (Heart Rate, SpO2), and environmental sensors (Temperature, Humidity, Light), the system collects continuous user data. This data is transmitted to a cloud database and processed by a Machine Learning (ML) algorithm on a Python backend to predict the user's current stress state (Relaxed, Mild Stress, or High Stress). The final output is displayed on a live, responsive web dashboard.

## **2. Primary Objectives**
* To build a continuous monitoring system using low-cost IoT sensors without the need for invasive medical equipment.
* To successfully integrate hardware (ESP32) with a cloud database (Firebase) using REST APIs.
* To apply Machine Learning (Random Forest Classifier) to classify stress states based on combined physiological and environmental inputs.
* To develop a real-time web dashboard for live visualization of the user's wellness metrics.

## **3. System Architecture**

### **A. Hardware Components**
The hardware is deliberately lightweight, focusing on core wellness indicators:
1. **ESP32 Development Board:** Acts as the main processing unit and provides built-in Wi-Fi for cloud connectivity.
2. **MAX30102 Pulse Oximeter:** Measures internal physiological metrics (Heart Rate in bpm and Blood Oxygen Saturation / SpO2 in %). 
3. **DHT11 Sensor:** Measures external environmental comfort (Room Temperature and Relative Humidity).
4. **LDR (Light Dependent Resistor) Module:** Measures ambient light intensity, as poor or harsh lighting can act as an environmental stressor.

### **B. Software & Tech Stack**
* **IoT Firmware:** C++ (Arduino IDE) utilizing basic HTTP communication.
* **Cloud Platform:** Firebase Realtime Database (used as a rapid, real-time data bridge).
* **Backend Server:** Python with the Flask framework.
* **Machine Learning:** `scikit-learn` (Random Forest Classifier trained on a synthesized physiological dataset).
* **Frontend Dashboard:** HTML, CSS, and Vanilla JavaScript.

## **4. Working Mechanism (Step-by-Step Flow)**
1. **Data Acquisition:** The ESP32 continuously polls the MAX30102, DHT11, and LDR sensors.
2. **Cloud Upload:** Every 10 seconds, the ESP32 packages these five readings (HR, SpO2, Temp, Humidity, Light) into a JSON payload and pushes it to the Firebase Realtime Database via an HTTP `PUT` request.
3. **Data Fetching:** A Python Flask backend server continuously retrieves the latest data from Firebase.
4. **ML Inference:** The Flask server feeds the fetched data into a pre-trained Random Forest ML model. The model analyzes the relationship between the vitals and the environment to output a prediction: *Relaxed*, *Mild Stress*, or *High Stress*.
5. **Dashboard Visualization:** The web dashboard polls the Flask backend API and dynamically updates the UI. It displays the live sensor values and changes the status banner's color (Green, Yellow, Red) based on the ML prediction.

## **5. Key Project Features**
* **Non-Clinical "Wellness" Positioning:** Safe to present in academic settings as it monitors "wellness and stress indicators" rather than attempting medical-grade psychiatric diagnosis.
* **Bug-Free Cloud Integration:** Uses raw HTTP REST API calls instead of heavy, conflict-prone Firebase SDKs, ensuring stable performance during live demos.
* **Intelligent Fallbacks:** Both the hardware and software are programmed with dummy-data fallbacks so the system never crashes if a sensor wire comes loose or the Wi-Fi drops.
* **High Academic Value:** Perfectly bridges three major engineering domains: Embedded Systems (IoT), Cloud Computing, and Artificial Intelligence (ML).

## **6. Future Scope & Applications**
While built as a prototype, this architecture can be scaled for:
* **Corporate Workspaces:** Monitoring employee workstation conditions to optimize HVAC/lighting and reduce burnout.
* **Elderly Care:** Remote monitoring of elderly individuals' vitals by family members.
* **Student Focus Tracking:** Helping students understand their optimal study conditions and when to take breaks.

## **7. Setup & Run Instructions**
1. **Install Dependencies:** `pip install flask pandas scikit-learn requests`
2. **Train Model:** `cd ml_model && python train_model.py`
3. **Run Server:** `python app.py` (from root directory)
4. **View Dashboard:** Open `http://localhost:5000` in your web browser.
