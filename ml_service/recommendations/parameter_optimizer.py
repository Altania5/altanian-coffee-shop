"""
Parameter Recommendation Engine
================================

Provides intelligent parameter recommendations for achieving target taste profiles.

Strategies:
- ClusteringRecommender: K-means clustering for small datasets (<100 samples)
- BayesianRecommender: Bayesian optimization for larger datasets (100+ samples)
"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from bayes_opt import BayesianOptimization
import pickle
import logging

logger = logging.getLogger(__name__)


class ClusteringRecommender:
    """
    Recommendation engine using K-means clustering.
    Best for datasets with 50-100 samples.

    Approach:
    1. Cluster historical shots by taste profile similarity
    2. Find cluster closest to target profile
    3. Return parameters from best shots in that cluster
    """

    def __init__(self, n_clusters=5):
        """
        Initialize clustering recommender.

        Args:
            n_clusters: Number of clusters to create (default: 5)
        """
        self.n_clusters = n_clusters
        self.clusterer = KMeans(n_clusters=n_clusters, random_state=42)
        self.scaler = StandardScaler()
        self.historical_shots = None
        self.taste_features = ['sweetness', 'acidity', 'bitterness', 'body']
        self.parameter_features = [
            'grindSize', 'extractionTime', 'temperature', 'inWeight',
            'pressure', 'preInfusionTime', 'usedWDT', 'usedPuckScreen'
        ]

    def fit(self, shots_df):
        """
        Fit the clustering model on historical shots.

        Args:
            shots_df: DataFrame with historical shots including taste profiles
        """
        logger.info(f"Fitting clustering recommender with {len(shots_df)} shots")

        # Store historical data
        self.historical_shots = shots_df.copy()

        # Extract taste profiles for clustering
        taste_profiles = shots_df[self.taste_features].values

        # Normalize taste profiles
        taste_profiles_scaled = self.scaler.fit_transform(taste_profiles)

        # Cluster shots by taste similarity
        self.clusterer.fit(taste_profiles_scaled)

        # Add cluster labels to historical data
        self.historical_shots['cluster'] = self.clusterer.labels_

        logger.info(f"Created {self.n_clusters} taste profile clusters")

    def recommend(self, target_profile, constraints=None, current_params=None):
        """
        Recommend parameters to achieve target taste profile.

        Args:
            target_profile: Dict with target sweetness, acidity, bitterness, body (1-10 scale)
            constraints: Dict with fixed parameters and ranges (optional)
            current_params: Dict with current parameters for comparison (optional)

        Returns:
            Dict with primary recommendation, confidence, and expected outcome
        """
        if self.historical_shots is None:
            raise ValueError("Model not fitted. Call fit() first.")

        logger.info(f"Generating recommendations for target: {target_profile}")

        # Prepare target profile
        target_array = np.array([
            target_profile.get('sweetness', 5),
            target_profile.get('acidity', 5),
            target_profile.get('bitterness', 5),
            target_profile.get('body', 5)
        ]).reshape(1, -1)

        # Scale target profile
        target_scaled = self.scaler.transform(target_array)

        # Find nearest cluster
        cluster_id = self.clusterer.predict(target_scaled)[0]
        logger.info(f"Assigned to cluster {cluster_id}")

        # Get shots from this cluster
        cluster_shots = self.historical_shots[
            self.historical_shots['cluster'] == cluster_id
        ]

        # Filter for high-quality shots (quality >= 7)
        best_shots = cluster_shots[cluster_shots['shotQuality'] >= 7]

        if len(best_shots) == 0:
            # No great shots in cluster, relax quality threshold
            logger.warning(f"No high-quality shots in cluster {cluster_id}, using quality >= 6")
            best_shots = cluster_shots[cluster_shots['shotQuality'] >= 6]

        if len(best_shots) == 0:
            # Still no shots, use all cluster shots
            logger.warning(f"Using all shots from cluster {cluster_id}")
            best_shots = cluster_shots

        # Calculate average parameters from best shots
        recommended_params = {}
        for param in self.parameter_features:
            if param in best_shots.columns:
                # For numeric params, take mean
                if best_shots[param].dtype in [np.float64, np.int64, bool]:
                    recommended_params[param] = float(best_shots[param].mean())
                else:
                    # For categorical params, take mode
                    recommended_params[param] = best_shots[param].mode()[0]

        # Apply constraints if provided
        if constraints:
            recommended_params = self._apply_constraints(
                recommended_params,
                constraints
            )

        # Calculate confidence based on cluster quality and size
        confidence = self._calculate_confidence(
            best_shots,
            cluster_shots,
            target_scaled
        )

        # Estimate expected outcome
        expected_outcome = {
            'sweetness': float(best_shots['sweetness'].mean()),
            'acidity': float(best_shots['acidity'].mean()),
            'bitterness': float(best_shots['bitterness'].mean()),
            'body': float(best_shots['body'].mean()),
            'shotQuality': float(best_shots['shotQuality'].mean())
        }

        # Calculate distance from target
        distance = self._calculate_taste_distance(expected_outcome, target_profile)

        return {
            'primary': recommended_params,
            'confidence': confidence,
            'expectedOutcome': expected_outcome,
            'distanceFromTarget': distance,
            'clusterSize': len(cluster_shots),
            'qualityShotsCount': len(best_shots),
            'explanation': self._generate_explanation(
                recommended_params,
                current_params,
                expected_outcome,
                target_profile
            )
        }

    def _apply_constraints(self, params, constraints):
        """Apply parameter constraints and ranges."""
        constrained_params = params.copy()

        # Fixed parameters (don't change)
        if 'fixedParams' in constraints:
            for param in constraints['fixedParams']:
                if param in params:
                    # Keep original value (would need current_params for this)
                    pass

        # Parameter ranges
        if 'paramRanges' in constraints:
            for param, (min_val, max_val) in constraints['paramRanges'].items():
                if param in constrained_params:
                    constrained_params[param] = np.clip(
                        constrained_params[param],
                        min_val,
                        max_val
                    )

        return constrained_params

    def _calculate_confidence(self, best_shots, all_cluster_shots, target_scaled):
        """Calculate confidence score for recommendation."""
        # Base confidence on cluster characteristics
        quality_ratio = len(best_shots) / max(len(all_cluster_shots), 1)
        cluster_consistency = 1.0 - all_cluster_shots['shotQuality'].std() / 10.0

        # Distance from cluster center
        cluster_center = self.clusterer.cluster_centers_[
            all_cluster_shots['cluster'].iloc[0]
        ]
        distance_from_center = np.linalg.norm(target_scaled - cluster_center)
        distance_confidence = max(0, 1.0 - distance_from_center / 2.0)

        # Combined confidence
        confidence = (
            0.4 * quality_ratio +
            0.3 * cluster_consistency +
            0.3 * distance_confidence
        )

        return max(0.0, min(1.0, confidence))

    def _calculate_taste_distance(self, outcome, target):
        """Calculate Euclidean distance between taste profiles."""
        outcome_array = np.array([
            outcome.get('sweetness', 5),
            outcome.get('acidity', 5),
            outcome.get('bitterness', 5),
            outcome.get('body', 5)
        ])

        target_array = np.array([
            target.get('sweetness', 5),
            target.get('acidity', 5),
            target.get('bitterness', 5),
            target.get('body', 5)
        ])

        return float(np.linalg.norm(outcome_array - target_array))

    def _generate_explanation(self, recommended, current, expected, target):
        """Generate human-readable explanations for parameter changes."""
        explanations = {}

        if current:
            # Compare recommended vs current
            if 'grindSize' in recommended and 'grindSize' in current:
                grind_change = recommended['grindSize'] - current['grindSize']
                if abs(grind_change) > 0.5:
                    if grind_change > 0:
                        explanations['grindSize'] = (
                            f"Finer grind (+{grind_change:.1f}) will increase "
                            f"extraction and body, potentially boosting sweetness"
                        )
                    else:
                        explanations['grindSize'] = (
                            f"Coarser grind ({grind_change:.1f}) will reduce "
                            f"bitterness and prevent over-extraction"
                        )

            if 'temperature' in recommended and 'temperature' in current:
                temp_change = recommended['temperature'] - current['temperature']
                if abs(temp_change) > 1:
                    if temp_change > 0:
                        explanations['temperature'] = (
                            f"Higher temperature (+{temp_change:.1f}°C) will "
                            f"increase extraction efficiency and body"
                        )
                    else:
                        explanations['temperature'] = (
                            f"Lower temperature ({temp_change:.1f}°C) will "
                            f"reduce bitterness and highlight acidity"
                        )

        return explanations


class BayesianRecommender:
    """
    Recommendation engine using Bayesian optimization.
    Best for datasets with 100+ samples.

    Approach:
    1. Use trained predictor model as objective function
    2. Optimize parameters to minimize distance from target profile
    3. Handle constraints (fixed params, ranges)
    """

    def __init__(self, predictor_model):
        """
        Initialize Bayesian recommender.

        Args:
            predictor_model: Trained EspressoQualityPredictor model
        """
        self.predictor = predictor_model

    def recommend(self, target_profile, param_bounds, constraints=None):
        """
        Recommend parameters using Bayesian optimization.

        Args:
            target_profile: Dict with target taste profile
            param_bounds: Dict with min/max for each parameter
            constraints: Dict with fixed parameters (optional)

        Returns:
            Dict with optimized parameters and expected outcome
        """
        logger.info(f"Running Bayesian optimization for target: {target_profile}")

        # Define objective function
        def objective(**params):
            """Minimize distance from target taste profile."""
            # Predict outcomes with these parameters
            prediction = self.predictor.predict(params)

            # Calculate distance from target
            distance = self._calculate_distance(
                prediction,
                target_profile
            )

            # Return negative distance (we're maximizing)
            return -distance

        # Run Bayesian optimization
        optimizer = BayesianOptimization(
            f=objective,
            pbounds=param_bounds,
            random_state=42,
            verbose=0
        )

        optimizer.maximize(
            init_points=5,  # Random exploration
            n_iter=25       # Optimization iterations
        )

        # Get best parameters
        best_params = optimizer.max['params']

        # Apply constraints
        if constraints and 'fixedParams' in constraints:
            for param in constraints['fixedParams']:
                if param in best_params:
                    del best_params[param]

        # Predict expected outcome
        expected_outcome = self.predictor.predict(best_params)

        return {
            'primary': best_params,
            'confidence': abs(optimizer.max['target']) / 10.0,  # Normalize
            'expectedOutcome': expected_outcome,
            'distanceFromTarget': -optimizer.max['target']
        }

    def _calculate_distance(self, prediction, target):
        """Calculate Euclidean distance between predicted and target profiles."""
        pred_array = np.array([
            prediction.get('sweetness', 5),
            prediction.get('acidity', 5),
            prediction.get('bitterness', 5),
            prediction.get('body', 5)
        ])

        target_array = np.array([
            target.get('sweetness', 5),
            target.get('acidity', 5),
            target.get('bitterness', 5),
            target.get('body', 5)
        ])

        return float(np.linalg.norm(pred_array - target_array))


def load_historical_shots(data_path):
    """
    Load historical coffee log data for recommendation training.

    Args:
        data_path: Path to JSON or CSV file with historical shots

    Returns:
        DataFrame with historical shot data
    """
    if data_path.endswith('.json'):
        df = pd.read_json(data_path)
    elif data_path.endswith('.csv'):
        df = pd.read_csv(data_path)
    else:
        raise ValueError(f"Unsupported file format: {data_path}")

    logger.info(f"Loaded {len(df)} historical shots from {data_path}")
    return df


# Example usage
if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(level=logging.INFO)

    # Load historical data
    shots_df = load_historical_shots('../coffee_logs_training_data_fresh.json')

    # Create and fit clustering recommender
    recommender = ClusteringRecommender(n_clusters=5)
    recommender.fit(shots_df)

    # Get recommendation for target profile
    target = {
        'sweetness': 8,
        'acidity': 5,
        'bitterness': 3,
        'body': 7
    }

    recommendation = recommender.recommend(
        target_profile=target,
        constraints={
            'paramRanges': {
                'grindSize': (8, 16),
                'temperature': (88, 95)
            }
        }
    )

    print("\n🎯 Recommendation:")
    print(f"Parameters: {recommendation['primary']}")
    print(f"Confidence: {recommendation['confidence']:.2%}")
    print(f"Expected Quality: {recommendation['expectedOutcome']['shotQuality']:.1f}/10")
    print(f"Distance from Target: {recommendation['distanceFromTarget']:.2f}")
