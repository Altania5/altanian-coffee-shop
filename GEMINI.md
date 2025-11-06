# GEMINI Code Assistant Guide: Altanian Coffee Shop

This document provides a comprehensive guide for the Gemini code assistant to understand and effectively contribute to the Altanian Coffee Shop project.

## 1. Project Overview

Altanian Coffee Shop is a full-stack web application designed for managing a modern coffee shop. It features a rich user interface for customers and a powerful backend for staff and administrators. The project is architected as a multi-service application, consisting of a React frontend, a Node.js backend, and a Python-based machine learning service for AI-powered features.

### Key Technologies:

*   **Frontend:** React.js (Create React App)
*   **Backend:** Node.js with Express.js
*   **Machine Learning:** Python with Flask
*   **Database:** MongoDB
*   **Containerization:** Docker (with `docker-compose`)
*   **Deployment:** Heroku

## 2. Getting Started

There are three primary ways to run the Altanian Coffee Shop application: using Docker, deploying to Heroku, or running the services locally.

### A. Running with Docker (Recommended)

The most straightforward method to get the entire application stack running is by using Docker Compose. This will launch the frontend, backend, ML service, and the MongoDB database in isolated containers.

**To start the application:**

```bash
docker-compose up
```

**To stop the application:**

```bash
docker-compose down
```

### B. Running Locally

To run the application locally, you will need to start the frontend and backend services in separate terminals.

**1. Start the Backend Server:**

```bash
cd server
npm install
npm run dev
```

The backend server will be available at `http://localhost:5002`.

**2. Start the Frontend Client:**

```bash
cd client
npm install
npm start
```

The frontend development server will open at `http://localhost:3001`.

### C. Deploying to Heroku

The application is configured for deployment to Heroku. The `Procfile` specifies the command to start the web server, and the `heroku-postbuild` script in the root `package.json` handles the build process for both the client and server.

**To deploy to Heroku:**

1.  Ensure you have the Heroku CLI installed and are logged in.
2.  Create a Heroku application: `heroku create`
3.  Push the code to Heroku: `git push heroku main`

## 3. Project Structure

The project is organized into the following key directories:

*   `client/`: Contains the React.js frontend application.
*   `server/`: Contains the Node.js/Express.js backend server.
*   `ml_service/`: Houses the Python/Flask machine learning service.
*   `public_legacy/`: Contains legacy HTML, CSS, and JavaScript files.
*   `scripts/`: A collection of utility scripts for database management and other tasks.

## 4. API Documentation

The backend server provides a comprehensive RESTful API for interacting with the application's data and features. The API is documented using the OpenAPI specification.

*   **OpenAPI Specification:** The `openapi.yaml` file in the root directory contains the full OpenAPI 3.0 specification for the API.
*   **Swagger UI:** When the backend server is running in development mode, interactive API documentation is available at `http://localhost:5002/api-docs`.

## 5. Development Conventions

*   **Code Style:** The project uses Prettier for code formatting. Please ensure that any new code is formatted according to the project's Prettier configuration.
*   **Testing:** The `client` directory includes a standard Create React App test setup with Jest and React Testing Library. The `ml_service` directory contains `test_training.py` for testing the machine learning model.
*   **Dependencies:**
    *   Frontend dependencies are managed in `client/package.json`.
    *   Backend dependencies are managed in `server/package.json`.
    *   Machine learning service dependencies are managed in `ml_service/requirements.txt`.
*   **Environment Variables:** The application uses `.env` files for managing environment-specific variables. An example can be found in `.env.example`.
