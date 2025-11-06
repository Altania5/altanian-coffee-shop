"""
Espresso Quality Predictor
===========================

Dual-model XGBoost architecture for espresso quality prediction.

Features:
- 5 separate XGBoost regressors (shotQuality, sweetness, acidity, bitterness, body)
- Stratified K-fold cross-validation
- Feature importance extraction
- Model persistence (pickle)
- Comprehensive preprocessing pipeline
"""

import numpy as np
import pandas as pd
import pickle
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import xgboost as xgb
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import RobustScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from category_encoders import TargetEncoder

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import (
    XGBOOST_PARAMS_SMALL, XGBOOST_PARAMS_IMPROVED, XGBOOST_PARAMS_LOW_VARIANCE,
    N_CV_FOLDS, TARGET_VARIABLES, FEATURE_GROUPS, MODEL_PATH
)
from training.feature_engineering import EspressoFeatureEngineer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EspressoQualityPredictor:
    """
    Dual-model XGBoost architecture for espresso quality prediction.

    Trains 5 separate regressors for:
    1. Overall shot quality (1-10)
    2. Sweetness (1-10)
    3. Acidity (1-10)
    4. Bitterness (1-10)
    5. Body/mouthfeel (1-10)
    """

    def __init__(self, use_feature_engineering: bool = True):
        self.models: Dict[str, xgb.XGBRegressor] = {}
        self.preprocessor: Optional[ColumnTransformer] = None
        self.feature_names: List[str] = []
        self.training_metrics: Dict[str, Any] = {}
        self.feature_importance: Dict[str, pd.DataFrame] = {}
        self.feature_engineer = EspressoFeatureEngineer() if use_feature_engineering else None
        self.use_feature_engineering = use_feature_engineering

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare feature columns from raw data.

        Args:
            df: Raw coffee log dataframe

        Returns:
            DataFrame with features ready for training
        """
        logger.info("Preparing features from raw data...")

        # Start with core parameters
        feature_cols = []

        # Add all feature groups
        for group_name, features in FEATURE_GROUPS.items():
            for feature in features:
                if feature in df.columns:
                    feature_cols.append(feature)

        # Remove duplicates while preserving order
        feature_cols = list(dict.fromkeys(feature_cols))

        # Select features that exist in dataframe
        existing_features = [f for f in feature_cols if f in df.columns]

        logger.info(f"Selected {len(existing_features)} features for training")

        return df[existing_features].copy()

    def _build_preprocessor(self, X: pd.DataFrame, y: pd.Series) -> ColumnTransformer:
        """
        Build preprocessing pipeline.

        Handles:
        - Categorical encoding (target encoding)
        - Numerical scaling (RobustScaler)
        - Boolean passthrough

        Args:
            X: Feature dataframe
            y: Target variable (for target encoding)

        Returns:
            Fitted ColumnTransformer
        """
        logger.info("Building preprocessing pipeline...")

        # Identify feature types
        numeric_features = []
        categorical_features = []
        boolean_features = []

        for col in X.columns:
            if X[col].dtype == 'bool':
                boolean_features.append(col)
            elif X[col].dtype == 'object' or X[col].dtype.name == 'category':
                categorical_features.append(col)
            else:
                numeric_features.append(col)

        logger.info(f"Feature types: {len(numeric_features)} numeric, "
                   f"{len(categorical_features)} categorical, "
                   f"{len(boolean_features)} boolean")

        # Build transformer
        transformers = []

        if numeric_features:
            transformers.append((
                'num',
                Pipeline([
                    ('scaler', RobustScaler())
                ]),
                numeric_features
            ))

        if categorical_features:
            transformers.append((
                'cat',
                TargetEncoder(),
                categorical_features
            ))

        if boolean_features:
            transformers.append((
                'bool',
                'passthrough',
                boolean_features
            ))

        preprocessor = ColumnTransformer(
            transformers=transformers,
            remainder='drop'
        )

        # Fit preprocessor
        preprocessor.fit(X, y)

        return preprocessor

    def _create_stratified_folds(
        self,
        y: pd.Series,
        n_splits: int = N_CV_FOLDS
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Create stratified K-Fold splits for continuous target.

        Bins the target variable into categories for stratification.

        Args:
            y: Target variable
            n_splits: Number of folds

        Returns:
            List of (train_idx, val_idx) tuples
        """
        # Bin continuous target for stratification
        y_binned = pd.cut(y, bins=5, labels=False, duplicates='drop')

        skf = StratifiedKFold(
            n_splits=n_splits,
            shuffle=True,
            random_state=42
        )

        folds = list(skf.split(np.zeros(len(y)), y_binned))

        logger.info(f"Created {len(folds)} stratified folds")

        return folds

    def _train_single_model(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        target_name: str,
        params: Optional[Dict] = None
    ) -> xgb.XGBRegressor:
        """
        Train a single XGBoost model with cross-validation.

        Args:
            X: Feature matrix
            y: Target variable
            target_name: Name of target (for logging)
            params: XGBoost hyperparameters (uses default if None)

        Returns:
            Trained XGBoost model
        """
        if params is None:
            # Check target variance to select appropriate hyperparameters
            target_std = y.std()
            target_range = y.max() - y.min()

            # Low variance targets (std < 0.7 or range < 2) get conservative params
            if target_std < 0.7 or target_range < 2:
                logger.info(f"Low variance target detected (std={target_std:.2f}, range={target_range:.1f})")
                logger.info("Using LOW_VARIANCE hyperparameters")
                params = XGBOOST_PARAMS_LOW_VARIANCE.copy()
            # High variance targets with feature engineering get improved params
            elif self.use_feature_engineering and len(X.columns) > 20:
                logger.info("Using IMPROVED hyperparameters (feature engineering enabled)")
                params = XGBOOST_PARAMS_IMPROVED.copy()
            else:
                logger.info("Using SMALL dataset hyperparameters")
                params = XGBOOST_PARAMS_SMALL.copy()

        logger.info(f"\n{'='*60}")
        logger.info(f"Training Model: {target_name}")
        logger.info(f"{'='*60}")

        # Track CV scores
        cv_scores = []
        fold_models = []

        # Get stratified folds
        folds = self._create_stratified_folds(y)

        # Cross-validation loop
        for fold_idx, (train_idx, val_idx) in enumerate(folds):
            # Split data
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            # Train model
            model = xgb.XGBRegressor(**params)
            model.fit(
                X_train, y_train,
                eval_set=[(X_train, y_train), (X_val, y_val)],
                early_stopping_rounds=10,
                verbose=False
            )

            # Evaluate on validation fold
            val_pred = model.predict(X_val)
            rmse = np.sqrt(mean_squared_error(y_val, val_pred))
            mae = mean_absolute_error(y_val, val_pred)
            r2 = r2_score(y_val, val_pred)

            cv_scores.append({'rmse': rmse, 'mae': mae, 'r2': r2})
            fold_models.append(model)

            logger.info(f"Fold {fold_idx+1}: RMSE={rmse:.3f}, MAE={mae:.3f}, R²={r2:.3f}")

        # Calculate average performance
        avg_rmse = np.mean([s['rmse'] for s in cv_scores])
        std_rmse = np.std([s['rmse'] for s in cv_scores])
        avg_mae = np.mean([s['mae'] for s in cv_scores])
        avg_r2 = np.mean([s['r2'] for s in cv_scores])

        logger.info(f"\nAverage Performance:")
        logger.info(f"  RMSE: {avg_rmse:.3f} ± {std_rmse:.3f}")
        logger.info(f"  MAE: {avg_mae:.3f}")
        logger.info(f"  R²: {avg_r2:.3f}")

        # Train final model on all data
        logger.info("Training final model on full dataset...")
        final_model = xgb.XGBRegressor(**params)
        final_model.fit(X, y, verbose=False)

        # Store metrics
        self.training_metrics[target_name] = {
            'cv_scores': cv_scores,
            'avg_rmse': float(avg_rmse),
            'std_rmse': float(std_rmse),
            'avg_mae': float(avg_mae),
            'avg_r2': float(avg_r2),
            'n_folds': len(folds),
            'n_samples': len(X)
        }

        # Extract feature importance (use actual X columns, not self.feature_names)
        feature_names_for_model = list(X.columns)
        importance_df = pd.DataFrame({
            'feature': feature_names_for_model,
            'importance': final_model.feature_importances_
        }).sort_values('importance', ascending=False)

        self.feature_importance[target_name] = importance_df

        return final_model

    def train_all_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train models for all target variables.

        Args:
            df: Raw coffee log dataframe

        Returns:
            Dictionary of training metrics
        """
        logger.info("\n" + "="*60)
        logger.info("STARTING ESPRESSO MODEL TRAINING")
        logger.info("="*60)

        # Validate minimum sample size
        if len(df) < 20:
            raise ValueError(
                f"Insufficient training data: {len(df)} samples. "
                f"Minimum 20 samples required for training."
            )

        logger.info(f"Training dataset size: {len(df)} samples")

        # Store original df before feature engineering for low-variance targets
        df_original = df.copy()

        # Extract target variables first to check variance
        targets = {}

        # Shot quality (direct field)
        if 'shotQuality' in df.columns:
            targets['shotQuality'] = df['shotQuality']

        # Taste profile (nested object)
        if 'tasteProfile' in df.columns or 'sweetness' in df.columns:
            # Handle both nested and flat structures
            if 'tasteProfile' in df.columns and isinstance(df['tasteProfile'].iloc[0], dict):
                targets['sweetness'] = df['tasteProfile'].apply(lambda x: x.get('sweetness', 5))
                targets['acidity'] = df['tasteProfile'].apply(lambda x: x.get('acidity', 5))
                targets['bitterness'] = df['tasteProfile'].apply(lambda x: x.get('bitterness', 5))
                targets['body'] = df['tasteProfile'].apply(lambda x: x.get('body', 5))
            else:
                # Flat structure (from cleaned data)
                targets['sweetness'] = df.get('sweetness', pd.Series([5] * len(df)))
                targets['acidity'] = df.get('acidity', pd.Series([5] * len(df)))
                targets['bitterness'] = df.get('bitterness', pd.Series([5] * len(df)))
                targets['body'] = df.get('body', pd.Series([5] * len(df)))

        logger.info(f"Target variables: {list(targets.keys())}")

        # Analyze target variance to determine feature engineering strategy
        high_variance_targets = []
        low_variance_targets = []

        for target_name, y in targets.items():
            variance_ratio = y.std() / (y.max() - y.min() + 0.01)
            if y.std() > 1.0 or (y.max() - y.min()) > 3:
                high_variance_targets.append(target_name)
                logger.info(f"{target_name}: HIGH variance (std={y.std():.2f}, range={y.max()-y.min():.1f}) - will use feature engineering")
            else:
                low_variance_targets.append(target_name)
                logger.info(f"{target_name}: LOW variance (std={y.std():.2f}, range={y.max()-y.min():.1f}) - will use simple features only")

        # Train models with appropriate feature sets
        for target_name, y in targets.items():
            # Use different feature sets based on target variance
            if target_name in high_variance_targets and self.use_feature_engineering and self.feature_engineer:
                logger.info(f"\n>>> Training {target_name} with FEATURE ENGINEERING")
                df_for_target = self.feature_engineer.engineer_all_features(df_original.copy())
                X_target = self._prepare_features(df_for_target)
            else:
                logger.info(f"\n>>> Training {target_name} with SIMPLE FEATURES (no engineering)")
                X_target = self._prepare_features(df_original.copy())

            # Store feature names for this target (may differ between targets)
            if target_name == 'shotQuality' or not self.feature_names:
                self.feature_names = list(X_target.columns)

            # Build preprocessor for this target
            preprocessor = self._build_preprocessor(X_target, y)

            # Transform features
            X_processed = preprocessor.transform(X_target)
            X_processed = pd.DataFrame(
                X_processed,
                columns=list(X_target.columns),
                index=X_target.index
            )

            # Train model
            self.models[target_name] = self._train_single_model(
                X_processed, y, target_name
            )

            # Store preprocessor for first target (shotQuality) as main preprocessor
            if target_name == 'shotQuality':
                self.preprocessor = preprocessor

        logger.info("\n" + "="*60)
        logger.info("TRAINING COMPLETE!")
        logger.info("="*60)

        # Print summary
        logger.info("\nModel Performance Summary:")
        for target_name, metrics in self.training_metrics.items():
            logger.info(f"\n{target_name}:")
            logger.info(f"  RMSE: {metrics['avg_rmse']:.3f} ± {metrics['std_rmse']:.3f}")
            logger.info(f"  MAE: {metrics['avg_mae']:.3f}")
            logger.info(f"  R²: {metrics['avg_r2']:.3f}")

        return self.training_metrics

    def predict(self, input_params: Dict[str, Any]) -> Dict[str, float]:
        """
        Make predictions for new espresso parameters.

        Args:
            input_params: Dictionary of espresso parameters

        Returns:
            Dictionary of predictions for all targets
        """
        if not self.models:
            raise ValueError("No models trained. Call train_all_models() first.")

        if self.preprocessor is None:
            raise ValueError("Preprocessor not initialized. Train models first.")

        # Convert to DataFrame
        input_df = pd.DataFrame([input_params])

        # Apply feature engineering if it was used during training
        if self.use_feature_engineering and self.feature_engineer:
            input_df = self.feature_engineer.engineer_all_features(input_df)

        # Select only the features used in training
        input_df = input_df[[f for f in self.feature_names if f in input_df.columns]]

        # Fill missing features with defaults
        for feature in self.feature_names:
            if feature not in input_df.columns:
                # Use sensible defaults
                if feature in ['usedPuckScreen', 'usedWDT', 'usedPreInfusion']:
                    input_df[feature] = False
                elif feature == 'pressure':
                    input_df[feature] = 9
                elif feature == 'temperature':
                    input_df[feature] = 93
                else:
                    input_df[feature] = 0

        # Ensure correct column order
        input_df = input_df[self.feature_names]

        # Preprocess
        input_processed = self.preprocessor.transform(input_df)

        # Predict with all models
        predictions = {}
        for target_name, model in self.models.items():
            pred = model.predict(input_processed)[0]
            # Clip to valid range (1-10)
            predictions[target_name] = float(np.clip(pred, 1, 10))

        return predictions

    def get_feature_importance(
        self,
        target: str = 'shotQuality',
        top_n: int = 10
    ) -> pd.DataFrame:
        """
        Get feature importance for a specific target.

        Args:
            target: Target variable name
            top_n: Number of top features to return

        Returns:
            DataFrame with features and importance scores
        """
        if target not in self.feature_importance:
            raise ValueError(f"No feature importance available for '{target}'")

        return self.feature_importance[target].head(top_n)

    def save_models(self, filepath: str = MODEL_PATH):
        """
        Save trained models and preprocessor to disk.

        Args:
            filepath: Path to save the model file
        """
        if not self.models:
            raise ValueError("No models to save. Train models first.")

        save_data = {
            'models': self.models,
            'preprocessor': self.preprocessor,
            'feature_names': self.feature_names,
            'training_metrics': self.training_metrics,
            'feature_importance': {
                k: v.to_dict('records')
                for k, v in self.feature_importance.items()
            },
            'feature_engineer': self.feature_engineer,
            'use_feature_engineering': self.use_feature_engineering
        }

        # Ensure directory exists
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, 'wb') as f:
            pickle.dump(save_data, f)

        logger.info(f"\n✅ Models saved to: {filepath}")
        logger.info(f"   File size: {Path(filepath).stat().st_size / 1024:.1f} KB")

    def load_models(self, filepath: str = MODEL_PATH):
        """
        Load trained models from disk.

        Args:
            filepath: Path to the saved model file
        """
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")

        with open(filepath, 'rb') as f:
            save_data = pickle.load(f)

        self.models = save_data['models']
        self.preprocessor = save_data['preprocessor']
        self.feature_names = save_data['feature_names']
        self.training_metrics = save_data.get('training_metrics', {})
        self.feature_engineer = save_data.get('feature_engineer', None)
        self.use_feature_engineering = save_data.get('use_feature_engineering', False)

        # Convert feature importance back to DataFrames
        if 'feature_importance' in save_data:
            self.feature_importance = {
                k: pd.DataFrame(v)
                for k, v in save_data['feature_importance'].items()
            }

        logger.info(f"\n✅ Models loaded from: {filepath}")
        logger.info(f"   Targets: {list(self.models.keys())}")
        logger.info(f"   Features: {len(self.feature_names)}")

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the trained models.

        Returns:
            Dictionary with model metadata
        """
        if not self.models:
            return {'status': 'not_trained'}

        return {
            'status': 'trained',
            'targets': list(self.models.keys()),
            'n_features': len(self.feature_names),
            'features': self.feature_names,
            'metrics': self.training_metrics,
            'top_features': {
                target: self.get_feature_importance(target, top_n=5).to_dict('records')
                for target in self.models.keys()
            }
        }


