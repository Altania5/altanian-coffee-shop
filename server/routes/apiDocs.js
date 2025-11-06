const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load OpenAPI specification
let swaggerDocument;
try {
  const filePath = path.join(__dirname, '..', '..', 'openapi.yaml');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  swaggerDocument = yaml.load(fileContents);
} catch (error) {
  console.error('Error loading OpenAPI specification:', error);
  swaggerDocument = {
    openapi: '3.0.3',
    info: {
      title: 'Altanian Coffee Shop API',
      description: 'API documentation failed to load',
      version: '1.0.0'
    },
    paths: {}
  };
}

// Swagger UI options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #8B4513; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .swagger-ui .btn.authorize { background-color: #8B4513; border-color: #8B4513; }
    .swagger-ui .btn.authorize:hover { background-color: #A0522D; border-color: #A0522D; }
    .swagger-ui .auth-wrapper .btn { background-color: #8B4513; border-color: #8B4513; }
    .swagger-ui .auth-wrapper .btn:hover { background-color: #A0522D; border-color: #A0522D; }
  `,
  customSiteTitle: 'Altanian Coffee Shop API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add default headers if not present
      if (!req.headers['Content-Type']) {
        req.headers['Content-Type'] = 'application/json';
      }
      return req;
    },
    responseInterceptor: (res) => {
      // Log API calls for monitoring
      console.log(`API Docs - ${res.method} ${res.url} - ${res.status}`);
      return res;
    }
  }
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Health check endpoint for API docs
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation service is running',
    version: swaggerDocument.info.version,
    timestamp: new Date().toISOString()
  });
});

// Get OpenAPI spec as JSON
router.get('/spec.json', (req, res) => {
  res.json(swaggerDocument);
});

// Get OpenAPI spec as YAML
router.get('/spec.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml.dump(swaggerDocument));
});

module.exports = router;

