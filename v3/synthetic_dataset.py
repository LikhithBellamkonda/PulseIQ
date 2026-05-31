import numpy as np
import pandas as pd
import os

# Set random seed for reproducibility
np.random.seed(42)

# Number of samples per category (balanced: 5 categories * 1000 = 5000 samples)
SAMPLES_PER_CLASS = 1000
TOTAL_SAMPLES = SAMPLES_PER_CLASS * 5

# Define target distributions for each category (mean and standard deviation)
# These are designed to align with the required ranges but allow natural overlaps (noise)
class_distributions = {
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

for category, params in class_distributions.items():
    # Generate Heart Rate (BPM)
    hr_samples = np.random.normal(params["hr_mean"], params["hr_std"], SAMPLES_PER_CLASS)
    # Generate Light Intensity (LDR value)
    light_samples = np.random.normal(params["light_mean"], params["light_std"], SAMPLES_PER_CLASS)
    
    # Clip to physical limits
    hr_samples = np.clip(hr_samples, 45, 175).astype(int)
    light_samples = np.clip(light_samples, 0, 4095).astype(int)
    
    for hr, light in zip(hr_samples, light_samples):
        # Calculate a continuous, scientifically reasonable stress score (0 to 100)
        # 1. Higher Heart Rate directly increases stress.
        # 2. Lower Light intensity increases stress (dark environments correlate with higher stress classes in this model).
        hr_norm = (hr - 50) / (160 - 50)  # Normalize HR based on standard presentation range
        light_norm = (4095 - light) / 4095  # Normalize Light so 0 (dark) is 1.0 (high stress factor)
        
        # Clip normalized values between 0 and 1
        hr_norm = np.clip(hr_norm, 0, 1)
        light_norm = np.clip(light_norm, 0, 1)
        
        # Weighted sum: Heart Rate has 60% impact, Light has 40% impact
        base_score = (0.6 * hr_norm + 0.4 * light_norm) * 100
        
        # Add random noise (+/- 5 points) to simulate sensor variability and overlap
        noise = np.random.normal(0, 4)
        stress_score = np.clip(base_score + noise, 0, 100)
        
        data.append({
            "heart_rate": hr,
            "light": light,
            "stress_score": round(stress_score, 1),
            "stress_category": category
        })

# Create DataFrame
df = pd.DataFrame(data)

# Shuffle the dataset to mix classes realistically
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save to CSV in the current folder (v3)
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "synthetic_stress_dataset.csv")
df.to_csv(output_path, index=False)

print("[SUCCESS] Balanced synthetic dataset successfully generated!")
print(f"[PATH] Location: {output_path}")
print(f"[SHAPE] Dataset Shape: {df.shape}")
print("\nValue Counts per Class:")
print(df["stress_category"].value_counts())
print("\nFeature Summary per Class:")
print(df.groupby("stress_category")[["heart_rate", "light", "stress_score"]].mean().round(2))
