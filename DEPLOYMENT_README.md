# Deployment Guide - Altanian Coffee Shop

**Last Updated:** November 5, 2025
**Status:** 🚀 Ready for Deployment (with known minor issues documented)

---

## Quick Start

### 1. Docker Deployment (Easiest)

```bash
# Start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services:**
- MongoDB: `localhost:27017`
- ML Service: `localhost:5000`
- Backend API: `localhost:5002`
- Frontend: Build manually or use separate hosting

### 2. Environment Setup

Create `.env` file in root:

```env
# MongoDB
ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/coffeeshop

# Authentication
JWT_SECRET=your_secure_random_string_here
SESSION_SECRET=another_secure_random_string

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# ML Service
ML_SERVICE_URL=http://ml-service:5000  # For Docker
# ML_SERVICE_URL=http://localhost:5000  # For local dev

# MongoDB (Docker)
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=secure_password_here
```

### 3. Deploy to Heroku

#### Prerequisites
```bash
heroku login
git init  # If not already a git repo
```

#### Create Heroku App
```bash
heroku create altanian-coffee-shop

# Or use existing app
heroku git:remote -a your-existing-app-name
```

#### Configure Environment
```bash
heroku config:set NODE_ENV=production
heroku config:set ATLAS_URI="your_mongodb_atlas_uri"
heroku config:set JWT_SECRET="your_jwt_secret"
heroku config:set SESSION_SECRET="your_session_secret"
heroku config:set STRIPE_SECRET_KEY="your_stripe_key"
heroku config:set STRIPE_PUBLISHABLE_KEY="your_stripe_pub_key"
```

#### Deploy
```bash
git add .
git commit -m "feat: ML improvements and deployment"
git push heroku main
```

#### Post-Deployment
```bash
# Check status
heroku ps

# View logs
heroku logs --tail

# Open app
heroku open
```

---

## What's New in This Release

### ✅ ML Model Improvements
- **13.6% better shotQuality predictions** (R² 0.44 → 0.50)
- 50+ engineered features
- Optimized hyperparameters
- Selective feature engineering

### ✅ Architecture Updates
- Python Flask ML microservice
- Docker Compose multi-service setup
- Modern ML Service client for frontend
- Improved documentation

### ✅ Documentation
- Updated CLAUDE.md with ML architecture
- Created ML_IMPROVEMENTS_SUMMARY.md
- Created API_DOCUMENTATION.md (existing)
- Created DEPLOYMENT_README.md (this file)

---

## Known Issues & Workarounds

### Issue #1: Prediction Feature Mismatch
**Status:** 🐛 Known Issue - Documented

**Problem:** ML prediction endpoint expects features in specific format

**Impact:** Direct `/predict` endpoint calls may fail

**Workaround Options:**
1. Use backend proxy endpoint `/ai/predict` (handles formatting)
2. Send pre-calculated features in request
3. Apply hotfix (see ML_IMPROVEMENTS_SUMMARY.md)

**Priority:** Medium (doesn't block deployment)

### Issue #2: Taste Profile Models
**Status:** ⚠️ Data Quality Issue

**Problem:** Low variance in taste ratings (sweetness, acidity, etc.)

**Impact:** These predictions have high error rates

**Solution:** Collect more diverse data with wider rating ranges

**Priority:** Low (shotQuality model works well)

---

## Health Checks

### Verify Services

```bash
# ML Service
curl http://localhost:5000/health
# Expected: {"status":"healthy","model_loaded":true}

# Backend API
curl http://localhost:5002/
# Expected: API response

# Model Info
curl http://localhost:5000/model-info
# Expected: Model metrics and feature list
```

### Verify Database

```bash
# Check MongoDB connection
docker-compose exec mongodb mongosh

# Or from backend
node server/testConnection.js
```

---

## Maintenance & Monitoring

### Retrain Model

```bash
# Clean training data
node server/scripts/cleanTrainingData.js

# Retrain via ML service
curl -X POST http://localhost:5000/train -H "Content-Type: application/json" -d '{}'

# Or via Docker
docker-compose exec ml-service curl -X POST http://localhost:5000/train -d '{}'
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ml-service
docker-compose logs -f backend

# Heroku
heroku logs --tail --app your-app-name
```

### Database Backup

```bash
# Export collection
mongoexport --uri="$ATLAS_URI" --collection=coffeelogs --out=backup.json

# Import collection
mongoimport --uri="$ATLAS_URI" --collection=coffeelogs --file=backup.json
```

---

## Performance Optimization

### Recommended Heroku Dynos

```bash
# Standard tier for production
heroku ps:scale web=1:standard-1x

# Or hobby tier for development
heroku ps:scale web=1:hobby
```

### Caching Strategy

The ML Service includes built-in caching:
- Feature importance: 5-minute cache
- Model metadata: Cached until retrain

### Database Indexes

Recommended MongoDB indexes:
```javascript
db.coffeelogs.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ userId: 1, status: 1 })
db.beans.createIndex({ userId: 1 })
```

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] SESSION_SECRET is strong and unique
- [ ] MongoDB has authentication enabled
- [ ] API keys are not committed to git
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place
- [ ] SSL/HTTPS is enabled (Heroku provides this)

---

## Rollback Plan

If deployment fails:

### Quick Rollback on Heroku
```bash
# Roll back to previous release
heroku releases
heroku rollback v123  # Replace with your version
```

### Docker Rollback
```bash
# Stop current version
docker-compose down

# Checkout previous version
git checkout <previous-commit>

# Restart
docker-compose up -d --build
```

---

## Support & Troubleshooting

### Common Issues

**Problem:** MongoDB connection fails
```bash
# Solution: Check ATLAS_URI and IP whitelist
# Add 0.0.0.0/0 to MongoDB Atlas IP whitelist for Heroku
```

**Problem:** ML Service unhealthy
```bash
# Solution: Check training data exists
docker-compose logs ml-service
# Ensure /training_data/training_data_cleaned.json exists
```

**Problem:** Frontend can't reach backend
```bash
# Solution: Check proxy configuration
# client/package.json should have: "proxy": "http://localhost:5002"
```

### Get Help

1. Check logs: `docker-compose logs -f`
2. Review documentation: `ML_IMPROVEMENTS_SUMMARY.md`
3. Check API docs: `http://localhost:5002/api-docs`
4. Test health endpoints
5. Verify environment variables

---

## Next Steps After Deployment

1. ✅ **Monitor Performance**
   - Check Heroku metrics
   - Monitor ML prediction latency
   - Track error rates

2. ✅ **Collect More Data**
   - Encourage users to log diverse shots
   - Target 200+ samples
   - Ensure wide taste rating ranges

3. ✅ **Fix Known Issues**
   - Apply prediction feature mismatch fix
   - Implement per-target preprocessors
   - Add better error handling

4. ✅ **Enhance UX**
   - Integrate ML Service client in frontend
   - Add real-time predictions
   - Show feature importance visualizations

5. ✅ **Scale**
   - Optimize database queries
   - Add Redis caching
   - Implement CDN for static assets

---

**Status:** 🚀 Ready for Deployment

**Deployment Checklist:**
- [x] Code improvements committed
- [x] Documentation updated
- [x] Environment variables configured
- [x] Docker setup verified
- [x] Known issues documented
- [ ] Push to Heroku
- [ ] Verify deployment
- [ ] Monitor logs
- [ ] Test end-to-end

**Good luck with your deployment! 🚀☕**