# ============================================
# UTILITY FUNCTIONS
# ============================================

def train_from_file(data_path: str, save_path: str = MODEL_PATH) -> Dict[str, Any]:
    """
    Train models from a JSON or CSV data file.

    Args:
        data_path: Path to training data (JSON or CSV)
        save_path: Path to save trained models

    Returns:
        Training metrics
    """
    logger.info(f"Loading training data from: {data_path}")

    # Load data
    if data_path.endswith('.json'):
        df = pd.read_json(data_path)
    elif data_path.endswith('.csv'):
        df = pd.read_csv(data_path)
    else:
        raise ValueError("Data file must be JSON or CSV")

    logger.info(f"Loaded {len(df)} training samples")

    # Train models
    predictor = EspressoQualityPredictor()
    metrics = predictor.train_all_models(df)

    # Save models
    predictor.save_models(save_path)

    return metrics


if __name__ == '__main__':
    # Example usage
    import sys

    if len(sys.argv) > 1:
        data_path = sys.argv[1]
        save_path = sys.argv[2] if len(sys.argv) > 2 else MODEL_PATH

        logger.info("Starting training from command line...")
        metrics = train_from_file(data_path, save_path)

        logger.info("\n✅ Training complete!")
        logger.info(f"Models saved to: {save_path}")
    else:
        logger.info("Usage: python espresso_predictor.py <data_path> [save_path]")
        logger.info("Example: python espresso_predictor.py ../server/training_data_cleaned.json")
