# HRMS Dashboard - Fullstack Deployment Guide

This repository contains:
- `backend` -> Node.js + TypeScript + Prisma API
- `forntend` -> Vite + React web app

This guide covers pushing code to GitHub and deploying both apps live.

## 1) Push Code to GitHub

Your target remote is:
- `git@github.com:DJ090103/HRMS.git`

Run these commands from project root:

```bash
git init -b main
git add .
git commit -m "Initial HRMS fullstack setup"
git remote add origin git@github.com:DJ090103/HRMS.git
git push -u origin main
```

If remote already exists, use:

```bash
git remote set-url origin git@github.com:DJ090103/HRMS.git
git push -u origin main
```

## 2) Environment Files (Important)

Never commit real secrets. This repo is configured to ignore `.env` files.

Use:
- `backend/.env.example` -> copy to `backend/.env`
- `forntend/.env.example` -> copy to `forntend/.env`

## 3) Backend Live Deployment (Render)

Recommended stack:
- API + worker + cron on Render
- PostgreSQL on Neon
- Redis on Upstash or Render Redis

### A. Create backend services in Render

From the `backend` folder, use these values:
- Build command: `npm install && npm run prisma:generate && npm run build`
- Start command (API): `npm run start`
- Start command (Worker): `npm run worker`
- Start command (Cron): `npm run cron`

You can also use `backend/render.yaml` for blueprint-based setup.

### B. Set backend environment variables

Required:
- `NODE_ENV=production`
- `PORT=10000` (or Render-provided)
- `API_PREFIX=/api/v1`
- `DATABASE_URL=<your-neon-postgres-url>`
- `JWT_ACCESS_SECRET=<strong-secret>`
- `JWT_REFRESH_SECRET=<strong-secret>`
- `JWT_ACCESS_TTL=15m`
- `JWT_REFRESH_TTL=30d`
- `CORS_ORIGIN=https://<your-frontend-domain>`

Optional but recommended:
- `REDIS_URL=<your-redis-url>`
- `CLOUDINARY_CLOUD_NAME=<...>`
- `CLOUDINARY_API_KEY=<...>`
- `CLOUDINARY_API_SECRET=<...>`
- `RAZORPAY_KEY_ID=<...>`
- `RAZORPAY_KEY_SECRET=<...>`
- `RAZORPAYX_WEBHOOK_SECRET=<...>`
- `SMTP_HOST=<...>`
- `SMTP_PORT=587`
- `SMTP_USER=<...>`
- `SMTP_PASS=<...>`
- `EMAIL_FROM=<...>`
- `RESEND_API_KEY=<...>`

### C. Database migration after deploy

Run once on backend service shell:

```bash
npm run prisma:deploy
```

Health check:
- `GET https://<your-backend-domain>/health`

## 4) Frontend Live Deployment (Netlify)

The frontend already includes `netlify.toml`.

Deploy `forntend` with:
- Build command: `npm run build:client`
- Publish directory: `dist/spa`

Set frontend env vars:
- `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
- `VITE_REQUEST_TIMEOUT_MS=15000`

Then redeploy frontend.

## 5) Make Backend + Frontend Work Together

1. Deploy backend first and copy its public URL.
2. Set `VITE_API_BASE_URL` in frontend using backend URL + `/api/v1`.
3. Update backend `CORS_ORIGIN` with your frontend domain.
4. Redeploy both services.

## 6) Post-Deployment Checklist

- Frontend loads without console/network errors
- Login/signup/auth flow works
- API endpoints respond from live frontend
- CORS errors are not present
- Database writes are working
- Worker and cron services are running (if features depend on them)
- Logs show no startup crashes

## 7) Recommended Production Improvements

- Add a custom domain for frontend and backend
- Store secrets only in hosting dashboard, never in Git
- Enable backups for database
- Add uptime monitoring for `/health`
- Add CI checks (typecheck, build) before production deploy

