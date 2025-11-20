# Altanian Coffee - AI Optimization Engine

Bayesian optimization engine for espresso parameter tuning using Optuna. This service runs on your powerful PC and provides intelligent recommendations for dialing in espresso shots.

## Architecture

```
User (Mobile/Web) → Heroku Backend → Cloudflare Tunnel → Your PC (AI Engine + PostgreSQL)
```

## Features

- **Bayesian Optimization**: Uses Optuna's TPE (Tree-structured Parzen Estimator) sampler to intelligently explore the parameter space
- **Personalized Learning**: Creates separate optimization studies for each bean/user/method combination
- **Persistent History**: Stores all trials in PostgreSQL for continuous learning
- **Secure Access**: Exposes service via Cloudflare Tunnel without opening ports
- **Fast Convergence**: Finds optimal parameters with minimal wasted shots

## Prerequisites

- Docker and Docker Compose installed
- Cloudflare account (free tier works)
- At least 2GB RAM and 10GB disk space

## Setup Instructions

### 1. Clone and Navigate

```bash
cd ai-engine
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials (or keep defaults for local development)
- Cloudflare Tunnel token (see step 3)

### 3. Set Up Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access** → **Tunnels**
3. Click **Create a tunnel**
4. Name it (e.g., "altanian-ai-optimizer")
5. Copy the tunnel token
6. Configure the tunnel:
   - **Public hostname**: `ai.yourdomain.com` (or subdomain)
   - **Service**: `http://ai-engine:8000`
7. Paste the tunnel token into your `.env` file

### 4. Launch Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- AI Engine (port 8000)
- Cloudflare Tunnel (connects to Cloudflare)

### 5. Verify Health

```bash
# Check logs
docker-compose logs -f ai-engine

# Test locally
curl http://localhost:8000/health

# Test via tunnel (replace with your domain)
curl https://ai.yourdomain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-20T12:00:00.000000"
}
```

### 6. Update Backend Configuration

In your main MERN app (on Heroku), set the environment variable:

```bash
heroku config:set AI_OPTIMIZER_URL=https://ai.yourdomain.com
```

## API Endpoints

### Health Check
```
GET /health
```

### Get Next Recommendation
```
POST /optimize/next-shot
Content-Type: application/json

{
  "bean_id": "5f8d0d55b54764421b7156c3",
  "user_id": "user123",  // optional
  "method": "espresso",
  "grind": 12.5,         // optional: previous parameters
  "dose": 18.0,          // optional
  "time": 28.0,          // optional
  "taste_score": 7.5     // optional: score for previous shot (0-10)
}
```

Response:
```json
{
  "study_name": "user_user123_bean_5f8d0d55b54764421b7156c3_espresso",
  "trial_number": 5,
  "recommendation": {
    "grind": 11.5,
    "dose": 18.2,
    "target_time": 30.0
  },
  "best_so_far": {
    "trial_number": 3,
    "parameters": { "grind": 12.0, "dose": 18.0, "time": 28.0 },
    "score": 8.5
  },
  "total_trials": 5,
  "message": "Trial #5: Adjust your machine to these settings and report back!"
}
```

### Report Trial Result
```
POST /optimize/report
Content-Type: application/json

{
  "bean_id": "5f8d0d55b54764421b7156c3",
  "user_id": "user123",
  "method": "espresso",
  "trial_number": 5,
  "taste_score": 8.0
}
```

### Get Optimization Status
```
GET /optimize/status/{bean_id}?user_id=user123&method=espresso
```

### Get Best Parameters
```
GET /optimize/best/{bean_id}?user_id=user123&method=espresso
```

## How It Works

### The Optimization Loop

1. **First Request**: User starts dial-in process
   - AI generates initial parameters (often middle of range)
   - Returns trial #0

2. **User Makes Coffee**: Uses recommended parameters
   - Records actual extraction time
   - Tastes and scores (0-10 scale)

3. **Report Results**: User submits score
   - AI learns from this data point
   - Updates internal model

4. **Next Recommendation**: AI suggests improved parameters
   - Uses Bayesian optimization to balance exploration/exploitation
   - Focuses on promising regions of parameter space

5. **Convergence**: After 5-10 trials
   - AI identifies optimal parameters for that bean
   - Recommendations stabilize around best settings

### Parameter Ranges

- **Grind Size**: 1.0 - 25.0 (0.5 steps)
- **Dose**: 14.0 - 22.0 grams (0.1g steps)
- **Extraction Time**: 20.0 - 40.0 seconds (1s steps)

These can be adjusted in `main.py` if needed.

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Tunnel Not Connecting

1. Verify `TUNNEL_TOKEN` in `.env` is correct
2. Check tunnel logs: `docker-compose logs tunnel`
3. Ensure tunnel is configured in Cloudflare Dashboard
4. Try regenerating the tunnel token

### AI Engine Not Responding

```bash
# Check if service is healthy
docker-compose ps ai-engine

# View logs
docker-compose logs -f ai-engine

# Restart service
docker-compose restart ai-engine
```

### "Study not found" Errors

This is normal for first-time use. Studies are created automatically on first request for each bean/user/method combination.

## Development

### Run Locally Without Docker

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DB_HOST=localhost
export DB_USER=user
export DB_PASSWORD=password
export DB_NAME=optuna_db

# Run PostgreSQL separately
docker run -d -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=optuna_db postgres:15-alpine

# Start FastAPI
python main.py
```

### Testing

```bash
# Test optimization flow
curl -X POST http://localhost:8000/optimize/next-shot \
  -H "Content-Type: application/json" \
  -d '{
    "bean_id": "test_bean_001",
    "method": "espresso"
  }'

# Report result
curl -X POST http://localhost:8000/optimize/next-shot \
  -H "Content-Type: application/json" \
  -d '{
    "bean_id": "test_bean_001",
    "method": "espresso",
    "grind": 12.5,
    "dose": 18.0,
    "time": 28.0,
    "taste_score": 7.5
  }'
```

## Production Considerations

1. **Security**:
   - Change default database credentials
   - Use Cloudflare Access policies to restrict tunnel access
   - Consider API key authentication

2. **Performance**:
   - PostgreSQL can handle thousands of studies
   - Each API call takes <100ms typically
   - Scale horizontally by running multiple instances (use external PostgreSQL)

3. **Backup**:
   ```bash
   # Backup database
   docker exec altanian-optuna-db pg_dump -U user optuna_db > backup.sql

   # Restore
   cat backup.sql | docker exec -i altanian-optuna-db psql -U user optuna_db
   ```

4. **Monitoring**:
   - Monitor `/health` endpoint
   - Set up alerts for database connection failures
   - Track optimization convergence rates

## Why Optuna + PostgreSQL?

- **Optuna**: State-of-the-art Bayesian optimization library
  - Automatic hyperparameter tuning
  - Pruning of unpromising trials
  - Multiple sampling strategies (TPE, CMA-ES, etc.)

- **PostgreSQL**: Reliable, ACID-compliant storage
  - Concurrent study access
  - Query historical data easily
  - Production-ready performance

## License

Copyright © 2025 Altanian Coffee Shop
