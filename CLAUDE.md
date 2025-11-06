# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altanian Coffee Shop is a full-stack coffee shop management system built with React (frontend) and Node.js/Express (backend), with MongoDB for data persistence and Stripe for payments. The application features user authentication, online ordering, AI-powered coffee analysis, loyalty programs, webhooks, and comprehensive API key management.

## Development Commands

### Running the Application

```bash
# Start both frontend and backend in development mode
npm run dev:full

# Start backend only (from root)
npm run dev

# Start backend (from server directory)
cd server && npm run dev

# Start frontend (from client directory)
cd client && npm start
```

### Server Ports
- Backend API: `http://localhost:5002`
- Frontend: `http://localhost:3001`
- API Documentation: `http://localhost:5002/api-docs` (Swagger UI)

### Docker Deployment

```bash
# Start all services (MongoDB + ML Service + Backend) using Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

**Docker Services:**
- `mongodb`: MongoDB 7.0 on port 27017
- `ml-service`: Python Flask ML API on port 5000
- `backend`: Node.js Express API on port 5002

### Testing
The project currently does not have a test suite configured (`npm test` will show an error).

## Architecture

### Monorepo Structure
- **Root**: Contains workspace configuration and shared dependencies
- **`/server`**: Backend Express API (port 5002)
- **`/client`**: React frontend (port 3001, proxies to backend)
- **`/ml_service`**: Python Flask ML service (port 5000) for AI predictions

### Backend Architecture (`/server`)

#### Core Entry Point
- `server.js`: Main server file that:
  - Configures Express app with CORS
  - Initializes MongoDB connection
  - Starts Socket.IO server for real-time features
  - Initializes Centralized AI Service after DB connection
  - Mounts all route handlers

#### Routes (`/server/routes`)
All routes are mounted in `server.js`. Key route files:
- `users.js`: User registration, login, profile
- `products.js`: Product catalog management
- `orders.js`: Order creation and management
- `coffeeLogs.js`: Coffee brewing logs and tracking
- `ai-new.js`: **NEW** - Proxies to Python ML service for AI predictions
- `aiModels.js`: AI model management (legacy database models)
- `loyalty.js`: Loyalty program
- `apiKeys.js`: API key management (owner only)
- `webhooks.js`: Webhook configuration and management
- `apiDocs.js`: Swagger API documentation
- `legacy/ai.js`: **DEPRECATED** - Old Node.js-based AI service (archived)

#### Models (`/server/models`)
Mongoose models for MongoDB collections:
- `user.model.js`: User accounts with roles
- `order.model.js`: Customer orders
- `product.model.js`: Menu items
- `coffeeLog.model.js`: Coffee brewing logs
- `bean.model.js`: Coffee bean inventory
- `aiModel.model.js`: AI model metadata
- `webhook.model.js`: Webhook configurations
- `apiKeyLog.model.js`: API usage tracking
- `loyalty.model.js`: Loyalty points and rewards
- `promoCode.model.js`: Promotional codes

#### Middleware (`/server/middleware`)
- `auth.js`: JWT authentication middleware
- `apiKeyAuth.js`: API key authentication with scope validation
- `dualAuth.js`: Supports both JWT and API key authentication (JWT takes precedence)
- `optionalAuth.js`: Optional authentication for public/authenticated hybrid endpoints
- `ownerAuth.js`: Owner-only access control
- `rateLimit.js`: Token bucket rate limiting with tiered limits

#### Services (`/server/services`)
Business logic layer:
- `mlServiceClient.js`: **NEW** - Client for communicating with Python ML service at `http://ml-service:5000` (Docker) or `http://localhost:5000` (local)
- `webhookService.js`: Webhook delivery with retry logic and signature verification
- `apiKeyService.js`: API key CRUD operations
- `apiKeyScopeService.js`: Scope-based permission validation
- `rateLimitService.js`: Rate limiting enforcement
- `loyaltyService.js`: Loyalty points calculation
- `orderService.js`: Order processing logic
- `pushService.js`: Web push notifications
- `emailService.js`: Email notifications
- `legacy/centralizedAIService.js`: **DEPRECATED** - Old Node.js AI service (archived)
- `legacy/trainedModelService.js`: **DEPRECATED** - Old model loading service (archived)
- `legacy/realMLService.js`: **DEPRECATED** - Old ML service (archived)

