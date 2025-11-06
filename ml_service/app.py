"""
Altanian Coffee ML Service - Flask API
=======================================

REST API for espresso quality prediction and parameter recommendations.

Endpoints:
- GET  /health                      - Health check
- GET  /                            - API information
- POST /predict                     - Predict quality for parameters
- POST /explain                     - Get SHAP explanation for prediction
- GET  /feature-importance/<target> - Get feature importance
- POST /recommend                   - Get parameter recommendations
- GET  /model-info                  - Get model metadata
- POST /train                       - Trigger model retraining
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
import sys
from pathlib import Path
from datetime import datetime
import traceback

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from models.espresso_predictor import EspressoQualityPredictor
from explainability.shap_analysis import SHAPExplainer
from recommendations.parameter_optimizer import ClusteringRecommender, load_historical_shots
from config import MODEL_PATH, FLASK_PORT, FLASK_HOST, LOG_LEVEL

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
predictor = None
explainer = None
recommender = None
model_loaded = False
last_prediction_time = None

# ============================================
# MODEL INITIALIZATION
# ============================================

def load_models():
    """Load trained models on startup"""
    global predictor, explainer, recommender, model_loaded

    try:
        logger.info("Loading ML models...")

        # Check if model file exists
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Model file not found at: {MODEL_PATH}")
            logger.warning("Models need to be trained first. Use POST /train endpoint.")
            return False

        # Load predictor
        predictor = EspressoQualityPredictor()
        predictor.load_models(MODEL_PATH)

        # Initialize SHAP explainer
        explainer = SHAPExplainer(predictor)

        # Initialize recommendation engine
        try:
            # Try to load historical data for recommendations
            historical_data_paths = [
                '/app/coffee_logs_training_data_fresh.json',  # Docker path
                '../coffee_logs_training_data_fresh.json',     # Local dev
                'coffee_logs_training_data_fresh.json'
            ]

            historical_df = None
            for data_path in historical_data_paths:
                if os.path.exists(data_path):
                    historical_df = load_historical_shots(data_path)
                    logger.info(f"Loaded historical data from: {data_path}")
                    break

            if historical_df is not None and len(historical_df) > 10:
                # Initialize and fit recommender
                recommender = ClusteringRecommender(n_clusters=min(5, len(historical_df) // 10))
                recommender.fit(historical_df)
                logger.info("✅ Recommendation engine initialized!")
            else:
                logger.warning("Insufficient historical data for recommendations")
                recommender = None

        except Exception as e:
            logger.warning(f"Could not initialize recommender: {str(e)}")
            recommender = None

        model_loaded = True
        logger.info("✅ Models loaded successfully!")
        return True

    except Exception as e:
        logger.error(f"Failed to load models: {str(e)}")
        logger.error(traceback.format_exc())
        return False

# ============================================
# UTILITY FUNCTIONS
# ============================================

def validate_prediction_params(params):
    """
    Validate prediction parameters.

    Returns: (is_valid, error_message)
    """
    required_fields = ['grindSize', 'extractionTime', 'inWeight', 'outWeight']

    missing = [field for field in required_fields if field not in params]

    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    # Validate ranges
    validations = {
        'grindSize': (1, 50, "Grind size must be between 1-50"),
        'extractionTime': (10, 60, "Extraction time must be between 10-60 seconds"),
        'inWeight': (10, 30, "Input weight must be between 10-30 grams"),
        'outWeight': (15, 80, "Output weight must be between 15-80 grams"),
    }

    for field, (min_val, max_val, message) in validations.items():
        if field in params:
            value = params[field]
            if not isinstance(value, (int, float)) or value < min_val or value > max_val:
                return False, message

    return True, None

def format_error_response(message, status_code=400):
    """Format error response"""
    return jsonify({
        'success': False,
        'error': message,
        'timestamp': datetime.utcnow().isoformat()
    }), status_code

def format_success_response(data):
    """Format success response"""
    return jsonify({
        'success': True,
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    })

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/', methods=['GET'])
def index():
    """API information endpoint"""
    return jsonify({
        'name': 'Altanian Coffee ML Service',
        'version': '1.0.0',
        'description': 'Espresso quality prediction and parameter recommendation API',
        'endpoints': {
            'GET /health': 'Health check',
            'POST /predict': 'Predict espresso quality',
            'POST /explain': 'Get SHAP explanation',
            'GET /feature-importance/<target>': 'Get feature importance',
            'POST /recommend': 'Get parameter recommendations',
            'GET /model-info': 'Get model information',
            'POST /train': 'Trigger model retraining'
        },
        'status': 'Model loaded' if model_loaded else 'No model loaded',
        'model_path': MODEL_PATH
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = {
        'status': 'healthy' if model_loaded else 'no_model',
        'model_loaded': model_loaded,
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH),
        'timestamp': datetime.utcnow().isoformat()
    }

    if model_loaded and predictor:
        status['models'] = list(predictor.models.keys())
        status['num_features'] = len(predictor.feature_names)

    return jsonify(status)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict espresso quality and taste profile.

    Request body:
    {
        "grindSize": 12,
        "extractionTime": 28,
        "temperature": 93,
        "inWeight": 18,
        "outWeight": 36,
        "pressure": 9,
        "roastLevel": "medium",
        "processMethod": "washed",
        ...
    }

    Response:
    {
        "success": true,
        "data": {
            "predictions": {
                "shotQuality": 7.8,
                "sweetness": 8.2,
                "acidity": 6.5,
                "bitterness": 4.3,
                "body": 7.1
            },
            "confidence": {...},
            "metadata": {...}
        }
    }
    """
    global last_prediction_time

    try:
        # Check if model is loaded
        if not model_loaded or not predictor:
            return format_error_response(
                'Models not loaded. Please train models first using POST /train',
                503
            )

        # Get request data
        params = request.get_json()

        if not params:
            return format_error_response('No JSON data provided')

        # Validate parameters
        is_valid, error_msg = validate_prediction_params(params)
        if not is_valid:
            return format_error_response(error_msg)

        # Make prediction
        logger.info(f"Making prediction for: grind={params.get('grindSize')}, temp={params.get('temperature')}")
        predictions = predictor.predict(params)

        # Calculate confidence (simplified)
        confidence = calculate_confidence(params, predictions)

        # Get feature importance for top features
        top_features = {}
        for target in ['shotQuality', 'sweetness']:
            importance = predictor.get_feature_importance(target, top_n=5)
            top_features[target] = importance.to_dict('records')

        # Update last prediction time
        last_prediction_time = datetime.utcnow()

        response_data = {
            'predictions': predictions,
            'confidence': confidence,
            'top_features': top_features,
            'metadata': {
                'model_path': MODEL_PATH,
                'num_features': len(predictor.feature_names),
                'prediction_time_ms': 10  # Approximate
            }
        }

        return format_success_response(response_data)

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(f'Prediction failed: {str(e)}', 500)

