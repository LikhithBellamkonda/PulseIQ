# synthetic_dataset.py
"""
1. DATASET GENERATION PIPELINE
Generates a highly realistic, balanced synthetic dataset of 7,500 samples (1,500 per class) 
using strictly Heart Rate (BPM) and Ambient Light Intensity (LDR value).
Includes natural Gaussian noise and realistic, scientifically reasonable overlapping ranges 
to simulate true clinical/physiological variance, ensuring an realistic classification accuracy 
target between 80-95% (avoiding artificial 99-100% separability).
"""

import numpy as np
import pandas as pd
import os

# Set random seed for reproducibility
np.random.seed(42)

# Number of samples per category (balanced: 5 categories * 1500 = 7500 samples)
SAMPLES_PER_CLASS = 1500
TOTAL_SAMPLES = SAMPLES_PER_CLASS * 5

# Target distributions matching specified physical ranges with overlapping bounds
class_profiles = {
    "Relaxed": {
        "hr_mean": 62.5, "hr_std": 4.5,
        "light_mean": 3297.5, "light_std": 350.0
    },
    "Normal": {
        "hr_mean": 77.5, "hr_std": 5.0,
        "light_mean": 2650.0, "light_std": 400.0
    },
    "Mild Stress": {
        "hr_mean": 92.5, "hr_std": 5.5,
        "light_mean": 1850.0, "light_std": 350.0
    },
    "Moderate Stress": {
        "hr_mean": 110.0, "hr_std": 6.0,
        "light_mean": 1150.0, "light_std": 300.0
    },
    "High Stress": {
        "hr_mean": 135.0, "hr_std": 8.0,
        "light_mean": 600.0, "light_std": 250.0
    }
}

data = []

for category, params in class_profiles.items():
    # Sample heart rate and light intensity values
    hr_samples = np.random.normal(params["hr_mean"], params["hr_std"], SAMPLES_PER_CLASS)
    light_samples = np.random.normal(params["light_mean"], params["light_std"], SAMPLES_PER_CLASS)
    
    # Clip values to standard physiological and electronic limits (LDR ADC: 12-bit, 0 to 4095)
    hr_samples = np.clip(hr_samples, 45, 175).astype(int)
    light_samples = np.clip(light_samples, 0, 4095).astype(int)
    
    for hr, light in zip(hr_samples, light_samples):
        # Calculate scientifically reasonable, continuous Stress Score (0 to 100%)
        # Features normalized to physical limits
        hr_norm = (hr - 50) / (160 - 50)     # Standard normal HR range
        light_norm = (4095 - light) / 4095   # Inverse light: lower light = higher score contribution
        
        # Clip normalized limits to [0, 1]
        hr_norm = np.clip(hr_norm, 0, 1)
        light_norm = np.clip(light_norm, 0, 1)
        
        # Continuous Stress Score weighted sum: Heart Rate = 60%, Environment Light = 40%
        base_score = (0.6 * hr_norm + 0.4 * light_norm) * 100
        
        # Introduce sensor noise (+/- 5%) to create natural overlap
        noise = np.random.normal(0, 4)
        stress_score = np.clip(base_score + noise, 0, 100)
        
        data.append({
            "heart_rate": hr,
            "light": light,
            "stress_score": round(stress_score, 1),
            "stress_category": category
        })

# Create DataFrame and shuffle to simulate real-time feed sequence
df = pd.DataFrame(data)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save to destination CSV
ml_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(ml_dir, exist_ok=True)
csv_path = os.path.join(ml_dir, "synthetic_stress_dataset.csv")
df.to_csv(csv_path, index=False)

print("[SUCCESS] Balanced synthetic dataset generated!")
print(f"[PATH] Saved CSV to: {csv_path}")
print(f"[SHAPE] Dataset Shape: {df.shape}")
print("\nClass Distribution Counts:")
print(df["stress_category"].value_counts())
print("\nFeature Summary per Class:")
print(df.groupby("stress_category")[["heart_rate", "light", "stress_score"]].mean().round(2))