#### WebSocket (`/server/websocket`)
- `orderTracking.js`: Real-time order status updates via Socket.IO

#### Utility Scripts (`/server/scripts`)
- `cleanTrainingData.js`: Clean and validate coffee log training data for ML service

### ML Service Architecture (`/ml_service`)

**Python Flask API (port 5000)** for machine learning predictions and training.

#### Entry Point
- `app.py`: Flask server with CORS enabled, initializes ML models on startup

#### Core Modules
- `models/espresso_predictor.py`: Random Forest models for predicting taste, body, acidity
- `explainability/shap_analysis.py`: SHAP-based feature importance and explanations
- `recommendations/parameter_optimizer.py`: Clustering-based parameter recommendations
- `training/`: Model training pipeline
- `config.py`: Configuration (model paths, Flask settings)

#### API Endpoints
- `GET /health`: Health check
- `POST /predict`: Predict coffee quality from parameters
- `POST /explain`: Get SHAP explanation for prediction
- `GET /feature-importance/<target>`: Get feature importance for taste/body/acidity
- `POST /recommend`: Get parameter recommendations based on clustering
- `GET /model-info`: Model metadata and statistics
- `POST /train`: Trigger model retraining with new data

#### Communication Pattern
Node.js backend → `mlServiceClient.js` → HTTP requests → Flask ML service

### Frontend Architecture (`/client/src`)

#### Entry Points
- `index.js`: React app entry point
- `App.js`: Root component with routing

#### Pages (`/client/src/pages`)
Top-level route components:
- `HomePage.js`: Landing page
- `LoginPage.js`: User authentication
- `OrderPage.js`: Product browsing and ordering
- `CheckoutPage.js`: Order checkout with Stripe
- `CoffeeLogPage.js`: Coffee brewing logs
- `AdminPage.js`: Admin dashboard
- `AccountManager.js`: User account management

#### Components (`/client/src/components`)
Reusable UI components organized by feature:
- **Admin**: `ProductManager.js`, `InventoryManager.js`, `PromoCodeManager.js`, `DynamicPricingAdmin.js`
- **AI Features**: `AICoach.js`, `AIInsights.js`, `AIModelManagement.js`, `AITrainingDashboard.js`, `AIPerformanceMonitor.js`
- **Ordering**: `Products.js`, `Cart.js`, `Checkout.js`, `CheckoutForm.js`, `OrderHistory.js`, `OrderTracking.js`
- **Coffee Logging**: `AddCoffeeLogForm.js`, `CoffeeLogHistory.js`, `AddBeanForm.js`
- **Loyalty**: `LoyaltyDashboard.js`, `RewardRedemption.js`
- **Social**: `CoffeeArtGallery.js`, `SocialFeatures.js`
- **Other**: `HealthInsights.js`, `NotificationCenter.js`, `SmartRecommendations.js`, `WeatherBackground.js`

## Authentication System

The API supports **dual authentication**:

### 1. JWT Token Authentication
- Header: `x-auth-token`
- Used by web/mobile apps
- Role-based access (user, admin, owner)
- Set in `req.user` by `auth.js` middleware

### 2. API Key Authentication
- Header: `x-api-key`
- Used for external integrations
- Scope-based permissions (read, write, orders:read, orders:write, products:manage, admin, full)
- IP whitelisting support
- Rate limiting based on tier (basic, standard, premium, unlimited)
- Set in `req.user` by `apiKeyAuth.js` middleware

