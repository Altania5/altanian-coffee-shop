"""
SHAP-based Model Interpretability
==================================

Provides explainable AI capabilities using SHAP (SHapley Additive exPlanations).

Features:
- Feature importance visualization
- Per-prediction explanations
- Waterfall plots for individual shots
- Summary plots for global understanding
- Force plots for detailed analysis
"""

import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server environments
import matplotlib.pyplot as plt
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import logging

# Configure logging
logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP-based explainability wrapper for XGBoost models.

    Provides various visualization and explanation methods.
    """

    def __init__(self, predictor):
        """
        Initialize SHAP explainer.

        Args:
            predictor: Trained EspressoQualityPredictor instance
        """
        self.predictor = predictor
        self.explainers: Dict[str, shap.TreeExplainer] = {}
        self._initialize_explainers()

    def _initialize_explainers(self):
        """Create SHAP explainers for each model."""
        logger.info("Initializing SHAP explainers...")

        for target_name, model in self.predictor.models.items():
            self.explainers[target_name] = shap.TreeExplainer(model)
            logger.info(f"  ✓ Created explainer for {target_name}")

        logger.info(f"Initialized {len(self.explainers)} SHAP explainers")

    def explain_prediction(
        self,
        input_params: Dict[str, Any],
        target: str = 'shotQuality'
    ) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a single prediction.

        Args:
            input_params: Espresso parameters
            target: Target variable to explain

        Returns:
            Dictionary containing SHAP values and explanation
        """
        if target not in self.explainers:
            raise ValueError(f"No explainer for target '{target}'")

        # Prepare input
        input_df = pd.DataFrame([input_params])

        # Ensure all features are present
        for feature in self.predictor.feature_names:
            if feature not in input_df.columns:
                input_df[feature] = 0  # Default value

        input_df = input_df[self.predictor.feature_names]

        # Preprocess
        input_processed = self.predictor.preprocessor.transform(input_df)

        # Calculate SHAP values
        explainer = self.explainers[target]
        shap_values = explainer.shap_values(input_processed)

        # Get base value (expected value)
        base_value = explainer.expected_value

        # Get prediction
        prediction = self.predictor.predict(input_params)[target]

        # Create explanation dictionary
        feature_contributions = {}
        for feature_idx, feature_name in enumerate(self.predictor.feature_names):
            shap_value = float(shap_values[0][feature_idx])
            feature_value = float(input_processed[0][feature_idx])

            feature_contributions[feature_name] = {
                'shap_value': shap_value,
                'feature_value': feature_value,
                'impact': 'positive' if shap_value > 0 else 'negative',
                'magnitude': abs(shap_value)
            }

        # Sort by magnitude
        sorted_features = sorted(
            feature_contributions.items(),
            key=lambda x: x[1]['magnitude'],
            reverse=True
        )

        # Get top factors
        top_positive = [
            {'feature': k, **v}
            for k, v in sorted_features
            if v['impact'] == 'positive'
        ][:5]

        top_negative = [
            {'feature': k, **v}
            for k, v in sorted_features
            if v['impact'] == 'negative'
        ][:5]

        explanation = {
            'target': target,
            'prediction': prediction,
            'base_value': float(base_value),
            'feature_contributions': dict(sorted_features),
            'top_positive_factors': top_positive,
            'top_negative_factors': top_negative,
            'summary': self._generate_explanation_text(
                target, prediction, top_positive, top_negative
            )
        }

        return explanation

    def _generate_explanation_text(
        self,
        target: str,
        prediction: float,
        top_positive: List[Dict],
        top_negative: List[Dict]
    ) -> str:
        """
        Generate human-readable explanation text.

        Args:
            target: Target variable
            prediction: Predicted value
            top_positive: Top positive factors
            top_negative: Top negative factors

        Returns:
            Explanation string
        """
        lines = []

        lines.append(f"Predicted {target}: {prediction:.1f}/10")
        lines.append("")

        if top_positive:
            lines.append("✅ Factors increasing quality:")
            for factor in top_positive[:3]:
                feature = factor['feature'].replace('_', ' ').title()
                impact = factor['magnitude']
                lines.append(f"  • {feature} (+{impact:.2f})")

        if top_negative:
            lines.append("")
            lines.append("⚠️  Factors decreasing quality:")
            for factor in top_negative[:3]:
                feature = factor['feature'].replace('_', ' ').title()
                impact = factor['magnitude']
                lines.append(f"  • {feature} (-{impact:.2f})")

        return "\n".join(lines)

    def get_feature_importance(
        self,
        X: pd.DataFrame,
        target: str = 'shotQuality',
        top_n: int = 15
    ) -> pd.DataFrame:
        """
        Calculate global feature importance using SHAP values.

        Args:
            X: Training data
            target: Target variable
            top_n: Number of top features

        Returns:
            DataFrame with features and importance scores
        """
        if target not in self.explainers:
            raise ValueError(f"No explainer for target '{target}'")

        # Calculate SHAP values for dataset
        explainer = self.explainers[target]
        shap_values = explainer.shap_values(X)

        # Calculate mean absolute SHAP value for each feature
        mean_shap = np.abs(shap_values).mean(axis=0)

        # Create importance dataframe
        importance_df = pd.DataFrame({
            'feature': self.predictor.feature_names,
            'importance': mean_shap
        }).sort_values('importance', ascending=False)

        return importance_df.head(top_n)

    def plot_waterfall(
        self,
        input_params: Dict[str, Any],
        target: str = 'shotQuality',
        save_path: Optional[str] = None,
        show_plot: bool = False
    ) -> Optional[str]:
        """
        Generate waterfall plot for a single prediction.

        Shows how each feature contributes to the final prediction.

        Args:
            input_params: Espresso parameters
            target: Target variable
            save_path: Path to save plot (optional)
            show_plot: Whether to display plot

        Returns:
            Path to saved plot if save_path provided
        """
        # Get explanation
        explanation = self.explain_prediction(input_params, target)

        # Prepare data for waterfall plot
        shap_values = [
            explanation['feature_contributions'][f]['shap_value']
            for f in self.predictor.feature_names
        ]
        feature_values = [
            explanation['feature_contributions'][f]['feature_value']
            for f in self.predictor.feature_names
        ]

        # Create SHAP Explanation object
        shap_explanation = shap.Explanation(
            values=np.array(shap_values),
            base_values=explanation['base_value'],
            data=np.array(feature_values),
            feature_names=self.predictor.feature_names
        )

        # Generate waterfall plot
        plt.figure(figsize=(10, 8))
        shap.waterfall_plot(shap_explanation, show=False)
        plt.title(f'SHAP Waterfall Plot - {target}', fontsize=14, fontweight='bold')
        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            logger.info(f"Waterfall plot saved to: {save_path}")

        if show_plot:
            plt.show()
        else:
            plt.close()

        return save_path

    def plot_summary(
        self,
        X: pd.DataFrame,
        target: str = 'shotQuality',
        save_path: Optional[str] = None,
        show_plot: bool = False
    ) -> Optional[str]:
        """
        Generate summary plot showing global feature importance.

        Args:
            X: Training data
            target: Target variable
            save_path: Path to save plot
            show_plot: Whether to display plot

        Returns:
            Path to saved plot if save_path provided
        """
        if target not in self.explainers:
            raise ValueError(f"No explainer for target '{target}'")

        # Calculate SHAP values
        explainer = self.explainers[target]
        shap_values = explainer.shap_values(X)

        # Generate summary plot
        plt.figure(figsize=(10, 8))
        shap.summary_plot(
            shap_values,
            X,
            feature_names=self.predictor.feature_names,
            show=False,
            plot_size=(10, 8)
        )
        plt.title(f'SHAP Feature Importance - {target}', fontsize=14, fontweight='bold', pad=20)
        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            logger.info(f"Summary plot saved to: {save_path}")

        if show_plot:
            plt.show()
        else:
            plt.close()

        return save_path

    def plot_bar(
        self,
        X: pd.DataFrame,
        target: str = 'shotQuality',
        max_display: int = 15,
        save_path: Optional[str] = None,
        show_plot: bool = False
    ) -> Optional[str]:
        """
        Generate bar plot of feature importance.

        Args:
            X: Training data
            target: Target variable
            max_display: Maximum features to display
            save_path: Path to save plot
            show_plot: Whether to display plot

        Returns:
            Path to saved plot if save_path provided
        """
        if target not in self.explainers:
            raise ValueError(f"No explainer for target '{target}'")

        # Calculate SHAP values
        explainer = self.explainers[target]
        shap_values = explainer.shap_values(X)

        # Generate bar plot
        plt.figure(figsize=(10, 8))
        shap.summary_plot(
            shap_values,
            X,
            feature_names=self.predictor.feature_names,
            plot_type='bar',
            max_display=max_display,
            show=False
        )
        plt.title(f'Feature Importance (Mean |SHAP|) - {target}', fontsize=14, fontweight='bold')
        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            logger.info(f"Bar plot saved to: {save_path}")

        if show_plot:
            plt.show()
        else:
            plt.close()

        return save_path

    def explain_batch(
        self,
        inputs: List[Dict[str, Any]],
        target: str = 'shotQuality'
    ) -> List[Dict[str, Any]]:
        """
        Generate explanations for multiple predictions.

        Args:
            inputs: List of input parameter dictionaries
            target: Target variable

        Returns:
            List of explanation dictionaries
        """
        explanations = []

        for input_params in inputs:
            try:
                explanation = self.explain_prediction(input_params, target)
                explanations.append(explanation)
            except Exception as e:
                logger.error(f"Error explaining prediction: {str(e)}")
                explanations.append({'error': str(e)})

        return explanations

    def get_top_features_for_target(
        self,
        X: pd.DataFrame,
        target: str,
        n: int = 10
    ) -> Dict[str, Any]:
        """
        Get top features influencing a specific target.

        Args:
            X: Training data
            target: Target variable
            n: Number of features

        Returns:
            Dictionary with feature rankings and insights
        """
        importance = self.get_feature_importance(X, target, top_n=n)

        return {
            'target': target,
            'top_features': importance.to_dict('records'),
            'insights': self._generate_feature_insights(importance, target)
        }

    def _generate_feature_insights(
        self,
        importance_df: pd.DataFrame,
        target: str
    ) -> List[str]:
        """
        Generate human-readable insights from feature importance.

        Args:
            importance_df: Feature importance dataframe
            target: Target variable

        Returns:
            List of insight strings
        """
        insights = []

        top_feature = importance_df.iloc[0]['feature']
        top_importance = importance_df.iloc[0]['importance']

        insights.append(
            f"The most important factor for {target} is '{top_feature}' "
            f"(importance: {top_importance:.3f})"
        )

        # Check for extraction parameter dominance
        extraction_params = ['extractionTime', 'temperature', 'pressure', 'grindSize']
        extraction_in_top = [
            f for f in importance_df['feature'].head(5)
            if f in extraction_params
        ]

        if len(extraction_in_top) >= 3:
            insights.append(
                f"Extraction parameters ({', '.join(extraction_in_top)}) "
                f"are highly influential for {target}"
            )

        # Check for technique importance
        technique_features = importance_df[
            importance_df['feature'].str.contains('used|distribution', case=False, na=False)
        ]

        if len(technique_features) > 0:
            top_technique = technique_features.iloc[0]['feature']
            insights.append(
                f"Preparation technique '{top_technique}' also significantly impacts {target}"
            )

        return insights


