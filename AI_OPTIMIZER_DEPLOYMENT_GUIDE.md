# AI Optimizer Deployment Guide

Complete guide to deploying the Optuna-based AI Optimization Engine on your PC with secure cloud access via Cloudflare Tunnel.

## Overview

### Architecture

```
┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  User Device │ ◄─────► │ Heroku Backend   │ ◄─────► │ Cloudflare Edge │
│ (Mobile/Web) │         │ (Node.js/MERN)   │         │                 │
└──────────────┘         └──────────────────┘         └────────┬────────┘
                                                               │
                                                               │ Secure Tunnel
                                                               │
                                                       ┌───────▼────────┐
                                                       │  Your Home PC  │
                                                       │                │
                                                       │  ┌──────────┐  │
                                                       │  │AI Engine │  │
                                                       │  │(FastAPI) │  │
                                                       │  └────┬─────┘  │
                                                       │       │        │
                                                       │  ┌────▼─────┐  │
                                                       │  │PostgreSQL│  │
                                                       │  │ (Optuna) │  │
                                                       │  └──────────┘  │
                                                       └────────────────┘
```

### Why This Architecture?

1. **Powerful Hardware**: Runs optimization on your powerful PC, not limited by cloud hosting costs
2. **Personalized**: Each user gets tailored recommendations based on their equipment
3. **Cost-Effective**: No expensive cloud GPU/CPU costs for optimization
4. **Secure**: Cloudflare Tunnel provides secure access without opening ports
5. **Fast**: Low latency for real-time recommendations

---

## Part 1: Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **RAM**: At least 2GB available
- **Disk Space**: 10GB free space
- **Docker**: Docker Desktop installed and running
- **Internet**: Stable broadband connection

### Accounts Needed

1. **Cloudflare Account** (Free Tier):
   - Sign up at https://dash.cloudflare.com/sign-up
   - No credit card required for free tier

2. **Domain Name** (Optional but Recommended):
   - You can use a free subdomain from Cloudflare
   - Or use your own domain registered with Cloudflare

---

## Part 2: Install Docker

### Windows

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Run installer and follow prompts
3. Restart your computer
4. Open Docker Desktop and ensure it's running

### macOS

```bash
# Using Homebrew
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop/
```

### Linux (Ubuntu/Debian)

```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
docker-compose --version
```

---

## Part 3: Setup Cloudflare Tunnel

### Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Verify your email
3. Log in to dashboard

### Step 2: Access Zero Trust Dashboard

1. In Cloudflare Dashboard, click on **Zero Trust** in the left sidebar
2. If prompted, complete Zero Trust onboarding (free tier)
3. Go to **Access** → **Tunnels**

### Step 3: Create a New Tunnel

1. Click **Create a tunnel**
2. Choose **Cloudflared** as tunnel type
3. Name your tunnel (e.g., `altanian-ai-optimizer`)
4. Click **Save tunnel**

### Step 4: Install Connector (We'll Do This via Docker)

**IMPORTANT**: Don't install the connector manually. We'll run it in Docker.

1. On the tunnel page, copy the **Tunnel Token**
   - It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Save this token** - you'll need it for the `.env` file

2. Click **Next**

### Step 5: Configure Public Hostname

1. In the **Public Hostname** tab, add a route:
   - **Subdomain**: `ai` (or your choice)
   - **Domain**: Choose your domain or use Cloudflare's free subdomain
   - **Type**: `HTTP`
   - **URL**: `ai-engine:8000`

   Example final URL: `https://ai.yourdomain.com`

2. Click **Save tunnel**

### Step 6: Verify Tunnel Configuration

Your tunnel configuration should look like:

```
Public Hostname: https://ai.yourdomain.com
Service: http://ai-engine:8000
Status: Inactive (will become active when we start Docker)
```

---

## Part 4: Setup AI Optimizer on Your PC

### Step 1: Navigate to Project Directory

```bash
cd C:\Dev\altanian-coffee-shop\ai-engine
# or on macOS/Linux: cd ~/altanian-coffee-shop/ai-engine
```

### Step 2: Create Environment File

```bash
# Copy example to .env
cp .env.example .env

# On Windows (PowerShell):
# copy .env.example .env
```

### Step 3: Edit .env File

Open `.env` in your text editor and configure:

```env
# Database Configuration (keep defaults for local)
DB_HOST=db
DB_PORT=5432
DB_USER=user
DB_PASSWORD=change_this_to_secure_password
DB_NAME=optuna_db

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Cloudflare Tunnel Token (PASTE YOUR TOKEN HERE)
TUNNEL_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_TOKEN_HERE
```

**Security Note**: Change `DB_PASSWORD` to a strong password.

### Step 4: Launch Services

```bash
# Start all services (AI Engine + PostgreSQL + Cloudflare Tunnel)
docker-compose up -d

# View logs to ensure everything started correctly
docker-compose logs -f
```

