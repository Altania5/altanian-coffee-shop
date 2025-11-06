# Legacy AI Services - ARCHIVED

**Date Archived**: November 5, 2025

## Overview

This folder contains legacy AI services that have been replaced by the new Python ML service architecture.

## Archived Services

### 1. `centralizedAIService.js`
- **Purpose**: Main AI service coordinator
- **Status**: DEPRECATED
- **Replaced by**: `mlServiceClient.js` (connects to Python Flask ML service)

### 2. `realMLService.js`
- **Purpose**: Legacy ML service implementation
- **Status**: DEPRECATED
- **Replaced by**: Python Flask ML service (`ml_service/app.py`)

### 3. `trainedModelService.js`
- **Purpose**: Service for loading scikit-learn pickle models
- **Status**: DEPRECATED
- **Replaced by**: Python XGBoost models in `ml_service/models/espresso_predictor.py`

### 4. `aiModelService.js`
- **Purpose**: Database model management service
- **Status**: DEPRECATED
- **Replaced by**: Direct model management via Python ML service

## Why Were These Archived?

The legacy services had several limitations:

1. **No Real ML Execution**: Services simulated predictions or had limited Node.js ML capabilities
2. **Inconsistent Architecture**: Multiple overlapping services with unclear responsibilities
3. **No Model Interpretability**: Lacked SHAP explanations and feature importance
4. **Limited Scalability**: Node.js is not ideal for heavy ML computations
5. **Maintenance Burden**: Multiple codepaths doing similar things

## New Architecture

### Python ML Service (Recommended)
- **Location**: `ml_service/` directory
- **API**: Flask REST API on port 5000
- **Models**: XGBoost dual-model architecture (5 regressors)
- **Features**:
  - Real predictions with 60 training samples
  - SHAP interpretability
  - Feature importance rankings
  - Cross-validation metrics
  - Docker deployment

### Node.js Integration
- **Client**: `server/services/mlServiceClient.js`
- **Routes**: `server/routes/ai-new.js` (mounted at `/api/ai`)
- **Features**:
  - Health monitoring
  - Automatic fallback to rule-based predictions
  - Connection pooling
  - Comprehensive error handling

## Migration Guide

### For Frontend Developers

**Old Endpoints** (DEPRECATED):
```
GET  /ai/status        → Use /api/ai/status instead
POST /ai/analyze       → Use /api/ai/analyze instead
POST /ai/train         → Use /api/ai/retrain instead
```

**New Endpoints** (RECOMMENDED):
```
GET  /api/ai/status                    - ML service health & stats
POST /api/ai/analyze                   - Get predictions
POST /api/ai/explain                   - Get SHAP explanations
GET  /api/ai/feature-importance/:target - Feature rankings
POST /api/ai/retrain                   - Trigger retraining (owner only)
POST /api/ai/log-with-prediction       - Log with comparison
```

### Response Format Changes

**Old Format**:
```json
{
  "success": true,
  "predictedQuality": 6.5,
  "recommendations": [...]
}
```

**New Format**:
```json
{
  "success": true,
  "analysis": {
    "predictedQuality": 6.064,
    "confidence": 0.75,
    "predictions": {
      "shotQuality": 6.064,
      "sweetness": 2.74,
      "acidity": 3.03,
      "bitterness": 3.00,
      "body": 2.69
    },
    "tasteProfile": { ... },
    "recommendations": [...],
    "topFeatures": { ... },
    "modelVersion": "2.0-xgboost",
    "source": "ml-service"
  }
}
```

## Backward Compatibility

The legacy `/ai` routes are still available but **DEPRECATED**. They will:
- Continue to work with existing frontend code
- Return deprecation warnings in console
- Be removed in a future version (target: v3.0.0)

## Timeline

- **v2.0**: New Python ML service introduced, legacy routes deprecated
- **v2.5**: Frontend migration complete, legacy routes marked for removal
- **v3.0**: Legacy routes and services will be permanently removed

## Questions?

See:
- `INTEGRATION_TEST_RESULTS.md` - Integration test documentation
- `ml_service/API_TESTING_GUIDE.md` - ML service API documentation
- `server/routes/ai-new.js` - New route implementations