@app.route('/explain', methods=['POST'])
def explain():
    """
    Get SHAP explanation for a prediction.

    Request body:
    {
        "parameters": {...},
        "target": "shotQuality"  // optional, defaults to shotQuality
    }

    Response:
    {
        "success": true,
        "data": {
            "explanation": {...},
            "top_positive_factors": [...],
            "top_negative_factors": [...],
            "summary": "..."
        }
    }
    """
    try:
        if not model_loaded or not predictor or not explainer:
            return format_error_response('Models not loaded', 503)

        data = request.get_json()

        if not data or 'parameters' not in data:
            return format_error_response('Missing "parameters" in request body')

        params = data['parameters']
        target = data.get('target', 'shotQuality')

        # Validate parameters
        is_valid, error_msg = validate_prediction_params(params)
        if not is_valid:
            return format_error_response(error_msg)

        # Get explanation
        logger.info(f"Generating SHAP explanation for target: {target}")
        explanation = explainer.explain_prediction(params, target)

        return format_success_response(explanation)

    except Exception as e:
        logger.error(f"Explanation error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(f'Explanation failed: {str(e)}', 500)

@app.route('/feature-importance/<target>', methods=['GET'])
def feature_importance(target):
    """
    Get feature importance for a specific target.

    Parameters:
    - target: shotQuality, sweetness, acidity, bitterness, or body

    Query params:
    - top_n: Number of top features (default: 15)
    """
    try:
        if not model_loaded or not predictor:
            return format_error_response('Models not loaded', 503)

        # Validate target
        valid_targets = ['shotQuality', 'sweetness', 'acidity', 'bitterness', 'body']
        if target not in valid_targets:
            return format_error_response(
                f'Invalid target. Must be one of: {", ".join(valid_targets)}'
            )

        # Get top_n from query params
        top_n = request.args.get('top_n', 15, type=int)
        top_n = min(max(top_n, 1), 50)  # Clamp between 1-50

        # Get feature importance
        importance = predictor.get_feature_importance(target, top_n=top_n)

        response_data = {
            'target': target,
            'features': importance.to_dict('records'),
            'total_features': len(predictor.feature_names)
        }

        return format_success_response(response_data)

    except Exception as e:
        logger.error(f"Feature importance error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(f'Failed to get feature importance: {str(e)}', 500)

@app.route('/model-info', methods=['GET'])
def model_info():
    """
    Get model information and metadata.

    Response includes:
    - Model status
    - Training metrics
    - Feature names
    - Top features per target
    """
    try:
        if not model_loaded or not predictor:
            return format_error_response('Models not loaded', 503)

        info = predictor.get_model_info()

        # Add additional metadata
        info['model_path'] = MODEL_PATH
        info['model_file_size_kb'] = os.path.getsize(MODEL_PATH) / 1024 if os.path.exists(MODEL_PATH) else 0
        info['last_prediction'] = last_prediction_time.isoformat() if last_prediction_time else None

        return format_success_response(info)

    except Exception as e:
        logger.error(f"Model info error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(f'Failed to get model info: {str(e)}', 500)

@app.route('/train', methods=['POST'])
def train():
    """
    Trigger model retraining.

    Request body (optional):
    {
        "data_path": "/path/to/training_data.json"
    }

    If no data_path provided, uses default location.
    """
    try:
        data = request.get_json() or {}
        data_path = data.get('data_path', '/training_data/training_data_cleaned.json')

        # Check if data file exists
        if not os.path.exists(data_path):
            return format_error_response(f'Training data not found at: {data_path}')

        logger.info(f"Starting training with data from: {data_path}")

        # Load training data
        import pandas as pd
        df = pd.read_json(data_path)

        logger.info(f"Loaded {len(df)} training samples")

        # Train models
        global predictor, explainer, model_loaded
        predictor = EspressoQualityPredictor()
        metrics = predictor.train_all_models(df)

        # Save models
        predictor.save_models(MODEL_PATH)

        # Reinitialize explainer
        explainer = SHAPExplainer(predictor)

        model_loaded = True

        logger.info("Training complete!")

        response_data = {
            'message': 'Training completed successfully',
            'metrics': metrics,
            'model_path': MODEL_PATH,
            'training_samples': len(df)
        }

        return format_success_response(response_data)

    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(f'Training failed: {str(e)}', 500)

@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Get parameter recommendations to achieve target taste profile.

    Request body:
    {
        "currentParams": {
            "grindSize": 12,
            "temperature": 93,
            ...
        },
        "targetProfile": {
            "sweetness": 9,
            "acidity": 5,
            "bitterness": 3,
            "body": 7
        },
        "constraints": {
            "fixedParams": ["machine"],
            "paramRanges": {
                "grindSize": [8, 16],
                "temperature": [88, 95]
            }
        }
    }

    Returns:
    {
        "success": true,
        "recommendations": {
            "primary": {...},
            "confidence": 0.85,
            "expectedOutcome": {...},
            "distanceFromTarget": 1.2,
            "explanation": {...}
        }
    }
    """
    try:
        # Check if recommender is available
        if recommender is None:
            return format_error_response(
                'Recommendation engine not available. Need more historical data (10+ shots).',
                503  # Service Unavailable
            )

        # Get request data
        data = request.get_json()

        if not data:
            return format_error_response('Request body is required', 400)

        current_params = data.get('currentParams', {})
        target_profile = data.get('targetProfile')
        constraints = data.get('constraints', {})

        # Validate target profile
        if not target_profile:
            return format_error_response('targetProfile is required', 400)

        required_taste_dims = ['sweetness', 'acidity', 'bitterness', 'body']
        missing_dims = [dim for dim in required_taste_dims if dim not in target_profile]

        if missing_dims:
            return format_error_response(
                f'Missing taste dimensions: {", ".join(missing_dims)}',
                400
            )

        # Validate taste values (1-10 scale)
        for dim, value in target_profile.items():
            if not isinstance(value, (int, float)) or value < 1 or value > 10:
                return format_error_response(
                    f'Invalid value for {dim}: must be between 1 and 10',
                    400
                )

        logger.info(f"Generating recommendations for target: {target_profile}")

        # Generate recommendations
        recommendations = recommender.recommend(
            target_profile=target_profile,
            constraints=constraints,
            current_params=current_params if current_params else None
        )

        # Round numeric values for cleaner output
        primary_params = recommendations['primary']
        for key, value in primary_params.items():
            if isinstance(value, float):
                # Round to 1 decimal place
                primary_params[key] = round(value, 1)

        # Format response
        response = {
            'success': True,
            'recommendations': {
                'primary': primary_params,
                'confidence': round(recommendations['confidence'], 2),
                'expectedOutcome': {
                    k: round(v, 1) if isinstance(v, float) else v
                    for k, v in recommendations['expectedOutcome'].items()
                },
                'distanceFromTarget': round(recommendations['distanceFromTarget'], 2),
                'clusterSize': recommendations.get('clusterSize', 0),
                'qualityShotsCount': recommendations.get('qualityShotsCount', 0),
                'explanation': recommendations.get('explanation', {})
            },
            'timestamp': datetime.now().isoformat()
        }

        logger.info(f"Recommendations generated successfully (confidence: {recommendations['confidence']:.2%})")

        return jsonify(response)

    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        logger.error(traceback.format_exc())
        return format_error_response(
            f'Recommendation failed: {str(e)}',
            500
        )

# ============================================
# HELPER FUNCTIONS
# ============================================

def calculate_confidence(params, predictions):
    """
    Calculate confidence scores for predictions.

    Simplified version - checks if parameters are within normal ranges.
    """
    base_confidence = 0.75

    # Reduce confidence for extreme values
    if params.get('grindSize', 12) < 5 or params.get('grindSize', 12) > 20:
        base_confidence *= 0.9

    if params.get('temperature', 93) < 88 or params.get('temperature', 93) > 96:
        base_confidence *= 0.9

    if params.get('extractionTime', 28) < 20 or params.get('extractionTime', 28) > 40:
        base_confidence *= 0.9

    # Per-target confidence (could be improved with more sophisticated methods)
    confidence = {
        'overall': round(base_confidence, 2),
        'shotQuality': round(base_confidence, 2),
        'sweetness': round(base_confidence * 0.8, 2),  # Lower for taste attributes
        'acidity': round(base_confidence * 0.8, 2),
        'bitterness': round(base_confidence * 0.8, 2),
        'body': round(base_confidence * 0.8, 2),
        'note': 'Confidence based on parameter reasonableness. Improve with more training data.'
    }

    return confidence

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return format_error_response('Endpoint not found', 404)

@app.errorhandler(405)
def method_not_allowed(error):
    return format_error_response('Method not allowed', 405)

@app.errorhandler(500)
def internal_error(error):
    return format_error_response('Internal server error', 500)

# ============================================
# STARTUP
# ============================================

if __name__ == '__main__':
    logger.info("="*60)
    logger.info("Starting Altanian Coffee ML Service")
    logger.info("="*60)

    # Try to load models on startup
    load_models()

    if not model_loaded:
        logger.warning("⚠️  Models not loaded. Train models using POST /train endpoint.")

    logger.info(f"Starting Flask server on {FLASK_HOST}:{FLASK_PORT}")
    logger.info("="*60)

    # Start Flask app
    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=False  # Set to True for development
    )
