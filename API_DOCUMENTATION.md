# Altanian Coffee Shop API Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Rate Limiting](#rate-limiting)
5. [API Key Scopes](#api-key-scopes)
6. [IP Whitelisting](#ip-whitelisting)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [API Endpoints](#api-endpoints)
10. [Data Models](#data-models)
11. [WebSocket Events](#websocket-events)
12. [Examples](#examples)

## Getting Started

The Altanian Coffee Shop API provides comprehensive access to all coffee shop operations including user management, product catalog, order processing, loyalty programs, AI analysis, and more.

### Quick Start

1. **Get an API Key**: Contact the owner to obtain an API key
2. **Set Headers**: Include your API key in the `x-api-key` header
3. **Make Requests**: Use the base URL with appropriate endpoints

```bash
curl -H "x-api-key: your-api-key-here" \
     https://your-domain.com/products
```

## Authentication

The API supports two authentication methods:

### 1. API Key Authentication (Recommended for external integrations)
- **Header**: `x-api-key`
- **Access Level**: Full owner/admin access
- **Usage**: Include in every request header
- **Example**: `x-api-key: abc123def456ghi789`

### 2. JWT Token Authentication (For web/mobile apps)
- **Header**: `x-auth-token`
- **Access Level**: User role-based access
- **Usage**: Include in every request header
- **Example**: `x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Dual Authentication Support
- Both authentication methods can be used simultaneously
- JWT takes precedence if both are provided
- API keys provide access based on their assigned scope

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:5002
```

## Rate Limiting

The API implements sophisticated rate limiting with token bucket algorithm:

- **Basic Tier**: 100 requests/minute, 1,000/hour, 10,000/day
- **Standard Tier**: 500 requests/minute, 5,000/hour, 50,000/day  
- **Premium Tier**: 2,000 requests/minute, 20,000/hour, 200,000/day
- **Unlimited Tier**: No rate limiting (Owner only)
- **Scope-based**: Different limits based on API key scope
- **Headers**: Rate limit information is included in response headers
- **Exceeded Limit**: Returns `429 Too Many Requests` status code

### Rate Limit Headers

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 495
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

## API Key Scopes

API keys now support granular permission scopes:

### Available Scopes

- **`read`**: Read-only access to all GET endpoints
- **`write`**: Read and write access to all endpoints
- **`orders:read`**: Read-only access to order endpoints
- **`orders:write`**: Full access to order endpoints
- **`products:manage`**: Manage products and inventory (Owner only)
- **`admin`**: Administrative operations (Owner only)
- **`full`**: Complete access to all endpoints (Owner only)

### Scope Permissions

```json
{
  "scope": "orders:write",
  "permissions": ["GET", "POST", "PUT", "PATCH", "DELETE"],
  "endpoints": ["/orders", "/orders/*"],
  "requiresOwner": false
}
```

### Using Scopes

When creating an API key, specify the scope:

```bash
curl -X POST https://your-domain.com/api-keys \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Management Key",
    "description": "Key for order operations",
    "scope": "orders:write",
    "allowedIPs": ["192.168.1.100", "10.0.0.0/8"]
  }'
```

## IP Whitelisting

API keys can be restricted to specific IP addresses or CIDR ranges:

### Supported Formats

- **Single IP**: `192.168.1.100`
- **CIDR Range**: `192.168.1.0/24`
- **Multiple IPs**: `["192.168.1.100", "10.0.0.0/8"]`

### IP Whitelist Management

```bash
# Update API key IPs
curl -X PUT https://your-domain.com/api-keys/key-id/ips \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedIPs": ["192.168.1.100", "10.0.0.0/8"]
  }'
```

### IP Validation

- IP whitelisting is checked before scope validation
- Requests from non-whitelisted IPs return `401 Unauthorized`
- Empty IP list means no restrictions

## Webhooks

The API supports webhooks for real-time event notifications:

### Available Events

- `order.created` - New order placed
- `order.updated` - Order status changed
- `order.completed` - Order completed
- `order.cancelled` - Order cancelled
- `product.updated` - Product information updated
- `inventory.low_stock` - Low inventory alert
- `user.registered` - New user registration
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed

### Creating Webhooks

```bash
curl -X POST https://your-domain.com/webhooks \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Notifications",
    "url": "https://your-app.com/webhooks/orders",
    "events": ["order.created", "order.updated", "order.completed"],
    "headers": {
      "Authorization": "Bearer your-webhook-token"
    },
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 1000,
      "backoffMultiplier": 2
    }
  }'
```

### Webhook Payload

```json
{
  "event": "order.created",
  "data": {
    "orderId": "order_123",
    "userId": "user_456",
    "total": 15.50,
    "items": [...]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "deliveryId": "delivery_789",
  "webhookId": "webhook_101"
}
```

### Webhook Security

- **HMAC Signatures**: All webhooks are signed with HMAC-SHA256
- **Signature Header**: `X-Webhook-Signature: sha256=...`
- **Secret Management**: Each webhook has a unique secret
- **Retry Logic**: Failed deliveries are retried with exponential backoff

### Webhook Management

```bash
# List webhooks
curl -H "x-auth-token: your-jwt-token" \
  https://your-domain.com/webhooks

# Test webhook
curl -X POST https://your-domain.com/webhooks/webhook-id/test \
  -H "x-auth-token: your-jwt-token"

# Get webhook statistics
curl -H "x-auth-token: your-jwt-token" \
  https://your-domain.com/webhooks/stats/overview
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## API Endpoints

### Authentication & Users

#### Register User
```http
POST /users/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "birthday": "1990-01-01",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": "user_id",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "role": "user"
}
```

#### Login User
```http
POST /users/login
```

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "role": "user",
    "firstName": "John"
  }
}
```

#### Get User Profile
```http
GET /users/profile
```

**Headers:** `x-auth-token` or `x-api-key`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "birthday": "1990-01-01",
    "phone": "+1234567890",
    "role": "user"
  }
}
```

#### Update User Profile
```http
PUT /users/profile
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Change Password
```http
PUT /users/password
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Get User Favorites
```http
GET /users/favorites
```

**Response:**
```json
{
  "success": true,
  "favorites": [
    {
      "id": "favorite_id",
      "productId": "product_id",
      "productName": "Cappuccino",
      "productImage": "image_url",
      "basePrice": 4.50,
      "customizations": {
        "size": "Large",
        "milk": "Oat Milk"
      },
      "notes": "Extra hot",
      "timesOrdered": 5,
      "lastOrderedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Add Favorite
```http
POST /users/favorites
```

**Request Body:**
```json
{
  "productId": "product_id",
  "customizations": {
    "size": "Large",
    "milk": "Oat Milk"
  },
  "notes": "Extra hot",
  "incrementOrderCount": true
}
```

#### Remove Favorite
```http
DELETE /users/favorites/:favoriteId
```

#### Get Account Overview
```http
GET /users/account/overview
```

**Query Parameters:**
- `from` - Start date (ISO string)
- `to` - End date (ISO string)
- `activeLimit` - Number of active orders to return (default: 10)
- `activeOffset` - Offset for active orders pagination (default: 0)
- `pastLimit` - Number of past orders to return (default: 10)
- `pastOffset` - Offset for past orders pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "role": "user"
  },
  "orders": {
    "active": [...],
    "past": [...],
    "counts": {
      "active": 2,
      "past": 15,
      "total": 17
    }
  },
  "loyalty": {
    "points": 150,
    "tier": "Gold",
    "totalSpent": 245.50,
    "visits": 17
  }
}
```

### Products

#### Get All Products
```http
GET /products
```

**Response:**
```json
[
  {
    "_id": "product_id",
    "name": "Cappuccino",
    "description": "Rich espresso with steamed milk foam",
    "price": 4.50,
    "imageUrl": "image_url",
    "isAvailable": true,
    "category": "Hot Beverage",
    "canBeModified": true,
    "recipe": [
      {
        "item": "inventory_item_id",
        "quantityRequired": 1
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### Add Product (Owner Only)
```http
POST /products/add
```

**Request Body:**
```json
{
  "name": "New Drink",
  "description": "Description here",
  "price": 5.00,
  "imageUrl": "image_url",
  "category": "Hot Beverage",
  "canBeModified": true,
  "recipe": [
    {
      "item": "inventory_item_id",
      "quantityRequired": 1
    }
  ],
  "isAvailable": true
}
```

#### Update Product (Owner Only)
```http
PUT /products/update/:id
```

#### Delete Product (Owner Only)
```http
DELETE /products/delete/:id
```

#### Check Product Availability (Owner Only)
```http
GET /products/:id/availability
```

#### Get Unavailable Products (Owner Only)
```http
GET /products/unavailable/list
```

#### Update Product Availability (Owner Only)
```http
POST /products/:id/update-availability
```

**Request Body:**
```json
{
  "forceUpdate": false
}
```

#### Set Product Availability (Owner Only)
```http
POST /products/:id/set-availability
```

**Request Body:**
```json
{
  "isAvailable": true
}
```

### Orders

#### Create Order
```http
POST /orders
```

**Request Body:**
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 2,
      "customizations": {
        "size": {
          "name": "Large",
          "priceModifier": 1.00
        },
        "milk": {
          "inventoryId": "milk_id",
          "name": "Oat Milk",
          "price": 0.50
        },
        "syrup": {
          "inventoryId": "syrup_id",
          "name": "Vanilla",
          "price": 0.75
        }
      }
    }
  ],
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "tip": 2.00,
  "notes": "Extra hot please",
  "specialInstructions": "No lid",
  "paymentMethodId": "stripe_payment_method_id",
  "promoCode": "SAVE10"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "order_id",
    "orderNumber": "AC12345678",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "user": "user_id"
    },
    "items": [...],
    "subtotal": 10.50,
    "tax": 0.84,
    "tip": 2.00,
    "discount": 1.05,
    "totalAmount": 12.29,
    "status": "confirmed",
    "payment": {
      "status": "completed",
      "method": "stripe",
      "paidAt": "2024-01-15T10:30:00Z"
    },
    "fulfillment": {
      "type": "pickup",
      "estimatedReadyTime": "2024-01-15T10:45:00Z"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "paymentIntent": {
    "id": "pi_id",
    "status": "succeeded",
    "client_secret": "pi_secret"
  }
}
```

#### Get Orders
```http
GET /orders
```

**Query Parameters:**
- `status` - Filter by status (pending, confirmed, preparing, ready, completed, cancelled)
- `today` - Get today's orders only
- `limit` - Number of orders to return

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "count": 25
}
```

#### Get Order History
```http
GET /orders/history
```

**Query Parameters:**
- `limit` - Number of orders to return (default: 50)
- `offset` - Pagination offset (default: 0)
- `from` - Start date filter
- `to` - End date filter

#### Get User's Most Ordered Product
```http
GET /orders/usual
```

#### Get User's Orders
```http
GET /orders/myorders
```

#### Get User Order Summary
```http
GET /orders/user/summary
```

**Query Parameters:**
- `from` - Start date filter
- `to` - End date filter
- `activeLimit` - Active orders limit (default: 10)
- `activeOffset` - Active orders offset (default: 0)
- `pastLimit` - Past orders limit (default: 10)
- `pastOffset` - Past orders offset (default: 0)

#### Get Order by ID
```http
GET /orders/:id
```

#### Get Order by Order Number
```http
GET /orders/number/:orderNumber?email=customer@example.com
```

#### Update Order Status (Admin Only)
```http
PUT /orders/:id/status
```

**Request Body:**
```json
{
  "status": "preparing"
}
```

#### Cancel Order
```http
POST /orders/:id/cancel
```

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

#### Get Admin Dashboard Data (Admin Only)
```http
GET /orders/admin/dashboard
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "todaysOrders": {
      "total": 45,
      "revenue": 892.50,
      "byStatus": {
        "pending": 3,
        "confirmed": 8,
        "preparing": 12,
        "ready": 5,
        "completed": 15,
        "cancelled": 2
      }
    },
    "activeOrders": [...],
    "lowStockItems": [...]
  }
}
```

### Payment Methods

#### Create Setup Intent
```http
POST /orders/payment-methods/setup-intent
```

#### Get Payment Methods
```http
GET /orders/payment-methods
```

#### Save Payment Method
```http
POST /orders/payment-methods
```

**Request Body:**
```json
{
  "paymentMethodId": "pm_id",
  "setDefault": true
}
```

#### Delete Payment Method
```http
DELETE /orders/payment-methods/:paymentMethodId
```

### Coffee Beans

#### Add Bean
```http
POST /beans/add
```

**Request Body:**
```json
{
  "name": "Ethiopian Yirgacheffe",
  "roaster": "Blue Bottle",
  "origin": "Ethiopia",
  "roastDate": "2024-01-10",
  "roastLevel": "Light",
  "processMethod": "Washed",
  "notes": "Bright and fruity"
}
```

#### Get Beans
```http
GET /beans
```

### Coffee Logs

#### Add Coffee Log
```http
POST /coffeelogs/add
```

**Request Body:**
```json
{
  "bean": "bean_id",
  "bag": "bag_id",
  "machine": "Espresso Machine Model X",
  "grindSize": "Fine",
  "extractionTime": 28,
  "temperature": 200,
  "inWeight": 18,
  "outWeight": 36,
  "tasteMetExpectations": true,
  "notes": "Perfect extraction",
  "shotQuality": 9,
  "tasteProfile": {
    "sweetness": 4,
    "acidity": 3,
    "bitterness": 2,
    "body": 4
  },
  "roastLevel": "Medium",
  "processMethod": "Washed",
  "usedPuckScreen": true,
  "usedWDT": true,
  "distributionTechnique": "WDT",
  "usedPreInfusion": true,
  "preInfusionTime": 5,
  "preInfusionPressure": 3,
  "humidity": 45,
  "pressure": 9,
  "targetProfile": "balanced"
}
```

#### Get Coffee Logs
```http
GET /coffeelogs
```

### Inventory

#### Get Inventory Items
```http
GET /inventory
```

#### Add Inventory Item (Owner Only)
```http
POST /inventory/add
```

**Request Body:**
```json
{
  "itemName": "Espresso Beans",
  "itemType": "Coffee",
  "quantityInStock": 50,
  "unit": "lbs",
  "lowStockThreshold": 10
}
```

#### Update Inventory Item (Owner Only)
```http
PUT /inventory/update/:id
```

#### Delete Inventory Item (Owner Only)
```http
DELETE /inventory/delete/:id
```

### Loyalty Program

#### Get Loyalty Account
```http
GET /loyalty/account
```

**Response:**
```json
{
  "success": true,
  "account": {
    "userId": "user_id",
    "points": 150,
    "tier": "Gold",
    "totalSpent": 245.50,
    "visits": 17,
    "transactions": [...]
  }
}
```

#### Get Available Rewards
```http
GET /loyalty/rewards
```

#### Redeem Reward
```http
POST /loyalty/redeem
```

**Request Body:**
```json
{
  "rewardId": "reward_id",
  "orderId": "order_id"
}
```

#### Get Loyalty Transactions
```http
GET /loyalty/transactions
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

#### Get Tier Benefits
```http
GET /loyalty/tiers
```

#### Award Birthday Bonus (Admin Only)
```http
POST /loyalty/birthday-bonus
```

**Request Body:**
```json
{
  "userId": "user_id"
}
```

#### Get Loyalty Statistics (Admin Only)
```http
GET /loyalty/stats
```

#### Get Leaderboard
```http
GET /loyalty/leaderboard
```

**Query Parameters:**
- `limit` - Number of customers to return (default: 10)

#### Initialize Loyalty Program (Admin Only)
```http
POST /loyalty/initialize
```

### AI Analysis

#### Get AI Status
```http
GET /ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isReady": true,
    "modelVersion": "v1.2.0",
    "totalLogs": 1250,
    "validLogs": 1200,
    "lastTrained": "2024-01-15T08:00:00Z"
  }
}
```

#### Analyze Coffee Shot
```http
POST /ai/analyze
```

**Request Body:**
```json
{
  "inWeight": 18,
  "outWeight": 36,
  "extractionTime": 28,
  "shotQuality": 8,
  "grindSize": "Fine",
  "temperature": 200,
  "pressure": 9
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictedQuality": 8.5,
    "currentQuality": 8,
    "confidence": 0.85,
    "recommendations": [
      "Consider reducing extraction time by 2-3 seconds",
      "Temperature is optimal",
      "Grind size appears appropriate"
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "modelVersion": "v1.2.0"
  }
}
```

#### Train AI Model (Owner Only)
```http
POST /ai/train
```

#### Get Training Status (Owner Only)
```http
GET /ai/training-status
```

#### Retrain AI Model (Owner Only)
```http
POST /ai/retrain
```

### API Key Management (Owner Only)

#### Get API Keys
```http
GET /api-keys
```

**Response:**
```json
{
  "success": true,
  "keys": [
    {
      "id": "key-001",
      "name": "Production API Key",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastUsed": "2024-01-15T10:30:00Z",
      "isActive": true,
      "permissions": ["*"],
      "description": "Main production API key"
    }
  ],
  "count": 1
}
```

#### Create API Key
```http
POST /api-keys
```

**Request Body:**
```json
{
  "name": "New API Key",
  "description": "Description here",
  "permissions": ["*"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key created successfully",
  "key": {
    "id": "key-002",
    "name": "New API Key",
    "key": "abc123def456ghi789",
    "createdAt": "2024-01-15T10:30:00Z",
    "permissions": ["*"],
    "description": "Description here"
  }
}
```

#### Get API Key Details
```http
GET /api-keys/:id
```

#### Revoke API Key
```http
PUT /api-keys/:id/revoke
```

#### Regenerate API Key
```http
PUT /api-keys/:id/regenerate
```

#### Get API Key Statistics
```http
GET /api-keys/stats/overview
```

#### Get API Usage Statistics
```http
GET /api-keys/stats/usage
```

**Query Parameters:**
- `apiKeyId` - Filter by specific API key
- `from` - Start date filter
- `to` - End date filter
- `limit` - Number of top endpoints to return (default: 10)

#### Get API Usage Logs
```http
GET /api-keys/logs
```

**Query Parameters:**
- `apiKeyId` - Filter by specific API key
- `from` - Start date filter
- `to` - End date filter
- `limit` - Number of logs to return (default: 50)
- `page` - Page number (default: 1)
- `endpoint` - Filter by endpoint
- `method` - Filter by HTTP method
- `statusCode` - Filter by response status code

#### Cleanup Old Logs
```http
DELETE /api-keys/logs/cleanup
```

**Request Body:**
```json
{
  "daysToKeep": 90
}
```

## Data Models

### User Model
```json
{
  "_id": "ObjectId",
  "firstName": "String",
  "lastName": "String",
  "birthday": "Date",
  "email": "String",
  "username": "String",
  "password": "String (hashed)",
  "phone": "String",
  "role": "String (user|admin|owner)",
  "stripeCustomerId": "String",
  "savedPaymentMethods": [
    {
      "paymentMethodId": "String",
      "brand": "String",
      "last4": "String",
      "expMonth": "Number",
      "expYear": "Number",
      "isDefault": "Boolean"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Product Model
```json
{
  "_id": "ObjectId",
  "name": "String",
  "description": "String",
  "price": "Number",
  "imageUrl": "String",
  "recipe": [
    {
      "item": "ObjectId (InventoryItem)",
      "quantityRequired": "Number"
    }
  ],
  "isAvailable": "Boolean",
  "availabilityManuallySet": "Boolean",
  "category": "String (Iced Beverage|Hot Beverage|Shaken Beverage|Refresher)",
  "canBeModified": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Order Model
```json
{
  "_id": "ObjectId",
  "orderNumber": "String",
  "customer": {
    "user": "ObjectId (User)",
    "name": "String",
    "email": "String",
    "phone": "String"
  },
  "items": [
    {
      "product": "ObjectId (Product)",
      "productName": "String",
      "productPrice": "Number",
      "quantity": "Number",
      "customizations": {
        "size": {
          "name": "String",
          "priceModifier": "Number"
        },
        "extraShots": {
          "quantity": "Number",
          "pricePerShot": "Number",
          "ingredientUsed": "ObjectId"
        },
        "syrup": {
          "inventoryId": "ObjectId",
          "name": "String",
          "price": "Number"
        },
        "milk": {
          "inventoryId": "ObjectId",
          "name": "String",
          "price": "Number"
        },
        "toppings": [
          {
            "inventoryId": "ObjectId",
            "name": "String",
            "price": "Number"
          }
        ],
        "coldFoam": {
          "added": "Boolean",
          "price": "Number"
        },
        "temperature": "String",
        "specialInstructions": "String"
      },
      "itemTotalPrice": "Number",
      "inventoryDeductions": [
        {
          "inventoryItem": "ObjectId",
          "quantityDeducted": "Number",
          "reason": "String"
        }
      ]
    }
  ],
  "subtotal": "Number",
  "tax": "Number",
  "tip": "Number",
  "discount": "Number",
  "totalAmount": "Number",
  "promoCode": {
    "code": "String",
    "discountPercentage": "Number",
    "appliedAt": "Date"
  },
  "isTestOrder": "Boolean",
  "loyaltyAwarded": "Boolean",
  "status": "String (pending|confirmed|preparing|ready|completed|cancelled)",
  "payment": {
    "status": "String (pending|processing|completed|failed|refunded)",
    "method": "String",
    "stripePaymentIntentId": "String",
    "stripeChargeId": "String",
    "paidAt": "Date",
    "refundedAt": "Date",
    "refundAmount": "Number"
  },
  "fulfillment": {
    "type": "String (pickup|delivery)",
    "estimatedReadyTime": "Date",
    "actualReadyTime": "Date",
    "pickedUpAt": "Date",
    "address": "String",
    "deliveryInstructions": "String",
    "deliveredAt": "Date"
  },
  "notes": "String",
  "specialInstructions": "String",
  "assignedBarista": "ObjectId (User)",
  "prepStartedAt": "Date",
  "source": "String (website|mobile|phone|walk-in)",
  "inventorySnapshot": [
    {
      "item": "ObjectId (InventoryItem)",
      "quantityBefore": "Number",
      "quantityDeducted": "Number",
      "quantityAfter": "Number"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Coffee Log Model
```json
{
  "_id": "ObjectId",
  "user": "ObjectId (User)",
  "bean": "ObjectId (Bean)",
  "bag": "ObjectId (BeanBag)",
  "machine": "String",
  "grindSize": "String",
  "extractionTime": "Number",
  "temperature": "Number",
  "inWeight": "Number",
  "outWeight": "Number",
  "tasteMetExpectations": "Boolean",
  "notes": "String",
  "shotQuality": "Number",
  "tasteProfile": {
    "sweetness": "Number",
    "acidity": "Number",
    "bitterness": "Number",
    "body": "Number"
  },
  "roastLevel": "String",
  "processMethod": "String",
  "usedPuckScreen": "Boolean",
  "usedWDT": "Boolean",
  "distributionTechnique": "String",
  "usedPreInfusion": "Boolean",
  "preInfusionTime": "Number",
  "preInfusionPressure": "Number",
  "humidity": "Number",
  "pressure": "Number",
  "targetProfile": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Inventory Item Model
```json
{
  "_id": "ObjectId",
  "itemName": "String",
  "itemType": "String",
  "quantityInStock": "Number",
  "unit": "String",
  "lowStockThreshold": "Number",
  "isAvailable": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Bean Model
```json
{
  "_id": "ObjectId",
  "name": "String",
  "roaster": "String",
  "origin": "String",
  "roastDate": "Date",
  "roastLevel": "String",
  "processMethod": "String",
  "notes": "String",
  "user": "ObjectId (User)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Loyalty Account Model
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (User)",
  "points": "Number",
  "tier": "String (Bronze|Silver|Gold|Platinum)",
  "totalSpent": "Number",
  "visits": "Number",
  "transactions": [
    {
      "type": "String (earned|redeemed|bonus)",
      "points": "Number",
      "orderId": "ObjectId",
      "orderNumber": "String",
      "description": "String",
      "createdAt": "Date"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### API Key Log Model
```json
{
  "_id": "ObjectId",
  "apiKeyId": "String",
  "apiKeyName": "String",
  "endpoint": "String",
  "method": "String",
  "ipAddress": "String",
  "userAgent": "String",
  "requestBody": "Object",
  "responseStatus": "Number",
  "responseTime": "Number",
  "errorMessage": "String",
  "timestamp": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## WebSocket Events

The API supports real-time communication via WebSocket for order tracking and notifications.

### Connection
```javascript
const socket = io('ws://localhost:5002');

// Join user room
socket.emit('join-room', userRole, userId);
```

### Order Status Updates
```javascript
// Listen for order status changes
socket.on('order-status-changed', (data) => {
  console.log('Order status changed:', data);
  // data: { orderId, status, timestamp }
});
```

### Admin Order Updates
```javascript
// Admin broadcasting order updates
socket.emit('order-status-update', {
  orderId: 'order_id',
  userId: 'user_id',
  status: 'preparing'
});
```

## Examples

### Complete Order Flow
```bash
# 1. Get products
curl -H "x-api-key: your-key" \
     https://your-domain.com/products

# 2. Create order
curl -X POST \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{
       "items": [
         {
           "product": "product_id",
           "quantity": 1,
           "customizations": {
             "size": {"name": "Large", "priceModifier": 1.00},
             "milk": {"inventoryId": "milk_id", "name": "Oat Milk", "price": 0.50}
           }
         }
       ],
       "customer": {
         "name": "John Doe",
         "email": "john@example.com"
       },
       "paymentMethodId": "pm_id"
     }' \
     https://your-domain.com/orders

# 3. Update order status (admin)
curl -X PUT \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"status": "preparing"}' \
     https://your-domain.com/orders/order_id/status
```

### AI Analysis Example
```bash
# Analyze coffee shot
curl -X POST \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{
       "inWeight": 18,
       "outWeight": 36,
       "extractionTime": 28,
       "shotQuality": 8,
       "grindSize": "Fine",
       "temperature": 200,
       "pressure": 9
     }' \
     https://your-domain.com/ai/analyze
```

### Loyalty Program Example
```bash
# Get loyalty account
curl -H "x-api-key: your-key" \
     https://your-domain.com/loyalty/account

# Redeem reward
curl -X POST \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{
       "rewardId": "reward_id",
       "orderId": "order_id"
     }' \
     https://your-domain.com/loyalty/redeem
```

### API Key Management Example
```bash
# Create new API key
curl -X POST \
     -H "x-auth-token: jwt-token" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Mobile App Key",
       "description": "API key for mobile application",
       "permissions": ["*"]
     }' \
     https://your-domain.com/api-keys

# Get usage statistics
curl -H "x-auth-token: jwt-token" \
     https://your-domain.com/api-keys/stats/usage?from=2024-01-01&to=2024-01-31
```

## Support

For API support and questions:
- Email: support@altaniancoffee.com
- Documentation: https://your-domain.com/api-docs
- Status Page: https://status.altaniancoffee.com

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- API key authentication system
- Complete endpoint coverage
- Real-time WebSocket support
- AI analysis integration
- Loyalty program implementation
- Comprehensive documentation
