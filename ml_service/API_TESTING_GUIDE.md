# 🚀 ML Service API Testing Guide

## Quick Start

API is running at: `http://localhost:5000`

## Available Endpoints

### 1. Health Check ✅
```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "models": ["shotQuality", "sweetness", "acidity", "bitterness", "body"],
  "num_features": 19
}
```

---

### 2. API Information ✅
```bash
curl http://localhost:5000/
```

---

### 3. Predict Espresso Quality ⭐
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "grindSize": 12,
    "extractionTime": 28,
    "temperature": 93,
    "inWeight": 18,
    "outWeight": 36,
    "pressure": 9,
    "roastLevel": "medium",
    "processMethod": "washed",
    "daysPastRoast": 14,
    "usedWDT": true,
    "usedPuckScreen": true,
    "usedPreInfusion": true,
    "machine": "Meraki"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictions": {
      "shotQuality": 6.06,
      "sweetness": 2.74,
      "acidity": 3.03,
      "bitterness": 3.00,
      "body": 2.69
    },
    "confidence": {
      "overall": 0.75,
      "shotQuality": 0.75,
      "sweetness": 0.60,
      ...
    },
    "top_features": {
      "shotQuality": [
        {"feature": "usedWDT", "importance": 0.184},
        {"feature": "flowRate", "importance": 0.160},
        ...
      ]
    }
  }
}
```

---

### 4. Get Feature Importance ✅
```bash
# For shot quality
curl http://localhost:5000/feature-importance/shotQuality?top_n=10

# For sweetness
curl http://localhost:5000/feature-importance/sweetness?top_n=10

# For other targets: acidity, bitterness, body
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target": "shotQuality",
    "features": [
      {"feature": "usedWDT", "importance": 0.184},
      {"feature": "flowRate", "importance": 0.160},
      {"feature": "extractionTime", "importance": 0.134},
      ...
    ]
  }
}
```

---

### 5. Get SHAP Explanation ✅
```bash
curl -X POST http://localhost:5000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "grindSize": 12,
      "extractionTime": 28,
      "temperature": 93,
      "inWeight": 18,
      "outWeight": 36,
      "pressure": 9,
      "roastLevel": "medium",
      "processMethod": "washed",
      "daysPastRoast": 14,
      "usedWDT": true,
      "machine": "Meraki"
    },
    "target": "shotQuality"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "target": "shotQuality",
    "prediction": 6.06,
    "base_value": 6.0,
    "top_positive_factors": [
      {"feature": "usedWDT", "shap_value": 0.5, "impact": "positive"},
      ...
    ],
    "top_negative_factors": [
      {"feature": "daysPastRoast", "shap_value": -0.3, "impact": "negative"},
      ...
    ],
    "summary": "Predicted shotQuality: 6.1/10\n✅ Factors increasing quality:\n  • Used WDT (+0.50)\n..."
  }
}
```

---

### 6. Get Model Information ✅
```bash
curl http://localhost:5000/model-info
```

---

### 7. Trigger Retraining ⚠️
```bash
curl -X POST http://localhost:5000/train \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "/training_data/training_data_cleaned.json"
  }'
```

---

## Testing with Python

```python
import requests

# Health check
response = requests.get('http://localhost:5000/health')
print(response.json())

# Make prediction
params = {
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
    'machine': 'Meraki'
}

response = requests.post('http://localhost:5000/predict', json=params)
result = response.json()

if result['success']:
    predictions = result['data']['predictions']
    print(f"Shot Quality: {predictions['shotQuality']:.2f}/10")
    print(f"Sweetness: {predictions['sweetness']:.2f}/10")
    print(f"Acidity: {predictions['acidity']:.2f}/10")
```

---

## Testing with Node.js / JavaScript

```javascript
const axios = require('axios');

// Health check
axios.get('http://localhost:5000/health')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Make prediction
const params = {
  grindSize: 12,
  extractionTime: 28,
  temperature: 93,
  inWeight: 18,
  outWeight: 36,
  pressure: 9,
  roastLevel: 'medium',
  processMethod: 'washed',
  daysPastRoast: 14,
  usedWDT: true,
  usedPuckScreen: true,
  machine: 'Meraki'
};

axios.post('http://localhost:5000/predict', params)
  .then(response => {
    const { predictions, confidence } = response.data.data;
    console.log('Shot Quality:', predictions.shotQuality);
    console.log('Confidence:', confidence.overall);
  })
  .catch(error => console.error(error));
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-11-05T18:00:00.000000"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Endpoint not found
- `405` - Method not allowed
- `500` - Internal server error
- `503` - Service unavailable (models not loaded)

---

## Performance

- **Prediction time**: <10ms
- **Health check**: <5ms
- **Feature importance**: <20ms
- **SHAP explanation**: 50-100ms (more complex)

---

## Required Parameters for Prediction

### Minimum Required:
- `grindSize` (1-50)
- `extractionTime` (10-60 seconds)
- `inWeight` (10-30 grams)
- `outWeight` (15-80 grams)

### Recommended:
- `temperature` (85-96°C, default: 93)
- `pressure` (6-15 bars, default: 9)
- `roastLevel` (light/medium/dark)
- `processMethod` (washed/natural/honey)
- `daysPastRoast` (0-60 days)
- `machine` (Meraki/Breville/etc)

### Optional (improves accuracy):
- `usedWDT` (boolean)
- `usedPuckScreen` (boolean)
- `usedPreInfusion` (boolean)
- `preInfusionTime` (0-15 seconds)
- `preInfusionPressure` (1-5 bars)
- `beanUsageCount` (integer)
- `humidity` (30-80%)

---

## Monitoring

Check API logs:
```bash
docker-compose logs -f ml-service
```

Check container status:
```bash
docker-compose ps ml-service
```

---

## Troubleshooting

### Models not loaded
```bash
# Check if model file exists
docker-compose exec ml-service ls -la saved_models/

# Retrain if needed
curl -X POST http://localhost:5000/train
```

### Service not responding
```bash
# Check logs
docker-compose logs --tail=50 ml-service

# Restart service
docker-compose restart ml-service
```

### Slow responses
- SHAP explanations take longer (50-100ms)
- Check system resources: `docker stats ml-service`
- Consider disabling SHAP for production if not needed