### Dual Auth Flow (`dualAuth.js`)
1. Check for JWT token first
2. If JWT valid, use JWT authentication
3. If JWT missing/invalid, try API key
4. If both fail, return 401

## AI System

### ML Service Architecture (Current)
The application now uses a **Python Flask ML service** (`/ml_service`) for all AI/ML operations:

**Key Points:**
- Separate microservice running on port 5000
- Random Forest models for predicting taste, body, and acidity
- SHAP-based explainability for feature importance
- Clustering-based parameter recommendations
- Models persisted in `/ml_service/saved_models/espresso_models.pkl`
- Communicates with Node.js backend via `mlServiceClient.js`

**Training Data Flow:**
1. Users create coffee logs via frontend → stored in MongoDB `coffeelogs` collection
2. Backend exports training data: `server/training_data_cleaned.json`
3. ML service loads training data from mounted volume (Docker) or local file
4. POST `/train` endpoint triggers model retraining
5. Updated models saved to persistent volume

**Prediction Flow:**
1. Frontend sends parameters to Node.js backend `/ai/predict`
2. Backend proxies request to ML service via `mlServiceClient.js`
3. ML service returns predictions (taste, body, acidity scores + explanations)
4. Backend returns response to frontend

### Legacy AI System (Deprecated)
Old Node.js-based AI services have been moved to `/server/services/legacy/` and `/server/routes/legacy/`:
- `centralizedAIService.js`: Node.js AI service with scikit-learn model loading
- `trainedModelService.js`: Handled pickled model file operations
- `realMLService.js`: Previous ML service implementation
- Routes in `legacy/ai.js`

**Do not use legacy services for new development.** They are archived for reference only.

## API Documentation

### Interactive Docs
Swagger UI is available at `/api-docs` (configured in `server/routes/apiDocs.js`)

### Documentation Files
- `API_DOCUMENTATION.md`: Complete API reference with all endpoints, authentication, rate limiting, scopes, webhooks
- `openapi.yaml`: OpenAPI 3.0 specification
- `OWNER_API_GUIDE.md`: Owner-specific API operations

### Key API Features
- Dual authentication (JWT + API key)
- Scope-based permissions
- IP whitelisting
- Token bucket rate limiting
- Webhook system with retry logic
- API usage analytics

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=5002
NODE_ENV=development

# MongoDB
ATLAS_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# ML Service (for Docker setup)
ML_SERVICE_URL=http://ml-service:5000  # Use http://localhost:5000 for local dev
FLASK_ENV=production
FLASK_DEBUG=False
MIN_TRAINING_SAMPLES=30

# MongoDB (for Docker)
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=password
```

## Database

### MongoDB Connection
- Uses MongoDB Atlas (cloud) or local fallback
- Connection string: `process.env.ATLAS_URI`
- Fallback: `mongodb://localhost:27017/altaniancoffee`
- Connected in `server.js:55-76` with error handling

### Key Collections
- `users`: User accounts and authentication
- `products`: Menu items
- `orders`: Customer orders
- `coffeelogs`: Coffee brewing logs (used for AI training)
- `beans`: Coffee bean inventory
- `aimodels`: AI model metadata and configurations
- `webhooks`: Webhook configurations
- `apikeylogs`: API usage tracking

## Socket.IO Real-Time Features

Socket.IO server configured in `server.js:12-29`:
- Order tracking updates (`/server/websocket/orderTracking.js`)
- CORS configured for development (allows all origins)
- Transports: polling and websocket
- Custom timeouts and connection settings

## Important Patterns

### ML Service Usage
The new Python ML service is accessed via HTTP requests through `mlServiceClient.js`:
```javascript
// In routes or services
const mlServiceClient = require('../services/mlServiceClient');

// Make predictions
const prediction = await mlServiceClient.predict({
  dose: 18,
  yield: 36,
  time: 28,
  temperature: 93,
  pressure: 9,
  grind: 5
});

// Get recommendations
const recommendations = await mlServiceClient.recommend(userParameters);

// Trigger training
await mlServiceClient.train(trainingData);
```

