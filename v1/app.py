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
# Example: "https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json"
FIREBASE_URL = os.getenv("FIREBASE_URL", "https://iotpbl-d8b32-default-rtdb.firebaseio.com/sensors.json")

# Default fallback data when Firebase is unreachable
DEFAULT_FALLBACK = {
    "heart_rate": 72,
    "temperature": 24.5,
    "humidity": 45.0,
    "light": 400
}

# ================================================================
# WEATHER API CACHE
# ================================================================
from datetime import timedelta

weather_cache = {
    "location": "London",
    "lat": 51.50853,
    "lon": -0.12574,
    "temperature": 20.0,
    "humidity": 50.0,
    "last_fetched": datetime.min
}

# ================================================================
# 3. ROUTES
# ================================================================

from flask import request

@app.route("/")
def index():
    """Serve the main dashboard"""
    return render_template("index.html")

@app.route("/api/set_location", methods=["POST"])
def set_location():
    global weather_cache
    data = request.json
    city = data.get("city", "")
    if city:
        try:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&format=json"
            res = requests.get(geo_url, timeout=5).json()
            if "results" in res and len(res["results"]) > 0:
                weather_cache["lat"] = res["results"][0]["latitude"]
                weather_cache["lon"] = res["results"][0]["longitude"]
                weather_cache["location"] = res["results"][0]["name"]
                weather_cache["last_fetched"] = datetime.min # Force refresh next time
                return jsonify({"status": "success", "location": weather_cache["location"]})
            else:
                return jsonify({"status": "error", "message": "City not found"}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    return jsonify({"status": "error", "message": "No city provided"}), 400

@app.route("/api/data")
def get_data():
    """
    Fetch sensor data from Firebase, run ML inference, and return results
    Includes comprehensive fallback logic for robustness
    """
    global weather_cache
    
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
    # OVERRIDE WITH WEATHER API
    # ================================================================
    try:
        if datetime.now() - weather_cache["last_fetched"] > timedelta(minutes=5):
            w_url = f"https://api.open-meteo.com/v1/forecast?latitude={weather_cache['lat']}&longitude={weather_cache['lon']}&current=temperature_2m,relative_humidity_2m"
            w_res = requests.get(w_url, timeout=5).json()
            if "current" in w_res:
                weather_cache["temperature"] = w_res["current"]["temperature_2m"]
                weather_cache["humidity"] = w_res["current"]["relative_humidity_2m"]
                weather_cache["last_fetched"] = datetime.now()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Weather updated for {weather_cache['location']}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Weather API Error: {e}")

    sensor_data["temperature"] = weather_cache["temperature"]
    sensor_data["humidity"] = weather_cache["humidity"]

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
        "temperature": round(sensor_data["temperature"], 1),
        "humidity": round(sensor_data["humidity"], 1),
        "light": sensor_data["light"],
        "location": weather_cache["location"],
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