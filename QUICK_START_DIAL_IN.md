# Quick Start Guide: Dial-In Mode

Get up and running with AI-powered espresso optimization in 15 minutes.

---

## Prerequisites

- [ ] Docker Desktop installed
- [ ] Cloudflare account (free)
- [ ] Coffee bean data in your database

---

## Step 1: Setup Cloudflare Tunnel (5 minutes)

1. **Create Tunnel**:
   - Go to https://one.dash.cloudflare.com/
   - Navigate to: **Zero Trust** → **Access** → **Tunnels**
   - Click **Create a tunnel**
   - Name it: `altanian-ai`
   - **Copy the tunnel token** (you'll need this!)

2. **Configure Public Hostname**:
   - Subdomain: `ai`
   - Domain: Your domain (or use Cloudflare's free subdomain)
   - Type: `HTTP`
   - URL: `ai-engine:8000`
   - Click **Save**

---

## Step 2: Deploy AI Engine (5 minutes)

```bash
# Navigate to ai-engine directory
cd ai-engine

# Create environment file
cp .env.example .env

# Edit .env and paste your tunnel token
# Change DB_PASSWORD to something secure
# On Windows: notepad .env
# On Mac/Linux: nano .env

# Start services
docker-compose up -d

# Check status (wait ~30 seconds)
docker-compose ps

# Should see all services "Up" and "healthy"
```

**Verify it works**:
```bash
# Local test
curl http://localhost:8000/health

# Tunnel test (replace with your domain)
curl https://ai.yourdomain.com/health
```

Both should return: `{"status": "healthy", "database": "connected", ...}`

---

## Step 3: Configure Backend (2 minutes)

### For Heroku:
```bash
heroku config:set AI_OPTIMIZER_URL=https://ai.yourdomain.com
heroku restart
```

### For Local Development:
```bash
# Edit .env in project root
# Add this line:
AI_OPTIMIZER_URL=https://ai.yourdomain.com

# Restart your backend
cd server
npm start
```

---

## Step 4: Add to Frontend (3 minutes)

### Option A: Quick Test (No Integration)

Test directly via API:

```bash
# Get your auth token from browser localStorage
# Then test dial-in:

curl -X POST http://localhost:5002/api/dial-in/start \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{"beanId": "YOUR_BEAN_ID", "method": "espresso"}'
```

### Option B: Full Integration

1. **Add Route** (in your main App.js or Router):

```javascript
import DialInMode from './components/DialInMode';

// Add route
<Route
  path="/dial-in"
  element={<DialInMode beans={beans} token={token} user={user} />}
/>
```

2. **Add Navigation Link**:

```jsx
<nav>
  {/* Your existing links */}
  <Link to="/dial-in">🎯 Dial-In Mode</Link>
</nav>
```

3. **Start Development Server**:

```bash
cd client
npm start
```

4. **Test**:
   - Navigate to http://localhost:3000/dial-in
   - Select a coffee bean
   - Click "Start Dial-In Session"
   - You should see AI recommendations!

---

## Step 5: First Optimization Session (Optional)

Try it out:

1. **Start Session**: Select a bean → Click "Start Dial-In Session"
2. **Get Recommendations**: Note the parameters (Grind, Dose, Time)
3. **Make Your Shot**: Use the recommended parameters
4. **Provide Feedback**:
   - Enter actual extraction time
   - Rate taste (0-10)
   - Submit
5. **Repeat**: Try new recommendations until you hit 8.5+ score

---

## Troubleshooting

### "Connection refused" or "Service unavailable"

**Check AI Engine**:
```bash
cd ai-engine
docker-compose ps
docker-compose logs -f ai-engine
```

**Check Tunnel**:
```bash
docker-compose logs -f tunnel
```

**Restart Everything**:
```bash
docker-compose restart
```

### "Database connection failed"

**Check Database**:
```bash
docker-compose logs db
```

**Verify Password**:
- Ensure DB_PASSWORD in `.env` is correct
- Rebuild: `docker-compose down && docker-compose up -d`

### "Bean not found"

Make sure you have coffee beans in your database:
```bash
# Check via your backend
curl http://localhost:5002/beans \
  -H "x-auth-token: YOUR_TOKEN"
```

---

## Common Commands

```bash
# View all logs
cd ai-engine
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose stop

# Start services
docker-compose start

# Check service status
docker-compose ps

# View just AI Engine logs
docker-compose logs -f ai-engine
```

---

## Success Criteria

You're ready when:

- ✅ `curl http://localhost:8000/health` returns healthy
- ✅ `curl https://ai.yourdomain.com/health` returns healthy
- ✅ Backend `/api/dial-in/status` returns isHealthy: true
- ✅ Frontend Dial-In Mode displays recommendations

---

## Next Steps

1. **Read Full Docs**: `AI_OPTIMIZER_DEPLOYMENT_GUIDE.md`
2. **Try Optimization**: Make 5-10 shots to see convergence
3. **Monitor**: Check Cloudflare Tunnel analytics
4. **Backup**: Set up automated database backups

---

## Quick Reference URLs

- **Cloudflare Dashboard**: https://one.dash.cloudflare.com/
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/
- **Optuna Docs**: https://optuna.readthedocs.io/
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

## Need Help?

1. Check logs: `docker-compose logs -f`
2. Review: `AI_OPTIMIZER_DEPLOYMENT_GUIDE.md`
3. Test endpoints with curl
4. Verify environment variables

**Still stuck?** Check the troubleshooting section in `AI_OPTIMIZER_DEPLOYMENT_GUIDE.md`.

---

**Congratulations!** You're now ready to optimize your espresso shots with AI! ☕🎯
