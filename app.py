from flask import Flask, jsonify, render_template
import pickle
import pandas as pd
import requests
import os
import json
from datetime import datetime

app = Flask(__name__, template_folder='templates')

# ================================================================
# 1. LOAD ML MODEL
# ================================================================
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml_model', 'stress_model.pkl')

model = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print(f"✓ Model loaded successfully from {MODEL_PATH}")
    except Exception as e:
        print(f"⚠ Error loading model: {e}")
else:
    print(f"⚠ Model not found at {MODEL_PATH}")
    print("  Please run train_model.py first in the ml_model/ folder")

# ================================================================
# 2. FIREBASE CONFIGURATION
# ================================================================
# ⚠️ CRITICAL: Replace with your actual Firebase Realtime Database URL
# Format: "https://<YOUR-PROJECT-ID>-default-rtdb.firebaseio.com/sensors.json"
# Example: "https://mindease-lite-12345-default-rtdb.firebaseio.com/sensors.json"
FIREBASE_URL = os.getenv("FIREBASE_URL", "https://your-project-id-default-rtdb.firebaseio.com/sensors.json")

# Default fallback data when Firebase is unreachable
DEFAULT_FALLBACK = {
    "heart_rate": 72,
    "spo2": 98,
    "temperature": 24.5,
    "humidity": 45.0,
    "light": 400
}

# ================================================================
# 3. ROUTES
# ================================================================

@app.route("/")
def index():
    """Serve the main dashboard"""
    return render_template("index.html")

@app.route("/api/data")
def get_data():
    """
    Fetch sensor data from Firebase, run ML inference, and return results
    Includes comprehensive fallback logic for robustness
    """
    
    # Start with fallback defaults
    sensor_data = DEFAULT_FALLBACK.copy()
    firebase_status = "disconnected"
    
    # ================================================================
    # ATTEMPT 1: Fetch from Firebase REST API
    # ================================================================
    try:
        response = requests.get(FIREBASE_URL, timeout=3)
        
        if response.status_code == 200:
            fb_data = response.json()
            
            # Check if we got valid data (not null)
            if fb_data and isinstance(fb_data, dict):
                # Validate each field, fall back to default if missing
                sensor_data["heart_rate"] = int(fb_data.get("heart_rate", DEFAULT_FALLBACK["heart_rate"]))
                sensor_data["spo2"] = int(fb_data.get("spo2", DEFAULT_FALLBACK["spo2"]))
                sensor_data["temperature"] = float(fb_data.get("temperature", DEFAULT_FALLBACK["temperature"]))
                sensor_data["humidity"] = float(fb_data.get("humidity", DEFAULT_FALLBACK["humidity"]))
                sensor_data["light"] = int(fb_data.get("light", DEFAULT_FALLBACK["light"]))
                firebase_status = "connected"
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Data fetched from Firebase")
            else:
                firebase_status = "empty"
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Firebase returned null/empty")
        else:
            firebase_status = f"http_{response.status_code}"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Firebase HTTP {response.status_code}")
            
    except requests.exceptions.Timeout:
        firebase_status = "timeout"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Firebase request timeout - using fallback")
    except requests.exceptions.ConnectionError:
        firebase_status = "connection_error"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Firebase connection error - using fallback")
    except Exception as e:
        firebase_status = "error"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Unexpected Firebase error: {type(e).__name__}: {e}")

    # ================================================================
    # STEP 2: Run ML Inference
    # ================================================================
    stress_level = "Unknown"
    confidence = 0.0
    
    if model:
        try:
            # Prepare feature vector
            features = pd.DataFrame([{
                "heart_rate": sensor_data["heart_rate"],
                "spo2": sensor_data["spo2"],
                "temperature": sensor_data["temperature"],
                "humidity": sensor_data["humidity"],
                "light": sensor_data["light"]
            }])
            
            # Get prediction
            prediction = model.predict(features)[0]
            
            # Get confidence scores
            probabilities = model.predict_proba(features)[0]
            confidence = float(max(probabilities))
            
            stress_level = prediction
            
        except Exception as e:
            print(f"⚠ ML Inference error: {e}")
            stress_level = "Error"
    else:
        stress_level = "Model Not Loaded"

    # ================================================================
    # STEP 3: Build Response
    # ================================================================
    response_data = {
        "timestamp": datetime.now().isoformat(),
        "heart_rate": sensor_data["heart_rate"],
        "spo2": sensor_data["spo2"],
        "temperature": round(sensor_data["temperature"], 1),
        "humidity": round(sensor_data["humidity"], 1),
        "light": sensor_data["light"],
        "stress_level": stress_level,
        "confidence": round(confidence, 2),
        "firebase_status": firebase_status,
        "data_source": "firebase" if firebase_status == "connected" else "fallback"
    }
    
    return jsonify(response_data)

@app.route("/api/status")
def get_status():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    })

# ================================================================
# 4. ERROR HANDLERS
# ================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ================================================================
# 5. MAIN
# ================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("MindEase Lite: Flask Backend Server")
    print("=" * 70)
    print(f"Model Status: {'✓ Loaded' if model else '✗ Not Found'}")
    print(f"Firebase URL: {FIREBASE_URL}")
    print("\nStarting Flask server on http://0.0.0.0:5000")
    print("Dashboard: http://localhost:5000")
    print("API Endpoint: http://localhost:5000/api/data")
    print("=" * 70 + "\n")
    
    app.run(debug=True, host="0.0.0.0", port=5000)