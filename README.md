# Altanian Coffee Shop - Full Stack Application

A modern coffee shop management system built with React frontend and Node.js/Express backend.

## Description

Welcome to Altanian Coffee Shop! This application provides a seamless experience for customers to browse our menu, place orders, and for staff to manage inventory and customer requests. Built with modern web technologies and designed for scalability.

## Architecture

- **Frontend**: React.js (Create React App) running on port 3001
- **Backend**: Node.js/Express server running on port 5002  
- **Database**: MongoDB Atlas
- **Payments**: Stripe integration
- **Deployment**: Heroku

## Features

* User registration and authentication
* Browseable coffee and food menu
* Online ordering system with Stripe payments
* Order history for users
* Admin panel for menu management
* Admin panel for order fulfillment
* Coffee beans inventory management
* Coffee brewing logs and tracking
* Promotional codes system
* Real-time inventory management

## Technologies Used

* **Backend:** Node.js, Express.js
* **Frontend:** React.js, HTML5, CSS3, JavaScript
* **Database:** MongoDB with Mongoose ODM
* **Authentication:** JWT, bcryptjs
* **Session Management:** express-session, connect-mongo
* **Payments:** Stripe API
* **Version Control:** Git
* **Deployment Platform:** Heroku
* **Package Manager:** npm

## Prerequisites

Before you begin, ensure you have the following installed:

* [Node.js](https://nodejs.org/) (v16 or higher)
* [Git](https://git-scm.com/)
* [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
* MongoDB Atlas account (or local MongoDB instance)
* Stripe account for payment processing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Altania5/altanian-coffee-shop.git
cd altanian-coffee-shop
```

2. Install dependencies:
```bash
npm install
```

3. Install server dependencies (if separate):
```bash
cd server
npm install
```

4. Install client dependencies (if separate):
```bash
cd ../client
npm install
```

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
DATABASE_URL=your_mongodb_connection_string
ATLAS_URI=your_mongodb_atlas_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

*Ensure `.env` is listed in your `.gitignore` file!*

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at:
- Main App: http://localhost:3000 (or your configured PORT)
- Frontend (if separate): http://localhost:3001
- Backend API (if separate): http://localhost:5002

## API Documentation

### Interactive API Documentation
- **Swagger UI**: [http://localhost:5002/api-docs](http://localhost:5002/api-docs) (Development)
- **Production**: [https://your-domain.com/api-docs](https://your-domain.com/api-docs)

### API Key System
The API supports both JWT token and API key authentication:
- **API Keys**: Full owner/admin access for external integrations
- **JWT Tokens**: User role-based access for web/mobile apps
- **Dual Support**: Both authentication methods can be used simultaneously

### Authentication Headers
```bash
# API Key Authentication (Recommended for external integrations)
x-api-key: your-api-key-here

# JWT Token Authentication (For web/mobile apps)
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Quick Start Examples
```bash
# Get all products
curl -H "x-api-key: your-key" https://your-domain.com/products

# Create an order
curl -X POST \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"items":[{"product":"product_id","quantity":1}],"customer":{"name":"John Doe","email":"john@example.com"}}' \
     https://your-domain.com/orders

# Get API usage statistics (Owner only)
curl -H "x-auth-token: jwt-token" https://your-domain.com/api-keys/stats/usage
```

### Complete API Reference
For detailed API documentation including all endpoints, request/response schemas, and examples, see:
- **Markdown Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **OpenAPI Specification**: [openapi.yaml](./openapi.yaml)

### Main API Endpoints

| Method | Endpoint             | Description                     | Auth Required |
| :----- | :------------------- | :------------------------------ | :------------ |
| `GET`  | `/products`          | Retrieve all menu items         | No            |
| `POST` | `/orders`            | Place a new coffee order        | Optional      |
| `GET`  | `/orders`            | Get orders (filtered by user)   | Yes           |
| `POST` | `/users/register`    | Register a new user             | No            |
| `POST` | `/users/login`       | Login an existing user          | No            |
| `GET`  | `/users/profile`     | Get user profile                | Yes           |
| `GET`  | `/loyalty/account`   | Get loyalty account             | Yes           |
| `POST` | `/ai/analyze`        | AI coffee shot analysis         | Yes           |
| `GET`  | `/api-keys`          | Manage API keys (Owner only)    | Yes           |
| `GET`  | `/api-docs`          | Interactive API documentation   | No            |

## Deployment to Heroku

1. **Log in to Heroku:**
    ```bash
    heroku login
    ```

2. **Create a Heroku app (if you haven't already):**
    ```bash
    heroku create altanian-coffee-shop
    ```

3. **Set Heroku Config Vars:**
    ```bash
    heroku config:set NODE_ENV=production
    heroku config:set DATABASE_URL="your_mongodb_connection_string"
    heroku config:set SESSION_SECRET="your_production_session_secret"
    heroku config:set JWT_SECRET="your_production_jwt_secret"
    heroku config:set STRIPE_SECRET_KEY="your_stripe_secret_key"
    ```

4. **Push your code to Heroku:**
    ```bash
    git add .
    git commit -m "Deploy to Heroku"
    git push heroku main
    ```

5. **Open your app:**
    ```bash
    heroku open
    ```

6. **Check logs if needed:**
    ```bash
    heroku logs --tail
    ```

## Troubleshooting

### Proxy Errors (ECONNREFUSED)

If you see proxy errors, check:
1. The backend server is running on the correct port
2. The client proxy configuration matches the server port
3. No other processes are using the server port

### Database Connection Issues

- Verify your MongoDB Atlas URI is correct in `.env`
- Check if your IP address is whitelisted in MongoDB Atlas
- Ensure the database user has proper permissions

### Stripe Payment Issues

- Verify your Stripe API keys are correct in `.env`
- Use test keys for development (start with `sk_test_` and `pk_test_`)
- Check Stripe dashboard for webhook configuration in production

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