# ============================================
# UTILITY FUNCTIONS
# ============================================

def create_explanation_report(
    predictor,
    input_params: Dict[str, Any],
    save_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a comprehensive explanation report for a prediction.

    Args:
        predictor: Trained EspressoQualityPredictor
        input_params: Espresso parameters
        save_dir: Directory to save plots (optional)

    Returns:
        Complete explanation report
    """
    explainer = SHAPExplainer(predictor)

    report = {
        'parameters': input_params,
        'predictions': predictor.predict(input_params),
        'explanations': {}
    }

    # Generate explanations for each target
    for target in predictor.models.keys():
        explanation = explainer.explain_prediction(input_params, target)
        report['explanations'][target] = explanation

        # Save plots if requested
        if save_dir:
            save_path = Path(save_dir) / f'waterfall_{target}.png'
            explainer.plot_waterfall(input_params, target, save_path=str(save_path))

    return report


if __name__ == '__main__':
    # Example usage
    from models.espresso_predictor import EspressoQualityPredictor
    import sys

    if len(sys.argv) > 1:
        model_path = sys.argv[1]

        logger.info("Loading trained model...")
        predictor = EspressoQualityPredictor()
        predictor.load_models(model_path)

        logger.info("Creating SHAP explainer...")
        explainer = SHAPExplainer(predictor)

        # Example prediction
        example_params = {
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
            'usedPreInfusion': True
        }

        explanation = explainer.explain_prediction(example_params)

        print("\n" + "="*60)
        print("SHAP EXPLANATION")
        print("="*60)
        print(explanation['summary'])
        print("="*60)
    else:
        logger.info("Usage: python shap_analysis.py <model_path>")
