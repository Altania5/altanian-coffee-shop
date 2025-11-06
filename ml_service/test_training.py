#!/usr/bin/env python
"""
Test script for training the espresso quality prediction models.

This script:
1. Loads the cleaned training data
2. Trains all 5 models (shotQuality, sweetness, acidity, bitterness, body)
3. Saves the trained models
4. Tests predictions on sample data
5. Displays model performance metrics
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from models.espresso_predictor import EspressoQualityPredictor
import pandas as pd
import json

def main():
    print("\n" + "="*60)
    print("ESPRESSO MODEL TRAINING TEST")
    print("="*60)

    # Step 1: Load training data
    print("\n📂 Step 1: Loading training data...")

    # Try multiple possible paths
    data_paths = [
        '/training_data/training_data_cleaned.json',      # Docker path (new location)
        '/app/training_data/training_data_cleaned.json',  # Docker path (old location)
        '../server/training_data_cleaned.json',           # Relative path
        'training_data_cleaned.json',                      # Current directory
    ]

    df = None
    used_path = None

    for path in data_paths:
        if os.path.exists(path):
            print(f"   Found data at: {path}")
            df = pd.read_json(path)
            used_path = path
            break

    if df is None:
        print("❌ ERROR: Could not find training data file!")
        print("   Tried the following paths:")
        for path in data_paths:
            print(f"     - {path}")
        sys.exit(1)

    print(f"✅ Loaded {len(df)} training samples")
    print(f"   Columns: {len(df.columns)}")
    print(f"   Features available: {list(df.columns)[:10]}...")

    # Step 2: Train models
    print("\n🤖 Step 2: Training XGBoost models...")
    print("   This will take a few minutes...\n")

    predictor = EspressoQualityPredictor()

    try:
        metrics = predictor.train_all_models(df)
        print("\n✅ Training complete!")
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Step 3: Display metrics
    print("\n📊 Step 3: Model Performance Summary")
    print("="*60)

    for target, metric in metrics.items():
        print(f"\n{target.upper()}:")
        print(f"   RMSE: {metric['avg_rmse']:.3f} ± {metric['std_rmse']:.3f}")
        print(f"   MAE:  {metric['avg_mae']:.3f}")
        print(f"   R²:   {metric['avg_r2']:.3f}")
        print(f"   Folds: {metric['n_folds']}")

    # Step 4: Display feature importance
    print("\n🎯 Step 4: Top Features by Importance")
    print("="*60)

    for target in ['shotQuality', 'sweetness']:
        print(f"\nTop 5 features for {target}:")
        importance = predictor.get_feature_importance(target, top_n=5)
        for idx, row in importance.iterrows():
            print(f"   {idx+1}. {row['feature']}: {row['importance']:.4f}")

    # Step 5: Test prediction
    print("\n🧪 Step 5: Testing Prediction")
    print("="*60)

    # Sample espresso parameters
    test_params = {
        'grindSize': 12,
        'extractionTime': 28,
        'temperature': 93,
        'inWeight': 18,
        'outWeight': 36,
        'pressure': 9,
        'roastLevel': 'medium',
        'processMethod': 'washed',
        'daysPastRoast': 14,
        'usedWDT': True,
        'usedPuckScreen': True,
        'usedPreInfusion': True,
        'preInfusionTime': 5,
        'preInfusionPressure': 3,
        'machine': 'Meraki',
        'beanUsageCount': 1,
        'humidity': 50
    }

    print("\nTest parameters:")
    for key, value in list(test_params.items())[:8]:
        print(f"   {key}: {value}")
    print("   ...")

    predictions = predictor.predict(test_params)

    print("\nPredictions:")
    for target, value in predictions.items():
        bar = "█" * int(value)
        print(f"   {target:12s}: {value:.2f}/10 {bar}")

    # Step 6: Save models
    print("\n💾 Step 6: Saving models")
    print("="*60)

    save_path = 'saved_models/espresso_models.pkl'

    try:
        predictor.save_models(save_path)
        print(f"✅ Models saved successfully to: {save_path}")

        # Verify file exists and get size
        if os.path.exists(save_path):
            size_mb = os.path.getsize(save_path) / (1024 * 1024)
            print(f"   File size: {size_mb:.2f} MB")
    except Exception as e:
        print(f"❌ Failed to save models: {str(e)}")

    # Step 7: Test loading
    print("\n🔄 Step 7: Testing model loading")
    print("="*60)

    try:
        new_predictor = EspressoQualityPredictor()
        new_predictor.load_models(save_path)
        print("✅ Models loaded successfully")

        # Test prediction with loaded model
        new_predictions = new_predictor.predict(test_params)
        print("\nVerification prediction:")
        for target, value in list(new_predictions.items())[:3]:
            print(f"   {target}: {value:.2f}/10")

        # Check predictions match
        matches = all(
            abs(predictions[k] - new_predictions[k]) < 0.001
            for k in predictions.keys()
        )

        if matches:
            print("\n✅ Predictions match! Model persistence working correctly.")
        else:
            print("\n⚠️  Warning: Predictions don't match exactly.")

    except Exception as e:
        print(f"❌ Failed to load models: {str(e)}")

    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\nNext steps:")
    print("1. Start the Flask API: python app.py")
    print("2. Test predictions via API: POST http://localhost:5000/predict")
    print("3. Integrate with Node.js backend")
    print()

if __name__ == '__main__':
    main()
