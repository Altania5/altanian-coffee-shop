# 🐳 Docker Testing Guide - Altanian Coffee ML Service

Complete guide for testing the AI espresso model using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose installed
- 8GB RAM available
- 5GB disk space

## Quick Start (5 Minutes)

### 1. Build and Start Services

```bash
# Navigate to project root
cd C:\Users\altan\OneDrive\dev\altaniancoffee

# Build Docker images (first time only - takes 5-10 minutes)
docker-compose build ml-service

# Start just the ML service
docker-compose up ml-service
```

### 2. Train the Models

Open a new terminal while services are running:

```bash
# Run training script in the container
docker-compose exec ml-service python test_training.py
```

Expected output:
```
============================================================
ESPRESSO MODEL TRAINING TEST
============================================================

📂 Step 1: Loading training data...
✅ Loaded 60 training samples

🤖 Step 2: Training XGBoost models...
============================================================
Training Model: shotQuality
============================================================
Fold 1: RMSE=1.234, MAE=0.987, R²=0.765
...
✅ Training complete!

📊 Step 3: Model Performance Summary
============================================================
SHOTQUALITY:
   RMSE: 1.234 ± 0.123
   MAE:  0.987
   R²:   0.765
...

✅ ALL TESTS PASSED!
```

### 3. Verify Models

```bash
# List saved models
docker-compose exec ml-service ls -lh saved_models/

# Expected output:
# espresso_models.pkl (2-5 MB)
```

---

## Detailed Testing Steps

### Step 1: Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values (optional for testing)
# nano .env
```

### Step 2: Build Images

```bash
# Build only ML service
docker-compose build ml-service

# Or build all services
docker-compose build

# Check images
docker images | grep altanian
```

Expected images:
```
altanian-ml-service    latest    <IMAGE_ID>    2.1 GB
```

### Step 3: Start Services

```bash
# Option A: Start ML service only (for testing)
docker-compose up -d ml-service

# Option B: Start all services
docker-compose up -d

# Check status
docker-compose ps
```

Expected output:
```
NAME                  STATUS              PORTS
altanian-ml-service   Up (healthy)        0.0.0.0:5000->5000/tcp
```

### Step 4: Check Logs

```bash
# View ML service logs
docker-compose logs -f ml-service

# View last 50 lines
docker-compose logs --tail=50 ml-service
```

### Step 5: Train Models

```bash
# Interactive training
docker-compose exec ml-service python test_training.py

# Or run as command
docker-compose exec ml-service python models/espresso_predictor.py /app/training_data/training_data_cleaned.json
```

### Step 6: Test Python Predictions

```bash
# Enter container shell
docker-compose exec ml-service /bin/bash

# Inside container, run Python
python

# Test prediction
>>> from models.espresso_predictor import EspressoQualityPredictor
>>> p = EspressoQualityPredictor()
>>> p.load_models('saved_models/espresso_models.pkl')
>>> params = {
...     'grindSize': 12, 'temperature': 93, 'extractionTime': 28,
...     'inWeight': 18, 'outWeight': 36, 'pressure': 9,
...     'roastLevel': 'medium', 'processMethod': 'washed',
...     'daysPastRoast': 14, 'usedWDT': True,
...     'usedPuckScreen': True, 'usedPreInfusion': True,
...     'machine': 'Meraki', 'beanUsageCount': 1
... }
>>> print(p.predict(params))
{'shotQuality': 7.8, 'sweetness': 8.2, 'acidity': 6.5, 'bitterness': 4.3, 'body': 7.1}
>>> exit()
```

### Step 7: Test SHAP Explanations

```bash
# Inside container
docker-compose exec ml-service python explainability/shap_analysis.py saved_models/espresso_models.pkl
```

---

## Troubleshooting

### Issue: Container won't start

```bash
# Check logs
docker-compose logs ml-service

# Common issues:
# - Port 5000 already in use
# - Insufficient memory