### Expected Output

You should see:
```
✅ PostgreSQL: Database system is ready to accept connections
✅ AI Engine: Altanian Coffee Dial-In Optimizer Starting...
✅ AI Engine: Database connection successful!
✅ Tunnel: Registered tunnel connection
```

Press `Ctrl+C` to exit logs (containers keep running).

### Step 5: Verify Local Access

Test the AI Engine locally:

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-01-20T12:00:00.000000"
# }
```

### Step 6: Verify Tunnel Access

Test via your Cloudflare Tunnel domain:

```bash
# Replace with your actual domain
curl https://ai.yourdomain.com/health

# Expected: Same response as above
```

If this works, your AI Optimizer is successfully deployed! 🎉

---

## Part 5: Connect Your MERN Backend

### For Heroku Deployment

```bash
# Set environment variable on Heroku
heroku config:set AI_OPTIMIZER_URL=https://ai.yourdomain.com

# Verify it was set
heroku config:get AI_OPTIMIZER_URL

# Restart your app
heroku restart
```

### For Local Development

Edit your main project `.env` file:

```env
AI_OPTIMIZER_URL=https://ai.yourdomain.com
```

Then restart your backend:

```bash
cd ../server
npm start
```

---

## Part 6: Test End-to-End

### 1. Check Backend Connection

```bash
# From your backend, test the optimizer connection
curl http://localhost:5002/api/dial-in/status

# Expected response:
# {
#   "success": true,
#   "data": {
#     "baseURL": "https://ai.yourdomain.com",
#     "isHealthy": true,
#     "available": true
#   }
# }
```

### 2. Test Optimization Flow

Start a dial-in session via API:

```bash
curl -X POST http://localhost:5002/api/dial-in/start \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_JWT_TOKEN" \
  -d '{
    "beanId": "YOUR_BEAN_ID",
    "method": "espresso"
  }'
```

### 3. Test from Frontend

1. Log in to your app
2. Navigate to Dial-In Mode
3. Select a coffee bean
4. Click "Start Dial-In Session"
5. Verify you receive AI recommendations

---

## Part 7: Monitoring & Maintenance

### View Logs

```bash
cd ai-engine

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f ai-engine
docker-compose logs -f db
docker-compose logs -f tunnel
```

### Check Service Status

```bash
# Check if services are running
docker-compose ps

# Expected output:
# NAME                          STATUS
# altanian-ai-engine           Up 2 hours (healthy)
# altanian-optuna-db           Up 2 hours (healthy)
# altanian-cf-tunnel           Up 2 hours
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart ai-engine
```

### Stop Services

```bash
# Stop all services (containers remain)
docker-compose stop

# Stop and remove containers (data persists in volumes)
docker-compose down

# Stop, remove containers AND delete all data
docker-compose down -v  # ⚠️ WARNING: This deletes all optimization history!
```

### Backup Optimization Data

```bash
# Backup PostgreSQL database
docker exec altanian-optuna-db pg_dump -U user optuna_db > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20250120.sql | docker exec -i altanian-optuna-db psql -U user optuna_db
```

### Update Services

```bash
# Pull latest code from Git
git pull origin main

# Rebuild containers (if code changed)
cd ai-engine
docker-compose build --no-cache

# Restart with new images
docker-compose up -d
```

---

## Part 8: Troubleshooting

### Problem: Tunnel Not Connecting

**Symptoms:**
- Tunnel status shows "Inactive" in Cloudflare Dashboard
- `docker-compose logs tunnel` shows connection errors

**Solutions:**

1. **Verify Tunnel Token**:
   ```bash
   # Check if token is set in .env
   cat .env | grep TUNNEL_TOKEN
   ```

2. **Regenerate Tunnel Token**:
   - Go to Cloudflare Dashboard → Zero Trust → Tunnels
   - Click on your tunnel → Configure
   - Regenerate token
   - Update `.env` with new token
   - Restart: `docker-compose restart tunnel`

3. **Check Firewall**:
   - Ensure your PC can make outbound connections to Cloudflare
   - Try: `curl https://www.cloudflare.com`

### Problem: Database Connection Failed

**Symptoms:**
- AI Engine logs show "Database connection failed"
- Health check returns `"database": "disconnected"`

**Solutions:**

1. **Check PostgreSQL Status**:
   ```bash
   docker-compose ps db
   docker-compose logs db
   ```

2. **Verify Database Credentials**:
   - Ensure `DB_PASSWORD` in `.env` matches for all services
   - Rebuild: `docker-compose down && docker-compose up -d`

3. **Reset Database** (⚠️ Deletes all data):
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Problem: "Optimizer Service Unavailable" in Frontend

**Symptoms:**
- Dial-In Mode shows "AI Optimizer is offline"
- Backend can't reach optimizer

**Solutions:**

