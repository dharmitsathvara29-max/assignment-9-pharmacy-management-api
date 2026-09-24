# 💊 Assignment 09: Pharmacy & Healthcare Store REST API with RBAC & JWT

> **Track:** Backend Development | **Level:** Intermediate  
> **Tech Stack:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv, cors

---
Live link : https://assignment-9-pharmacy-management-api-in6d.onrender.com

## 📌 1. Objective & Overview

A production-grade **Pharmacy Management & Medicine Ordering REST API** built with **Express.js**, **MongoDB Atlas**, and **JWT-based Role-Based Access Control (RBAC)**. The system models multi-role user workflows across three user tiers: `Customer`, `Pharmacist`, and `Admin`, enforcing strict permission barriers for sensitive operations like managing restricted medicines and approving drug orders.

### Key Capabilities:
- **RBAC & JWT Authentication:** Multi-tier authorization middleware enforcing strict permission barriers (`Admin`, `Pharmacist`, `Customer`).
- **MongoDB Atlas Aggregation:** Aggregation pipelines for querying medicines expiring within 30 days and alerting on low-stock inventory.
- **Atomic Stock Decrement:** Concurrency-safe atomic stock decrement using conditional queries (`$gte` and `$inc`) with MongoDB transaction support when orders transition to `approved`.
- **Prescription Verification:** Enforces prescription verification notes for restricted prescription medications.
- **RESTful MVC Architecture:** Clean separation of concerns across models, views/responses, controllers, routes, and middleware.

---

## 👥 2. Role-Based Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin | Description |
|---|:---:|:---:|:---:|---|
| `POST /api/auth/register` | ✅ | ❌ | ❌ | Register customer account |
| `POST /api/auth/register-staff` | ❌ | ✅ | ✅ | Register staff using `ADMIN_KEY` |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | Authenticate user & issue JWT |
| `GET /api/auth/profile` | ✅ | ✅ | ✅ | Get authenticated profile |
| `GET /api/medicines` | ✅ | ✅ | ✅ | Public catalog browse & search |
| `GET /api/medicines/:id` | ✅ | ✅ | ✅ | Single medicine details |
| `GET /api/medicines/expiring` | ❌ | ✅ | ✅ | Query drugs expiring in next 30 days |
| `POST /api/medicines` | ❌ | ✅ | ✅ | Add new medicine to inventory |
| `PUT /api/medicines/:id` | ❌ | ✅ | ✅ | Update medicine stock / pricing |
| `DELETE /api/medicines/:id` | ❌ | ❌ | ✅ | Remove medicine from catalog (Admin only) |
| `POST /api/orders` | ✅ | ❌ | ❌ | Place customer order |
| `GET /api/orders/my-orders` | ✅ | ❌ | ❌ | View customer's order history |
| `GET /api/orders` | ❌ | ✅ | ✅ | List all orders in system |
| `GET /api/orders/:id` | ✅ (Own) | ✅ | ✅ | View order details |
| `PATCH /api/orders/:id/status` | ❌ | ✅ | ✅ | Approve/dispense order (Atomic stock deduction) |
| `GET /api/reports/expiring-soon`| ❌ | ✅ | ✅ | Aggregation report for expiring drugs |
| `GET /api/reports/low-stock` | ❌ | ✅ | ✅ | Aggregation report for low-stock alerts |
| `GET /api/reports/summary` | ❌ | ✅ | ✅ | Overall inventory summary & valuation |

---

## 🗄️ 3. Mongoose Schemas & Relationships

### Medicine Schema (`models/Medicine.js`)
```javascript
{
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  dosageForm: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'], required: true },
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0 },
  requiresPrescription: { type: Boolean, default: false },
  expiryDate: { type: Date, required: true }
}
```

### Order Schema (`models/Order.js`)
```javascript
{
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  prescriptionNotes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'dispensed', 'cancelled'],
    default: 'pending'
  }
}
```

### User Schema (`models/User.js`)
```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'pharmacist', 'customer'], default: 'customer' }
}
```

---

## 🏗️ 4. Directory Structure

