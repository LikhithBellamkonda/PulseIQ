import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# 1. Generate Synthetic Data
np.random.seed(42)
n_samples = 5000

# Features: Heart Rate, Light (LDR), Temperature, Humidity
hr = np.random.normal(75, 20, n_samples).clip(40, 150)
light = np.random.normal(1500, 1000, n_samples).clip(0, 4095)
temp = np.random.normal(25, 10, n_samples).clip(0, 45)
humidity = np.random.normal(50, 20, n_samples).clip(10, 90)

# Rules for Stress Level:
# 0: Relaxed (HR 60-90, Light 200-2000, Temp 15-30)
# 1: Mild Stress (HR 90-100 or HR 55-60)
# 2: Elevated Stress (HR 100-115, High/Low Temp)
# 3: High Stress (HR > 115 or HR < 55)
labels = []
for i in range(n_samples):
    h = hr[i]
    l = light[i]
    t = temp[i]
    
    if h > 115 or h < 55:
        labels.append("High Stress")
    elif 100 < h <= 115 or t > 35 or t < 5:
        labels.append("Elevated Stress")
    elif (90 < h <= 100) or l < 100 or l > 3800:
        labels.append("Mild Stress")
    else:
        labels.append("Relaxed")

df = pd.DataFrame({
    'HeartRate': hr,
    'Light': light,
    'Temperature': temp,
    'Humidity': humidity,
    'StressLevel': labels
})

# 2. Train Model
X = df[['HeartRate', 'Light', 'Temperature', 'Humidity']]
y = df['StressLevel']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# 3. Validation & Stats
y_pred = clf.predict(X_test)
print("========== ML MODEL STATS ==========")
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))
print("====================================")

joblib.dump(clf, 'stress_model.pkl')
print("Model saved to stress_model.pkl")
