"""
Feature Engineering for Espresso Quality Prediction
===================================================

Comprehensive feature engineering to improve model performance.
Addresses issues with low-variance targets and limited features.
"""

import pandas as pd
import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class EspressoFeatureEngineer:
    """
    Feature engineering pipeline for espresso quality prediction.

    Creates interaction features, polynomial features, and domain-specific
    engineered features to improve model performance.
    """

    def __init__(self):
        self.feature_names = []

    def create_interaction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create interaction features between key variables.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with interaction features added
        """
        df = df.copy()

        # Pressure * Time (extraction intensity)
        if 'pressure' in df.columns and 'extractionTime' in df.columns:
            df['pressureTime'] = df['pressure'] * df['extractionTime']
            df['extractionIntensity'] = df['pressure'] * df['extractionTime'] / 100

        # Temperature * Ratio (thermal extraction)
        if 'temperature' in df.columns and 'ratio' in df.columns:
            df['tempRatio'] = df['temperature'] * df['ratio']
            df['thermalExtraction'] = df['temperature'] / 93 * df['ratio']

        # Grind * Dose (grind density)
        if 'grindSize' in df.columns and 'inWeight' in df.columns:
            df['grindDose'] = df['grindSize'] * df['inWeight']
            df['grindDensity'] = df['grindSize'] / df['inWeight']

        # Flow * Pressure (extraction efficiency)
        if 'flowRate' in df.columns and 'pressure' in df.columns:
            df['flowPressure'] = df['flowRate'] * df['pressure']
            df['pressureEfficiency'] = df['flowRate'] / df['pressure']

        # Time * Temperature (heat energy)
        if 'extractionTime' in df.columns and 'temperature' in df.columns:
            df['timeTemp'] = df['extractionTime'] * df['temperature']
            df['heatEnergy'] = (df['extractionTime'] * (df['temperature'] - 90)) / 100

        # Grind * Time (extraction resistance)
        if 'grindSize' in df.columns and 'extractionTime' in df.columns:
            df['grindTime'] = df['grindSize'] * df['extractionTime']
            df['extractionResistance'] = df['grindSize'] / (df['extractionTime'] + 1)

        # Dose * Ratio (strength indicator)
        if 'inWeight' in df.columns and 'ratio' in df.columns:
            df['doseRatio'] = df['inWeight'] * df['ratio']
            df['strengthIndex'] = df['inWeight'] / (df['ratio'] + 0.1)

        logger.info(f"Created {sum('pressure' in c or 'temp' in c or 'grind' in c.lower() or 'flow' in c.lower() for c in df.columns) - sum('pressure' in c or 'temp' in c or 'grind' in c.lower() or 'flow' in c.lower() for c in df.columns if c in ['pressure', 'temperature', 'grindSize', 'flowRate'])} interaction features")

        return df

    def create_polynomial_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create polynomial features for key variables.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with polynomial features added
        """
        df = df.copy()

        # Quadratic features for key variables
        key_features = ['grindSize', 'extractionTime', 'temperature', 'flowRate', 'ratio']

        for feature in key_features:
            if feature in df.columns:
                # Square
                df[f'{feature}Squared'] = df[feature] ** 2

                # Cube (for highly non-linear relationships)
                if feature in ['grindSize', 'flowRate']:
                    df[f'{feature}Cubed'] = df[feature] ** 3

        # Inverse features (for ratio-like behavior)
        if 'grindSize' in df.columns:
            df['grindInverse'] = 1 / (df['grindSize'] + 0.1)

        if 'extractionTime' in df.columns:
            df['timeInverse'] = 1 / (df['extractionTime'] + 1)

        logger.info(f"Created {sum('Squared' in c or 'Cubed' in c or 'Inverse' in c for c in df.columns)} polynomial features")

        return df

    def create_categorical_bins(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create categorical bins for continuous variables.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with categorical bins added
        """
        df = df.copy()

        # Shot type based on ratio
        if 'ratio' in df.columns and not df['ratio'].empty:
            try:
                df['shotType'] = pd.cut(
                    df['ratio'],
                    bins=[0, 1.5, 2.2, 3.0, 10],
                    labels=['ristretto', 'normale', 'lungo', 'allongé'],
                    include_lowest=True
                ).astype(str)
            except Exception as e:
                logger.warning(f"Could not create shotType bins: {e}")
                df['shotType'] = 'normale'

        # Bean freshness category
        if 'daysPastRoast' in df.columns:
            df['freshnessCategory'] = pd.cut(
                df['daysPastRoast'],
                bins=[0, 7, 14, 21, 1000],
                labels=['very_fresh', 'fresh', 'optimal', 'aged'],
                include_lowest=True
            ).astype(str)

        # Temperature zone
        if 'temperature' in df.columns:
            df['tempZone'] = pd.cut(
                df['temperature'],
                bins=[0, 91, 93, 95, 100],
                labels=['low', 'medium', 'high', 'very_high'],
                include_lowest=True
            ).astype(str)

        # Grind zone
        if 'grindSize' in df.columns:
            df['grindZone'] = pd.cut(
                df['grindSize'],
                bins=[0, 10, 12, 14, 20],
                labels=['very_fine', 'fine', 'medium', 'coarse'],
                include_lowest=True
            ).astype(str)

        # Extraction speed
        if 'flowRate' in df.columns:
            df['extractionSpeed'] = pd.cut(
                df['flowRate'],
                bins=[0, 1.0, 1.5, 2.0, 10],
                labels=['slow', 'normal', 'fast', 'very_fast'],
                include_lowest=True
            ).astype(str)

        logger.info(f"Created {sum('Category' in c or 'Type' in c or 'Zone' in c or 'Speed' in c for c in df.columns)} categorical features")

        return df

    def create_domain_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create domain-specific espresso features based on coffee science.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with domain features added
        """
        df = df.copy()

        # Extraction yield approximation (based on research)
        if 'inWeight' in df.columns and 'outWeight' in df.columns:
            # Rough approximation: EY = (outWeight - inWeight) / inWeight * 100
            # Typical range: 18-22%
            df['extractionYieldApprox'] = ((df['outWeight'] - df['inWeight']) / df['inWeight']) * 100

        # Total Dissolved Solids (TDS) proxy
        # Higher strength index suggests higher TDS
        if 'inWeight' in df.columns and 'outWeight' in df.columns:
            df['tdsProxy'] = (df['inWeight'] / df['outWeight']) * 10

        # Channeling risk score
        # High grind variance + long time = more channeling risk
        if 'grindSize' in df.columns and 'extractionTime' in df.columns:
            df['channelingRisk'] = (df['grindSize'] * 0.1) + (df['extractionTime'] * 0.05)

        # Under/over extraction indicator
        # Based on time vs ratio vs temp
        if all(f in df.columns for f in ['extractionTime', 'ratio', 'temperature']):
            # Normalized extraction score
            time_norm = (df['extractionTime'] - 25) / 10  # Center around 25s
            ratio_norm = (df['ratio'] - 2.0) / 0.5  # Center around 2:1
            temp_norm = (df['temperature'] - 93) / 3  # Center around 93C

            df['extractionBalance'] = (time_norm + ratio_norm + temp_norm) / 3
            df['overExtractionRisk'] = np.clip((time_norm + temp_norm) / 2, -5, 5)
            df['underExtractionRisk'] = -df['overExtractionRisk']

        # Bean age impact on extraction
        if 'daysPastRoast' in df.columns:
            # CO2 degassing curve (peaks around 7-14 days)
            df['co2Activity'] = np.exp(-((df['daysPastRoast'] - 10) ** 2) / 50)
            df['freshnessScore'] = np.clip(1 - (df['daysPastRoast'] / 30), 0, 1)

        # Preparation quality score
        # Combines WDT, puck screen, pre-infusion
        prep_score = 0
        if 'usedWDT' in df.columns:
            prep_score += df['usedWDT'].astype(int) * 0.4
        if 'usedPuckScreen' in df.columns:
            prep_score += df['usedPuckScreen'].astype(int) * 0.3
        if 'usedPreInfusion' in df.columns:
            prep_score += df['usedPreInfusion'].astype(int) * 0.3

        df['prepQualityScore'] = prep_score

        # Temperature stability proxy
        # Pre-infusion at lower temp suggests better temp control
        if 'usedPreInfusion' in df.columns and 'preInfusionTime' in df.columns:
            df['tempStability'] = df['usedPreInfusion'].astype(int) * (df['preInfusionTime'] * 0.1)

        logger.info(f"Created {sum('Yield' in c or 'tds' in c.lower() or 'channel' in c.lower() or 'extraction' in c.lower() or 'fresh' in c.lower() or 'prep' in c.lower() or 'stability' in c.lower() for c in df.columns) - 4} domain features")

        return df

    def create_technique_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create composite scores for technique quality.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with technique scores added
        """
        df = df.copy()

        # Distribution quality score
        dist_score = 0
        if 'distributionTechnique' in df.columns:
            # Score different distribution methods
            dist_map = {
                'none': 0,
                'tap': 0.3,
                'wdt': 0.6,
                'distribution-tool': 0.5,
                'wdt-plus-distribution': 1.0
            }
            df['distributionScore'] = df['distributionTechnique'].map(dist_map).fillna(0.5)

        # Pre-infusion effectiveness
        if 'usedPreInfusion' in df.columns and 'preInfusionTime' in df.columns and 'preInfusionPressure' in df.columns:
            # Optimal pre-infusion: 5-10s at 2-4 bar
            df['preInfusionScore'] = df['usedPreInfusion'].astype(int) * (
                np.clip(df['preInfusionTime'] / 10, 0, 1) * 0.5 +
                np.clip(df['preInfusionPressure'] / 5, 0, 1) * 0.5
            )

        # Overall technique mastery score
        technique_components = []
        if 'usedWDT' in df.columns:
            technique_components.append(df['usedWDT'].astype(int))
        if 'usedPuckScreen' in df.columns:
            technique_components.append(df['usedPuckScreen'].astype(int))
        if 'distributionScore' in df.columns:
            technique_components.append(df['distributionScore'])
        if 'preInfusionScore' in df.columns:
            technique_components.append(df['preInfusionScore'])

        if technique_components:
            df['techniqueMastery'] = sum(technique_components) / len(technique_components)

        logger.info("Created technique score features")

        return df

    def engineer_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply all feature engineering steps.

        Args:
            df: Raw input dataframe

        Returns:
            DataFrame with all engineered features
        """
        logger.info("="*60)
        logger.info("FEATURE ENGINEERING PIPELINE")
        logger.info("="*60)
        logger.info(f"Input shape: {df.shape}")

        # Apply all engineering steps
        df = self.create_interaction_features(df)
        df = self.create_polynomial_features(df)
        df = self.create_categorical_bins(df)
        df = self.create_domain_features(df)
        df = self.create_technique_scores(df)

        logger.info(f"Output shape: {df.shape}")
        logger.info(f"Added {df.shape[1] - len(df.columns)} new features")
        logger.info("="*60)

        # Store feature names for later use
        self.feature_names = list(df.columns)

        return df
