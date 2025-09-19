
# Production Coffee Quality Predictor
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import json

class CoffeeQualityPredictor:
    def __init__(self, model_path, scaler_path, features_path):
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        with open(features_path, 'r') as f:
            self.feature_columns = json.load(f)

    def predict_quality(self, shot_data):
        """Predict coffee shot quality"""
        # Prepare feature vector
        features = np.array([[
            shot_data.get('grindSize', 15),
            shot_data.get('extractionTime', 30),
            shot_data.get('temperature', 93),
            shot_data.get('inWeight', 18),
            shot_data.get('outWeight', 36),
            shot_data.get('usedPuckScreen', 0),
            shot_data.get('usedWDT', 0),
            shot_data.get('usedPreInfusion', 0),
            shot_data.get('preInfusionTime', 0),
            shot_data.get('roastLevel_encoded', 1),
            shot_data.get('processMethod_encoded', 0),
            shot_data.get('ratio', 2.0),
            shot_data.get('flowRate', 1.2)
        ]])

        # Scale features
        features_scaled = self.scaler.transform(features)

        # Make prediction
        quality = self.model.predict(features_scaled)[0]
        return max(1, min(10, round(quality)))

# Usage example:
# predictor = CoffeeQualityPredictor('best_coffee_quality_model.pkl', 'coffee_scaler.pkl', 'feature_columns.json')
# quality = predictor.predict_quality({
#     'grindSize': 15,
#     'extractionTime': 30,
#     'temperature': 93,
#     'inWeight': 18,
#     'outWeight': 36,
#     'usedPuckScreen': 1,
#     'usedWDT': 1,
#     'usedPreInfusion': 0,
#     'preInfusionTime': 0,
#     'roastLevel_encoded': 1,
#     'processMethod_encoded': 0,
#     'ratio': 2.0,
#     'flowRate': 1.2
# })