# Solution: Stop other services or change port
docker-compose down
# Edit docker-compose.yml to use different port
# ports: - "5001:5000"  # Change 5000 to 5001
```

### Issue: Training data not found

```bash
# Check if file exists
docker-compose exec ml-service ls -la /app/training_data/

# If missing, ensure server/training_data_cleaned.json exists
ls server/training_data_cleaned.json

# Rebuild with correct volume mount
docker-compose up --force-recreate ml-service
```

### Issue: Import errors

```bash
# Check Python packages
docker-compose exec ml-service pip list

# Reinstall if needed
docker-compose exec ml-service pip install -r requirements.txt

# Or rebuild image
docker-compose build --no-cache ml-service
```

### Issue: Low memory

```bash
# Check Docker resources
docker stats

# Increase memory in Docker Desktop:
# Settings > Resources > Memory > 8GB
```

### Issue: Model predictions seem wrong

```bash
# Check model info
docker-compose exec ml-service python -c "
from models.espresso_predictor import EspressoQualityPredictor
p = EspressoQualityPredictor()
p.load_models('saved_models/espresso_models.pkl')
print(p.get_model_info())
"

# Retrain if needed
docker-compose exec ml-service python test_training.py
```

---

## Performance Testing

### Test 1: Training Speed

```bash
# Time the training
time docker-compose exec ml-service python test_training.py

# Expected: 2-5 minutes for 60 samples
```

### Test 2: Prediction Speed

```bash
# Benchmark predictions
docker-compose exec ml-service python -c "
import time
from models.espresso_predictor import EspressoQualityPredictor

p = EspressoQualityPredictor()
p.load_models('saved_models/espresso_models.pkl')

params = {
    'grindSize': 12, 'temperature': 93, 'extractionTime': 28,
    'inWeight': 18, 'outWeight': 36, 'pressure': 9,
    'roastLevel': 'medium', 'processMethod': 'washed',
    'daysPastRoast': 14, 'machine': 'Meraki'
}

# Warm-up
p.predict(params)

# Benchmark
start = time.time()
for i in range(100):
    p.predict(params)
elapsed = time.time() - start

print(f'100 predictions in {elapsed:.2f}s')
print(f'Average: {elapsed*10:.2f}ms per prediction')
"

# Expected: <10ms per prediction
```

### Test 3: Memory Usage

```bash
# Check container memory
docker stats altanian-ml-service --no-stream

# Expected: 200-500 MB
```

---

## Cleanup

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: deletes trained models)
docker-compose down -v

# Remove images
docker rmi altanian-ml-service

# Full cleanup
docker-compose down -v --rmi all
docker system prune -a
```

---

## Next Steps After Successful Testing

1. ✅ Models trained and working
2. 🚀 **Create Flask API** (`app.py`)
3. 🔗 **Integrate with Node.js** backend
4. 🌐 **Deploy to cloud** (DigitalOcean/AWS)
5. 📊 **Add monitoring** and logging
6. 🔄 **Implement auto-retraining** pipeline

---

## Verification Checklist

- [ ] Docker images built successfully
- [ ] ML service container starts and is healthy
- [ ] Training data file is accessible in container
- [ ] Model training completes without errors
- [ ] All 5 models (shotQuality, sweetness, acidity, bitterness, body) trained
- [ ] Model file saved to `saved_models/espresso_models.pkl`
- [ ] Models can be loaded successfully
- [ ] Predictions return reasonable values (1-10 range)
- [ ] Prediction speed < 10ms
- [ ] Feature importance displays correctly
- [ ] No memory leaks (stable memory usage)

---

## Support

If you encounter issues:

1. Check logs: `docker-compose logs -f ml-service`
2. Verify data: `docker-compose exec ml-service cat /app/training_data/training_data_cleaned.json | head`
3. Test Python environment: `docker-compose exec ml-service python --version`
4. Check disk space: `docker system df`

For more help, check:
- ML Service README: `ml_service/README.md`
- Main project README: `README.md`
- Docker documentation: https://docs.docker.com/
