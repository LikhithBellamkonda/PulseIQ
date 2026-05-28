import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import pickle
import os

print("=" * 60)
print("MindEase Lite: ML Model Training Script (No SpO2)")
print("=" * 60)

print("\n[1/4] Generating synthetic wellness dataset...")
np.random.seed(42)

def generate_data(n, state):
    """Generate realistic vital signs for different stress states"""
    if state == "Relaxed":
        hr = np.random.randint(60, 85, n)
        temp = np.random.uniform(22.0, 26.0, n)
        hum = np.random.uniform(40.0, 55.0, n)
        light = np.random.randint(300, 600, n)
    elif state == "Mild Stress":
        hr = np.random.randint(85, 105, n)
        temp = np.random.uniform(26.0, 29.0, n)
        hum = np.random.uniform(55.0, 65.0, n)
        light = np.random.randint(200, 400, n)
    else:  # High Stress
        hr = np.random.randint(105, 140, n)
        temp = np.random.uniform(29.0, 35.0, n)
        hum = np.random.uniform(65.0, 85.0, n)
        light = np.random.randint(50, 200, n)

    return pd.DataFrame({
        "heart_rate": hr,
        "temperature": np.round(temp, 1),
        "humidity": np.round(hum, 1),
        "light": light,
        "label": [state] * n
    })

# Create 500 rows of data distributed across 3 stress levels
df_relaxed = generate_data(200, "Relaxed")
df_mild = generate_data(150, "Mild Stress")
df_high = generate_data(150, "High Stress")

# Combine and shuffle
df = pd.concat([df_relaxed, df_mild, df_high]).sample(frac=1).reset_index(drop=True)
df.to_csv("dataset.csv", index=False)
print(f"✓ Generated 500-row dataset with distribution:")
print(f"  - Relaxed: {len(df_relaxed)}")
print(f"  - Mild Stress: {len(df_mild)}")
print(f"  - High Stress: {len(df_high)}")
print(f"✓ Saved to: dataset.csv")

print("\n[2/4] Preparing training data...")
X = df[["heart_rate", "temperature", "humidity", "light"]]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"✓ Training set: {len(X_train)} samples")
print(f"✓ Test set: {len(X_test)} samples")

print("\n[3/4] Training Random Forest Classifier...")
clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
clf.fit(X_train, y_train)

train_accuracy = clf.score(X_train, y_train)
test_accuracy = clf.score(X_test, y_test)
print(f"✓ Training Accuracy: {train_accuracy*100:.1f}%")
print(f"✓ Test Accuracy: {test_accuracy*100:.1f}%")

print("\nClassification Report:")
y_pred = clf.predict(X_test)
report = classification_report(y_test, y_pred)
print(report)

# Generate Confusion Matrix Graph
cm = confusion_matrix(y_test, y_pred, labels=clf.classes_)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=clf.classes_, yticklabels=clf.classes_)
plt.title('Confusion Matrix for Stress Prediction')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.savefig('confusion_matrix.png')
print("✓ Confusion matrix graph saved to: confusion_matrix.png")

print("\n[4/4] Saving model...")
with open("stress_model.pkl", "wb") as f:
    pickle.dump(clf, f)
print("✓ Model exported to: stress_model.pkl")

print("\n" + "=" * 60)
print("Training Complete! Ready for deployment.")
print("=" * 60)