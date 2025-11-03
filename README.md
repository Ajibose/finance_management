# Finance Management API (Node.js + Appwrite)

This repository contains the backend API for a small-business finance management platform, built as part of the Talentra internship program.
It connects to Appwrite services to provide a secure, real-time, and scalable solution for managing invoices, users, and financial data.

## Features
- Secure User Authentication: Verifies the user's Appwrite session on all protected routes
- Invoice Management (CRUD): Create, Read, and Update invoices, all scoped to the authenticated user
- Automatic VAT Calculation: VAT is automatically calculated on invoice creation and re-computed when marked as paid
- Email Notifications: Automatically sends a an email  to the customer using Appwrite Messaging when an invoice is marked as paid
- Real-time Financial Summary: A single endpoint to get total revenue, outstanding payments, and VAT collected

## Tech Stack
- Node.js: Runtime enviromenmt
- fastify: 
- TypeScript
- Appwrite server SDK: Backend-as-a-Service for:
    - Authentication
    - Database
    - messaging - Email
- zod

---

## Quick Start

### Prerequisites

- Node (v20.x or higher)
- npm or bun
- An Appwrite Cloud Account
- Email provider configured in **Appwrite → Messaging → Providers**  
  - e.g., SMTP (App Password), Mailgun, SendGrid

### Setup & Installation

**1. Clone the repository:**
```bash
git clone https://github.com/ibrahim-oyebami/finance_management.git
cd finance_management
```

**2. Install dependencies**
```bash
# Using npm
npm install

# Or using bun
bun install
```

**3. Set up Appwrite**
- Log in to your Appwrite Cloud console and create a new Project

- Create a new Database and note the Database ID

- Run the schema initialization script to automatically create your collections (invoices, users, vat_data) and attributes.
```bash
bun run initializeSchema.ts
```

- In the Appwrite console, go to Auth and add a Web Platform using the url of the frotend that will interract with this API

- Go to API Keys and create a new API Key with Databases and Messaging scopes. Note the API Key Secret.

**4. Set up environment**
- Copy the example environment file:
```bash
cp .env.example .env
```

- Open the new .env file and fill in the values you got from Step 3

**5. Run the application**
```bash
# For development
npm run dev

# Or using bun
bun run dev
```
The API will be available at http://localhost:8080 (or the port you defined)


### Environment Variables

Your .env file must contain the following keys as seen in .env.example:

```ini
# Appwrite Configuration
APPWRITE_PROJECT_ID=
APPWRITE_ENDPOINT=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=

# PORT
PORT=
```

## Authentication for Testing

Since user registration and login are handled from the **frontend**, you can create a user to generate or retrieve a test JWT directly from the backend using the provided `auth.ts` script.

Run the command below:
```bash
bun run scripts/auth.ts
```

## Hosted API

The Finance Management API is live and accessible at:  
[https://finance-management-luul.onrender.com/api/v1](https://finance-management-luul.onrender.com/api/v1)


## API Endpoints

A full API specification is available in the **Postman Collection** included in the `/docs` directory.  
You can import it into Postman to explore all routes and test them easily.

> **Note:**  
> All protected routes (Invoices, Summary, Profile) require a valid Appwrite session or JWT token
> The backend verifies this session before processing any request

---

### Profile
- **GET** `/api/v1/profile`  
  Retrieves the authenticated user's profile information

- **POST** `/api/v1/profile`  
  Creates or updates the authenticated user's profile details

- **GET** `/api/v1/profile/vat`  
  Fetches the user's current VAT settings

- **POST** `/api/v1/profile/vat`  
  Creates or updates the user's VAT configuration

---

### Invoices

- **POST** `/api/v1/invoices`  
  Creates a new invoice for the authenticated user with automatic VAT calculation

- **GET** `/api/v1/invoices`  
  Retrieves a paginated list of invoices.  
  Supports optional query parameters: `status`, `page`, and `limit`

- **GET** `/api/v1/invoices/:invoiceId`  
  Retrieves detailed information for a specific invoice

- **PATCH** `/api/v1/invoices/:invoiceId/paid`  
  Marks an invoice as **PAID**, recomputes VAT and triggers an email notification to the customer

---

### Summary
- **GET** `/api/v1/summary`  
  Returns financial statistics for the authenticated user, including:
  - Total revenue
  - Total VAT collected
  - Outstanding (unpaid) invoice count
  - Paid invoice count

---

### Notifications *(handled automatically)*
When an invoice is marked as **PAID**, the backend sends an email via Appwrite Messaging to the customer, confirming payment and including invoice details

---

## Project Structure
```bash
finance_management/
├── README.md # Project documentation
├── index.ts # App entry point
├── package.json # Dependencies and scripts
├── bun.lock / package-lock.json # Dependency lock files
├── docs/ # Postman collection & API docs
├── scripts/ # Utility scripts
│ ├── initializeSchema.ts
│ └── auth.ts
├── src/
│ ├── app.ts # Fastify app configuration
│ ├── adapters/
│ │ └── appwriteAdapter.ts # Wrapper for Appwrite database operations
│ ├── config/
│ │ └── env.ts # Environment variable loading and validation
│ ├── domain/
│ │ ├── invoice.types.ts # Shared type definitions
│ │ └── vat.ts # VAT computation logic
│ ├── middleware/
│ │ ├── error.ts # Global error handling
│ │ └── validate.ts # Request validation middleware
│ ├── modules/ # Feature-based modules
│ │ ├── invoices/
│ │ │ ├── invoices.routes.ts
│ │ │ ├── invoices.schema.ts
│ │ │ └── invoices.service.ts
│ │ ├── profile/
│ │ │ ├── profile.routes.ts
│ │ │ ├── profile.schema.ts
│ │ │ └── profile.service.ts
│ │ └── summary/
│ │ ├── summary.routes.ts
│ │ ├── summary.schema.ts
│ │ └── summary.service.ts
│ ├── plugins/
│ │ ├── appwrite.ts # Appwrite SDK clients (db, users, messaging)
│ │ ├── logger.ts # Centralized logger configuration
│ │ └── requireAppwriteAuth.ts # Authentication plugin (Appwrite session check)
│ ├── routes/
│ │ └── index.ts # Registers all route modules
│ └── utils/
│ ├── APIResponse.ts # Standardized API response helper
│ ├── emailTemplate.ts # HTML email template for notifications
│ └── pagination.ts # Pagination helper
├── initialize_structure.sh # Shell script for directory scaffolding
└── tsconfig.json # TypeScript configuration
```

### Architecture Overview

This project follows a **feature-based modular architecture**.  
Each feature (such as `invoices`, `profile`, and `summary`) contains its own **routes**, **schemas**, and **service logic**, making the codebase easy to extend and maintain

#### Layer Breakdown
- **Modules** — Self-contained features (e.g. `invoices`, `profile`, `summary`), each with its own `routes`, `schema`, and `service`
- **Services** — Contain business logic and interact with Appwrite through the `AppwriteRepo` adapter
- **Routes** — Define the API endpoints and delegate logic to their corresponding service
- **Adapters** — Abstract communication with external dependencies (Appwrite SDK)
- **Middleware** — Handle validation, authentication, and error responses globally
- **Utils / Domain** — Shared helpers, calculations (e.g., VAT), and type definitions