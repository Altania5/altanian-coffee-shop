"""
ML Service Configuration
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
SAVED_MODELS_DIR = BASE_DIR / 'saved_models'
SAVED_MODELS_DIR.mkdir(exist_ok=True)

# Model paths
MODEL_PATH = os.getenv('MODEL_PATH', str(SAVED_MODELS_DIR / 'espresso_models.pkl'))
PREPROCESSOR_PATH = str(SAVED_MODELS_DIR / 'preprocessor.pkl')
FEATURE_COLUMNS_PATH = str(SAVED_MODELS_DIR / 'feature_columns.json')

# Training configuration
MIN_TRAINING_SAMPLES = int(os.getenv('MIN_TRAINING_SAMPLES', '30'))
AUTO_RETRAIN_THRESHOLD = int(os.getenv('AUTO_RETRAIN_THRESHOLD', '20'))

# XGBoost hyperparameters (optimized for small datasets: 50-100 samples)
XGBOOST_PARAMS_SMALL = {
    # Tree Structure (CRITICAL for small datasets)
    'max_depth': 3,              # Shallow trees prevent overfitting
    'min_child_weight': 3,       # Minimum samples per leaf

    # Boosting Parameters
    'learning_rate': 0.05,       # Slow learning is safer
    'n_estimators': 50,          # Conservative start

    # Sampling (Regularization)
    'subsample': 0.7,            # Use 70% of data per tree
    'colsample_bytree': 0.7,     # Use 70% of features per tree

    # Regularization Terms
    'reg_alpha': 0.5,            # L1 regularization
    'reg_lambda': 1.0,           # L2 regularization
    'gamma': 0.1,                # Minimum loss reduction for split

    # Other
    'random_state': 42,
    'objective': 'reg:squarederror',
    'tree_method': 'hist'        # Faster for small datasets
}

# Improved hyperparameters for 60+ samples with feature engineering
XGBOOST_PARAMS_IMPROVED = {
    # Tree Structure - slightly deeper with more features
    'max_depth': 4,              # Deeper trees with engineered features
    'min_child_weight': 2,       # Allow smaller leaves with more features

    # Boosting Parameters - more estimators with slower learning
    'learning_rate': 0.03,       # Slower learning for better generalization
    'n_estimators': 100,         # More estimators for better convergence

    # Sampling - more aggressive to prevent overfitting
    'subsample': 0.8,            # Use 80% of data per tree
    'colsample_bytree': 0.8,     # Use 80% of features per tree
    'colsample_bylevel': 0.8,    # Column subsampling per level

    # Regularization - balanced for feature-rich dataset
    'reg_alpha': 1.0,            # Increased L1 for feature selection
    'reg_lambda': 2.0,           # Increased L2 for stability
    'gamma': 0.2,                # Higher minimum loss reduction

    # Other
    'random_state': 42,
    'objective': 'reg:squarederror',
    'tree_method': 'hist',
    'max_bin': 256               # More bins for better splits
}

# Hyperparameters for low-variance targets (sweetness, acidity, bitterness, body)
XGBOOST_PARAMS_LOW_VARIANCE = {
    # Simpler model for low-variance targets
    'max_depth': 2,              # Very shallow
    'min_child_weight': 5,       # Larger minimum samples

    # Conservative boosting
    'learning_rate': 0.01,       # Very slow learning
    'n_estimators': 50,          # Fewer estimators

    # Heavy regularization
    'subsample': 0.6,            # More aggressive subsampling
    'colsample_bytree': 0.6,
    'reg_alpha': 2.0,            # Heavy L1
    'reg_lambda': 3.0,           # Heavy L2
    'gamma': 0.5,                # High minimum loss

    # Other
    'random_state': 42,
    'objective': 'reg:squarederror',
    'tree_method': 'hist'
}

# Cross-validation settings
N_CV_FOLDS = 5  # 5-fold cross-validation for 50-100 samples

# Flask configuration
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))
FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')

# API Security (optional)
API_KEY = os.getenv('ML_API_KEY', None)

# Feature engineering configuration
FEATURE_GROUPS = {
    'core_params': [
        'grindSize', 'extractionTime', 'temperature',
        'inWeight', 'outWeight', 'pressure'
    ],
    'bean_characteristics': [
        'roastLevel', 'processMethod', 'daysPastRoast', 'beanUsageCount'
    ],
    'technique_params': [
        'usedPuckScreen', 'usedWDT', 'distributionTechnique',
        'usedPreInfusion', 'preInfusionTime', 'preInfusionPressure'
    ],
    'calculated_features': [
        'ratio', 'flowRate', 'extractionYield'
    ],
    'interaction_features': [
        'pressureTime', 'tempRatio', 'grindDose',
        'flowPressure', 'extractionIntensity', 'pressureEfficiency'
    ],
    'categorical_features': [
        'shotType', 'freshnessCategory', 'tempZone'
    ],
    'advanced_params': [
        'channelingSeverity', 'tampingPressure', 'basketSize',
        'waterHardness', 'waterTDS'
    ]
}

# Target variables
TARGET_VARIABLES = [
    'shotQuality',
    'sweetness',
    'acidity',
    'bitterness',
    'body'
]

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
