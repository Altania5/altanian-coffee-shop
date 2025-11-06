# 🚀 Complete Guide: Using Your 60 Coffee Logs for AI Training

## 📋 Overview
You now have **60 coffee logs** exported and ready for AI training! This guide will walk you through using this data in Google Colab or any ML environment.

## 📁 Available Files
- `coffee_logs_training_data_fresh.csv` - **Main training file** (recommended)
- `coffee_logs_training_data_fresh.json` - Alternative JSON format
- `coffee_logs_summary_fresh.json` - Dataset statistics

## 🎯 Dataset Features (60 samples)
- **Core Parameters**: grind size, extraction time, temperature, dose, yield
- **Derived Metrics**: ratio, flow rate
- **Quality Indicators**: shot quality, rating
- **Environmental**: ambient temperature, humidity
- **Techniques**: puck screen, WDT, pre-infusion
- **Bean Info**: roast level, process method
- **Temporal**: brew dates, timestamps

## 🔧 Quick Start - Google Colab

### Step 1: Upload Your Data
```python
# Upload the CSV file to Colab
from google.colab import files
uploaded = files.upload()

# Load the data
import pandas as pd
import numpy as np

df = pd.read_csv('coffee_logs_training_data_fresh.csv')
print(f"📊 Loaded {len(df)} coffee logs")
print(f"📈 Dataset shape: {df.shape}")
```

### Step 2: Data Exploration
```python
# Basic info
print("📊 Dataset Info:")
print(df.info())

# Quality distribution
print("\n📈 Shot Quality Distribution:")
print(df['shotQuality'].value_counts())

# Roast level distribution
print("\n☕ Roast Level Distribution:")
print(df['roastLevel'].value_counts())

# Missing values check
print("\n❓ Missing Values:")
print(df.isnull().sum())
```

### Step 3: Feature Preparation
```python
# Select features for training
feature_columns = [
    'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
    'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
    'roastLevel', 'processMethod', 'ratio', 'flowRate', 'pressure',
    'ambientTemperature', 'humidity'
]

# Prepare features
X = df[feature_columns].copy()

# Handle categorical variables
from sklearn.preprocessing import LabelEncoder
le_roast = LabelEncoder()
le_process = LabelEncoder()

X['roastLevel'] = le_roast.fit_transform(X['roastLevel'])
X['processMethod'] = le_process.fit_transform(X['processMethod'])

# Target variable
y = df['shotQuality']

print(f"Features shape: {X.shape}")
print(f"Target shape: {y.shape}")
```

### Step 4: Train Models
```python
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train Random Forest
rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# Make predictions
y_pred = rf_model.predict(X_test)

# Evaluate
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Absolute Error: {mae:.2f}")
print(f"R² Score: {r2:.2f}")
```

### Step 5: Feature Importance
```python
# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)

print("🔍 Feature Importance:")
print(feature_importance)
```

## 🧠 Advanced Training Options

### Neural Network with TensorFlow
```python
import tensorflow as tf
from tensorflow.keras import layers

# Normalize features
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# Build neural network
model = tf.keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# Train
history = model.fit(X_train, y_train, 
                   validation_split=0.2, 
                   epochs=100, 
                   batch_size=16,
                   verbose=0)

# Evaluate
test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
print(f"Test MAE: {test_mae:.2f}")
```

### Cross-Validation
```python
from sklearn.model_selection import cross_val_score

# Cross-validation with Random Forest
cv_scores = cross_val_score(rf_model, X, y, cv=5, scoring='neg_mean_absolute_error')
print(f"Cross-validation MAE: {-cv_scores.mean():.2f} (+/- {cv_scores.std() * 2:.2f})")
```

## 📈 Data Analysis Insights

### Correlation Analysis
```python
import matplotlib.pyplot as plt
import seaborn as sns

# Correlation matrix
correlation_matrix = X.corr()
plt.figure(figsize=(12, 10))
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0)
plt.title('Feature Correlation Matrix')
plt.show()
```

### Distribution Analysis
```python
# Plot distributions
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
axes = axes.ravel()

for i, col in enumerate(['grindSize', 'extractionTime', 'temperature', 'ratio', 'flowRate', 'pressure']):
    axes[i].hist(df[col], bins=20, alpha=0.7)
    axes[i].set_title(f'{col} Distribution')
    axes[i].set_xlabel(col)
    axes[i].set_ylabel('Frequency')

plt.tight_layout()
plt.show()
```

## 🎯 Model Deployment

### Save Trained Model
```python
import joblib

# Save the model
joblib.dump(rf_model, 'coffee_quality_model.pkl')
joblib.dump(scaler, 'feature_scaler.pkl')

print("✅ Model saved successfully!")
```

### Load and Use Model
```python
# Load the model
loaded_model = joblib.load('coffee_quality_model.pkl')
loaded_scaler = joblib.load('feature_scaler.pkl')

# Make predictions on new data
new_data = [[15, 30, 93, 18, 36, 0, 0, 0, 0, 1, 1, 2.0, 1.2, 9, 20, 50]]
new_data_scaled = loaded_scaler.transform(new_data)
prediction = loaded_model.predict(new_data_scaled)

print(f"Predicted shot quality: {prediction[0]:.2f}")
```

## 🔍 Next Steps

1. **Experiment with different models**: Try Gradient Boosting, SVM, or Neural Networks
2. **Feature engineering**: Create new features from existing ones
3. **Hyperparameter tuning**: Use GridSearchCV to optimize model parameters
4. **Data augmentation**: Generate synthetic data if needed
5. **Model interpretation**: Use SHAP or LIME for explainability

## 📊 Dataset Statistics
- **Total samples**: 60
- **Features**: 16 core features + metadata
- **Date range**: August 11, 2025 - October 7, 2025
- **Quality distribution**: All rated as "5" (average)
- **Roast levels**: 53.3% medium, 46.7% light

## 🚨 Important Notes
- All quality ratings are currently "5" - consider collecting more diverse ratings
- Missing values are handled with defaults
- Categorical variables are encoded for ML algorithms
- Data is ready for both regression and classification tasks

---

**🎉 Your coffee logs are now ready for AI training! Start with the Quick Start section above.**
