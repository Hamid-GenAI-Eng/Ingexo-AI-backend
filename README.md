# Ingexo AI Backend

A highly scalable, production-grade Express.js REST API backend for the **Ingexo AI** platform. Built with security, performance, and clear separations of concerns in mind.

---

## 🏗️ Clean Layered Architecture
This codebase uses a decoupled architecture to divide router endpoints, controllers, business rules (services), and data layers:

- **`src/server.js`**: Application launcher. Binds process signals and initiates connections.
- **`src/app.js`**: Core Express assembly. Mounts pipeline security suites (Helmet, CORS, Rate Limiters) and API routes.
- **`src/config/`**: Integrates connections (Mongoose/MongoDB) and OIDC clients.
- **`src/models/`**: Defines database schema layouts, rules, and model hook helpers.
- **`src/routes/`**: Handles path mappings and chains validation and auth guards.
- **`src/middlewares/`**: Intercepts HTTP traffic (CORS, payload validations, JWT decoding, global error filtering).
- **`src/controllers/`**: Extracts incoming HTTP payload variables and calls service methods.
- **`src/services/`**: Holds core business processes (OAuth verification, crypt matches).
- **`src/utils/`**: Shared core classes (unified Operational AppErrors, standard response handlers).

---

## 🔒 Security Measures Implemented
1. **Password Hashing**: Salt and crypt passwords using robust `bcryptjs` (salt rounds = 12).
2. **Security Headers**: Mounted `helmet` to automatically assign standards to response headers.
3. **Payload Limit Controls**: Constrained payload requests to a maximum of `10mb` to protect memory buffers.
4. **Endpoint Rate Limiter**: Wrapped endpoints in a `rateLimit` middleware (max 100 requests per 15 minutes per IP) to mitigate brute force / DOS traffic.
5. **JWT HttpOnly Cookies**: Token credentials set via `HttpOnly` and `SameSite` configurations to secure sessions against CSRF and XSS injection vectors. Supports authorization headers fallback for flexible clients.
6. **Robust Input Validation**: Express validation schema steps check parameters before querying databases.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** (Local instance running, or MongoDB Atlas URL)

### 2. Setup Environment Configuration
Copy the sample environment configuration file to create `.env`:
```bash
cp .env.example .env
```
Fill in the parameters, specifically replacing database paths or Google OAuth Client IDs when ready.

### 3. Install Dependencies
Run from the backend root:
```bash
npm install
```

### 4. Running the Backend
- **Development Mode** (with Nodemon hot-reloads):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## 🔌 API Documentation Reference

### 1. Auth Endpoint Reference `/api/auth`

| Action | Method | URL Path | Guards | Body Payload | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Signup** | `POST` | `/api/auth/signup` | Validation | `{ fullName, email, password }` | Registers a new account and logs in. |
| **Login** | `POST` | `/api/auth/login` | Validation | `{ email, password }` | Authenticates email + password and sets cookie. |
| **Google Sign-In** | `POST` | `/api/auth/google` | Validation | `{ idToken }` | OIDC verifier, link accounts, logs in user. |
| **Logout** | `POST` | `/api/auth/logout` | None | None | Clears credentials token cookie session. |
| **Get Profile** | `GET` | `/api/auth/me` | Protected | None | Returns active user profile fields. |

### 2. General / Health `/api`

- **Health Check**: `GET /api/health` - Check database/server status.
