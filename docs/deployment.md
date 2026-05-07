# SafeSpot Deployment Guide

## Frontend (Vercel)
1. Install dependencies locally and run `npm run build` within `client/`.
2. Create a new Vercel project and import the Git repository.
3. Set the framework preset to **Next.js** and add the following environment variables:
   - `NEXT_PUBLIC_API_URL=https://safespot-api.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL=wss://safespot-api.onrender.com`
4. Deploy. Vercel will automatically run `npm install` and `npm run build`.
5. Configure a custom domain if desired and enforce HTTPS.

## Backend (Render)
1. From the Render dashboard, create a new **Web Service** linked to the repo.
2. Set root directory to `server` and build command `npm install` with start command `npm start`.
3. Configure environment variables:
   - `PORT=5000`
   - `MONGO_URI=<MongoDB Atlas connection string>`
   - `JWT_SECRET=<strong-secret>`
   - `ENCRYPTION_KEY=<32+ character key>`
   - `CORS_ORIGIN=https://safespot.vercel.app`
   - `SECURITY_SHARED_SECRET=<strong-shared-secret>`
   - Twilio + SMTP credentials for notifications.
4. Enable auto-deploys on main branch and monitor logs for security audit inserts.

## Database (MongoDB Atlas)
1. Create an Atlas cluster and add a database user with the **readWrite** role.
2. Allow access from Render static IP or use VPC peering.
3. Create collections `users`, `scans`, `alerts`, and `security_audit_logs`. Import `data/mockData.json` for sample content.

## Forecast Microservice (Optional)
1. Deploy the `scripts/forecast_service.py` Flask app on Render or Railway.
2. Expose `/forecast` endpoint returning `[{"date": "YYYY-MM-DD", "value": number}]`.
3. Set `FORECAST_URL` in backend environment variables.

## Security Checklist
- Enforce HTTPS at CDN and API layers.
- Rotate JWT and encryption keys quarterly.
- Enable Vercel preview protection and Render access logs.
- Configure SendGrid/Twilio verified sender IDs before production launch.
