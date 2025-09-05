# Altanian Coffee - Full Stack Application

A modern coffee shop management system built with React frontend and Node.js/Express backend.

## Architecture

- **Frontend**: React.js (Create React App) running on port 3001
- **Backend**: Node.js/Express server running on port 5002
- **Database**: MongoDB Atlas
- **Payments**: Stripe integration

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm
- MongoDB Atlas account (or local MongoDB instance)
- Stripe account for payment processing

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd altaniancoffee
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

### Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# MongoDB Atlas connection string
ATLAS_URI=your_mongodb_connection_string

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_key

# Stripe API keys
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Environment
NODE_ENV=development

# Server port
PORT=5002
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the React frontend:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3001 (or next available port)
- Backend API: http://localhost:5002

### Port Configuration

**Important**: The client is configured to proxy API requests to the backend server. The proxy configuration is set in `client/package.json`:

```json
{
  "proxy": "http://localhost:5002"
}
```

If you change the server port in `server/.env`, make sure to update the proxy configuration accordingly to avoid ECONNREFUSED errors.

### API Endpoints

The backend provides the following main endpoints:

- `/products` - Coffee products management
- `/users` - User authentication and management
- `/orders` - Order processing
- `/beans` - Coffee beans inventory
- `/coffeelogs` - Coffee brewing logs
- `/inventory` - Inventory management
- `/settings` - Application settings
- `/promocodes` - Promotional codes
- `/payments` - Stripe payment processing

### Troubleshooting

#### Proxy Errors (ECONNREFUSED)

If you see proxy errors like "Could not proxy request /products from localhost:3001 to http://localhost:5002", check:

1. The backend server is running on the correct port (check `server/.env` PORT variable)
2. The client proxy configuration matches the server port (check `client/package.json` proxy field)
3. No other processes are using the server port

#### Database Connection Issues

- Verify your MongoDB Atlas URI is correct in `server/.env`
- Check if your IP address is whitelisted in MongoDB Atlas
- Ensure the database user has proper permissions

#### Stripe Payment Issues

- Verify your Stripe API keys are correct in `server/.env`
- Use test keys for development (start with `sk_test_` and `pk_test_`)
- Check Stripe dashboard for webhook configuration in production

## Contributing

1. Create a feature branch
2. Make your changes
3. Test both frontend and backend
4. Submit a pull request

## License

[Add your license information here]
