# Pharmacy ERP Management System

A robust, full-stack Enterprise Resource Planning (ERP) application designed for pharmacy operations. It integrates Role-Based Access Control (RBAC), multi-role dashboards, inventory management, prescription dispensing, and comprehensive security logging.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB / Mongoose v5
- **Frontend:** AngularJS 1.6 with UI-Router
- **Authentication:** JWT (JSON Web Tokens) with strict 8-hour expiry
- **Security:** bcrypt (10 rounds) for password hashing

## Project Structure
```text
/
├── server/
│   ├── controllers/      # REST API controllers (e.g., auth.api.js, user.api.js)
│   ├── models/           # Mongoose schemas (User, Patient, Medicine, AuditLog)
│   ├── middleware/       # JWT auth guards, rate limiting
│   ├── routes/           # API and Web route declarations
│   ├── config/           # Database connections, server config
│   └── utils/            # Shared utilities
├── app/                  # AngularJS frontend assets (app.js, services/, views/)
├── tests/                # Verification scripts and automated QA suites
├── seed.js               # Database seeding utility for default roles and inventory
├── server.js             # Express application entry point
├── .env.example          # Template for required environment variables
├── package.json          # Node dependencies and scripts
└── package-lock.json     # Deterministic dependency resolution tree
```

## Prerequisites
- Node.js (v14.x or later recommended)
- MongoDB (v4.x or later) running locally or accessible via URI

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pharmacy-management-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to a new file named `.env` and fill in the required values.
   ```bash
   cp .env.example .env
   ```

4. **Seed the Database:**
   Run the seed script to populate default user accounts, dummy inventory, and system roles.
   ```bash
   node seed.js
   ```
   *Default Accounts (Passwords should be changed in production):*
   - Admin: `admin@pharmacy.com` / `Admin@123`
   - Pharmacist: `pharmacist@pharmacy.com` / `Pharma@123`
   - Doctor: `doctor@pharmacy.com` / `Doctor@123`

5. **Start the Server:**
   ```bash
   node server.js
   ```
   The application will be accessible at `http://localhost:3000`.

## Running Verification Tests
The `/tests` directory contains strict automated suites validating auth boundaries, NoSQL injections, CORS settings, and business logic integrations.
Ensure the server is **running** (`node server.js`) before executing the live network test suites.
```bash
node tests/test-auth.js          # Confirms 42/42 security and boundary tests
node tests/test-epoch.js         # Confirms 16/16 operational lifecycle flows
node tests/test-live-negative.js # Confirms active NoSQL injection blockages
node tests/test-cors.js          # Spawns isolated check for CORS strict default
node tests/test-jwt-fail.js      # Spawns isolated check for JWT_SECRET enforcement
```

## RBAC (Role-Based Access Control) Matrix

| Feature Module | Admin | Doctor | Pharmacist |
| :--- | :-: | :-: | :-: |
| **User Mgmt** | Full | None | None |
| **Audit Logs** | View | None | None |
| **Patients** | View | Full | View |
| **Prescriptions** | View | Create | Dispense |
| **Medicine Inventory** | Full | View | Update (Dispense) |
| **Suppliers / Purchasing** | Full | None | View |
| **Sales & Orders** | Full | None | Full |

## Security Hardening Notes
- **JWT Enforced Fail-Closed:** The server will refuse to start and crash with exit code `1` if the `JWT_SECRET` environment variable is not defined, explicitly preventing fallback to a vulnerable default key.
- **Strict CORS Default:** If `ALLOWED_ORIGINS` is unset, cross-origin requests are blocked entirely (defaulting to `[]`), completely eliminating wildcard (`*`) access.
- **Login Rate Limiting:** Brute force mitigation tracks IP and email combinations. 5 consecutive failures will lock out the account across that vector for 15 minutes.
- **NoSQL Injection Prevention:** Explicit structural `typeof` validations are utilized across authentication routes to block MongoDB operand injection attacks via object payloads (e.g., `{ "$ne": null }`).

## Deployment Notes
- HTTPS/TLS termination should be handled via a reverse proxy (e.g., Nginx, AWS ALB, Cloudflare).
- The `.env` variables (`JWT_SECRET`, `MONGO_URI`, `ALLOWED_ORIGINS`) are **strictly required** in production environments. Do not deploy the server without these correctly configured in your container or host.

## License
MIT License
