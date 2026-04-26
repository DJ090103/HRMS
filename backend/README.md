# HRMS Backend (Render Deployment)

Enterprise-grade Node.js + TypeScript backend for HRMS SaaS, isolated from frontend and deployable on Render.

## Stack

- Express + TypeScript
- Prisma + Neon PostgreSQL
- Redis (OTP, cache, BullMQ queues, session support)
- JWT access + refresh token strategy
- Cloudinary file storage
- Razorpay + RazorpayX webhook-ready payout tracking
- Zod validation
- Helmet, CORS, rate limiting
- Winston logging
- Cron + Worker process

## Architecture

- `src/modules/*` controller + route layer
- `src/services/*` domain engine layer (payroll, attendance, pdf, email, cloudinary, razorpay)
- `src/repositories/*` repository pattern over Prisma
- `src/middlewares/*` production security + validation + error handling
- `src/queues/*` BullMQ producer layer
- `src/workers/*` queue consumers
- `src/cron/*` scheduled jobs

## Implemented Enterprise Modules

- Auth: login/logout/refresh, forgot/reset password, OTP, email verification, 2FA-ready login, session management, login history
- RBAC: Super Admin, HR Manager, Employee + permission middleware
- Employee + Department management
- Attendance engine: punch in/out, late mark, overtime, corrections
- Leave workflow: apply, approve/reject, notifications
- Payroll engine: CTC split, attendance-linked salary, PF/ESI/PT, late/leave deduction, reimbursements, monthly runs
- Payslip generation: PDF + Cloudinary upload
- Reimbursement workflow
- Payment transaction + RazorpayX webhook verification
- Notifications (in-app + email queue)
- Audit logs
- Holidays, Recruitment, Performance, Gamification, Helpdesk, Assets, Company Settings
- Reports dashboard API

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migrations:
   - `npm run prisma:migrate`
5. Start API:
   - `npm run dev`
6. Start background worker:
   - `npm run worker`
7. Start cron scheduler:
   - `npm run cron`

## API Base

- Default prefix: `/api/v1`
- Health: `GET /health`

## Render Deployment Notes

- Web service command: `npm run start`
- Build command: `npm install && npm run prisma:generate && npm run build`
- Worker service command: `npm run worker`
- Cron service command: `npm run cron`

Ensure `DATABASE_URL`, `REDIS_URL`, JWT secrets, Cloudinary, and Razorpay env vars are set in Render.
