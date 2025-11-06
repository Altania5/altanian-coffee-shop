# Altanian Coffee Shop - ML Service

A Python-based machine learning microservice for espresso quality prediction and parameter recommendations.

## Features

### Core Capabilities
- **Dual-Model Architecture**: 5 separate XGBoost regressors predicting:
  - Overall shot quality (1-10)
  - Sweetness (1-10)
  - Acidity (1-10)
  - Bitterness (1-10)
  - Body/mouthfeel (1-10)

- **Explainable AI**: SHAP values for model interpretability
- **Smart Recommendations**: Parameter optimization using:
  - K-means clustering + nearest neighbor (for small datasets)
  - Bayesian optimization (for larger datasets)

- **Automated Retraining**: Background retraining pipeline with performance validation

## Architecture

```
ml_service/
├── app.py                      # Flask API server
├── requirements.txt            # Python dependencies
├── models/                     # Model training & prediction
│   └── espresso_predictor.py
├── explainability/             # SHAP interpretability
│   └── shap_analysis.py
├── recommendations/            # Parameter optimization
│   └── parameter_optimizer.py
├── training/                   # Automated retraining
│   └── auto_retrain.py
├── utils/                      # Preprocessing utilities
│   └── preprocessing.py
└── saved_models/               # Trained model files
    ├── espresso_models.pkl
    ├── preprocessor.pkl
    └── feature_columns.json
```

## Installation

### Local Development

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Docker

```bash
# Build image
docker build -t altanian-ml-service .

# Run container
docker run -p 5000:5000 altanian-ml-service
```

## Usage

### Start the Service

```bash
# Development mode
python app.py

# Production mode (with Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

The service will be available at `http://localhost:5000`

### API Endpoints

#### Health Check
```
GET /health
```

#### Predict Quality
```
POST /predict
Content-Type: application/json

{
  "grindSize": 12,
  "extractionTime": 28,
  "temperature": 93,
  "inWeight": 18,
  "outWeight": 36,
  ...
}
```

#### Get Recommendations
```
POST /recommend
Content-Type: application/json

{
  "currentParams": { ... },
  "targetProfile": {
    "sweetness": 9,
    "acidity": 5,
    "bitterness": 3,
    "body": 7
  }
}
```

#### Feature Importance
```
GET /feature-importance/shotQuality
```

#### Trigger Training
```
POST /train
Content-Type: application/json

{
  "training_data_path": "../server/training_data_cleaned.json"
}
```

## Training a New Model

### From Cleaned Data

```bash
# First, clean the training data from Node.js
cd ../server
node cleanTrainingData.js

# Then train the model
cd ../ml_service
python -c "from models.espresso_predictor import EspressoQualityPredictor; import pandas as pd; df = pd.read_json('../server/training_data_cleaned.json'); predictor = EspressoQualityPredictor(); predictor.train_all_models(df); predictor.save_models()"
```

### Manual Training Script

```python
from models.espresso_predictor import EspressoQualityPredictor
import pandas as pd

# Load data
df = pd.read_json('../server/training_data_cleaned.json')

# Train model
predictor = EspressoQualityPredictor()
predictor.train_all_models(df)

# Save models
predictor.save_models('saved_models/espresso_models.pkl')
```

## Model Performance

Expected performance with 50-100 quality training logs:
- **RMSE**: 0.6-0.8 (on 1-10 scale)
- **MAE**: 0.4-0.6
- **R²**: 0.70-0.85

Performance improves significantly with more data (100+ logs).

## Environment Variables

```bash
# Flask configuration
FLASK_ENV=development  # or 'production'
FLASK_DEBUG=True       # Only for development

# Model configuration
MODEL_PATH=saved_models/espresso_models.pkl
MIN_TRAINING_SAMPLES=30
AUTO_RETRAIN_THRESHOLD=20  # Retrain after 20 new logs

# API configuration
API_KEY=your_api_key_here  # Optional: for securing the ML service
```

## Testing

```bash
# Run tests
pytest tests/

# Test predictions
python -c "from app import app; import requests; response = requests.post('http://localhost:5000/predict', json={'grindSize': 12, 'temperature': 93, ...}); print(response.json())"
```

## Deployment

### Docker Deployment

```bash
# Build and push to registry
docker build -t altanian-ml-service:latest .
docker tag altanian-ml-service:latest your-registry.com/altanian-ml-service:latest
docker push your-registry.com/altanian-ml-service:latest
```

### Cloud Deployment (DigitalOcean, AWS, etc.)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Troubleshooting

### Model Not Loading
- Ensure `saved_models/espresso_models.pkl` exists
- Check file permissions
- Verify pickle compatibility (same Python version)

### Poor Predictions
- Check training data quality: `node ../server/cleanTrainingData.js`
- Ensure minimum 30+ quality logs for training
- Review model performance metrics during training

### High Memory Usage
- Reduce SHAP calculation frequency
- Use smaller batch sizes for predictions
- Limit concurrent requests

## Contributing

See the main project README for contribution guidelines.

## License

Copyright © 2025 Altanian Coffee Shop