1. **Verify Backend Environment Variable**:
   ```bash
   # For Heroku
   heroku config:get AI_OPTIMIZER_URL

   # For local
   cat .env | grep AI_OPTIMIZER_URL
   ```

2. **Test Tunnel Connectivity**:
   ```bash
   curl https://ai.yourdomain.com/health
   ```

3. **Check Backend Logs**:
   ```bash
   # Look for [AI Optimizer] connection errors
   heroku logs --tail  # For Heroku
   npm start          # For local (check console)
   ```

4. **Restart Backend**:
   ```bash
   heroku restart  # For Heroku
   # or restart local server
   ```

### Problem: Slow Recommendations

**Symptoms:**
- Recommendations take >5 seconds
- Timeout errors

**Solutions:**

1. **Check PC Performance**:
   - Close unnecessary applications
   - Ensure Docker has enough resources (Docker Desktop → Settings → Resources)

2. **Optimize Database**:
   ```bash
   docker exec altanian-optuna-db psql -U user optuna_db -c "VACUUM ANALYZE;"
   ```

3. **Increase Timeout** (in `server/services/aiOptimizerClient.js`):
   ```javascript
   this.timeout = 30000; // Increase from 15000 to 30000
   ```

---

## Part 9: Production Best Practices

### Security

1. **Change Default Passwords**:
   - Update `DB_PASSWORD` in `.env`
   - Use strong, random passwords

2. **Restrict Tunnel Access** (Optional):
   - In Cloudflare Dashboard → Zero Trust → Access
   - Create Access Policy to restrict who can access your tunnel
   - Example: Only allow requests from your backend's IP

3. **Enable HTTPS Only**:
   - Cloudflare Tunnel automatically uses HTTPS
   - Verify your backend uses `https://` in `AI_OPTIMIZER_URL`

### Performance

1. **Allocate More Resources to Docker**:
   - Docker Desktop → Settings → Resources
   - Increase CPU and Memory allocation

2. **Keep Services Running**:
   - Configure Docker to start on boot
   - Docker Desktop → Settings → General → "Start Docker Desktop when you log in"

3. **Monitor Disk Usage**:
   ```bash
   # Check database size
   docker exec altanian-optuna-db psql -U user optuna_db -c "SELECT pg_size_pretty(pg_database_size('optuna_db'));"
   ```

### Backup Strategy

1. **Automated Daily Backups**:
   ```bash
   # Create a cron job (Linux/macOS) or Task Scheduler (Windows)
   # to run this daily:
   docker exec altanian-optuna-db pg_dump -U user optuna_db > ~/backups/optuna_$(date +%Y%m%d).sql
   ```

2. **Keep Backups for 30 Days**:
   ```bash
   # Delete backups older than 30 days
   find ~/backups -name "optuna_*.sql" -mtime +30 -delete
   ```

---

## Part 10: Next Steps

### Integrate with Frontend

1. **Add Dial-In Mode to Navigation**:
   ```javascript
   // In your main App.js or Router component
   import DialInMode from './components/DialInMode';

   // Add route
   <Route path="/dial-in" element={<DialInMode beans={beans} token={token} user={user} />} />
   ```

2. **Add Navigation Link**:
   ```jsx
   <nav>
     <Link to="/dial-in">🎯 Dial-In Mode</Link>
   </nav>
   ```

### Monitor Usage

Check Cloudflare Analytics:
1. Go to Cloudflare Dashboard → Zero Trust → Access → Tunnels
2. Click on your tunnel
3. View **Analytics** tab for:
   - Request count
   - Response times
   - Error rates

### Scaling

If you need to handle more users:

1. **Use External PostgreSQL**:
   - Deploy PostgreSQL to a cloud service (DigitalOcean, AWS RDS)
   - Update `DB_HOST` in `.env`
   - Run multiple AI Engine instances on different PCs

2. **Load Balancing**:
   - Set up multiple tunnels on different PCs
   - Use Cloudflare Load Balancing (paid feature)

---

## Support

### Documentation

- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Optuna Documentation**: https://optuna.readthedocs.io/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

### Common Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# View logs
docker-compose logs -f

# Restart service
docker-compose restart ai-engine

# Check status
docker-compose ps

# Backup database
docker exec altanian-optuna-db pg_dump -U user optuna_db > backup.sql

# Restore database
cat backup.sql | docker exec -i altanian-optuna-db psql -U user optuna_db

# Update and restart
git pull && docker-compose build --no-cache && docker-compose up -d
```

---

## Congratulations! 🎉

Your AI Optimization Engine is now deployed and ready to help dial in perfect espresso shots!

**What You've Accomplished:**
✅ Deployed Optuna-based Bayesian optimization engine
✅ Secured it with Cloudflare Tunnel
✅ Connected it to your MERN backend
✅ Made it accessible from anywhere in the world

**Next:** Start using Dial-In Mode in your app to optimize your espresso parameters!