```text
assignment-09-pharmacy-api/
├── config/
│   └── db.js                 # MongoDB Atlas connection
├── controllers/
│   ├── authController.js     # JWT & password logic
│   ├── medicineController.js # Medicine CRUD & expiring stock query
│   ├── orderController.js    # Order lifecycle & atomic inventory deductions
│   └── reportController.js   # Aggregation reports (expiring & low stock)
├── middleware/
│   ├── auth.js               # Verify JWT header
│   └── roleGuard.js          # Role-Based Access Control (RBAC) guard
├── models/
│   ├── Medicine.js           # Medicine inventory schema
│   ├── Order.js              # Order schema with nested items
│   └── User.js               # Multi-role user schema
├── postman/
│   └── Pharmacy-Management-API.postman_collection.json # 3-role Postman suite
├── routes/
│   ├── authRoutes.js         # Auth routes
│   ├── medicineRoutes.js     # Medicine routes
│   ├── orderRoutes.js        # Order routes
│   └── reportRoutes.js       # Reports routes
├── .env.example              # Template for environment secrets
├── .gitignore                # Excludes node_modules & .env
├── package.json
├── server.js                 # Main express server entry point
└── README.md
```

---

## 🚀 5. Local Setup & Installation

### Step 1: Clone the repository
```bash
git clone https://github.com/dharmitsathvara29-max/assignment-9-pharmacy-management-api.git
cd assignment-9-pharmacy-management-api
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the values in `.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pharmacy_db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
ADMIN_KEY=your_admin_registration_secret_key
PORT=5001
```

### Step 4: Run the Application
```bash
# Run in development mode (auto-reload)
npm run dev

# Or run in production mode
npm start
```
The server will start on `http://localhost:5001`.

---

## 🌐 6. MongoDB Atlas Connection Guide

Follow these steps to connect your API to MongoDB Atlas:

1. **Sign in / Create Account:** Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Create a Free Cluster:**
   - Under **Deployments**, click **Build a Database**.
   - Select the **M0 Free** shared tier.
   - Choose your closest cloud provider and region (e.g., AWS / Mumbai or Singapore).
   - Click **Create Deployment**.
3. **Create Database User Credentials:**
   - Under **Security** > **Database Access**, click **Add New Database User**.
   - Select **Password Authentication**.
   - Enter a username (e.g., `pharmacy_admin`) and a strong password.
   - Set Database User Privileges to **Read and write to any database**.
   - Click **Add User**.
4. **Configure Network Access (IP Whitelist):**
   - Under **Security** > **Network Access**, click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) so that your local machine and cloud platforms (like Render) can connect.
   - Click **Confirm**.
5. **Get Connection String:**
   - Go to **Database** > **Clusters**, click **Connect**.
   - Select **Drivers** (Node.js).
   - Copy the connection string format:
     `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Add the database name after the domain: `/pharmacy_db?retryWrites=true&w=majority`
   - Paste it as `MONGO_URI` in your `.env` file.

---

## ☁️ 7. Render Deployment Guide

Follow these steps to deploy this API as a live web service on Render:

1. **Sign in to Render:** Go to [render.com](https://render.com) and log in with your GitHub account.
2. **Create New Web Service:**
   - Click **New +** > **Web Service**.
   - Select **Build and deploy from a Git repository**.
   - Connect your repository: `assignment-9-pharmacy-management-api`.
3. **Configure Settings:**
   - **Name:** `pharmacy-management-api`
   - **Region:** Closest to your database (e.g., Singapore or Oregon)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. **Set Environment Variables:**
   Click **Advanced** > **Add Environment Variable** and add:
   - `MONGO_URI`: Your MongoDB Atlas connection string (with username & password).
   - `JWT_SECRET`: A secure random secret string (e.g., `pharmacy_jwt_production_secret_2026`).
   - `ADMIN_KEY`: A secure key used for staff registration (e.g., `admin_pharmacy_secret_2026`).
   - `PORT`: `10000` (Render automatically routes through this port).
5. **Deploy:**
   - Click **Create Web Service**.
   - Render will build and deploy your service.
   - Once the deployment is live, copy your service URL (e.g., `https://pharmacy-management-api.onrender.com`).
   - Test by visiting `https://pharmacy-management-api.onrender.com/` in your browser.

---

## 🧪 8. Testing & Verification

1. Import `postman/Pharmacy-Management-API.postman_collection.json` into Postman.
2. Set the `baseUrl` variable to `http://localhost:5001` (or your Render URL).
3. The collection is pre-configured with test scripts that automatically save tokens (`customerToken`, `pharmacistToken`, `adminToken`) and IDs (`medicineId`, `orderId`).
4. Run requests in sequential order:
   - Register Customer, Pharmacist, and Admin.
   - Pharmacist adds medicine.
   - Customer attempts to add medicine (receives `403 Forbidden`).
   - Customer places an order for the medicine.
   - Pharmacist approves the order (verifies stock decrements atomically).
   - Pharmacist attempts to delete medicine (receives `403 Forbidden`).
   - Admin deletes medicine (receives `200 OK`).