**Important:** ML service must be running on port 5000. Use `docker-compose up ml-service` or run Flask app directly.

### Authentication in Routes
Most routes use `dualAuth` middleware to support both JWT and API key auth:
```javascript
router.get('/endpoint', dualAuth, async (req, res) => {
  // req.user is set by dualAuth
  const userId = req.user.id;
});
```

### Scope Validation
API key scopes are validated in `apiKeyScopeService.js`. Check scope before restricted operations.

### Webhook Triggering
Use `webhookService.triggerWebhooks(event, data)` to trigger webhooks for events like:
- `order.created`
- `order.updated`
- `order.completed`
- `order.cancelled`
- `user.created`
- `product.created`
- `product.updated`
- `inventory.low`

## Deployment

### Heroku Setup
Configured for Heroku deployment:
- `heroku-postbuild` script installs all dependencies and builds client
- Node version: 18.x (specified in root `package.json`)
- Environment variables must be set via `heroku config:set`

### Build Process
```bash
# Root package.json heroku-postbuild:
cd server && npm install && cd ../client && npm install && npm run build && cd ../server && npm install
```

## Coffee Logging System

The coffee logging feature tracks espresso shot quality:
- Users log shots with parameters (dose, yield, time, temperature, pressure, grind)
- Logs include subjective ratings (taste, body, acidity, flavor notes)
- AI analyzes logs to provide recommendations
- Training data stored in `coffeelogs` collection
- Bean information tracked separately in `beans` collection

## Utility Scripts

### Server Scripts (`/server`)
- `createTestUser.js`: Create test user accounts for testing
- `fresh_export.js`: Export fresh coffee logs from MongoDB

### Data Scripts (`/server/scripts`)
- `cleanTrainingData.js`: Clean and validate training data, export to JSON/CSV
  - Removes invalid logs (missing fields, out-of-range values)
  - Generates data cleaning report
  - Creates `training_data_cleaned.json` for ML service

**Usage:**
```bash
# Clean training data
node server/scripts/cleanTrainingData.js

# Create test user
node server/createTestUser.js
```

### Legacy Scripts (Deprecated)
These scripts were for the old Node.js AI system and are no longer used:
- `retrainModel.js`: Old model retraining (use ML service `/train` endpoint instead)
- `uploadNewModel.js`: Old model upload
- `activateModel.js`: Old model activation

## Common Development Workflows

### Working with ML Service

**Local Development (without Docker):**
1. Start MongoDB (Atlas or local)
2. Start ML service: `cd ml_service && python app.py`
3. Start backend: `npm run dev`
4. Start frontend: `cd client && npm start`

**Docker Development:**
1. Start all services: `docker-compose up -d`
2. View logs: `docker-compose logs -f backend`
3. Rebuild after changes: `docker-compose up -d --build`

### Training the ML Model

1. Ensure coffee logs exist in MongoDB `coffeelogs` collection
2. Clean training data: `node server/scripts/cleanTrainingData.js`
3. Trigger training via API:
   ```bash
   curl -X POST http://localhost:5000/train \
     -H "Content-Type: application/json" \
     -d @server/training_data_cleaned.json
   ```
4. Verify model: `curl http://localhost:5000/model-info`

### Adding a New AI Feature

1. Add endpoint in `ml_service/app.py`
2. Add corresponding method in `server/services/mlServiceClient.js`
3. Add route in `server/routes/ai-new.js`
4. Call from frontend via backend API

## Client Proxy Configuration

The React client proxies API requests to the backend:
- Configured in `client/package.json`: `"proxy": "http://localhost:5002"`
- Allows relative API calls from frontend (e.g., `/products` → `http://localhost:5002/products`)
