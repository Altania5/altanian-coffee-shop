# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Quick Start

This is a full-stack coffee shop application with separate client and server components.

### Prerequisites
- Node.js (latest LTS recommended)
- MongoDB Atlas account and connection string
- Stripe account for payment processing

### Environment Setup
1. Create `.env` files in both `server/` directory with:
   ```
   ATLAS_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NODE_ENV=development
   ```

2. Install dependencies for both client and server:
   ```powershell
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies  
   cd ../client
   npm install
   ```

### Running the Application
```powershell
# Start the full application (from root directory)
npm start  # Runs server on port 5000

# Or run components separately:
# Start server only (from root or server directory)
cd server && npm start  # Port 5000

# Start client only (from client directory)
cd client && npm start  # Port 3000 (proxies to server:5000)
```

## Architecture Overview

### Application Flow
```
React Frontend (Port 3000) ←→ Express Backend (Port 5000) ←→ MongoDB Atlas
                  ↓                      ↓
            JWT Authentication    Stripe Payment Processing
```

### Key Components

**Frontend (React + Create React App)**
- **Authentication**: JWT-based login/logout with localStorage persistence
- **Routing**: Tab-based navigation (Home, Order, Admin, Coffee Log, Checkout)
- **State Management**: React hooks for cart, user session, and UI state
- **Payment Integration**: Stripe React components for checkout

**Backend (Express.js + MongoDB)**
- **Authentication Middleware**: JWT verification with role-based access (customer/owner)
- **API Routes**: RESTful endpoints for users, products, orders, inventory, etc.
- **Database Models**: Mongoose schemas for User, Product, Order, Inventory, CoffeeLog, etc.
- **Payment Processing**: Stripe server-side integration

### User Roles
- **Customer**: Can browse products, place orders, view order history, log coffee consumption
- **Owner**: All customer permissions plus inventory management, product management, promo codes, settings

## Common Development Commands

### Server Development
```powershell
cd server
npm start                    # Start server on port 5000
```

### Client Development
```powershell
cd client
npm start                    # Start development server on port 3000
npm run build               # Build for production
npm test                    # Run tests in watch mode
npm test -- --coverage     # Run tests with coverage report
```

### Full Application
```powershell
# From root directory
npm start                   # Start server only
npm run heroku-postbuild   # Build client for production deployment
```

### Testing
```powershell
cd client
npm test                    # Interactive test runner
npm test -- --watchAll=false  # Run all tests once
```

## Project Structure

```
├── client/                 # React frontend (Create React App)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── layout/         # Layout components (AppLayout, Navbar)
│   │   └── assets/         # Images and static assets
│   └── package.json        # Client dependencies & scripts
├── server/                 # Express.js backend
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication middleware
│   └── server.js           # Main server file
└── package.json            # Root package for deployment
```

### Key Files to Understand

**Frontend Architecture:**
- `client/src/App.js` - Main app component with authentication logic
- `client/src/layout/AppLayout.js` - Tab navigation and cart state management
- `client/src/components/` - Reusable components for cart, checkout, forms, etc.

**Backend Architecture:**
- `server/server.js` - Express app setup, middleware, and route mounting
- `server/models/` - Database schemas (User, Product, Order, Inventory, etc.)
- `server/middleware/auth.js` - JWT authentication middleware
- `server/middleware/ownerAuth.js` - Owner-only authorization middleware
- `server/routes/` - API endpoints organized by resource

## Database Schema Overview

### Core Models
- **User**: firstName, lastName, birthday, username, password, role (customer/owner)
- **Product**: name, description, price, imageUrl, recipe, category, canBeModified
- **Order**: user, items, totalAmount, paymentIntentId, status
- **InventoryItem**: name, currentStock, unit, cost
- **CoffeeLog**: user, beans, grindSize, brewMethod, rating, notes
- **PromoCode**: code, discountPercentage, isActive, expirationDate

### Relationships
- Products reference InventoryItems in their recipe
- Orders reference Users and contain Product items
- CoffeeLogs reference Users and Beans

## Authentication & Authorization

**JWT Flow:**
1. User logs in → server validates credentials → returns JWT token
2. Client stores token in localStorage
3. Token includes: user ID, role, firstName
4. Protected routes use auth middleware to verify token
5. Owner-only routes use ownerAuth middleware

**API Headers:**
- Authentication: `x-auth-token: <jwt_token>`

## Payment Integration

**Stripe Integration:**
- Client: Uses `@stripe/react-stripe-js` and `@stripe/stripe-js`
- Server: Uses `stripe` package for creating payment intents
- Flow: Create payment intent → client confirms payment → server processes order

## Environment Variables

### Server (.env in server/ directory)
```
ATLAS_URI=mongodb+srv://...           # MongoDB connection string
JWT_SECRET=your_secret_here           # JWT signing secret
STRIPE_SECRET_KEY=sk_test_...         # Stripe secret key
NODE_ENV=development                  # Environment mode
PORT=5000                            # Server port (optional)
```

### Client Proxy Configuration
- Client development server proxies API calls to `http://localhost:5000`
- Configured in `client/package.json` with `"proxy": "http://localhost:5000"`

## Production Deployment

**Heroku Deployment:**
- Root `package.json` includes `heroku-postbuild` script
- Builds client and serves static files from server in production
- Server serves React build from `client/build/` when `NODE_ENV=production`

**Build Process:**
1. `npm run heroku-postbuild` builds client
2. Server serves static files and handles SPA routing
3. All API routes prefixed (e.g., `/users`, `/products`)

## Development Workflow

### Adding New Features
1. **Database**: Create/modify Mongoose models in `server/models/`
2. **API**: Add routes in `server/routes/` with appropriate auth middleware
3. **Frontend**: Create components in `client/src/components/` or pages in `client/src/pages/`
4. **Integration**: Update AppLayout navigation if needed

### Working with Authentication
- Use `auth` middleware for user-authenticated endpoints
- Use `ownerAuth` middleware for admin-only endpoints
- Frontend checks `user.role` for conditional UI rendering

### Testing Considerations
- Client uses Create React App's built-in Jest + React Testing Library
- No server-side tests currently configured
- Consider adding API endpoint tests with Jest + Supertest

## Common Patterns

**API Response Format:**
```javascript
// Success
res.json(data)

// Error  
res.status(400).json({ msg: 'Error message' })
res.status(500).json({ error: err.message })
```

**Frontend API Calls:**
```javascript
// With authentication
const response = await axios.get('/api/endpoint', {
  headers: { 'x-auth-token': user.token }
});
```

**State Management:**
- User state managed in App.js with localStorage persistence
- Cart state managed in AppLayout.js
- Component-level state for forms and UI interactions
