<div align="center">

# CareVault

### Real-Time Care Coordination for Homeless Services

[![Live Demo](https://img.shields.io/badge/Live%20Demo-homeless--help--theta.vercel.app-blue?style=for-the-badge&logo=vercel)](https://homeless-help-theta.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-purple?style=for-the-badge&logo=railway)](https://homeless-help-production.up.railway.app/health)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://mongodb.com/atlas)

*Built at SDSU Hackathon — A full-stack platform connecting medical teams, law enforcement, and food services to coordinate care for individuals experiencing homelessness.*

</div>

---

## The Problem

Homeless service providers — medical teams, police officers, and food distributors — operate in silos. A person receiving treatment at a clinic may be unknown to the food bank three blocks away. There is no shared, real-time system to coordinate care, track services rendered, or alert teams when someone is in crisis.

**CareVault solves this.**

---

## Features

| Feature | Description |
|---|---|
| **Role-Based Access** | Separate dashboards for Medical, Police, and Food service roles |
| **QR Code Profiles** | Every registered person gets a scannable QR code for instant identification |
| **Real-Time Alerts** | Live emergency alerts via WebSocket — all connected teams see it instantly |
| **Service Tracking** | Every scan is logged with timestamp, location, and service type |
| **Analytics Dashboard** | Charts and KPIs showing service coverage, scan frequency, and trends |
| **Interactive Map** | Leaflet-powered map showing scan locations and service coverage areas |
| **Medical Records** | Secure medical info, conditions, prescriptions, and document uploads |
| **Emergency Contacts** | Person profiles include emergency contacts with notification support |
| **Audit Logging** | Full security audit trail on every record update |
| **Responsive UI** | Mobile-first dark mode design — works on tablets in the field |

---

## Tech Stack

**Frontend**
- [Next.js 14](https://nextjs.org) — React framework with pages router
- [Tailwind CSS](https://tailwindcss.com) — Utility-first styling
- [Socket.io Client](https://socket.io) — Real-time WebSocket communication
- [Leaflet](https://leafletjs.com) — Interactive maps
- [Chart.js](https://chartjs.org) — Analytics visualizations
- [React QR Scanner](https://www.npmjs.com/package/react-qr-barcode-scanner) — In-browser QR scanning

**Backend**
- [Node.js](https://nodejs.org) + [Express](https://expressjs.com) — REST API server
- [Socket.io](https://socket.io) — WebSocket server for real-time events
- [MongoDB](https://mongodb.com) + [Mongoose](https://mongoosejs.com) — Database and ODM
- [JWT](https://jwt.io) — Stateless authentication
- [Multer](https://github.com/expressjs/multer) — File upload handling
- [Helmet](https://helmetjs.github.io) + [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) — Security hardening

**Infrastructure**
- [Vercel](https://vercel.com) — Frontend deployment with global CDN
- [Railway](https://railway.app) — Backend deployment with auto-scaling
- [MongoDB Atlas](https://mongodb.com/atlas) — Managed cloud database

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel (CDN)                   │
│              Next.js Frontend                   │
│     /pages  /components  /context  /hooks       │
└────────────────────┬────────────────────────────┘
                     │ HTTPS + WebSocket
┌────────────────────▼────────────────────────────┐
│               Railway (Backend)                 │
│            Express.js REST API                  │
│    /routes  /controllers  /models  /services    │
│              Socket.io Server                   │
└────────────────────┬────────────────────────────┘
                     │ mongoose
┌────────────────────▼────────────────────────────┐
│             MongoDB Atlas (Cloud)               │
│   Users · Persons · Scans · Alerts · AuditLogs │
└─────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ParshCodes/Homeless-Help.git
cd Homeless-Help
```

### 2. Install dependencies

```bash
# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../server && npm install
```

### 3. Configure environment variables

**Backend** — create `server/.env`:
```env
PORT=5050
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Frontend** — create `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5050/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
```

### 4. Run locally

```bash
# Terminal 1 — Start backend
cd server && npm run dev

# Terminal 2 — Start frontend
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

| Service | Platform | Config |
|---|---|---|
| Frontend | Vercel | Set root directory to `client/`, add env vars |
| Backend | Railway | Set root directory to `server/`, add env vars |
| Database | MongoDB Atlas | Allow all IPs (`0.0.0.0/0`) for Railway's dynamic IPs |

**Required env vars on Railway:**
```
MONGO_URI, JWT_SECRET, CORS_ORIGIN, NODE_ENV
```

**Required env vars on Vercel:**
```
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
```

---

## Project Structure

```
Homeless-Help/
├── client/                  # Next.js frontend
│   ├── src/
│   │   ├── pages/           # Route-based pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Global state (SafeSpotContext)
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Helper utilities
│   └── tailwind.config.js
│
└── server/                  # Express backend
    └── src/
        ├── routes/          # API route definitions
        ├── controllers/     # Business logic
        ├── models/          # MongoDB schemas
        ├── middleware/      # Auth, rate limiting
        └── services/        # Socket.io, notifications
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/api/auth/login` | User authentication |
| `POST` | `/api/person/register` | Register a new person |
| `GET` | `/api/person/:id` | Get person profile |
| `PUT` | `/api/person/:id` | Update person record |
| `POST` | `/api/scans` | Log a QR scan event |
| `GET` | `/api/analytics` | Fetch analytics data |
| `POST` | `/api/emergency` | Trigger emergency alert |

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with purpose at **SDSU Hackathon**

[Live Demo](https://homeless-help-theta.vercel.app) · [Report Bug](https://github.com/ParshCodes/Homeless-Help/issues) · [Request Feature](https://github.com/ParshCodes/Homeless-Help/issues)

</div>
