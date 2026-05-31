import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib
import json
import os

# 1. Load the generated synthetic dataset
data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "synthetic_stress_dataset.csv")
if not os.path.exists(data_path):
    raise FileNotFoundError(f"Dataset not found at {data_path}. Please run synthetic_dataset.py first.")

df = pd.read_csv(data_path)

# Features: Heart Rate and Light Intensity
X = df[["heart_rate", "light"]]
# Classification target
y_class = df["stress_category"]
# Regression target for threshold calibration
y_score = df["stress_score"]

# 2. Split the dataset (70% Train, 15% Validation, 15% Test)
X_temp, X_test, y_class_temp, y_class_test, y_score_temp, y_score_test = train_test_split(
    X, y_class, y_score, test_size=0.15, random_state=42, stratify=y_class
)

X_train, X_val, y_class_train, y_class_val, y_score_train, y_score_val = train_test_split(
    X_temp, y_class_temp, y_score_temp, test_size=0.1765, random_state=42, stratify=y_class_temp
)

print("[INFO] Data split successfully:")
print(f"   - Training set: {X_train.shape[0]} samples")
print(f"   - Validation set: {X_val.shape[0]} samples")
print(f"   - Test set: {X_test.shape[0]} samples\n")

# 3. Train multiple candidate models
models = {
    "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
}

best_model = None
best_acc = 0.0
best_model_name = ""

print("=== Evaluating Candidate Models on Validation Set ===")
for name, model in models.items():
    model.fit(X_train, y_class_train)
    val_preds = model.predict(X_val)
    
    acc = accuracy_score(y_class_val, val_preds)
    prec = precision_score(y_class_val, val_preds, average="weighted")
    rec = recall_score(y_class_val, val_preds, average="weighted")
    f1 = f1_score(y_class_val, val_preds, average="weighted")
    
    print(f"\n[MODEL] {name} Performance:")
    print(f"   - Accuracy:  {acc * 100:.2f}%")
    print(f"   - Precision: {prec * 100:.2f}%")
    print(f"   - Recall:    {rec * 100:.2f}%")
    print(f"   - F1-Score:  {f1 * 100:.2f}%")
    
    if acc > best_acc:
        best_acc = acc
        best_model = model
        best_model_name = name

print(f"\n[SUCCESS] Best Model Selected: {best_model_name} with Validation Accuracy: {best_acc * 100:.2f}%")

# 4. Final Evaluation of Selected Model on Test Set
test_preds = best_model.predict(X_test)
test_acc = accuracy_score(y_class_test, test_preds)
test_prec = precision_score(y_class_test, test_preds, average="weighted")
test_rec = recall_score(y_class_test, test_preds, average="weighted")
test_f1 = f1_score(y_class_test, test_preds, average="weighted")
cm = confusion_matrix(y_class_test, test_preds, labels=["Relaxed", "Normal", "Mild Stress", "Moderate Stress", "High Stress"])

print("\n================ FINAL TEST SET EVALUATION ================")
print(f"Selected Model: {best_model_name}")
print(f"Accuracy:  {test_acc * 100:.2f}%")
print(f"Precision: {test_prec * 100:.2f}%")
print(f"Recall:    {test_rec * 100:.2f}%")
print(f"F1-Score:  {test_f1 * 100:.2f}%")
print("\nConfusion Matrix:")
print(pd.DataFrame(cm, 
                   index=[f"True {c}" for c in ["Relaxed", "Normal", "Mild Stress", "Moderate Stress", "High Stress"]],
                   columns=[f"Pred {c}" for c in ["Relaxed", "Normal", "Mild Stress", "Moderate Stress", "High Stress"]]))
print("==========================================================")

# 5. Save the trained Classifier Model
model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, "best_stress_model.pkl")
joblib.dump(best_model, model_path)
print(f"\n[SAVE] Saved best classifier model to: {model_path}")

# 6. Threshold Generation & Model Weight Extraction
# We train a highly explainable Linear Regression model to map (HR, Light) -> Stress Score.
# This gives the dashboard an offline runtime model without requiring complex Python libraries.
reg = LinearRegression()
reg.fit(X_train, y_score_train)

# Extract coefficients
w_intercept = float(reg.intercept_)
w_hr = float(reg.coef_[0])
w_light = float(reg.coef_[1])

# Calculate predicted stress scores on the full training set
df_train = pd.DataFrame(X_train, columns=["heart_rate", "light"])
df_train["true_category"] = y_class_train
df_train["pred_score"] = reg.predict(X_train)

# Calculate mean predicted score for each category
class_means = df_train.groupby("true_category")["pred_score"].mean().to_dict()

# Order the classes to find clean decision boundaries
ordered_classes = ["Relaxed", "Normal", "Mild Stress", "Moderate Stress", "High Stress"]
means_in_order = [class_means[c] for c in ordered_classes]

# Compute midpoints between class means as our threshold decision boundaries
t1 = float((means_in_order[0] + means_in_order[1]) / 2)
t2 = float((means_in_order[1] + means_in_order[2]) / 2)
t3 = float((means_in_order[2] + means_in_order[3]) / 2)
t4 = float((means_in_order[3] + means_in_order[4]) / 2)

# Save thresholds and model configuration to JSON
thresholds_config = {
    "model_info": {
        "description": "Linear regression weights mapping Heart Rate and Light to a continuous 0-100 Stress Score.",
        "intercept": w_intercept,
        "weight_heart_rate": w_hr,
        "weight_light": w_light
    },
    "thresholds": {
        "T1_Relaxed_Normal": t1,
        "T2_Normal_Mild": t2,
        "T3_Mild_Moderate": t3,
        "T4_Moderate_High": t4
    },
    "categories_meta": {
        "Relaxed": {"min": 0.0, "max": t1},
        "Normal": {"min": t1, "max": t2},
        "Mild Stress": {"min": t2, "max": t3},
        "Moderate Stress": {"min": t3, "max": t4},
        "High Stress": {"min": t4, "max": 100.0}
    }
}

thresholds_path = os.path.join(model_dir, "thresholds.json")
with open(thresholds_path, "w") as f:
    json.dump(thresholds_config, f, indent=4)

print(f"[SAVE] Saved fixed thresholds and model weights to: {thresholds_path}")
print("\nGenerated Threshold Boundaries:")
print(f"   - Relaxed / Normal Boundary:  {t1:.2f}")
print(f"   - Normal / Mild Boundary:     {t2:.2f}")
print(f"   - Mild / Moderate Boundary:   {t3:.2f}")
print(f"   - Moderate / High Boundary:   {t4:.2f}")
